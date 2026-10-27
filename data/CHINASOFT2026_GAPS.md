# ChinaSoft 2026: source gaps and refresh checklist

Last imported source review: **2026-10-27, checked at 16:08–16:09 Asia/Shanghai**.
This is the conference-specific checklist for subsequent refreshes. Talk numbers
below are **one-based**, matching `#talk-N` links. Historical sections retain
the codes and source state used at their observation dates.

Latest imported check: [October 27 review](../source/chinasoft2026/checks/20261027T080809032302Z/REVIEW.md).
All 94 active and three retained HTML pages work. Of 605 active portrait
references, two new R16 images (唐滨 and 王晔晖) return HTTP 404. Their text is
preserved; remove only these broken image tags from curated input until they
recover. 袁斌's image recovers and 梁广泰's existing portrait changes. The
prepared manifest contains 607 resources, including four retained C4 portraits.
The observation is complete and advances the successful baseline.

This import includes the [October 26 pending changes](../source/chinasoft2026/checks/20261026T100051973226Z/REVIEW.md).
The user approved T1 as a first-class 专委会议 with all 20 rows. E4 and I7 now
publish seven rows each. C1 publishes exact stage times and a room. C2 moves
to November 6, with separate 14:00–17:00 and 19:30–21:30 stages. R2/R3/R16/R26/
R32/S6/E1/I4 change reports, credits or times. Old E1/R22/I4 warnings are resolved;
C4 retains the detail-page 18:30 end and flags the announcement's 18:20 end.
Three competition navigation links are withdrawn, but their pages and imported
content are retained. See the linked review for the full source change list.

The [October 25 evening check](../source/chinasoft2026/checks/20261025T100058174329Z/REVIEW.md)
matched the last import and remained incomplete because of the then-broken index.

The [October 24, 18:00 observation](../source/chinasoft2026/checks/20261024T100040420152Z/REVIEW.md)
was unchanged from the [15:42 content import](../source/chinasoft2026/checks/20261024T074205242195Z/REVIEW.md),
which added R9/R35/E5/I8 programmes, C4 stages and nine committee members.

The [October 23 observation](../source/chinasoft2026/checks/20261023T065259587808Z/REVIEW.md)
had no source changes compared with October 22 evening.

The [October 22 observation](../source/chinasoft2026/checks/20261022T100053520657Z/REVIEW.md)
publishes 32 local organizing members, adds six local advisory members and their
portraits, supplies advisory affiliations, and resolves both S2 title conflicts.
The committee-meeting index still returns HTTP 404. The check remains incomplete;
the last complete baseline is still October 21 morning.
The [evening recheck](../source/chinasoft2026/checks/20261022T150357302340Z/REVIEW.md)
confirms unchanged HTML and portraits since 18:00. The scheduled CLI exhausted
its usage allowance before pushing; this import was completed interactively.

The [October 21 evening observation](../source/chinasoft2026/checks/20261021T124314880733Z/REVIEW.md)
adds R34/E2/I5/S3 programmes and the timed C3 final. The newly linked committee
meeting index returns HTTP 404: accessible content is imported, but this check
remains **incomplete** and does not advance the last complete baseline.
Daily maintenance is installed on the confirmed continuously online host at
18:00 Asia/Shanghai; see the [runtime and report locations](../source/chinasoft2026/automation/README.md).

The [October 21 observation](../source/chinasoft2026/checks/20261021T020913151864Z/REVIEW.md)
updates two reports, overview event times, registration deadlines and source
profiles. Twelve new links are explicit pending-content pages, not published
programmes. R16 returns to active navigation with unchanged content. E3's
biography defect is resolved; E2's placeholder has an inconsistent source code.

The [October 20 observation](../source/chinasoft2026/checks/20261020T083547166350Z/REVIEW.md)
adds R29/S4, two competition announcements and 24 portraits, restores all 25
broken portraits, and applies the official education-forum renumbering. R23's
title conflict is resolved. Historical sections below retain the codes used at
their observation dates; the current inventory uses the October 20 codes.

The [October 19 observation](../source/chinasoft2026/checks/20261019T064331528893Z/REVIEW.md)
adds R19, committee affiliations/role labels and S5 room wording, and records
the new E4 biography defect.

The [October 18 observation](../source/chinasoft2026/checks/20261018T053641432592Z/REVIEW.md)
is incorporated: R2/R5/R27/S1 programmes, R8 report order, R6/R30 prose,
R13 host-table corrections and portrait changes. R2 spans two dates; one forum
identity and canonical report indices are retained across both daily views.
Original snapshots remain separate from curated importer input.

Sources: [official site](https://chinasoft.ccf.org.cn/2026/),
[overview](https://chinasoft.ccf.org.cn/2026/#agenda/agenda-overview/index).
The snapshot contains 95 importer-scope HTML pages (92 active plus three
retained). The dataset has 67 forum/competition/meeting entries, 492 programme
items, 64 breaks, 391 attached source abstracts and 607 prepared portrait
resources. No unmatched report profile remains. There are 59 published forum/
meeting programmes plus C2's two published competition stages.

## Unpublished programmes

| Category | Detailed / listed | Codes still without a detailed programme |
| --- | --- | --- |
| Academic | 33 / 35 | R25, R33 |
| Regular | 4 / 4 | None |
| Education | 5 / 6 | E6 |
| Industry | 8 / 8 | None |
| Special issue | 8 / 8 | None |
| Committee meeting | 1 / 1 | None |
| Competition | 1 / 5 | C1, C3, C4, C5 (individual slots unpublished) |

- Seven entries lack detailed individual programmes. R25/R33 have no date;
  R25/R33/C5 have no room or clock window. C1/C4 use dated timed sessions,
  so their canonical null date/window is not missing schedule information.
- E6 retains November 7, 14:10–15:10 and its overview room. C5 has only a
  November 7 final date. C1 has November 7, 15:30–18:30 and November 8,
  09:00–12:00 in second-floor room 6; its November 8 afternoon award is
  untimed and remains in the description. C4 has November 7, 15:20–18:30
  and November 8, 09:00–12:00 in second-floor room 5. C3 retains November 7,
  15:20–18:20 and its room conflict. Do not invent team slots or participants.
- Main-conference keynote/academician blocks have overview windows but no
  individual confirmed report programme. Planned guests remain tentative.
- The local organizing committee has 32 members; the local advisory committee
  has two chairs and 18 members; the programme committee has 195 members.
  All these rosters have published affiliations.
- M1–M6 remain undated in `extra.other_meetings`; A1–A3 have timed day blocks.
  T1 is now a first-class 专委会议 with 18 project reports plus opening/closing,
  November 6, 09:00–17:00, 二楼3号会议室. Its heading gives only the date;
  the envelope comes from the actual rows, not an invented published window.

## October 27 source details to recheck

- E4/I7 publish complete programmes and explicit portraits. I7 ends at 12:00
  in its heading but its last row ends at 11:35; do not invent missing rows.
- T1 has no report abstracts or individual speaker portraits. Its four
  organizers have biographies/photos; do not assign those to unrelated speakers.
  Normalize only its 议题名称/报告人 table headers in curated HTML.
- R32's 张瑶 vertical-bar heading and E4's parenthetical chair headings need
  data-only name/unit separators to avoid duplicate chair records. Preserve
  original bytes in the archive. All four R32 role paragraphs are now absent
  upstream; the old role-removal override is no longer needed.
- R16's new 唐滨/王晔晖 portraits are HTTP 404. Preserve all text, and recheck
  the exact URLs. R3's new 董淑照 row has no profile, photo or abstract.
- C2 has two separated final windows, not a continuous seven-hour final.
  Export and live states must retain the gap between 17:00 and 19:30.
- Retain the withdrawn competition index and C3/C4 detail pages via
  `curation.json.retained_pages`; a hidden link is not a cancellation.
- E1's 张颖 profile is now attached to the explicit row. The panel names seven
  people. R22's 武延军 affiliation and I4's forum end are consistent upstream.
- I1 removes its introduction and short chair roster; the current page has no
  chair profiles. Keep the previous content in snapshot history, without
  presenting the removed roster as current.
- R16 spacing and E4/T1 expanded title wording need no discrepancy badges;
  exact reviewed messages are dismissed in `note_review.json`.

## October 25 source details to recheck

- The advisory roster places 王劲松 immediately after 汪定 and before 杨亮,
  moving from member position 16 to 13. The same 18 members and two chairs remain.
- The committee overview now says 负责人 for finance, publicity, sponsorship,
  publication and volunteer organization. Its former five-heading correction
  is resolved upstream; keep the full official page without that override.
  Dedicated pages still need their committee-name prefixes to scope the roles.
- All eight I8 portrait URLs are available again. Restore their explicit tags;
  retain the existing 岳赟/蚂蚁 typography correction. 徐英帅's volunteer-committee
  image changes bytes at the same URL. No identity is inferred from filenames.
- There are no newly published programmes or changes to report metadata,
  abstracts, biographies, clock windows or rooms. All previously pending
  entries and substantive source notes remain unchanged.

## October 24 source details to recheck

- R9 is now named 智能嵌入式系统基础软件论坛 in both overview and detail.
  Its eight items include an unnamed host opening and collective closing;
  six technical reports have abstracts. Its November 6 afternoon room is
  三层1号多功能厅. This is a room name, not the separate 三层1号会议室.
- R35 publishes a 09:00–12:00 forum window but its first item starts at 09:30.
  Preserve both without inventing a missing opening half hour. Its final report
  credits only 鸿蒙生态高级布道师. Match the explicit credit and normalized report
  title to retain the abstract, without creating a person or attaching the
  role-card portrait to an invented identity. The role biography remains under
  `talk.extra.unnamed_profile`; the original card/image remains archived.
- I8's eight portrait references return HTTP 404: 刘振宇, 刘爽, 岳赟, 张卿,
  柳义利, 王子谋, 肖涛 and 郭威俊. Remove only those image tags from curated
  HTML; preserve all names, biographies and abstracts. Restore the tags if the
  exact URLs recover. None had a previously imported I8 photo to retain.
  **Resolved October 25:** all eight exact URLs work and their tags/photos are restored.
- The I8 table separates 岳赟 and 蚂蚁 with a line break. Curated HTML makes the
  existing name/affiliation boundary explicit as 岳赟（蚂蚁） to avoid interpreting
  the two two-character strings as a spaced four-character name. R30's two chair
  headings gain a space before parenthetical job/affiliation text so they merge
  with their existing short-list names. These are data-only typography edits.
- R30's 16:50–17:20 report now belongs to 王培新 (华东师范大学), titled
  形式化之后，可信之前：大模型辅助的建模与推断, replacing 王竟亦's report.
  The abstract, biography, portrait and guarded enrichment have been refreshed.
- C4's seven organizers include three secretaries. Preserve these roles; the
  four explicit portrait cards belong only to the named chairs. Its earlier
  conference-wide announcement remains archived and linked in metadata.
- P3 corrects 杨洲's abstract wording and expands his profile heading. I5 adds
  the forum suffix to its heading. I7 remains a pending page. Publication,
  publicity and volunteer committees add 2/3/4 members, all at 天津大学.
- 林云's existing education-portrait URL changes bytes; refresh every explicit
  association, including the existing E3 report, without inferring other photos.

## Missing abstracts and unresolved credits

- The source has no abstract for R34#2 or S3#3–#12 (ten papers), as well as S5#3–#10 (eight papers), all eight S1 reports, R3#7 and T1#2–#19 (18 project reports).
  Opening ceremonies, collective panels and closing remarks are counted
  separately; an absent abstract there is not automatically an extraction gap.
- **E1:** resolved in this import. 张颖 is explicitly credited and its source
  abstract/profile is attached. 刘军利 is a new report and the panel has seven
  named participants. No ambiguous-credit warnings remain.
- **R13 / 许福:** resolved on October 16; the timetable now says 北京林业大学,
  matching the biography. The previous discrepancy note is gone.
- **R22#3 / 武延军:** resolved; both timetable and profile now say
  中国科学院软件研究所. The old guarded note remains only in resolution history.
- **S2#4 and #5:** resolved on October 22. Both timetable titles now match their
  existing profile titles; obsolete conflict notes are removed and guarded AI
  titles are refreshed. Source abstracts, speakers and times are unchanged.
- **S2#10 / 朱煜琪:** the timetable literally prints 事科学院战争研究院.
  Keep it verbatim; do not silently expand it from the biography.
- **R14#4:** the timetable now explicitly names 廖楠; its previous unmatched
  profile is now attached. A remaining title difference must be rechecked:
  timetable `大模型威胁下的硬件组件供应链安全` versus profile
  `AI威胁下的硬件安全演进趋势`.
- **R23#6:** resolved on October 20. The timetable now says
  `Quafu 量子计算云平台介绍`, matching the profile except for a space. Remove
  the obsolete conflict warning and refresh the guarded AI annotation.
- Formatting-only title differences are retained in
  `extra.profile_report_title` without warning flags: P1#2–#10, P4#6–#7, R13#13–#18 and I4#3–#4.
  These are prefixes, punctuation or spacing; recheck their exact source text.

## Conflicting or withdrawn source information

- The homepage advertises November 6–8, while the overview/introduction include
  November 5 check-in. Include check-in as a normal event without a discrepancy warning.
- R1 and E3 have talks extending beyond their printed forum windows. Keep
  both windows; never shorten the reports to make them fit.
- The publicity committee discrepancy was resolved on October 16: its subpage
  now also lists 张重群. Both rosters are retained; the warning is gone.
- Several overview forum names differ from detail-page names. The detail-page
  title is displayed and the overview wording remains in `extra.overview_title`.
  The reviewed suffix differences carry no warning.
- The prototype-system announcement's navigation link was removed from the
  official site in this refresh. It previously described a November 6 afternoon
  forum without a code; it cannot be assumed to be C2. Removal of a link does
  **not** establish cancellation. The previous page remains in Git history;
  monitor its return. The active build no longer requires the withdrawn page.

## October 15 refresh details to recheck

- R16's navigation link was withdrawn, but its direct official page remains
  accessible and byte-identical. `curation.json` explicitly retains the programme;
  `fetch.py` continues fetching that URL. On October 21, active navigation is
  restored with byte-identical content; the historical retention entry remains.
- R17 now explicitly prints its code (October 16). The previously reviewed
  exact-title association remains recorded in `curation.json`.
- R17's 王林章 portrait URL returned HTTP 404. Remove only that `<img>` from
  curated HTML before preparing portraits; leave the person, biography and
  abstract intact. The original tag/URL/status remain in the check archive.
  Do not substitute another person's photo or display a broken image. Recheck
  `images/academic-forum/学术论坛/王林章.png` on the next fetch and restore it
  when available. This is a data-only correction, not a shared fallback rule.
- R7 contains both previously confirmed distinct people named 李佳. Their report
  titles and biographies establish their associations with P4 and R4. Reviewed
  title-guarded identities in `curation.json` preserve both original follow keys;
  no additional uncertainty notes are needed.
- R8 has two programme tables, 14 reports, two openings, two closing remarks,
  six organizers and two breaks. Its day-wide envelope does not remove its
  morning/afternoon programme rows. R6's last report ends at 17:30 while its
  published forum window ends at 18:20; no extra reports or times are invented.
- Existing portrait resources for 刘杨, 苏亭, 王莹 and 高翠芸 changed in place.
  Their source/output hashes and prepared WebP files have been refreshed.

## October 16 refresh details to recheck

- The overview renumbers the Harmony AI competition from C6 to C2 and the
  talent-training forum from E6 to E7; E6 now names the prototype-system case
  forum. R35 is newly listed. The old prototype competition title is no longer
  listed. Use the current official codes; do not carry old E6 times into the
  newly named E6. Previously saved code-only links/follows are not migrated.
- The academic navigation repeats the exact R22 link twice. Remove only the
  second duplicate from curated HTML; original snapshots retain both copies.
- There are 22 broken portrait URLs: the existing R17 image, all eight I3
  resources and all 13 P3 resources. Exact URLs/statuses are in the October 16
  `report.json` under `broken_portraits`. Remove only these `<img>` tags from
  curated HTML before `fetch_photos.py`; preserve people and all text. Restore
  tags if those exact official resources recover. Do not guess substitute URLs.
- The S2 and S6 陈子涵 records have separate graduate-programme biographies and
  research fields. Explicit identity keys keep them separate without a UI note.
  Both official cards reference the same 专刊论坛/陈子涵.png resource; retain
  that explicit source association and recheck if the source replaces either image.
  S2 chair 李佳 shares R4/R7's Hongyi postdoctoral biography and uses that key.
- S7's 论坛组委会代表 and S2's 全体 are collective credits, not people.
  R31 closing remarks, S2's anniversary discussion, and S7/S8 opening remarks
  are retained with their appropriate event types, without invented abstracts.
- P3 has both morning/afternoon sessions and three breaks; S2 also has both
  sessions. All 78 newly published reports have attached source abstracts.
- Four previously imported portrait resources changed: 文俊浩, 王喆, 王焱林,
  and 武延军. The last was previously referenced only by retained R16, so it
  appears as an added active reference but a changed imported resource.

## October 17 refresh details to recheck

- I7 软件研发体系与工程实践论坛 and I8 智能系统底座与应用实践论坛 appear in
  the overview only. Preserve their pending status; no date, window, room or
  participants have been published in the checked pages.
- I6's organizer-list affiliation for 李晓锋 now retains only 航天科技集团502所.
  陈睿's biography adds two honors. The report programme is unchanged.
- S8's navigation/detail title now matches the overview:
  智能化软硬件供应链安全分析技术. Its reports and schedules are unchanged.
- All 444 active portrait references are unchanged, including the 22 broken
  URLs. Existing prepared assets remain valid; no portrait refresh is needed.

## October 18 refresh details to recheck

- R2 now publishes 17 programme items (16 reports and one hosted panel) across
  November 6 (09:00–17:00) and November 7 (15:20–18:30), with three breaks.
  Per-day windows are envelopes of published programme rows, not independent
  forum-wide clock announcements. Keep `sessions` and explicit talk/break dates.
  The November 6 gap from 10:00 to 10:20 is unassigned in the source; do not
  invent a report or extend a neighbouring slot. 梁广泰 is the panel host,
  not a separately announced speaker; preserve that explicit role.
- R5 publishes six reports on November 6, 09:00–12:00; R27 publishes five on
  November 8, 09:00–12:00. All 27 new R2/R5/R27 reports have source abstracts.
  S1 publishes an opening and eight reports on November 6, 14:00–17:40, but
  no report abstracts or speaker profiles. Its four organizer biographies remain.
- R8 swaps 康梓峰 to 10:20–10:45 and 孟岩 to 16:50–17:15. Profiles follow
  their reports; the two guarded enrichment entries move with their titles.
  Existing positional `R8#4` / `R8#16` follows and `#talk-5` / `#talk-17`
  links now refer to the newly published positions; no migration is applied.
  张鹏程's organizer affiliation is shortened to 河海大学; introductory labels
  are removed without changing the underlying descriptive text.
- R6 replaces its introduction, expands 吴毅坚's biography and specifies
  新加坡南洋理工大学 for 王翀. R30 replaces 江贺 and 李姗姗's biographies.
- R13 removes redundant placeholder cells that previously interrupted host
  rowspans. The published hosts now cover all six afternoon reports; no report,
  speaker or clock is changed. The duplicate R22 navigation link is fixed upstream.
- Portraits: 34 new active references, of which S1's four organizer URLs return
  404; seven existing images are replaced (曹嘉伦, 李戈, 梁广泰, 江贺, 石琳,
  金芝, 高翠芸). 王林章's exact previously broken URL now works and is restored.
  There are now 25 broken active URLs (P3: 13; I3: 8; S1: 4). Their original
  tags/statuses remain archived; omit only those image tags in curated input.
- The R27/S1 overview/detail names differ only by the 论坛 suffix. Two exact
  dismissals avoid decorative warnings; the ten substantive source notes remain.

## October 19 refresh details to recheck

- R19 now has five reports and one break on November 6, 09:00–12:00,
  四层5号多功能厅, with all five abstracts and eight portraits. The final report
  ends at 11:50; no extra item or extended report is inferred.
- E4#2 (刘万伟): the source replaces the personal biography with report prose.
  It resembles the abstract but has a different ending. Preserve both fields;
  `curation.json` guarded one source-content note. Resolved on October 21, now
  E3#2: the source restores the biography; its old note is retained as history.
- Committee role reconciliation is a deliberate data-only correction: dedicated
  finance/publicity/sponsorship/publication/volunteer pages now say 负责人,
  while `committee-chair.html` still says 主席. In curated HTML, prefix the
  five dedicated headings with their committee names. The five corresponding
  overview headings were also corrected to 负责人; **resolved October 25**,
  when the source adopted those labels itself. This merges unchanged duplicate
  rosters without combining unrelated committees. Original labels stay archived;
  recheck before reapplying after a fetch. No decorative discrepancy note is added.
- The three previously missing programme-committee affiliations are now all
  华为有限公司. Membership remains unchanged at 195.
- R24's 许思源 heading is now 高级研究员; R28's 薛磊 heading is now 教授.
  S5's room is 二层11号会议室. I2 corrects biography punctuation and ISSTA's
  spelling. P4's navigation label now matches its existing detail title.
- Eight R19 portrait URLs are new and available. All 478 previous active URLs
  are unchanged, including the same 25 broken references. Prepared resources
  increase to 468. Eleven substantive source notes remain, including E4#2.

## October 20 refresh details to recheck

- R29 publishes four reports and a panel on November 8, 08:50–12:00,
  三层2号多功能厅. S4 publishes fourteen reports on November 7, 15:20–18:20,
  二层18号会议室. Both have one break; all eighteen new reports have abstracts.
  S4's last report ends at 18:10; no extra item fills the remaining ten minutes.
- Education codes move E2→E1, E3→E2, E4→E3, E5→E4, E6→E5, E7→E6.
  The old E1 软件基础教育 becomes M5 闭门会议（原软件基础教育论坛）.
  M4/M6 are newly listed; M2 loses its old specific name, and T1 now names
  CCF-华为胡杨林基金系统软件专项2025年项目结题验收会议. All remain undated.
  Remap guarded enrichment and the Liu Wanwei note to the matching programmes.
  As with the earlier renumbering, saved code-only links/follows are not migrated.
  Do not attach old E1 content to the newly numbered E1 by code alone.
- C1's provisional schedule is November 7 afternoon (manual proving), November
  8 morning (AI-assisted final), and November 8 afternoon (awards). No exact
  times or rooms are published. Preserve the provisional label and date-only
  sessions; the older introductory sentence still says venue/dates are pending.
  C4's final/awards are only described as during November 6–8. Do not treat
  the whole conference range as a three-day final. Both source announcements,
  including rules, organization and earlier milestones, are archived in full;
  the viewer imports the conference-period schedule and official links only.
- R23#6's title conflict is resolved. P4 changes its forum title to
  博士学位论文激励计划论坛 and rewrites Li Jia's report abstract around agent
  execution/delivery trust. R7's separately published abstract is unchanged.
- R13 changes 三层1号会议厅 to 三层1号会议室. R12 corrects 胡杰英 to 胡英杰
  in a biography; R28#4 corrects 经款 to 经多款 in its abstract. I2 changes
  守护 to 保障 in its introduction. The November 7 dinner becomes 大会晚餐,
  retaining its banquet classification and existing times. Other title changes
  are suffixes or navigation labels, not new discrepancy warnings.
- All 510 active portrait URLs now return images: 24 new R29/S4 resources,
  25 recovered P3/I3/S1 resources, and 461 unchanged. Restore the original
  image tags in those three curated pages; no substitutes are used. Including
  seven retained-page resources, all 517 resources are prepared and decoded.
  No broken portraits remain. Existing R32 role removals and October 19
  committee-label reconciliation are still necessary and remain unchanged.

## October 21 refresh details to recheck

- Twelve newly linked pages explicitly say `内容正在更新中，敬请关注。`:
  R9/R25/R33/R34/R35, E2/E4/E5/E6 and I5/I7/I8. Preserve their official links
  and pending status; none supplies a report, clock time, room or participant.
  E6 still inherits its previously published overview window. Counts remain
  48 detailed and 18 unpublished programmes, with 395 programme items.
- The system-software education placeholder prints E1, while the overview
  assigns this title E2 and the software-engineering education detail remains
  E1. `curation.json.placeholder_codes` guards the exact title and original code,
  associates it with E2, and retains the original code plus one substantive note.
  Do not overwrite E1, silently renumber the source, or add suffix-only notes.
- R16's navigation returns; its programme and seven previously retained-only
  portrait URLs are byte-identical. Its historical retention record remains,
  while the active dataset no longer marks the navigation link withdrawn.
- P3#7 changes from Fan Ming's mobile privacy-compliance report to Niu Xintao's
  `Datalog程序的自动故障定位` (南京大学), retaining 14:45–15:15.
  R19#5 changes from Han Xiaoyang's BrewFS report to Ma Quanyi's
  `基于 Rust 的 Monorepo 架构体系实现`, retaining 11:20–11:50. Import both
  new abstracts, biographies and portraits and replace the guarded AI annotations.
  Existing report-index follows continue to follow the replaced programme slot;
  there is no new migration or assumption that the old speaker still attends it.
- E3#2 restores Liu Wanwei's actual biography and changes the abstract ending
  to `挑战及应对建议`. Move the obsolete active note to historical resolved notes.
  E3's organizers now explicitly list their institutions, also shown for hosts.
  I1 adds four introduction paragraphs and explicit organizer cards for Peng Xin
  and Wang Haofen. Peng Xin's biography remains on his organizer card after the
  source moves it there. R26 updates Wu Zhilin's formal-methods committee role
  from secretary-general to executive deputy director; no talk times change.
- Overview: November 6 forum windows become 08:00–12:00 and 14:00–17:00;
  these overview envelopes never replace individual published forum/report times.
  The systems-software annual meeting ends at 21:30, formerly 21:20. November 7
  opening/keynotes/academician block ends at 12:10, formerly 11:45. November 8
  afternoon adds `颁奖典礼` to its title, retaining 13:30–16:30. Annual-meeting
  room prefixes change, but their normalized room labels remain unchanged.
- Early registration extends to October 25; the later price period starts
  October 26. The price values are unchanged. Contact details add accommodation
  contact Liu Ying, `yingzi (at) kailimice.cn`. These complete pages are archived
  in curated input; the viewer continues linking to official registration/hotel
  pages rather than introducing a new fees/contact UI.
- All 517 active portrait URLs are available and match the imported hashes.
  Nine appear newly active: seven belong to restored R16, two replace the old
  P3/R19 references. There are only two new portrait assets versus our dataset.
- One data-only markup correction is needed in the overview: its literal
  `日期 / 时间 / 会议安排 / 地点` header cells changed from `th` to `td`.
  Restore only those four cells to `th` in curated HTML so they are not parsed
  as an event. Keep the original response in the check archive. This is not a
  general parser relaxation. Recheck before reapplying after a fetch.

## October 21 evening refresh details to recheck

- R34 publishes seven programme items (five reports, an opening and a hosted
  panel), November 7, 15:20–18:20, 三层29号会议室. The detail title changes
  to 泛在操作系统应用发展论坛 while the overview still says 泛在操作系统开源应用论坛;
  retain this substantive title difference. Four technical reports have source
  abstracts; Guo Yao's work report has none. The panel's explicitly named host
  Li Zhenning has a profile, not a speaker credit.
- E2 publishes ten items (eight reports, opening and discussion), November 6,
  09:00–12:00, 二层13号会议室. Its source code is now correctly E2: the old
  placeholder association is retained in resolved curation history only.
  All eight reports have abstracts. Chen Xiangqun is the discussion host;
  the collective participants are not a person or an additional host.
- I5 publishes five reports with abstracts, November 8, 09:00–12:00,
  2层19号会议室. The final report ends at 11:40; no invented report fills the
  remaining twenty minutes. S3 publishes twelve reports, November 7,
  15:20–18:20, 四层3号多功能厅; only the first two have profiles/abstracts.
  Each new forum publishes one break. All 32 new portrait URLs are available;
  the 517 previously active resources are unchanged. Thirty guarded annotations
  bring enrichment coverage to 395 items.
- C3's Rust competition announcement and its agenda copy publish November 7,
  15:20–18:20. Their top location says 二层15号会议室, but the milestones
  table says 会议中心三层多功能厅（C3）. Display the explicit top location and
  retain the conflicting milestone plus a substantive note. The tentative award
  activity is November 8 afternoon at the conference closing ceremony; do not
  invent team slots or duplicate the already published closing event.
- R29's room loses a punctuation separator; its normalized room is unchanged.
  R29/E3 also receive formatting-only whitespace/heading edits. Navigation adds
  competition pages and a committee-meeting index. The latter returns 404;
  no existing meeting is deleted and the observation remains failed/incomplete.
- New data-only typography corrections: R34's `议 题` table header becomes
  `题目`; separate its explicit opening guests 金海 / 梅宏 with a semicolon.
  E2's host/collective cell gets an explicit semicolon between 北京大学 and
  全体报告嘉宾及参会者. Exact originals stay archived. The reviewed collective
  credit vocabulary excludes groups before person parsing. Explicit host profiles
  attach to hosts, preserving biographies/photos without duplicate unmatched cards.
- Eleven substantive flags remain: existing timing/title/credit/institution
  conflicts, plus R34's changed forum title and C3's room conflict, minus the
  resolved E2 code note. Technical-report prefixes, spacing and the I5 forum
  suffix are reviewed data differences without warning flags.

## October 22 refresh details to recheck

- The local organizing committee publishes 32 names and affiliations. The local
  advisory committee adds 杨亮, 赵子平, 王赜, 王劲松, 刘祥颖 and 李海丰 with six
  new portraits; its two chairs and all 18 members now have explicit affiliations.
  Do not infer identity associations or copy photos onto unrelated source cards.
- S2#4 now reads `跨项目需求分类中检索增强上下文学习的实证研究`; S2#5 now reads
  `面向SLO工程的运行时质量需求候选证据检查与责任分流方法`. Both match their
  profiles. Remove their obsolete warnings; retain all source abstracts and
  refresh guarded enrichment. Nine substantive notes remain.
- R8 shortens Zhao Bin's organizer affiliation to 西北工业大学. It swaps the
  fourth/fourteenth profile cards, but not the timetable: 康梓峰 still starts at
  10:20 and 孟岩 at 16:50. Match profiles by identity, not card order; keep their
  existing canonical indices and enrichment. No programme item is added.
- E3 corrects section numbering; navigation labels gain forum suffixes. The
  footer changes 赞助单位 to 合作单位, still with no organizations listed. The
  homepage removes the old January 1 date on its conference announcement.
- Twelve of 94 accessible pages changed since the October 21 evening import;
  82 are byte-identical. All 549 previous portrait resources are unchanged and
  the six additions work. The unavailable committee-meeting index remains 404.
  The successful baseline does not advance. All ten deliberate curated-page
  differences remain necessary and unchanged, including R32's role removals.
- The flat committee grid now occurs on two kinds of committee page, and card
  affiliations are newly published. The adapter handles grids per heading and
  retains `.committee-unit` values. Independent mixed-format fixtures prevent
  losing chair sections or labeling a committee merely 委员.

## Deliberate data-only correction: R32 biographies

**Resolved upstream on October 26 and imported October 27:** the official source now
removes all four role paragraphs itself and revises the substantive biographies.
Do not reapply obsolete removals or overwrite those new biographies after the
refresh. The historical correction below describes earlier snapshots.

At the user's explicit request, remove the four standalone role paragraphs
from the curated R32 source snapshot before building. Do not add a general
role-stripping rule to the shared parser. Original source role values were:

| Person | Removed standalone role paragraph |
| --- | --- |
| 吕勇强 | 角色：论坛主席（唯一主负责人） |
| 何家骥 | 角色：论坛主持人、组委会成员 |
| 胡强 | 角色：论坛主持人、组委会成员 |
| 张瑶 | 角色：论坛主持人、组委会成员 |

The names, portraits, substantive biographies and existing committee roles
remain. File: `source/chinasoft2026/raw/pages/agenda/academic-forum/templates/hw-sw-collaborative-security.html`.
Fetching overwrites this curated snapshot: **inspect and reapply the four data
edits after every fetch if the upstream paragraphs are still present**. Both
generated JSON copies must come from the same rebuilt source.

## Refresh procedure

1. Run `uv run python source/chinasoft2026/check_updates.py` to preserve an
   original-source observation before refreshing curated input. Review both
   comparisons in its report: changes since the last check and pending changes
   versus curated input. Then fetch live pages and compare added, changed and removed links. A withdrawn
   link is not evidence of a cancelled event. Review this document's pending
   codes, identities, title differences and source rosters against the new pages.
2. Recheck the historical R32 correction, October 19 dedicated committee-page prefixes and
   October 21 overview-header data corrections. The five committee overview
   labels were resolved upstream on October 25 and need no override.
   Check for repeated navigation links, and
   recheck the two broken R16 portraits and all previously available resources;
   do not generalize one-off source edits into shared parsing code. Review
   `curation.json` against the source and update this document when upstream fixes gaps.
3. Refresh portrait assets if image references/content changed. Check identities
   against their own profile cards, not filenames or same-name records elsewhere.
4. Rebuild with `uv run python source/build_all.py`; run
   `uv run python source/validate.py` and
   `uv run python -m unittest discover -s source/chinasoft2026`.
   Confirm the two dataset copies match and a second build is byte-identical.
5. Check source prose, including unlabelled continuation paragraphs. Verify
   missing abstract counts and unmatched profiles separately. Keep AI-derived
   content in `enrichment`, and review it when source titles/abstracts change.
6. Run `cd web && pnpm lint && pnpm build && pnpm test`. Browser checks must
   cover all forum inventory entries, pending-date search/filtering, hosts,
   chronological breaks, source-note expansion on touch/keyboard, distinct
   same-name records, legacy follows, empty-forum My Day/calendar exports,
   report permalinks, portraits, topic data and other conferences.
7. Inspect the updated PR preview and update this file's counts/status. Passing
   schema/build checks alone is not evidence of complete or accurate display.

## Resolved display defects tracked by regression checks

- All 67 forum entries are reachable in the normal dashboard (70 daily rows), including the
  two entries under the pending-date section; filtering works there too.
- Long committee rosters reveal when entering the viewport. A fractional
  visibility threshold hid the 195-member programme committee on mobile;
  independent 400-member fixtures now cover both desktop and mobile.
- R13's six host-bearing rows and E3's seven host-bearing rows display their
  hosts separately from speakers, with portraits from each forum's own chair
  profiles. Forum details include all 64 source breaks,
  without changing report anchor numbering.
- R14's confirmed speaker, profile and new abstract paragraph are imported;
  凌祥's updated biography and M1's updated title are synchronized.
- R32 role paragraphs are removed by the documented data edit, not parser code.
- Source notes are expandable with keyboard/touch; substantive notes now appear
  at committee and report level; unresolved profiles remain separately accessible.
- E6 can be followed as a timed forum before individual reports are announced.
  C5 retains a date-only event; unknown dates are never fabricated for exports.
- P4#4 / R4#6 are two different people named 李佳, confirmed by the user.
  Their profiles and identity keys remain separate. They are not a source
  discrepancy and carry no uncertainty note. Legacy name-based follows retain
  their old coverage; new follows use the separate keys.
- The live view uses each forum's window, including published reports that
  exceed it, rather than treating the entire day's forum board as one session.
  Date-only competitions never acquire a fabricated active time. Upcoming
  forum counts group actual starts instead of grouping every forum in the day.

## Source-note inventory and necessity review

The original cleanup removed 84 of 93 notes. October 15 added two exact
forum-title dismissals; October 16 adds 16 equivalent title/collective-credit
messages to the exact-text review list; October 18 adds two forum-suffix differences. These are not new source warnings.
R13's affiliation and the publicity roster discrepancy are now resolved.
Six substantive notes remain: R1/E3 timing conflicts, R14's report-title
conflict, R34's changed forum title, C3's room conflict and C4's final-end-time
conflict. The October 27 import resolves E1's ambiguous credits, R22's unit
conflict and I4's overrun; S2's title conflicts were resolved October 22.
The October 21 evening update resolves the E2 placeholder-code mismatch. October 21 resolves
the E3#2 biography defect, with its old note retained only in curation history. October 20 adds
seven exact formatting/prefix/suffix dismissals and resolves the R23 conflict. No uncertainty notes were added for known distinct
same-name people. The historical inventory below retains its original status.

The conference-specific `source/chinasoft2026/note_review.json` records exact
reviewed note text. The adapter removes only those reviewed messages; a new or
changed discrepancy remains visible for review. This is data curation, not a
shared UI suppression rule. Recheck this file against the inventory on refresh.
Pending programmes retain their normal status, pending committee member lists
have empty membership with a pending status, and reviewed collective credits display
as source text without fabricated people. Check-in remains a normal event.
Original overview titles and profile report titles remain in metadata.

The table is the historical inventory of all 93 notes and their applied
disposition. Report indices are one-based. The AI provenance mark is separate
and is not part of this inventory.

| Original location | Original note (verbatim text) | Applied disposition |
| --- | --- | --- |
| Home + Committee | 日期口径不同：首页为 11 月 6–8 日，大会介绍和总体日程包含 11 月 5 日签到；本站包含签到日。 | Removed; check-in remains a normal event |
| Home + Committee | 程序委员会：原文为“待更新”，名单尚未公布。 | Removed; normal pending status retained |
| Home + Committee | 本地组织委员会：原文为“待定”，名单尚未公布。 | Removed; normal pending status retained |
| Home + Committee | 宣传委员会主席：来源页面名单不一致，分别为“王栋、辜文蔚、张重群；王栋、辜文蔚”，保留全部明确列出的人名。 | Retained |
| P1 / forum | 论坛名称不一致：总表为“软件女性学者”，此处使用详情页名称。 | Removed: wording/formatting only |
| P1#2 | 报告题目不一致：日程表为“特邀报告: 双链耦合：打通教学科研的任督二脉——探索教学与科研的双向赋能”，报告资料为“双链耦合：打通教学科研的任督二脉——探索教学与科研的双向赋能”，均按原文保留。 | Removed: wording/formatting only |
| P1#3 | 报告题目不一致：日程表为“特邀报告: 软件工程之美”，报告资料为“软件工程之美”，均按原文保留。 | Removed: wording/formatting only |
| P1#4 | 报告题目不一致：日程表为“青年学者报告: 在深耕中拓界：从网构软件到智能化软件的探索之旅”，报告资料为“在深耕中拓界：从网构软件到智能化软件的探索之旅”，均按原文保留。 | Removed: wording/formatting only |
| P1#5 | 报告题目不一致：日程表为“青年学者报告: 从发现问题到形成研究方向”，报告资料为“从发现问题到形成研究方向”，均按原文保留。 | Removed: wording/formatting only |
| P1#6 | 报告题目不一致：日程表为“青年学者报告: 一个ISFJ人的读博后记”，报告资料为“一个ISFJ人的读博后记”，均按原文保留。 | Removed: wording/formatting only |
| P1#7 | 报告题目不一致：日程表为“博士生报告: 在复杂软件中寻真问题，在真实场景中解真问题：我的科研探索与思考”，报告资料为“在复杂软件中寻真问题，在真实场景中解真问题：我的科研探索与思考”，均按原文保留。 | Removed: wording/formatting only |
| P1#8 | 报告题目不一致：日程表为“博士生报告: "打怪升级"之外：AI时代，如何找到自己的问题与动力？”，报告资料为“"打怪升级"之外：AI时代，如何找到自己的问题与动力？”，均按原文保留。 | Removed: wording/formatting only |
| P1#9 | 报告题目不一致：日程表为“博士生报告: 在实验中求真，在实践中成长：探索可信代码大模型的科研之路”，报告资料为“在实验中求真，在实践中成长：探索可信代码大模型的科研之路”，均按原文保留。 | Removed: wording/formatting only |
| P1#10 | 报告题目不一致：日程表为“博士生报告: 让缺陷有迹可循，也让科研有迹可循”，报告资料为“让缺陷有迹可循，也让科研有迹可循”，均按原文保留。 | Removed: wording/formatting only |
| P2 / forum | 论坛名称不一致：总表为“青年学者”，此处使用详情页名称。 | Removed: wording/formatting only |
| P3 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| P4 / forum | 论坛名称不一致：总表为“优秀博士生激励计划”，此处使用详情页名称。 | Removed: wording/formatting only |
| P4#1 | 原文署名为“论坛组委会”，未明确具体人物。 | Removed; collective credit displayed normally |
| P4#6 | 报告题目不一致：日程表为“SMT 的局部搜索技术与应用”，报告资料为“SMT的局部搜索技术与应用”，均按原文保留。 | Removed: wording/formatting only |
| P4#7 | 报告题目不一致：日程表为“AI 赋能的安全证书综合与形式化验证方法”，报告资料为“AI赋能的安全证书综合与形式化验证方法”，均按原文保留。 | Removed: wording/formatting only |
| P4#8 | 原文署名为“论坛组委会”，未明确具体人物。 | Removed; collective credit displayed normally |
| R1 / forum | 论坛名称不一致：总表为“Agentic AI分析与测试”，此处使用详情页名称。 | Removed: wording/formatting only |
| R1#7 | 时间不一致：本报告为 18:00–18:30，超出论坛标注的 15:20–18:20，均按原文保留。 | Retained |
| R2 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R3 / forum | 论坛名称不一致：总表为“AI赋能软件系统的架构治理与维护”，此处使用详情页名称。 | Removed: wording/formatting only |
| R3#1 | 原文署名为“嘉宾致辞”，未明确具体人物。 | Removed; collective credit displayed normally |
| R3#8 | 原文署名为“所有嘉宾”，未明确具体人物。 | Removed; collective credit displayed normally |
| R4 / forum | 论坛名称不一致：总表为“安全代码生成与软件可信构建”，此处使用详情页名称。 | Removed: wording/formatting only |
| R5 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R6 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R7 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R8 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R9 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R10 / forum | 论坛名称不一致：总表为“软件形式化工程方法”，此处使用详情页名称。 | Removed: wording/formatting only |
| R11 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R13 / forum | 论坛名称不一致：总表为“智能化软件开发、维护与安全”，此处使用详情页名称。 | Removed: wording/formatting only |
| R13#1 | 原文署名为“主持人”，未明确具体人物。 | Removed; collective credit displayed normally |
| R13#12 | 原文署名为“主持人及报告嘉宾”，未明确具体人物。 | Removed; collective credit displayed normally |
| R13#13 | 报告题目不一致：日程表为“特邀报告1：《人机物融合软件系统的设计方法——探索和挑战》”，报告资料为“人机物融合软件系统的设计方法——探索和挑战”，均按原文保留。 | Removed: wording/formatting only |
| R13#14 | 报告题目不一致：日程表为“特邀报告2：《从人类智能到机器智能：一种受脑启发的智能体计算架构》”，报告资料为“从人类智能到机器智能：一种受脑启发的智能体计算架构”，均按原文保留。 | Removed: wording/formatting only |
| R13#15 | 单位信息不一致：日程表为南洋理工大学，个人简介为北京林业大学，均按原文保留。 | Retained |
| R13#15 | 报告题目不一致：日程表为“特邀报告3：《林草智能软件研究与典型应用》”，报告资料为“林草智能软件研究与典型应用”，均按原文保留。 | Removed: wording/formatting only |
| R13#16 | 报告题目不一致：日程表为“特邀报告4：《面向数据安全保护场景的系统性能优化》”，报告资料为“面向数据安全保护场景的系统性能优化”，均按原文保留。 | Removed: wording/formatting only |
| R13#17 | 报告题目不一致：日程表为“特邀报告5：《机无所恶，伤有所至：具身智能时代的软件的可靠性危机》”，报告资料为“机无所恶，伤有所至：具身智能时代的软件的可靠性危机”，均按原文保留。 | Removed: wording/formatting only |
| R13#18 | 报告题目不一致：日程表为“特邀报告6：《生-机-电系统融合：从感知到生成》”，报告资料为“生-机-电系统融合：从感知到生成”，均按原文保留。 | Removed: wording/formatting only |
| R14 / forum | 论坛名称不一致：总表为“智能驱动供应链安全分析”，此处使用详情页名称。 | Removed: wording/formatting only |
| R14#4 | 报告题目不一致：日程表为“大模型威胁下的硬件组件供应链安全”，报告资料为“AI威胁下的硬件安全演进趋势”，均按原文保留。 | Retained |
| R15 / forum | 论坛名称不一致：总表为“可信区块链”，此处使用详情页名称。 | Removed: wording/formatting only |
| R16 / forum | 论坛名称不一致：总表为“智能软件与开源生态”，此处使用详情页名称。 | Removed: wording/formatting only |
| R17 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R18 / forum | 论坛名称不一致：总表为“移动软件工程”，此处使用详情页名称。 | Removed: wording/formatting only |
| R19 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R21 / forum | 论坛名称不一致：总表为“攻击溯源、推理与安全分析”，此处使用详情页名称。 | Removed: wording/formatting only |
| R22 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R23 / forum | 论坛名称不一致：总表为“量子计算软件和算法”，此处使用详情页名称。 | Removed: wording/formatting only |
| R23#6 | 报告题目不一致：日程表为“量子算法可靠实现的形式验证”，报告资料为“Quafu量子计算云平台介绍”，均按原文保留。 | Retained |
| R25 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R26 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R27 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R28 / forum | 论坛名称不一致：总表为“软件分析与软件安全新技术”，此处使用详情页名称。 | Removed: wording/formatting only |
| R29 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R30 / forum | 论坛名称不一致：总表为“形式化方法与大模型技术”，此处使用详情页名称。 | Removed: wording/formatting only |
| R31 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R33 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| R34 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| S1 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| S2 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| S3 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| S4 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| S6 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| S7 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| S8 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| E1 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| E2 / forum | 以下报告资料未能与日程表署名明确对应，单独保留：张颖 | Removed duplicate; separate profile section retained |
| E2#4 | 署名“彭蓉-张颖”中的讲者／主持角色不明确，保留原文，暂不关联人物。 | Retained |
| E2#5 | 署名“刘璘- 全体嘉宾”中的讲者／主持角色不明确，保留原文，暂不关联人物。 | Retained |
| E3 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| E4#7 | 时间不一致：本报告为 11:45–12:10，超出论坛标注的 09:00–12:00，均按原文保留。 | Retained |
| E5 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| E6 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| I3 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| I4#3 | 报告题目不一致：日程表为“RustBot：企业级Rust智能化作业解决方案”，报告资料为“《RustBot：企业级Rust智能化作业解决方案》”，均按原文保留。 | Removed: wording/formatting only |
| I4#4 | 报告题目不一致：日程表为“从个人提效到组织提效—Coding Agent的组织落地实践”，报告资料为“从个人提效到组织提效——Coding Agent的组织落地实践”，均按原文保留。 | Removed: wording/formatting only |
| I4#6 | 时间不一致：本报告为 11:30–12:00，超出论坛标注的 09:00–11:30，均按原文保留。 | Retained |
| I5 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| C1 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| C2 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| C3 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| C4 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| C5 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| C5 / forum | 竞赛通知已公布决赛日期，具体时间、会场和参赛议程尚未公布。 | Removed; normal pending status retained |
| C6 / forum | 总体日程已列出此论坛，官网尚未公布详细议程。 | Removed; normal pending status retained |
| C6 / forum | 竞赛通知已公布决赛日期，具体时间、会场和参赛议程尚未公布。 | Removed; normal pending status retained |
