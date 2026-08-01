#!/usr/bin/env python3
"""CCF ChinaOSC 2026 adapter, part 2 of 2: build.

Parse the fetched CMS documents (raw/) into a schema-conforming dataset and write
data/chinaosc2026.json + the web copy. Run fetch.py first; this step is
deterministic and offline.

Shape of the source (see fetch.py for the endpoints):

* `议程详情` holds one document per conference day. Each is a flat list of
  "<time> <period> <event>" rows and is the ONLY source of the day-level
  timetable (check-in, plenary, lunch, the parallel-forum window, the executive
  committee's annual meeting, the closing ceremony). It carries no talk detail.
* `专题议程` holds one rich-text document per forum. Each follows the same CMS
  template: a shared conference banner + boilerplate, then `<hr>`-separated
  sections — 论坛主旨 (abstract), 论坛主席 (chairs), 论坛议程 (the per-talk
  timetable, published only as an IMAGE), 嘉宾与报告介绍 (guests: photo, name,
  bio, report title, report abstract) and optionally a Panel section.
  A document's `keywords` field carries the forum's date and chair names.
* `member/overviewList` groups people by conference role (大会主席 / 与会嘉宾);
  the remaining role groups exist on the site but are empty.
* `partners/list` holds the partner communities.

THE PROGRAMME IS IN THE IMAGE. A forum page's 论坛议程 section is a timetable
picture: times, order, titles, speakers and their affiliations are printed there
and nowhere else in the document text. Reading only the 嘉宾与报告介绍 cards —
which is all the text offers — loses about a fifth of the programme (opening
addresses, ceremonies, breaks, panels) and every clock time and affiliation.

So the timetable is transcribed once, by hand, into agenda/<doc id>.json (see
that directory's `_about`: verbatim, no inference) and IS THE PROGRAMME here:
row order, times, titles and speakers all come from it. The guest cards are
supplementary — they contribute the bio, the report abstract and the portrait,
attached to a row by speaker name. A card whose guest never appears in the
timetable is still kept, without a time, and flagged.

Faithful extraction: a forum whose page publishes no timetable image keeps its
card-derived talks with no time rather than inventing one; where the image and
the card text disagree (a character, a dash, a name) the image is recorded and
the divergence flagged, never silently reconciled.
"""
import base64
import difflib
import json
import pathlib
import re
import sys

from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
RAW = pathlib.Path(__file__).resolve().parent / "raw"
AGENDA = pathlib.Path(__file__).resolve().parent / "agenda"
CONF_ID = "chinaosc2026"
YEAR = 2026
SITE = "https://chinaosc.ccf.org.cn"

# The shared enrichment merger lives in source/; make it importable when this
# adapter is run directly (python source/chinaosc2026/build.py).
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from enrichment import apply_enrichment  # noqa: E402

# CMS directory names (see raw/dirs.json).
DIR_FORUMS = "专题议程"
DIR_DAYS = "议程详情"
DIR_NOTICES = "会议通知"

# Section headings inside a forum document's rich text.
SEC_TOPIC = "论坛主旨"
SEC_CHAIRS = "论坛主席"
SEC_AGENDA = "论坛议程"
SEC_GUESTS = ("嘉宾与报告介绍", "嘉宾介绍", "报告介绍")
SEC_PANEL = ("Panel介绍", "Panel嘉宾介绍")
ALL_HEADINGS = (SEC_TOPIC, SEC_CHAIRS, SEC_AGENDA) + SEC_GUESTS + SEC_PANEL

MONTH_DAY = re.compile(r"(\d{1,2})月(\d{1,2})日")
TIME_RANGE = re.compile(r"(\d{1,2}:\d{2})\s*[-–~—至]\s*(\d{1,2}:\d{2})")
# keywords entry such as "论坛主席：曹东刚" / "会议主席：王广锋" / "主席：周凡利"
CHAIR_KW = re.compile(r"^(.*?主席)\s*[：:]\s*(.+)$")
# Labels that appear in bold inside a Panel section but are not people.
PANEL_LABELS = ("嘉宾", "议题", "主题", "主持人", "圆桌", "第一轮", "第二轮", "第三轮")
# A bold line that reads as a person's name (CJK name, or a Latin name such as
# "Jan Kiszka") rather than a heading/report title.
CJK_NAME = re.compile(r"^[一-鿿·•]{2,5}$")
LATIN_NAME = re.compile(r"^[A-Za-z][A-Za-z.'\-]*(?:\s+[A-Za-z.'\-]+){0,3}$")
# An organization standing where a person's name is expected.
ORG_NAME = re.compile(r"公司|大学|学院|研究所|研究院|实验室|集团|社区|基金会|committee|委员会")


def clean(s):
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


def i18n(zh, en=None):
    return {"zh": zh, "en": en}


def load(rel):
    return json.loads((RAW / rel).read_text(encoding="utf-8"))


def doc_rows(dir_name):
    """Documents of a CMS directory, in the order the site lists them."""
    dirs = load("dirs.json")["rows"]
    match = next((d for d in dirs if clean(d["name"]) == dir_name), None)
    if match is None:
        return []
    listing = RAW / "doclist" / f"{match['id']}.json"
    if not listing.exists():
        return []
    return json.loads(listing.read_text(encoding="utf-8"))["rows"]


def doc_html(doc_id):
    """A document's body: the CMS stores it base64-encoded."""
    data = load(f"docs/{doc_id}.json")["data"]
    return data, base64.b64decode(data.get("content") or "").decode("utf-8", "replace")


# --------------------------------------------------------------------------
# forum documents
# --------------------------------------------------------------------------

def paragraphs(html):
    """The document body as a flat list of records, splitting on <hr>.

    Each record is {text, bold, images, hr}: `bold` marks a paragraph whose text
    is (at least partly) emphasised — the template uses bold for section
    headings, people's names and report titles — and `images` holds the image
    URLs the paragraph carries (a photo starts a person entry; the 论坛议程
    section's image IS the published timetable).
    """
    soup = BeautifulSoup(html, "html.parser")
    out = []
    # `li` matters: a few documents put part of the 论坛主旨 in an ordered list.
    for el in soup.find_all(["p", "h1", "h2", "h3", "h4", "li", "hr"]):
        if el.name == "hr":
            out.append({"text": "", "bold": False, "images": [], "hr": True})
            continue
        images = [img.get("src") for img in el.find_all("img") if img.get("src")]
        out.append({
            "text": clean(el.get_text(" ")),
            "bold": bool(el.find(["strong", "b"])),
            "images": images,
            "hr": False,
        })
    return out


def heading_of(par):
    """The section heading a paragraph introduces, or None."""
    t = par["text"].rstrip("：: ")
    for h in ALL_HEADINGS:
        if t == h:
            return h
    return None


def split_sections(pars):
    """(preamble, [(heading, paragraphs)]) for one forum document.

    The document is a flat paragraph list cut into `<hr>`-delimited blocks. The
    final block is the site-wide registration footer repeated on every forum page
    (recognised by 大会官网 / 大会报名链接) and is dropped whole — cutting only at
    the matching paragraph would leave its opening lines inside the last real
    section.
    """
    blocks, current_block = [[]], 0
    for par in pars:
        if par["hr"]:
            blocks.append([])
            current_block += 1
        else:
            blocks[current_block].append(par)
    kept = [b for b in blocks
            if not any("大会官网" in p["text"] or "大会报名链接" in p["text"] for p in b)]

    preamble, sections = [], []
    current = None
    for block in kept:
        for par in block:
            h = heading_of(par)
            if h:
                current = (h, [])
                sections.append(current)
                continue
            if current is None:
                preamble.append(par)
            else:
                current[1].append(par)
    return preamble, sections


def person_entries(pars):
    """Split a people section into entries, one per photo.

    The template repeats: a paragraph holding the portrait, a bold paragraph with
    the name, one or more plain paragraphs of biography, and — in the guest
    section — a bold report title followed by its abstract. A leading paragraph
    with no photo (some documents put the photo in the heading paragraph) starts
    the first entry too.
    """
    entries, current = [], None
    for par in pars:
        if par["images"] or current is None:
            current = []
            entries.append(current)
        current.append(par)
    return [e for e in entries if any(p["text"] for p in e)]


def parse_person(entry):
    """One person entry -> (person, report_title, report_abstract).

    `report_title` / `report_abstract` are None in the chair section and whenever
    the source left a guest's report unfilled.
    """
    bolds = [p for p in entry if p["bold"] and p["text"]]
    if not bolds:
        return None, None, None
    name = bolds[0]["text"]
    photo = next((p["images"][0] for p in entry if p["images"]), None)
    start = entry.index(bolds[0])
    rest = entry[start + 1:]
    title_idx = next((i for i, p in enumerate(rest) if p["bold"] and p["text"]), None)
    bio_pars = rest if title_idx is None else rest[:title_idx]
    bio = "\n\n".join(p["text"] for p in bio_pars if p["text"]) or None
    person = {"name": name, "bio": bio, "photo": {"local_path": None, "source_url": photo}}
    if title_idx is None:
        return person, None, None
    title = rest[title_idx]["text"]
    abstract = "\n\n".join(p["text"] for p in rest[title_idx + 1:] if p["text"]) or None
    return person, title, abstract


def looks_like_person(text):
    if text in PANEL_LABELS or any(text.startswith(lbl) for lbl in PANEL_LABELS):
        return False
    return bool(CJK_NAME.match(text) or LATIN_NAME.match(text))


def parse_keywords(keywords):
    """A document's `keywords` -> (ISO date, [chair {name, chair_role}]).

    Example: "8月15日,论坛主席：曹东刚,论坛主席：张羽". It is the only place the
    site states a forum's date, and for the forums whose page has no 论坛主席
    section it is the only place the chairs are named.
    """
    date, chairs, seen = None, [], set()
    for part in re.split(r"[,，]", keywords or ""):
        part = clean(part)
        if not part:
            continue
        md = MONTH_DAY.search(part)
        if md and not date:
            date = f"{YEAR}-{int(md.group(1)):02d}-{int(md.group(2)):02d}"
            continue
        m = CHAIR_KW.match(part)
        if m:
            role, name = clean(m.group(1)), clean(m.group(2))
            if name and name not in seen:
                seen.add(name)
                chairs.append({"name": name, "chair_role": role})
    return date, chairs


def forum_title(doc_name):
    """'【2026CCF中国开源大会分论坛介绍】开源芯片' -> '开源芯片'."""
    return clean(re.sub(r"^【[^】]*】", "", doc_name or "")) or clean(doc_name)


# --------------------------------------------------------------------------
# the transcribed timetable
# --------------------------------------------------------------------------

# Punctuation the CMS text and the printed timetable spell differently for the
# same title — full-width vs ASCII colons, the several dashes, the space around
# them. Folded away only to decide whether two titles are THE SAME title; both
# strings are still recorded as they were written.
TITLE_FOLD = str.maketrans({
    "：": ":", "，": ",", "（": "(", "）": ")", "、": ",",
    "—": "-", "–": "-", "－": "-", "‐": "-", "　": " ",
})


def fold_title(s):
    """A title reduced to what it says, for comparison only."""
    s = (s or "").translate(TITLE_FOLD).lower()
    return re.sub(r"[\s\-,.:()]+", "", s)


# Above this, two titles are the same report spelled differently (a missing
# 设施, a "Keynote:" prefix, 和 for 与). Below it they are different reports, and
# the card's abstract belongs to neither the row nor the reader.
SAME_REPORT = 0.6


def same_report(a, b):
    return difflib.SequenceMatcher(None, fold_title(a), fold_title(b)).ratio()


def load_agenda(doc_id):
    """The hand-transcribed timetable for a forum document, or None."""
    p = AGENDA / f"{doc_id}.json"
    return json.loads(p.read_text()) if p.exists() else None


def load_images():
    """doc id -> every image the page embeds (see fetch.py)."""
    p = RAW / "images.json"
    return json.loads(p.read_text()) if p.exists() else {}


IMAGES = load_images()


# A title this alike, on a row no other card claims, is the same report even
# when the two surfaces spell the speaker's name differently — but only when the
# names are a spelling of each other (郭伟康 / 郭康伟), never when they are two
# different people who happen to share a title.
SAME_REPORT_BY_TITLE = 0.9
SAME_PERSON = 0.5


def bind_reports(rows, cards, flags):
    """Match each titled guest card to the timetable row it describes.

    A card carries one report, so it binds to at most one row, and only to a row
    that names both the guest AND (allowing for the two surfaces spelling a
    title differently) the same report. The panel row a speaker also sits on
    must not inherit their talk's abstract. Returns {row index: card}.
    """
    bound, taken = {}, set()
    titled = [c for c in cards if c.get("title")]

    def claim(card, allow_name_mismatch):
        best, score = None, 0
        for i, row in enumerate(rows):
            if i in taken or row.get("kind") == "break":
                continue
            name = card["person"]["name"]
            printed = [s["name"] for s in row.get("speakers", [])]
            if allow_name_mismatch:
                # A misspelling, not a different person.
                if not any(difflib.SequenceMatcher(None, n, name).ratio() >= SAME_PERSON
                           for n in printed):
                    continue
            elif name not in printed:
                continue
            r = same_report(card["title"], row["title"])
            if r > score:
                best, score = i, r
        floor = SAME_REPORT_BY_TITLE if allow_name_mismatch else SAME_REPORT
        if best is None or score < floor:
            return False
        taken.add(best)
        bound[best] = card
        if allow_name_mismatch:
            printed = "/".join(s["name"] for s in rows[best].get("speakers", []))
            flags.append(
                f"the timetable image and the page text name the speaker of "
                f"'{rows[best]['title']}' differently: '{printed}' vs "
                f"'{card['person']['name']}'; the image is kept"
            )
        return True

    for card in titled:
        claim(card, allow_name_mismatch=False)
    # Second pass: a report the timetable prints but whose card the first pass
    # could not reach, because only the name disagrees. Without this the report
    # is listed twice — once timed from the image, once timeless from the card.
    for card in titled:
        if card not in bound.values():
            claim(card, allow_name_mismatch=True)
    return bound


def merge_timetable(rows, cards, flags):
    """Timetable rows + guest cards -> (talks, breaks).

    The rows are the programme; the cards decorate them. A person's bio and
    portrait follow the person, onto every row that names them. A report's
    abstract follows the report, onto the one row that is it. A card whose
    report the timetable never prints is appended, timeless, and flagged.
    """
    detail = {}
    for card in cards:
        detail.setdefault(card["person"]["name"], card["person"])
    bound = bind_reports(rows, cards, flags)

    talks, breaks = [], []
    for i, row in enumerate(rows):
        if row.get("kind") == "break":
            breaks.append({"name": row["title"], "start": row["start"], "end": row["end"]})
            continue

        speakers = []
        for printed in row.get("speakers", []):
            person = {"name": printed["name"]}
            if printed.get("affiliation_raw"):
                person["affiliation_raw"] = printed["affiliation_raw"]
            known = detail.get(printed["name"], {})
            if known.get("bio"):
                person["bio"] = known["bio"]
            if (known.get("photo") or {}).get("source_url"):
                person["photo"] = known["photo"]
            speakers.append(person)

        card = bound.get(i)
        abstract = card["abstract"] if card else None
        talk = {
            "order": len(talks) + 1,
            "title": i18n(row["title"]),
            "title_status": "confirmed",
            "start": row["start"],
            "end": row["end"],
            "speakers": speakers,
            "abstract": abstract,
            "abstract_status": "confirmed" if abstract else "unknown",
            "type": "other" if row.get("kind") == "other" else "talk",
        }
        if card and fold_title(card["title"]) != fold_title(row["title"]):
            # Both spellings are published by the same site; the image is the
            # programme, so it wins the title and the page text is kept beside it.
            talk["extra"] = {"cms_title": card["title"]}
            flags.append(
                f"the timetable image and the page text title this report "
                f"differently: '{row['title']}' vs '{card['title']}'"
            )
        talks.append(talk)

    on_timetable = {s["name"] for r in rows for s in r.get("speakers", [])}
    for name in sorted(n for n in on_timetable if PLACEHOLDER_SPEAKER.search(n)):
        flags.append(
            f"the timetable's 讲者 column prints a label rather than a bare "
            f"name: '{name}'; kept as printed"
        )
    for card in cards:
        if card in bound.values() or not card.get("title"):
            continue
        talk = card_talk(card, len(talks) + 1)
        talk["extra"] = dict(talk.get("extra") or {}, off_timetable=True)
        name = card["person"]["name"]
        flags.append(
            f"the page introduces a report by '{name}' that the timetable image "
            f"does not print: '{card['title']}'" if name in on_timetable else
            f"guest '{name}' is introduced on the page but does not appear in "
            f"the timetable image"
        )
        talks.append(talk)

    return talks, breaks


# A timetable row that is the panel the Panel section describes.
PANEL_ROW = re.compile(r"panel|圆桌|对话", re.I)

# A 讲者 cell that names a group instead of a person — "演讲嘉宾", "报告嘉宾及论坛
# 主席", "京东（人员待定）". Printed that way by the site, so recorded that way,
# but worth saying out loud: these are not people.
PLACEHOLDER_SPEAKER = re.compile(r"嘉宾|主持人|参与者|待定|报告人|所有")


def attach_panel_prose(talks, panel, flags):
    """Give the Panel section's free-form lines to the panel row of the day.

    The section's prose (the discussion topics, the rounds) has no other home
    once the timetable owns the programme. It goes to the panel row, or — if the
    timetable prints no panel — becomes a session of its own, as before.
    """
    if not panel["prose"]:
        return
    row = next((t for t in talks if PANEL_ROW.search(t.get("title", {}).get("zh", ""))), None)
    if row is None:
        talks.append({
            "order": len(talks) + 1,
            "title": i18n(panel["heading"]),
            "title_status": "confirmed",
            "start": None,
            "end": None,
            "speakers": panel["speakers"],
            "abstract": panel["prose"],
            "abstract_status": "confirmed" if panel["prose"] else "unknown",
            "type": "other",
        })
        flags.append(
            f"the page has a {panel['heading']} section but the timetable image "
            f"prints no panel row; kept as a session with no time"
        )
        return
    if row["abstract"]:
        row["abstract"] = f"{row['abstract']}\n\n{panel['prose']}"
    else:
        row["abstract"] = panel["prose"]
        row["abstract_status"] = "confirmed"


def card_talk(card, order):
    """A guest card as a talk of its own — no time, because the card has none."""
    talk = {
        "order": order,
        "start": None,
        "end": None,
        "speakers": [card["person"]],
        "abstract": card["abstract"],
        "abstract_status": "confirmed" if card["abstract"] else "unknown",
        "type": "talk",
    }
    if card["title"]:
        talk["title"] = i18n(card["title"])
        talk["title_status"] = "confirmed"
    else:
        # The template left this guest's report unfilled; recorded as-is.
        talk["title_status"] = "unknown"
        talk["type"] = "other"
    return talk


def parse_forum(row):
    doc, html = doc_html(row["id"])
    preamble, sections = split_sections(paragraphs(html))
    flags = []
    code = f"F{doc['id']}"
    title = forum_title(doc.get("name"))
    day_date, kw_chairs = parse_keywords(doc.get("keywords"))
    if not day_date:
        flags.append("no date in the document keywords")

    by_heading = {}
    for h, ps in sections:
        by_heading.setdefault(h, []).extend(ps)

    # 论坛主旨 — the forum abstract.
    description = "\n\n".join(p["text"] for p in by_heading.get(SEC_TOPIC, []) if p["text"]) or None
    if description is None:
        flags.append("no 论坛主旨 section on the page")

    # 论坛主席 — chairs stated on the page (with bios); the keywords may name
    # chairs the page itself never introduces, so both are merged, page first.
    chairs, chair_names = [], set()
    for entry in person_entries(by_heading.get(SEC_CHAIRS, [])):
        person, _, _ = parse_person(entry)
        if person and person["name"] not in chair_names:
            chair_names.add(person["name"])
            person["chair_role"] = SEC_CHAIRS
            chairs.append(person)
    for c in kw_chairs:
        if c["name"] not in chair_names:
            chair_names.add(c["name"])
            chairs.append({"name": c["name"], "bio": None, "chair_role": c["chair_role"]})
            if ORG_NAME.search(c["name"]):
                # e.g. 鲲鹏昇腾 names "华为公司" as its chair; kept as published.
                flags.append(f"the keywords name an organization as chair: '{c['name']}'")
    if not chairs:
        flags.append("no forum chair named on the page or in the keywords")

    # 论坛议程 — the per-talk timetable, published only as an image, and the
    # transcription of it (see the module docstring).
    agenda = load_agenda(doc["id"])
    poster = None
    for p in by_heading.get(SEC_AGENDA, []):
        if p["images"]:
            poster = {"local_path": None, "source_url": p["images"][0]}
            break
    if poster is None and agenda and agenda["images"]:
        # Two forums print their timetable outside a 论坛议程 heading; the
        # transcription names the file, so the poster is found through it.
        by_file = {im["file"]: im["url"] for im in IMAGES.get(str(doc["id"]), [])}
        url = by_file.get(agenda["images"][0])
        if url:
            poster = {"local_path": None, "source_url": url}
    if poster is None:
        flags.append("no timetable image on the page")

    # 嘉宾与报告介绍 — the guest cards: photo, name, bio, report title, abstract.
    # They are the supplement, not the programme (see the module docstring).
    cards = []
    guest_pars = [p for h in SEC_GUESTS for p in by_heading.get(h, [])]
    for entry in person_entries(guest_pars):
        person, report_title, abstract = parse_person(entry)
        if person is None:
            continue
        if not report_title:
            flags.append(f"guest '{person['name']}' has no report title on the page")
        cards.append({"person": person, "title": report_title, "abstract": abstract})

    # Panel — the template mixes panellist cards with free-form topic lines. The
    # panellists join the guest cards, so their bios reach whichever timetable
    # row names them; the free-form lines stay together as the session's prose.
    panels = []
    for heading in SEC_PANEL:
        pars = by_heading.get(heading)
        if not pars:
            continue
        # "嘉宾" / "议题" appear as bare sub-labels with nothing under them; they
        # carry no content, so they are not folded into the session's abstract.
        pars = [p for p in pars if p["text"] not in PANEL_LABELS]
        speakers, prose = [], []
        for entry in person_entries(pars):
            person, extra_title, extra_abstract = parse_person(entry)
            if person and looks_like_person(person["name"]):
                speakers.append(person)
                if extra_title:
                    prose.append(extra_title)
                if extra_abstract:
                    prose.append(extra_abstract)
            else:
                prose.extend(p["text"] for p in entry if p["text"])
        panels.append({"heading": heading, "speakers": speakers,
                       "prose": "\n\n".join(prose) or None})

    # Where a timetable exists it dictates the programme; where the page never
    # published one, the cards stand alone.
    breaks = []
    if agenda and agenda["rows"]:
        panellist_cards = [{"person": p, "title": None, "abstract": None}
                           for panel in panels for p in panel["speakers"]]
        talks, breaks = merge_timetable(agenda["rows"], cards + panellist_cards, flags)
        for panel in panels:
            attach_panel_prose(talks, panel, flags)
    else:
        talks = [card_talk(c, i + 1) for i, c in enumerate(cards)]
        for panel in panels:
            talks.append({
                "order": len(talks) + 1,
                "title": i18n(panel["heading"]),
                "title_status": "confirmed",
                "start": None,
                "end": None,
                "speakers": panel["speakers"],
                "abstract": panel["prose"],
                "abstract_status": "confirmed" if panel["prose"] else "unknown",
                "type": "other",
            })
        if agenda:
            flags.append("the page publishes no timetable image, so no talk carries a time")

    if not talks:
        flags.append("no guest/report section on the page yet")
    # The same guest CARD twice in one forum usually means the page repeats it
    # with a different blurb; recorded verbatim and flagged. Counted over the
    # cards, not the programme — chairing a session and then joining the panel
    # is a person appearing twice legitimately, and says nothing about the page.
    guest_names = [c["person"]["name"] for c in cards]
    repeated = sorted({n for n in guest_names if guest_names.count(n) > 1})
    for name in repeated:
        flags.append(f"guest '{name}' is introduced more than once on the page")

    forum = {
        "code": code,
        "title": i18n(title),
        "day_date": day_date,
        # Every forum runs in the afternoon parallel-forum window of its day.
        "session_period": "afternoon" if day_date else None,
        # No timetable image printed a room either; the venue is the whole site.
        "room": (agenda or {}).get("room"),
        "description": description,
        "chairs": chairs,
        "talks": talks,
        "poster": poster,
        "source_url": f"{SITE}/information/detail/{doc['id']}",
        "detail_extracted": bool(talks),
        "extra": {
            "cms_doc_id": doc["id"],
            "cms_doc_name": doc.get("name"),
            "published_at": doc.get("publishTime"),
            "summary": doc.get("summary") or None,
            # Every image the page embeds, in document order — the banners, the
            # portraits, the QR codes and the timetable itself. The programme
            # was hiding in these, so the index is part of the record.
            "images": IMAGES.get(str(doc["id"]), []),
        },
    }
    if breaks:
        forum["breaks"] = breaks
    if agenda:
        forum["extra"]["timetable_images"] = agenda["images"]
        if agenda.get("notes"):
            forum["extra"]["timetable_notes"] = agenda["notes"]
    if flags:
        forum["flags"] = flags
    return forum


# --------------------------------------------------------------------------
# day documents
# --------------------------------------------------------------------------

def block_kind(event):
    """Map a day-timetable row to a schema block kind."""
    if "报到" in event or "签到" in event or "注册" in event:
        return "registration"
    if "午餐" in event or "晚餐" in event or "茶歇" in event or "用餐" in event:
        return "break"
    if "晚宴" in event or "宴会" in event:
        return "banquet"
    if "年会" in event or "工作会议" in event:
        return "committee_meetings"
    if "分论坛" in event:
        return "forums"
    if "开幕式" in event or "特邀报告" in event or "高峰论坛" in event:
        return "keynotes"
    return "other"


def parse_day(row):
    """One 议程详情 document -> (ISO date, [block]).

    Each row of the document is "<time range><period label><event>"; the period
    label (全天 / 上午 / 午间 / 下午 / 晚间) has no schema field of its own and is
    kept verbatim on the block's `extra`.
    """
    doc, html = doc_html(row["id"])
    md = MONTH_DAY.search(doc.get("name") or "")
    if not md:
        return None, []
    date = f"{YEAR}-{int(md.group(1)):02d}-{int(md.group(2)):02d}"
    soup = BeautifulSoup(html, "html.parser")
    blocks = []
    for p in soup.find_all("p"):
        cells = [clean(s.get_text(" ")) for s in p.find_all("span")]
        cells = [c for c in cells if c]
        if not cells:
            continue
        tm = TIME_RANGE.search(cells[0])
        start, end = (tm.group(1), tm.group(2)) if tm else (None, None)
        event = cells[-1]
        period = cells[1] if len(cells) > 2 else None
        if not event:
            continue
        block = {
            "id": f"{date}-{len(blocks) + 1}",
            "kind": block_kind(event),
            "title": i18n(event),
            "start": start,
            "end": end,
            "location": None,
            "note": None,
        }
        if period:
            block["extra"] = {"period_label": period}
        blocks.append(block)
    return date, blocks


# --------------------------------------------------------------------------
# people, partners, notices
# --------------------------------------------------------------------------

# Role groups the GitLink zone template ships with; they belong to the platform's
# generic community model, not to this conference, and are empty here.
PLATFORM_ROLES = ("PMC", "Commiter", "Committer", "Developer", "User")


def parse_committees():
    """member/overviewList -> schema committees.

    The site groups its people by conference role (大会主席 / 与会嘉宾 / …). Only
    the non-empty groups become committees; the empty ones (程序委员会,
    组织委员会, 财务委员会, 宣传委员会, 院士嘉宾) are published but unfilled.
    """
    rows = load("members.json")["rows"]
    committees, empty = [], []
    for group in rows:
        name = clean(group.get("typeName"))
        if any(name.startswith(p) for p in PLATFORM_ROLES):
            continue
        members = group.get("zoneMemberList") or []
        if not members:
            empty.append(name)
            continue
        seen, people = set(), []
        duplicates = []
        for m in members:
            nm = clean(m.get("name"))
            if not nm:
                continue
            if nm in seen:
                # The site lists a few people twice with different blurbs; both
                # are kept verbatim and the repetition is recorded, not merged.
                duplicates.append(nm)
            seen.add(nm)
            # The CMS gives one `introduction` line per person, which is what the
            # site itself prints under the name — kept verbatim as affiliation_raw.
            people.append({"name": nm, "affiliation_raw": clean(m.get("introduction")) or None,
                           "photo": {"local_path": None, "source_url": m.get("imageUrl") or None}})
        entry = {"role": i18n(name), "ordering_note": None, "members": people}
        if duplicates:
            entry["extra"] = {"duplicate_entries": sorted(set(duplicates))}
        committees.append(entry)
    return committees, empty


def parse_organizations():
    """The hosts (from the zone's own conference blurb) plus the partner list."""
    orgs = [
        {"name": i18n("中国计算机学会", "CCF"), "role": "host", "sponsor_tier": None},
        {"name": i18n("CCF开源发展技术委员会"), "role": "co_host", "sponsor_tier": None},
        {"name": i18n("重庆大学"), "role": "co_host", "sponsor_tier": None},
    ]
    for group in load("partners.json")["rows"]:
        kind = clean(group.get("typeName"))
        for p in group.get("zonePartnersList") or []:
            name = clean(p.get("name"))
            if not name:
                continue
            orgs.append({
                "name": i18n(name),
                "role": "support",
                "sponsor_tier": None,
                "logo": {"local_path": None, "source_url": p.get("logo") or None},
                "extra": {"partner_type": kind},
            })
    return orgs


def parse_notices():
    """The 会议通知 documents — registration/attendance guides, kept as links."""
    out = []
    for row in doc_rows(DIR_NOTICES):
        out.append({
            "title": clean(row.get("name")),
            "url": f"{SITE}/information/detail/{row['id']}",
            "published_at": row.get("publishTime"),
        })
    return out


# --------------------------------------------------------------------------
# assembly
# --------------------------------------------------------------------------

def build():
    forums = [parse_forum(r) for r in doc_rows(DIR_FORUMS)]
    forums.sort(key=lambda f: (f["day_date"] or "9999-99-99", f["code"]))

    enrich_path = pathlib.Path(__file__).resolve().parent / "enrichment.json"
    n_enriched, n_summaries = apply_enrichment(forums, enrich_path)

    day_blocks = {}
    for row in doc_rows(DIR_DAYS):
        date, blocks = parse_day(row)
        if date:
            day_blocks[date] = blocks

    # Attach the forums to their day's parallel-forum block; a date the day
    # documents never mention still gets its own forums block so nothing is lost.
    for date, blocks in day_blocks.items():
        entries = [{"forum_code": f["code"], "room": f["room"]}
                   for f in forums if f["day_date"] == date]
        if not entries:
            continue
        target = next((b for b in blocks if b["kind"] == "forums"), None)
        if target is None:
            target = {"id": f"{date}-forums", "kind": "forums", "title": i18n("领域分论坛"),
                      "start": None, "end": None, "location": None, "note": None}
            blocks.append(target)
        target["forum_entries"] = entries
    orphan_dates = sorted({f["day_date"] for f in forums if f["day_date"]} - set(day_blocks))
    for date in orphan_dates:
        day_blocks[date] = [{
            "id": f"{date}-forums", "kind": "forums", "title": i18n("领域分论坛"),
            "start": None, "end": None, "location": None, "note": None,
            "forum_entries": [{"forum_code": f["code"], "room": f["room"]}
                              for f in forums if f["day_date"] == date],
        }]

    days = [{"date": d, "venue_id": "cq-sciic", "blocks": day_blocks[d]}
            for d in sorted(day_blocks)]

    committees, empty_committees = parse_committees()
    zone = load("zone.json")["data"]
    notices = parse_notices()

    conf = {
        "id": CONF_ID,
        "source_url": f"{SITE}/",
        "name": i18n("2026 CCF中国开源大会", "CCF ChinaOSC 2026"),
        "start_date": days[0]["date"],
        "end_date": days[-1]["date"],
        "timezone": "Asia/Shanghai",
        "links": {
            "official": f"{SITE}/",
            # printed on every forum page's registration footer
            "register": "https://ccf.org.cn/2026COSC",
        },
        "venues": [{
            "id": "cq-sciic",
            "name": i18n("重庆・山城国际会议中心"),
            "type": "main",
            "city": "重庆",
        }],
        "organizations": parse_organizations(),
        "committees": committees,
        "days": days,
        "forums": forums,
        "extra": {
            "theme": "渝见开源，数智启新",
            # The conference announces itself as a two-day event; `start_date`
            # additionally covers the check-in day the agenda publishes.
            "official_dates": "2026年8月15日至16日",
            "introduction": clean(zone.get("introductionContent")) or None,
            "notices": notices,
            # Published on the site but still unfilled at extraction time.
            "empty_role_groups": empty_committees,
        },
        "extraction": {
            "source": "chinaosc.ccf.org.cn (GitLink zone CMS, zoneKey=kydh2026)",
            "forums_total": len(forums),
            "forums_detail_extracted": sum(1 for f in forums if f["detail_extracted"]),
            "notes": (
                f"Parsed from the site's CMS documents: {len(forums)} forums and "
                f"{sum(len(f['talks']) for f in forums)} forum sessions across "
                f"{len(days)} days. The per-talk timetable is published only as an "
                f"image inside each forum page (kept as the forum poster), so forum "
                f"talks carry no time of their own and inherit the day's "
                f"parallel-forum window. The site publishes no per-forum room."
            ),
        },
    }

    payload = json.dumps(conf, ensure_ascii=False, indent=2)
    for p in (ROOT / "data" / f"{CONF_ID}.json",
              ROOT / "web" / "src" / "data" / "conferences" / f"{CONF_ID}.json"):
        p.write_text(payload)
        print("wrote", p)

    flagged = [f for f in forums if f.get("flags")]
    print(f"\nforums: {len(forums)}  |  days: {[d['date'] for d in days]}")
    print(f"talks total: {sum(len(f['talks']) for f in forums)}")
    print(f"chairs total: {sum(len(f['chairs']) for f in forums)}")
    print(f"committees: {[(c['role']['zh'], len(c['members'])) for c in committees]}")
    print(f"empty role groups on the site: {empty_committees}")
    print(f"notices: {len(notices)}")
    print(f"enriched talks: {n_enriched}  |  with zh summary: {n_summaries}")
    print(f"flagged forums: {len(flagged)}")
    for f in flagged:
        print(f"  ! {f['code']} ({f['title']['zh']}): {f['flags']}")


if __name__ == "__main__":
    build()
