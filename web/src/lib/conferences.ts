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

/** The cache the service worker keeps conference datasets in (build-sw.mjs). */
const DATA_CACHE = "fora-conf-data";

/**
 * Make sure the dataset this visit just loaded is in the offline cache.
 *
 * Datasets are runtime-cached rather than precached, so the precache does not
 * grow by a megabyte with every conference added. The catch is that runtime
 * caching only happens for requests the service worker actually sees — and on
 * the FIRST visit it does not see this one. Registration waits for `load`, then
 * the worker installs and precaches the shell, and only then does `clientsClaim`
 * put it in front of the page. The dataset import has usually finished by then.
 *
 * The result was a promise the app did not keep: open a conference once, go
 * offline, and you got a blank page — the shell booted and the dataset import
 * failed with nothing to fall back on. It only started working after a second
 * page load, when the worker was already in charge.
 *
 * So once the worker is in charge, we put the dataset in its cache ourselves.
 * The fetch is served from the browser's own HTTP cache (these chunks are
 * content-hashed and immutable), so this costs a cache write, not a download.
 */
/** Conferences loaded this session, so a late-arriving worker can catch up. */
const loaded = new Set<string>();
let awaitingController = false;

function cacheDataset(id: string): void {
  if (typeof caches === "undefined" || typeof performance === "undefined") return;
  // The chunk's real URL is only known at runtime (content hash), so read it
  // back off the resource timeline rather than trying to reconstruct it.
  const entry = performance
    .getEntriesByType("resource")
    .reverse()
    .find((e) => /\/assets\/data\/.*\.js(\?|$)/.test(e.name) && e.name.includes(id));
  if (!entry) return;
  void caches
    .open(DATA_CACHE)
    .then(async (c) => {
      if (await c.match(entry.name)) return;
      await c.add(entry.name);
    })
    .catch(() => {
      /* private mode / quota — the app still works, just not offline yet */
    });
}

function keepForOffline(id: string): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  loaded.add(id);
  if (navigator.serviceWorker.controller) return cacheDataset(id);
  // No controller yet — which is exactly the first-visit case this exists for.
  // Wait for the worker to take over, then cache everything opened meanwhile.
  if (awaitingController) return;
  awaitingController = true;
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => loaded.forEach(cacheDataset),
    { once: true },
  );
}

export function loadConferenceViews(id: string): Promise<ConferenceViews> {
  const cached = cache.get(id);
  if (cached) return cached;
  const loader = loaders[`../data/conferences/${id}.json`];
  const p = loader
    ? loader().then((m) => {
        keepForOffline(id);
        return buildConferenceViews(m.default);
      })
    : Promise.reject(new Error(`Unknown conference: ${id}`));
  cache.set(id, p);
  return p;
}
