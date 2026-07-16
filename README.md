<div align="center">

# Fora

**A fast, elegant viewer for conference programs — browse every session, star what matters, and carry your agenda across devices.**

[![CI](https://github.com/superpung/fora/actions/workflows/ci.yml/badge.svg)](https://github.com/superpung/fora/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/superpung/fora?sort=semver)](https://github.com/superpung/fora/releases)

English · [中文](README.zh-CN.md)

</div>

Fora turns a dense conference program into something you can actually navigate.
Pick a conference from the hub, explore its keynotes and parallel sessions, build
a personal agenda by starring the talks you care about, and sync it to every
device you use — no app to install.

## Features

- **Multi-conference hub** — one site, many conferences. Choose one and dive
  straight into its full program.
- **The whole program in one place** — keynotes, parallel sessions, and speakers,
  all bilingual (中文 / English).
- **Timeline** — every parallel session laid out side by side on a time grid,
  with a live "now" line on the day the conference is running.
- **Personal agenda** — star any talk, session, or speaker; your picks become a
  focused, filterable agenda you can jump back to.
- **Sync across devices** — sign in with GitHub to back your agenda up to a
  private Gist and keep it in sync everywhere. Browsing needs no account.
- **Works offline** — installable as a PWA; once loaded it keeps working with no
  network, and offline changes resync the moment you reconnect.
- **Export & import** — take your agenda as a calendar (`.ics`), spreadsheet
  (`.csv`), Markdown (`.md`), or a re-importable backup (`.json`).
- **Speaker directory** — search speakers by name, affiliation, or talk, and
  jump through the list by initial.
- **Share posters** — generate a clean poster image for a whole session or a
  single talk.
- **Light & dark** — follows your system, with a manual toggle. No tracking.

## Your agenda, everywhere

Starring is instant and local — no sign-in required to build an agenda on the
device in front of you. When you want it on your phone as well as your laptop,
sign in with GitHub: Fora stores your follows in a single private Gist under your
own account and reconciles changes across devices. Nothing else leaves your
browser, and you can export or wipe your data at any time from the account menu.

## Development

Fora is a React + Vite single-page app under [`web/`](web/).

```bash
cd web
pnpm install
pnpm dev        # start the dev server
```

The architecture, the data model, the build pipeline, and how to add a
conference are documented in **[AGENTS.md](AGENTS.md)**.

## Contributing

Contributions are welcome. Please read **[AGENTS.md](AGENTS.md)** first — it is
the working agreement for this repository (conventions, the data model, and the
design system the UI must follow).

## License

[MIT](LICENSE) © Super Lee & Claude. Cross-device sync is powered by
[`@repus/gist-sync`](https://www.npmjs.com/package/@repus/gist-sync).
