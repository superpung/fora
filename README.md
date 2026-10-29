<div align="center">

<img src="web/public/icon-512.png" alt="Fora" width="96" height="96" />

# Fora

**A fast, elegant viewer for conference programs — browse every session, star what matters, and carry your agenda across devices.**

[![CI](https://github.com/superpung/fora/actions/workflows/ci.yml/badge.svg)](https://github.com/superpung/fora/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/superpung/fora?sort=semver)](https://github.com/superpung/fora/releases)

English · [中文](README.zh-CN.md)

</div>

Fora turns a dense conference program into something you can actually navigate.
Pick a conference, explore its sessions, build a personal agenda by starring what
matters, and take it with you everywhere — no app to install.

## Features

- 🏛️ **Many conferences, one place** — browse CCF Chip 2026, ChinaOSC 2026, ChinaSoft 2025 and ChinaSoft 2026.
- 🗓️ **The whole program** — keynotes, parallel sessions, speakers, committee and organizers, with a bilingual interface (中文 / English), source-language content and a time view that shows what's running in parallel.
- 🔴 **Live on the day** — what's on in every room right now, what starts next, and when your next starred item begins, using the conference's local time even when your device is elsewhere.
- 📅 **Across days** — follow a forum once and keep its reports on the right dates, including in reminders and calendar exports.
- 📖 **Source details** — published portraits, hosts and breaks, with expandable notes for source discrepancies; unpublished programme details remain explicit.
- ⭐ **Your own agenda** — star the talks, sessions, and speakers you care about, and let **My Day** read a day as a plan: the free gaps, the room changes, and the clashes to decide between.
- 🔔 **Reminders** — an optional nudge before each session you starred.
- 🔍 **Search everything** — one box across talks, abstracts, speakers, affiliations, sessions, committees and organizations.
- 🧭 **Plan for me** — a day without clashes, assembled from what interests you, with the reasoning behind every pick.
- 🗺️ **Topic map** — see what a conference is about at a glance, with similar talks on every talk.
- ✨ **AI summaries, on your terms** — one-line gists and topics, clearly marked as AI-generated, behind a single switch; the original text is always one tap away.
- 🔄 **Synced across devices** — sign in with GitHub to sync through Fora’s database; browsing needs no account.
- 📲 **Install & offline** — add it to your device and keep using it with no network.
- 📤 **Export & back up** — take your agenda to your calendar, or as a backup you can bring back later.
- 🖼️ **Share** — turn any session or talk into a clean, shareable image.
- 🌗 **Light & dark** — follows your system. No tracking.

## Development

Fora is open source. To run it locally, contribute, or add a conference, see
**[AGENTS.md](AGENTS.md)**.

Conference data is published independently to Cloudflare R2. The application runs
on Workers Static Assets, with D1-backed sessions and agenda sync. Report IDs
survive agenda reordering. Generated conference JSON stays out of Git; source
inputs and builders reproduce local test data. After the October 29, 2026 history
cleanup, preserve local work and make a fresh clone before contributing. See [deployment and data publishing](cloudflare/README.md).

## License

[MIT](LICENSE) © Super Lee & Claude.
