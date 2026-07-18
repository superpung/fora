import { createContext, useContext } from "react";
import type { ExportItem } from "./export";

// Pre-session reminder preferences and helpers. Kept component-free (like
// theme-store / i18n-store) so the provider file (reminder.tsx) exports only a
// component and stays Fast-Refresh friendly.
//
// Reminders fire LOCAL notifications for the user's starred items ("your talk
// starts in N minutes"), plus an optional day-start nudge. They are opt-in:
// nothing schedules and no OS permission is requested until the user turns them
// on explicitly. Prefs are SITE-WIDE (not per-conference), persisted to
// localStorage like the theme, and synced across devices via the Gist bundle —
// see sync.ts, which mirrors PREF_KEYS into the bundle's `prefs` scalarMap.

export type LeadMinutes = 5 | 10 | 15 | 30;
export const LEAD_CHOICES: readonly LeadMinutes[] = [5, 10, 15, 30] as const;

export interface ReminderPrefs {
  /** Master switch. Also implies OS permission was granted at least once. */
  enabled: boolean;
  /** How many minutes before a starred item's start to notify. */
  leadMin: LeadMinutes;
  /** An extra "your day is starting" nudge before the first starred item each day. */
  dayStart: boolean;
}

export const DEFAULT_PREFS: ReminderPrefs = { enabled: false, leadMin: 10, dayStart: false };

// localStorage keys. Un-namespaced (site-wide), mirroring the theme/lang keys.
// These exact keys are what sync.ts serializes into the `prefs` scalarMap, so
// they are declared here once and imported there — keep them stable.
export const PREF_KEYS = {
  enabled: "fora-reminders.enabled",
  leadMin: "fora-reminders.lead",
  dayStart: "fora-reminders.dayStart",
} as const;

/** Set of already-fired reminder ids (JSON array), so a reload/reschedule never
    re-notifies for the same session. Local-only; never synced. */
export const FIRED_KEY = "fora-reminders.fired";

// Cached per-conference reminder items live under `${confId}:reminder.items`.
// The in-conference FollowActionsBridge writes them (each starred item resolved
// to its title/date/start), so the site-wide scheduler can plan notifications
// for every conference the user has opened — even from the hub — without
// reloading each dataset. Booleans are stored as "1"/"0" (not "1"/"") so a
// turned-OFF state is an explicit value the scalarMap merge can sync, rather
// than an empty value it would drop.
export const REMINDER_ITEMS_RE = /^(.+):reminder\.items$/;
export function reminderItemsKey(confId: string): string {
  return `${confId}:reminder.items`;
}

/** One conference's cached starred items plus the bits needed to build a
    notification and a deep link back into the app. */
export interface ReminderItemSet {
  confId: string;
  nameZh: string;
  nameEn: string;
  items: ExportItem[];
}

/** Fired after a sync pull rewrites reminder prefs in localStorage, so a mounted
    ReminderProvider reloads them. Mirrors FOLLOWS_UPDATED in sync.ts. */
export const REMINDER_PREFS_UPDATED = "cs:reminder-prefs-updated";

/** Fired after the in-conference bridge rewrites a `${confId}:reminder.items`
    cache, so the scheduler re-plans with the latest starred set. */
export const REMINDER_ITEMS_UPDATED = "cs:reminder-items-updated";

function boolFrom(v: string | null): boolean {
  return v === "1";
}

export function loadPrefs(): ReminderPrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PREFS };
  const rawLead = Number(localStorage.getItem(PREF_KEYS.leadMin));
  const leadMin = (LEAD_CHOICES as readonly number[]).includes(rawLead)
    ? (rawLead as LeadMinutes)
    : DEFAULT_PREFS.leadMin;
  return {
    enabled: boolFrom(localStorage.getItem(PREF_KEYS.enabled)),
    leadMin,
    dayStart: boolFrom(localStorage.getItem(PREF_KEYS.dayStart)),
  };
}

export function savePrefs(p: ReminderPrefs): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PREF_KEYS.enabled, p.enabled ? "1" : "0");
    localStorage.setItem(PREF_KEYS.leadMin, String(p.leadMin));
    localStorage.setItem(PREF_KEYS.dayStart, p.dayStart ? "1" : "0");
  } catch {
    /* quota / privacy mode — ignore */
  }
}

/** Read every conference's cached starred-item set from localStorage. */
export function loadItemSets(): ReminderItemSet[] {
  const out: ReminderItemSet[] = [];
  if (typeof localStorage === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !REMINDER_ITEMS_RE.test(k)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(k) ?? "");
      if (parsed && Array.isArray(parsed.items)) out.push(parsed as ReminderItemSet);
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

export function loadFired(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const arr = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "[]");
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveFired(set: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export type PermissionState = NotificationPermission | "unsupported";

export function notificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export function currentPermission(): PermissionState {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export interface ReminderCtxValue {
  prefs: ReminderPrefs;
  permission: PermissionState;
  supported: boolean;
  /** How many starred items across all opened conferences are known (informative). */
  scheduledCount: number;
  /** Opt-in entry point: request OS permission (user-gesture only) then enable.
      Resolves to the resulting permission state. */
  enable: () => Promise<PermissionState>;
  disable: () => void;
  setLead: (m: LeadMinutes) => void;
  setDayStart: (v: boolean) => void;
}

export const ReminderCtx = createContext<ReminderCtxValue | null>(null);

export function useReminders(): ReminderCtxValue {
  const c = useContext(ReminderCtx);
  if (!c) throw new Error("useReminders must be used within ReminderProvider");
  return c;
}
