# Official-source review: 2026-10-20

Compared with complete observation `20261019T064331528893Z`. This check
archives 77 active HTML pages plus retained R16: four added, 19 changed,
54 byte-identical, none removed. Of 510 active portrait URLs, 24 are new,
25 have recovered from HTTP 404, and 461 are unchanged. There are no broken
portrait references. Observation timestamps are not publication timestamps.

## New programmes and announcements

- R29, 神经符号融合软件的前沿理论和方法论坛: November 8, 08:50–12:00,
  三层2号多功能厅. Four reports (詹乃军, 袁野, 孙军, 戴望州), a panel,
  one break, four abstracts, two organizers and six portrait resources.
- S4, 智能化工业软件工程：大模型驱动的开发、保障与治理论坛:
  November 7, 15:20–18:20, 二层18号会议室. Fourteen reports/abstracts,
  one break, five organizers and eighteen portrait resources. Reports end at
  18:10; no extra item is inferred for the final ten minutes.
- C1, 定理证明竞赛: a new announcement gives a provisional manual-proving
  contest on November 7 afternoon, AI-assisted final on November 8 morning,
  and awards on November 8 afternoon. Import two date-only sessions and retain
  the exact period labels and provisional status in the description. No clock
  times or rooms are inferred. The old introductory sentence still says the
  conference's exact dates/venue are pending.
- C4, 软件自动修复竞赛: a new announcement gives final/awards as during
  November 6–8. Retain this text and the official link; it does not establish
  which day hosts the final. The forum remains undated. Both new announcements
  are archived in full, including rules, contacts and earlier milestones.

## Official numbering and inventory

- Education forums shift E2→E1, E3→E2, E4→E3, E5→E4, E6→E5, E7→E6.
  The two detail pages confirm E1 (software-engineering education) and E3
  (formal-methods education). Their programmes are unchanged. Move enrichment
  keys and Liu Wanwei's guarded biography note with the matching programmes.
- The former E1 软件基础教育 becomes M5 闭门会议（原软件基础教育论坛）.
  M4/M6 are newly listed. M2 is shortened to 闭门会议. T1 now names
  CCF-华为胡杨林基金系统软件专项2025年项目结题验收会议. These entries
  lack dates and remain in `extra.other_meetings`.
- The talent-training forum is now E6. Its November 7, 14:10–15:10 window
  and room are unchanged. Inventory titles gain the 论坛 suffix; the overview's
  timetable omits it. The adapter recognizes this equivalent wording without
  duplicating the scheduled event. Saved code-only links/follows are not migrated,
  consistent with the previously documented source renumbering behavior.
- The November 7 18:30–20:30 dinner is renamed 大会晚餐 from 大会晚宴;
  keep its banquet classification. Other forum-title edits are suffixes and
  navigation labels; they do not merit discrepancy notes.

## Existing report and room changes

- R23#6, 王赵波: the timetable title changes from
  量子算法可靠实现的形式验证 to Quafu 量子计算云平台介绍. The profile
  already used the Quafu title and abstract. Remove the obsolete substantive
  conflict warning, retain the spacing-only profile variant in metadata, and
  update the guarded AI summary/topics to the cloud-platform content.
- P4 is renamed 博士学位论文激励计划论坛. Li Jia's report abstract is
  rewritten around trust in Coding Agent execution and delivery, including
  hijacking, vulnerable code and deception. Its title and speaker identity stay
  unchanged. R7's separately sourced abstract is unchanged.
- R13's room changes 三层1号会议厅→三层1号会议室.
- R12 corrects 胡杰英→胡英杰 in a biography. R28#4 corrects 经款→经多款
  in the abstract. I2 changes 守护→保障 in its introduction. No existing
  report clock or speaker credit changes.
- `callforpaper.html` and the education index have markup-only changes.
  Navigation adds the four pages, reorders some entries, and updates labels.

## Curation and completeness

Restore the original portrait tags in P3/I3/S1 after confirming recovery of
their exact URLs (13/8/4 resources). With 24 new resources and seven retained-page
resources, the prepared manifest has 517 entries. Every active imported original
hash matches this observation. Existing R32 role-paragraph removals and October
19 committee-label reconciliations remain intact. Those pages are unchanged
upstream; they were not overwritten while importing changed pages.

Seven exact note dismissals cover R22/I3/I4 title formatting/suffixes, three S4
report prefixes and R23's remaining space. Ten substantive notes remain.
No general note filter, person-identity inference or application change is added.

The dataset now has 66 inventory entries, 48 published programmes, 395 programme
items, 53 breaks, 339 attached abstracts, one unmatched abstract and 365 guarded
AI annotations. Eighteen programmes remain unpublished; fourteen entries have
no date, seventeen have no room and seventeen have no clock window. R2 and C1
each appear on two dates, giving 68 daily dashboard rows.

## Validation

All four datasets pass schema, person-name and clock validation; the two
ChinaSoft 2026 generated copies match. All twenty adapter/source-check tests
pass. Web lint/build and the complete browser suite pass: shared core/UI cases,
permalinks, all 48 published forum pages, 517 decoded portraits, four daily
schedules, 68 dashboard rows, fourteen undated entries, topics, source notes,
identity follows and mobile layouts. C1 follows/export produces exactly two
date-only items; C4 produces no invented dated item.

The multi-day audit passes on desktop/mobile with twelve captures. The live-clock
audit passes with 61 captures, including event boundaries, E6's renamed identity,
foreign device zones, midnight, clock ticks and mocked notification delivery.
The source audit also captures 56 desktop/mobile images, including R29/S4,
renumbered E1/E3, recovered portraits and C1/C4 announcement pages. Screenshots
were inspected for layout, anchors and image loading. The PR records the
post-push deployment verification separately.
