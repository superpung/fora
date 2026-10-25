# ChinaSoft 2026 adapter

The snapshot follows the published navigation at
<https://chinasoft.ccf.org.cn/2026/>. Commented-out links are excluded: some
still name previous-year forums. Fetching fails on request errors and completes
all downloads before replacing the source snapshot.

Before every refresh, read [the gap and correction checklist](../../data/CHINASOFT2026_GAPS.md).
It includes unresolved source identities and a deliberate data-only R32
biography correction that must be reviewed after fetching.

For a read-only update check, run:

```bash
uv run python source/chinasoft2026/check_updates.py
```

This saves timestamped original-source archives and comparisons under
[`checks/`](checks/README.md), without overwriting `raw/`, portraits, enrichment
or generated datasets. Review those changes before running the import below.

```bash
uv run python source/chinasoft2026/fetch.py
# Inspect and apply the documented R32 snapshot correction before building.
uv run python source/chinasoft2026/fetch_photos.py
uv run python source/build_all.py
uv run python source/validate.py
uv run python -m unittest discover -s source/chinasoft2026
```

The overview supplies 66 forum/competition entries and 13 conference timetable
rows across November 5–8. The 56 linked published programmes (including restored R16) supply
454 programme items and 60 breaks. Conference meetings are retained separately from technical forums.
The homepage advertises November 6–8; the dataset includes November 5 check-in
as published in the overview and introduction, as a normal schedule event.

Programme rows determine titles, times and speaker credits. Profile cards add
abstracts and biographies using normalized person identities. Opening remarks,
panels and closing remarks remain programme items. Rowspans preserve hosts;
affiliation slashes do not split people. The adapter reuses the 2025 adapter's
pure chair and committee-list parsers, without changing its configuration.
Whitespace separates a name from its affiliation unless every token is an
independently named person on that page. A profile card always describes one
person, including punctuation inside their titles. Short company names and
honorifics are rejected as standalone people by the shared person gate.

Locations separate the shared hotel from floor/room labels. Forum rooms and
overview block locations omit the known venue prefixes, while `extra.location_raw`
retains the full source wording. The conference venue remains available for
the page header, calendar exports and standalone share posters.

All 596 available portrait URLs have been downloaded and decoded. The October 21
check replaces two P3/R19 speaker portraits; seven formerly retained-only R16
resources are active again. All previously recovered P3/I3/S1 images remain
available. All eight I8 portrait URLs recover on October 25 and their explicit tags are
restored. The volunteer committee image for 徐英帅 changes at its existing URL.
No broken portrait references remain; the committee-meeting HTML index still
returns HTTP 404 and does not advance the complete-check baseline.
`fetch_photos.py` and `web/scripts/prepare-portraits.mjs` prepare 256px WebP
assets under `web/public/portraits/chinasoft2026/`; install web dependencies
before refreshing portraits. `raw/portraits.json` records original URLs,
original hashes, output hashes and dimensions. Offline builds verify every
local file. Forum profiles, chairs and committee cards supply the identity;
no image is assigned by filename or guessed across unrelated people. The
service worker caches portraits on demand instead of precaching every photo.

Unpublished programmes have `agenda_status: not_published`. Five linked pages
still contain only a pending-content notice after the October 24 update.
The adapter recognizes that template without inventing a programme. E2 now
publishes its correct code; its old mismatched placeholder association remains
in resolved curation history without a displayed warning.
The overview's four mislabeled table-header cells are corrected directly in
curated HTML; original bytes remain in the observation archive. C5/C2 final dates
come from their competition announcements. E6's date, room and window come
from its title in the overview, allowing the optional 论坛 suffix. No guessed clock times or people are
assigned. The October 20 overview shifts education codes E2–E7 to E1–E6;
the old E1 is now closed meeting M5. Current official codes are retained.
C1 has provisional date-only sessions on November 7–8; its period labels remain
in the description. C4 now has a November 7 timed final and November 8 timed defense in one room,
represented as two sessions without invented team slots. The older code-less prototype
announcement remains withdrawn; no unpublished schedule is inferred from it.

Source inconsistencies are retained in `flags` and `extra`: R1/E3/I4 talks
outlast their forum's printed window; R14 has differing timetable/profile
titles; E1 has ambiguous hyphenated speaker credits. R14 now explicitly names
廖楠, so his profile is attached. Unmatched profiles remain separately visible
under `extra.unmatched_profiles`. Planned academician guests are stored
with their original tentative label, not treated as confirmed keynote speakers.

The viewer resolves one forum block per day. Its envelope covers all published
forum/talk times and places it in chronological order among other events.
Every forum keeps its own first-class `start`/`end`; explicit nulls keep C5/C2
clock times unknown. Original overview placeholders are preserved in
`extra.overview_rows`, avoiding duplicate visible sessions. E6 remains visible
even with no announced talks. Repeated committee roles are merged; differing
published rosters remain flagged, with both source lists retained.
Undated forums remain browsable under a pending-date section. Hosts, breaks
and expandable source notes are visible in forum details. Empty dated forums
remain valid followed agenda items before individual reports are announced.
Explicit `person.extra.identity_key` values separate distinct same-name
source records; the viewer never infers identity from affiliation alone.

`enrichment.json` supplies 415 AI summaries/topic classifications, covering all
substantive reports and meaningful panels. They live only in `enrichment` and
respect the global AI switch. Each entry records its source title so an agenda
reordering cannot silently attach annotations to the wrong report. The 378 attached
source abstracts remain separate and unchanged.

The source fingerprint covers every captured page, the portrait manifest and
reviewed curation/notes;
builds perform no network requests and write identical dataset copies under
`data/` and `web/src/data/`. `cd web && pnpm test` checks eight report permalinks
and audits all published forum pages, portrait decoding, committees, all four
schedule days, pending forums, follows, topics, the AI switch and mobile routes.
The gap regression suite additionally checks undated inventory entries,
multi-paragraph abstracts, host/break display, source notes, identity separation,
legacy follows, and empty-forum calendar exports across conference datasets.

The new flat programme-committee grid supplies 195 members, with all affiliations now published. Same-name profiles within a forum are matched by their
explicit report titles. `curation.json` records guarded forum-code and person
associations and retained pages; it preserves the two known 李佳 identities
across R7 and their original P4/R4 appearances without changing follow keys.

The reviewed note cleanup is stored in `note_review.json`: exact non-substantive
messages are removed from generated data, leaving nine substantive notes. Exact reviewed
text is matched so future changed discrepancies still need review. Pending
committee rosters and collective credits remain normal content; committee flags
are scoped to their own group. See the applied inventory in
[`data/CHINASOFT2026_GAPS.md`](../../data/CHINASOFT2026_GAPS.md).

The October 18 R2 programme spans November 6–7. Per-day `sessions` record
programme envelopes, and each report/break has an explicit `day_date`. Daily
boards project that one forum without renumbering its canonical report list.
R8 swaps two reports; their guarded enrichment moves with their source titles.
S1 has eight source titles but no published abstracts; its summaries are derived
from titles only. See the gap checklist for recovered and still-broken portraits.

The October 19 refresh adds R19 with five reports/abstracts and eight portraits.
The three missing programme-committee affiliations are supplied. Five committee
roles use the newer dedicated-page label 负责人; curated overview headings
are reconciled directly in data. E3's biography field now contains report prose
and carries a guarded source note. See the latest review and gap checklist.

The October 20 refresh adds R29/S4 (nineteen programme items and eighteen
abstracts), competition announcements, the education-code changes, updated
R23/P4 report content and restored portraits. The adapter recognizes the source's
new dinner wording and forum-suffix variations; no shared application code is
changed. See the latest review for exact changes and provisional competition dates.

The October 21 evening import adds R34/E2/I5/S3 (34 programme items, four
breaks, 19 abstracts, 32 portraits) and C3's timed final with its source room
conflict. There are now 52 published programmes, 429 items and 549 portraits.
The new committee-meeting index is unavailable; the check is recorded as
incomplete without advancing the successful baseline. Explicit moderator cards
now attach to hosts, and reviewed collective credits are excluded before person
parsing. One-off table typography is corrected only in curated HTML.

The October 22 daily import adds 32 local organizing committee members and six
local advisory members with portraits. All advisory affiliations are now explicit.
The adapter reads flat grids per section and card units, with independent
regressions for mixed card/grid sections. S2's two timetable titles now match
their profiles; their conflict notes are removed and guarded enrichment updated.
R8 changes one organizer affiliation and profile-card order without changing its
programme. Counts remain 52 programmes and 429 items, with 555 portraits and nine
substantive notes. The committee-meeting index remains HTTP 404; the observation
is incomplete and the last complete baseline remains October 21 morning.

[Daily host automation](automation/README.md) runs at 18:00 Asia/Shanghai using
isolated worktrees and branches, preserves snapshots, updates the open PR, and
saves a Chinese report. No merge or release is automated.

The October 24 refresh adds R9/R35/E5/I8 (25 programme items, three breaks,
20 abstracts), C4's two timed stages and seven organizers, nine committee
members, a R30 speaker/report replacement, and a P3 wording correction.
R9 changes its name in both official inventory and detail. The adapter now
matches an explicitly unnamed profile by its reviewed role credit and normalized
report title; it retains the abstract without inventing a person. An independent
fixture rejects mismatched titles. No shared web application code changes.

The October 25 refresh restores eight I8 portraits, replaces 徐英帅's portrait,
and moves 王劲松 earlier in the unchanged advisory roster. The official committee
overview now uses the five previously curated 负责人 labels, resolving that
data-only correction. Programmes and enrichment are unchanged.
