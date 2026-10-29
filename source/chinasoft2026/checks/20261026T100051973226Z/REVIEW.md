# October 26 daily source review

Observation: 2026-10-26 10:00:51–10:01:52 UTC (18:00–18:01 Asia/Shanghai).
PR #38, `data/chinasoft2026`, was confirmed open at
`587901c0744262be5b03362a81336b4501d72a0e`. This run uses its isolated
`automation/chinasoft2026-20261026T100001Z` branch/worktree.

## Status: source check complete, content import awaiting a decision

All 97 active HTML pages are accessible. The previously unavailable
committee-meeting index recovers and links a newly published T1 programme.
Of 601 portrait references, 600 return images and one new reference returns
HTTP 404. The checker exits successfully: confirmed broken portrait references
are recorded source defects under the documented checker contract, unlike
unavailable active HTML or failed transport. This observation becomes the new
complete-check baseline. Earlier incomplete observations remain unchanged.

**The changes below are observed, not imported.** Curated HTML, portraits,
enrichment, adapter/application code and generated datasets remain at the
October 25 content import. This commit preserves evidence and review only.
The project agreement requires a user decision where multiple reasonable
approaches exist. T1 now publishes a report-level programme, whereas the
current adapter retains it as an undated `extra.other_meetings` entry and
models annual meetings separately. The pending decision is whether to expose
T1 through the report browser/follows/exports as a distinct committee-meeting
category, or retain its programme only in other-meeting metadata. No choice
has been assumed, and no partial import is claimed complete.

## Actual changes since the last imported review

[Since-imported comparison](since-imported.json) compares against
`20261025T053746279694Z`, rather than treating the older complete baseline as
unimported work. There is one added HTML reference, 22 changed page/status
records (including the recovered index), 74 unchanged records and no removals.
Nine portrait references are added, four removed and 592 unchanged; no retained
URL changes image bytes. Comparison against the October 25 evening observation
has the same result.

The automatic `since_previous_check` comparison still starts from the October
21 morning complete observation: seven added and 40 changed HTML references,
89 added and five removed portrait references, and one replaced portrait.
Those totals include already imported October 21–25 work.

- **T1:** CCF-华为胡杨林基金系统软件专项结题研讨 publishes November 6 in
  二楼3号会议室. Twenty programme items comprise an opening, eighteen project
  reports and a closing; there are two breaks. Rows span 09:00–17:00, but the
  heading gives only the date, not an independent forum window. No report
  abstracts are published. Four organizers have explicit portraits/biographies:
  吴斌, 卜磊, 刘哲 and 苏义博. Preserve the source affiliation
  中国科学与技术大学 verbatim, and do not infer identities from names or units.
- **R2:** removes 王龙's AgentSwarm report. The existing AiWork report changes
  from 魏长征 to 周维 and moves to 10:40–11:10; 张克驰 moves to
  11:10–11:40. 董益宏's title changes from 大模型强化学习方法 to
  智能体强化学习方法. Published affiliations and room typography change.
  Both dates remain, with sixteen total programme items; canonical indices
  and guarded enrichment need to move with the reports. The deleted slot and
  replacement speaker must not inherit an unrelated annotation or portrait.
- **R3:** adds 董淑照's AI Agent驱动的软件架构演进与范式变迁 at
  11:00–11:20, with no profile/abstract/portrait. The break becomes
  10:30–10:40, 刘瑞洲 moves to 10:40–11:00, 晋武侠 to 11:20–11:40,
  and the panel to 11:40–12:00. Organizer order changes; 刘瑞洲's biography
  drops named former employers, and 晋武侠's abstract adds ChangeWiki.
- **R26:** replaces 翟恩南's report with 高佳琦's
  面向全球规模的可编程算力网关研发体系, retaining 15:45–16:10.
  The new abstract, biography and portrait replace the previous speaker's.
  Other changes are punctuation/link formatting in source prose.
- **R32:** now runs 13:30–17:00. Its opening shrinks to ten minutes; the
  report order and all later times change, and the break is 15:00–15:20.
  邹德清's report is removed; 袁斌's 面向复杂系统的逻辑漏洞高效检测
  appears at 15:20–15:40. 饶志宏's title, abstract and biography change;
  王坚's abstract expands. Several other biographies/abstracts are revised.
  The source itself removes all four standalone role paragraphs, resolving
  the deliberate data-only removal upstream. Import the revised substantive
  biographies without reintroducing those paragraphs. 张瑶's new heading
  uses a full-width vertical separator before 天津大学; review this as
  source typography, not a new person or a warning.
- **E1:** resolves both ambiguous credits. 张颖 is explicitly named for
  10:40–11:00; his previously unmatched abstract/profile can attach to the
  report. A new 刘军利 report, abstract, biography and portrait occupy
  11:00–11:20. The 11:20–12:00 panel explicitly lists seven people.
  彭鑫's abstract is rewritten; 孙艳春 gains a biography. Remove obsolete
  ambiguity notes only when this source is imported.
- **I4:** extends its printed window to 12:00, resolving the old overrun.
  Adds 胡汝道's 企业级智能化软件工厂方案及最佳实践 at 10:45–11:10,
  with abstract, biography and portrait. Existing reports/break/panel are
  retimed. Its title and I3's gain the normal 论坛 suffix.
- **Source corrections:** R22 now gives 武延军's affiliation as
  中国科学院软件研究所, resolving the guarded institution discrepancy.
  R31 adds 北京航空航天大学 to 蔡少伟's affiliation. S2 corrects 黄颖华
  to 黄颍华 in both timetable and profile; the same explicit portrait URL
  remains. P4 removes dissertation-award claims from three biographies.
  E2 reorders 张羽/宫晓利 profile cards without changing the timetable.
  R35 adjusts profile headings, and I8 corrects 王子谋's department wording.
- **C1:** now publishes 二层6号会议室, November 7 15:30–18:30 and
  November 8 09:00–12:00. The afternoon awards remain without a clock time.
  The provisional schedule heading is removed. Organization, registration,
  rules and contact text change; preserve the complete announcement.
- **C4:** the older announcement now supplies November 7 15:20–18:20 and
  November 8 09:00–12:00, updates organizers/rules/submission materials and
  changes the deadline to October 30. The dedicated detail still ends the
  November 7 final at **18:30**, creating a new ten-minute source conflict.
  Both pages agree on 二层5号会议室. Keep both values with a substantive
  source note; do not silently overwrite the detail window.
- **C3:** both announcement copies add requirements for inaccessible private
  repositories and projects requiring special hardware/data/services.
  Its existing room conflict remains unresolved.

The archived pages retain all source prose. Semantic review separates genuine
content changes above from HTML line wrapping and punctuation; no new warning
is warranted for ordinary title suffixes, headings or spacing.

## Portraits, curation and remaining gaps

Eight new image URLs work: four T1 organizers, 周维, 高佳琦, 胡汝道 and
刘军利. The ninth, 袁斌, returns HTTP 404:
<https://chinasoft.ccf.org.cn/2026/images/academic-forum/学术论坛/袁斌.png>.
The removed references belong to 王龙, 魏长征, 翟恩南 and 邹德清; removed
references do not establish deletion of remote image files. The 592 retained
resources are byte-identical, including all eight restored I8 portraits.
No image refresh has been applied while the import is pending.

All known source gaps were rechecked using the original-page comparison.
Unchanged pages retain pending R25/R33/E4/E6/I7 programmes, missing abstracts,
R1/E3 timing overruns, R14's title difference, R34's overview/detail name
conflict, C3's room conflict and reviewed same-name associations. The overview, committee
rosters and existing date-only C2/C5 announcements are unchanged. No new
main-conference keynote programme is published.

Existing curated differences were rechecked: the overview's four header cells,
five dedicated committee-heading prefixes, R34 header/guest separators, E2
host/collective separator, R30 chair spacing and I8 name/affiliation boundary
remain necessary. R32's four role removals are now resolved upstream.
The committee overview's role labels remain fixed upstream. Original source
and curated comparison archives remain distinct.

All changed titles, indices and abstracts require a guarded enrichment review
before import, especially R2/R3/R26/R32/E1/I4. T1 and 董淑照 lack source
abstracts; no source prose may be invented. Current dataset counts remain
66 entries, 56 detailed programmes, 454 items, 60 breaks, 378 attached abstracts,
one unmatched abstract, 415 separate AI annotations and 596 prepared portraits.
These are imported counts, not the new source programme totals.

## Validation and next action

Current original/curated archives and both October 25 comparison observations
pass archive and every-member SHA-256 validation (97/93 current pages,
95/93 in each earlier observation). All 93 curated files are unchanged.
All 596 imported portrait source/output hashes and byte counts pass; both
ChinaSoft generated copies are identical. Four checker regression tests pass,
including incomplete-check preservation and confirmed missing-image handling.
The latest successful baseline resolves to this complete observation.

No data/code changes have been applied, so the full browser suite, fresh
screenshots and changed-page preview cannot validate this pending import.
After the evidence commit, Git-derived manifest regeneration and a full offline
rebuild of all four conferences produce no diff. Schema, person-name and clock
validation pass for all four datasets; the imported data date remains October 25.
Pushed-revision CI/Netlify results are recorded in the PR latest-check section. After the T1 decision, complete the import, portrait
refresh, enrichment review, full validation and deployed-page inspection before
claiming the new programme is available in the viewer. No merge or release.
