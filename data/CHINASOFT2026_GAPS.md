# ChinaSoft 2026: source gaps and refresh checklist

Last source review: 2026-10-14. This is the conference-specific checklist for
every subsequent refresh, not a claim that the official programme is complete.
Talk numbers below are **one-based**, matching the website's `#talk-N` links.

Sources: [official site](https://chinasoft.ccf.org.cn/2026/),
[overview](https://chinasoft.ccf.org.cn/2026/#agenda/agenda-overview/index).
The current live navigation exposes 53 HTML pages and 27 detailed programmes.
The dataset contains 64 forum/competition entries, 204 programme items, 27
breaks, 172 attached source abstracts and 298 downloaded portrait assets.
One further abstract is retained in an unmatched profile, separately displayed.

## Unpublished programmes

| Category | Detailed / listed | Codes still without a detailed programme |
| --- | --- | --- |
| Academic | 17 / 34 | R2, R5, R6, R7, R8, R9, R11, R17, R19, R22, R25, R26, R27, R29, R31, R33, R34 |
| Regular | 3 / 4 | P3 |
| Education | 2 / 6 | E1, E3, E5, E6 |
| Industry | 4 / 6 | I3, I5 |
| Special issue | 1 / 8 | S1, S2, S3, S4, S6, S7, S8 |
| Competition | 0 / 6 | C1, C2, C3, C4, C5, C6 |

- 37 programmes are unpublished. Of the 64 entries, 34 have no date, 36 no
  room and 36 no clock window. These sets overlap; do not add the counts.
- E6 has a November 7, 14:10–15:10 window and a room in the overview. C5/C6
  have November 7 final dates in their announcements, but no clock times or
  rooms. Keep these partial facts without inventing reports or participants.
- Main-conference keynote/academician sessions have overview windows but no
  individual confirmed talk programme. Tentatively attending guests in
  `extra.planned_guests` are not confirmed keynote speakers.
- The programme committee and the local organizing committee's member list
  remain pending. Placeholder words must not become person records.
- Other meeting names M1–M3 and T1 lack dated programme entries and remain in
  `extra.other_meetings`; the three A1–A3 annual meetings have timed day blocks.
  Do not assign the undated meetings to a day by analogy.

## Missing abstracts and unresolved credits

- The source has no abstract for R16#5 (任旭东) or S5#3–#10 (eight papers).
  Opening ceremonies, collective panels and closing remarks are counted
  separately; an absent abstract there is not automatically an extraction gap.
- **E2#4:** source credit `彭蓉-张颖` does not establish speaker/host roles.
  The 张颖 profile, portrait and abstract are preserved and displayed in an
  unmatched-profile section. Do not attach them to a guessed speaker credit.
- **E2#5:** `刘璘- 全体嘉宾` is also ambiguous. Keep the source credit in an
  accessible note; do not create a person named after a group.
- **P4#4 / R4#6:** 李佳 is credited to 清华大学 / 武汉大学 with different
  biographies. It is unresolved whether these are namesakes or updated
  affiliations. Explicit `person.extra.identity_key` values keep the source
  records, portraits, directory entries and follows separate. Do not merge or
  rename either person without evidence. Legacy name-based follows retain
  their old scope by resolving to both records.
- **R13 / 许福:** timetable affiliation 南洋理工大学 differs from biography
  北京林业大学. Preserve both and revisit when the source changes.
- **R14#4:** the timetable now explicitly names 廖楠; its previous unmatched
  profile is now attached. A remaining title difference must be rechecked:
  timetable `大模型威胁下的硬件组件供应链安全` versus profile
  `AI威胁下的硬件安全演进趋势`.
- **R23#6:** timetable `量子算法可靠实现的形式验证` versus profile
  `Quafu量子计算云平台介绍`. Do not silently replace either title or claim the
  supplied abstract has been independently verified against the timetable.
- Other title differences are retained in talk flags and
  `extra.profile_report_title`: P1#2–#10, P4#6–#7, R13#13–#18 and I4#3–#4.
  Most are prefixes, punctuation or spacing; recheck their exact source text.

## Conflicting or withdrawn source information

- The homepage advertises November 6–8, while the overview/introduction include
  November 5 check-in. Include check-in and keep the date discrepancy visible.
- R1, E4 and I4 have talks extending beyond their printed forum windows. Keep
  both windows; never shorten the reports to make them fit.
- The publicity committee overview includes 张重群; the subpage lists 王栋
  and 辜文蔚. Keep all explicit names, both source rosters and the visible note.
- Several overview forum names differ from detail-page names. The detail-page
  title is displayed and the overview wording remains in `extra.overview_title`
  and the forum's source notes.
- The prototype-system announcement's navigation link was removed from the
  official site in this refresh. It previously described a November 6 afternoon
  forum without a code; it cannot be assumed to be C2. Removal of a link does
  **not** establish cancellation. The previous page remains in Git history;
  monitor its return. The active build no longer requires the withdrawn page.

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

1. Fetch live pages and compare added, changed and removed links. A withdrawn
   link is not evidence of a cancelled event. Review this document's pending
   codes, identities, title differences and source rosters against the new pages.
2. Apply the documented R32 data correction; do not generalize a one-off source
   edit into shared parsing code. Update this document when upstream fixes it.
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

- All 64 forum entries are reachable in the normal dashboard, including the
  34 entries under the pending-date section; filtering works there too.
- R13's two host-bearing rows and E4's seven host-bearing rows display their
  hosts separately from speakers. Forum details include all 27 source breaks,
  without changing report anchor numbering.
- R14's confirmed speaker, profile and new abstract paragraph are imported;
  凌祥's updated biography and M1's updated title are synchronized.
- R32 role paragraphs are removed by the documented data edit, not parser code.
- Source notes are expandable with keyboard/touch and appear at conference,
  forum and report level; unresolved profiles remain separately accessible.
- E6 can be followed as a timed forum before individual reports are announced.
  C5/C6 retain date-only events; unknown dates are never fabricated for exports.
- Ambiguous same-name identities no longer share one representative profile or
  one new follow key. Existing unambiguous records retain their original keys.
- The live view uses each forum's window, including published reports that
  exceed it, rather than treating the entire day's forum board as one session.
  Date-only competitions never acquire a fabricated active time. Upcoming
  forum counts group actual starts instead of grouping every forum in the day.
