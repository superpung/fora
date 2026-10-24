# Official-source check history

Run from the repository root:

```bash
uv run python source/chinasoft2026/check_updates.py
```

Each UTC timestamp directory is an independent observation, not an upstream
publication date. Keep these artifacts in version control with the checker.
Daily host maintenance runs at 18:00 Asia/Shanghai; see [automation](../automation/README.md).
`--output PATH` selects a different history root.

- `html.tar.gz`: exact response bytes of active HTML pages and directly checked
  withdrawn pages under `withdrawn/`. Reading the archive requires no extraction.
- `manifest.json`: observation times, status, URLs, HTTP metadata, byte counts,
  SHA-256 hashes and archive integrity hash. The last complete observation is
  the next check's baseline. Failed attempts remain visible and never advance it.
- `report.json`: added/changed/removed pages and portrait references, both since
  the previous complete check and versus the current curated importer input.
  Pending imports therefore remain visible even after a second unchanged check.
- `since-previous.patch` and `versus-curated.patch`: exact HTML line differences.
- `curated-html.tar.gz` and `curated-manifest.json`: the exact local comparison
  input and original portrait hashes. The Git revision is recorded separately;
  the archive preserves the actual files even when the worktree is dirty.
- `REVIEW.md`, when present: human-reviewed interpretation of the raw differences.

The first check compares against curated input, not a historical pristine crawl.
In particular, R32's four deliberately removed role paragraphs must not be
misreported as a newly published upstream change. Subsequent checks compare
original source against original source. Archives never apply those edits.

Coverage follows active `loadPage`, `loadIntroPage` and `loadAgenda` handlers,
including registration, hotel and transport pages. HTML comments are excluded.
Unlike the importer, the checker includes `callforpaper` and `history`; their
first observed presence establishes coverage and does not prove recent publication.
It also continues checking previously withdrawn page URLs. A missing navigation
link does not establish cancellation, and missing references do not imply that
image files have been deleted from the server.

Portrait URLs use the same explicit person-card selectors as the photo importer.
Every active portrait is downloaded to compute its content hash, detecting a
replacement at an unchanged URL. Original image bytes are not archived here;
the imported WebP assets remain in the repository. CSS, JavaScript, other images,
attachments and external linked sites are outside this check's coverage.

Confirmed HTTP 404/410 portrait responses are recorded in `broken_portraits`
as source defects; they have no invented content hash. A complete check can
therefore include explicitly reported broken source references. Transport errors
are retried twice with visible diagnostics; exhausted retries, server errors or
unexpected response types fail the run. A failed run is not a "no changes" result.

First complete observation:
[2026-10-15 review](20261015T055445155743Z/REVIEW.md).

Latest complete observation: [2026-10-21 morning review](20261021T020913151864Z/REVIEW.md).

Previous reviewed accessible-content import:
[October 21 evening](20261021T124314880733Z/REVIEW.md). Its committee-meeting
index is HTTP 404, so the check is incomplete and the last complete baseline
remains the October 21 morning observation. The checker now records confirmed
active-page 404/410 responses in `broken_pages`, finishes accessible HTML and
portrait evidence, writes the report/archive, then exits unsuccessfully. Missing
HTML is never represented as deleted content in patches. Transport/server errors
still fail; no incomplete observation advances the comparison baseline.

Latest reviewed accessible-content import:
[October 22 daily check](20261022T100053520657Z/REVIEW.md). Twelve accessible
pages changed since the October 21 evening import; six portrait URLs are new.
The same committee-meeting index remains HTTP 404, so this observation is also
incomplete and does not advance the October 21 morning complete baseline.

Previous observation: [October 22, 23:03–23:04](20261022T150357302340Z/REVIEW.md).
All accessible HTML and portrait hashes match the daily observation. Its import
was recovered and validated interactively after the scheduled CLI exhausted its
usage allowance before pushing; the failed run's evidence remains available.

Previous observation: [October 23, 14:52–14:53](20261023T065259587808Z/REVIEW.md).
All 94 accessible pages and 555 portrait fingerprints match the October 22
evening observation. The same committee-meeting index remains HTTP 404. No
import changes are needed; this incomplete check does not advance the baseline.

Latest observation: [October 24, 15:42](20261024T074205242195Z/REVIEW.md).
Four new forum programmes, two timed C4 stages, one R30 report replacement and
nine committee members are imported. One HTML reference is new and 15 pages
changed. There are 596 portrait references, including eight new HTTP 404 images;
588 accessible portraits are prepared. The committee-meeting index remains
HTTP 404; the check is incomplete and does not advance the complete baseline.
