# Changelog

All notable changes to this project. The project is unversioned (no release
tags yet), so entries are grouped by date, newest first. Written in English per
the repository language rule (see AGENTS.md).

## 2026-07-15 — Forum-detail timeline layout + abstract collapse

### Added
- **Vertical time-rail layout on the forum-detail page** for forums whose talks
  carry times: a continuous rail with a node dot per talk, the start/end time on
  the left, and the talk card (title, speakers, abstract) on the right — the
  chronological flow is now visual. Falls back to the numbered card list for
  untimed forums / conferences (e.g. CCF Chip).

### Changed
- **Talk abstracts collapse to a 3-line preview** with a 展开/收起 toggle (the
  toggle only appears when the text overflows). A long forum page (e.g. ChinaSoft
  S2, 21 talks) drops from ~15,600px to ~4,900px, so all talks are scannable
  without endless scrolling. Speaker avatars are unchanged.

## 2026-07-15 — Timeline grid redesign + AGENTS compliance

### Fixed
- **Timeline grid no longer clips or overlaps talks.** Strict time-proportional
  heights couldn't fit talks as short as 2 min (73 of them are ≤10 min), so
  titles overflowed and collided. Talk cells now use push-down stacking (each
  gets a readable floor height and drifts down only under congestion, never
  overlapping) plus height-adaptive content: cells shrink by dropping the speaker,
  then clamping the title to one line, so nothing is ever cut mid-line.
- **Removed the colored left-edge bar on timeline talk cells** (violated the
  AGENTS.md "no left-edge highlight bars" rule); cells use a full-surface tint
  and a stronger border on hover instead.
- **Dashboard talk authors now lay out horizontally and wrap** (were stacked
  vertically). Unlike the forum-row author line, talk authors are never
  truncated — the full author list is shown.

## 2026-07-15 — Timeline grid + forum-talk times

### Added
- **Time-vs-forum matrix on the timeline page** (Schedule): the vertical axis is
  wall-clock time and each forum is a column, so you can read "at 10:00, which
  talk is each forum running". Talks are placed at their real start/end; a sticky
  time gutter and sticky column headers make the wide grid scannable, and the
  panel scrolls both axes. Falls back to the forum-card list for conferences
  whose talks carry no per-talk times (e.g. CCF Chip). Talks with no time are
  counted in a per-column footer note rather than dropped.

### Fixed
- **Forum-detail talks now show their time** (ChinaSoft carries per-talk
  start/end): a mono time pill sits before each report title.
- **Dashboard author hover underline restored**: the one-line speaker clip
  (`overflow: hidden`) was cutting off the `.pauthor` underline; the row now
  reserves space below the baseline so the underline shows.
- **Forum room address stays on one line** on every width: room/code/category
  share a full-width top line above the title (was a narrow left rail that folded
  long ChinaSoft room names into 3–4 lines and shrank the pin icon).

## 2026-07-15 — Mobile layout fixes + hub grouping

### Fixed
- **Mobile horizontal overflow** on every in-conference page: the nav (switcher +
  links + theme toggle) pushed the theme toggle ~19px off-screen. The switcher and
  toggle are now pinned and the links scroll horizontally between them.
- **Hub content flush to the edges** on mobile: `.hub` had set a `padding`
  shorthand that zeroed the horizontal padding; only the vertical padding is set
  now, so the title/cards keep the container gutter.
- **Long room names** (ChinaSoft) no longer wrap into a cramped 3–4 line column:
  the dashboard forum row puts room/code/category on a full-width top line on
  mobile, and the timeline card stacks to a single column.
- **Forum speakers stay on one line** on any screen (nowrap + soft right fade)
  instead of wrapping into many lines.
- **ChinaSoft speaker parsing**: English names were truncated
  ("Bangchao Wang" → "Bangchao"), "A and B" cells mis-split, and affiliation /
  venue / room strings (e.g. "北京航空航天大学") became fake speaker names. The
  parser now handles CJK vs Latin names, multi-author cells, and drops
  institution/venue cells.

### Changed
- **The hub groups conferences by status** — 进行中 / 即将开始 / 已结束 — computed
  from today's date, newest-relevant first. Empty groups are hidden.

## 2026-07-15 — Schema evolution + second conference (ChinaSoft 2025)

### Added
- **Second conference: CCF ChinaSoft 2025** — 73 forums across 7 categories, 9
  keynotes, ~575 speakers. Parsed from its (structurally different, static) site
  by a reproducible per-conference adapter, `source/chinasoft2025/`: `fetch.py`
  saves the source to a committed `raw/`, `build.py` parses it deterministically
  offline. Real anomalies (competition training/awards tables, a lab with no
  schedule, a dateless forum) are recorded as `flags`, never guessed.

- **Forum categories in the UI.** The dashboard gained a category filter row +
  per-row tags, and the forum page shows its category — all conditional on the
  conference having categories (ccfchip2026 is unchanged). Competitions surface
  here as first-class `竞赛论坛` forums.
- **`add-conference` skill** (`.claude/skills/`): the onboarding playbook (recon →
  fetch → map with escape-hatch → validate → wire → verify), with schema.json as
  the source of truth.

### Changed
- **The schema is now an evolvable contract.** Added an open `extra` escape hatch
  at every level — conference-specific data the core doesn't model is captured
  there (and/or via `flags`) instead of being forced or dropped — and a
  first-class optional `forum.category`. Descriptions are now English.
- The keynote rail derives its period label from the talks' times (no longer
  hardcoded "上午"), so keynotes spanning morning + afternoon read "上午·下午".
- **`validate.py` is a regression gate** over every conference (a schema change
  can't silently break an existing one); **`build_manifest.py`** is a shared,
  conference-agnostic manifest builder. CI rebuilds all conferences and asserts
  no drift.

## 2026-07-15 — Multi-conference architecture

The viewer now hosts **several conferences** instead of being hard-wired to one.

### Added
- **Conference hub at `/`.** A catalogue page lists every hosted conference as a
  card (name, dates, city, forum/keynote/day counts) and links into it. Rendered
  from a lightweight `manifest.json` — no full dataset is loaded just to list
  conferences.
- **Per-conference routes `/:conf/...`.** Each conference lives under its own id
  (`/ccfchip2026/schedule`, `/ccfchip2026/forum/CF01`, …). This also fixes forum
  codes (CF01, …) not being unique across conferences: the id in the path
  disambiguates them, so every forum link is now shareable.
- **Conference switcher** in the nav (Vercel/Linear-style): the brand shows the
  active conference and opens a popover to jump to another or back to the hub —
  same open/close animation as the export menu.
- **Lazy per-conference data.** Each conference's dataset is code-split into its
  own chunk and fetched only when that conference is entered; a page loader shows
  while it loads. The built views for a conference are memoised (built once).

### Changed
- **Data layer is no longer a module singleton.** `lib/data.ts` exposes a pure
  `buildConferenceViews(raw)` factory (plus conference-independent helpers);
  components read the active conference's views through `useConference()`.
- **Per-conference data files + manifest.** `web/src/data/conference.json` moved
  to `web/src/data/conferences/<id>.json`, and the build regenerates
  `web/src/data/manifest.json` from every conference file present.
- **Follows are scoped per conference.** The follow provider is mounted inside
  the conference layout (keyed by id), so each conference keeps its own agenda
  (`<id>:followed.*`) and switching never mixes two agendas.
- Unknown or legacy flat URLs (`/schedule`, `/bogus/…`) redirect to the hub.

## 2026-07-14 — UI optimization, round 5 (review feedback)

### Added
- **Import a saved agenda.** A new "导入" control on the dashboard reads a JSON
  backup and merges its follows into the current agenda (available even with no
  follows yet). Export gained a matching **JSON backup** format. JSON is the only
  round-trippable format: the calendar/spreadsheet/markdown exports list resolved
  talks and can't say whether a talk was followed directly, via its forum, or via
  a speaker. Imports are rejected if the file names a different conference.

### Changed
- **Namespaced storage keys.** This site can host several conferences, so all
  per-conference state is now keyed under the conference id
  (`ccfchip2026:followed.*`) instead of a hard-coded `ccfchip.*` prefix. (Theme
  stays a site-wide preference.)
- **Forum page header:** the code / room / date / period meta moved *below* the
  title, and the top "返回日程面板" back button was removed (the nav already links
  back). The timeline forum cards already put this meta beside the title, so they
  were left as-is.

## 2026-07-14 — UI optimization, round 4 (review feedback)

### Added
- **Shared author line** across the dashboard: person icon + name (hover
  underline) + affiliation/title. Forum-talk authors now show their affiliation
  like keynotes do, and keynote authors were restyled to match (icon + hover).
  Each forum chair carries its own person icon.
- **Follow-view highlighting.** Toggling "我的关注" now highlights *every* talk
  that resolves to a follow — followed directly, via its forum, or via one of its
  speakers — while the filled star still marks only the explicitly-followed unit
  (talk / forum / speaker). Tracked forums auto-expand and the keynote rail
  auto-opens so highlighted items are visible.
- **CJK–Latin visual spacing** (`text-autospace`): a gap between Chinese and
  Latin/numerals without inserting real space characters.

### Changed
- **Forum row layout:** the sponsor and report count moved into the right-hand
  action cluster, vertically centred with the star/enter/caret; the report count
  stays rightmost with the sponsor to its left (no longer baseline-aligned to the
  title).
- **Export filename** is now the conference name plus the date range it spans
  (e.g. `CCF Chip 2026 我的日程 2026-07-18~07-20.ics`).
- **Consistent hover/animation:** the export dropdown animates open/close; added
  the missing hover transitions on link buttons, export-menu items, and the
  filter tag.
- **Favicon** is now a project-level scheduler/agenda glyph (monochrome) instead
  of a conference-specific chip — conf-scheduler will host other conferences.

## 2026-07-14 — UI optimization, round 3 (review feedback)

### Added
- **Followable keynotes** and **agenda export.** Main-conference keynotes can be
  starred; the dashboard exports all followed talks (starred talks, whole
  followed forums, and followed speakers' talks) as calendar (.ics), CSV, or
  Markdown. Forum talks with no time inherit their forum block's window; the
  location is the full venue name + room.
- Small icons before each field of the dashboard day meta (venue/time/parallel),
  a person icon on author lists, and location pins on rooms; the timeline venue
  gets a distinct building icon.

### Changed
- Dashboard forum rows: the report count and sponsor moved onto the title line.
- Category chips with a 0 count are hidden (e.g. 其他).
- Removed the committee "N 位专家 · M 个角色" subtitle.
- Monochrome (black/white) favicon.

## 2026-07-14 — UI optimization, round 2 (review feedback)

### Added
- **Real official forum URLs.** Recovered each forum's `general_NNNN` article URL
  from the site (getShortUrl short-url table joined to the channel tree, verified
  live); the "官网" button now opens the article page, not the poster. Stored in
  `source/extracted/forum_source_urls.json` and exposed as `forum.source_url`.
- **Sticky A–Z labels.** Speaker letter-group headers pin under the nav while
  their group is in view.

### Changed
- **Dashboard forum rows** redesigned: room/code on the left; title and authors
  share one left edge; authors are hover-underline links (not pills); the whole
  header is a single hover/expand unit; enter is an icon-only button.
- **Keynote rail**: single column, with an animated expand/collapse.
- **Content icons** added inside rows (forum meta, speaker talk rows); the
  speakers section icon changed so it no longer duplicates the committee icon.
- Anchor/permalink highlight uses a full-surface tint only — no left-edge bar
  (now forbidden in AGENTS.md).

### Fixed
- **Speaker categorization** (data): companies (阿里巴巴/字节跳动/科大讯飞/…),
  universities (国防科大/…) and institutes (中科院计算所/…) that fell into 其他 are
  now classified correctly; 0 remain uncategorized.
- **Scroll restoration**: Back now lands on the exact previous position (the
  cleanup save had been clobbering it with the clamped scroll of the next page).
- **Committee grid dividers**: cells above a partial last row kept their bottom
  divider; each cell now owns its own bottom+right hairline.
- Off-centre star fix, tea-break full-bleed, mobile day tabs, etc. (round 1).

## 2026-07-14 — Web UI optimization pass

A round of usability and polish work on the web viewer, plus a data refresh.

### Added
- **Forum talk permalinks.** Every talk on a forum page has a link button that
  copies a shareable URL and moves the hash to that talk. Anchors are 1-based
  (`#talk-1`, `#talk-2`, …) to match the visible numbering; the speakers page
  and dashboard use the same scheme.
- **Official-site link.** Forum pages link to the official ccf.org.cn CMS poster
  for that forum (the full content of its article page), resolved from the
  dataset's `source_url` origin rather than a hard-coded host.
- **Speaker categories.** Speakers are classified by affiliation into 高校 /
  科研院所 / 企业 / 其他, with a category filter row (and counts) and a per-card
  category tag.
- **A–Z speaker index.** A pinyin-initial jump rail on the speakers page (Chinese
  initials via ICU pinyin collation, validated 340/340 against pypinyin), with
  letter-grouped anchors; works on mobile as a thin right-edge strip.
- **Speaker chips on the dashboard.** Each forum lists all its speakers as
  clickable chips; clicking one filters the whole board to that person's forums
  and talks (with a removable filter tag) and highlights their talks.
- **Inline talk expansion on the dashboard.** Clicking a forum row expands its
  talks inline; entering the forum page is now a dedicated "进入" button.
- **Committee avatars.** Every committee member shows an initials avatar,
  matching the speaker/chair treatment.
- **Scroll restoration.** Browser Back/Forward restores the previous scroll
  position; expanded speaker cards persist across navigation.

### Changed
- **Removed decorative eyebrow labels** (`Program`, `Speakers`, `Committee`,
  `Organizers`); every section head now leads with an icon badge.
- **Homepage masthead:** the date moved from above the title to below it, reading
  `<dates> · 中国·<city>` (city derived from the main venue).
- **Prose replaced with buttons:** the "需要按时间线逐场浏览？…" sentence is now a
  single calendar icon+label button to the timeline.
- **Date switching on the dashboard** now cross-fades the board.
- **Mobile dashboard toolbar** collapses from three rows to two (filter chips
  drop their text labels to share the search row).
- **Timeline day tabs** scroll horizontally on mobile instead of overflowing.
- **Persistent anchor highlight:** a hash-linked talk stays highlighted while the
  hash is present (with a one-shot arrival pulse) instead of flashing once.
- New AGENTS.md UI-copy rules forbidding decorative eyebrows, prose-as-UI, and
  text stacked above a page title.

### Fixed
- **Blank page on Back from a `#hash` URL.** A route-level exit animation kept the
  outgoing page mounted, where it re-matched the incoming route and suspended on
  its lazy chunk. Route-level exit removed; pages unmount immediately and the
  incoming page animates in (this also stops pages from stacking / doubling
  document height).
- **Off-centre star glyph** in small follow buttons (unreset `<button>` padding).
- **Spurious grid dividers**: a single committee member showed a stray divider
  above it, and multi-column grids drew lines above their whole first row. The
  committee grid and keynote rail now draw hairlines only between cells.
- **Keynote tea break** on the timeline is full-bleed (flush to both card borders)
  instead of inset.

### Data
- Parsed the late-published CF10 poster (6 talks, 2 chairs); recorded the
  `抗量子` vs `后量子` title variant as a forum flag.
- Fixed CF01 talk #2 (韩军) title from the updated poster; removed its mismatch
  flag. Added a forum-level `flags` field and `data/VERIFY_TODO.md` tracker.

## 2026-07-14 — Infrastructure & docs
- Added GitHub Actions CI (data validation + rebuild-no-diff; web lint + build).
- Made the dataset build deterministic and dual-write `data/ccfchip2026.json`
  and `web/src/data/conference.json` so the two copies never drift.
- Theme FOUC-prevention inline script; route-level code splitting and
  `manualChunks` to shrink the initial bundle.
- Translated README and SITE_ANALYSIS prose to English.

## 2026-07-08 – 2026-07-10 — Initial dataset & viewer
- Added the CCF Chip 2026 agenda dataset and a self-designed JSON Schema
  (`conference → day → block → forum → talk`), validated by `source/validate.py`.
- Reverse-engineered the official site's jsonp APIs and built the crawl /
  extract / assemble pipeline (`source/*.py`).
- Visually parsed all 48 forum posters (`data/forums_detail/CF01–CF48.json`),
  ~340 speakers/chairs.
- Built the React + Vite web viewer: scheduler dashboard, timeline, speakers
  directory, committee and organizations pages, a line-icon set, avatars,
  per-talk "follow" personal agenda, and the Vercel/Geist visual system.
