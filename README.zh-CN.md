# Fora

A conference agenda viewer with offline reading, GitHub login, synchronized
follows and aggregate interest statistics. React/Vite hosts the application;
Cloudflare Workers, D1 and R2 provide the runtime services.

## Development

```sh
pnpm --dir web install --frozen-lockfile
pnpm --dir web dev
pnpm --dir web lint
pnpm --dir web build
pnpm --dir web test
```

The application reads the published catalog at `https://fora-data.repus.me`.
Set `VITE_DATA_BASE_URL` to select an isolated data origin for testing.
Git contains application code, generic tools, schema and synthetic fixtures.
Conference maintenance material lives separately at `/data/fora-maintenance`.

## Data publishing

Source capture, reviewed identities, enrichment and portrait preparation run in
the external maintenance workspace. Use the generic publisher with
`FORA_MAINTENANCE_ROOT` pointing to that workspace. Stage an immutable candidate,
verify it through `?dataVersion=<hash>`, then conditionally promote the catalog.
The frontend build is independent of conference updates.

See `cloudflare/README.md` for operations and `AGENTS.md` for project rules.
