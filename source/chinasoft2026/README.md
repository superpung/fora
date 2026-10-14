# ChinaSoft 2026 adapter

The snapshot follows the published navigation at
<https://chinasoft.ccf.org.cn/2026/>. Commented-out links are excluded: some
still name previous-year forums. Fetching fails on request errors and completes
all downloads before replacing the source snapshot.

Before every refresh, read [the gap and correction checklist](../../data/CHINASOFT2026_GAPS.md).
It includes unresolved source identities and a deliberate data-only R32
biography correction that must be reviewed after fetching.

```bash
uv run python source/chinasoft2026/fetch.py
# Inspect and apply the documented R32 snapshot correction before building.
uv run python source/chinasoft2026/fetch_photos.py
uv run python source/build_all.py
uv run python source/validate.py
uv run python -m unittest discover -s source/chinasoft2026
```

The overview supplies 64 forum/competition entries and 13 conference timetable
rows across November 5–8. The 27 linked detail pages supply 204 programme items
and 27 breaks. Conference meetings are retained separately from technical forums.
The homepage advertises November 6–8; the dataset includes November 5 check-in
as published in the overview and introduction, with the discrepancy flagged.

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

All 298 explicitly linked portrait URLs have been downloaded and decoded.
`fetch_photos.py` and `web/scripts/prepare-portraits.mjs` prepare 256px WebP
assets under `web/public/portraits/chinasoft2026/`; install web dependencies
before refreshing portraits. `raw/portraits.json` records original URLs,
original hashes, output hashes and dimensions. Offline builds verify every
local file. Forum profiles, chairs and committee cards supply the identity;
no image is assigned by filename or guessed across unrelated people. The
service worker caches portraits on demand instead of precaching every photo.

Unpublished programmes have `agenda_status: not_published`. C5/C6 final dates
come from their competition announcements. E6's date, room and window come
from its exact title in the overview. No guessed clock times or people are
assigned. The prototype-system announcement has no code and a different name
from C2. Its navigation link was withdrawn in the latest snapshot; the build
reads it only while published, without assuming either cancellation or C2 identity.

Source inconsistencies are retained in `flags` and `extra`: R1/E4/I4 talks
outlast their forum's printed window; R14/R23 have differing timetable/profile
titles; E2 has ambiguous hyphenated speaker credits. R14 now explicitly names
廖楠, so his profile is attached. Unmatched profiles remain separately visible
under `extra.unmatched_profiles`. Planned academician guests are stored
with their original tentative label, not treated as confirmed keynote speakers.

The viewer resolves one forum block per day. Its envelope covers all published
forum/talk times and places it in chronological order among other events.
Every forum keeps its own first-class `start`/`end`; explicit nulls keep C5/C6
clock times unknown. Original overview placeholders are preserved in
`extra.overview_rows`, avoiding duplicate visible sessions. E6 remains visible
even with no announced talks. Repeated committee roles are merged; differing
published rosters remain flagged, with both source lists retained.
Undated forums remain browsable under a pending-date section. Hosts, breaks
and expandable source notes are visible in forum details. Empty dated forums
remain valid followed agenda items before individual reports are announced.
Explicit `person.extra.identity_key` values separate unresolved same-name
source records; the viewer never infers identity from affiliation alone.

`enrichment.json` supplies 188 AI summaries/topic classifications, covering all
substantive reports and meaningful panels. They live only in `enrichment` and
respect the global AI switch. Each entry records its source title so an agenda
reordering cannot silently attach annotations to the wrong report. The 172
source abstracts remain separate and unchanged.

The source fingerprint covers every captured page and the portrait manifest;
builds perform no network requests and write identical dataset copies under
`data/` and `web/src/data/`. `cd web && pnpm test` checks eight report permalinks
and audits all published forum pages, portrait decoding, committees, all four
schedule days, pending forums, follows, topics, the AI switch and mobile routes.
The gap regression suite additionally checks undated inventory entries,
multi-paragraph abstracts, host/break display, source notes, identity separation,
legacy follows, and empty-forum calendar exports across conference datasets.
