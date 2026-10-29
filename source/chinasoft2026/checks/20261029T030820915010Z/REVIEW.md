# October 29 source review

Observed October 29, 2026, 11:08–11:09 Asia/Shanghai. Complete check of 94
active HTML pages, three retained withdrawn pages and 627 active portrait URLs;
all are accessible. Thirteen active pages changed since the last complete and
imported October 28 evening observation. No HTML page was added or removed;
all three retained pages remain unchanged. The separate web-reader request
for the homepage timed out; the repository checker fetched it and all tracked
pages successfully, and its original response bytes are archived.

## Programme changes

- I1 adds 黄罡 (北京大学), “智能化软件的数据挑战与展望”, November 8,
  09:05–09:25, with an abstract, biography and explicit portrait. Its four
  existing technical reports move to 09:25–09:45, 09:45–10:05, 10:05–10:25
  and 10:40–11:00; tea moves to 10:25–10:40. The opening stays 09:00–09:05
  and the panel stays 11:00–12:00, adding 黄罡 to the six-person panel.
  The source restores a full introduction and separately lists two organizers,
  彭鑫 and 王昊奋, whose explicit profiles remain distinct from report profiles.
- R20 adds 孟国柱's 09:00–09:10 forum introduction on November 8. Five existing
  reports move to 09:10–09:40, 09:40–10:10, 10:30–11:00, 11:00–11:30 and
  11:30–12:00; tea moves to 10:10–10:30. Report titles/abstracts remain unchanged.
  Redundant `职称：` heading labels are removed upstream; the previous curated
  correction is no longer applied. No opening abstract is invented.
- C5 moves its final from November 7 to **November 6, 19:30–21:30**, publishing
  **二层16号会议室**. Preserve one timed forum and no invented team rows, matching
  the existing treatment of competitions without individual programmes. The
  conference adapter reads this new explicit time/location paragraph and checks
  it against the milestone date. This is conference-source parsing; no shared
  viewer code changes. The award notice now says awards start November 8, with
  at least three working days of public notice before certificates are mailed.
- S1 report 8 retains its title and 16:50–17:15 slot but replaces 陶乐 with
  **张瑞宸**, at 北京信息科技大学. No speaker profile/photo or abstract is supplied.

## People, navigation and formatting

- R32 adds **陈俊洁**, 天津大学 professor, with explicit biography and portrait.
  Its short roster now includes academic titles for all five organizers.
- R9 removes 胡春明's detailed chair profile, completing the short-list removal
  seen yesterday. He is no longer a current R9 chair; the old source and image
  remain in history. No other R9 programme field changes.
- R8 reorders organizer profiles and places 康梓峰/孟岩 profile cards in the
  order already used by its timetable. Times, reports and people are unchanged.
- The local advisory committee replaces 刘祥颖 with **刘军利** and his explicit
  portrait; the local organizing committee replaces 刘军利 with **刘祥颖**.
  Both source entries retain 天津市大学软件学院. The rosters remain 18 and 32
  members respectively. This does not infer or merge identities by affiliation.
- E4's navigation label becomes “特软论坛：数智时代的软件人才培养”, matching
  its already-imported detail title. Its profile headings change punctuation;
  王尚广's new heading loses the name/unit separator, so curated input inserts
  one space. Its old parenthetical chair-heading fixes are resolved upstream.
- R25 removes repeated affiliations from report headings and wraps long prose;
  the timetable affiliations and all report content remain available, and its
  generated forum is unchanged. Other R20/S1/E4 prose edits are line wrapping.
- C4's competition announcement gains a paragraph break without a rule change.

## Portraits, curation and remaining gaps

Three explicit active references are new: 陈俊洁 (R32), 黄罡 (I1), 刘军利
(advisory committee). R9's old 胡春明 reference and the old advisory 刘祥颖
reference are removed; no historical asset is deleted. The other 624 active
hashes are unchanged. Prepare 631 source resources, including four retained
C4 references; they correspond to 628 distinct local WebP assets.

Original/curated archive hashes and all 192 HTML members verify. All 627 active
portrait input hashes and 631 prepared output hashes match. Fourteen curated
pages differ from pristine HTML, with only documented boundary/label corrections.
E4 needs the new one-space name boundary; R20's old correction is obsolete.
R32's standalone role paragraphs remain absent upstream.

The dataset contains 67 entries, **512 programme items**, 65 breaks, **408 source
abstracts** and **461 guarded AI annotations**. Existing I1/R20 annotations move
with their report titles; only the new 黄罡 technical report gets a new AI
summary/topic entry. Source titles and abstracts are not rewritten by the model.

Seven substantive warnings remain unchanged, including S6's title conflict.
E6 still lacks its forum programme; C1/C3/C4/C5 lack individual team/report slots.
Every listed entry now has a published date, room and clock window (including
multi-session competitions). Main-conference individual keynote details remain
unpublished. All withdrawn pages are retained. The full checklist is in
`data/CHINASOFT2026_GAPS.md`.

## Validation

- All four conferences rebuild and pass schema/person/time validation.
- All 32 adapter/checker tests pass, including changed programme windows,
  new opening/report rows, C5's new date/time/room, replacement speakers,
  committee memberships and E4's person/profile boundary.
- Web regression expectations follow the newly published source: R32 has five
  organizers, C5 exports a precise timed event on November 6 and appears live
  only within its final window. Its old date-only live cases now verify the
  completed final; independent unknown-time fixtures remain in the shared suites.
- Web lint/build and all seven web/browser suites pass, including 34 independent
  shared regressions, 628 decoded portrait assets, all published programme rows,
  committee lists, chronological schedules, source notes, follows/exports,
  report anchors and multi-day reports. All 65 live-clock screenshots pass,
  covering venue/overseas clocks, midnight, automatic ticks and notifications.
- Changed desktop/mobile I1 and R20 screenshots and the completed C5 state were
  visually inspected. No browser errors or horizontal overflow were reported.
- Exact pushed-revision CI and Netlify preview verification are recorded in the
  PR's latest-check section after deployment.
