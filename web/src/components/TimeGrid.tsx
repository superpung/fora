import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
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

const PX_PER_MIN = 3.4; // a 20-min talk (the median) ≈ 68px — fits time+title+speaker
const HOUR = 60;
const MIN_H = 30; // floor so even a 2-min talk stays legible & clickable
const GAP = 4; // min vertical gap when talks are pushed apart

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string): number => {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};
const fmt = (min: number): string => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// How much of a talk cell renders, chosen from its final laid-out height so
// content never overflows: shrink by dropping the speaker, then the 2nd title line.
function tier(h: number): { lines: number; spk: boolean } {
  if (h >= 66) return { lines: 2, spk: true };
  if (h >= 50) return { lines: 2, spk: false };
  return { lines: 1, spk: false };
}

interface Cell {
  t: Talk;
  i: number;
  top: number;
  h: number;
}
interface Column {
  forum: Forum;
  code: string;
  room: string;
  start: number; // earliest timed talk (for sorting)
  cells: Cell[];
  bottom: number; // px extent of laid content (incl. untimed note)
  untimed: number; // count of talks with no start (shown as a footer note)
}

export default function TimeGrid({ block }: { block: Block }) {
  const { id: confId, forumsByCode } = useConference();

  // First pass: gather each forum's timed talks as minute offsets, and the day's
  // overall time span.
  const raw: {
    forum: Forum;
    code: string;
    room: string;
    timed: { t: Talk; i: number; s: number; e: number }[];
    untimed: number;
  }[] = [];
  let lo = Infinity;
  let hi = -Infinity;
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
    if (timed.length === 0 && untimed === 0) continue;
    timed.sort((a, b) => a.s - b.s);
    raw.push({
      forum,
      code: e.forum_code,
      room: (e.room ?? forum.room ?? "").replace(/\s+/g, " ").trim() || "—",
      timed,
      untimed,
    });
  }

  if (raw.length === 0 || !isFinite(lo)) return null;

  lo = Math.floor(lo / HOUR) * HOUR;
  hi = Math.ceil(hi / HOUR) * HOUR;
  const propH = (hi - lo) * PX_PER_MIN; // ideal (uncongested) body height

  // Second pass: lay each column out with push-down so cells never overlap.
  let bodyH = propH;
  const columns: Column[] = raw.map((c) => {
    let cursor = 0;
    const cells: Cell[] = c.timed.map(({ t, i, s, e }) => {
      const desired = (s - lo) * PX_PER_MIN;
      const top = Math.max(desired, cursor);
      const h = Math.max((e - s) * PX_PER_MIN, MIN_H);
      cursor = top + h + GAP;
      return { t, i, top, h };
    });
    const bottom = cursor + (c.untimed > 0 ? 26 : 0);
    bodyH = Math.max(bodyH, bottom);
    return {
      forum: c.forum,
      code: c.code,
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

  const hours: number[] = [];
  for (let h = lo; h <= hi; h += HOUR) hours.push(h);

  return (
    <div className="tgrid" role="grid" aria-label="按时间排列的论坛并行日程">
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
          </div>
        </div>

        {/* one column per forum */}
        {columns.map((c) => (
          <div className="tgrid__col" key={c.code}>
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
              {c.cells.map(({ t, i, top, h }) => {
                const { lines, spk } = tier(h);
                const sp = t.speakers?.[0];
                return (
                  <Link
                    key={i}
                    to={`/${confId}/forum/${c.code}#talk-${i + 1}`}
                    className="tgrid__talk"
                    style={{ top, height: h }}
                    title={`${t.start}${t.end ? `–${t.end}` : ""} ${
                      t.title_status === "tbd" ? "题目待定" : t.title?.zh ?? ""
                    }${sp?.name ? ` · ${sp.name}` : ""}`}
                  >
                    <span className="tgrid__ttime mono">
                      {t.start}
                      {t.end ? `–${t.end}` : ""}
                    </span>
                    <span className="tgrid__ttitle" style={{ WebkitLineClamp: lines }}>
                      {t.title_status === "tbd" ? "题目待定" : t.title?.zh}
                    </span>
                    {spk && sp?.name && <span className="tgrid__tspk">{sp.name}</span>}
                  </Link>
                );
              })}
              {c.untimed > 0 && (
                <div className="tgrid__more" style={{ top: c.bottom - 22 }}>
                  另有 {c.untimed} 场未标注时间
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
