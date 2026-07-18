// Pure helpers behind the live "Now / Next" view. They turn one conference's
// derived views plus the current clock (see use-now.ts) into three glanceable
// answers: what is running right now (per room), what starts next (across all
// rooms), and when the user's next starred item begins. Kept side-effect free so
// the page stays a thin renderer that re-runs these on every 30s clock tick.
import type { ConferenceViews } from "./data";
import { collectFollowedItems, type ExportItem, type FollowSnapshot } from "./export";
import type { Talk } from "../types";
import type { Now } from "./use-now";

function toMin(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

/** A talk reduced to just what the live view shows (title + first speaker). */
export interface TalkLite {
  title: string;
  tbd: boolean;
  speaker?: string | null;
  start?: string | null;
  end?: string | null;
}

function liteOf(t: Talk): TalkLite {
  return {
    title: t.title?.zh ?? "",
    tbd: t.title_status === "tbd" || !t.title?.zh,
    speaker: t.speakers?.[0]?.name ?? null,
    start: t.start ?? null,
    end: t.end ?? null,
  };
}

/** A room that is active right now — a parallel forum or a main-stage keynote. */
export interface NowRoom {
  code?: string; // forum code, for a detail link (undefined for keynotes)
  room: string | null;
  title: string; // forum title, or the keynote's own title
  tbd: boolean;
  kind: "forum" | "keynote";
  start: string | null;
  end: string | null;
  nowTalk?: TalkLite | null; // the talk currently on within this room (timed forums)
  nextTalk?: TalkLite | null; // the next talk to come in this room
}

/** One session that starts at the soonest upcoming moment. */
export interface NextSession {
  code?: string;
  room: string | null;
  title: string;
  tbd?: boolean;
  kind: "forum" | "keynote";
  /** number of parallel rooms, when this is the "forums begin" event */
  count?: number;
}

export interface NextGroup {
  date: string;
  start: string;
  /** minutes from now until it begins, or null when it's on a later day */
  minutesUntil: number | null;
  sessions: NextSession[];
}

export interface LiveView {
  nowRooms: NowRoom[];
  next: NextGroup | null;
}

/** Build the "happening now" + "starts next" picture for the current clock. */
export function buildLiveView(views: ConferenceViews, now: Now): LiveView {
  const { scheduleDays, keynoteEntries } = views;
  const today = now.todayStr;
  const cur = now.nowMin;

  // ---- NOW: every room currently active ----
  const nowRooms: NowRoom[] = [];

  // Keynotes running now (each carries its own start/end + stage location).
  keynoteEntries.forEach((e) => {
    if (e.date !== today) return;
    const s = toMin(e.talk.start);
    if (s == null) return;
    const end = toMin(e.talk.end) ?? s + 20;
    if (cur >= s && cur < end) {
      nowRooms.push({
        room: e.location ?? null,
        title: e.talk.title?.zh ?? "",
        tbd: e.talk.title_status === "tbd" || !e.talk.title?.zh,
        kind: "keynote",
        start: e.talk.start ?? null,
        end: e.talk.end ?? null,
      });
    }
  });

  // Forum rooms: all parallel forums run inside their shared block window, so a
  // room is "on" while the block window contains now (or, absent a window, while
  // one of its timed talks does). We then surface the current & next talk in it.
  const todaySched = scheduleDays.find((d) => d.date === today);
  const block = todaySched?.forumBlock;
  if (todaySched && block) {
    const ws = toMin(block.start);
    const we = toMin(block.end);
    todaySched.slots.forEach((slot) => {
      const talks = slot.forum?.talks ?? [];
      const starts = talks.map((t) => toMin(t.start)).filter((x): x is number => x != null);
      const ends = talks.map((t) => toMin(t.end)).filter((x): x is number => x != null);
      const start = ws ?? (starts.length ? Math.min(...starts) : null);
      const end = we ?? (ends.length ? Math.max(...ends) : null);
      const active =
        start != null && end != null
          ? cur >= start && cur < end
          : talks.some((t) => {
              const s = toMin(t.start);
              if (s == null) return false;
              return cur >= s && cur < (toMin(t.end) ?? s + 20);
            });
      if (!active) return;

      let nowTalk: TalkLite | null = null;
      let nextTalk: TalkLite | null = null;
      let nextMin = Infinity;
      for (const t of talks) {
        const s = toMin(t.start);
        if (s == null) continue;
        const e = toMin(t.end) ?? s + 20;
        if (!nowTalk && cur >= s && cur < e) nowTalk = liteOf(t);
        if (s > cur && s < nextMin) {
          nextMin = s;
          nextTalk = liteOf(t);
        }
      }
      nowRooms.push({
        code: slot.code,
        room: slot.room ?? null,
        title: slot.forum?.title.zh ?? slot.code,
        tbd: false,
        kind: "forum",
        start: block.start ?? null,
        end: block.end ?? null,
        nowTalk,
        nextTalk,
      });
    });
  }

  nowRooms.sort((a, b) => (a.room ?? "").localeCompare(b.room ?? "", "en"));

  // ---- NEXT: the soonest upcoming start across all rooms & days ----
  interface StartEv {
    date: string;
    start: string;
    startMin: number;
    session: NextSession;
  }
  const evs: StartEv[] = [];
  scheduleDays.forEach((d) => {
    const bm = toMin(d.forumBlock?.start);
    if (d.forumBlock?.start && bm != null) {
      // The parallel forum block begins as one event ("N rooms at HH:MM").
      evs.push({
        date: d.date,
        start: d.forumBlock.start,
        startMin: bm,
        session: { title: "", kind: "forum", room: null, count: d.slots.length },
      });
    }
  });
  keynoteEntries.forEach((e) => {
    const m = toMin(e.talk.start);
    if (e.talk.start && m != null) {
      evs.push({
        date: e.date,
        start: e.talk.start,
        startMin: m,
        session: {
          title: e.talk.title?.zh ?? "",
          tbd: e.talk.title_status === "tbd" || !e.talk.title?.zh,
          kind: "keynote",
          room: e.location ?? null,
        },
      });
    }
  });

  const future = evs.filter((e) => e.date > today || (e.date === today && e.startMin > cur));
  future.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);

  let next: NextGroup | null = null;
  if (future.length) {
    const first = future[0];
    const group = future.filter((e) => e.date === first.date && e.start === first.start);
    next = {
      date: first.date,
      start: first.start,
      minutesUntil: first.date === today ? first.startMin - cur : null,
      sessions: group.map((e) => e.session),
    };
  }

  return { nowRooms, next };
}

export interface StarredNext {
  item: ExportItem;
  minutesUntil: number | null;
  running: boolean;
}

/** The user's next starred item: the first one currently running, else the first
    to start after now (searching today, then later days). Null when none remain. */
export function nextStarredItem(
  views: ConferenceViews,
  snapshot: FollowSnapshot,
  now: Now,
): StarredNext | null {
  const cur = now.nowMin;
  const items = collectFollowedItems(snapshot, views); // already date+time sorted
  for (const item of items) {
    if (!item.date) continue;
    if (item.date > now.todayStr) return { item, minutesUntil: null, running: false };
    if (item.date < now.todayStr) continue;
    const s = toMin(item.start);
    if (s == null) return { item, minutesUntil: null, running: false };
    const e = toMin(item.end) ?? s + 20;
    if (cur < s) return { item, minutesUntil: s - cur, running: false };
    if (cur < e) return { item, minutesUntil: 0, running: true };
  }
  return null;
}

/** HH:MM for a minute-of-day (the live clock in the header). */
export function fmtClock(min: number): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${p2(Math.floor(min / 60) % 24)}:${p2(min % 60)}`;
}
