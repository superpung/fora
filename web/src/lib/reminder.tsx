import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGistSync } from "@repus/gist-sync/react";
import { useI18n } from "./i18n-store";
import {
  ReminderCtx,
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  loadItemSets,
  loadFired,
  saveFired,
  notificationsSupported,
  currentPermission,
  REMINDER_PREFS_UPDATED,
  REMINDER_ITEMS_UPDATED,
  type ReminderPrefs,
  type LeadMinutes,
  type PermissionState,
  type ReminderCtxValue,
} from "./reminder-store";
import { planReminders, type PlannedReminder } from "./reminder-schedule";

// Site-wide provider that owns reminder preferences AND runs the local
// scheduling engine. Mounted inside GistSyncProvider so pref changes can call
// markLocalChange() and sync via the Gist bundle (see sync.ts).
//
// SCHEDULING — two cooperating paths, both best-effort and no backend:
//
//  1. In-page interval (always available). While ANY tab of the app is open —
//     foreground OR a backgrounded/hidden tab the browser hasn't frozen — a
//     ~20s interval fires reminders whose lead-time window has arrived. This is
//     the reliable path and the ONLY one on browsers without Notification
//     Triggers (Safari, Firefox): there, reminders only appear while the app is
//     open in a tab. It cannot fire when every tab is closed.
//
//  2. Notification Triggers (Chromium, feature-detected via window.TimestampTrigger).
//     Future reminders are handed to the service worker as OS-scheduled
//     TimestampTriggers, so they fire even when the app is fully closed. When a
//     scheduled trigger's time passes we mark its id fired, so the in-page path
//     never double-notifies for one the OS already delivered.
//
// PLATFORM LIMITS (honest): iOS/iPadOS Safari only allows web notifications for
// a PWA the user has ADDED TO THE HOME SCREEN, and even then has no background
// scheduling API — so on iOS reminders require the installed PWA to be open.
// There is no web way to guarantee delivery when the app is closed on non-
// Chromium browsers. We degrade gracefully rather than pretend otherwise.

const CHECK_INTERVAL_MS = 20_000;
const TAG_PREFIX = "fora-rem:";
const MAX_TRIGGERS = 50; // cap OS-scheduled triggers to a sane near-term horizon

// showTrigger / TimestampTrigger are experimental and absent from the DOM lib.
interface TriggerNotificationOptions extends NotificationOptions {
  showTrigger?: object;
}
declare global {
  interface Window {
    TimestampTrigger?: new (timestamp: number) => object;
  }
}

const hasTimestampTrigger = (): boolean =>
  typeof window !== "undefined" && typeof window.TimestampTrigger === "function";

const tagOf = (id: string): string => TAG_PREFIX + id;
const idOfTag = (tag: string): string => tag.slice(TAG_PREFIX.length);

/** The active SW registration, or null (dev has no SW, and desktop can still use
    the plain Notification constructor). Uses getRegistration, not `.ready`, so it
    resolves immediately to null instead of hanging when no SW is registered. */
async function getReg(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

function baseOptions(r: PlannedReminder): NotificationOptions {
  return {
    tag: tagOf(r.id),
    body: r.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: r.url },
    // reminders are time-sensitive; don't auto-dismiss on desktop
    requireInteraction: r.kind === "lead",
  };
}

/** Show a notification now (SW registration preferred; desktop can fall back to
    the page-context Notification constructor). */
function notifyNow(reg: ServiceWorkerRegistration | null, r: PlannedReminder): void {
  const opts = baseOptions(r);
  if (reg) {
    void reg.showNotification(r.title, opts);
    return;
  }
  try {
    const n = new Notification(r.title, opts);
    n.onclick = () => {
      window.focus();
      if (r.url) location.assign(r.url);
      n.close();
    };
  } catch {
    /* permission revoked mid-flight, or unsupported */
  }
}

/** Close any notification (shown or pending-trigger) carrying `tag`. */
async function closeTag(reg: ServiceWorkerRegistration, tag: string): Promise<void> {
  try {
    // includeTriggered surfaces not-yet-fired triggers too (Chromium); it isn't
    // in the DOM typings, so the literal is asserted to the known option type.
    const list = await reg.getNotifications({ tag, includeTriggered: true } as GetNotificationOptions);
    for (const n of list) n.close();
  } catch {
    /* ignore */
  }
}

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const { t, lang } = useI18n();
  const [prefs, setPrefs] = useState<ReminderPrefs>(() =>
    typeof window === "undefined" ? { ...DEFAULT_PREFS } : loadPrefs(),
  );
  const [permission, setPermission] = useState<PermissionState>(() => currentPermission());
  const [scheduledCount, setScheduledCount] = useState(0);
  const supported = notificationsSupported();

  // Persist prefs and, after the first (mount) run, tell the sync engine so the
  // change pushes to the Gist. Mirrors follow.tsx.
  const { markLocalChange } = useGistSync();
  const markRef = useRef(markLocalChange);
  markRef.current = markLocalChange;
  const firstRun = useRef(true);
  useEffect(() => {
    savePrefs(prefs);
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    markRef.current();
  }, [prefs]);

  // Reload prefs when a sync pull (or another tab) rewrites them.
  useEffect(() => {
    const reload = () => setPrefs(loadPrefs());
    window.addEventListener(REMINDER_PREFS_UPDATED, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(REMINDER_PREFS_UPDATED, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  // ---- the scheduling engine ----
  // In-memory record of OS-scheduled triggers (tag -> fireAt), so we only
  // (re)issue a trigger when its time actually changes and can cancel stale ones.
  const scheduledTags = useRef(new Map<string, number>());
  // Latest translator + language, read by the (stable) reschedule callback.
  const tRef = useRef(t);
  tRef.current = t;
  const zhRef = useRef(lang !== "en");
  zhRef.current = lang !== "en";

  const reschedule = useCallback(async (active: boolean) => {
    const reg = await getReg();

    if (!active) {
      // Turned off / permission lost: cancel everything we scheduled.
      if (reg) for (const tag of scheduledTags.current.keys()) await closeTag(reg, tag);
      scheduledTags.current.clear();
      setScheduledCount(0);
      return;
    }

    const p = loadPrefs();
    const planned = planReminders(loadItemSets(), p, tRef.current, zhRef.current);
    const now = Date.now();
    const fired = loadFired();
    const plannedTags = new Set(planned.map((r) => tagOf(r.id)));
    const plannedIds = new Set(planned.map((r) => r.id));

    // 1) Reconcile OS triggers (only when the platform supports them).
    if (hasTimestampTrigger() && reg) {
      for (const [tag, fAt] of [...scheduledTags.current]) {
        if (!plannedTags.has(tag)) {
          await closeTag(reg, tag); // item unstarred / prefs changed it away
          scheduledTags.current.delete(tag);
        } else if (fAt <= now) {
          // Its moment has passed → the SW has (or will imminently) deliver it.
          // Mark fired so the in-page path never repeats it.
          fired.add(idOfTag(tag));
          scheduledTags.current.delete(tag);
        }
      }
      let budget = MAX_TRIGGERS;
      for (const r of planned) {
        if (budget <= 0) break;
        if (r.fireAt <= now || now >= r.startAt) continue; // past → in-page handles
        if (fired.has(r.id)) continue;
        const tag = tagOf(r.id);
        if (scheduledTags.current.get(tag) === r.fireAt) {
          budget--;
          continue; // already scheduled at this exact time
        }
        if (scheduledTags.current.has(tag)) await closeTag(reg, tag); // time changed
        const Trigger = window.TimestampTrigger!;
        const opts: TriggerNotificationOptions = {
          ...baseOptions(r),
          showTrigger: new Trigger(r.fireAt),
        };
        try {
          await reg.showNotification(r.title, opts);
          scheduledTags.current.set(tag, r.fireAt);
        } catch {
          /* scheduling rejected; the in-page path remains as fallback */
        }
        budget--;
      }
    }

    // 2) In-page catch-up: fire reminders whose lead window has arrived and whose
    //    session hasn't started, unless the OS already owns them (a live trigger)
    //    or we already fired them.
    for (const r of planned) {
      if (fired.has(r.id)) continue;
      if (scheduledTags.current.has(tagOf(r.id))) continue;
      if (r.fireAt <= now && now < r.startAt) {
        notifyNow(reg, r);
        fired.add(r.id);
      }
    }

    // Keep the fired set bounded to ids still in the plan.
    saveFired(new Set([...fired].filter((id) => plannedIds.has(id))));
    setScheduledCount(planned.filter((r) => r.startAt > now).length);
  }, []);

  const active = prefs.enabled && permission === "granted";

  // Run the engine on activation/pref change, then on an interval, on item
  // updates, and whenever the tab returns to the foreground.
  useEffect(() => {
    void reschedule(active);
    if (!active) return;
    const id = window.setInterval(() => void reschedule(true), CHECK_INTERVAL_MS);
    const onItems = () => void reschedule(true);
    const onVis = () => document.visibilityState === "visible" && void reschedule(true);
    window.addEventListener(REMINDER_ITEMS_UPDATED, onItems);
    window.addEventListener("storage", onItems);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(REMINDER_ITEMS_UPDATED, onItems);
      window.removeEventListener("storage", onItems);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active, prefs.leadMin, prefs.dayStart, reschedule]);

  // ---- public actions ----
  const enable = useCallback(async (): Promise<PermissionState> => {
    if (!notificationsSupported()) return "unsupported";
    let perm = Notification.permission;
    if (perm === "default") {
      try {
        perm = await Notification.requestPermission();
      } catch {
        perm = Notification.permission;
      }
    }
    setPermission(perm);
    if (perm === "granted") {
      setPrefs((prev) => ({ ...prev, enabled: true }));
      // A one-off confirmation so the user sees it works right away.
      const reg = await getReg();
      const title = tRef.current("reminders.testTitle");
      const opts: NotificationOptions = { body: tRef.current("reminders.testBody"), icon: "/icon-192.png", tag: "fora-rem:test" };
      if (reg) void reg.showNotification(title, opts);
      else
        try {
          new Notification(title, opts);
        } catch {
          /* ignore */
        }
    } else {
      setPrefs((prev) => ({ ...prev, enabled: false }));
    }
    return perm;
  }, []);

  const disable = useCallback(() => setPrefs((prev) => ({ ...prev, enabled: false })), []);
  const setLead = useCallback(
    (m: LeadMinutes) => setPrefs((prev) => ({ ...prev, leadMin: m })),
    [],
  );
  const setDayStart = useCallback(
    (v: boolean) => setPrefs((prev) => ({ ...prev, dayStart: v })),
    [],
  );

  const value = useMemo<ReminderCtxValue>(
    () => ({ prefs, permission, supported, scheduledCount, enable, disable, setLead, setDayStart }),
    [prefs, permission, supported, scheduledCount, enable, disable, setLead, setDayStart],
  );

  return <ReminderCtx.Provider value={value}>{children}</ReminderCtx.Provider>;
}
