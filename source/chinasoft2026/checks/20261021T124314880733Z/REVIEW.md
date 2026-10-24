# October 21 evening source review

Observation: 2026-10-21 12:43–12:44 UTC (20:43–20:44 Asia/Shanghai).
Compared with the complete 02:09 UTC observation imported in `f3769f2`.

## Coverage and status

The official navigation references 95 HTML pages: 94 are accessible and one
new committee-meeting index returns HTTP 404. Four accessible pages are new,
nine changed, and 81 are byte-identical. All 549 active portrait URLs work:
32 new resources and 517 unchanged. There are no removed page or image references.

This observation is **failed/incomplete**, not a successful full crawl. The
checker archives accessible HTML and portrait evidence and reports the missing
page in `broken_pages`, then exits unsuccessfully. It does not advance the last
complete baseline. The earlier aborted attempt is retained separately at
`20261021T124152829425Z`. No missing page is represented as deleted source content.

The unavailable URL is
https://chinasoft.ccf.org.cn/2026/pages/agenda/committee-meeting/index.html.
Its new link is not evidence that earlier meeting information was withdrawn.
All reviewed accessible importer content is incorporated; no replacement page
or meeting schedule is invented.

## Programme changes

| Code | Published window | Room | Items / source abstracts |
| --- | --- | --- | --- |
| R34 | November 7, 15:20–18:20 | 三层29号会议室 | 7 / 4 |
| E2 | November 6, 09:00–12:00 | 二层13号会议室 | 10 / 8 |
| I5 | November 8, 09:00–12:00 | 2层19号会议室 | 5 / 5 |
| S3 | November 7, 15:20–18:20 | 四层3号多功能厅 | 12 / 2 |

Each forum publishes one break. Together these add 34 items, 19 abstracts,
32 portrait resources and 30 guarded AI annotations. R34's title becomes
泛在操作系统应用发展论坛, differing substantively from the overview title.
E2 corrects its former placeholder code E1 to E2; the obsolete warning is removed
and the old association remains in resolved curation history.

R34's Li Zhenning and E2's Chen Xiangqun are explicit discussion hosts. Their
own profile photos and biographies attach to hosts, not speakers or duplicate
unmatched cards. E2's collective participants are retained in the raw credit,
not converted to people. R34's opening names Jin Hai and Mei Hong separately.
Guo Yao's R34 work report has no abstract. S3 reports 3–12 have no profiles or
abstracts. I5's last report ends at 11:40 within a published 12:00 forum window;
no additional report fills the gap.

C3's Rust prototype competition gains an announcement and an agenda copy. Both
publish the final on November 7, 15:20–18:20. The header says 二层15号会议室,
while the milestones table says 会议中心三层多功能厅（C3）. The header room is
displayed, and the conflicting source row and a substantive flag are retained.
There are no team-by-team slots. The tentative November 8 afternoon awards
refer to the conference closing ceremony, which is already present.

Other changes are navigation labels, R29's removed room punctuation, R29
biography whitespace and E3 heading/whitespace formatting. Existing report
speakers, titles and times are unchanged in those two programmes.

## Curation and remaining gaps

Exact source bytes are archived before edits. Ten curated HTML pages differ
from the archive: the existing six committee-label corrections, R32 role removal,
overview header repair, plus R34's header/guest separators and E2's host/group
separator. R34's `议 题` header becomes `题目`; explicit person/group boundaries
get semicolons without changing names or content. These are data-only edits.
The conference adapter attaches explicit host profiles and consults its existing
reviewed collective-credit vocabulary before creating person records.

Current totals: 66 entries, 52 published programmes, 429 items, 57 breaks,
358 attached abstracts plus one unmatched abstract, 549 portraits and 395
AI-enriched items. Fourteen programmes remain unpublished; nine entries have
no date, twelve no room, and twelve no clock window including date-only C1.
Nine active pages remain explicit placeholders. Eleven substantive flags remain.
All 549 imported original-image hashes match this observation.

## Daily maintenance

The user requested 18:00 Asia/Shanghai and confirmed that this host stays online.
Cron is installed and running; `/etc/cron.d/fora-chinasoft2026` invokes the
versioned runner. A temporary cron heartbeat actually executed at 20:49 on
October 21 and was then removed. GitHub account access and a no-tool Codex
response passed the runner smoke test; a held lock prevented a concurrent run.
A clean cron environment initially could not reach GitHub without the host proxy.
The four proxy endpoints were verified to contain no credentials, persisted in
a root-readable runtime environment file, and the clean-environment GitHub/Codex
smoke test then passed. No proxy values or credentials enter the repository.
The first scheduled run is October 22 at 18:00. The job uses isolated branches
and worktrees, preserves evidence, validates updates and reports through the
PR's latest-check section and local Chinese reports. It never merges a PR.
See [automation](../../automation/README.md) for runtime requirements.

## Validation

Schema/person/clock validation passes for all four datasets. All 22 adapter and
checker tests pass, including missing-page evidence/baseline isolation, new
programmes, explicit host profiles, collective credits and C3's room conflict.
Web lint/build pass. All 34 shared core regressions, eight shared UI cases,
eight permalinks, the source audit (52 programmes and 549 decoded portraits),
gap/follow/export checks and desktop/mobile multi-day checks pass. The first UI
run read the lazy agenda before it rendered; an isolated rerun passed unchanged,
and the test now waits for the actual report row before asserting the same
expected titles. Its final rerun passes. Source captures cover 66 views.
The live-clock audit passes with 65 captures: event boundaries, overseas clocks,
automatic ticks, midnight and notification/reminder delivery. Twelve multi-day
captures also pass. A full rebuild after the data commit leaves generated output
unchanged. Deployed-preview results are maintained in the PR description.
