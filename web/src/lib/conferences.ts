import manifest from "../data/manifest.json";
import { buildConferenceViews, type ConferenceViews } from "./data";

// The conference registry. `manifest.json` is a lightweight index (a few KB) of
// every hosted conference — enough to render the hub and the switcher without
// loading any full dataset. Full datasets are code-split and fetched lazily,
// only when a conference is actually entered.

export interface ConferenceMeta {
  id: string;
  name: { zh: string; en?: string | null };
  edition?: string | null;
  start_date: string;
  end_date: string;
  city?: string | null;
  venue?: string | null;
  forums: number;
  keynotes: number;
  days: number;
  /** Date (YYYY-MM-DD) the conference's dataset was last updated (from git,
   *  baked into the manifest by source/build_manifest.py). */
  updated_at?: string | null;
}

/** Conferences, newest first — the display order for the hub and switcher. */
export const conferenceList: ConferenceMeta[] = [...(manifest as ConferenceMeta[])].sort(
  (a, b) => b.start_date.localeCompare(a.start_date) || a.id.localeCompare(b.id),
);

/** The conference a bare visit (or a legacy URL) resolves to — the newest one. */
export const defaultConferenceId = conferenceList[0]?.id ?? "";

/** The most recent `updated_at` across all conferences — the hub's "last
 *  updated" date. Null when no conference carries a date. */
export const latestUpdatedAt: string | null =
  conferenceList.map((c) => c.updated_at).filter(Boolean).sort().pop() ?? null;

export function hasConference(id: string | undefined): id is string {
  return !!id && conferenceList.some((c) => c.id === id);
}

export function conferenceMeta(id: string): ConferenceMeta | undefined {
  return conferenceList.find((c) => c.id === id);
}

// Vite discovers every per-conference dataset at build time and code-splits each
// into its own lazily-loaded chunk (keyed by file path).
const loaders = import.meta.glob<{ default: unknown }>("../data/conferences/*.json");

// Memoise the built views per conference id: entering, leaving and re-entering a
// conference reuses the same promise, so its dataset is fetched and its views
// built exactly once per session.
const cache = new Map<string, Promise<ConferenceViews>>();

export function loadConferenceViews(id: string): Promise<ConferenceViews> {
  const cached = cache.get(id);
  if (cached) return cached;
  const loader = loaders[`../data/conferences/${id}.json`];
  const p = loader
    ? loader().then((m) => buildConferenceViews(m.default))
    : Promise.reject(new Error(`Unknown conference: ${id}`));
  cache.set(id, p);
  return p;
}
