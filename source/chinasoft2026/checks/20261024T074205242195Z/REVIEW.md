# October 24 source review

Observation: 2026-10-24 07:42:05–07:42:54 UTC (15:42 Asia/Shanghai).
Compared with [October 23](../20261023T065259587808Z/REVIEW.md), imported revision
`6d11137`. The first sandbox-denied attempt is retained with the ignored local
execution logs; this observation fetched the source with network permission.

## Published changes

- R9 becomes 智能嵌入式系统基础软件论坛 in both inventory and detail. It publishes
  November 6, 14:00–17:00 in 三层1号多功能厅: eight items (six technical reports)
  and one break. Preserve its room wording separately from 三层1号会议室.
- R35 publishes November 6, 09:00–12:00 in 二层5号会议室: four items, starting
  at 09:30, with three abstracts. Its final report names only a role,
  鸿蒙生态高级布道师; this is not a person. Its report abstract is attached by
  the explicit credit and normalized title; its biography remains in metadata.
- E5 publishes November 6, 14:00–17:00 in 二层15号会议室: five reports and one
  break, with all five abstracts and explicit portraits.
- I8 publishes November 6, 14:00–16:40 in 三层30号会议室: eight items (six
  technical reports) and one break. All six abstracts are retained. Its eight
  image URLs are HTTP 404; only their tags are removed from curated input.
- C4 adds a detailed competition notice: live final November 7, 15:20–18:30;
  defense November 8, 09:00–12:00, both in 二层5号会议室. Keep two sessions
  without invented team slots. Seven organizers include three secretaries;
  four chair portraits are explicit. Preserve the old announcement in raw input
  and link it in metadata. The notice also gives October 30 preliminary work
  submission and November 4 shortlist publication milestones.
- R30 replaces the 16:50–17:20 report by 王竟亦 with 王培新 (华东师范大学),
  形式化之后，可信之前：大模型辅助的建模与推断. Its abstract, biography, portrait
  and guarded enrichment change together. The other time slots are unchanged.
- P3 corrects wording in 杨洲's abstract and expands his profile heading.
  I5 adds the forum suffix; I7 remains pending. Other changes include HTML
  formatting, heading affiliations and navigation labels.
- Publication adds 郭东承 and 蒋雨航; publicity adds 李晓鹏, 户庆凯 and 胡沛廷;
  volunteer organization adds 莫峦奇, 郑渝腾, 徐英帅 and 黄毅安. All nine
  publish 天津大学 affiliations and explicit portraits.
- The existing education portrait for 林云 changes bytes, updating every
  explicit association including E3. No portraits are inferred across people.

## Coverage and curation

There are 96 active HTML references: 95 successful pages and the same HTTP 404
committee-meeting index. One page is new and 15 existing pages changed, with no
removed references. There are 596 portrait references: 42 added, one removed
(the replaced R30 speaker), one existing resource changed, and eight new I8
URLs returning HTTP 404. The 588 accessible resources are imported. Old prepared
assets and source evidence are retained; unavailable URLs do not cancel content.

The observation remains failed/incomplete and does not advance the October 21
morning complete baseline. Raw automatic comparisons against that baseline also
include already imported October 21/22 changes; those are not new today.

All previous deliberate corrections remain intact. New data-only corrections
make I8's 岳赟/蚂蚁 name-unit boundary explicit, space R30's two parenthetical
chair headings, and remove the eight broken I8 image tags. Reviewed role credits
are preserved as display text without becoming person identities or warning
notes. The two newly published 王博 biographies describe different careers;
existing title/biography-guarded identity curation separates them without UI notes.

Only the ChinaSoft adapter gains parsing behavior: explicit unnamed profiles
can supply a title-matched abstract, and C4's source-specific notice supplies
its two stage windows and organizers. No shared web application code changes.
Independent unnamed-profile fixtures reject mismatched titles, and updated
snapshot/browser regressions cover the newly dated entries and competition.

## Validation and remaining gaps

Both source archives, all 95 archived page hashes, and all 588 imported portrait
source/output hashes were verified. The dataset contains 66 entries, 56 published
programmes, 454 items, 60 breaks, 378 attached abstracts and 415 separate AI
annotations. Nine substantive source notes remain. Ten entries lack detailed
programmes; four lack dates, seven lack rooms and seven lack clocks, with overlap.
See the [gap inventory](../../../../data/CHINASOFT2026_GAPS.md) for exact items.

Schema/person/clock validation and all 26 Python adapter/checker tests pass.
Web lint/build and the complete browser regression suite pass, including all
585 unique portrait assets, multiday navigation, live clocks and reminders.
All 160 local captures were reviewed. Final deterministic rebuild, CI and
deployed-preview results are recorded in the PR description.

The October 23 scheduled run stopped at the Codex CLI usage limit before doing
work. This manual run supplies the source check and import; the scheduled run's
logs remain intact. No account, billing or cron configuration was changed.
