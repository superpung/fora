# October 22 daily source review

Observation: 2026-10-22 10:00:53–10:01:43 UTC (18:00–18:01 Asia/Shanghai).
Imported baseline: October 21 evening, commit `7adc665`. The checker compares
against the last complete observation, October 21 morning, independently of the
import comparison.

## Coverage and status

The check is **failed/incomplete**. Of 95 active HTML URLs, 94 are accessible;
https://chinasoft.ccf.org.cn/2026/pages/agenda/committee-meeting/index.html still
returns HTTP 404. Accessible evidence is archived and reviewed, but the successful
baseline remains `20261021T020913151864Z`. There are no withdrawn pages or missing
portraits. No meeting information is removed or replaced because of the 404.

Compared with the last imported evening observation, twelve accessible pages
changed and 82 are byte-identical, with no added or removed pages. All 549
previous portrait hashes are unchanged; six new URLs work, bringing the total
to 555. The comparison with the last complete morning observation also includes
the four programmes and competition pages already imported on October 21
evening; those are not new content in this run.

The curated comparison includes the checker-only call-for-paper/history pages,
the missing meeting index, and ten intentional curated-page differences. The
original and curated archive hashes and every archived original page hash were
verified. The twelve changed importer pages were identical to the preceding
original snapshot before replacement, so their exact new response bytes were
imported directly from this observation. The ten existing curated pages were
not overwritten. This retains original-source evidence separately from curation
without rerunning an importer known to fail on the missing active page.

## Actual additions and corrections

- The local organizing committee publishes 32 members, all with affiliations,
  replacing its pending placeholder.
- The local advisory committee adds six members: Yang Liang (Hebei University
  of Technology), Zhao Ziping (Tianjin Normal University), Wang Ze (Tiangong
  University), Wang Jinsong (Tianjin University of Technology and Education),
  Liu Xiangying (天津市大学软件学院), and Li Haifeng (Civil
  Aviation University of China). Exact Chinese names and institutions remain
  in source/data. Its two chairs and all 18 members now have published units.
  Six explicitly associated portraits are added; no photo is inferred for the
  plain-text organizing roster.
- S2 reports 4 and 5 now use the same titles as their profiles:
  `跨项目需求分类中检索增强上下文学习的实证研究` and
  `面向SLO工程的运行时质量需求候选证据检查与责任分流方法`. Their two conflict
  warnings disappear. Speakers, times, source abstracts and biographies are
  unchanged. Both enrichment title guards are updated; the latter summary now
  describes evidence checking and responsibility allocation. Topic keys remain
  appropriate and all AI content stays in enrichment.
- R8 shortens Zhao Bin's organizer affiliation to Northwestern Polytechnical
  University. It reverses the fourth/fourteenth profile-card order only. The
  timetable still places Kang Zifeng at 10:20 and Meng Yan at 16:50; their
  canonical talk indices, abstracts, biographies, portraits and AI annotations
  remain unchanged. Card order is not interpreted as a schedule change.
- E3 corrects section numbering. Navigation labels add forum suffixes; no new
  forum or warning is created. The homepage removes the January 1 date from
  the conference announcement; the footer changes its still-empty sponsor
  heading to cooperation partners. Other source edits are whitespace/formatting.

The new local roster demonstrates that `.program-grid` is not exclusive to the
programme committee. The adapter now parses each grid under its own heading,
retaining the committee name for generic roles and supporting the existing
sorting-note paragraph. It also retains explicit `.committee-unit` card fields.
An independent fixture combines chair cards and a flat member grid, plus a
second committee with a sorting note, to prevent lost sections or unqualified
roles. Snapshot regressions cover the actual rosters, portraits, resolved titles
and R8's unchanged timed programme. No shared web behavior is changed.

## Rechecked gaps and curation

There are still 66 entries, 52 published programmes, 429 programme items,
57 breaks, 358 attached abstracts plus one unmatched abstract, and 395 enriched
items. Fourteen programmes remain unpublished: R9/R25/R33/R35, E4/E5/E6,
I7/I8 and C1–C5. Nine active pages remain explicit placeholders. Nine entries
have no date, twelve no room and twelve no clock window, including date-only C1.
No new keynote schedule or undated meeting schedule is inferred.

All known source gaps were rechecked through archive equality or the reviewed
page diffs. E1's ambiguous credits/unmatched profile, R14's title conflict,
R22's affiliation discrepancy, S2's literal institution typo, R1/E3/I4 timing
overruns, R34's title conflict and C3's room conflict remain. Missing abstracts
in R16, R34, S1, S3 and S5 remain missing. Nine substantive flags remain after
removing the two resolved S2 title conflicts. Distinct same-name identities and
the documented follow keys are unchanged.

The four R32 standalone role removals, six committee-label reconciliations,
overview table-header repair, R34 header/name separators and E2 host/group
separator remain necessary and byte-identical to their previous curated forms.
Substantive biographies remain intact. All formerly broken portraits stay
available. The 555 newly prepared source/output image hashes were verified
against this observation and the on-disk assets; the two generated datasets
are identical. Imported HTML preserves source whitespace, including CRLF and
upstream trailing spaces; authored code/docs are checked separately.

## Validation

All four datasets pass schema/person/clock validation. All 24 adapter/checker
tests pass, including the new independent committee-format fixture and current
snapshot assertions. A full second rebuild is byte-identical across all four
datasets, both generated locations and the manifest. Web lint and build pass;
Vite retains its existing large conference-chunk warning.

The scheduled CLI stopped on its usage limit before completing browser
validation or pushing. The [evening recovery](../20261022T150357302340Z/REVIEW.md)
rechecked the source and completed the full browser suite and screenshot review.
The PR's latest-check section records the final commit and CI/preview status.
