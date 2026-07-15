# Changelog

All notable changes to this project. The project is unversioned (no release
tags yet), so entries are grouped by date, newest first. Written in English per
the repository language rule (see AGENTS.md).

## 2026-07-16 — Poster redesign: full content, QR, Geist styling

### Changed
- **Share posters redesigned to the app's own Geist visual language** and made
  self-contained. A clean light layout (no dark band), near-black type, a monospace
  face for codes/times/dates, thin line icons (the same feather glyphs as the UI,
  drawn on canvas), and a single restrained blue accent — replacing the earlier
  gradient/glow look.
- **Forum poster stands alone as a summary:** a light header (accent tick +
  conference name + date · location — the venue name moved down into the 地点/room
  line); the forum **category** (tag-icon chip) left of the code; icon-tagged meta;
  and **every talk** in a two-column grid — a fixed left column (number over time)
  beside the title + speakers. Section labels are quiet (small, grey, no underline);
  a speaker's affiliation sits baseline-aligned with the name (not top-aligned).
- **Talk poster mirrors it:** category chip, icon-tagged time/room/forum, all
  speakers with affiliations, and the **full abstract**. Titles wrap with kinsoku so
  a bracket never drops alone.
- **A QR to the page replaces the footer URL/brand text** — bottom-right, encoding
  the forum/talk permalink so a scan opens it. The poster height is variable, so a
  long forum/abstract just makes the card taller (the preview modal scrolls).

### Added
- **Offline QR + canvas icon set.** `lib/qr.ts` wraps `qrcode-generator` (pure JS,
  no transitive deps, runs entirely client-side) into a boolean module matrix the
  renderer paints as crisp squares; `lib/poster-icons.ts` renders the app's line
  icons onto canvas. New dependency: `qrcode-generator`.

## 2026-07-15 — Share posters, mobile timeline, follow filter, PC roster

### Added
- **Share posters for a forum and for each report.** A "论坛海报" button in the
  forum header and a poster button on every report's top-right open a modal that
  renders a portrait share card (conference · forum/report · time/room/category ·
  chairs/speakers · link) to a `<canvas>` and saves it as PNG. Fully offline — no
  new dependency, drawn with the 2D API — and always light-on-white so it reads
  the same wherever it's shared, in either app theme.
- **Timeline "我的关注" filter.** A toggle on the timeline keeps only followed
  rooms/reports; rooms (columns) with nothing followed are dropped, and non-forum
  blocks are hidden while filtering — parity with the dashboard's follow filter.
- **Touch tap-to-expand on the timeline.** On a coarse pointer (no hover), tapping
  a compressed card expands it in place with an explicit enter button, instead of
  navigating away on the first tap; desktop keeps the hover reveal. (Mobile-only —
  desktop behaviour is unchanged.)
- **ccfchip2026 full program committee (130 members).** The roster lived only as
  prose in the fetched raw (the people template carried just its 4 chairs); it's
  now parsed into a real `程序委员会` committee group, placed after 程序委员会主席.
  The add-conference skill gained an "extraction completeness" check so this class
  of silent drop (fetched but never structured) is caught.

### Fixed
- **Timeline hover expand/collapse jank reduced.** The animated `box-shadow` (a
  blurred-shadow repaint every frame) is now snapped instead of transitioned, the
  bottom fade eases via opacity rather than a `display` flip that popped at the
  end of the collapse, and the raised z-index outlasts the height animation so the
  last frame can't be overpainted.
- **Forum reports now show their time** in the dashboard's expanded forum rows.
- **Forum category chip** now matches the surrounding meta (12.5px + a tag icon)
  instead of the smaller, icon-less muted text it was.

## 2026-07-15 — i18n (zh/en) with localStorage, same URL for every language

### Added
- **Bilingual UI (中文 / English) with a language toggle in the nav & hub.** A
  lightweight custom i18n (`i18n-store` + `I18nProvider` + a `t()` with `{var}`
  interpolation) — no dependency, matching the existing theme/follow stores. The
  choice persists to `localStorage` (`cs-lang`) and defaults from
  `navigator.language`; the URL never changes (every language shares one URL), so
  it's state-based i18n, not path/subdomain-based. Dates and structural labels
  (weekday, period, block kind, org role, speaker category) are locale-aware.
- Only UI chrome is translated. Conference **content** (forum titles, speaker
  names, affiliations, bios, descriptions) comes from the dataset, which is
  Chinese-only, so it renders as-is in both languages (the English name is used
  where the dataset provides one, e.g. the conference switcher and browser title).

## 2026-07-15 — Timeline collapse no longer snaps + bottom fade seam closed

### Fixed
- **Timeline card collapse no longer snaps behind the next card.** On un-hover the
  card's z-index dropped to base instantly while it was still tall, so the next
  (opaque) card painted over its lower half — a visible jump. The base z-index is
  now numeric (0) and its change is delayed by the animation duration, so the card
  stays raised (z 5) for the whole collapse and only drops once it has shrunk.
- **Short cells no longer leak text through a bottom seam.** The bottom fade sat
  at `bottom: 1px` (leaving a 1px uncovered strip — a bright seam in dark mode)
  and `left: 12px` (the first character uncovered), and was too gentle to hide an
  overflowing line. It now reaches the very bottom (`bottom: 0`), starts near the
  left edge (`left: 4px`), and turns solid earlier (gradient solid from 60%), so
  an overflowing title fades to a faint ghost instead of a readable strip.

## 2026-07-15 — David Lo bio restored + dashboard forum-row meta on line 2

### Fixed
- **S8 chair David Lo lost his bio in the earlier merge.** The split fragment
  that was deleted ("David" / "Lo 教授") was the row that actually carried the
  343-char bio; the kept "David Lo" row had none. Recovered the bio and attached
  it to the merged entry.

### Changed
- **Dashboard forum-row meta moved onto the metadata line.** The report count
  ("N 报告" / "详情待补") and sponsor (企业信息) were pinned to the far-right actions
  cluster; they now sit inline on the second line, to the right of room ·
  category. The right cluster keeps just the star / enter / caret buttons.
- **Evened out the forum row's three-line spacing.** The speaker line carried an
  extra `margin-top: 8px` on top of the body's 3px gap, so line 2→3 was ~11px vs
  line 1→2 at 3px (the gap you flagged). Removed the extra margin and set a
  uniform 5px rhythm across all three lines.

### Fixed
- **Timeline card hover no longer jumps on grow/shrink.** The hover flipped
  `overflow` to `visible`, so the full text painted instantly — appearing before
  the box finished growing, and snapping away when the box shrank back. Overflow
  now stays `hidden`, so the content is revealed/clipped in step with the height
  animation (both directions smooth).

### Changed
- **Timeline card accent bar extended to the corner radius.** Its top/bottom
  inset now equals the card's corner radius, so the straight strip spans the full
  straight edge (reaching the point where the corner curve begins) without
  following the curve; its own pill-rounded ends are unchanged.

## 2026-07-15 — Deep-link scroll precision, bio-collapse fix, chair data cleanup

### Fixed
- **Deep-link (copy-permalink → refresh) now scrolls precisely to the talk.**
  `scrollIntoView` reads the element's *transformed* box, and the page's enter
  animation (container + per-row translateY easing to 0) meant it landed short.
  It now scrolls to the element's untransformed layout top (summed `offsetTop`)
  minus the sticky-nav height — drift measured at 0px.
- **Person bio collapse no longer stutters at the end.** The bio kept a static
  `margin-top: 8px` that wasn't animated, so when the height reached 0 the 8px
  gap lingered then snapped away on unmount. `marginTop` is now animated together
  with the height.
- **S8 (and P4) chair affiliations were wrapped in literal brackets** ("[浙江大学]")
  — an extraction artifact. Stripped a single wrapping bracket pair from all 7
  affected affiliations.
- **S8 chair "David Lo" was split into two rows** — a proper "David Lo · 新加坡管理
  大学" plus a corrupt fragment "David" with title "Lo 教授". Merged into one
  (title "教授"). A sweep of both conferences found no other split of this shape
  ("肖然 · Thoughtworks 中国区总经理" is a legitimate title, left as-is).

### Fixed
- **Document title was stuck at "CCF Chip 2026 · 大会议程".** It was hardcoded in
  index.html and never updated. A central `DocumentTitle` (inside the conference
  provider) now sets it from the active conference + page, e.g. "完整日程 · 2025
  CCF中国软件大会 · 会议日程", a forum's own name for `/forum/:code`, and the plain
  site name "会议日程" on the hub.
- **Timeline card hover now animates its expand/shrink, not just the colours.**
  The card grew to full content instantly because CSS can't transition to
  `height: auto`; enabling `interpolate-size: allow-keywords` and adding `height`
  to the transition makes the growth ease in/out like everything else.
- **Card hover speed retuned.** The previous 0.3s felt sluggish; all hover
  transitions (hub card + timeline card, background + height) are now 0.22s
  ease-in-out.

### Changed
- **Co-author entries: only the star toggles following.** The whole chip used to
  be a button; now the avatar + name are plain text and just the trailing star
  button follows/unfollows, matching the full PersonLine rows.

## 2026-07-15 — Parallel-room forums + borderless co-authors + hover/fade polish

### Fixed
- **Parallel-room forums now split into one timeline per room.** A forum whose
  `room` names several rooms (e.g. U1 "一楼楚悟厅V15 、 二楼荆南厅V27") stores
  both rooms' agendas as one flat `talks[]` with the second room appended (its
  clock resets to the morning). The flat list rendered as a single timeline whose
  time ran forward then jumped back — clearly wrong. It's now split at each
  backward time jump into one labelled track per room, on both the ForumDetail
  page (a headed sub-timeline per room) and the Schedule grid (one column per
  room). The split only triggers when the reset-count matches the room-count, so
  single-room multi-day competition schedules (C5, C3) keep their single
  continuous timeline.
- **Timeline cell bottom-fade no longer dims the left accent bar.** The overflow
  fade started at the cell's left edge and washed over the accent strip; it now
  insets past the bar so the accent stays solid.
- **Timeline card hover is slower and eased.** The hover transition was fast and
  linear-feeling; it now uses a gentler, longer ease-in-out (matching the hub
  card), so it no longer snaps the instant the cursor lands.

### Changed
- **Multi-author talks drop the pill outline.** The compact co-author chips were
  boxed in bordered pills; they're now borderless (avatar + name + muted follow
  star) to match the page's flat, frameless design.

## 2026-07-15 — Timeline hover/crop fixes + compact talk co-authors

### Fixed
- **Timeline talk cells no longer drop content or mid-title-ellipsis.** The old
  height tiers clamped titles to 1 line and hid the speaker on short slots,
  producing an ellipsis even when the slot could show more. Each cell now renders
  its full time + title + speaker and simply shows as much as fits, fading the
  overflow out at the bottom (no ellipsis, no dropped fields). Hovering reveals
  the complete content.
- **Hovered (expanded) timeline card now tucks under the sticky time gutter and
  column headers** instead of sliding over them (raised the gutter/header
  z-index above the hovered card).
- **Two-line forum names in the timeline column headers were clipped** — the
  header was too short. Raised its height so a room line + a two-line title show
  in full.
- **Calmer, consistent card hover.** The timeline talk hover and the hub
  conference-card hover were too fast with a heavy drop shadow (and the hub card
  also lifted). Both now use a gentle, matching transition and a light shadow,
  with no transform.

### Changed
- **Multi-author talks render as a compact chip row.** Paper co-authors (name
  only) previously each took a full keynote-style PersonLine (big avatar +
  affiliation + bio toggle), so a 6-author paper filled the screen. Bare names
  now collapse into a horizontal, wrapping row of pill chips (colored letter
  avatar + name + follow star); speakers that carry real detail
  (affiliation/bio/title) still get the full card.

## 2026-07-15 — Committee-fetch fix + highlight/animation/icon polish

### Fixed
- **ChinaSoft committee page was empty; now populated (17 groups, 281 members).**
  The intro page is a mini-SPA whose nav lazy-loads committee sub-pages via
  `loadIntroPage('committee-*')` (`./pages/intro/<page>.html`); `fetch.py` only
  saved the landing prose. It now follows the intro nav and fetches every
  committee sub-page, and `build.py` parses them (two page layouts: role-sectioned
  name grids, and flat `name [unit]` lists with affiliations) into the schema
  `committees`. Bare sub-roles (荣誉主席/主席/委员) are prefixed with the committee
  name for context. The add-conference skill gained a recon rule to enumerate all
  nav sections and cross-check the schema's top-level arrays so this class of
  silent omission is caught.
- **Timeline anchor highlight** now spans the whole row (time + rail + card),
  instead of only the card right of the rail line.

### Changed
- **Talk abstract expand/collapse is animated** (house easing), consistent with
  the bio / talk-sublist expansions.
- Removed the dashboard **sponsor-session filter** (`赞助专场`) and its code.
- Replaced the CCF-Chip-specific `chip` brand glyph with a generic `conference`
  icon on the hub cards and conference switcher.

## 2026-07-15 — Timeline card accents + hover-expand + forum-row reorder

### Added
- **Inset accent bar on timeline talk cards**: a short vertical strip on the left
  that stops clear of the rounded corners (not the forbidden full-edge bar — see
  the refined AGENTS.md rule).
- **Hover-expand on compressed timeline cards**: a short talk whose content was
  clamped/hidden now grows to its full title + speaker on hover, floating over
  the row below.

### Changed
- **Dashboard forum row reordered** to `code + title` / `room · category` /
  speakers (was `room · code · category` above the title). The title is now the
  prominent top line and metadata sits below it, per the AGENTS.md heading rule.

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
