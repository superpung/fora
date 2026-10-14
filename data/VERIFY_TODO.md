# Data verification tracker

Open data-quality items found by auditing `ccfchip2026.json`, to re-check against
the official site (https://ccf.org.cn/ccfchip2026). `CFxx#n` = the n-th talk in a
forum, 0-indexed. Status legend: ✅ done · ⏭️ skipped (site unchanged) · ⏳ pending.

Last audited: 2026-07-18 (full cross-check of all 48 forums against the official
PDF handbook). Re-audited 2026-07-19 to also cross-check the **plenary keynote
agenda spreads** (pp. 07-10 of the handbook), not just the 48 forums — this
caught the 7/19 second-keynote change the earlier pass missed (see below).

## Resolved
- ✅ **7/19 keynote #2 (09:10-09:50)** — the handbook (exported 2026-07-14, newer
  than the website) replaced the placeholder **张荣 (厦门大学, 报告题目待定, TBD)**
  with a confirmed talk: **沈波 (北京大学博雅特聘教授) — “基于大失配外延的氮化物宽
  禁带半导体材料和芯片”**. Updated in `source/ccfchip2026/build.py`. NOTE: 张荣 remains
  in the 大会指导委员会 (guidance committee) — that entry is unrelated and unchanged.
  Why the first pass missed it: the earlier PDF cross-check focused on the 48
  forum spreads and trusted the *website* for the keynote list (which still shows
  张荣 TBD); the handbook's keynote agenda spread was not diffed. Keynote spreads
  are now part of the audit.
- ✅ **CF08 / CF16 / CF21 titles** — corrected against the official PDF handbook
  during the full 48-forum cross-check (all other titles/chairs/talks/speakers
  matched): CF08 → “从芯片到系统：AI系统可靠性与容错技术”, CF16 →
  “集成电路学院院长论坛”, CF21 dropped the sponsor suffix “（湖北江城实验室冠名）”
  (kept separately as `sponsor`).
- ✅ **CF10** — forum poster was published late (general_1129). Fully parsed:
  6 talks, 2 chairs. Note: the poster titles it “抗量子密码应用论坛” while the
  agenda overview lists “后量子密码应用论坛”; we keep the overview name and record
  the variant in the forum's `flags`.
- ✅ **CF01#2 (韩军)** — the title/abstract mismatch is fixed on the updated
  poster (general_1116). Title corrected to
  “面向隐私计算的高能效环面全同态加密处理器芯片研究”; the mismatch `flag` removed.

## Skipped (checked, site not updated)
- ⏭️ **CF19#1** — affiliation still misprinted on the site as
  “上杭州荷声科技有限公司” (stray “上”). Left as-is with its `flag`; revisit if the
  organizers fix it.
- ⏭️ **P1 pending titles/abstracts** — not yet updated on the site, leave as-is:
  - **CF01#0 (屈钢)** — title + abstract still “（待确认）”.
  - **CF43#3 (魏建强)** — abstract still “待后期补充”.
  - **CF24#2 (刘马良)** — abstract still missing (poster layout merged it into the
    next speaker's block).
  - **CF47** — 6 talks still without abstracts (#2 陈晨, #3 何虎, #4 蔡一茂,
    #5 徐炜鸿, #7 仇径, #8 周平强).

## Deferred (source-poster inconsistencies, faithfully recorded via `flags`)
These are internal contradictions in the source posters, not omissions. Each is
kept verbatim with a `flag`; only change if the organizers correct the poster.
- Name / affiliation / title mismatches: **CF22#1** (郭旭晗 vs 郭旭涵),
  **CF28#2** (河海大学 vs 南京大学), **CF23#3** (副研究员 vs 研究员),
  **CF30#4** (副研究员 vs 助理研究员), **CF37#2**, **CF40#4**, **CF47#8** (周平强).
- **CF25#0** — abstract text bleeds into the bio on the poster (already trimmed).

## By design (not defects)
- Panel sessions without an individual speaker/abstract: CF11#6, CF25#5, CF32#6,
  CF33#6, CF34#6, CF41#6.
- Invited guests with a bio but no talk title/abstract: CF04#6 (曾晓洋),
  CF07#9 (倪家伟).

## ChinaSoft 2026 (snapshot: 2026-10-14)

- 64 forums/competitions are listed in the overview; 27 have linked detailed
  programmes. Keep the other 37 as `not_published`. E6's window is in the
  overview, and C5/C6 final dates are in competition announcements; their
  individual programmes remain unpublished.
- The homepage says November 6–8, while the introduction and timetable include
  November 5 check-in. The dataset includes November 5 and records both claims.
- R1, E4 and I4 have talks ending later than their printed forum windows. Keep
  both values, with talk-level flags; do not shorten talks to fit the overview.
- R14's timetable prints a pending Huawei speaker, while a profile names 廖楠.
  Keep the pending timetable credit and the unmatched profile separately.
- E2 prints ambiguous credits `彭蓉-张颖` and `刘璘- 全体嘉宾`. Preserve the raw
  strings and flag the uncertain speaker/host roles; do not guess identities.
- The prototype-system announcement names a November 6 afternoon case forum,
  while the overview names competition C2 without an explicit linking code.
  Keep the announcement separately under conference `extra` until confirmed.
- The programme committee is marked pending; the local organizing committee's
  member list is also pending. Neither placeholder is a person.
