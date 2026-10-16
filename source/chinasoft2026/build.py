#!/usr/bin/env python3
"""Build ChinaSoft 2026 offline from the live-link HTML snapshot.

The overview supplies the inventory and conference timetable. Detail pages
supply forum programmes, including breaks, opening remarks and row-spanned
hosts. Unpublished details stay unscheduled; conflicting source values survive
in flags/extra. No previous-year programme is imported. AI annotations are
merged separately into the enrichment container.
"""
import hashlib
import json
import pathlib
import re
import sys
from functools import lru_cache
from urllib.parse import quote, urljoin

from bs4 import BeautifulSoup

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
RAW = HERE / "raw"
BASE = "https://chinasoft.ccf.org.cn/2026/"
OVERVIEW = "pages/agenda/agenda-overview/index.html"
sys.path.insert(0, str(HERE.parent))
from people import read_person
from times import read_time
from chinasoft2025.build import parse_chairs, committee_members_flat
from enrichment import apply_enrichment

CATEGORIES = {
    "常设论坛": "regular-forum", "学术论坛": "academic-forum",
    "专刊论坛": "special-issue-forum", "教育论坛": "education-forum",
    "工业论坛": "industry-forum", "竞赛论坛": "competition",
}
DATE = re.compile(r"(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日")
TIME = re.compile(r"(\d{1,2}:\d{2})\s*[-–—~至]\s*(\d{1,2}:\d{2})")


def clean(value):
    return re.sub(r"\s+", " ", value).strip()


def txt(node):
    return clean(node.get_text(" ")) if node else ""


def i18n(value):
    return {"zh": value, "en": None}


def room_name(location):
    """Separate the single main venue from its floor/room in source locations."""
    prefixes = (
        "天津市社会山国际会议中心酒店", "天津社会山国际会议中心酒店",
        "天津市社会山国际会议中心", "天津社会山国际会议中心",
        "社会山会议中心", "会议中心",
    )
    for prefix in prefixes:
        if location.startswith(prefix):
            return location.removeprefix(prefix).lstrip(" ，,、") or None
    return location


def load(path):
    return BeautifulSoup((RAW / path).read_text(encoding="utf-8"), "html.parser")


def curation():
    return json.loads((HERE / "curation.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def portrait_manifest():
    manifest = json.loads((RAW / "portraits.json").read_text(encoding="utf-8"))
    for entry in manifest.values():
        path = ROOT / "web/public" / entry["local_path"].lstrip("/")
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError(f"Portrait hash mismatch: {path}")
    return manifest


def photo(card):
    image = card.find("img")
    if not image:
        return None
    url = urljoin(BASE, image["src"])
    entry = portrait_manifest().get(url)
    if entry is None:
        raise ValueError(f"Portrait missing from the snapshot: {url}; run fetch_photos.py")
    return {"local_path": entry["local_path"], "source_url": quote(url, safe=":/%")}


def time_range(value, flags):
    match = TIME.search(value)
    if not match:
        raise ValueError(f"Unrecognized time range: {value!r}")
    result = []
    for raw in match.groups():
        time, problem = read_time(raw)
        if problem:
            flags.append(problem)
        result.append(time)
    return result


def date(value):
    match = DATE.search(value)
    if not match:
        raise ValueError(f"Unrecognized event date: {value!r}")
    year, month, day = match.groups()
    if year and year != "2026":
        raise ValueError(f"Unexpected event year: {value!r}")
    return f"2026-{int(month):02d}-{int(day):02d}"


def table_rows(table):
    """Expand rowspans without shifting hosts into speaker columns."""
    pending = {}
    for row in table.find_all("tr"):
        cells = {col: value for col, (_, value) in pending.items()}
        pending = {col: (left - 1, value) for col, (left, value) in pending.items() if left > 1}
        col = 0
        for cell in row.find_all(["th", "td"], recursive=False):
            while col in cells:
                col += 1
            for offset in range(int(cell.get("colspan", 1))):
                # A spanning title/break is not also a speaker or a host.
                value = txt(cell) if offset == 0 else ""
                cells[col] = value
                span = int(cell.get("rowspan", 1))
                if span > 1:
                    pending[col] = (span - 1, value)
                col += 1
        yield [cells.get(i, "") for i in range(max(cells, default=-1) + 1)], bool(row.find("th"))


def people(value, flags, role=None, known_names=(), single=False):
    """Split explicit lists, preserving punctuation inside affiliations."""
    if value in {"", "-", "—", "/"}:
        return []
    # The education table prints ambiguous hyphenated credits. Preserve them,
    # rather than guessing which participant is a speaker or a moderator.
    if value in {"彭蓉-张颖", "刘璘- 全体嘉宾"}:
        flags.append(f"署名“{value}”中的讲者／主持角色不明确，保留原文，暂不关联人物。")
        return []
    parts = [value] if single else re.split(r"[、；;]", value)
    # Whitespace is normally the name/affiliation boundary. Split a bare list
    # only when every token is independently named on this same source page.
    if not single and len(parts) == 1 and len(value.split()) > 1 and all(word in known_names for word in value.split()):
        parts = value.split()
    result = []
    for part in parts:
        # Explicit title tokens separate a complete name from a job title.
        # Without this split, two-character titles can resemble a spaced name.
        titled = re.match(r"^([一-鿿]{2,4})\s+((?:教授|研究员|副教授|高级工程师|正高级工程师|求是特聘教授|专职研究员|博士).*)$", part)
        person, problem = read_person(titled[1], titled[2], chair_role=role) if titled else read_person(part, chair_role=role)
        if problem:
            flags.append(f"原文署名为“{part}”，未明确具体人物。")
        else:
            # A moderator annotation is a role; other parenthetical text may
            # be an affiliation and must remain attached to this person.
            aff = person.get("affiliation_raw", "")
            annotation = re.match(r"^[（(]([^）)]+)[）)]\s*(.*)$", aff)
            if annotation and "主持" in annotation[1]:
                person["extra"] = {"name_annotation": annotation[1]}
                person.pop("affiliation_raw", None)
                if annotation[2]:
                    person["affiliation_raw"] = annotation[2]
                person["chair_role"] = "主持"
            result.append(person)
    return result


def profiles(soup, flags):
    """Normalize profile identities, keeping their report titles for auditing."""
    result = {}
    for card in soup.select(".speaker-member"):
        heading = txt(card.find("h4"))
        who = re.sub(r"^.*?[：:]", "", heading)
        who = re.sub(r"^\d+[.、]\s*", "", who)
        # Each profile card describes one person. Punctuation in their roles
        # or affiliations is not a delimiter between multiple speakers.
        persons = people(who, flags, single=True)
        if len(persons) != 1:
            flags.append(f"Profile has no unique person identity: {heading!r}")
            continue
        person = persons[0]
        if portrait := photo(card):
            person["photo"] = portrait
        info = {"person": person, "heading_raw": heading}
        field = None
        for paragraph in card.find_all("p"):
            strong = paragraph.find("strong")
            label = txt(strong)
            if not label:
                if field and txt(paragraph):
                    info[field] += "\n\n" + txt(paragraph)
                continue
            value = txt(paragraph).removeprefix(label).lstrip("：: ")
            field = None
            if "摘要" in label:
                field = "abstract"
            elif "简介" in label:
                field = "bio"
            elif "题目" in label:
                field = "report_title"
            if field:
                info[field] = value
        name = person["name"]
        if name in result:
            name = f"{name} / {info.get('report_title', '')}"
            if not info.get("report_title") or name in result:
                raise ValueError(f"Duplicate profile without a distinct report title: {name}")
        result[name] = info
    return result


def detail(category, slug):
    soup = load(f"pages/agenda/{category}/templates/{slug}.html")
    title = txt(soup.select_one(".section-title"))
    subtitle = txt(soup.select_one(".section-title-en"))
    code = re.search(r"\b[A-Z]\d+\b", subtitle)
    if code is None and (association := curation()["detail_codes"].get(slug)):
        if title != association["title"]:
            raise ValueError(f"Reviewed forum title changed: {slug}")
        code = [association["code"]]
    if not title or not code:
        raise ValueError(f"Missing forum identity: {category}/{slug}")
    flags = []
    fields = {}
    for p in soup.find_all("p"):
        for label in ("时间", "地点"):
            match = re.match(label + r"[：:]\s*(.+)", txt(p))
            if match:
                fields[label] = match[1]
    window = time_range(fields["时间"], flags)
    forum = {
        "code": code[0], "title": i18n(title),
        "start": window[0], "end": window[1],
        "day_date": date(fields["时间"]), "room": room_name(fields["地点"]),
        "session_period": (None if window[0] < "12:00" and window[1] >= "13:00"
                           else "morning" if window[0] < "12:00" else "afternoon"),
        "source_url": f"{BASE}#agenda/{category}/{slug}",
        "chairs": [], "talks": [], "breaks": [], "detail_extracted": True,
        "flags": flags, "extra": {"schedule_raw": fields["时间"], "location_raw": fields["地点"],
                                     "published_window": dict(zip(("start", "end"), window))},
    }
    for person in parse_chairs(soup):
        name = person.pop("name")
        aff = person.pop("affiliation_raw", None)
        parsed, problem = read_person(name, aff, **person)
        if parsed:
            forum["chairs"].append(parsed)
        else:
            flags.append(problem)
    chairs_by_name = {p["name"]: p for p in forum["chairs"]}
    for card in soup.select(".committee-member"):
        if not card.find("img"):
            continue
        heading = txt(card.find("h4") or card.select_one(".member-name"))
        who = re.sub(r"^.*?[：:]", "", heading)
        parsed = people(who, flags, single=True)
        if len(parsed) != 1 or parsed[0]["name"] not in chairs_by_name:
            raise ValueError(f"Unmatched chair portrait: {code[0]} {heading}")
        chairs_by_name[parsed[0]["name"]]["photo"] = photo(card)
    for section in soup.select(".forum-section"):
        if re.search(r"介绍|背景|简介", txt(section.find(["h2", "h3"]))) and not section.select(".committee-member,.speaker-member"):
            forum["description"] = "\n\n".join(txt(p) for p in section.find_all("p"))
            break
    bios = profiles(soup, flags)
    known_names = {info["person"]["name"] for info in bios.values()} | {p["name"] for p in forum["chairs"]}
    used_bios = set()
    for table in soup.select(".forum-table"):
        rows = list(table_rows(table))
        headers = rows[0][0]
        if "时间" not in headers or "题目" not in headers:
            raise ValueError(f"Unexpected table in {code[0]}: {headers}")
        section_title = None
        for cells, heading in rows[1:]:
            if heading:
                continue
            if cells[0] and not any(cells[1:]) and not TIME.search(cells[0]):
                section_title = cells[0]
                continue
            if not TIME.search(cells[0]):
                raise ValueError(f"Unrecognized row in {code[0]}: {cells}")
            row = dict(zip(headers, cells))
            row_flags = []
            start, end = time_range(row["时间"], row_flags)
            title = row["题目"]
            if re.match(r"茶歇|午休|午餐", title):
                forum["breaks"].append({"name": title, "start": start, "end": end})
                flags.extend(row_flags)
                continue
            speaker_raw = row.get("报告嘉宾", row.get("讲者", ""))
            speakers = people(speaker_raw, row_flags, known_names=known_names)
            talk = {
                "title": i18n(title), "title_status": "tbd" if "待定" in title else "confirmed",
                "start": start, "end": end, "speakers": speakers,
                "type": "opening" if re.search(r"开场|开幕|致辞|论坛介绍|论坛情况介绍|论坛引导发言", title) else
                        "other" if re.search(r"圆桌|[Pp]an+el|交流与总结|论坛总结|论坛闭幕|结语|专题研讨", title) else "talk",
                "abstract_status": "unknown", "extra": {"speaker_raw": speaker_raw},
            }
            if section_title:
                talk["extra"]["section_title"] = section_title
            for speaker in speakers:
                chair = chairs_by_name.get(speaker["name"])
                if chair and chair.get("photo"):
                    speaker["photo"] = chair["photo"]
                candidates = [(key, info) for key, info in bios.items()
                              if info["person"]["name"] == speaker["name"]]
                if len(candidates) > 1:
                    candidates = [(key, info) for key, info in candidates if info.get("report_title") == title]
                    if len(candidates) != 1:
                        raise ValueError(f"Ambiguous profile credit in {code[0]}: {speaker['name']} / {title}")
                if not candidates:
                    continue
                profile_key, info = candidates[0]
                used_bios.add(profile_key)
                for key in ("bio",):
                    if info.get(key):
                        speaker[key] = info[key]
                if info["person"].get("photo"):
                    speaker["photo"] = info["person"]["photo"]
                if info.get("abstract") and talk["type"] == "talk":
                    talk["abstract"] = info["abstract"]
                    talk["abstract_status"] = "tbd" if "待定" in info["abstract"] else "confirmed"
                if info.get("report_title") and talk["type"] == "talk" and info["report_title"] != title:
                    talk["extra"]["profile_report_title"] = info["report_title"]
                    row_flags.append(f"报告题目不一致：日程表为“{title}”，报告资料为“{info['report_title']}”，均按原文保留。")
            if row.get("主持") not in {None, "", "-"}:
                host_raw = row["主持"]
                talk["extra"]["hosts_raw"] = host_raw
                # R13 explicitly separates each host from their affiliation by
                # a comma, and separates successive hosts with whitespace.
                if "，" in host_raw:
                    host_raw = re.sub(r"\s+(?=[一-鿿]{2,3}，)", "、", host_raw).replace("，", " ")
                talk["extra"]["hosts"] = people(host_raw, row_flags, "主持")
                for host in talk["extra"]["hosts"]:
                    chair = chairs_by_name.get(host["name"])
                    if chair and chair.get("photo"):
                        host["photo"] = chair["photo"]
                    if chair and chair.get("affiliation_raw"):
                        host.setdefault("affiliation_raw", chair["affiliation_raw"])
            if start < window[0] or end > window[1]:
                row_flags.append(f"时间不一致：本报告为 {start}–{end}，超出论坛标注的 {window[0]}–{window[1]}，均按原文保留。")
            if row_flags:
                talk["flags"] = row_flags
            forum["talks"].append(talk)
    unmatched = {name: info for name, info in bios.items() if name not in used_bios}
    if unmatched:
        forum["extra"]["unmatched_profiles"] = unmatched
        flags.append("以下报告资料未能与日程表署名明确对应，单独保留：" + "、".join(unmatched))
    if not forum["talks"]:
        raise ValueError(f"Published detail has no parsed programme: {code[0]}")
    return forum


def committees():
    result, flags = [], []
    intro = load("pages/introduction.html")
    for link in intro.select("[onclick]"):
        match = re.fullmatch(r"loadIntroPage\('([^']+)'\)", link["onclick"])
        if not match or match[1] == "committee-introduction":
            continue
        name = txt(link)
        soup = load(f"pages/intro/{match[1]}.html")
        # The published programme committee uses a flat grid after a sorting note.
        if items := soup.select(".program-grid .program-item"):
            members = []
            for item in items:
                person_name = txt(item.find("strong"))
                affiliation = txt(item).removeprefix(person_name).strip()
                person, problem = read_person(person_name, affiliation or None)
                if problem:
                    raise ValueError(f"Invalid programme committee member: {txt(item)}")
                members.append(person)
            result.append({"role": i18n(txt(soup.select_one('.section-title'))), "members": members})
            continue
        for heading in soup.select(".section-title"):
            group = heading.find_next_sibling()
            if not group:
                continue
            members = []
            if "committee-grid" in group.get("class", []):
                for item in group.select(".committee-name"):
                    parsed = people(txt(item), flags, single=True)
                    if parsed and (portrait := photo(item.parent)):
                        parsed[0]["photo"] = portrait
                    members.extend(parsed)
            elif "member-list" in group.get("class", []):
                for item in committee_members_flat(group):
                    person, problem = read_person(item["name"], item.get("affiliation_raw"))
                    if person:
                        members.append(person)
                    else:
                        flags.append(f"{name}：原文为“{item['name']}”，名单尚未公布。")
            if members:
                role = txt(heading)
                if role in {"主席", "委员", "共同主席", "副主席"}:
                    role = f"{name} {role}"
                result.append({"role": i18n(role), "members": members})
        if not soup.select(".section-title") and soup.select_one(".member-list"):
            members = []
            for item in committee_members_flat(soup.select_one(".member-list")):
                person, problem = read_person(item["name"], item.get("affiliation_raw"))
                if person:
                    members.append(person)
                else:
                    flags.append(f"{name}：原文为“{item['name']}”，名单尚未公布。")
            if members:
                result.append({"role": i18n(name), "members": members})
    # Committee subpages repeat roles from the overview. Merge exact roles,
    # retaining each source roster and flagging disagreements rather than
    # rendering the same committee twice or silently choosing one roster.
    merged = {}
    for group in result:
        key = group["role"]["zh"].replace(" ", "")
        group["role"] = i18n(key)
        names = [p["name"] for p in group["members"]]
        if key not in merged:
            group["extra"] = {"source_rosters": [names]}
            merged[key] = group
            continue
        previous = merged[key]
        previous["extra"]["source_rosters"].append(names)
        if set(names) != {p["name"] for p in previous["members"]}:
            rosters = "；".join("、".join(roster) for roster in previous["extra"]["source_rosters"])
            flags.append(f"{key}：来源页面名单不一致，分别为“{rosters}”，保留全部明确列出的人名。")
        known = {p["name"]: p for p in previous["members"]}
        for member in group["members"]:
            if member["name"] not in known:
                previous["members"].append(member)
                known[member["name"]] = member
            elif member.get("photo"):
                known[member["name"]].setdefault("photo", member["photo"])
    return list(merged.values()), flags


def apply_note_review(conf):
    """Apply the reviewed snapshot's exact note decisions, not a global filter."""
    review = json.loads((HERE / "note_review.json").read_text())
    dismissed = set(review["dismissed_flags"])
    conference_flags = conf["extra"]["flags"]
    for pending in review["pending_committees"]:
        if pending["source_flag"] in conference_flags:
            conf["committees"].append({
                "role": pending["role"], "members": [],
                "extra": {"members_status": "not_published", "status_raw": pending["status_raw"]},
            })
    # Roster discrepancies belong to their committee, not to the whole event.
    for group in conf["committees"]:
        prefix = group["role"]["zh"] + "：来源页面名单不一致"
        notes = [flag for flag in conference_flags if flag.startswith(prefix)]
        if notes:
            group.setdefault("extra", {})["flags"] = notes
            conference_flags[:] = [flag for flag in conference_flags if flag not in notes]
    nodes = [conf["extra"]]
    for forum in conf["forums"]:
        nodes.append(forum)
        for talk in forum["talks"]:
            nodes.append(talk)
            raw = talk.get("extra", {}).get("speaker_raw")
            if raw in review["collective_credits"] and not talk["speakers"]:
                talk["extra"]["collective_credit"] = raw
    for node in nodes:
        if "flags" in node:
            node["flags"] = [flag for flag in node["flags"] if flag not in dismissed]


def build():
    overview = load(OVERVIEW)
    tables = overview.select("table.forum-table")
    details = {}
    for category in CATEGORIES.values():
        if category == "competition":
            continue
        index = load(f"pages/agenda/{category}/index.html")
        for link in index.select("[onclick]"):
            match = re.fullmatch(r"loadAgenda\('([^']+)',\s*'([^']+)'\)", link["onclick"])
            if match:
                forum = detail(*match.groups())
                if forum["code"] in details:
                    raise ValueError(f"Duplicate forum code: {forum['code']}")
                details[forum["code"]] = forum
    for retained in curation()["retained_details"]:
        if retained["code"] not in details:
            forum = detail(retained["category"], retained["slug"])
            if forum["code"] != retained["code"]:
                raise ValueError(f"Retained source identity changed: {retained['slug']}")
            forum["extra"]["source_navigation_status"] = "link_withdrawn"
            details[forum["code"]] = forum
    forums, other_meetings = [], []
    for cells, header in table_rows(tables[1]):
        if header:
            continue
        category, code, title = cells
        if category not in CATEGORIES:
            other_meetings.append({"category": category, "code": code, "title": title})
            continue
        forum = details.pop(code, None)
        if forum is None:
            forum = {"code": code, "title": i18n(title), "day_date": None,
                     "start": None, "end": None,
                     "room": None, "chairs": [], "talks": [], "detail_extracted": False,
                     "agenda_status": "not_published", "source_url": BASE + "#agenda/agenda-overview/index",
                     "flags": ["总体日程已列出此论坛，官网尚未公布详细议程。"]}
        elif forum["title"]["zh"] != title:
            forum["extra"]["overview_title"] = title
            forum["flags"].append(f"论坛名称不一致：总表为“{title}”，此处使用详情页名称。")
        forum["category"] = {"key": CATEGORIES[category], "name": i18n(category)}
        forums.append(forum)
    if details:
        raise ValueError(f"Detail forums absent from inventory: {list(details)}")
    # Announcements publish competition dates without a timed programme. Keep
    # those dates and the source milestones, without inventing clock times.
    for code, slug in (("C5", "cangjie"), ("C2", "harmony-ai")):
        announcement = load(f"pages/competition/{slug}.html")
        forum = next(f for f in forums if f["code"] == code)
        milestones = []
        for table in announcement.find_all("table"):
            for cells, header in table_rows(table):
                if not header and cells[0] in {"决赛", "线下决赛"}:
                    forum["day_date"] = date(cells[1])
                    milestones.append(cells)
        if not milestones:
            raise ValueError(f"Missing announced final date: {code}")
        forum["source_url"] = BASE + f"#competition/{slug}"
        forum["extra"] = {"announcement_title": txt(announcement.find(["h1", "h2"])),
                          "milestones": milestones}
        forum["flags"].append("竞赛通知已公布决赛日期，具体时间、会场和参赛议程尚未公布。")
    days = {}
    for cells, header in table_rows(tables[0]):
        if header:
            continue
        day_raw, time_raw, event, location_raw = cells
        room = room_name(location_raw)
        day = date(day_raw)
        flags = []
        start, end = time_range(time_raw, flags)
        kind = "registration" if "签到" in event else "banquet" if "晚宴" in event else "committee_meetings" if "年会" in event else "other"
        block = {"kind": kind, "title": i18n(event), "start": start, "end": end,
                 "location": room, "extra": {"source_url": BASE + "#agenda/agenda-overview/index",
                                               "location_raw": location_raw}}
        if flags:
            block["extra"]["flags"] = flags
        if kind == "committee_meetings":
            block["meetings"] = [{"name": i18n(event), "start": start, "end": end, "room": room}]
        # E7 is named explicitly in the overview despite having no detail link.
        for forum in forums:
            if forum["title"]["zh"] == event and not forum["detail_extracted"]:
                forum["day_date"] = day
                forum["room"] = room
                forum["session_period"] = "morning" if start < "12:00" else "afternoon"
                forum["start"], forum["end"] = start, end
                forum.setdefault("extra", {})["published_window"] = {"start": start, "end": end}
                forum["extra"]["location_raw"] = location_raw
        days.setdefault(day, {"date": day, "venue_id": "society-hill", "blocks": []})["blocks"].append(block)
    # One time-axis board per day contains every parallel forum. Its envelope
    # orders the board among plenaries/meetings; each forum keeps its own window.
    # Preserve overview placeholders in metadata instead of displaying them a
    # second time above the actual programme.
    for day, record in days.items():
        entries = [{"forum_code": f["code"], "room": f["room"]} for f in forums if f["day_date"] == day]
        if entries:
            dated = [f for f in forums if f["day_date"] == day]
            overview_rows = [b for b in record["blocks"] if b["title"]["zh"] == "分领域论坛"
                             or any(f["title"]["zh"] == b["title"]["zh"] for f in dated)]
            record["blocks"] = [b for b in record["blocks"] if b not in overview_rows]
            starts = [f["start"] for f in dated if f["start"]] + [t["start"] for f in dated for t in f["talks"] if t.get("start")]
            ends = [f["end"] for f in dated if f["end"]] + [t["end"] for f in dated for t in f["talks"] if t.get("end")]
            record["blocks"].append({"kind": "forums", "title": i18n("论坛"), "forum_entries": entries,
                                     "start": min(starts) if starts else None, "end": max(ends) if ends else None,
                                     "extra": {"overview_rows": overview_rows}})
        record["blocks"].sort(key=lambda b: b.get("start") or "99:99")
    for forum in forums:
        if forum["day_date"] and forum["day_date"] not in days:
            raise ValueError(f"Forum date outside overview: {forum['code']}")
    organization_roles = {"主办单位": "host", "承办单位": "co_host", "协办单位": "support"}
    organizations = []
    for column in load("index.html").select(".footer-column"):
        role = organization_roles.get(txt(column.find("h3")))
        if role:
            organizations.extend({"name": i18n(txt(p)), "role": role} for p in column.find_all("p"))
    committee, committee_flags = committees()
    planned_guests = []
    for card in load("pages/home.html").select(".speaker-card"):
        person, problem = read_person(txt(card.select_one(".speaker-name")), title=txt(card.select_one(".speaker-title")))
        if person:
            if portrait := photo(card):
                person["photo"] = portrait
            planned_guests.append(person)
        else:
            committee_flags.append(problem)
    # The prototype-system announcement and overview use different names and
    # publish no common code. Preserve it separately instead of guessing C2.
    announcements = []
    if (RAW / "pages/competition/prototype-systems-forum.html").exists():
        prototype = load("pages/competition/prototype-systems-forum.html")
        prototype_schedule = [txt(p) for p in prototype.find_all("p") if "11月6日下午" in txt(p)]
        if len(prototype_schedule) != 1:
            raise ValueError("Expected one published prototype forum date")
        announcements.append({"title": txt(prototype.find(["h1", "h2"])),
                              "source_url": BASE + "#competition/prototype-systems-forum",
                              "schedule_raw": prototype_schedule[0],
                              "day_date": date(prototype_schedule[0]), "session_period": "afternoon",
                              "flags": ["此通知未注明论坛编号，暂不与总表中的 C2 竞赛合并。"]})
    dates = sorted(days)
    # Explicit reviewed associations preserve existing follow keys across forums.
    identities = curation()["person_identities"]
    assigned = set()
    for forum in forums:
        for person in forum["chairs"]:
            key = f"{forum['code']}:chair:{person['name']}"
            if association := curation().get("chair_identities", {}).get(key):
                if association["bio_excerpt"] not in person.get("bio", ""):
                    raise ValueError(f"Reviewed chair biography changed: {key}")
                person.setdefault("extra", {})["identity_key"] = association["identity_key"]
        for index, talk in enumerate(forum["talks"]):
            key = f"{forum['code']}#{index}"
            if note := curation().get("talk_notes", {}).get(key):
                persons = [p for p in talk["speakers"] if p["name"] == note["name"]]
                if (talk["title"]["zh"] != note["source_title"] or len(persons) != 1
                        or persons[0].get("affiliation_raw") != note["affiliation_raw"]
                        or note["bio_excerpt"] not in persons[0].get("bio", "")):
                    raise ValueError(f"Reviewed source discrepancy changed: {key}")
                talk.setdefault("flags", []).extend(note["flags"])
            if association := identities.get(key):
                persons = [p for p in talk["speakers"] if p["name"] == association["name"]]
                if talk["title"]["zh"] != association["source_title"] or len(persons) != 1:
                    raise ValueError(f"Reviewed person association changed: {key}")
                persons[0].setdefault("extra", {})["identity_key"] = association["identity_key"]
                assigned.add(key)
    if assigned != identities.keys():
        raise ValueError(f"Stale person associations: {identities.keys() - assigned}")
    apply_enrichment(forums, HERE / "enrichment.json")
    fingerprint = hashlib.sha256()
    for path in sorted(RAW.rglob("*.html")):
        fingerprint.update(path.relative_to(RAW).as_posix().encode() + b"\0" + path.read_bytes())
    fingerprint.update(b"portraits.json\0" + (RAW / "portraits.json").read_bytes())
    fingerprint.update(b"note_review.json\0" + (HERE / "note_review.json").read_bytes())
    fingerprint.update(b"curation.json\0" + (HERE / "curation.json").read_bytes())
    conf = {
        "id": "chinasoft2026", "name": {"zh": "2026 CCF中国软件大会", "en": "ChinaSoft 2026"},
        "source_url": BASE, "start_date": dates[0], "end_date": dates[-1], "timezone": "Asia/Shanghai",
        "links": {"official": BASE, "registration": BASE + "#register", "hotel": BASE + "#hotel"},
        "venues": [{"id": "society-hill", "name": i18n("天津社会山国际会议中心酒店"), "type": "main", "city": "天津"}],
        "organizations": organizations, "committees": committee,
        "days": [days[day] for day in dates], "forums": forums,
        "extra": {"theme": "软件筑基智能新时代", "other_meetings": other_meetings,
                  "planned_guests": {"label": "拟出席院士嘉宾", "members": planned_guests},
                  "announcements": announcements,
                  "flags": ["日期口径不同：首页为 11 月 6–8 日，大会介绍和总体日程包含 11 月 5 日签到；本站包含签到日。"] + committee_flags},
        "extraction": {"source": BASE, "content_sha256": fingerprint.hexdigest(),
                       "forums_total": len(forums), "forums_detail_extracted": sum(f["detail_extracted"] for f in forums),
                       "notes": "Active navigation and explicitly reviewed accessible withdrawn pages are captured. Unpublished programmes remain unscheduled. Timetable titles and affiliations are retained verbatim; profiles supplement abstracts and biographies."},
    }
    apply_note_review(conf)
    payload = json.dumps(conf, ensure_ascii=False, indent=2) + "\n"
    for directory in (ROOT / "data", ROOT / "web/src/data/conferences"):
        (directory / "chinasoft2026.json").write_text(payload, encoding="utf-8")
    print(f"ChinaSoft 2026: {len(forums)} forums, {sum(len(f['talks']) for f in forums)} programme items, {len(days)} days")


if __name__ == "__main__":
    build()
