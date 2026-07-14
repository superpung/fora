# CCF Chip 2026 site structure analysis (data-source reverse engineering)

URL: https://ccf.org.cn/ccfchip2026 ; conference short name `ccfchip2026`.
This document records the site's data sources and how the agenda information is
organized, as the input basis for this project's parser.

## 1. Site technology
- Vue SPA + server-side CMS rendering; the initial HTML **does not contain** any
  agenda content — everything is fetched via jsonp APIs.
- All API calls require the `Referer: https://ccf.org.cn/ccfchip2026` header.

## 2. Key APIs (see `fetch_all.py`)
| Step | API | Params | Returns |
|---|---|---|---|
| 1 | `/api/getMeetingIdByMeetingShort.action` | `meetingShort=ccfchip2026` | meetingId = `m1478733396288081920177259911521` |
| 2 | `/api/show.action` | `code=api_channel&meetingId=<id>` | channel tree (78 channels, 3 levels) |
| 3 | `/api/newsAll.action` | `channelId=<id>` | array of articles for that channel (rich text / structured fields) |
| assets | `/cmsFileManager/UeditorImg/*.png\|jpg` ; PDFs/attachments via `/web/formDes/download.action?filePath=...` |

All raw data is already saved: `raw/api/channels/<channelId>.json` (one per
channel), `raw/images/` (76 images), `raw/files/` (PDF/docx),
`raw/api/manifest.json` (channel list + asset map).

## 3. Channel tree → information types
78 channels, grouped by content shape into three kinds:

### A. Agenda overview (the `大会议程` channel, type=4)
- 1 article whose body holds **6 A4 portrait PNGs** (2481×3508) plus an attached
  `大会议程一览.pdf`.
- The 6 images contain:
  1. Cover/overview: conference name (zh/en), dates 2026/7/17–7/20, location,
     contact email, hosts/co-hosts/supporters, chair panel, and a **4-day ×
     (morning/afternoon/evening) overview matrix**.
  2. 7/17 registration; 7/18 morning keynotes (room `太湖厅AB`, per talk: time +
     speaker + title/honorific + topic); afternoon technical-forum session.
  3. 7/18 afternoon table of 18 parallel forums (room ↔ CFxx ↔ forum name); the
     `知存之夜` banquet; start of 7/19.
  4. 7/19 morning keynotes; afternoon forum table (first 8).
  5. 7/19 afternoon forum table (last 8); CCF committee working meetings (3, each
     in its own slot); 7/20 morning technical forums.
  6. 7/20 morning forum table (14 forums); site QR code.
- **The overview only goes down to the "forum" level** (CFxx + room + forum name
  + session sponsor); the talks inside a forum are not here.

### B. Forum details (48 sub-channels `技术论坛` → CF01–CF48, type=4)
- Each forum = 1 article whose body has **no text, just 1 very tall portrait
  poster** (1600 × 26000–37000 px, JPG 5–7 MB).
- Poster internal structure (reverse-engineered, see CF01):
  ```
  forum name
  └ forum intro (paragraph)
  └ forum chair(s) (1..n): photo + name + affiliation/title + bio
  └ forum speakers:
       repeated per talk:
         [blue arrow banner = talk title]   ← "（待确认）" means TBD
         speaker: photo + name + affiliation/title
         abstract (may be "待确认")
         bio
  └ follow QR code
  ```
- **Important**: talks inside a forum have **no individual timestamps** (time only
  goes to the block level of the overview, e.g. 13:30–17:00). Talk titles and
  abstracts may be missing/pending; source posters occasionally have a title that
  disagrees with the abstract (e.g. 韩军 in CF01) — record faithfully and flag,
  do not "fix" it.

### C. Organization / people / sponsor / info (structured fields, no image reading)
- Organizations (`组织机构`, 13 role channels): fields `NAME_INFO` (name),
  `MAIN_INFO` (affiliation + title), `FILE_` (photo). **51 people** total:
  advisory committee 15, general chairs 3, general co-chair 1, executive chairs 4,
  organizing chairs 5, organizing vice-chairs 2, program committee chairs 4, forum
  organization chairs 5, sponsorship chairs 3, publicity chairs 5, web chair 1,
  publication chairs 2, registration chair 1.
- Partners (`合作单位`, 5 tiers): 金钻 / 钻石 / 铂金 / 黄金 / 白银 (crown-diamond /
  diamond / platinum / gold / silver), logo + name.
- Text channels: conference intro (`INTRODUCTION` field — note, not `MAIN_BODY`),
  program committee, call for papers, invitation, accommodation, call for
  sponsors, downloads.

## 4. Implications for the data model (why a self-designed schema)
1. **4-level structure**: conference → day → time block (keynotes / forums /
   banquet / registration / committee meetings) → forum (CFxx) → talk.
2. **A forum is a first-class entity**: it has a code, name, dedicated room,
   session sponsor, chairs, and embedded talks; it cannot degrade to a mere tag.
3. **Talks have no independent time**: only a block-level time window; the schema
   must allow `talk.start` to be absent.
4. **Many non-talk items**: registration, tea breaks, banquet, committee meetings.
5. **Multiple venues**: 无锡国际会议中心 (Wuxi ICC) + a recommended hotel.
6. **Bilingual (zh/en) + TBD state** are pervasive.
7. **Conference-level people/orgs**: chair panel, 13 committee roles, 5 sponsor
   tiers.

## 5. Extraction status
- [x] Raw JSON for all 78 channels + 76 assets saved.
- [x] Structured content (51 committee members / sponsors / text / overview
  metadata for 48 forums) extracted → `extracted/`.
- [x] Forum-poster slicing pipeline `slice_poster.py` / `batch_slice.py`.
- [x] Posters CF01–CF48 visually parsed one by one (47/48 done →
  `../data/forums_detail/CFxx.json`).
- [ ] Only **CF10** is missing its source poster, so it has no internal talk data
  (`detail_extracted:false`; the UI shows “详情待补” / "details pending").
