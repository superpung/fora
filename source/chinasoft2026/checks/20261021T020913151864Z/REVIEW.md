# Official-source review: 2026-10-21

Compared with complete observation `20261020T083547166350Z`. All 90 active
HTML pages were archived: thirteen newly active, thirteen changed and 64
byte-identical. No active page was removed. R16 moved from retained-only to
active navigation, with byte-identical content. Twelve genuinely new pages
contain only a pending-content notice; there are no new published programmes.
Observation timestamps are not upstream publication timestamps.

## Actual programme changes

- P3#7 (November 6, 14:45–15:15): Fan Ming / 西安交通大学 and the mobile
  privacy-compliance report are replaced by Niu Xintao / 南京大学 and
  `Datalog程序的自动故障定位`. The abstract, biography and portrait also change.
- R19#5 (November 6, 11:20–11:50): Han Xiaoyang's BrewFS report is replaced by
  Ma Quanyi's `基于 Rust 的 Monorepo 架构体系实现`; the source describes him as
  a former senior technical expert at Huawei and Tencent. The abstract,
  biography and portrait also change. Both replacement slots retain their times.
- Replace both guarded AI summaries/topic assignments with annotations based on
  the new reports. Their old annotations must not follow the unchanged indices.
  Existing index-based follows keep following the programme slot, as before.
- E3#2: Liu Wanwei's biography is restored to actual biographical information,
  and the abstract ending changes to `挑战及应对建议`. Move the obsolete
  biography warning to `resolved_talk_notes` history; it is no longer displayed.
  The new organizer list explicitly gives the institutions of Deng Yuxin,
  Li Xiaohong and Cao Qinxiang, also making host affiliations available.
- I1 adds four introduction paragraphs and an explicit organizer list/cards for
  Peng Xin and Wang Haofen. The former combined speaker/chair section is split;
  Peng Xin's biography remains on his organizer card. Report times and titles
  are unchanged; remaining report edits are typography and profile headings.
- R26 updates Wu Zhilin's formal-methods committee role from secretary-general
  to executive deputy director. The rest of that page's diff is HTML formatting.

## Overall schedule and practical information

- November 6's overview forum windows change from 09:00–12:00 / 13:30–17:00
  to 08:00–12:00 / 14:00–17:00. Retain these in overview metadata, without
  replacing individual forums' or reports' separately published clocks.
- The systems-software committee annual meeting on November 6 ends at 21:30,
  previously 21:20; the start remains 19:30.
- November 7's opening/keynote/academician block ends at 12:10, previously
  11:45; the start remains 08:30.
- November 8's 13:30–16:30 closing block adds `颁奖典礼` to its title.
  Annual-meeting room labels add the conference-center prefix, which is
  retained in raw metadata and omitted from normalized room labels.
- Early registration extends through October 25; regular pricing starts
  October 26. Fee amounts do not change. The homepage adds the extension
  announcement, dated October 20, and links the organizer's notice.
- The contact page adds accommodation contact Liu Ying,
  `yingzi (at) kailimice.cn`. Registration/contact pages are imported verbatim;
  existing official registration/hotel links remain the viewer's entry points.

## Pending pages, provenance and portraits

The twelve new placeholder pages are R9/R25/R33/R34/R35, E2/E4/E5/E6 and
I5/I7/I8. Each explicitly says `内容正在更新中，敬请关注。`. Preserve their
source links and notices with `agenda_status: not_published`. E6 retains its
previously published overview date/window; no new clock, report or room is inferred.
The adapter recognizes the repeated placeholder template and rejects one mixed
with programme/profile content, rather than silently dropping content.

The system-software education placeholder still prints E1. The current overview
assigns that title E2; the existing software-engineering education programme
is E1. A title/code-guarded curation association maps the placeholder to E2,
retains its original code, and adds one substantive source-code note. The raw
HTML is not renumbered. Other suffix differences get no decorative warnings.

R16's programme and seven portraits were already imported. Keep its historical
retention evidence, with the active link taking precedence, and remove the
stale `link_withdrawn` dataset marker. All 517 active portrait URLs are available.
The active-source comparison has nine additions (seven restored R16 references
and two replacement speakers), two removed references and 508 unchanged hashes.
Against curated input, only two new portrait resources replace two old references;
there are no same-URL content replacements or broken images. All imported
original hashes match the observation. Unreferenced old content-addressed assets
remain in Git; neither reference removal implies server deletion.

The original overview now marks its literal `日期 / 时间 / 会议安排 / 地点`
header row with `td`, causing a strict build to reject it as an event date.
Restore exactly those four cells to `th` in curated HTML. This is a documented
data-only markup repair, not a shared parser heuristic. The original archive
preserves the exact response. Existing R32 role removals and six committee-label
reconciliations remain untouched. These eight pages are the only curated HTML
files differing from the current original-source archive.

Inventory remains 66 forum/competition entries, 48 published programmes,
395 programme items, 53 breaks, 339 attached abstracts plus one unmatched
abstract, 365 guarded AI annotations and 517 prepared portrait resources.
Eighteen programmes remain unpublished; fourteen entries lack a date, seventeen
a room and seventeen a clock window. Ten substantive notes remain: resolving
E3's biography defect is balanced by the new E2 source-code discrepancy.
No shared application code or new interface is introduced by this refresh.

## Validation

All four datasets pass schema, person-name and clock validation. The two
ChinaSoft 2026 copies match, and all 517 imported original portrait hashes match
the observation. All 21 adapter/source-check tests pass, including placeholder
identity isolation, retained E6 timing, replacement reports and the resolved
biography. Web lint/build and the complete browser suite pass: 34 shared core
regressions, eight shared UI cases, eight permalinks, all 48 published forums
and 517 decoded portraits, four schedule days, pending-forum follows/exports,
source notes, identities, topics and the global AI switch.

The source audit produces 56 screenshots, the desktop/mobile multi-day audit
12, and the live-clock audit 65. Captures were visually inspected. New clock
cases verify the extended annual meeting and opening block at their former
end times and their newly published boundaries. Overseas clocks, automatic
ticks, midnight, disabled/untimed reminders and notification deduplication pass.
The PR records the post-push deployment verification separately.
