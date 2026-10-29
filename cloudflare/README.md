# Cloudflare deployment and independent data publishing

Fora runs in the **SUPER** account (`efdf4a505a7f4ca9be62bee7957c7e19`).
All resources below belong exclusively to Fora. Never change account defaults,
other Workers, shared routing rules, or the nameservers of `repus.me`.

| Resource | Purpose |
| --- | --- |
| `fora` Worker | Static application, GitHub OAuth, sessions, sync and publishing |
| `fora-users` D1 | User identities, hashed sessions and revisioned agenda bundles |
| `fora-public` R2 | Immutable datasets, portraits and release manifests |
| `fora.repus.me` | Application and same-origin API |
| `fora-data.repus.me` | Public R2 data, with GET/HEAD CORS |

The deployed source is `cloudflare/wrangler.jsonc`. Credentials are outside the
repository. The local operator token is in
`/root/.config/fora/cloudflare-gmail.env`; the publisher credential is in
`/root/.config/fora/worker-secrets.json`. Both are mode 0600. The publisher credential stays on the local maintainer host. Never print credentials or pass secret values as CLI arguments.

## Continuous-availability rollout

The production route is exactly `fora.repus.me/*`. Keep the existing proxied DNS
record during the cutover: adding the route changes request handling without
deleting the hostname. Pin Netlify's current published deployment before merging
this migration so its automatic builds cannot replace the serving version.
Keep that immutable deployment available until production verification finishes.
Removing only Fora's Worker route restores the pinned origin without a DNS gap;
never change shared routes or zone-wide settings to perform a rollback.

Verify the pinned data preview first, then deploy the route and continuously
check production HTML, deep links, datasets, portraits and `/api/session`.
The Worker serves all application requests from its own assets and bindings;
there is no application-level request forwarding or old-backend fallback.
The old deployment is a rollout rollback artifact, not a second maintained app.

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

Secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `PUBLISH_TOKEN`. GitHub OAuth returns to
`https://fora.repus.me/`. The Worker requests `read:user`, fetches the identity,
and discards the GitHub access token. A hashed, random, expiring HttpOnly session
identifies subsequent calls. Successful logins also remove expired sessions,
without a background timer. Preview origins disable login. No Gist backend or
Gist import flow remains; existing JSON backup/import handles user-controlled
transfers. Device-local follows remain usable without signing in.

All sync writes compare a D1 revision atomically. Clients merge changes against
their last common state and retry a stale revision. Preference conflicts and
account changes require an explicit choice. A failed sync retains local edits.
Both `/api/` and root OAuth callback navigations bypass the service worker.

## Conference data

`data/<id>.json` is the single generated reference fixture for each conference.
Tests and asset preparation read it directly; no duplicate web source dataset is
kept. These fixtures are not the live publication pointer. The deployed application fetches a versioned catalog and verifies each
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
# Review and update curated inputs, identities, portraits and enrichment.
# Run rebuild, validation, relevant tests and screenshot review.
uv run python source/publish_data.py stage --base https://fora.repus.me --summary 'Concrete reviewed changes'
# Inspect the printed ?dataVersion=... candidate URL on desktop and mobile.
uv run python source/publish_data.py promote --base https://fora.repus.me
```

Staging uploads immutable public objects. It does not
change the public catalog. Promotion checks referenced objects and atomically
replaces the catalog only if its ETag still matches the reviewed baseline.
Another publisher winning that race requires a fresh review. The previous
immutable manifests remain available for inspection and rollback through the
same conditional promotion endpoint. Keep application code committed before
staging so the release's `code_revision` identifies the actual parser/schema.

## Local observations and curation

The local maintainer performs source checks, curation, validation and publication
in one job at 18:00 Asia/Shanghai, October 29 through November 8, 2026. Outside
that window, checks are manual. There is no cloud cron or GitHub source-check
workflow. The site's availability does not depend on the maintainer host.

One persistent maintenance checkout retains current curated inputs. Source
snapshots and reports stay local; unchanged successful checks reuse the existing
snapshot and append a short check record. Failed checks retain evidence without
advancing the successful baseline. Active 404/410 pages never delete imported
content. Back up local inputs and snapshots as normal working files; moving to
another machine requires copying them. No run restores or uploads raw inputs
from/to R2. See `source/chinasoft2026/automation/README.md`.

## Verification

`web/tests/cloudflare-api.mjs` runs the actual Worker against local D1/R2. It
checks OAuth state and hashed sessions, origin checks, body limits, isolation,
concurrent writes, immutable uploads and conditional release promotion.
`web/tests/cloudflare-ui.mjs` checks real browser providers across two devices,
including deletion, competing writes, offline edits, cached reading and corrupt
data rejection. The existing conference and clock suites cover data-driven UI.
Production verification additionally checks actual CORS, portrait decoding,
service-worker OAuth bypass, app/API routes, and unchanged unrelated resources.
Run deployment tests explicitly when needed:

```sh
AUDIT_BASE_URL=https://fora.repus.me node web/tests/cloudflare-deployment.mjs
AUDIT_BASE_URL=https://fora.repus.me AUDIT_DATA_BASE_URL=https://fora-data.repus.me node web/tests/conference-audit.mjs
```

`AUDIT_DATA_REVISION` can select a staged candidate. There is no special preview
branch selector or repository-variable workflow in CI; the browser scripts remain
available alongside normal CI validation.
