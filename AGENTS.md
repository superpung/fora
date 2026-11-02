# AGENTS.md — working agreement for AI assistants on this project

## Keep production available (hard rule)
- `https://fora.repus.me` must remain available throughout development and rollout.
- Verify application, data, authentication routing and offline behavior on a
  separate preview before changing production traffic.
- Never remove the live DNS record or stop the current deployment before its
  replacement is serving successfully. Prepare and verify rollback first.
- Scope every Cloudflare operation to Fora; leave unrelated account services,
  zone-wide settings and shared routing rules unchanged.
- A configured credential is not a verified credential. Check OAuth credentials
  against GitHub before deployment, and distinguish simulated-provider tests from
  real production authorization. Use the acceptance matrix in `cloudflare/README.md`;
  unresolved failures and unperformed checks remain explicit pending work.

## Keep one current implementation (hard rule)
- Build for the observed workload. Occasional conference maintenance belongs in
  a local, bounded task; do not add permanent cloud orchestration for hypothetical scale.
- Prefer deleting obsolete code to adding compatibility layers, fallback paths,
  dual implementations, or temporary migration machinery.
- Do not retain a deprecated backend, data format, or authentication flow merely
  to preserve backward compatibility. Make the current contract explicit and
  update its callers, fixtures, tests, and documentation together.
- Preserve existing identifiers when they already serve as durable identities;
  do not introduce aliases or adapters without a concrete, approved requirement.
- Use existing import/export tools for transferring user data where possible.
  A migration must not create a second permanent implementation.
- Supported product behavior such as offline reading is part of the current
  architecture, not permission to silently substitute obsolete data formats or
  mask incompatible data and failed validation.

## Reuse and UI acceptance (hard rule)
- **DRY applies to behavior and presentation.** Before adding a formatter,
  control, list or layout, find its existing owner and callers. Reuse that
  implementation. Copying markup/CSS into a page-specific variant does not count
  as reuse, even if it initially looks similar.
- When two real callers need the same structure, extract the smallest shared
  component and migrate both callers together; delete the duplicate markup and
  styles. Do not build a general framework for hypothetical future callers.
  Explain any genuinely different interaction that requires its own component.
- Before implementing UI changes, identify the applicable rules, the existing
  comparison surface and the components to reuse. A rule being present in this
  file is not evidence that the implementation follows it.
- Every UI/UX PR must include a complete user-facing change checklist: affected
  routes and global controls, defaults, timing, navigation, keyboard behavior,
  loading/empty/error states, and surfaces affected by shared-component changes.
  Give concrete preview links for product/design decisions. Responsive layout,
  keyboard/accessibility behavior, functional regressions and failure injection
  are the assistant's work, not a checklist to delegate to the user. Ask the user
  to judge design choices; request manual technical steps only when their real
  authorization/session is indispensable.
- Inventory the **entire current PR against its target branch**, not only the
  latest fix or the last commit. Include visible design, interaction/defaults,
  backend/data contracts, resource/deployment effects, tests and documentation.
  Rewrite the inventory after scope changes and distinguish retained changes
  from abandoned implementations. The chat summary must also cover the full PR.
- State preview data provenance explicitly: real conference content, synthetic
  users/events, calculated scores and any unavailable authentication flow. Never
  present seeded aggregates as real usage or silently replace them with arbitrary
  display numbers.
- Compare changed surfaces with their existing counterparts at matching desktop
  and mobile widths and in light/dark themes. Inspect the actual screenshots:
  generation, HTTP 200, no overflow and no console errors alone do not establish
  visual consistency. Check metadata order, type, spacing, actions and motion.
- Validate derived agenda metadata against source clocks and membership, not only
  the presence of a report row. `web/tests/agenda-summary.mjs` covers noon/evening
  boundaries, complete daily windows, multiple forum blocks, plenary-only days,
  cross-surface periods and multi-person wrapping. Extend these cases when changing
  schedule aggregation; inspect screenshots with the affected header visible.
- Measure visible text-to-control spacing, not just element bounds: reserved
  width can pass non-overlap tests while leaving an unjustified visual gap.
  Observe animations across time; a still screenshot does not verify motion.
- Test the affected callers of a shared component, including navigation and
  state preservation. Keep automated evidence, assistant visual inspection and
  pending user acceptance separate. Do not mark the user's checklist complete
  on their behalf. Use `.github/pull_request_template.md`.
- When an existing rule was missed, record the concrete execution gap and the
  prevention mechanism in the PR. Prefer a shared implementation or a meaningful
  regression check to repeating the same rule with stronger wording.

## No default fallback (hard rule)
When you hit any obstacle (missing dependency, unmet environment, an API error, a
data gap, more than one reasonable approach, …), **do not silently downgrade,
work around it, or pick a "default that works."**
- Missing Python dependency → install it with `uv add <pkg>` (this project uses
  uv); don't switch to a worse approach just because something isn't installed.
- Missing system tool / permission / credential, or several reasonable options →
  **stop, explain the problem, and ask the user to decide.**
- Confirm before any consequential or outward-facing action.
- In one line: **if there's a problem, say so — don't improvise a fallback.**

## Never run two agents on one branch (hard rule)
`git commit` snapshots the **committing worktree's own index**, not the union of
what everyone has done. Two agents with the same branch checked out in two
worktrees therefore *alternately delete each other's files*: each commit writes a
tree that lacks whatever the other added, and the last commit wins. It fails
silently — both agents report success, `git log` shows every commit, and the
files are simply gone from the tip.

This happened here: six transcribed forums (1492–1497) were committed and pushed,
then vanished from the branch. They were recovered from history, but only because
someone compared the file list against what the agents said they wrote.

- Give each parallel agent **its own branch**, and merge them yourself.
- If parallel agents must share a branch, have them **hand work back** and commit
  it from one place.
- After any parallel run, **verify the tip contains every file** each agent
  claimed — `git ls-tree` the directory and compare against their reports. Do not
  take "committed and pushed" as evidence that the file is on the branch.

## Language rule (hard)
- **Chinese only when talking to the user** (chat replies).
- **Everything else in English**: code, code comments, documentation prose
  (including this file, README, CHANGELOG), commit messages, and the assistant's
  own reasoning.
- **In source code, every comment and docstring is English — always.** Never
  write a Chinese comment. This holds for all languages in the repo (`.py`,
  `.ts`, `.tsx`, `.css`, …).
- Exception: content that is inherently Chinese — the conference **data literals**
  (names, titles, affiliations) and user-facing **UI display strings** (the
  audience is Chinese) — stays in Chinese; that is content, not code/docs. An
  English comment may *quote* such a Chinese value as an example (e.g.
  `// categories: 高校 / 科研院所 / 企业`), but the comment's own prose stays
  English.

## Code and data ownership (hard rule)
- Git owns generic application code, schema, tools and synthetic regression fixtures.
- Conference HTML, source API responses, portraits, identities, enrichment, catalogs,
  generated datasets and conference-specific audits belong in the external maintenance
  workspace `/data/fora-maintenance` and published R2 objects.
- Data updates use immutable R2 staging and conditional catalog promotion.
- Application builds consume the runtime R2 catalog. Run real-conference acceptance
  from the maintenance workspace; use synthetic fixtures in code CI.
- Review staged paths before every commit and run the repository data-boundary gate.

## Design system (Vercel / Geist)
The web viewer follows a **Vercel / Geist** visual language — high-contrast,
restrained, and detailed. Match it; do not drift toward other looks.
- **Surfaces**: subtle 1px bordered cards/rows on a near-white / near-black
  background; hover lifts with a soft shadow and a stronger border.
- **Type**: tight tracking on headings; a **monospace face for identifiers and
  numbers** (codes like CF01, dates, times, counts).
- **Color**: neutral greys for structure, a single **blue accent** for links,
  focus rings, and active state. Selection/anchor state uses a full-surface tint
  (see the UI rules below), never a colored left edge. Metadata icons remain
  neutral; scope accent rules to the specific state/control, not every descendant
  SVG. Button icons inherit button text color. A custom input clear action
  replaces the browser's native clear glyph rather than duplicating it.
- **Buttons**: solid primary; ghost/link styles elsewhere; icon-only buttons for
  compact actions.
- **Motion is required.** Use `framer-motion`; the house easing is
  `[0.22, 1, 0.36, 1]`. Page/enter transitions, list stagger, expand/collapse
  height animations, and popovers (open **and** close via `AnimatePresence`) must
  all be animated, and equivalent controls must animate **consistently** (e.g.
  the conference switcher reuses the export-menu popover animation).
- All state (light/dark) is driven by CSS custom properties in
  `web/src/styles/global.css`; use the tokens, don't hard-code colors.

## UI copy / layout rules (hard)
- **No new middle-dot separators.** Do not introduce `·`, HTML entities or
  Unicode escapes for it in application-authored UI, notifications, posters or
  exports. Only country/city and committee affiliation/title separators remain
  by the user's decision. See [docs/UI_SEPARATORS.md](docs/UI_SEPARATORS.md).
  Preserve original conference content; do not normalize its punctuation.
- Forum identifiers share `ForumCode` and `ForumIdentity`: one neutral rounded
  badge, before the forum name when combined. Do not style each page's code
  independently or confuse a report's display ordinal with its forum identifier.
- Explaining a feature in a discussion does not authorize explanatory copy in
  the app. Keep formulas, scoring explanations and implementation details in
  documentation unless the user explicitly requests them in the interface.
- **Minimal by default — ship only the text that is asked for, nothing else.**
  Never add hero subtitles, taglines, helper/explanatory sentences, call-to-action
  labels ("进入日程", "查看更多"), badges, or any decorative wording "to be
  helpful." If a piece of text is not required to identify or operate the item,
  do not write it. When unsure whether a word earns its place, leave it out. This
  overrides any instinct to make a screen feel "complete."
- **No decorative eyebrow/kicker labels.** Never place a small label above a
  title just for decoration (e.g. `Program` over 完整日程, `Speakers` over 讲者,
  `Organizers` over 组织与赞助). If a heading needs reinforcement, use an icon,
  not an English kicker.
- **No prose-as-UI.** Do not explain an action in a sentence when an icon (or
  icon + short label) button conveys it. E.g. never write
  "需要按时间线逐场浏览？前往完整日程。" — ship a button instead.
- **Explanatory copy is an admission that the design failed.** If a control needs
  a sentence to tell the user what it does or how to use it, the *control* is
  wrong — fix the control, never caption it. A label, an icon, the current value
  shown inline, and a state that visibly changes on interaction have to be enough
  to work it out at a glance. Reaching for a helper sentence means stop and
  redesign.
  - In **menus, popovers and dropdowns this is absolute**: no hint paragraphs, no
    caveats, no "how it works" blurbs, no platform footnotes. One line per
    setting: label on the left, state (switch / current value) on the right.
    Anything that cannot be understood without prose does not belong in a menu.
  - Error/blocked states are a state, not an essay: put a short value on the row
    ("已被浏览器阻止"), not a sentence under it.
- **A popover must never scroll sideways.** Its contents fit its width — no
  fixed-width option rows, no `white-space: nowrap` chip strips that overflow.
  A control that cannot fit the width is the wrong control: cycle a single value
  in place instead of laying every option out. Vertical scrolling is fine;
  horizontal is always a bug.
- **Settings live behind a trigger that always opens.** A menu that hosts
  anything beyond account actions must open in every state, including signed
  out — sign-in is then just the first row inside it. Never make an unrelated
  setting unreachable by putting the whole menu behind authentication.
- **Never stack small text above any heading.** Supporting metadata (code, room,
  dates, location, counts) goes *below* the heading or *beside* it on the same
  line — never on a line above it. This applies to every title/heading (page
  titles, section heads, card/row headers), not just the page's main title.
- **A talk is written the same way in every list.** Wherever a list names talks
  — My Day, the planner, the live card, the topic map's selected topic, the
  similar-talks panel — a row reads: the **title**, then the **speakers** behind
  a person icon (`<Icon name="user" size={12} />`), then **where and when** (room
  behind a pin, time behind a clock). Nothing is dropped because it felt
  redundant in that particular list. This is the mistake that keeps recurring:
  each list owns its own row component, so a new one gets written by copying the
  nearest neighbour, and whatever that neighbour was missing is inherited
  silently. Before shipping a list of talks, put it next to My Day and check the
  same facts are there, in the same order.
- **No left-edge highlight bars.** Do not indicate an active/anchored/selected
  item with a colored strip that runs the full left edge, hugging the rounded
  corners (e.g. `border-left` / `box-shadow: inset 3px 0 0` on a rounded card).
  Use a full-surface background tint (and/or an icon) for selection state.
  - A short **inset vertical accent bar** is a *different, permitted* device: a
    `::before` strip that stops clear of the rounded corners (e.g.
    `left:0; top:6px; bottom:6px; width:3px`), so no highlight ever appears in a
    corner. Used on the timeline talk cards. This is not the forbidden full-edge
    bar — the corner test is what distinguishes them.

---

# Developer reference

React/Vite serves a conference-independent SPA. `lib/conferences.ts` loads the
R2 catalog and verifies immutable dataset hashes. Cache API supports offline
reading. GitHub OAuth and D1 handle account sessions and revisioned follows.
`cloudflare/HEAT.md` documents incremental heat aggregation and resource budgets.

Build with `pnpm --dir web build`; run lint and `pnpm --dir web test`.
The external maintenance workspace owns source capture, parsing, identities,
enrichment and full conference acceptance. Set `FORA_MAINTENANCE_ROOT` when
using `source/publish_data.py`; review the immutable candidate before promotion.
Use `source/validate.py <dataset-directory>` for schema/person/clock validation.

Production availability, preview verification, rollback preparation, UI reuse,
source fidelity and the language rules above apply to every change.
