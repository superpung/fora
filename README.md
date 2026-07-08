# conf-scheduler

将某个会议的议程解析成**自定义通用格式**，再用于网页展示。
首个样例会议：第三届 CCF 芯片大会（CCF Chip 2026），https://ccf.org.cn/ccfchip2026

## 设计原则
- **不兼容、不映射任何现成格式**（pretalx/frab/pentabarf 一律不考虑）。
- schema 完全依据真实会议数据设计，见 [`schema/schema.json`](schema/schema.json)。
- 核心结构：`会议 → 天 → 时段块(主旨报告/技术论坛/晚宴/签到/专委会) → 论坛(CFxx) → 报告`。
  - **论坛是一等实体**（编号/名称/会议室/专场赞助/主席/内嵌报告）。
  - **论坛内报告无独立时间**，只继承时段窗；广泛支持双语与 TBD 状态。

## 目录
```
schema/schema.json          自建 JSON Schema (draft 2020-12)
data/
  ccfchip2026.json          ★ 完整数据集（符合 schema，已校验通过）
  forums_detail/CF01.json   已视觉解析的论坛详情（逐步补全 CF02–CF48）
source/
  SITE_ANALYSIS.md          官网结构逆向分析（数据源/接口/信息组织）
  fetch_all.py              抓取全站 78 栏目 + 76 资源 -> raw/
  extract_structured.py     抽取结构化内容(委员/赞助/文本/论坛映射) -> extracted/
  slice_poster.py           论坛超长海报切片，便于逐块视觉解析
  build_dataset.py          装配 data/ccfchip2026.json
  validate.py               用 schema 校验数据
  raw/                      原始落盘：api/channels/*.json, images/, files/, manifest.json
  extracted/               结构化中间产物
```

## 复现
```bash
cd source
python3 fetch_all.py          # 抓取（已完成，产物在 raw/）
python3 extract_structured.py # 抽取结构化内容
python3 build_dataset.py      # 生成 data/ccfchip2026.json
python3 validate.py           # 校验（需 pip install jsonschema）
```

## 抽取状态
- 会议元数据 / 多场地 / 主承协办 / 主席团 keynote / 4 天时段块 / 48 论坛总览元数据 / 51 位委员：**完整**。
- 论坛内部报告：CF01 **完整**（5 报告 + 2 主席）；CF02–CF48 待逐张海报视觉解析（管线已就绪）。
