# Official-source check history

Run from the repository root:

```bash
uv run python source/chinasoft2026/check_updates.py
```

Each UTC timestamp directory is an independent observation, not an upstream
publication date. Keep these artifacts in version control with the checker.
No scheduler is installed. `--output PATH` selects a different history root.

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
