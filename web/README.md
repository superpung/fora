# web — Fora viewer

The React + Vite + framer-motion single-page app. It renders the datasets built
offline by the Python pipeline in [`../source/`](../source/); the visual language
is Vercel / Geist.

```bash
pnpm install
pnpm dev        # dev server (HMR)
pnpm build      # tsc -b && vite build
pnpm lint       # oxlint
pnpm preview    # serve the production build
```

The site is **multi-conference**: `/` is a hub listing every conference (from
`src/data/manifest.json`); each conference lives under `/:conf/...`. Adding a
conference is a data-only change — see the developer reference in the repo-root
**[AGENTS.md](../AGENTS.md)** for the architecture, the data model, the follows /
sync design, and how to add one. The product overview is in
**[../README.md](../README.md)**.
