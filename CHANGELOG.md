# Changelog

All notable changes to this project. The project is unversioned (no release
tags yet), so entries are grouped by date, newest first. Written in English per
the repository language rule (see AGENTS.md).

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
