// GitHub-login + Gist sync of the user's follows, powered by @repus/gist-sync.
//
// Follows are per-conference (localStorage keys `${confId}:followed.{forums,
// speakers,talks}`), but sync uses ONE gist per user covering every conference.
// We flatten all follows into a single string set — each entry is a JSON triple
// `["${confId}","${type}","${value}"]` — so the engine's `stringSet` three-way
// merge reconciles adds/removes across devices without knowing our shape.
import type { Bundle, GistSyncConfig, Schema } from "@repus/gist-sync";
import { PREF_KEYS, REMINDER_PREFS_UPDATED } from "./reminder-store";

const FOLLOW_KEY = /^(.+):followed\.(forums|speakers|talks)$/;
type FollowType = "forums" | "speakers" | "talks";

// Site-wide preference keys (currently the reminder prefs) synced as a scalarMap.
// Follows are per-conference and merge as a stringSet; prefs are simple scalars.
const PREF_KEY_LIST: readonly string[] = Object.values(PREF_KEYS);

export const syncConfig: GistSyncConfig = {
  clientId: (import.meta.env.VITE_GH_CLIENT_ID as string | undefined) ?? "",
  brokerPath: "/.netlify/functions/github-oauth",
  gistFilename: "fora-follows.json",
  appMarker: "fora",
};

export const syncSchema: Schema = {
  follows: { kind: "stringSet" },
  // Site-wide preferences (reminder enabled/lead/day-start). scalarMap: a
  // per-key three-way merge; empty values are dropped, so booleans are stored as
  // "1"/"0" (never "") to keep an explicit "off" syncable.
  prefs: { kind: "scalarMap" },
};

/** Event fired after a pull writes follows back to localStorage, so a mounted
 *  FollowProvider can reload its in-memory sets. */
export const FOLLOWS_UPDATED = "cs:follows-updated";

function allFollowKeys(): string[] {
  const keys: string[] = [];
  if (typeof localStorage === "undefined") return keys;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && FOLLOW_KEY.test(k)) keys.push(k);
  }
  return keys;
}

function readArray(key: string): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(arr) ? arr.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Snapshot the site-wide preference keys into a scalarMap (only present,
    non-empty values; missing keys fall back to defaults on the other device). */
function readPrefs(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof localStorage === "undefined") return out;
  for (const key of PREF_KEY_LIST) {
    const v = localStorage.getItem(key);
    if (v != null && v !== "") out[key] = v;
  }
  return out;
}

/** Snapshot every conference's follows into one flat, sorted string set, plus
    the site-wide preferences. */
export function serialize(): Bundle {
  const out: string[] = [];
  for (const key of allFollowKeys()) {
    const m = key.match(FOLLOW_KEY);
    if (!m) continue;
    const [, confId, type] = m;
    for (const v of readArray(key)) out.push(JSON.stringify([confId, type, v]));
  }
  return { app: "fora", version: 1, follows: out.sort(), prefs: readPrefs() };
}

/** Write the preference scalarMap back into localStorage. In replace mode a key
    the bundle omits is cleared (reset to default). Fires REMINDER_PREFS_UPDATED
    when anything changed so a mounted ReminderProvider reloads. */
function applyPrefs(bundle: Bundle, merge: boolean): void {
  if (typeof localStorage === "undefined") return;
  const raw = bundle.prefs;
  const prefs =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  let changed = false;
  for (const key of PREF_KEY_LIST) {
    const incoming = prefs[key];
    const before = localStorage.getItem(key);
    if (typeof incoming === "string" && incoming !== "") {
      if (before !== incoming) {
        try {
          localStorage.setItem(key, incoming);
          changed = true;
        } catch {
          /* quota / privacy mode */
        }
      }
    } else if (!merge && before != null) {
      localStorage.removeItem(key);
      changed = true;
    }
  }
  if (changed && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REMINDER_PREFS_UPDATED));
  }
}

/** Write a (possibly partial) bundle back into per-conference localStorage keys.
 *  replace (default): localStorage becomes exactly the bundle. merge: union. */
export function apply(bundle: Bundle, opts?: { merge?: boolean }): void {
  if (typeof localStorage === "undefined") return;
  const merge = opts?.merge ?? false;
  applyPrefs(bundle, merge);
  const follows = Array.isArray(bundle.follows) ? (bundle.follows as string[]) : [];

  // Group parsed entries by their localStorage key.
  const groups = new Map<string, Set<string>>();
  for (const entry of follows) {
    let triple: unknown;
    try {
      triple = JSON.parse(entry);
    } catch {
      continue;
    }
    if (!Array.isArray(triple) || triple.length < 3) continue;
    const [confId, type, value] = triple as string[];
    if (type !== "forums" && type !== "speakers" && type !== "talks") continue;
    if (typeof confId !== "string" || typeof value !== "string") continue;
    const key = `${confId}:followed.${type as FollowType}`;
    let set = groups.get(key);
    if (!set) groups.set(key, (set = new Set()));
    set.add(value);
  }

  // In replace mode, drop any existing follow keys the bundle doesn't mention.
  if (!merge) {
    for (const key of allFollowKeys()) if (!groups.has(key)) localStorage.removeItem(key);
  }

  for (const [key, set] of groups) {
    if (merge) for (const v of readArray(key)) set.add(v);
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {
      /* quota / privacy mode */
    }
  }

  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(FOLLOWS_UPDATED));
}
