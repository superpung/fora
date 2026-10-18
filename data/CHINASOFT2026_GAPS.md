# ChinaSoft 2026: source gaps and refresh checklist

Last imported source review: **2026-10-18**. This is the conference-specific
checklist for every subsequent refresh, not a claim that the official programme
is complete. Talk numbers below are **one-based**, matching `#talk-N` links.

The [October 18 observation](../source/chinasoft2026/checks/20261018T053641432592Z/REVIEW.md)
is incorporated: R2/R5/R27/S1 programmes, R8 report order, R6/R30 prose,
R13 host-table corrections and portrait changes. R2 spans two dates; one forum
identity and canonical report indices are retained across both daily views.
Original snapshots remain separate from curated importer input.

Sources: [official site](https://chinasoft.ccf.org.cn/2026/),
[overview](https://chinasoft.ccf.org.cn/2026/#agenda/agenda-overview/index).
The official navigation exposes 70 importer-scope HTML pages and 44 detailed
programmes. Curated input retains R16, giving 71 HTML pages and 45 programmes.
The dataset contains 67 forum/competition entries, 371 programme items, 50
breaks, 316 attached source abstracts and 460 downloaded portrait resources.
One further abstract is retained in an unmatched profile, separately displayed.

## Unpublished programmes

| Category | Detailed / listed | Codes still without a detailed programme |
| --- | --- | --- |
| Academic | 28 / 35 | R9, R19, R25, R29, R33, R34, R35 |
| Regular | 4 / 4 | None |
| Education | 2 / 7 | E1, E3, E5, E6, E7 |
| Industry | 5 / 8 | I5, I7, I8 |
| Special issue | 6 / 8 | S3, S4 |
| Competition | 0 / 5 | C1, C2, C3, C4, C5 |

- 22 programmes are unpublished. Of the 67 entries, 19 have no date, 21 no
  room and 21 no clock window. These sets overlap; do not add the counts.
- E7 has a November 7, 14:10–15:10 window and a room in the overview. C5/C2
  have November 7 final dates in their announcements, but no clock times or
  rooms. Keep these partial facts without inventing reports or participants.
- Main-conference keynote/academician sessions have overview windows but no
  individual confirmed talk programme. Tentatively attending guests in
  `extra.planned_guests` are not confirmed keynote speakers.
- The local organizing committee's member list remains pending. The programme
  committee now has 195 members; 任晗, 谢筱恒 and 许文强 have no published
  affiliations. Keep those affiliations absent.
- Other meeting names M1–M3 and T1 lack dated programme entries and remain in
  `extra.other_meetings`; the three A1–A3 annual meetings have timed day blocks.
  Do not assign the undated meetings to a day by analogy.

## Missing abstracts and unresolved credits

- The source has no abstract for R16#5 (任旭东) or S5#3–#10 (eight papers), and none for the eight S1 reports.
  Opening ceremonies, collective panels and closing remarks are counted
  separately; an absent abstract there is not automatically an extraction gap.
- **E2#4:** source credit `彭蓉-张颖` does not establish speaker/host roles.
  The 张颖 profile, portrait and abstract are preserved and displayed in an
  unmatched-profile section. Do not attach them to a guessed speaker credit.
- **E2#5:** `刘璘- 全体嘉宾` is also ambiguous. Keep the source credit in an
  accessible note; do not create a person named after a group.
- **R13 / 许福:** resolved on October 16; the timetable now says 北京林业大学,
  matching the biography. The previous discrepancy note is gone.
- **R22#3 / 武延军:** timetable says 中科院计算所, biography says
  中国科学院软件研究所. Both are retained with a guarded data note.
- **S2#4 and #5:** timetable/profile titles differ substantively. Both original
  titles and a note are retained; compare the next source update.
- **S2#10 / 朱煜琪:** the timetable literally prints 事科学院战争研究院.
  Keep it verbatim; do not silently expand it from the biography.
- **R14#4:** the timetable now explicitly names 廖楠; its previous unmatched
  profile is now attached. A remaining title difference must be rechecked:
  timetable `大模型威胁下的硬件组件供应链安全` versus profile
  `AI威胁下的硬件安全演进趋势`.
- **R23#6:** timetable `量子算法可靠实现的形式验证` versus profile
  `Quafu量子计算云平台介绍`. Do not silently replace either title or claim the
  supplied abstract has been independently verified against the timetable.
- Formatting-only title differences are retained in
  `extra.profile_report_title` without warning flags: P1#2–#10, P4#6–#7, R13#13–#18 and I4#3–#4.
  These are prefixes, punctuation or spacing; recheck their exact source text.

## Conflicting or withdrawn source information

- The homepage advertises November 6–8, while the overview/introduction include
  November 5 check-in. Include check-in as a normal event without a discrepancy warning.
- R1, E4 and I4 have talks extending beyond their printed forum windows. Keep
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
  `fetch.py` continues fetching that URL. Recheck its status on the next refresh.
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

## Deliberate data-only correction: R32 biographies

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
2. Apply the documented R32 data correction, check for repeated navigation links, and
   recheck all 25 currently broken portrait URLs;
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

- All 67 forum entries are reachable in the normal dashboard (68 daily rows), including the
  19 entries under the pending-date section; filtering works there too.
- Long committee rosters reveal when entering the viewport. A fractional
  visibility threshold hid the 195-member programme committee on mobile;
  independent 400-member fixtures now cover both desktop and mobile.
- R13's six host-bearing rows and E4's seven host-bearing rows display their
  hosts separately from speakers, with portraits from each forum's own chair
  profiles. Forum details include all 50 source breaks,
  without changing report anchor numbering.
- R14's confirmed speaker, profile and new abstract paragraph are imported;
  凌祥's updated biography and M1's updated title are synchronized.
- R32 role paragraphs are removed by the documented data edit, not parser code.
- Source notes are expandable with keyboard/touch; substantive notes now appear
  at committee and report level; unresolved profiles remain separately accessible.
- E7 can be followed as a timed forum before individual reports are announced.
  C5/C2 retain date-only events; unknown dates are never fabricated for exports.
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
Ten substantive notes remain: three timing conflicts (R1/E4/I4), four report
title conflicts (R14/R23/S2#4/S2#5), two ambiguous E2 credits, and the R22#3
institution discrepancy. No uncertainty notes were added for known distinct
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
