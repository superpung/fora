---
name: add-conference
description: Add a new conference to this multi-conference viewer — recon its source site, extract the agenda, map it to schema/schema.json, validate, and wire it into the web app. Use when the user gives a conference URL/site to add, or asks to add/ingest/onboard a conference. Not for editing an existing conference's data.
---

# Add a conference

This viewer hosts several conferences. Each one is an **independent adapter** that
produces a schema-conforming `data/<id>.json`; there is **no universal parser** —
every source site differs. Your job is the per-source judgment; the schema,
validator, and wiring are fixed.

Worked examples (READ them as examples, not templates — a new site will differ):
`source/ccfchip2026*` (jsonp APIs + visually-parsed posters) and
`source/chinasoft2025/` (static HTML templates). Do not assume a new site matches
either.

## Hard rules (non-negotiable)
- **`schema/schema.json` is the single source of truth**, not any existing
  conference's code. Read it first.
- **Faithful extraction.** Record what the source says. Dirty/uncertain/conflicting
  data is kept verbatim and marked in `flags` — never silently corrected, guessed,
  or dropped. Never fabricate talks, names, times, or abstracts.
- **Escape hatch before forcing.** If the source has something the core schema
  doesn't model, put it under the open `extra` field (any level) and/or `flags`.
  Do NOT force it into an ill-fitting field. Surface it as a "schema gap" for a
  decision — don't invent a mapping.
- **Ask when blocked** (no default fallback): missing data, an ambiguous mapping,
  a structural mismatch, or more than one reasonable modeling choice → stop and
  ask the user.
- **English** for all code/comments/docs; Chinese only for the conference's own
  content (names/titles) and user-facing UI strings.

## Phases

1. **Recon the source.** How is the agenda served? (static HTML / a JSON or jsonp
   API / PDF / poster images / a CMS). Find the real data endpoints or files.
   `curl` the site; inspect its routing/JS. Decide the extraction tactic from what
   you find — don't assume.
   - **Enumerate every nav section, not just the agenda.** Conference sites carry
     committees, organizers/sponsors, venue, registration, etc. in separate menus
     (often their own hash routes / lazy-loaded fragments, e.g. an intro page whose
     nav calls `loadIntroPage('committee-steering')`). Walk each menu and fetch
     **every** linked sub-page — a landing page usually shows only its first tab.
   - **Cross-check the fetch against the schema's top-level sections.** For each of
     `committees`, `organizations`, `venues` (and any other first-class array),
     confirm the site either has no such content or you captured its source. An
     empty `committees: []` when the site clearly has committee pages is a fetch
     miss, not "no data" — the omission is silent, so check it explicitly.
   - **Then cross-check extraction, not just the fetch.** Fetching the source is
     not enough — verify every group/section visible in the captured raw actually
     became a *populated* structured entry. A page often mixes formats: e.g. a
     committee page may list its chairs in the CMS's structured people template
     but its full member roster as a plain `<p>`/`<td>` table the people-parser
     skips — so `committees` is non-empty (the chairs made it) yet the ~100-member
     body is silently dropped into prose. For each heading in the raw
     (`大会程序委员会主席` **and** `大会程序委员会委员`, every `组`/`委员会`/`主席` block),
     confirm a matching `committees[].members` group with the right count — a
     non-empty array is *not* proof of completeness. Reconcile counts against the
     source, not against "did we fetch it".

2. **Fetch → commit raw.** Save the source to a committed `raw/` under a new
   `source/<id>/` adapter dir (a `fetch.py`), so the build is reproducible offline.
   Large binaries (images) stay gitignored; parsed HTML/JSON is committed.

3. **Map to the schema (`build.py`).** Parse the raw into `data/<id>.json` +
   `web/src/data/conferences/<id>.json`. Core shape: `conference → day → block →
   forum → talk`; a forum is first-class; forum talks may inherit the block's time
   window. If forums are self-scheduling (carry their own date/room), synthesize
   the `days[].blocks[]` from them. Put novel structure in `extra`; flag anomalies.
   Keep the build **deterministic** (a rerun is byte-identical) and offline.

4. **Validate (regression gate).** `python source/validate.py` must pass for
   **every** conference — a schema change may not break an existing one.

5. **Wire in.** `python source/build_manifest.py` refreshes the hub/switcher index.
   Add the build step to `.github/workflows/ci.yml`'s rebuild-and-assert-no-drift
   check. `id` becomes the route (`/<id>/...`) and the storage namespace
   automatically.

6. **Verify end-to-end.** `pnpm -C web build && pnpm -C web lint`, then drive the
   app (the `run`/`verify` skills or Playwright against `pnpm preview`): the hub
   lists it, its dashboard/timeline/speakers/forum pages render, and the existing
   conferences still work. Report parse anomalies (the `flags`) honestly.

## Schema evolution (when the core doesn't fit)
Expect the first few structurally-different conferences to stretch the schema —
that's the hardening, not failure. When a concept recurs and deserves first-class
support:
- Make it an **optional, additive** field/def (don't break existing data).
- Re-run `validate.py` over ALL conferences (regression).
- Prefer a free-form `i18n` label over a closed enum when the vocabulary varies
  per conference (e.g. `forum.category`).
- Bump nothing you don't have to; capture-in-`extra` first, promote later.
