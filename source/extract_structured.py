#!/usr/bin/env python3
"""Extract structured / text content (the non-poster-image parts) from the
crawled channel JSON, writing to extracted/. Poster-based channels (CF forums)
only emit an image map, for later visual reading."""
import json, re, html, pathlib, ast

ROOT = pathlib.Path(__file__).resolve().parent
API = ROOT / "raw" / "api"
CH = API / "channels"
OUT = ROOT / "extracted"
OUT.mkdir(exist_ok=True)

man = json.loads((API / "manifest.json").read_text())
chans = man["channels"]
assets = man["assets"]  # url -> local relpath
by_id = {c["id"]: c for c in chans}
# name may repeat (CFxx unique though); build name->list
from collections import defaultdict
by_name = defaultdict(list)
for c in chans:
    by_name[c["name"]].append(c)


def arts(cid):
    p = CH / f"{cid}.json"
    if not p.exists():
        return []
    d = json.loads(p.read_text())
    return d if isinstance(d, list) else []


def plain(body):
    body = body or ""
    t = re.sub(r"<[^>]+>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def imgs_in(body):
    out = []
    for u in re.findall(r'<img[^>]+src=["\x27]([^"\x27]+)', body or ""):
        out.append(assets.get(u, u))
    return out


def parse_file_field(v):
    """The FILE_ field is truncated / escaped pseudo-JSON; best-effort extract
    the attachment id / filename."""
    if not v:
        return []
    try:
        return ast.literal_eval(v)
    except Exception:
        return [{"raw": v[:120]}]


# ---- 1. Org / program-committee people (ZZJG template: NAME_INFO/MAIN_INFO) ----
PEOPLE_SUPERS = set()
for c in chans:
    if c["name"] in ("组织机构",):
        PEOPLE_SUPERS.add(c["id"])
# people channels = lev3 whose article has NAME_INFO
people = {}
for c in chans:
    a = arts(c["id"])
    if a and isinstance(a[0], dict) and "NAME_INFO" in a[0]:
        role = c["name"]
        people[role] = []
        for x in a:
            people[role].append({
                "order": x.get("ORDERS"),
                "name": x.get("NAME_INFO"),
                "affiliation_title": x.get("MAIN_INFO"),
                "group": x.get("GROUP_INFO"),
                "work": x.get("WORK_INFO"),
                "photo_raw": (x.get("FILE_") or "")[:60],
            })
(OUT / "people.json").write_text(json.dumps(people, ensure_ascii=False, indent=2))
print("people roles:", len(people), "total persons:", sum(len(v) for v in people.values()))

# ---- 2. Plain-text channels (intro / program committee / call for papers /
#         technical-forum intro / invitation / accommodation / sponsorship) ----
# Field names vary by template (MAIN_BODY / INTRODUCTION / INTRODUCTION_SHORT /
# LINK_CONTENT ...); the general approach is to collect every "body-like" field.
HTML_FIELDS = ("MAIN_BODY", "INTRODUCTION", "INTRODUCTION_SHORT",
               "ADDRESS_CONTENT", "LINK_CONTENT", "CONTENT", "MAIN_INFO")
texts = {}
for name in ["会议介绍", "程序委员会", "论文征集", "技术论坛", "邀请函",
             "住宿预订", "诚邀赞助", "资料下载"]:
    for c in by_name.get(name, []):
        a = arts(c["id"])
        parts, raw_all = [], []
        for x in a:
            for fld in HTML_FIELDS:
                v = x.get(fld)
                if v and str(v) not in ("None", ""):
                    parts.append(plain(v))
                    raw_all.append(v)
        texts[name] = {
            "channel_id": c["id"],
            "text": "\n".join(p for p in parts if p),
            "images": imgs_in(" ".join(raw_all)),
            "fields": sorted({k for x in a for k in x.keys()}),
        }
(OUT / "texts.json").write_text(json.dumps(texts, ensure_ascii=False, indent=2))
print("text channels:", list(texts.keys()))

# ---- 2b. Program-committee member roster ------------------------------------
# The 程序委员会 page's MAIN_BODY carries TWO groups: the chairs
# (大会程序委员会主席 — also a structured NAME_INFO people channel, extracted in
# step 1) and the full member roster (大会程序委员会委员). The roster is NOT in the
# NAME_INFO template — it's a flat list of alternating name / affiliation <p>
# elements — so step 1 misses it and only the 4 chairs ever reach the dataset.
# Parse the roster here so the ~130 members become a real committee group.
def _celltext(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()

pc_members = []
for c in by_name.get("程序委员会", []):
    body = next((x.get("MAIN_BODY") for x in arts(c["id"]) if x.get("MAIN_BODY")), "")
    if not body:
        continue
    toks, section = [], None
    for m in re.finditer(r"<(h1|p)\b[^>]*>(.*?)</\1>", body, re.S):
        tag, inner = m.group(1), _celltext(m.group(2))
        if not inner:
            continue
        if tag == "h1":
            section = inner
        elif section and "委员" in section and "主席" not in section:
            toks.append(inner)
    # the roster alternates name, affiliation, name, affiliation, …
    for i in range(0, len(toks) - 1, 2):
        pc_members.append({"name": toks[i], "affiliation_title": toks[i + 1]})
(OUT / "program_committee.json").write_text(
    json.dumps(pc_members, ensure_ascii=False, indent=2))
print("program committee members:", len(pc_members))

# ---- 3. Partners / sponsors (may carry NAME_INFO or a logo image) ----
sponsors = {}
for c in chans:
    if c["super"] and any(p["name"] == "合作单位" for p in by_name.get("合作单位", []) if p["id"] == c["super"]):
        a = arts(c["id"])
        items = []
        for x in a:
            if "NAME_INFO" in x:
                items.append({"name": x.get("NAME_INFO"), "info": x.get("MAIN_INFO"),
                              "logo_raw": (x.get("FILE_") or "")[:60]})
            else:
                items.append({"images": imgs_in(x.get("MAIN_BODY", "")),
                              "text": plain(x.get("MAIN_BODY", ""))})
        sponsors[c["name"]] = items
(OUT / "sponsors.json").write_text(json.dumps(sponsors, ensure_ascii=False, indent=2))
print("sponsor tiers:", list(sponsors.keys()))

# ---- 4. CF forum poster-image map ----
forums = []
for c in sorted([c for c in chans if re.fullmatch(r"CF\d+", c["name"])],
                key=lambda c: c["name"]):
    a = arts(c["id"])
    body = " ".join(x.get("MAIN_BODY", "") or "" for x in a)
    imgs = imgs_in(body)
    forums.append({"code": c["name"], "channel_id": c["id"],
                   "poster_images": imgs, "body_text": plain(body)})
(OUT / "forum_images.json").write_text(json.dumps(forums, ensure_ascii=False, indent=2))
print("forums:", len(forums), "| all have 1 image:",
      all(len(f["poster_images"]) == 1 for f in forums))
