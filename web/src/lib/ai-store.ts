import { createContext, useContext } from "react";
import type { Talk } from "../types";

// Site-wide governance switch for AI-GENERATED content.
//
// The dataset keeps everything a model produced inside each talk's own
// `enrichment` container (see schema/schema.json + source/enrichment.py), so it
// is never commingled with the verbatim text extracted from a conference's
// official site. This module is the UI half of that contract:
//
//   1. ONE switch decides whether AI-derived content is shown at all. Every
//      feature built on `enrichment` (TL;DR summaries, semantic search, the
//      agenda planner, the topic map, similar talks) reads `useAi().enabled`
//      and falls back to source-only behaviour when it is off.
//   2. Anything AI-generated that IS shown carries a visible marker plus the
//      "may contain errors — refer to the original" disclaimer. See AiMark.tsx.
//
// The preference is site-wide (not per-conference), persisted to localStorage
// like the theme/lang/reminder prefs, and synced across devices via the Gist
// bundle's `prefs` scalarMap — sync.ts mirrors AI_PREF_KEY into it.

/** localStorage key. Un-namespaced (site-wide), mirroring the theme/lang keys.
    Stored as "1"/"0" — never "" — so an explicit OFF survives the scalarMap
    merge, which drops empty values. */
export const AI_PREF_KEY = "fora-ai.enabled";

/** Fired after a sync pull rewrites the pref in localStorage, so a mounted
    AiProvider reloads it. Mirrors REMINDER_PREFS_UPDATED in reminder-store. */
export const AI_PREFS_UPDATED = "cs:ai-prefs-updated";

/** Shown by default: AI-derived content is additive, clearly marked, and never
    replaces the source text (the original abstract is always one tap away).
    Users who would rather not see it turn it off once and it syncs everywhere. */
export const DEFAULT_AI_ENABLED = true;

export function loadAiEnabled(): boolean {
  if (typeof localStorage === "undefined") return DEFAULT_AI_ENABLED;
  const v = localStorage.getItem(AI_PREF_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return DEFAULT_AI_ENABLED;
}

export function saveAiEnabled(v: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AI_PREF_KEY, v ? "1" : "0");
  } catch {
    /* quota / privacy mode — ignore */
  }
}

/** A talk's AI-generated one-line summary, or null when the dataset has none
    (coverage is partial by design — a talk without one simply shows nothing).
    Only `summary.zh` is authored — `en` is null by design — so both UI languages
    show the same Chinese line, like every other dataset string.

    Pure accessor, so non-React code (the search index) reads the field the same
    way the UI does; rendering it is TalkSummary.tsx's job. */
export function talkSummaryText(talk: Talk): string | null {
  const s = talk.enrichment?.summary?.zh;
  return s && s.trim() ? s.trim() : null;
}

export interface AiCtxValue {
  /** Whether AI-generated content may be shown anywhere in the app. */
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
}

export const AiCtx = createContext<AiCtxValue | null>(null);

export function useAi(): AiCtxValue {
  const c = useContext(AiCtx);
  if (!c) throw new Error("useAi must be used within AiProvider");
  return c;
}
