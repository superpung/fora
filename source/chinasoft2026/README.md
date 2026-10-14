# ChinaSoft 2026 adapter

The snapshot follows the published navigation at
<https://chinasoft.ccf.org.cn/2026/>. Commented-out links are excluded: some
still name previous-year forums. Fetching fails on request errors and completes
all downloads before replacing the source snapshot.

```bash
uv run python source/chinasoft2026/fetch.py
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

Unpublished programmes have `agenda_status: not_published`. C5/C6 final dates
come from their competition announcements. E6's date, room and window come
from its exact title in the overview. No guessed clock times or people are
assigned. The prototype-system announcement has no code and a different name
from C2; it is preserved in `extra.announcements` rather than silently matched.

Source inconsistencies are retained in `flags` and `extra`: R1/E4/I4 talks
outlast their forum's printed window; R14's pending speaker conflicts with a
named profile; E2 has ambiguous hyphenated speaker credits. Unmatched profiles
remain under `extra.unmatched_profiles`. Planned academician guests are stored
with their original tentative label, not treated as confirmed keynote speakers.

The viewer resolves one forum block per day, so dated forum references share
one unbounded block. All original overview windows remain separate blocks.
The source fingerprint covers every captured page; builds perform no network
requests and write identical dataset copies under `data/` and `web/src/data/`.
