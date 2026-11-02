# Cloudflare deployment and independent data publishing

Fora runs in the **SUPER** account (`efdf4a505a7f4ca9be62bee7957c7e19`).
All resources below belong exclusively to Fora. Never change account defaults,
other Workers, shared routing rules, or the nameservers of `repus.me`.

| Resource | Purpose |
| --- | --- |
| `fora` Worker | Static application, GitHub OAuth, sessions, sync and publishing |
| `fora-users` D1 | User identities, hashed sessions, revisioned agenda bundles and heat snapshots |
| `fora-public` R2 | Immutable datasets, portraits and release manifests |
| `fora.repus.me` | Application and same-origin API |
| `fora-data.repus.me` | Public R2 data, with GET/HEAD CORS |

The deployed source is `cloudflare/wrangler.jsonc`. Credentials are outside the
repository. The local operator token is in
`/root/.config/fora/cloudflare-gmail.env`; the publisher credential is in
`/root/.config/fora/worker-secrets.json`. Both are mode 0600. The publisher credential stays on the local maintainer host. Never print credentials or pass secret values as CLI arguments.

## Continuous-availability rollout

The production route is exactly `fora.repus.me/*`. Its existing proxied DNS
record uses the originless `AAAA 100::` configuration documented by Cloudflare.
The Worker serves the application and API without an external origin. Netlify
is retired; there is no old deployment or application-level fallback.

Keep the live DNS record and Worker route in place during deployments. Verify
an independent version preview, then deploy the complete application atomically.
Use the preceding verified Worker version for rollback; never delete the hostname
or alter shared zone settings. Check production HTML, deep links, data, portraits
and `/api/session` throughout the rollout.

## Application

```sh
pnpm --dir web install --frozen-lockfile
pnpm --dir web lint
pnpm --dir web build
pnpm --dir web test:cloudflare
VITE_DATA_BASE_URL=https://fora-data.repus.me pnpm --dir web build
cd web
pnpm exec wrangler d1 migrations apply fora-users --remote --config ../cloudflare/wrangler.jsonc
pnpm exec wrangler deploy --config ../cloudflare/wrangler.jsonc
```

Set `CLOUDFLARE_API_TOKEN` in the process environment. The account ID is fixed
in the configuration. Development and production use the R2 data origin by default.
Set `VITE_DATA_BASE_URL` to select an isolated test origin. Conference assets
are published separately from the application.

Secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `PUBLISH_TOKEN`. GitHub OAuth returns to
`https://fora.repus.me/`. The Worker requests `read:user`, fetches the identity,
and discards the GitHub access token. A hashed, random, expiring HttpOnly session
identifies subsequent calls. Successful logins also remove expired sessions,
without a background timer. Preview origins disable login. No Gist backend or
Gist import flow remains; existing JSON backup/import handles user-controlled
transfers. Device-local follows remain usable without signing in.

Before installing or changing OAuth credentials, run
`PUBLIC_ORIGIN=https://fora.repus.me uv run python cloudflare/check_oauth.py` with the
client ID and secret supplied through the environment. It sends an intentionally
invalid authorization code to the real GitHub token endpoint and requires
`bad_verification_code`, rejecting invalid client credentials. Never assume
another platform's environment variables are correct merely because they exist.
This check does not validate a real user's authorization or the entire callback.

All sync writes compare a D1 revision atomically. Clients merge changes against
their last common state and retry a stale revision. Preference conflicts and
account changes require an explicit choice. A failed sync retains local edits.
Foreground account polling runs every five minutes; edits upload after two seconds,
with immediate foreground/network/manual refresh. Both `/api/` and root OAuth
callback navigations bypass the service worker.

The dedicated forum/report heat page uses a default-on participation/visibility setting and a
public aggregate snapshot. Read [HEAT.md](HEAT.md) for weighting, the measured
account budget, incremental aggregation, withdrawal semantics and deployment order.
A published catalog must include its compact `interest` identity index before
rolling out heat; production data and preview databases must remain separate.

## Conference data

R2 owns the public catalog, immutable conference objects and portraits.
The external workspace `/data/fora-maintenance` retains source HTML, identity
registries, enrichment, curated `data/*.json` and conference-specific acceptance scripts.
Curated records are authoritative. Publication validates those exact files and
regenerates only the catalog and checksummed assets; it never reruns source parsers.

Builds read the runtime catalog directly. Generic code tests use synthetic
records. Set `FORA_MAINTENANCE_ROOT=/data/fora-maintenance` for the publisher:

```sh
uv run python source/publish_data.py stage --base https://fora.repus.me --summary 'Reviewed changes'
uv run python source/publish_data.py promote --base https://fora.repus.me
```

Supply `FORA_PUBLISH_TOKEN` through the environment. Stage, verify the candidate
in an isolated application preview, then promote using the recorded ETag.
Retain the prior immutable release for conditional rollback.

Report IDs are allocated in the external `source/identities/<conference>.json` registry and are never
reassigned after an insertion, removal or reorder. The number in `R1#0` is a
permanent identity, not an array offset. Enrichment, follows, anchors, search,
reminders and exports use that same identity. New or ambiguous reports stop the
build until the registry is reviewed. A title edit can add a reviewed selector to
its existing identity; an unrelated replacement must receive a new identity.

Staging uploads immutable public objects. It does not
change the public catalog. Promotion checks referenced objects and atomically
replaces the catalog only if its ETag still matches the reviewed baseline.
Promotion preserves the reviewed manifest bytes. The authenticated catalog
endpoint returns its immutable `release` hash and current `etag` for rollback.
Another publisher winning that race requires a fresh review. The previous
immutable manifests remain available for inspection and rollback through the
same conditional promotion endpoint. Keep application code committed before
staging so the release's `code_revision` identifies the committed publisher/schema code.

## Verification

`web/tests/cloudflare-api.mjs` runs the actual Worker against local D1/R2 and
synthetic records: OAuth state, hashed sessions, origin checks, isolation,
concurrent writes, immutable uploads and conditional promotion. CI also runs
`cloudflare/test_oauth.py` for credential-error classification.

Real-conference browser checks, `cloudflare-ui.mjs` and
`cloudflare-integration.mjs` live in the external maintenance workspace because
they currently load conference fixtures. Run them there with the current code and
reviewed fixtures. The browser tests cover concurrent devices, deletions, offline
edits and conflicts; integration connects the application to the actual Worker
and D1 with a simulated GitHub provider. Keep these results separate from real
production authorization. They are separate from `pnpm test:cloudflare`.

Production checks cover CORS, portraits, deep links, service-worker OAuth bypass,
API routes and deployment isolation. External deployment tests accept
`AUDIT_BASE_URL`; data checks also accept `AUDIT_DATA_BASE_URL` and
`AUDIT_DATA_REVISION` for reviewed candidates.

## Migration acceptance

Implementation, simulated-provider tests and production acceptance are separate
results. Do not mark a migration complete while a required check is unperformed
or failing. A passing anonymous-page probe is not a successful login test.

| Change | Required evidence |
| --- | --- |
| GitHub identity and cookie sessions | Real credential check; real human authorization on production; rejected state/code/configuration; secure HttpOnly cookie; logout and expiry |
| D1 sync | Browser application through the actual Worker and D1; two device contexts; follows and deletions; offline edits; preference conflicts; account isolation; stale revisions |
| Independent R2 releases | Hash rejection; incomplete upload rejection; staging leaves live catalog unchanged; conditional promotion; stale publisher rejection; conditional rollback |
| Runtime data and PWA | Real CDN/schema/hash checks; deep links and portraits; visited content offline; corrupt data rejection; OAuth bypasses the service worker |
| Durable report IDs | Insert/reorder identity tests; follows, anchors, exports, multi-day and clock regression suites |
| Local source maintenance | Unchanged snapshot reuse; pending import comparison; failed baseline retention; date guard; clean cron-environment smoke; first full scheduled-run report |
| Deployment isolation | Production checks before/after deployment; unchanged unrelated account resources |

`pnpm --dir web test:cloudflare` runs the data-boundary, heat and Worker API
checks. `pnpm --dir web test` also runs synthetic agenda and timeline regressions.
Run external browser integration and real-conference checks for affected behavior.
Record unperformed production checks explicitly instead of treating a local test
as production acceptance.
