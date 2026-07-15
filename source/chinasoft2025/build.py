#!/usr/bin/env python3
"""ChinaSoft 2025 adapter, part 2 of 2: build.

Parse the fetched static templates (raw/) into a schema-conforming dataset and
write data/chinasoft2025.json + the web copy. Conference-level metadata is
encoded here (from the site's introduction page); the forums, talks, chairs and
bios are parsed from each category's templates.

Faithful extraction: anomalies (unparseable tables, missing schedules, unknown
speaker cells) are recorded as `flags`, never guessed or dropped. Run fetch.py
first; this step is deterministic and offline.
"""
import json, re, pathlib, datetime
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
RAW = pathlib.Path(__file__).resolve().parent / "raw"
YEAR = 2025

# category slug -> (zh display name, en display name). keynote-speech is handled
# separately (it feeds the keynotes block, not the forum list).
CATEGORIES = {
    "academic-forum": ("学术论坛", "Academic Forum"),
    "industry-forum": ("工业论坛", "Industry Forum"),
    "education-forum": ("教育论坛", "Education Forum"),
    "special-issue-forum": ("专刊论坛", "Special-Issue Forum"),
    "regular-forum": ("常设论坛", "Regular Forum"),
    "competition": ("竞赛论坛", "Competition"),
    "joint-events": ("联合活动", "Joint Event"),
}

MONTH_DAY = re.compile(r"(\d{1,2})月(\d{1,2})日")
TIME_RANGE = re.compile(r"(\d{1,2}:\d{2})\s*[-–~至]\s*(\d{1,2}:\d{2})")
ONE_TIME = re.compile(r"(\d{1,2}:\d{2})")
# a break / non-talk row (not a real talk)
BREAK_WORDS = ("茶歇", "午餐", "午休", "休息", "晚宴", "合影", "签到", "注册",
               "闭幕", "开幕式", "coffee", "lunch", "break", "self-check", "自由交流")
# a session that is not a single-speaker talk but should be kept (type=other)
PANEL_WORDS = ("圆桌", "讨论", "高峰论坛", "panel", "论坛", "颁奖", "总结", "致辞", "报告会")


def clean(s):
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


def parse_subtitle(text):
    """'学术论坛 R1' -> ('学术论坛', 'R1'); a bare 'I12' -> (None, 'I12')."""
    t = clean(text)
    m = re.search(r"([A-Z]\d+[A-Za-z]?)", t)
    code = m.group(1) if m else None
    cat_zh = clean(re.sub(r"[A-Z]\d+[A-Za-z]?", "", t)) if code else t
    return (cat_zh or None), code


def schedule_date(body_text):
    """The event date from a '时间：11月29日...' line (NOT the first 月日 in prose,
    which may be a deadline). Returns YYYY-MM-DD or None."""
    for m in re.finditer(r"时间[：:]\s*([^\n]*)", body_text):
        md = MONTH_DAY.search(m.group(1))
        if md:
            return f"{YEAR}-{int(md.group(1)):02d}-{int(md.group(2)):02d}"
    return None


# A cell that is really an institution / venue / room, not a person's name.
INST_RE = re.compile(
    r"大学|大學|学院|學院|研究所|研究院|公司|实验室|集团|中心|会议中心|厅|楼|室|校区|"
    r"University|Institute|Laborator|College|Academy"
)


def split_name_aff(part):
    """'Name Affiliation' -> (name, affiliation). Handles CJK names (a contiguous
    CJK run, then the affiliation) and Latin names (leading Latin words, e.g.
    'Bangchao Wang', until the CJK affiliation begins)."""
    part = part.strip()
    if not part:
        return None, None
    if re.match(r"^[一-鿿]", part):
        m = re.match(r"^([一-鿿·•]+)\s*(.*)$", part)
        name, aff = m.group(1), m.group(2).strip()
    else:
        m = re.match(r"^([A-Za-z][A-Za-z.\-']*(?:\s+[A-Za-z.\-']+)*)\s*(.*)$", part)
        if not m:
            return None, None
        name, aff = m.group(1).strip(), m.group(2).strip()
    return name, (aff or None)


def parse_person_cell(cell):
    """A '报告嘉宾' cell -> [{name, affiliation_raw, chair_role?}]. Splits multiple
    speakers on 、，,/ and English ' and ' / '&'; drops cells that are actually an
    affiliation / venue / room rather than a person."""
    out = []
    for part in re.split(r"[、，,／/]|\s+and\s+|\s*&\s*", clean(cell)):
        part = part.strip()
        if not part or part in ("-", "--", "—"):
            continue
        chair_role = None
        if re.search(r"[（(][^）)]*主持[^）)]*[）)]", part):
            chair_role = "主持"
        part = re.sub(r"[（(][^）)]*[）)]", "", part).strip()
        name, aff = split_name_aff(part)
        if not name or INST_RE.search(name):
            continue  # empty, or an institution/venue/room mistaken for a speaker
        p = {"name": name}
        if aff:
            p["affiliation_raw"] = aff
        if chair_role:
            p["chair_role"] = chair_role
        out.append(p)
    return out


def parse_time(cell):
    m = TIME_RANGE.search(cell)
    if m:
        return m.group(1), m.group(2)
    m = ONE_TIME.search(cell)
    if m:
        return m.group(1), None
    return None, None


def section_by_heading(soup, *keywords):
    for sec in soup.select(".forum-section"):
        h = sec.find(["h3", "h2"])
        if h and any(k in h.get_text() for k in keywords):
            return sec
    return None


def parse_chairs(soup):
    chairs = {}
    order = []
    # short form: name + unit (二、论坛组织委员会)
    for m in soup.select(".committee-list .committee-member, .committee-list li"):
        name_el = m.select_one(".member-name")
        unit_el = m.select_one(".member-unit")
        if not name_el:
            continue
        name = clean(name_el.get_text())
        if not name:
            continue
        aff = clean(unit_el.get_text()).strip("（）()") if unit_el else None
        if name not in chairs:
            chairs[name] = {"name": name, "chair_role": "论坛组织委员会"}
            order.append(name)
        if aff:
            chairs[name]["affiliation_raw"] = aff
    # detailed form: h4 'N. 论坛主席：江贺 教授' + profile 简介 (五、...简介)
    for m in soup.select(".committee-member"):
        h4 = m.find("h4")
        if not h4:
            continue
        htext = clean(h4.get_text())
        mm = re.search(r"[:：]\s*(.+)$", htext)
        who = mm.group(1) if mm else htext
        bits = who.split(" ", 1)
        name = bits[0].strip()
        title = bits[1].strip() if len(bits) > 1 else None
        if not name:
            continue
        role = None
        if "：" in htext or ":" in htext:
            role = clean(re.split(r"[:：]", htext)[0])
            role = re.sub(r"^\d+[.、]\s*", "", role)
        bio_el = m.select_one(".committee-profile p, .committee-profile")
        bio = None
        if bio_el:
            bio = clean(bio_el.get_text()).replace("简介：", "").replace("简介:", "").strip()
        if name not in chairs:
            chairs[name] = {"name": name, "chair_role": role or "论坛组织委员会"}
            order.append(name)
        if title:
            chairs[name]["title"] = title
        if bio:
            chairs[name]["bio"] = bio
        if role and role not in ("", None):
            chairs[name]["chair_role"] = role
    return [chairs[n] for n in order]


def parse_bios(soup):
    """name -> {title, abstract, bio}."""
    out = {}
    for m in soup.select(".speaker-member"):
        h4 = m.find("h4")
        if not h4:
            continue
        htext = clean(h4.get_text())
        mm = re.search(r"[:：]\s*(.+)$", htext)
        who = clean(mm.group(1) if mm else htext)
        who = re.sub(r"^\d+[.、]\s*", "", who)
        bits = who.split(" ", 1)
        name = bits[0].strip()
        title = bits[1].strip() if len(bits) > 1 else None
        info = {"title": title}
        for p in m.select(".speaker-content p, p"):
            strong = p.find("strong")
            if not strong:
                continue
            label = clean(strong.get_text())
            val = clean(p.get_text()).replace(label, "", 1).strip()
            if "摘要" in label:
                info["abstract"] = val
            elif "简介" in label:
                info["bio"] = val
        if name:
            out[name] = info
    return out


def i18n(zh, en=None):
    return {"zh": zh, "en": en}


def parse_forum(cat, tid, html):
    soup = BeautifulSoup(html, "html.parser")
    titles = soup.select(".section-title")
    subtitles = soup.select(".section-title-en")
    name = clean(titles[0].get_text()) if titles else tid
    cat_zh, en = CATEGORIES[cat]
    sub = clean(subtitles[0].get_text()) if subtitles else ""
    _, code = parse_subtitle(sub)
    flags = []
    if len(subtitles) > 1 or len(titles) > 1:
        flags.append(f"multiple sections in template ({len(titles)} titles); parsed the first, "
                     f"merged all schedule tables")
    if not code:
        code = f"{cat}:{tid}"
        flags.append(f"no code parsed from subtitle '{sub}'")

    # description
    desc_sec = section_by_heading(soup, "论坛介绍", "介绍", "简介") or None
    description = None
    if desc_sec:
        ps = [clean(p.get_text()) for p in desc_sec.find_all("p")]
        ps = [p for p in ps if p and "简介：" not in p]
        description = "\n\n".join(ps) or None

    # date / room from the 安排 text
    room = None
    body_text = soup.get_text("\n")
    day_date = schedule_date(body_text)
    mroom = re.search(r"地点[：:]\s*([^\n]+)", body_text)
    if mroom:
        room = clean(mroom.group(1)).replace("武汉国际会议中心", "").strip()
        room = room or None

    chairs = parse_chairs(soup)
    bios = parse_bios(soup)

    # talks from every forum-table that looks like a schedule
    talks = []
    tables = soup.select(".forum-table")
    for tbl in tables:
        headers = [clean(th.get_text()) for th in tbl.select("thead th")]
        is_schedule = any("题目" in h or "报告" in h or "内容" in h for h in headers) and \
                      any("时间" in h for h in headers)
        rows = tbl.select("tbody tr")
        if not is_schedule:
            flags.append(f"non-schedule table headers {headers} captured as extra")
            continue
        for tr in rows:
            tds = [clean(td.get_text(" ")) for td in tr.select("td")]
            if len(tds) < 2:
                continue
            # map by header position: 时间/题目/报告嘉宾
            tcell = tds[0]
            title = tds[1] if len(tds) > 1 else ""
            spk = tds[2] if len(tds) > 2 else ""
            if any(w in title for w in BREAK_WORDS) and not any(w in title for w in PANEL_WORDS):
                continue  # a break row, not a talk
            start, end = parse_time(tcell)
            speakers = parse_person_cell(spk)
            ttype = "other" if (not speakers or any(w in title for w in PANEL_WORDS)) else "talk"
            t = {
                "title": i18n(title or None),
                "title_status": "confirmed" if title else "tbd",
                "start": start,
                "end": end,
                "speakers": speakers,
                "abstract": None,
                "abstract_status": "unknown",
                "type": ttype,
            }
            # enrich from bios
            for sp in speakers:
                info = bios.get(sp["name"])
                if info:
                    if info.get("title") and "title" not in sp:
                        sp["title"] = info["title"]
                    if info.get("bio") and "bio" not in sp:
                        sp["bio"] = info["bio"]
                    if info.get("abstract") and not t["abstract"]:
                        t["abstract"] = info["abstract"]
                        t["abstract_status"] = "confirmed"
            talks.append(t)

    if not tables:
        flags.append("no schedule table found")
    if talks and not day_date:
        flags.append("schedule present but no event date parsed; not placed on the dashboard")

    period = None
    first_start = next((t["start"] for t in talks if t["start"]), None)
    if first_start:
        hh = int(first_start.split(":")[0])
        period = "morning" if hh < 12 else ("afternoon" if hh < 18 else "evening")

    forum = {
        "code": code,
        "title": i18n(name),
        "category": {"key": cat, "name": i18n(cat_zh, en)},
        "day_date": day_date,
        "session_period": period,
        "room": room,
        "description": description,
        "chairs": chairs,
        "talks": talks,
        "detail_extracted": bool(talks),
        "source_url": f"https://chinasoft.ccf.org.cn/2025/#agenda/{cat}/{tid}",
    }
    if flags:
        forum["flags"] = flags
    return forum


def parse_keynotes():
    """keynote-speech templates -> keynote talks + their day/location."""
    days = {}  # date -> {location, talks[]}
    for f in sorted((RAW / "templates" / "keynote-speech").glob("*.html")):
        soup = BeautifulSoup(f.read_text(encoding="utf-8"), "html.parser")
        body = soup.get_text("\n")
        date = schedule_date(body)
        mroom = re.search(r"地点[：:]\s*([^\n]+)", body)
        location = clean(mroom.group(1)) if mroom else None
        bios = parse_bios(soup)
        for tbl in soup.select(".forum-table"):
            for tr in tbl.select("tbody tr"):
                tds = [clean(td.get_text(" ")) for td in tr.select("td")]
                if len(tds) < 2:
                    continue
                title = tds[1]
                spk = tds[2] if len(tds) > 2 else ""
                if any(w in title for w in BREAK_WORDS) and not any(w in title for w in PANEL_WORDS):
                    continue
                start, end = parse_time(tds[0])
                speakers = parse_person_cell(spk)
                ttype = "keynote" if speakers else "other"
                t = {
                    "title": i18n(title or None),
                    "title_status": "confirmed" if title else "tbd",
                    "start": start, "end": end, "speakers": speakers,
                    "abstract": None, "abstract_status": "unknown", "type": ttype,
                }
                for sp in speakers:
                    info = bios.get(sp["name"])
                    if info:
                        if info.get("bio"):
                            sp["bio"] = info["bio"]
                        if info.get("abstract"):
                            t["abstract"] = info["abstract"]
                            t["abstract_status"] = "confirmed"
                d = days.setdefault(date, {"location": location, "talks": []})
                d["talks"].append(t)
    return days


def build():
    forums = []
    diag = {}
    for cat in CATEGORIES:
        cdir = RAW / "templates" / cat
        if not cdir.exists():
            continue
        n = 0
        for f in sorted(cdir.glob("*.html")):
            forums.append(parse_forum(cat, f.stem, f.read_text(encoding="utf-8")))
            n += 1
        diag[cat] = n

    keynote_days = parse_keynotes()

    # synthesize days: a forums block per date + keynotes block on keynote dates
    dates = sorted({f["day_date"] for f in forums if f["day_date"]} | set(keynote_days))
    days = []
    for d in dates:
        blocks = []
        if d in keynote_days:
            kd = keynote_days[d]
            blocks.append({
                "kind": "keynotes", "title": i18n("大会特邀报告"),
                "start": None, "end": None, "location": kd["location"],
                "talks": kd["talks"],
            })
        entries = [{"forum_code": f["code"], "room": f["room"]}
                   for f in forums if f["day_date"] == d]
        if entries:
            blocks.append({"kind": "forums", "title": i18n("论坛"),
                           "start": None, "end": None, "location": None,
                           "forum_entries": entries})
        days.append({"date": d, "venue_id": "wuhan-icc", "blocks": blocks})

    co_hosts = ["CCF软件工程专业委员会", "CCF系统软件专业委员会", "CCF形式化方法专业委员会", "武汉大学"]
    supporters = ["武汉计算机软件工程学会", "华中科技大学", "中国地质大学（武汉）", "武汉理工大学",
                  "华中师范大学", "武汉软件工程职业学院（武汉开放大学）", "湖北大学", "武汉科技大学",
                  "中南民族大学", "江汉大学"]
    n_keynotes = sum(1 for kd in keynote_days.values() for t in kd["talks"] if t["type"] == "keynote")

    conf = {
        "id": "chinasoft2025",
        "source_url": "https://chinasoft.ccf.org.cn/2025/",
        "name": i18n("2025 CCF中国软件大会", "ChinaSoft 2025"),
        "start_date": dates[0] if dates else "2025-11-27",
        "end_date": dates[-1] if dates else "2025-11-30",
        "timezone": "Asia/Shanghai",
        "links": {"official": "https://chinasoft.ccf.org.cn/2025/"},
        "venues": [{"id": "wuhan-icc", "name": i18n("武汉国际会议中心"), "type": "main", "city": "武汉"}],
        "organizations": (
            [{"name": i18n("中国计算机学会", "CCF"), "role": "host", "sponsor_tier": None}]
            + [{"name": i18n(n), "role": "co_host", "sponsor_tier": None} for n in co_hosts]
            + [{"name": i18n(n), "role": "support", "sponsor_tier": None} for n in supporters]
        ),
        "committees": [],
        "days": days,
        "forums": forums,
        "extra": {
            "theme": "软件定义智能互联新世界",
            "subconferences": ["NASAC（全国软件与应用学术会议）", "FMAC（全国形式化方法与应用会议）"],
        },
        "extraction": {
            "source": "chinasoft.ccf.org.cn/2025",
            "forums_total": len(forums),
            "forums_detail_extracted": sum(1 for f in forums if f["detail_extracted"]),
            "notes": (f"Parsed from the site's static agenda templates: {len(forums)} forums across "
                      f"{len(CATEGORIES)} categories, plus {n_keynotes} keynotes."),
        },
    }

    payload = json.dumps(conf, ensure_ascii=False, indent=2)
    for p in (ROOT / "data" / "chinasoft2025.json",
              ROOT / "web" / "src" / "data" / "conferences" / "chinasoft2025.json"):
        p.write_text(payload)
        print("wrote", p)

    flagged = [f for f in forums if f.get("flags")]
    print(f"\nforums: {len(forums)}  |  per category: {diag}")
    print(f"keynote talks: {n_keynotes}  |  dates: {dates}")
    print(f"talks total: {sum(len(f['talks']) for f in forums)}")
    print(f"flagged forums: {len(flagged)}")
    for f in flagged:
        print(f"  ! {f['code']} ({f['title']['zh']}): {f['flags']}")


if __name__ == "__main__":
    build()
