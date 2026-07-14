#!/usr/bin/env python3
"""装配 CCF Chip 2026 完整数据集 -> data/ccfchip2026.json（符合 schema/schema.json）。
数据来源：
  - 总览级信息（会议元数据/主席团keynote/48论坛→会议室/专委会/晚宴）：本文件内编码，来自 大会议程 6 张总览图。
  - 结构化内容：source/extracted/{people,sponsors,texts,forum_images}.json
  - 论坛详情：data/forums_detail/CF*.json（已视觉解析的论坛，逐步补全）
"""
import json, pathlib, datetime, glob, os, hashlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
EXT = SRC / "extracted"
DETAIL = ROOT / "data" / "forums_detail"


def load(p):
    return json.loads(pathlib.Path(p).read_text())


people = load(EXT / "people.json")
sponsors_raw = load(EXT / "sponsors.json")
texts = load(EXT / "texts.json")
forum_imgs = {f["code"]: f for f in load(EXT / "forum_images.json")}
# Official per-forum article URL (general_NNNN), recovered from the site's
# getShortUrl.action short-url table joined to each forum's channel id.
forum_urls = load(EXT / "forum_source_urls.json")

# ---------------- 会议元数据 ----------------
conf = {
    "id": "ccfchip2026",
    "source_url": "https://ccf.org.cn/ccfchip2026",
    "name": {"zh": "第三届CCF芯片大会", "en": "CCF Chip 2026"},
    "edition": "第三届",
    "start_date": "2026-07-17",
    "end_date": "2026-07-20",
    "timezone": "Asia/Shanghai",
    "contact": {"email": "ccfchip2026@castest.com.cn"},
    "links": {},
    "venues": [
        {"id": "wxicc", "name": {"zh": "无锡国际会议中心", "en": None}, "type": "main", "city": "无锡"},
        {"id": "hotel", "name": {"zh": "大会推荐酒店", "en": None}, "type": "hotel", "city": "无锡"},
    ],
}

# ---------------- 组织单位 ----------------
conf["organizations"] = [
    {"name": {"zh": "中国计算机学会", "en": None}, "role": "host", "sponsor_tier": None},
] + [
    {"name": {"zh": n, "en": None}, "role": "co_host", "sponsor_tier": None}
    for n in ["CCF容错计算专委", "CCF计算机工程与工艺专委", "CCF体系结构专委",
              "CCF集成电路设计专委", "南京大学", "南京邮电大学"]
] + [
    {"name": {"zh": n, "en": None}, "role": "support", "sponsor_tier": None}
    for n in ["东南大学", "江南大学"]
]
# 赞助单位（按档位）
for tier, items in sponsors_raw.items():
    for it in items:
        nm = it.get("name") or (it.get("text") or "").strip()
        if nm:
            conf["organizations"].append(
                {"name": {"zh": nm, "en": None}, "role": "sponsor", "sponsor_tier": tier})

# ---------------- 委员会（51 人） ----------------
conf["committees"] = []
for role, members in people.items():
    ordering = "按拼音排序" if "拼音" in role else None
    role_clean = role.replace("（按拼音排序）", "")
    conf["committees"].append({
        "role": {"zh": role_clean, "en": None},
        "ordering_note": ordering,
        "members": [
            {"name": m["name"], "affiliation_raw": m.get("affiliation_title"),
             "organization": None, "title": None, "honorifics": [], "bio": None}
            for m in members
        ],
    })

# ---------------- 主旨报告 ----------------
def kt(s, e, name, aff, title, honor=None, typ="keynote", status="confirmed"):
    sp = {"name": name, "affiliation_raw": aff, "honorifics": honor or []}
    return {"start": s, "end": e, "type": typ,
            "title": {"zh": title, "en": None},
            "title_status": status,
            "speakers": [sp] if name else [],
            "abstract": None, "abstract_status": "unknown"}

keynotes_0718 = [
    {"start": "08:30", "end": "09:00", "type": "opening",
     "title": {"zh": "开幕式", "en": None}, "title_status": "confirmed",
     "speakers": [], "abstract": None, "abstract_status": "unknown"},
    kt("09:00", "09:40", "毛军发", "深圳大学讲席教授", "射频异质异构集成技术", ["中国科学院院士"]),
    kt("09:40", "10:15", "曾晓洋", "复旦大学教授", "感算一体智能感知芯片与应用"),
    kt("10:35", "11:10", "韩银和", "中国科学院计算技术研究所研究员", "反直觉的太空超算和大算力太空芯片设计"),
    kt("11:10", "11:30", "王绍迪", "知存科技创始人兼CEO", "面向大语言模型的存内计算"),
    kt("11:30", "11:45", "闫守孟", "蚂蚁集团蚂蚁密算CTO",
       "全同态密算芯片：万倍加速突破同态落地鸿沟，可证安全护航数据价值流通"),
    kt("11:45", "12:00", "杨道虹", "江城实验室主任 湖北大学集成电路学院院长",
       "智算时代AI芯片发展及先进封装技术演进"),
]
keynotes_0719 = [
    kt("08:30", "09:10", "洪伟", "东南大学首席教授", "毫米波与太赫兹芯片研究进展", ["中国科学院院士"]),
    kt("09:10", "09:50", "张荣", "厦门大学教授", "报告题目待定", ["中国科学院院士"], status="tbd"),
    kt("09:50", "10:25", "赵元富", "航天科技九院技术首席", "太空算力驱动下集成电路需求与发展"),
    kt("10:45", "11:20", "陈云霁", "中国科学院计算技术研究所研究员", "从人工智能到处理器芯片"),
    kt("11:20", "11:55", "王欣然", "南京大学教授", "二维半导体异构集成芯片"),
    kt("11:55", "12:10", "赵毅", "硅芯科技创始人兼CEO",
       "Chips Z：2.5D/3D AI EDA+ 开启先进封装STCO系统协同新时代"),
]

# ---------------- 48 论坛总览元数据 ----------------
# (code, title, room, day, period, sponsor, series_part)
FORUM_META = [
    # 7/18 下午
    ("CF37", "从Copilot到AI原生系统-迈向Agentic EDA的未来", "105A", "2026-07-18", "afternoon", None, None),
    ("CF17", "具身智能专用芯片论坛", "102A", "2026-07-18", "afternoon", None, None),
    ("CF34", "AI/LLM赋能的EDA仿真技术", "102B", "2026-07-18", "afternoon", None, None),
    ("CF04", "第五届学术新星论坛", "102C", "2026-07-18", "afternoon", None, None),
    ("CF20", "神经形态计算与存算一体芯片论坛", "103", "2026-07-18", "afternoon", None, None),
    ("CF03", "智能体软硬协同论坛", "107A", "2026-07-18", "afternoon", None, None),
    ("CF43", "多模态大模型的存算一体加速", "107B", "2026-07-18", "afternoon", "知存科技", None),
    ("CF28", "第三届智能计算系统前沿论坛", "101A", "2026-07-18", "afternoon", None, None),
    ("CF40", "赋能智算系统的光电互连论坛", "104", "2026-07-18", "afternoon", "中星联华", None),
    ("CF25", "从器件到系统：先进芯片设计与制造协同创新论坛", "206AB", "2026-07-18", "afternoon", None, None),
    ("CF47", "星火相传·智算燎原:玄铁RISC-V产学研协同创新论坛", "209", "2026-07-18", "afternoon", "阿里巴巴达摩院", None),
    ("CF01", "第十一届全国硬件安全论坛（一）", "203B", "2026-07-18", "afternoon", None, "（一）"),
    ("CF07", "天基计算与智能应用论坛", "101B", "2026-07-18", "afternoon", None, None),
    ("CF46", "先进计算论坛", "207AB", "2026-07-18", "afternoon", None, None),
    ("CF13", "集成电路测试高峰论坛——chiplet芯片测试论坛", "208AB", "2026-07-18", "afternoon", None, None),
    ("CF23", "芯片安全架构工程实现与应用论坛", "203C", "2026-07-18", "afternoon", None, None),
    ("CF10", "后量子密码应用论坛", "205A", "2026-07-18", "afternoon", None, None),
    ("CF44", "无线短距芯片论坛", "205B", "2026-07-18", "afternoon", "是德科技", None),
    # 7/19 下午
    ("CF26", "数据流计算：后GPU时代的智能计算新范式?", "102B", "2026-07-19", "afternoon", None, None),
    ("CF14", "中国密态计算论坛", "102C", "2026-07-19", "afternoon", None, None),
    ("CF38", "AI辅助的综合、物理设计和验证（一）", "103", "2026-07-19", "afternoon", None, "（一）"),
    ("CF31", "智能体时代通用处理器设计技术论坛", "107A", "2026-07-19", "afternoon", None, None),
    ("CF16", "集成电路学院院长论坛", "107B", "2026-07-19", "afternoon", None, None),
    ("CF48", "AI时代下2.5D/3D先进封装协同创新与生态发展论坛", "101A", "2026-07-19", "afternoon", "硅芯科技", None),
    ("CF21", "跨尺度先进互连智能算力芯片与系统关键技术论坛", "104", "2026-07-19", "afternoon", "江城实验室", None),
    ("CF35", "智能传感-存储-计算一体化进展和挑战", "206AB", "2026-07-19", "afternoon", None, None),
    ("CF33", "第四届基于新型高速互连的内存池化技术论坛", "209", "2026-07-19", "afternoon", None, None),
    ("CF02", "第十一届全国硬件安全论坛（二）", "203B", "2026-07-19", "afternoon", None, "（二）"),
    ("CF18", "天基计算应用论坛", "101B", "2026-07-19", "afternoon", None, None),
    ("CF45", "二维半导体集成芯片论坛", "207AB", "2026-07-19", "afternoon", None, None),
    ("CF29", "第二届体系结构优博论坛", "208AB", "2026-07-19", "afternoon", None, None),
    ("CF24", "量子计算芯片技术论坛", "203C", "2026-07-19", "afternoon", None, None),
    ("CF11", "大模型下半场：面向高效推理的软硬件协同优化", "205A", "2026-07-19", "afternoon", None, None),
    ("CF41", "openDACS V5.0 开源EDA版本发布论坛", "205B", "2026-07-19", "afternoon", None, None),
    # 7/20 上午
    ("CF39", "AI辅助的综合、物理设计和验证（二）", "103", "2026-07-20", "morning", None, "（二）"),
    ("CF05", "人工智能赋能芯片设计新范式", "107A", "2026-07-20", "morning", None, None),
    ("CF09", "智算芯片与系统建模与优化", "107B", "2026-07-20", "morning", None, None),
    ("CF08", "从芯片到系统：AI系统可靠性与容错技术", "101A", "2026-07-20", "morning", None, None),
    ("CF32", "智能技术驱动的自动处理器及系统设计", "104", "2026-07-20", "morning", None, None),
    ("CF22", "光电融合互联芯片技术论坛", "206AB", "2026-07-20", "morning", None, None),
    ("CF30", "同态加密软硬协同加速技术", "209", "2026-07-20", "morning", "蚂蚁", None),
    ("CF27", "智能存储系统可靠性技术论坛", "203B", "2026-07-20", "morning", None, None),
    ("CF19", "生物医疗芯片与系统论坛", "101B", "2026-07-20", "morning", None, None),
    ("CF42", "从约束求解到EDA形式化方法", "207AB", "2026-07-20", "morning", None, None),
    ("CF12", "超导前沿技术论坛：器件、电路与系统", "208AB", "2026-07-20", "morning", None, None),
    ("CF36", "量子计算与EDA", "203C", "2026-07-20", "morning", None, None),
    ("CF06", "近似计算芯片设计与应用", "205A", "2026-07-20", "morning", None, None),
    ("CF15", "高可靠芯片试验分析与防护", "205B", "2026-07-20", "morning", None, None),
]
assert len(FORUM_META) == 48, len(FORUM_META)

# 载入已解析的论坛详情
details = {}
for p in glob.glob(str(DETAIL / "CF*.json")):
    d = load(p)
    details[d["code"]] = d

forums = []
for code, title, room, day, period, sponsor, series in FORUM_META:
    if code in details:
        # FORUM_META (from the overview poster) is the single authority for
        # scheduling placement: room / day / period. The forum's own detail
        # poster may carry a richer sponsor / series label, so prefer that and
        # only fall back to the overview value. This keeps one authority per
        # field and prevents the two sources from silently diverging.
        d = details[code]
        d["room"] = room
        d["day_date"] = day
        d["session_period"] = period
        d["sponsor"] = d.get("sponsor") or sponsor
        d["series_part"] = d.get("series_part") or series
        d["source_url"] = forum_urls.get(code)
        forums.append(d)
        continue
    img = (forum_imgs.get(code, {}).get("poster_images") or [None])[0]
    forums.append({
        "code": code,
        "title": {"zh": title, "en": None},
        "sponsor": sponsor,
        "series_part": series,
        "day_date": day,
        "session_period": period,
        "room": room,
        "description": None,
        "chairs": [],
        "talks": [],
        "poster": {"local_path": img, "source_url": None} if img else None,
        "source_url": forum_urls.get(code),
        "detail_extracted": False,
    })
conf["forums"] = forums

# ---------------- 排期（天→块） ----------------
def forum_entries(day, period):
    return [{"forum_code": c, "room": r}
            for (c, _t, r, d, p, _s, _se) in FORUM_META if d == day and p == period]

conf["days"] = [
    {"date": "2026-07-17", "venue_id": "hotel",
     "overview": {"morning": [], "afternoon": ["签到"], "evening": []},
     "blocks": [
         {"kind": "registration", "title": {"zh": "签到", "en": None},
          "start": "14:00", "end": "21:00", "location": "大会推荐酒店"},
     ]},
    {"date": "2026-07-18", "venue_id": "wxicc",
     "overview": {"morning": ["签到", "开幕式", "大会主旨报告"],
                  "afternoon": ["技术论坛"], "evening": ["“知存之夜”晚宴"]},
     "blocks": [
         {"kind": "registration", "title": {"zh": "签到", "en": None},
          "start": "07:00", "end": "18:00", "location": "无锡国际会议中心"},
         {"kind": "keynotes", "title": {"zh": "大会主旨报告", "en": None},
          "start": "08:30", "end": "12:00", "location": "太湖厅AB",
          "breaks": [{"name": "茶歇", "start": "10:15", "end": "10:35"}],
          "talks": keynotes_0718},
         {"kind": "forums", "title": {"zh": "技术论坛", "en": None},
          "start": "13:30", "end": "17:00", "location": None,
          "breaks": [{"name": "茶歇", "start": "15:00", "end": "15:20"}],
          "forum_entries": forum_entries("2026-07-18", "afternoon")},
         {"kind": "banquet", "title": {"zh": "“知存之夜”晚宴", "en": None},
          "start": "18:30", "end": "20:30", "location": "太湖厅AB"},
     ]},
    {"date": "2026-07-19", "venue_id": "wxicc",
     "overview": {"morning": ["签到", "大会主旨报告"],
                  "afternoon": ["技术论坛"], "evening": ["CCF专委工作会议"]},
     "blocks": [
         {"kind": "registration", "title": {"zh": "签到", "en": None},
          "start": "07:00", "end": "18:00", "location": "无锡国际会议中心"},
         {"kind": "keynotes", "title": {"zh": "大会主旨报告", "en": None},
          "start": "08:30", "end": "12:10", "location": "太湖厅AB",
          "breaks": [{"name": "茶歇", "start": "10:25", "end": "10:45"}],
          "talks": keynotes_0719},
         {"kind": "forums", "title": {"zh": "技术论坛", "en": None},
          "start": "13:30", "end": "17:00", "location": None,
          "breaks": [{"name": "茶歇", "start": "15:00", "end": "15:20"}],
          "forum_entries": forum_entries("2026-07-19", "afternoon")},
         {"kind": "committee_meetings", "title": {"zh": "CCF专委工作会议", "en": None},
          "start": None, "end": None,
          "meetings": [
              {"name": {"zh": "CCF容错计算专委工作会议", "en": None}, "room": "102A", "start": "18:00", "end": "20:00"},
              {"name": {"zh": "CCF体系结构专委工作会议", "en": None}, "room": "102B", "start": "18:30", "end": "20:30"},
              {"name": {"zh": "CCF集成电路设计专委工作会议", "en": None}, "room": "102C", "start": "19:00", "end": "21:00"},
          ]},
     ]},
    {"date": "2026-07-20", "venue_id": "wxicc",
     "overview": {"morning": ["技术论坛"], "afternoon": [], "evening": []},
     "blocks": [
         {"kind": "forums", "title": {"zh": "技术论坛", "en": None},
          "start": "08:30", "end": "12:00", "location": None,
          "breaks": [{"name": "茶歇", "start": "10:00", "end": "10:20"}],
          "forum_entries": forum_entries("2026-07-20", "morning")},
     ]},
]

n_extracted = sum(1 for f in forums if f.get("detail_extracted"))
conf["extraction"] = {
    "source": "ccf.org.cn/ccfchip2026",
    "forums_total": 48,
    "forums_detail_extracted": n_extracted,
    "notes": (f"总览级信息+结构化内容完整；{n_extracted}/48 论坛已视觉解析，"
              "仅 CF10 因源海报缺失留空。"),
}
# Content fingerprint over everything except the extraction block itself, so a
# rerun with unchanged source data produces a byte-identical file (no spurious
# git diffs). A real wall-clock timestamp is recorded only when the caller opts
# in via SOURCE_DATE_EPOCH (reproducible-builds convention).
payload = json.dumps({k: v for k, v in conf.items() if k != "extraction"},
                     ensure_ascii=False, sort_keys=True)
conf["extraction"]["content_sha256"] = hashlib.sha256(payload.encode()).hexdigest()
epoch = os.environ.get("SOURCE_DATE_EPOCH")
if epoch:
    conf["extraction"]["generated_at"] = (
        datetime.datetime.fromtimestamp(int(epoch), datetime.timezone.utc)
        .isoformat(timespec="seconds"))

payload_out = json.dumps(conf, ensure_ascii=False, indent=2)
# Single source of truth: write the canonical dataset AND the copy the web app
# imports, so the two can never drift. The web app hosts several conferences, so
# its copy lives under conferences/<id>.json (keyed by conference id).
out = ROOT / "data" / f"{conf['id']}.json"
web_dir = ROOT / "web" / "src" / "data" / "conferences"
web_dir.mkdir(parents=True, exist_ok=True)
web_out = web_dir / f"{conf['id']}.json"
for p in (out, web_out):
    p.write_text(payload_out)
    print("wrote", p)

# Regenerate the web app's conference manifest from every per-conference file
# present. The switcher and hub list conferences from this lightweight index
# (a few KB) without loading any full dataset.
manifest = []
for cf in sorted(web_dir.glob("*.json")):
    d = json.loads(cf.read_text())
    venues = d.get("venues") or []
    main_v = next((v for v in venues if v.get("type") == "main"), None) or (venues[0] if venues else {})
    keynotes = sum(
        1
        for day in d.get("days", [])
        for b in day.get("blocks", [])
        if b.get("kind") == "keynotes"
        for t in (b.get("talks") or [])
        if t.get("type") == "keynote"
    )
    manifest.append({
        "id": d["id"],
        "name": d["name"],
        "edition": d.get("edition"),
        "start_date": d["start_date"],
        "end_date": d["end_date"],
        "city": (main_v or {}).get("city"),
        "venue": ((main_v or {}).get("name") or {}).get("zh"),
        "forums": len(d.get("forums", [])),
        "keynotes": keynotes,
        "days": len(d.get("days", [])),
    })
manifest.sort(key=lambda m: m["id"])  # deterministic; the UI sorts for display
manifest_out = ROOT / "web" / "src" / "data" / "manifest.json"
manifest_out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
print("wrote", manifest_out, f"({len(manifest)} conferences)")
print("committees:", len(conf["committees"]),
      "| persons:", sum(len(c["members"]) for c in conf["committees"]))
print("organizations:", len(conf["organizations"]))
print("forums:", len(conf["forums"]),
      "| detail_extracted:", conf["extraction"]["forums_detail_extracted"])
print("days:", len(conf["days"]))
