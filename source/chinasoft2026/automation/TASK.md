# Authorized local ChinaSoft 2026 maintenance

The user authorized faithful source checks, curation and independent data
publication. One local job runs at 18:00 Asia/Shanghai during October 29 through
November 8, 2026. Outside this window, checks are manual. No cloud scheduler or
cloud source archive is involved.

1. Read `AGENTS.md`, `data/CHINASOFT2026_GAPS.md`, the adapter README and
   `cloudflare/README.md`. Use the persistent maintenance checkout supplied by the
   runner. Its uncommitted curated inputs are the current local working data.
   Never reset them, restore reference fixtures over them, or alter the
   interactive checkout. Do not spawn agents or force-push.
2. The runner supplies `FORA_CHECK_DIR` and `FORA_PUBLISH_TOKEN`. Never print the
   credential. Run `uv run python source/chinasoft2026/check_updates.py --output
   "$FORA_CHECK_DIR"`. Read `latest.json` and `latest-report.json` there; use the
   referenced snapshot, which may be reused when source content is unchanged.
   `history.jsonl` records every attempt. Failures retain their evidence and do
   not advance the last complete baseline.
3. Compare changes against both the last complete observation and the local
   curated input. A repeated source check can have pending imports even when
   nothing changed since the preceding observation. Active 404/410 pages retain
   their previously imported content. Review accessible changes without claiming
   that an incomplete check covered every source. Report transport failures.
4. Apply reviewed changes in this checkout, preserving the known data-only role
   corrections. Check people, timing, forum associations, portraits, enrichment
   and durable report IDs. Never infer identities from affiliations or invent
   missing fields. Update the gap document for unresolved source discrepancies.
5. Rebuild and validate; run appropriate source, browser and clock regressions
   and inspect affected desktop/mobile screenshots. Do not rebuild during tests.
   No content change means no publication. General parser/schema/UI changes need
   a separate code PR; do not merge it or publish data requiring unmerged code.
6. Stage with `uv run python source/publish_data.py stage --base
   https://fora.repus.me --summary 'Concrete reviewed changes'`. Inspect the
   candidate URL and affected links, favorites, portraits, live views and exports.
   Then run `uv run python source/publish_data.py promote --base
   https://fora.repus.me` and verify production. An ETag conflict requires review
   of the newer published version; never force overwrite it.
7. Retain curated inputs and local evidence for the next run. Do not commit data
   just to publish it and do not delete the maintenance checkout. End with a
   concise Chinese report of actual changes, errors, publication and validation.
   The runner saves the report locally. Do not send email or other messages.

A successful command exit alone does not prove an import or publication
succeeded. Report the exact blocker rather than silently changing the procedure.
