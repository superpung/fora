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

`pnpm --dir web test:cloudflare` includes the API tests, deterministic browser
conflict tests and `cloudflare-integration.mjs`. The latter connects the actual
application to the Worker and D1, simulating only GitHub's external responses.
It does not substitute for real production authorization. `pnpm --dir web test`
covers the conference, identity, navigation and clock surfaces. Run source and
publisher Python tests as well. Record unperformed production checks explicitly
instead of treating the corresponding local test as production acceptance.
