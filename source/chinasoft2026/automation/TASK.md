# Authorized daily ChinaSoft 2026 curation

The user authorized daily source checks, faithful curation and data publication.
The cloud checker runs at 18:00 Asia/Shanghai; this existing local Codex job runs
at 18:10 with the existing login. Data-only changes are published independently
through Fora's API. General code changes require a PR; do not merge such a PR.

1. Read `AGENTS.md`, `data/CHINASOFT2026_GAPS.md`, the adapter README,
   `cloudflare/README.md` and the latest observation review. Use this run's
   isolated worktree. Do not spawn agents, alter the interactive checkout,
   reset user changes or force-push.
2. The runner supplies `FORA_PUBLISH_TOKEN` through the environment. Never print
   it. Run `uv run python source/check_published.py --restore-only`. This restores
   the published curated inputs and the latest/last-complete private snapshots
   into `.data-release/checks/`. Verify that the newest observation is from this
   daily check before reviewing it. If the cloud check is missing or stale,
   report the failure; do not claim that today's source was checked.
3. Review `manifest.json`, `report.json`, the archived HTML and patches against
   both the last complete observation and published input. Active 404/410 pages
   retain their previously imported content; incomplete checks never advance the
   successful baseline. Accessible changes may be imported after review while
   the report explicitly preserves incomplete-check status.
4. Apply source changes deterministically, including the known data-only role
   corrections. Review identities, biographies, timing, forum associations,
   portraits and enrichment. Allocate new report IDs in the identity registry;
   never reuse an existing ID for an unrelated replacement. No affiliation-based
   identity inference or invented people, dates, rooms or abstracts.
5. Rebuild and validate, run source tests, lint/build and relevant browser/clock
   regressions, and inspect desktop/mobile screenshots. Do not rebuild during
   browser tests. If there is no content change, report that without publishing
   another release. For general parser/schema/UI changes, create a code PR and
   wait for it to land before publishing data that depends on the new code.
6. Stage using `source/publish_data.py stage --base https://fora.repus.me
   --summary 'Concrete reviewed changes'`, with the same Python environment.
   Inspect the returned candidate URL, including links, favorites, portraits,
   live views and exports affected by the update. The public catalog is still
   unchanged. Update the gap document before staging so the archive retains it.
7. Promote using `source/publish_data.py promote --base https://fora.repus.me`.
   An ETag conflict requires restoring the new baseline and reviewing again;
   never force overwrite it. Verify the public catalog hashes and changed pages
   after promotion. No commit or PR is needed for curated data publication.
8. End with a concise Chinese report: check time, specific changed content,
   source errors/gaps, published release hash and preview/production validation.
   The runner saves this report locally. The cloud observation report remains
   in GitHub Actions and private R2. Do not send email, Slack or other messages.

Preserve failed evidence. A successful command exit alone does not prove a
source import or publication succeeded. Report the exact blocker and required
input instead of masking a failure or falling back to the old Git-based flow.
