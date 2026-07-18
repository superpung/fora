# Data verification tracker

Open data-quality items found by auditing `ccfchip2026.json`, to re-check against
the official site (https://ccf.org.cn/ccfchip2026). `CFxx#n` = the n-th talk in a
forum, 0-indexed. Status legend: ✅ done · ⏭️ skipped (site unchanged) · ⏳ pending.

Last audited: 2026-07-18 (full cross-check of all 48 forums against the official
PDF handbook).

## Resolved
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
  - keynote **张荣** (厦门大学, 7/19 09:10) — title still TBD.
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
