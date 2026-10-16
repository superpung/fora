# ChinaSoft 2026 live clock audit

Audit date: 2026-10-14. Source data is unchanged by these fixes.

Rerun: **2026-10-15**, after importing five new programmes and updated portraits.
All 61 clock captures and assertions pass against the 247-item dataset; the
gallery and results are under `/tmp/chinasoft2026-oct15-live/`. An earlier run
was interrupted by local dataset rebuilding and was discarded; the successful
rerun used stable input. The added committee visibility fix is covered separately
by 400-member desktop/mobile fixtures and actual-source screenshots.

Rerun: **2026-10-16**, after importing nine more programmes (334 items total)
and the official E6-to-E7 numbering change. All 61 clock captures and assertions
pass; results and the gallery are under `/tmp/chinasoft2026-oct16-live/`.
The complete web suite also passes, including all 41 published forum pages,
429 portraits, mobile routes, source-gap checks and the revised E7 timed forum.
New-forum screenshots are under `/tmp/chinasoft2026-oct16-source/`.

## Method

Run `cd web && pnpm test`, or run `node tests/live-clock.mjs` independently.
`AUDIT_BASE_URL` selects an existing local server or deployed preview;
otherwise the test starts Vite. `LIVE_AUDIT_DIR` selects the screenshot directory
(default `/tmp/chinasoft2026-live-audit/after`). The directory contains PNGs,
`results.json`, and an `index.html` gallery. The tests use real Chromium rendering
with simulated browser dates, not screenshots of fabricated mock pages.
Captures scroll through each page to trigger entry animations, finish finite
animations, and assert that expanded reports and meeting rows are
opaque. The Netlify review toolbar is hidden only in captures, so it cannot
cover application content. Early captures taken during entry animations were
discarded and regenerated; no application workaround was needed.
Expanded touch cards are also captured at the actual mobile viewport: Chromium's
full-page capture can change hover emulation while resizing the page. Their full
metadata must fit before capture. Simulated performance clocks and native browser
animation clocks can diverge after a clock jump; finishing finite animations
avoids recording that instrumentation artifact.

Fixed clocks cover 22 moments from November 4 through November 9, including
check-in, morning/afternoon reports, a source tea break, reports running beyond
forum windows, opening/keynote sessions without individual report details,
E7 (formerly E6) before/during/after its window, banquet, committee meetings, closing, nightly
idle time and dates outside the conference. Expected active entries are derived
independently from the committed source dataset.

Page coverage includes the hub, conference home with expanded reports, live
view, full schedule, followed schedule board, My Day, forum detail, and reminder
settings. Desktop and mobile captures cover the normal reading surfaces; a
mobile dark-mode live view is included. Asia/Shanghai and America/Los_Angeles
browser zones exercise the same absolute instants. Timers are advanced without
reloads to check report changes, midnight updates, and the live navigation link
appearing/disappearing at the conference's first/last midnight. Reading filters remain
user-controlled; midnight updates the today indicator without replacing a
previously selected day.

## Reproduced defects and changes

| Defect | Resolution |
| --- | --- |
| Timed registration, opening, keynotes without reports, banquet, closing and committee blocks were absent from Now/Next. | Include published timed blocks and individual committee meetings; retain forum and keynote detail behavior. Highlight current block clocks in the full schedule. |
| A date-only competition displaced an actually running or upcoming followed item and rendered an empty start label. | Prefer timed follows; use the normal pending-time state when only untimed follows remain. |
| Device-local wall clocks shifted live states, day badges, hub status, live navigation and reminders outside the venue timezone. | Use the conference timezone consistently, including the lightweight manifest and older reminder caches. Refresh live navigation across midnight without reloading. Reuse the timezone conversion in calendar exports. |
| Live report cards omitted complete speaker lists and report end times. | Display title, all named speakers, room and published clock range; show source breaks when no report is active. |
| My Day suggested moving from an item whose time or origin room was unknown. | Infer a move only when both clocks and the previous room are known. |
| Enabling reminders inside the lead window still announced the configured lead duration. | Calculate the actual minutes remaining; retain deduplication and suppress already-started reports. |

## Validation result

All existing browser suites, the 11 source regression checks, four-dataset
schema/person/clock validation, lint, production build and deterministic rebuild
passed. The clock suite captures 61 screenshots. Each affected page type was
visually reviewed on desktop and mobile; assertions independently check current
entries, highlights, clock updates, absence of page overflow and runtime errors.

## Notification scope

Notification API calls are intercepted in the test browser. The real reminder
provider, storage, opt-in settings, timer callbacks, late activation, reload
suppression, disabled state, date-only exclusion and optional day-start reminders
are exercised. No real operating-system notification is sent. Closed-browser
OS delivery and platform-specific notification triggers require a device test;
this browser audit does not claim to verify them.

The screenshots are review artifacts, not a claim that unpublished official
programmes have become available. Continue using
[the source-gap checklist](CHINASOFT2026_GAPS.md) for data refreshes.
