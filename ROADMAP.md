# Product status and roadmap

This document distinguishes shipped behavior from proposals. A proposal is not
permission to implement it. Current architecture and operational procedures live
in [AGENTS.md](AGENTS.md) and [cloudflare/README.md](cloudflare/README.md).

## Shipped

| Feature | Current behavior |
| --- | --- |
| Global search | Browser-side BM25 across talks, abstracts, speakers, affiliations, forums, committees and organizations. No embedding model or network search. |
| Now / Next | Current and upcoming sessions, timed conference events and the next followed item, evaluated in the conference timezone. |
| My Day | The personal schedule's day view, including gaps, room changes and overlapping agenda items. |
| Reminders | Opt-in local notifications for followed items, with a shared lead-time setting. Delivery depends on the running browser and its notification permission; closed-app delivery is not guaranteed. |
| AI summaries | Optional authored enrichment, kept separate from original titles and abstracts. Coverage depends on the conference data. |
| Plan for me | Local BM25 ranking and topic agreement assemble a suggested agenda. No runtime model or embeddings. |
| Topic map | Groups reports using the controlled enrichment topic vocabulary; not an embedding-based knowledge graph. |
| Similar talks | Local TF-IDF similarity and topic overlap, computed from the loaded conference. |
| Accounts and sync | GitHub identity, HttpOnly sessions and revisioned three-way D1 synchronization. Gist storage has been removed. |
| Independent data releases | Checksummed conference datasets and a catalog in R2, published separately from application releases. |
| Offline reading | A cached app shell and previously verified conference data; portraits are cached when requested. |

AI-derived content shares one site-wide setting, currently enabled by default,
which synchronizes with account preferences. Displayed enrichment carries a
provenance mark and disclaimer. Original conference content stays available.
Search remains usable when AI content is disabled.

The earlier offline embedding-search proposal was never implemented. It is not
a dependency of the shipped planner, topic map or similar-talks feature. Adding
an embedding model would require a separate scope and approval decision.

## Conference heat — approved, in implementation

The author approved a separate feature PR after #50: weighted forum/report heat,
public conference-scoped rankings, and one default-on account setting labeled
“热度统计”. No online-user count is included. The scoring formula, privacy and
freshness contract, account-wide resource budget and acceptance matrix are in
[cloudflare/HEAT.md](cloudflare/HEAT.md). Implementation and production rollout are
separate: the feature is not shipped until the reviewed PR and rollout complete.

The author also approved changing foreground account polling from one minute to
five minutes. Local changes still upload after two seconds; foreground/network
restoration and manual synchronization remain immediate.

## Outside the Fora product backlog

- Host scheduling, Codex account capacity and maintenance-job monitoring belong
  to the local operating environment.
- Missing official conference details belong to later data maintenance. Retain
  them in the conference gap tracker; they are not unfinished app features.
- Historical GitHub pull-request refs may retain pre-cleanup objects. The author
  accepts this platform limitation; active branches and tags have been cleaned.

## 🔴 Declined (author will not add — do not re-propose)

- **Schedule conflict warnings** — flagging two starred items in the same slot.
- **Topic tags & filtering** — auto-tagging every talk; author not interested,
  and it adds build cost for little return.
- **Personal notes** — private per-talk notes.
- **Dataset stats overview** — "N talks · M speakers · K institutions" counters.
- **Bilingual completion** — machine-translating null `en` fields. Declined to
  keep the conference's original data unmodified.
- **All mainstream-product features the author did not call out**, specifically:
  interactive venue maps / wayfinding, sponsor & exhibitor directory,
  post-conference session ratings/feedback, speaker social/paper links,
  attendee networking/matchmaking, live Q&A / polling.
- **Speaker-dimension linking** — cross-links beyond the Speakers directory
  ("this speaker's other talks", same-org / fellow-academician grouping). Most
  speakers have a single talk, so the payoff is low.
- **Deep-link sharing extras** — deep links already exist (`/forum/:code`,
  `#talk-N` anchors, and the share poster's QR encodes the URL). The remaining
  bits (plain "copy link" text button, per-speaker deep links, native
  `navigator.share`) are marginal, so declined.
