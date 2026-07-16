<div align="center">

# Fora

**A fast, elegant viewer for conference programs — browse every session, star what matters, and carry your agenda across devices.**

English · [中文](README.zh-CN.md)

</div>

Fora turns a dense academic conference program into something you can actually
navigate. One site hosts many conferences: pick one from the hub, explore its
keynotes and parallel forums, build a personal agenda by starring the talks you
care about, and sync it to every device you use — no app to install.

## Features

- **Multi-conference hub** — one site, many conferences. Choose one and dive
  straight into its full program.
- **The whole program, in one place** — keynotes, parallel forums, the committee,
  and the organizers, all bilingual (中文 / English).
- **Timeline** — every parallel forum laid out side by side on a time grid, with
  a live "now" line on the day the conference is running.
- **Personal agenda** — star any talk, forum, or speaker; your picks become a
  focused, filterable agenda you can jump back to.
- **Sync across devices** — sign in with GitHub to back your agenda up to a
  private Gist and keep it in sync everywhere. Browsing needs no account.
- **Export & import** — take your agenda as a calendar (`.ics`), spreadsheet
  (`.csv`), Markdown (`.md`), or a re-importable backup (`.json`).
- **Speaker directory** — search speakers by name, affiliation, or talk, and
  jump through the list by initial.
- **Share posters** — generate a clean poster image for a whole forum or a
  single talk.
- **Light & dark** — follows your system, with a manual toggle. No tracking.

## Conferences

| Conference | When & where | Program |
| --- | --- | --- |
| **CCF Chip 2026** · 第三届 CCF 芯片大会 | Wuxi · Jul 17–20, 2026 | 48 forums · 12 keynotes |
| **ChinaSoft 2025** · 2025 CCF 中国软件大会 | Wuhan · Nov 27–30, 2025 | 73 forums · 9 keynotes |

## Your agenda, everywhere

Starring is instant and local — no sign-in required to build an agenda on the
device in front of you. When you want it on your phone as well as your laptop,
sign in with GitHub: Fora stores your follows in a single private Gist under your
own account and reconciles changes across devices. Nothing else leaves your
browser, and you can export or wipe your data at any time from the account menu.

## Development

Fora is a React + Vite single-page app under [`web/`](web/); the datasets it
renders are built offline by the Python pipeline under [`source/`](source/).

```bash
cd web
pnpm install
pnpm dev        # start the dev server
```

The architecture, the self-designed data schema, the build pipeline, and how to
**add a new conference** are documented in **[AGENTS.md](AGENTS.md)**.

## Contributing

Contributions are welcome. Please read **[AGENTS.md](AGENTS.md)** first — it is
the working agreement for this repository (conventions, the data model, and the
design system the UI must follow).

## Data & credits

All conference content — session titles, speakers, affiliations, abstracts —
belongs to the respective organizers (CCF and its conference committees). Fora
only reformats publicly available program information into a consistent, readable
view. Cross-device sync is powered by [`@repus/gist-sync`](https://www.npmjs.com/package/@repus/gist-sync).
