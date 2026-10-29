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

## Follow statistics — draft, awaiting approval

The author has selected forum and report popularity, one participation switch
(default off), and no online-user count. The following complete feature list is
still subject to approval before implementation:

1. **Participation:** one account-wide setting, labeled “参与关注统计”, off by
   default. Only signed-in accounts that enable it contribute. Enabling includes
   their current follows; disabling removes their contribution without deleting
   follows or changing synchronization. Devices share the account's choice.
2. **Forum counts:** distinct participating accounts that explicitly follow the
   forum or at least one report within it. Multiple reports, devices and forum
   dates do not multiply an account's contribution to the same forum.
3. **Report counts:** distinct participating accounts that explicitly follow the
   report. Following its forum or speaker does not implicitly contribute a report
   follow. Speaker-derived agenda items do not contribute to forum counts either.
4. **Discovery:** conference-scoped popular forums and popular reports, ordered
   by these counts, with counts on the corresponding forum/report entries. Keep
   chronological schedule views chronological. No cross-conference ranking.
5. **Privacy and freshness:** aggregate counts are visible without signing in;
   identities and follower lists are not public. Counts describe opted-in follows,
   not total attendance. Public results may take up to five minutes to refresh,
   including after withdrawal. Unavailable statistics must not appear as zero.
6. **Scope and cost:** no presence tracking, heartbeat, browsing history, historical
   trend charts or new scheduler. Update contributions when follows or consent
   change, and cache aggregate reads. Use the existing Fora Worker and D1;
   measure read/write cost before rollout, accounting for other account services.

Acceptance must cover consent off by default; account/device deduplication;
forum/report union and exclusions; follow/unfollow, import and sync; withdrawal;
conference isolation; count ordering; unavailable data; and desktop/mobile UI.
Existing login, synchronization, offline reading and chronological schedules
must retain their behavior. This proposal has no implementation yet.

Quota reference, checked October 29, 2026: [Workers Free](https://developers.cloudflare.com/workers/platform/limits/)
allows 100,000 dynamic requests per day; [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/)
allows 5 million rows read, 100,000 rows written per day and 5 GB total storage.
These are account allowances, not dedicated Fora capacity. For comparison,
1,000 users sending one presence update per minute for two hours would produce
120,000 updates, before counting index writes or existing workloads. This is a
hypothetical workload, not observed traffic. Presence is excluded from the proposal.

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
