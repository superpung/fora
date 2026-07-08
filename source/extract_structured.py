#!/usr/bin/env python3
"""从已抓取的栏目 JSON 中抽取【结构化/文本】内容（非海报图部分），落盘到 extracted/。
海报类(CF论坛)只输出 图片映射，供后续视觉读取。"""
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
    """FILE_ 字段是被截断/转义的伪 JSON，尽量取出附件ID/文件名。"""
    if not v:
        return []
    try:
        return ast.literal_eval(v)
    except Exception:
        return [{"raw": v[:120]}]


# ---- 1. 组织机构 / 程序委员会等人员类 (ZZJG 模板: NAME_INFO/MAIN_INFO) ----
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

# ---- 2. 纯文本类栏目 (会议介绍/程序委员会/论文征集/技术论坛intro/邀请函/住宿/赞助) ----
# 不同模板字段名不同(MAIN_BODY / INTRODUCTION / INTRODUCTION_SHORT / LINK_CONTENT ...)
# 通用做法: 收集文章里所有"看起来像正文"的字段
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

# ---- 3. 合作单位 / 赞助 (可能含 NAME_INFO 或 logo 图) ----
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

# ---- 4. CF 论坛海报图映射 ----
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
