import { createContext, useContext } from "react";
import type { Talk } from "../types";

// Personal-agenda state helpers, context and hook. Kept in a component-free
// module so the provider file (follow.tsx) exports only a component and stays
// Fast-Refresh friendly. Persisted to localStorage so a user's plan survives
// reloads. Speakers use an explicit source identity when provided, otherwise
// a namespaced name key. Known ambiguous names must not combine affiliations.

// This site hosts several conferences, so every persisted key is namespaced
// under the active conference id — otherwise two conferences' agendas would
// collide in the same localStorage. (Site-wide preferences like theme stay
// un-namespaced.) The provider builds these keys from the current conference id.
export interface FollowKeys {
  forums: string;
  speakers: string;
  talks: string;
}
export function followKeys(confId: string): FollowKeys {
  return {
    forums: `${confId}:followed.forums`,
    speakers: `${confId}:followed.speakers`,
    talks: `${confId}:followed.talks`,
  };
}

/** The allocation suffix is permanent and is unrelated to current ordering. */
export function talkAnchor(talk: Talk): string {
  return `talk-${Number(talk.id.split("#").at(-1)) + 1}`;
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
  toggleSpeaker: (key: string) => void;
  toggleTalk: (id: string) => void;
  isForum: (code: string) => boolean;
  isSpeaker: (key: string) => boolean;
  isTalk: (id: string) => boolean;
  clearAll: () => void;
  /** Merge imported follow ids into the current sets; returns how many ids the
      payload carried (forums + speakers + talks). */
  importFollows: (data: { forums: string[]; speakers: string[]; talks: string[] }) => number;
}

export const FollowCtx = createContext<FollowState | null>(null);

export function useFollow(): FollowState {
  const ctx = useContext(FollowCtx);
  if (!ctx) throw new Error("useFollow must be used within FollowProvider");
  return ctx;
}
