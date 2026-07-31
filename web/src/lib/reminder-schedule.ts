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

/** Combine a YYYY-MM-DD date and HH:MM local time into epoch-ms, or null.
    Times are treated as device-local — the same assumption use-now.ts makes when
    it decides whether a session "is running now". */
export function itemStartMs(date: string | undefined, start: string | null | undefined): number | null {
  if (!date || !start) return null;
  const m = /^(\d{2}):(\d{2})/.exec(start);
  if (!m) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.getTime();
}

/** Translator shape (a subset of i18n's `t`) so this module stays UI-free. */
type Translate = (key: string, vars?: Record<string, string | number>) => string;

interface PlanContext {
  prefs: ReminderPrefs;
  t: Translate;
  zh: boolean;
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
    min: ctx.prefs.leadMin,
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
    const ms = itemStartMs(it.date, it.start);
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
): PlannedReminder[] {
  const ctx: PlanContext = { prefs, t, zh };
  const out: PlannedReminder[] = [];
  for (const set of sets) {
    for (const it of set.items) {
      const startAt = itemStartMs(it.date, it.start);
      if (startAt == null) continue; // an item with no known time can't be timed
      const r = leadReminder(set, it, startAt, ctx);
      if (r) out.push(r);
    }
    if (prefs.dayStart) out.push(...dayStartReminders(set, ctx));
  }
  // De-dupe by id (a talk followed via several paths resolves to one item, but
  // guard anyway) and sort chronologically.
  const byId = new Map<string, PlannedReminder>();
  for (const r of out) if (!byId.has(r.id)) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => a.fireAt - b.fireAt);
}
