# Feature roadmap

Product backlog for Fora, curated by the author (Super Lee). This file is the
single source of truth for what we intend to build, what we have decided
*against*, and what is still under discussion — so we don't re-litigate settled
calls.

Status legend: 🟢 accepted (build it) · 🔴 declined (author will not add) ·
🟡 under discussion (needs author decision).

Effort is a rough T-shirt size for engineering + data-pipeline work.

---

## Cross-cutting: AI content governance

Several accepted features (#5–#9) surface **AI-generated or AI-derived** content.
Per the author, this class of content is governed by two shared rules:

1. **User toggle.** A single setting (persisted like theme/lang, synced via Gist)
   controls whether AI-generated content is shown at all. Off by default is the
   safe stance; final default TBD. When off, the UI falls back to source data
   only (e.g. full abstract instead of TL;DR, plain keyword search instead of
   semantic).
2. **Provenance marking.** Anything AI-generated carries a visible marker plus a
   disclaimer: *"AI-generated — may contain errors; refer to the original."*
   The original source text is always one tap away.

Implement this once as a shared primitive (setting + badge/disclaimer component)
and reuse it across #5, #6, #7, #8, #9.

---

## 🟢 Accepted

### 1. Global search
One search box that spans **talk titles, abstracts, speakers, affiliations,
organizations, forums, and committees** — not just the speaker directory we have
today.

- **Data:** all present in the conference JSON; pure client-side, no build work.
- **Where:** a global entry (nav/command-k style), results grouped by type,
  each linking to its detail (forum / speaker / talk anchor).
- **Notes:** this is the plain keyword/substring layer. Semantic search (#5) is a
  separate, optional layer on top — global search must work with AI toggled off.
- **Effort:** S.

### 2. Now / Next live view
A glanceable, auto-refreshing view of **what is happening right now across all
rooms, what starts next, and when the user's next starred item begins.**

- **Data:** `days[].blocks` + `session_period` + `room`; `use-now.ts` already
  tracks the current time; `follow-store` provides starred items.
- **Where:** a dedicated lightweight route (`/:conf/now`), surfaced in the nav
  **only during the conference dates** (quiet otherwise). Decided design, not a
  downgrade to a Schedule card. Rationale: Schedule = browse the full grid for
  planning; Now/Next = a zero-scroll, auto-refreshing, personalized "what do I do
  this minute" glance — the primary on-site entry point.
- **Effort:** M.

### 3. Day route view ("My Day")
Turn the user's starred items for a single day into an ordered vertical timeline —
time-sorted, showing **gaps between sessions and room-to-room transitions.**

- **Data:** starred set × `blocks`/`room`/`venue`; pure client-side.
- **Where:** decided — a **view/tab of the personal ("关注") experience**, a
  toggle alongside the existing starred list (e.g. list ↔ "My Day"). Not a
  top-level nav item: it is a re-layout of data the user already curated, so it
  belongs under the starred view.
- **Effort:** M.

### 4. Pre-session reminders (PWA notifications)
Local notifications for starred items: "your starred talk starts in N minutes",
optional opening-ceremony / day-start nudges.

- **Tech:** PWA is already installed; use the Notifications API + a scheduling
  strategy that survives being backgrounded (service-worker timers / periodic
  checks). No server required for local reminders.
- **Data:** starred items × start times.
- **Open questions:** permission UX; reliability of scheduled local notifications
  across iOS/Android web; opt-in granularity (per-item vs global lead time).
- **Effort:** M–L (notification reliability is the risk, not the data).

### 5. Semantic search (offline)
Natural-language search ("talks about in-memory computing", "what should an EDA
PhD student attend") answered by **vector similarity over precomputed
embeddings**, running fully in the browser.

- **Build-time:** compute embeddings for each talk (title + abstract) during the
  dataset build; ship vectors as a static asset. Client does nearest-neighbour
  locally — no backend, works offline.
- **Governed by AI toggle (#cross-cutting).** Falls back to global search (#1)
  when off.
- **Open questions:** embedding model + vector size vs. bundle weight; whether to
  ship a tiny in-browser encoder for the *query* or precompute a query-time
  approach.
- **Effort:** L.

### 6. One-line summaries (TL;DR)
A model-generated one-sentence summary per talk, shown in lists so users can
triage 293 talks without reading full 300–500-char abstracts. Full abstract
remains one tap away.

- **Build-time:** generate TL;DRs during the dataset build; store as static data
  (a derived field kept *separate* from the untouched source abstract).
- **Governed by AI toggle + disclaimer (#cross-cutting)** — explicit author
  requirement: user chooses whether to see it, and it is clearly marked as
  AI-generated / may contain errors / refer to original.
- **Effort:** M (mostly pipeline + a display toggle).

### 7. AI agenda planner ("Plan for me")
User states an interest in natural language; the system selects the most relevant
talks (via #5 embeddings), assembles a suggested personal agenda, and offers a
one-tap "star all". Time-ordered output.

- **Data:** embeddings (#5) + schedule times; builds on #3's day-timeline output.
- **Governed by AI toggle + disclaimer.**
- **Open questions:** how much runs in-browser vs. a build-time/precomputed step;
  interaction model (chat box vs. guided picker).
- **Effort:** L.

### 8. Topic map / knowledge graph
An interactive visualization of the program: speaker–organization–topic
relationships, or a clustered map of this year's themes, as a "conference at a
glance" highlight page.

- **Data:** `organization`, `honorifics`, speakers, plus topic clustering derived
  from embeddings (#5).
- **Governed by AI toggle** for any AI-derived clustering/labels.
- **Open questions:** graph vs. cluster-map; how much is precomputed at build.
- **Effort:** L.

### 9. Similar talks
"If you liked this, you might also want" — embedding-based related-talk
recommendations at the bottom of each talk/forum detail.

- **Data:** embeddings (#5); precompute top-K neighbours at build time.
- **Governed by AI toggle + disclaimer.**
- **Effort:** S–M once #5 exists.

**Dependency note:** #5 (embeddings) is the foundation for #7, #8, #9 and the
optional layer of #1. Sequencing #5 early unlocks the rest cheaply.

---

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
