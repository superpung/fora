// GitHub-login + Gist sync of the user's follows, powered by @repus/gist-sync.
//
// Follows are per-conference (localStorage keys `${confId}:followed.{forums,
// speakers,talks}`), but sync uses ONE gist per user covering every conference.
// We flatten all follows into a single string set — each entry is a JSON triple
// `["${confId}","${type}","${value}"]` — so the engine's `stringSet` three-way
// merge reconciles adds/removes across devices without knowing our shape.
import type { Bundle, GistSyncConfig, Schema } from "@repus/gist-sync";

const FOLLOW_KEY = /^(.+):followed\.(forums|speakers|talks)$/;
type FollowType = "forums" | "speakers" | "talks";

export const syncConfig: GistSyncConfig = {
  clientId: (import.meta.env.VITE_GH_CLIENT_ID as string | undefined) ?? "",
  brokerPath: "/.netlify/functions/github-oauth",
  gistFilename: "conf-scheduler-follows.json",
  appMarker: "conf-scheduler",
};

export const syncSchema: Schema = {
  follows: { kind: "stringSet" },
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

/** Snapshot every conference's follows into one flat, sorted string set. */
export function serialize(): Bundle {
  const out: string[] = [];
  for (const key of allFollowKeys()) {
    const m = key.match(FOLLOW_KEY);
    if (!m) continue;
    const [, confId, type] = m;
    for (const v of readArray(key)) out.push(JSON.stringify([confId, type, v]));
  }
  return { app: "conf-scheduler", version: 1, follows: out.sort() };
}

/** Write a (possibly partial) bundle back into per-conference localStorage keys.
 *  replace (default): localStorage becomes exactly the bundle. merge: union. */
export function apply(bundle: Bundle, opts?: { merge?: boolean }): void {
  if (typeof localStorage === "undefined") return;
  const merge = opts?.merge ?? false;
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
