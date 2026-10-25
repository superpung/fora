# October 25 daily source review

Observation: 2026-10-25 10:00:58–10:01:52 UTC (18:00–18:01 Asia/Shanghai).
The open PR is #38, `data/chinasoft2026`, initially at
`c33b51eecb60d7024603dd83bd7da5aee02aa42c`. Work uses this run's isolated
branch/worktree; no merge or release is performed.

## Changes since the last imported review

Compared with the [13:37–13:38 observation](../20261025T053746279694Z/REVIEW.md),
all 95 accessible HTML pages are byte-identical, and all 596 portrait URL
status/hash records match. There are no additions, replacements, removals or
source corrections. All 596 portrait resources remain accessible and match the
imported source hashes. No portrait, enrichment, curated input, adapter or
application change is needed. The earlier I8 portrait recovery, Xu Yingshuai
portrait replacement, advisory roster ordering and official committee role-label
correction remain imported; they are not new this evening.

The automatic comparison still uses the last complete observation,
`20261021T020913151864Z`. Its six added and 28 changed HTML references, 80 added
portrait references, one removed portrait reference and one changed portrait
include already reviewed October 21–25 imports. The failed observation does
not advance that baseline.

## Curated differences and remaining gaps

The comparison against curated input has 11 changed pages, all deliberate
data-only corrections: R32's four standalone role-paragraph removals, the
overview's four header cells, five dedicated committee-page heading prefixes,
R34's header/guest separators, E2's host/collective separator, R30's chair-heading
spacing, and I8's name/affiliation boundary. All differences were inspected;
these corrections remain necessary and intact. The committee overview's former
role-label override is resolved and absent. I8 retains all eight restored image
tags. The three additional reference paths are checker-only callforpaper/history
coverage and the unavailable committee-meeting index, not newly published content.

All known gaps were rechecked through byte-identical original pages and unchanged
portrait status/hash records. The inventory remains 66 entries, 56 published
programmes, 454 items, 60 breaks, 378 attached abstracts, one unmatched abstract,
415 separate AI annotations and nine substantive source notes. Ten entries have
no detailed programme; four lack dates, seven rooms and seven clock windows,
with overlap. Known timing/title/credit/institution/room conflicts, separate
same-name identities, unnamed role credits and pending programmes remain as
documented in the [gap inventory](../../../../data/CHINASOFT2026_GAPS.md).
Biographies remain intact except for the explicitly reviewed R32 role paragraphs.

The official committee-meeting index still returns HTTP 404:
<https://chinasoft.ccf.org.cn/2026/pages/agenda/committee-meeting/index.html>.
There are no broken portrait references. The checker exits 1 after saving
accessible HTML and all portrait fingerprints. This is an incomplete source
check, not a successful no-change crawl. No unavailable content is inferred,
removed or replaced.

## Validation

Both current archives and the previous observation's archives pass integrity
checks, including every archived member hash (95 original and 93 curated pages
in each observation). All 93 current curated HTML files match the imported Git
revision. All 596 imported portrait source/output hashes and byte counts pass;
the two generated dataset copies are identical. All four checker tests pass,
including incomplete observations and successful-baseline preservation.

This is an evidence/documentation-only update. The full browser suite and new
screenshots are not rerun because no data/code changes require them. The last
content import's full validation remains recorded separately. Post-commit
manifest regeneration and a full offline rebuild of all four conferences produce
no diff; the conference data date remains October 25. Pushed-revision CI/Netlify
status and preview verification are recorded in the PR's latest-check section.
