import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import Icon from "../components/Icon";
import type { Block, Forum, Talk } from "../types";

// A time-vs-forum matrix for one day's parallel forum sessions: the vertical
// axis is wall-clock time, each forum is a column, and every talk sits at its
// real start/end. It lets you read "at 10:00, what is each forum running".
// Only usable when talks carry per-talk times; Schedule falls back to the card
// view otherwise (see hasForumTimes).

const PX_PER_MIN = 1.85; // vertical scale — a 25-min talk ≈ 46px
const HOUR = 60;

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string): number => {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};
const fmt = (min: number): string => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

interface Column {
  forum: Forum;
  code: string;
  room: string;
  start: number; // earliest timed talk (for sorting)
  timed: { t: Talk; i: number; s: number; e: number }[];
  untimed: number; // count of talks with no start (shown as a footer note)
}

export default function TimeGrid({ block }: { block: Block }) {
  const { id: confId, forumsByCode } = useConference();

  // One column per forum, each carrying its talks resolved to minute offsets.
  const columns: Column[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const e of block.forum_entries ?? []) {
    const forum = forumsByCode[e.forum_code];
    if (!forum) continue;
    const timed: Column["timed"] = [];
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
    columns.push({
      forum,
      code: e.forum_code,
      room: (e.room ?? forum.room ?? "").replace(/\s+/g, " ").trim() || "—",
      start: timed.length ? Math.min(...timed.map((x) => x.s)) : Infinity,
      timed,
      untimed,
    });
  }

  if (columns.length === 0 || !isFinite(lo)) return null;

  // sort by room, then by start time (keeps a physical room's sessions adjacent)
  columns.sort(
    (a, b) => a.room.localeCompare(b.room, "zh-Hans-CN") || a.start - b.start,
  );

  lo = Math.floor(lo / HOUR) * HOUR;
  hi = Math.ceil(hi / HOUR) * HOUR;
  const bodyH = (hi - lo) * PX_PER_MIN;
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
              <span className="tgrid__ccode mono">{c.code}</span>
            </Link>
            <div className="tgrid__cbody" style={{ height: bodyH }}>
              {hours.map((h) => (
                <div key={h} className="tgrid__line" style={{ top: (h - lo) * PX_PER_MIN }} />
              ))}
              {c.timed.map(({ t, i, s, e }) => {
                const top = (s - lo) * PX_PER_MIN;
                const h = Math.max((e - s) * PX_PER_MIN, 22);
                const sp = t.speakers?.[0];
                return (
                  <Link
                    key={i}
                    to={`/${confId}/forum/${c.code}#talk-${i + 1}`}
                    className="tgrid__talk"
                    style={{ top, height: h }}
                  >
                    <span className="tgrid__ttime mono">
                      {t.start}
                      {t.end ? `–${t.end}` : ""}
                    </span>
                    <span className="tgrid__ttitle">
                      {t.title_status === "tbd" ? "题目待定" : t.title?.zh}
                    </span>
                    {sp?.name && <span className="tgrid__tspk">{sp.name}</span>}
                  </Link>
                );
              })}
              {c.untimed > 0 && (
                <div className="tgrid__more" style={{ top: bodyH }}>
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
