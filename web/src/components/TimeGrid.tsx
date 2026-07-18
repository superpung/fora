import { useState } from "react";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useFollow, talkId } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useCoarsePointer } from "../lib/use-coarse-pointer";
import { useNow, isNowWithin } from "../lib/use-now";
import Icon from "../components/Icon";
import type { Block, Forum, Talk } from "../types";

// A time-vs-forum matrix for one day's parallel forum sessions: the vertical
// axis is wall-clock time, each forum is a column, and every talk sits near its
// real start. It answers "at 10:00, what is each forum running".
// Only usable when talks carry per-talk times; Schedule falls back to the card
// view otherwise (see hasForumTimes).
//
// Time-proportional heights alone don't work here: talks run as short as 2 min,
// far too little room for a title + speaker, so strict scaling clips text and
// overlaps neighbours. Instead each talk gets a readable floor height and is
// pushed down only when a burst of short talks would otherwise collide — the
// column drifts slightly below true time under congestion but never clips.
//
// Every cell always renders its full time + title + speaker; the cell simply
// shows as much as its slot allows and fades out the overflow at the bottom (no
// mid-title ellipsis, no dropped fields). Hovering a compressed cell reveals the
// complete content (see .tgrid__talk:hover).

const PX_PER_MIN = 3.4; // a 20-min talk (the median) ≈ 68px — fits time+title+speaker
const HOUR = 60;
const MIN_H = 30; // floor so even a 2-min talk stays legible & clickable
const BRK_MIN_H = 22; // floor for a break band (short, single-line)
const GAP = 4; // min vertical gap when talks are pushed apart

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string): number => {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};
const fmt = (min: number): string => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// A laid-out cell is either a talk or a break, positioned at its true time.
type Cell =
  | { kind: "talk"; t: Talk; i: number; top: number; h: number }
  | { kind: "break"; name: string; start: string; end?: string | null; top: number; h: number };
interface Brk {
  s: number;
  e: number;
  name: string;
  start: string;
  end?: string | null;
}
interface Column {
  forum: Forum;
  code: string;
  key: string; // unique per column (a parallel-room forum yields several)
  room: string;
  start: number; // earliest timed talk (for sorting)
  cells: Cell[];
  bottom: number; // px extent of laid content (incl. untimed note)
  untimed: number; // count of talks with no start (shown as a footer note)
}

// Split a forum's timed talks into tracks at each backward time jump — used to
// separate the parallel rooms of a multi-room forum, whose agenda is stored as
// one flat list with the second room's schedule appended (its clock resets).
function splitByReset<T extends { s: number }>(items: T[]): T[][] {
  const segs: T[][] = [];
  let cur: T[] = [];
  let prev = -1;
  for (const it of items) {
    if (prev !== -1 && it.s < prev && cur.length) {
      segs.push(cur);
      cur = [];
    }
    prev = it.s;
    cur.push(it);
  }
  if (cur.length) segs.push(cur);
  return segs;
}

export default function TimeGrid({
  block,
  date,
  filtered = false,
}: {
  block: Block;
  /** the day's date (YYYY-MM-DD) — drives the "now" indicator when it's today */
  date?: string;
  filtered?: boolean;
}) {
  const { id: confId, forumsByCode } = useConference();
  const { t: tr } = useI18n();
  const { isForum, isTalk, isSpeaker } = useFollow();
  const coarse = useCoarsePointer();
  const [openKey, setOpenKey] = useState<string | null>(null);
  // A live clock (re-ticks each 30s) for the "now" line and the running-report
  // highlight, so both drift with real time without a page reload.
  const now = useNow();

  // A talk is "followed-relevant" when its forum is followed (keep the whole
  // column), the talk itself is starred, or one of its speakers is followed —
  // the same rule the dashboard's 我的关注 filter uses.
  const relevant = (code: string, i: number, t: Talk): boolean =>
    isForum(code) ||
    isTalk(talkId(code, i)) ||
    (t.speakers ?? []).some((s) => isSpeaker(s.name));

  // First pass: gather each forum's timed talks as minute offsets, and the day's
  // overall time span.
  const raw: {
    forum: Forum;
    code: string;
    key: string;
    room: string;
    timed: { t: Talk; i: number; s: number; e: number }[];
    breaks: Brk[];
    untimed: number;
  }[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  // Per-forum breaks (e.g. tea breaks): each column's break sits at its own real
  // time — chinasoft's forums each break at a different clock. Assign a break to
  // the room-segment whose talk span contains it (single-room: all breaks).
  const brksInSpan = (segBreaks: Brk[], seg: { s: number; e: number }[]): Brk[] => {
    if (!seg.length) return segBreaks;
    const s0 = Math.min(...seg.map((x) => x.s));
    const e0 = Math.max(...seg.map((x) => x.e));
    return segBreaks.filter((b) => b.s >= s0 && b.s <= e0);
  };
  for (const e of block.forum_entries ?? []) {
    const forum = forumsByCode[e.forum_code];
    if (!forum) continue;
    const timed: { t: Talk; i: number; s: number; e: number }[] = [];
    let untimed = 0;
    (forum.talks ?? []).forEach((t, i) => {
      if (!t.start) {
        untimed += 1;
        return;
      }
      const s = toMin(t.start);
      const e2 = t.end ? toMin(t.end) : s + 20; // assume 20 min when end is absent
      timed.push({ t, i, s, e: e2 });
      lo = Math.min(lo, s);
      hi = Math.max(hi, e2);
    });
    const fbreaks: Brk[] = (forum.breaks ?? [])
      .filter((b) => b.start)
      .map((b) => {
        const s = toMin(b.start as string);
        const e2 = b.end ? toMin(b.end) : s + 15;
        lo = Math.min(lo, s);
        hi = Math.max(hi, e2);
        return { s, e: e2, name: b.name, start: b.start as string, end: b.end };
      });
    if (timed.length === 0 && untimed === 0) continue;
    const roomStr = (e.room ?? forum.room ?? "").replace(/\s+/g, " ").trim();
    const roomParts = roomStr
      .split(/[、，,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Multi-room forum: split into one column per room when the reset-count
    // matches the room-count; otherwise keep it as a single column.
    const segs = roomParts.length > 1 ? splitByReset(timed) : [timed];
    if (roomParts.length > 1 && segs.length === roomParts.length) {
      segs.forEach((seg, k) => {
        seg.sort((a, b) => a.s - b.s);
        raw.push({
          forum,
          code: e.forum_code,
          key: `${e.forum_code}#${k}`,
          room: roomParts[k],
          timed: seg,
          breaks: brksInSpan(fbreaks, seg),
          untimed: k === 0 ? untimed : 0,
        });
      });
    } else {
      timed.sort((a, b) => a.s - b.s);
      raw.push({
        forum,
        code: e.forum_code,
        key: e.forum_code,
        room: roomStr || "—",
        timed,
        breaks: fbreaks,
        untimed,
      });
    }
  }

  if (raw.length === 0 || !isFinite(lo)) return null;

  lo = Math.floor(lo / HOUR) * HOUR;
  hi = Math.ceil(hi / HOUR) * HOUR;
  const propH = (hi - lo) * PX_PER_MIN; // ideal (uncongested) body height

  // "Now" indicator: a red time-pill + dot in the gutter and a line across the
  // columns, shown only when the viewed day is today and the clock falls within
  // this day's rendered span.
  const { nowMin } = now;
  const showNow = !!date && date === now.todayStr && nowMin >= lo && nowMin <= hi;
  const nowTop = (nowMin - lo) * PX_PER_MIN;

  // Second pass: lay each column out with push-down so cells never overlap.
  let bodyH = propH;
  const columns: Column[] = raw.map((c) => {
    let cursor = 0;
    // Merge talks and breaks into one time-ordered stream so a break lands
    // between the talks it falls between, then push down to avoid overlaps.
    type Item =
      | { s: number; e: number; talk: { t: Talk; i: number } }
      | { s: number; e: number; brk: Brk };
    const items: Item[] = [
      ...c.timed.map((x) => ({ s: x.s, e: x.e, talk: { t: x.t, i: x.i } })),
      ...c.breaks.map((b) => ({ s: b.s, e: b.e, brk: b })),
    ].sort((a, b) => a.s - b.s || ("brk" in a ? 1 : -1));
    const cells: Cell[] = items.map((it) => {
      const desired = (it.s - lo) * PX_PER_MIN;
      const top = Math.max(desired, cursor);
      const h =
        "brk" in it
          ? Math.max((it.e - it.s) * PX_PER_MIN, BRK_MIN_H)
          : Math.max((it.e - it.s) * PX_PER_MIN, MIN_H);
      cursor = top + h + GAP;
      return "brk" in it
        ? { kind: "break", name: it.brk.name, start: it.brk.start, end: it.brk.end, top, h }
        : { kind: "talk", t: it.talk.t, i: it.talk.i, top, h };
    });
    const bottom = cursor + (c.untimed > 0 ? 26 : 0);
    bodyH = Math.max(bodyH, bottom);
    return {
      forum: c.forum,
      code: c.code,
      key: c.key,
      room: c.room,
      start: cells.length ? Math.min(...c.timed.map((x) => x.s)) : Infinity,
      cells,
      bottom,
      untimed: c.untimed,
    };
  });

  // sort by room, then by start time (keeps a physical room's sessions adjacent)
  columns.sort(
    (a, b) => a.room.localeCompare(b.room, "zh-Hans-CN") || a.start - b.start,
  );

  // 我的关注 filter: keep only followed-relevant cells; drop columns (rooms) that
  // end up with nothing followed. Cells keep their original top positions, so the
  // remaining talks still sit at their true clock time.
  const shown = filtered
    ? columns
        .map((c) => ({
          ...c,
          // Breaks are context, not followable — drop them (and unfollowed talks).
          cells: c.cells.filter((cell) => cell.kind === "talk" && relevant(c.code, cell.i, cell.t)),
          untimed: 0,
        }))
        .filter((c) => c.cells.length > 0)
    : columns;

  if (filtered && shown.length === 0) {
    return <div className="tgrid__empty">{tr("timeline.noFollows")}</div>;
  }

  const hours: number[] = [];
  for (let h = lo; h <= hi; h += HOUR) hours.push(h);

  return (
    <div className="tgrid" role="grid" aria-label={tr("timeline.aria")}>
      <div className="tgrid__inner">
        {/* time gutter (sticky left) */}
        <div className="tgrid__gutter">
          <div className="tgrid__ghead" />
          <div className="tgrid__gbody" style={{ height: bodyH }}>
            {hours.map((h) => (
              <div key={h} className="tgrid__htick" style={{ top: (h - lo) * PX_PER_MIN }}>
                <span className="tgrid__hlabel">{fmt(h)}</span>
              </div>
            ))}
            {showNow && (
              <div className="tgrid__now" style={{ top: nowTop }}>
                <span className="tgrid__nowpill mono">{fmt(nowMin)}</span>
                <span className="tgrid__nowdot" />
              </div>
            )}
          </div>
        </div>

        {/* one column per forum */}
        {shown.map((c) => (
          <div className="tgrid__col" key={c.key}>
            <Link
              to={`/${confId}/forum/${c.code}`}
              className="tgrid__chead"
              title={c.forum.title.zh}
            >
              <span className="tgrid__croom">
                <Icon name="pin" size={10} /> {c.room}
              </span>
              <span className="tgrid__ctitle">{c.forum.title.zh}</span>
            </Link>
            <div className="tgrid__cbody" style={{ height: bodyH }}>
              {hours.map((h) => (
                <div key={h} className="tgrid__line" style={{ top: (h - lo) * PX_PER_MIN }} />
              ))}
              {showNow && <div className="tgrid__nowline" style={{ top: nowTop }} />}
              {c.cells.map((cell) => {
                if (cell.kind === "break") {
                  return (
                    <div
                      key={`br-${cell.start}-${cell.top}`}
                      className="tgrid__break"
                      style={{ top: cell.top, height: cell.h, minHeight: cell.h }}
                    >
                      <Icon name="coffee" size={12} />
                      <span className="tgrid__breaktime mono">
                        {cell.start}
                        {cell.end ? `–${cell.end}` : ""}
                      </span>
                      <span className="tgrid__breakname">{cell.name}</span>
                    </div>
                  );
                }
                const { t, i, top, h } = cell;
                const sp = t.speakers?.[0];
                const to = `/${confId}/forum/${c.code}#talk-${i + 1}`;
                const key = `${c.key}#${i}`;
                const open = coarse && openKey === key;
                // When the day is today and the live clock falls inside this
                // talk's real span, mark its time as "now" — a red pill reusing
                // the today-date highlight, so the running talk stands out.
                const isNow = isNowWithin(date, t.start, t.end, now);
                const inner = (
                  <>
                    <span className={`tgrid__ttime mono${isNow ? " is-now" : ""}`}>
                      {t.start}
                      {t.end ? `–${t.end}` : ""}
                    </span>
                    <span className="tgrid__ttitle">
                      {t.title_status === "tbd" ? tr("timeline.tbd") : t.title?.zh}
                    </span>
                    {sp?.name && <span className="tgrid__tspk">{sp.name}</span>}
                  </>
                );
                // minHeight lets a compressed cell grow to its full content on
                // hover/open (see .tgrid__talk:hover / .is-open) without shrinking
                // below its slot.
                const style = { top, height: h, minHeight: h };
                // Coarse pointer (touch): tap toggles the card open, then an
                // explicit enter button navigates. Fine pointer keeps the plain
                // link + hover reveal.
                if (coarse) {
                  return (
                    <div
                      key={i}
                      className={`tgrid__talk ${open ? "is-open" : ""}`}
                      style={style}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => setOpenKey(open ? null : key)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          setOpenKey(open ? null : key);
                        }
                      }}
                    >
                      {inner}
                      {open && (
                        <Link
                          to={to}
                          className="tgrid__tenter"
                          aria-label={tr("timeline.enterTalk")}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <Icon name="arrow-right" size={13} />
                        </Link>
                      )}
                    </div>
                  );
                }
                return (
                  <Link key={i} to={to} className="tgrid__talk" style={style}>
                    {inner}
                  </Link>
                );
              })}
              {c.untimed > 0 && (
                <div className="tgrid__more" style={{ top: c.bottom - 22 }}>
                  {tr("timeline.moreUntimed", { n: c.untimed })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
