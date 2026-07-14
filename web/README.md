# web — conference agenda viewer

A React + Vite + framer-motion single-page app that renders the datasets built by
`source/build_dataset.py`. The visual language is Vercel / Geist (see the design
system in the repo-root `AGENTS.md`).

## Multi-conference

The site hosts several conferences. `/` is a hub listing every conference (from
`src/data/manifest.json`); each conference lives under `/:conf/...`.

- `src/lib/data.ts` — pure `buildConferenceViews(raw)` factory + conference-
  independent helpers (dates, pinyin index, speaker categories). No module
  singletons.
- `src/lib/conferences.ts` — registry: reads the manifest, lazily code-splits and
  loads each dataset (`import.meta.glob`), and memoises the built views per id.
- `src/lib/conference.tsx` / `conference-store.ts` — `ConferenceProvider` +
  `useConference()`; the provider suspends on the dataset load.
- `src/components/ConferenceLayout.tsx` — validates `:conf`, provides its views,
  and scopes follows (`FollowProvider`, keyed by id) to that conference.

Adding a conference is a data-only change: drop `data/<id>.json` in and rerun
`build_dataset.py` (it writes `src/data/conferences/<id>.json` and refreshes the
manifest). The hub, switcher, and routing pick it up with no code change.

## Commands
```bash
pnpm dev        # dev server (HMR)
pnpm build      # tsc -b && vite build
pnpm lint       # oxlint
pnpm preview    # serve the production build
```

## Personal agenda (follows)
Talks, whole forums, and speakers can be starred; follows are persisted to
`localStorage` namespaced per conference (`<id>:followed.*`). The dashboard
exports the resolved agenda (`.ics` / `.csv` / `.md`) and a round-trippable
`.json` backup that can be re-imported (into the same conference).
