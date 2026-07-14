import { createContext, useContext } from "react";

// Personal-agenda state helpers, context and hook. Kept in a component-free
// module so the provider file (follow.tsx) exports only a component and stays
// Fast-Refresh friendly. Persisted to localStorage so a user's plan survives
// reloads. Speakers are keyed by name (the dataset has no stable person id);
// collisions are rare and acceptable for a "follow" convenience feature.

export const FORUMS_KEY = "ccfchip.followed.forums";
export const SPEAKERS_KEY = "ccfchip.followed.speakers";
export const TALKS_KEY = "ccfchip.followed.talks";

// A talk has no stable id in the dataset, so we key it by its forum code plus
// its index within that forum: `${code}#${index}`.
export function talkId(code: string, index: number): string {
  return `${code}#${index}`;
}

// Main-conference keynotes live in day blocks (no forum code), so they get their
// own id namespace, keyed by day + position within that day's keynote list.
export function keynoteId(date: string, index: number): string {
  return `KEYNOTE:${date}#${index}`;
}
export function isKeynoteId(id: string): boolean {
  return id.startsWith("KEYNOTE:");
}

export function load(key: string): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function save(key: string, set: Set<string>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

export interface FollowState {
  forums: Set<string>;
  speakers: Set<string>;
  talks: Set<string>;
  toggleForum: (code: string) => void;
  toggleSpeaker: (name: string) => void;
  toggleTalk: (id: string) => void;
  isForum: (code: string) => boolean;
  isSpeaker: (name: string) => boolean;
  isTalk: (id: string) => boolean;
  clearAll: () => void;
}

export const FollowCtx = createContext<FollowState | null>(null);

export function useFollow(): FollowState {
  const ctx = useContext(FollowCtx);
  if (!ctx) throw new Error("useFollow must be used within FollowProvider");
  return ctx;
}
