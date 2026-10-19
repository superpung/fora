# Official-source review: 2026-10-19

Compared with the complete October 18 observation `20261018T053641432592Z`.
The check archived 73 active HTML pages plus retained R16: one page added,
13 changed and 59 byte-identical. No page was removed. All 486 active portrait
URLs were checked: eight added, 478 unchanged, no replacements or removals.
The same 25 portrait URLs remain broken (P3: 13; I3: eight; S1: four).

## Programme and people updates

- R19, Rust与系统软件论坛, now publishes five reports, five abstracts, one
  10:00–10:20 break and three organizer profiles. Date/window: November 6,
  09:00–12:00; room: 四层5号多功能厅. Speakers: 张毅, 刘昱玮, 周睿,
  饶子豪 and 韩晓阳. The last report ends at 11:50; no extra item is invented.
  All eight explicit portrait resources are available and imported.
- R24 changes 许思源's profile-heading title from 主任工程师 to 高级研究员.
  R28 changes 薛磊's heading from 副教授 to 教授, consistent with his existing
  biography. These headings are retained in the source snapshot; timetable
  affiliations and substantive biographies are unchanged.
- S5 changes its room label from 二层11号会议厅 to 二层11号会议室; date,
  clock times and reports do not change.
- E4 replaces 刘万伟's biography with report-oriented prose similar to the
  abstract, ending in 挑战及应对建议 instead of the abstract's 挑战及机遇.
  Preserve both source fields, add one guarded source note, and recheck this
  apparent upstream content error next time. Do not restore an old biography
  silently or change the source abstract.
- I2 corrects punctuation in 张永文/王徐华 biographies and changes ISTTA to
  ISSTA in 李青山's biography. No substantive programme change.
- P4's navigation label changes from 博士学位论文激励计划 to
  优秀博士生激励计划论坛; its existing detail title and programme are unchanged.
- Programme-committee members 任晗, 谢筱恒 and 许文强 now each have the
  published affiliation 华为有限公司. The roster still has 195 members.
- Five dedicated committee pages (finance, publicity, sponsorship, publication,
  volunteer organization) rename 主席 to 负责人. Their member lists are unchanged.

## Reviewed data-only corrections

The committee overview still uses the five older 主席 labels. In curated input,
qualify each dedicated-page heading with its committee name and change the five
corresponding overview headings to the newer 负责人 labels. This keeps separate
committees separate and avoids duplicate groups for unchanged rosters. Original
headings remain in `html.tar.gz`; this is an explicitly reviewed source-label
reconciliation, not a parser or UI rule. Recheck all ten headings after fetching.

Prior R32 role-paragraph removal, unavailable-image omissions, retained R16 and
reviewed same-name identities remain intact. No shared application/parser code
changes are needed for this refresh. The E4 content defect adds one substantive
source note (11 total); wording-only changes have no warning flags.

## Imported totals and coverage

67 inventory entries; 46 detailed programmes; 376 programme items; 51 breaks;
321 source abstracts plus one separately retained unmatched abstract; 346 guarded
AI enrichment entries; 468 prepared portrait resources. The 21 unpublished
programmes include 18 undated entries; 20 entries lack rooms and 20 lack clocks.

Original HTML, hashes and comparisons against both the last complete observation
and curated input are preserved. Coverage excludes CSS, JavaScript, non-portrait
images, attachments and external sites. No automatic scheduler is installed.

## Validation

All four datasets pass schema/person/clock validation; the two generated copies
match. Nineteen adapter/source-check tests, web lint/build and the complete web
suite pass: 34 core cases, eight shared UI cases, eight permalinks, all 46
programmes and 468 portrait resources, source gaps, both dates of R2 and 61
clock captures. Existing report titles/times/abstracts and committee membership
are unchanged. Every imported active portrait hash matches this observation.

The deployed preview passes programme, portrait and source-gap checks. Initial
mobile screenshots raced lazy portrait loading in a fresh browser context;
explicit image decoding confirms the images load correctly. The shared source
audit now waits for visible images to decode before capturing. Incomplete
preview captures are regenerated; no application change is required.
