#!/usr/bin/env python3
"""Build ChinaSoft 2026 offline from the live-link HTML snapshot.

The overview supplies the inventory and conference timetable. Detail pages
supply forum programmes, including breaks, opening remarks and row-spanned
hosts. Unpublished details stay unscheduled; conflicting source values survive
in flags/extra. No previous-year programme or AI-derived content is imported.
"""
import hashlib
import json
import pathlib
import re
import sys

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


def load(path):
    return BeautifulSoup((RAW / path).read_text(encoding="utf-8"), "html.parser")


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


def people(value, flags, role=None):
    """Split explicit lists, preserving punctuation inside affiliations."""
    if value in {"", "-", "—", "/"}:
        return []
    # The education table prints ambiguous hyphenated credits. Preserve them,
    # rather than guessing which participant is a speaker or a moderator.
    if value in {"彭蓉-张颖", "刘璘- 全体嘉宾"}:
        flags.append(f"Ambiguous speaker credit retained verbatim: {value!r}")
        return []
    parts = re.split(r"[、；;]", value)
    if len(parts) == 1 and not re.search(r"教授|研究员|博士|工程师", value) and re.fullmatch(r"[一-鿿]{2,3}(?:\s+[一-鿿]{2,3})+", value):
        parts = value.split()
    result = []
    for part in parts:
        # Explicit title tokens separate a complete name from a job title.
        # Without this split, two-character titles can resemble a spaced name.
        titled = re.match(r"^([一-鿿]{2,4})\s+((?:教授|研究员|副教授|高级工程师|正高级工程师|求是特聘教授|专职研究员|博士).*)$", part)
        person, problem = read_person(titled[1], titled[2], chair_role=role) if titled else read_person(part, chair_role=role)
        if problem:
            flags.append(problem)
        else:
            # A parenthesized annotation immediately after a name is not an
            # institution. Keep it verbatim, without letting it hide the unit.
            aff = person.get("affiliation_raw", "")
            annotation = re.match(r"^[（(]([^）)]+)[）)]\s*(.*)$", aff)
            if annotation:
                person["extra"] = {"name_annotation": annotation[1]}
                person.pop("affiliation_raw", None)
                if annotation[2]:
                    person["affiliation_raw"] = annotation[2]
                if "主持" in annotation[1]:
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
        persons = people(who, flags)
        if len(persons) != 1:
            flags.append(f"Profile has no unique person identity: {heading!r}")
            continue
        person = persons[0]
        info = {"person": person, "heading_raw": heading}
        for paragraph in card.find_all("p"):
            strong = paragraph.find("strong")
            label = txt(strong)
            if not label:
                continue
            value = txt(paragraph).removeprefix(label).lstrip("：: ")
            if "摘要" in label:
                info["abstract"] = value
            elif "简介" in label:
                info["bio"] = value
            elif "题目" in label:
                info["report_title"] = value
        name = person["name"]
        if name in result:
            raise ValueError(f"Duplicate profile identity: {name}")
        result[name] = info
    return result


def detail(category, slug):
    soup = load(f"pages/agenda/{category}/templates/{slug}.html")
    title = txt(soup.select_one(".section-title"))
    subtitle = txt(soup.select_one(".section-title-en"))
    code = re.search(r"\b[A-Z]\d+\b", subtitle)
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
        "day_date": date(fields["时间"]), "room": fields["地点"],
        "session_period": "morning" if window[0] < "12:00" else "afternoon",
        "source_url": f"{BASE}#agenda/{category}/{slug}",
        "chairs": [], "talks": [], "breaks": [], "detail_extracted": True,
        "flags": flags, "extra": {"schedule_raw": fields["时间"],
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
    for section in soup.select(".forum-section"):
        if re.search(r"介绍|背景|简介", txt(section.find(["h2", "h3"]))) and not section.select(".committee-member,.speaker-member"):
            forum["description"] = "\n\n".join(txt(p) for p in section.find_all("p"))
            break
    bios = profiles(soup, flags)
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
            speakers = people(speaker_raw, row_flags)
            talk = {
                "title": i18n(title), "title_status": "tbd" if "待定" in title else "confirmed",
                "start": start, "end": end, "speakers": speakers,
                "type": "opening" if re.search(r"开场|开幕|致辞|论坛介绍", title) else
                        "other" if re.search(r"圆桌|[Pp]an+el|交流与总结|论坛总结", title) else "talk",
                "abstract_status": "unknown", "extra": {"speaker_raw": speaker_raw},
            }
            if section_title:
                talk["extra"]["section_title"] = section_title
            for speaker in speakers:
                info = bios.get(speaker["name"])
                if not info:
                    continue
                used_bios.add(speaker["name"])
                for key in ("bio",):
                    if info.get(key):
                        speaker[key] = info[key]
                if info.get("abstract") and talk["type"] == "talk":
                    talk["abstract"] = info["abstract"]
                    talk["abstract_status"] = "tbd" if "待定" in info["abstract"] else "confirmed"
                if info.get("report_title") and talk["type"] == "talk" and info["report_title"] != title:
                    talk["extra"]["profile_report_title"] = info["report_title"]
                    row_flags.append("Timetable title differs from profile title; both retained")
            if row.get("主持") not in {None, "", "-"}:
                host_raw = row["主持"]
                talk["extra"]["hosts_raw"] = host_raw
                # R13 explicitly separates each host from their affiliation by
                # a comma, and separates successive hosts with whitespace.
                if "，" in host_raw:
                    host_raw = re.sub(r"\s+(?=[一-鿿]{2,3}，)", "、", host_raw).replace("，", " ")
                talk["extra"]["hosts"] = people(host_raw, row_flags, "主持")
            if start < window[0] or end > window[1]:
                row_flags.append(f"Talk window {start}-{end} extends beyond the published forum window {window[0]}-{window[1]}; both retained")
            if row_flags:
                talk["flags"] = row_flags
            forum["talks"].append(talk)
    unmatched = {name: info for name, info in bios.items() if name not in used_bios}
    if unmatched:
        forum["extra"]["unmatched_profiles"] = unmatched
        flags.append("Profiles without an exact timetable speaker match retained in extra.unmatched_profiles")
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
        for heading in soup.select(".section-title"):
            group = heading.find_next_sibling()
            if not group:
                continue
            members = []
            if "committee-grid" in group.get("class", []):
                for item in group.select(".committee-name"):
                    members.extend(people(txt(item), flags))
            elif "member-list" in group.get("class", []):
                for item in committee_members_flat(group):
                    person, problem = read_person(item["name"], item.get("affiliation_raw"))
                    if person:
                        members.append(person)
                    else:
                        flags.append(f"{name}: {problem}")
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
                    flags.append(f"{name}: {problem}")
            if members:
                result.append({"role": i18n(name), "members": members})
    return result, flags


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
                     "room": None, "chairs": [], "talks": [], "detail_extracted": False,
                     "agenda_status": "not_published", "source_url": BASE + "#agenda/agenda-overview/index",
                     "flags": ["Listed in the overview; no programme linked from the published forum indexes"]}
        elif forum["title"]["zh"] != title:
            forum["extra"]["overview_title"] = title
            forum["flags"].append(f"Overview title differs from detail title: {title!r}; detail title retained")
        forum["category"] = {"key": CATEGORIES[category], "name": i18n(category)}
        forums.append(forum)
    if details:
        raise ValueError(f"Detail forums absent from inventory: {list(details)}")
    # Announcements publish competition dates without a timed programme. Keep
    # those dates and the source milestones, without inventing clock times.
    for code, slug in (("C5", "cangjie"), ("C6", "harmony-ai")):
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
        forum["flags"].append("Competition announcement gives the final date, but no clock times, room or participant programme")
    days = {}
    for cells, header in table_rows(tables[0]):
        if header:
            continue
        day_raw, time_raw, event, room = cells
        day = date(day_raw)
        flags = []
        start, end = time_range(time_raw, flags)
        kind = "registration" if "签到" in event else "banquet" if "晚宴" in event else "committee_meetings" if "年会" in event else "other"
        block = {"kind": kind, "title": i18n(event), "start": start, "end": end,
                 "location": room, "extra": {"source_url": BASE + "#agenda/agenda-overview/index"}}
        if flags:
            block["extra"]["flags"] = flags
        if kind == "committee_meetings":
            block["meetings"] = [{"name": i18n(event), "start": start, "end": end, "room": room}]
        # E6 is named explicitly in the overview despite having no detail link.
        for forum in forums:
            if forum["title"]["zh"] == event and not forum["detail_extracted"]:
                forum["day_date"] = day
                forum["room"] = room
                forum["session_period"] = "morning" if start < "12:00" else "afternoon"
                forum.setdefault("extra", {})["published_window"] = {"start": start, "end": end}
        days.setdefault(day, {"date": day, "venue_id": "society-hill", "blocks": []})["blocks"].append(block)
    # The viewer resolves one forum block per day. Keep the overview's separate
    # windows intact and put all dated detail references in one unbounded block.
    for day, record in days.items():
        entries = [{"forum_code": f["code"], "room": f["room"]} for f in forums if f["day_date"] == day]
        if entries:
            record["blocks"].append({"kind": "forums", "title": i18n("论坛"), "forum_entries": entries})
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
            planned_guests.append(person)
        else:
            committee_flags.append(problem)
    # The prototype-system announcement and overview use different names and
    # publish no common code. Preserve it separately instead of guessing C2.
    prototype = load("pages/competition/prototype-systems-forum.html")
    prototype_schedule = [txt(p) for p in prototype.find_all("p") if "11月6日下午" in txt(p)]
    if len(prototype_schedule) != 1:
        raise ValueError("Expected one published prototype forum date")
    dates = sorted(days)
    fingerprint = hashlib.sha256()
    for path in sorted(RAW.rglob("*.html")):
        fingerprint.update(path.relative_to(RAW).as_posix().encode() + b"\0" + path.read_bytes())
    conf = {
        "id": "chinasoft2026", "name": {"zh": "2026 CCF中国软件大会", "en": "ChinaSoft 2026"},
        "source_url": BASE, "start_date": dates[0], "end_date": dates[-1], "timezone": "Asia/Shanghai",
        "links": {"official": BASE, "registration": BASE + "#register", "hotel": BASE + "#hotel"},
        "venues": [{"id": "society-hill", "name": i18n("天津社会山国际会议中心酒店"), "type": "main", "city": "天津"}],
        "organizations": organizations, "committees": committee,
        "days": [days[day] for day in dates], "forums": forums,
        "extra": {"theme": "软件筑基智能新时代", "other_meetings": other_meetings,
                  "planned_guests": {"label": "拟出席院士嘉宾", "members": planned_guests},
                  "announcements": [{"title": txt(prototype.find(["h1", "h2"])),
                                     "source_url": BASE + "#competition/prototype-systems-forum",
                                     "schedule_raw": prototype_schedule[0],
                                     "day_date": date(prototype_schedule[0]), "session_period": "afternoon",
                                     "flags": ["No forum code published; not silently mapped to the overview's C2 competition"]}],
                  "flags": ["Home news says November 6-8; introduction and overview include November 5 check-in. The dataset includes check-in."] + committee_flags},
        "extraction": {"source": BASE, "content_sha256": fingerprint.hexdigest(),
                       "forums_total": len(forums), "forums_detail_extracted": sum(f["detail_extracted"] for f in forums),
                       "notes": "Only live navigation links are followed. Unpublished programmes remain unscheduled. Timetable titles and affiliations are retained verbatim; profiles supplement abstracts and biographies."},
    }
    payload = json.dumps(conf, ensure_ascii=False, indent=2) + "\n"
    for directory in (ROOT / "data", ROOT / "web/src/data/conferences"):
        (directory / "chinasoft2026.json").write_text(payload, encoding="utf-8")
    print(f"ChinaSoft 2026: {len(forums)} forums, {sum(len(f['talks']) for f in forums)} programme items, {len(days)} days")


if __name__ == "__main__":
    build()
