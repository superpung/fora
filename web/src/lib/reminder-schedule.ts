import { scheduleTimeMs } from "./conference-time";
import type { ReminderItemSet, ReminderPrefs } from "./reminder-store";
import type { ExportItem } from "./export";

// Pure planning: turn the cached starred items + prefs into a flat list of
// concrete notifications with absolute fire times. No DOM / storage access here
// so it stays trivially testable and reusable by both the in-page interval and
// the service-worker trigger path.

export interface PlannedReminder {
  /** Stable, deterministic id — used both to de-dupe fired ones and as the SW
      notification tag so re-scheduling replaces rather than duplicates. */
  id: string;
  /** Absolute epoch-ms when the notification should appear. */
  fireAt: number;
  /** Absolute epoch-ms of the session start (so a late open can recompute
      "starts in N min" and suppress reminders whose session already began). */
  startAt: number;
  title: string;
  body: string;
  /** In-app deep link opened when the notification is tapped. */
  url: string;
  kind: "lead" | "dayStart";
}

/** Resolve a published venue time to the notification's absolute instant. */
export function itemStartMs(date: string | undefined, start: string | null | undefined, timezone?: string): number | null {
  if (!date || !start || !/^\d{2}:\d{2}$/.test(start)) return null;
  const ms = scheduleTimeMs(date, start, timezone);
  return Number.isFinite(ms) ? ms : null;
}

/** Translator shape (a subset of i18n's `t`) so this module stays UI-free. */
type Translate = (key: string, vars?: Record<string, string | number>) => string;

interface PlanContext {
  prefs: ReminderPrefs;
  t: Translate;
  zh: boolean;
  now?: number;
}

function remainingMinutes(startAt: number, ctx: PlanContext): number {
  if (ctx.now == null) return ctx.prefs.leadMin;
  return Math.min(ctx.prefs.leadMin, Math.max(0, Math.ceil((startAt - ctx.now) / 60_000)));
}

function confName(set: ReminderItemSet, zh: boolean): string {
  return (zh ? set.nameZh : set.nameEn) || set.nameZh || set.nameEn || set.confId;
}

function leadReminder(
  set: ReminderItemSet,
  it: ExportItem,
  startAt: number,
  ctx: PlanContext,
): PlannedReminder | null {
  const fireAt = startAt - ctx.prefs.leadMin * 60_000;
  const title = it.title;
  const body = ctx.t("reminders.notifBody", {
    min: remainingMinutes(startAt, ctx),
    session: it.session,
  });
  return {
    id: `${set.confId}#${it.uid}#lead`,
    fireAt,
    startAt,
    title,
    body,
    url: `/${set.confId}/schedule`,
    kind: "lead",
  };
}

/** One "your day is starting" nudge per conference-day, at the earliest starred
    item that day minus the lead time. Off by default; opt-in via prefs.dayStart. */
function dayStartReminders(set: ReminderItemSet, ctx: PlanContext): PlannedReminder[] {
  // earliest start per date
  const earliest = new Map<string, number>();
  for (const it of set.items) {
    const ms = itemStartMs(it.date, it.start, set.timezone);
    if (ms == null) continue;
    const prev = earliest.get(it.date);
    if (prev == null || ms < prev) earliest.set(it.date, ms);
  }
  const out: PlannedReminder[] = [];
  for (const [date, startAt] of earliest) {
    out.push({
      id: `${set.confId}#${date}#dayStart`,
      fireAt: startAt - ctx.prefs.leadMin * 60_000,
      startAt,
      title: ctx.t("reminders.dayStartTitle", { conf: confName(set, ctx.zh) }),
      body: ctx.t("reminders.dayStartBody"),
      url: `/${set.confId}`,
      kind: "dayStart",
    });
  }
  return out;
}

/** Build every reminder (past and future) from the cached item sets. Callers
    filter by time; keeping past ones out here would hide "just missed" logic. */
export function planReminders(
  sets: ReminderItemSet[],
  prefs: ReminderPrefs,
  t: Translate,
  zh: boolean,
  now?: number,
): PlannedReminder[] {
  const ctx: PlanContext = { prefs, t, zh, now };
  const out: PlannedReminder[] = [];
  for (const set of sets) {
    // Talks that borrowed their forum's window all "start" at the same minute,
    // so one reminder each would be the same buzz N times for one room. They are
    // grouped into a single nudge naming the forum; only a talk with a time of
    // its own gets called out on its own.
    const borrowed = new Map<string, ExportItem[]>();
    for (const it of set.items) {
      const startAt = itemStartMs(it.date, it.start, set.timezone);
      if (startAt == null) continue; // an item with no known time can't be timed
      if (it.approx) {
        const key = `${it.date}#${it.code ?? it.session}#${it.start}`;
        const group = borrowed.get(key);
        if (group) group.push(it);
        else borrowed.set(key, [it]);
        continue;
      }
      const r = leadReminder(set, it, startAt, ctx);
      if (r) out.push(r);
    }
    for (const [key, group] of borrowed) {
      const first = group[0];
      const startAt = itemStartMs(first.date, first.start, set.timezone);
      if (startAt == null) continue;
      out.push({
        id: `${set.confId}#${key}#lead`,
        fireAt: startAt - prefs.leadMin * 60_000,
        startAt,
        title: first.session,
        body: t("reminders.notifBodyForum", { min: remainingMinutes(startAt, ctx), n: group.length }),
        url: `/${set.confId}/schedule`,
        kind: "lead",
      });
    }
    if (prefs.dayStart) out.push(...dayStartReminders(set, ctx));
  }
  // De-dupe by id (a talk followed via several paths resolves to one item, but
  // guard anyway) and sort chronologically.
  const byId = new Map<string, PlannedReminder>();
  for (const r of out) if (!byId.has(r.id)) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => a.fireAt - b.fireAt);
}
