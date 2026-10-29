# October 24 daily source review

Observation: 2026-10-24 10:00:40–10:01:27 UTC (18:00–18:01 Asia/Shanghai).
The open PR is #38, `data/chinasoft2026`, initially at
`5c2bb08823776ce818aba7bab3e2e7406e893f64`. Work uses this run's isolated
branch/worktree; no merge or release is performed.

## Changes since the last imported review

Compared with the [15:42 observation](../20261024T074205242195Z/REVIEW.md),
all 95 accessible HTML pages are byte-identical, and all 596 portrait URL
status/hash records match. There are no additions, replacements, removals or
source corrections. All 588 accessible portrait resources still match the
imported source hashes. No portrait, enrichment, curated input, adapter or
application change is needed.

The automatic comparison still uses the last complete observation,
`20261021T020913151864Z`. Its six added and 27 changed HTML references, 80 added
portrait references, one removed portrait reference and one changed portrait
include already reviewed October 21–24 imports; they are not new this evening.
The failed observation does not advance that baseline.

## Curated differences and remaining gaps

The comparison against curated input has 12 changed pages, all deliberate
data-only corrections: R32's four standalone role-paragraph removals, the
overview's four header cells, committee role headings on six pages, R34's
header/guest separators, E2's host/collective separator, R30's chair-heading
spacing, and I8's name/affiliation boundary and eight omitted broken image tags.
These corrections remain necessary and intact. The three additional reference
paths are checker-only callforpaper/history coverage and the unavailable
committee-meeting index; they are not newly published content.

All known gaps were rechecked through the byte-identical original pages and
unchanged portrait statuses. The inventory remains 66 entries, 56 published
programmes, 454 items, 60 breaks, 378 attached abstracts, one unmatched abstract,
415 separate AI annotations and nine substantive source notes. Ten entries
have no detailed programme; four lack dates, seven rooms and seven clock
windows, with overlap. Known timing/title/credit/institution/room conflicts,
separate same-name identities, unnamed role credits and pending programmes
remain as documented in the [gap inventory](../../../../data/CHINASOFT2026_GAPS.md).

The following official URLs still return HTTP 404:

- <https://chinasoft.ccf.org.cn/2026/pages/agenda/committee-meeting/index.html>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/刘振宇.png>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/刘爽.png>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/岳赟.png>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/张卿.png>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/柳义利.png>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/王子谋.png>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/肖涛.png>
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/工业论坛/郭威俊.png>

The checker exits 1 after saving accessible HTML and all portrait fingerprints.
This is an incomplete source check, not a successful no-change crawl. No
unavailable content is inferred, removed or replaced.

## Validation

Both current archives and the previous observation's archives pass integrity
checks, including every archived member hash. All 93 current curated HTML files
match the imported Git revision. The earlier observation's curated archive is
its pre-import input, so it is intentionally distinct from the current input.
All 588 imported portrait source/output hashes and byte counts pass; the two
generated dataset copies are identical. All four checker tests pass, including
incomplete observations and successful-baseline preservation.

This is an evidence/documentation-only update. No data/code change requires
rerunning the full browser suite or new screenshots. The last content import's
full validation remains recorded separately. The post-commit full offline
rebuild of all four conferences produces no diff. Regenerating the Git-derived
manifest also produces no diff; the conference's data date remains October 24.
The pushed revision's CI/Netlify results and preview verification are recorded
in the PR's latest-check section.
