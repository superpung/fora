# Cloudflare deployment and independent data publishing

Fora runs in the **SUPER** account (`efdf4a505a7f4ca9be62bee7957c7e19`).
All resources below belong exclusively to Fora. Never change account defaults,
other Workers, shared routing rules, or the nameservers of `repus.me`.

| Resource | Purpose |
| --- | --- |
| `fora` Worker | Static application, GitHub OAuth, sessions, sync and publishing |
| `fora-users` D1 | User identities, hashed sessions and revisioned agenda bundles |
| `fora-public` R2 | Immutable datasets, portraits and release manifests |
| `fora-private` R2 | Curated inputs and original source observations |
| `fora.repus.me` | Application and same-origin API |
| `fora-data.repus.me` | Public R2 data, with GET/HEAD CORS |

The deployed source is `cloudflare/wrangler.jsonc`. Credentials are outside the
repository. The local operator token is in
`/root/.config/fora/cloudflare-gmail.env`; the publisher credential is in
`/root/.config/fora/worker-secrets.json`. Both are mode 0600. CI receives only
its named secrets. Never print credentials or pass secret values as CLI arguments.

## Application

```sh
uv run python source/build_all.py
uv run python source/validate.py
pnpm --dir web install --frozen-lockfile
pnpm --dir web lint
pnpm --dir web test:cloudflare
VITE_DATA_BASE_URL=https://fora-data.repus.me pnpm --dir web build
cd web
pnpm exec wrangler d1 migrations apply fora-users --remote --config ../cloudflare/wrangler.jsonc
pnpm exec wrangler deploy --config ../cloudflare/wrangler.jsonc
```

Set `CLOUDFLARE_API_TOKEN` in the process environment. The account ID is fixed
in the configuration. The frontend build must use the data origin above;
local Vite development uses generated `/data/` assets. `.assetsignore` excludes
those local fixtures and portraits from Cloudflare's application upload.

Secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `PUBLISH_TOKEN`, and
`MAINTENANCE_TOKEN` (GitHub workflow dispatch). GitHub OAuth returns to
`https://fora.repus.me/`. The Worker requests `read:user`, fetches the identity,
and discards the GitHub access token. A hashed, random, expiring HttpOnly session
identifies subsequent calls. Preview origins disable login. No Gist backend or
Gist import flow remains; existing JSON backup/import handles user-controlled
transfers. Device-local follows remain usable without signing in.

All sync writes compare a D1 revision atomically. Clients merge changes against
their last common state and retry a stale revision. Preference conflicts and
account changes require an explicit choice. A failed sync retains local edits.
Both `/api/` and root OAuth callback navigations bypass the service worker.

## Conference data

Committed datasets are reproducible reference fixtures, not the live publication
pointer. The deployed application fetches a versioned catalog and verifies each
immutable dataset's SHA-256 before building its views. Validated visited data is
cached for offline use. HTTP/schema/integrity errors remain errors; they do not
silently select an older release. Offline cached catalogs are marked in the UI.

Report IDs are allocated in `source/identities/<conference>.json` and are never
reassigned after an insertion, removal or reorder. The number in `R1#0` is a
permanent identity, not an array offset. Enrichment, follows, anchors, search,
reminders and exports use that same identity. New or ambiguous reports stop the
build until the registry is reviewed. A title edit can add a reviewed selector to
its existing identity; an unrelated replacement must receive a new identity.

Data publishing requires no code PR:

```sh
# FORA_PUBLISH_TOKEN is provided through the environment.
uv run python source/publish_data.py restore --base https://fora.repus.me
# Review and update curated inputs, identities, portraits and enrichment.
# Run rebuild, validation, relevant tests and screenshot review.
uv run python source/publish_data.py stage --base https://fora.repus.me --summary 'Concrete reviewed changes'
# Inspect the printed ?dataVersion=... candidate URL on desktop and mobile.
uv run python source/publish_data.py promote --base https://fora.repus.me
```

Staging uploads immutable objects plus a private source archive. It does not
change the public catalog. Promotion checks referenced objects and atomically
replaces the catalog only if its ETag still matches the reviewed baseline.
Another publisher winning that race requires a fresh review. The previous
immutable manifests remain available for inspection and rollback through the
same conditional promotion endpoint. Keep application code committed before
staging so the archive's `code_revision` identifies the actual parser/schema.

## Daily observations and curation

A Worker Cron Trigger at `0 10 * * *` dispatches `data-maintenance.yml` on main
(18:00 Asia/Shanghai). The workflow restores published inputs, compares source
HTML and portrait hashes, and saves original evidence and a report to private R2
and GitHub Actions artifacts. The check index retains both the latest attempt
and the last complete check. An active-page 404/410 never deletes curated content
and never advances the successful baseline.

Source observation and content curation are separate tasks. The existing,
user-authorized local Codex curator runs at 18:10 Asia/Shanghai, after the cloud
check. It reviews differences, updates data, validates the candidate preview,
and publishes through the narrow publisher API. App hosting and source
observation require no persistent server; unattended AI curation still needs the
already-authorized online host and its Codex login. No model credentials are
copied to GitHub. Unknown identities, schema changes and unresolved source gaps
remain review requirements, not automatic imports. General code changes still
use a PR. See `source/chinasoft2026/automation/TASK.md`.

The cloud schedule is enabled only after its workflow exists on main and a
manual dispatch has been verified. The local curator moves to the new contract
only after the publication endpoint and first data release are verified.

## Verification

`web/tests/cloudflare-api.mjs` runs the actual Worker against local D1/R2. It
checks OAuth state and hashed sessions, origin checks, body limits, isolation,
concurrent writes, immutable uploads and conditional release/check promotion.
`web/tests/cloudflare-ui.mjs` checks real browser providers across two devices,
including deletion, competing writes, offline edits, cached reading and corrupt
data rejection. The existing conference and clock suites cover data-driven UI.
Production verification additionally checks actual CORS, portrait decoding,
service-worker OAuth bypass, app/API routes, and unchanged unrelated resources.
