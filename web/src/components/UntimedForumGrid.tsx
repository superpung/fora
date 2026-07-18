import { useState } from "react";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useFollow, talkId } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useCoarsePointer } from "../lib/use-coarse-pointer";
import { useNow } from "../lib/use-now";
import Icon from "../components/Icon";
import type { Block, Forum, Talk } from "../types";

// A time-vs-forum board for a day whose forums run in PARALLEL but carry NO
// per-talk times (e.g. ccfchip: each forum is an ordered talk list inside one
// shared window like 13:30–17:00, with one shared tea break). We can't place a
// talk at a true clock time — there is none — so instead of inventing times we:
//   • split the shared window into session bands at the real block-level breaks,
//   • distribute each forum's talks evenly across those bands (by duration),
//   • show ONLY real anchors on the axis (window start, each break, window end),
//   • never print a fabricated per-talk clock on a card.
// The parallelism reads across columns; the break is a real, highlighted band
// spanning every column at its true time. Timed conferences use TimeGrid instead.

const ROW_H = 56; // per-talk cell height (fits order + title + speaker)
const BRK_H = 34; // shared break band height
const MIN_SEG_H = 40;

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string): number => {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};
const fmt = (min: number): string => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// Largest-remainder apportionment: split n talks across sessions in proportion to
// their durations, always summing back to exactly n.
function allocate(n: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (n * w) / total);
  const counts = exact.map(Math.floor);
  let rem = n - counts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; rem > 0 && order.length; k++, rem--) counts[order[k % order.length].i] += 1;
  return counts;
}

type Band =
  | { kind: "session"; s: number; e: number; top: number; h: number; seg: number }
  | { kind: "break"; s: number; e: number; top: number; h: number; name: string; start: string; end?: string | null };

interface UCell {
  t: Talk;
  i: number; // original index in forum.talks (for deep link + follow id)
  no: number; // 1-based order shown on the card
  top: number;
  h: number;
}
interface UCol {
  forum: Forum;
  code: string;
  key: string;
  room: string;
  cells: UCell[];
  empty: boolean;
}

export default function UntimedForumGrid({
  block,
  date,
  filtered = false,
}: {
  block: Block;
  date?: string;
  filtered?: boolean;
}) {
  const { id: confId, forumsByCode } = useConference();
  const { t: tr } = useI18n();
  const { isForum, isTalk, isSpeaker } = useFollow();
  const coarse = useCoarsePointer();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const now = useNow();

  const relevant = (code: string, i: number, t: Talk): boolean =>
    isForum(code) ||
    isTalk(talkId(code, i)) ||
    (t.speakers ?? []).some((s) => isSpeaker(s.name));

  const entries = (block.forum_entries ?? []).filter((e) => forumsByCode[e.forum_code]);
  if (entries.length === 0) return null;

  // Shared window + real breaks → an ordered list of session / break bands.
  const winStart = block.start ? toMin(block.start) : null;
  const winEnd = block.end ? toMin(block.end) : null;
  const haveWindow = winStart != null && winEnd != null && winEnd > winStart;
  const lo = haveWindow ? (winStart as number) : 0;
  const hi = haveWindow ? (winEnd as number) : 0;

  const rawBreaks = haveWindow
    ? (block.breaks ?? [])
        .filter((b) => b.start && b.end)
        .map((b) => ({ s: toMin(b.start as string), e: toMin(b.end as string), name: b.name, start: b.start as string, end: b.end }))
        .filter((b) => b.s >= lo && b.e <= hi && b.e > b.s)
        .sort((a, b) => a.s - b.s)
    : [];

  // Build bands by walking the window and cutting at each break.
  type Seg = { s: number; e: number };
  const sessions: Seg[] = [];
  const preBands: Array<{ kind: "session"; seg: Seg } | { kind: "break"; b: (typeof rawBreaks)[number] }> = [];
  if (haveWindow) {
    let cursor = lo;
    for (const b of rawBreaks) {
      if (b.s > cursor) {
        const seg = { s: cursor, e: b.s };
        sessions.push(seg);
        preBands.push({ kind: "session", seg });
      }
      preBands.push({ kind: "break", b });
      cursor = b.e;
    }
    if (cursor < hi) {
      const seg = { s: cursor, e: hi };
      sessions.push(seg);
      preBands.push({ kind: "session", seg });
    }
  }
  // Degenerate fallback (no window): a single session holding every talk.
  if (sessions.length === 0) {
    const seg = { s: lo, e: hi };
    sessions.push(seg);
    preBands.length = 0;
    preBands.push({ kind: "session", seg });
  }
  const segIndex = new Map<Seg, number>();
  sessions.forEach((s, i) => segIndex.set(s, i));

  // Per forum: apportion its ordered talks across the sessions.
  const talksPerForum = entries.map((e) => {
    const forum = forumsByCode[e.forum_code];
    const talks = forum.talks ?? [];
    const counts = allocate(talks.length, sessions.map((s) => s.e - s.s));
    // slice talks into per-session groups, preserving original indices
    const groups: { t: Talk; i: number }[][] = [];
    let p = 0;
    for (const c of counts) {
      groups.push(talks.slice(p, p + c).map((t, k) => ({ t, i: p + k })));
      p += c;
    }
    const roomStr = (e.room ?? forum.room ?? "—").replace(/\s+/g, " ").trim() || "—";
    return { forum, code: e.forum_code, room: roomStr, groups };
  });

  // Session band height = tallest forum's talk count in that session × row height
  // (so every column shares the same band boundaries → the break bands line up).
  const segMax = sessions.map((_s, si) =>
    Math.max(0, ...talksPerForum.map((f) => f.groups[si]?.length ?? 0)),
  );
  const segHeight = sessions.map((_s, si) => Math.max(segMax[si] * ROW_H, MIN_SEG_H));

  // Lay bands out vertically (shared Y across all columns).
  const bands: Band[] = [];
  let y = 0;
  for (const pb of preBands) {
    if (pb.kind === "session") {
      const si = segIndex.get(pb.seg) as number;
      const h = segHeight[si];
      bands.push({ kind: "session", s: pb.seg.s, e: pb.seg.e, top: y, h, seg: si });
      y += h;
    } else {
      bands.push({ kind: "break", s: pb.b.s, e: pb.b.e, top: y, h: BRK_H, name: pb.b.name, start: pb.b.start, end: pb.b.end });
      y += BRK_H;
    }
  }
  const totalH = y;

  // Place each forum's cells inside its session bands (evenly within each band).
  const columns: UCol[] = talksPerForum.map((f) => {
    const cells: UCell[] = [];
    bands.forEach((band) => {
      if (band.kind !== "session") return;
      const group = f.groups[band.seg] ?? [];
      const ch = group.length ? band.h / group.length : band.h;
      group.forEach((g, k) => {
        cells.push({ t: g.t, i: g.i, no: g.i + 1, top: band.top + k * ch, h: ch });
      });
    });
    return {
      forum: f.forum,
      code: f.code,
      key: f.code,
      room: f.room,
      cells,
      empty: (f.forum.talks ?? []).length === 0,
    };
  });

  // 我的关注 filter: keep follow-relevant cells; drop columns with none.
  const shown = filtered
    ? columns
        .map((c) => ({ ...c, cells: c.cells.filter((cell) => relevant(c.code, cell.i, cell.t)), empty: false }))
        .filter((c) => c.cells.length > 0)
    : columns;

  if (filtered && shown.length === 0) {
    return <div className="tgrid__empty">{tr("timeline.noFollows")}</div>;
  }

  // Axis anchors: only real times — each band boundary, plus the window end.
  const ticks: { top: number; label: string }[] = [];
  const seen = new Set<number>();
  for (const b of bands) {
    if (!seen.has(b.top)) {
      ticks.push({ top: b.top, label: fmt(b.s) });
      seen.add(b.top);
    }
  }
  if (haveWindow && !seen.has(totalH)) ticks.push({ top: totalH, label: fmt(hi) });

  // "Now" line — only on today's tab and inside the window; positioned within its
  // band by real time (bands are contiguous over the window).
  const { todayStr, nowMin } = now;
  const showNow = !!date && date === todayStr && haveWindow && nowMin >= lo && nowMin <= hi;
  let nowY = 0;
  if (showNow) {
    const band = bands.find((b) => nowMin >= b.s && nowMin <= b.e) ?? bands[bands.length - 1];
    nowY = band.top + ((nowMin - band.s) / Math.max(band.e - band.s, 1)) * band.h;
  }

  const breakBands = bands.filter((b): b is Extract<Band, { kind: "break" }> => b.kind === "break");

  return (
    <div className="tgrid ufg" role="grid" aria-label={tr("timeline.aria")}>
      <div className="tgrid__inner">
        {/* time gutter (real anchors only) */}
        <div className="tgrid__gutter">
          <div className="tgrid__ghead" />
          <div className="tgrid__gbody" style={{ height: totalH }}>
            {ticks.map((tk) => (
              <div key={tk.top} className="tgrid__htick" style={{ top: tk.top }}>
                <span className="tgrid__hlabel">{tk.label}</span>
              </div>
            ))}
            {showNow && (
              <div className="tgrid__now" style={{ top: nowY }}>
                <span className="tgrid__nowpill mono">{fmt(nowMin)}</span>
                <span className="tgrid__nowdot" />
              </div>
            )}
          </div>
        </div>

        {/* one column per forum */}
        {shown.map((c) => (
          <div className="tgrid__col" key={c.key}>
            <Link to={`/${confId}/forum/${c.code}`} className="tgrid__chead" title={c.forum.title.zh}>
              <span className="tgrid__croom">
                <Icon name="pin" size={10} /> {c.room}
              </span>
              <span className="tgrid__ctitle">{c.forum.title.zh}</span>
            </Link>
            <div className="tgrid__cbody" style={{ height: totalH }}>
              {ticks.map((tk) => (
                <div key={tk.top} className="tgrid__line" style={{ top: tk.top }} />
              ))}
              {showNow && <div className="tgrid__nowline" style={{ top: nowY }} />}
              {c.cells.map((cell) => {
                const sp = cell.t.speakers?.[0];
                const to = `/${confId}/forum/${c.code}#talk-${cell.i + 1}`;
                const key = `${c.key}#${cell.i}`;
                const open = coarse && openKey === key;
                const inner = (
                  <>
                    <span className="ufg__no mono">{pad(cell.no)}</span>
                    <span className="tgrid__ttitle">
                      {cell.t.title_status === "tbd" ? tr("timeline.tbd") : cell.t.title?.zh}
                    </span>
                    {sp?.name && <span className="tgrid__tspk">{sp.name}</span>}
                  </>
                );
                const style = { top: cell.top, height: cell.h, minHeight: cell.h };
                // Coarse pointer (touch): tap expands the card in place, then an
                // explicit enter button navigates — matching TimeGrid, so touch
                // users don't lose the compressed content behind an instant jump.
                if (coarse) {
                  return (
                    <div
                      key={cell.i}
                      className={`tgrid__talk tgrid__talk--u ${open ? "is-open" : ""}`}
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
                  <Link
                    key={cell.i}
                    to={to}
                    className="tgrid__talk tgrid__talk--u"
                    style={style}
                  >
                    {inner}
                  </Link>
                );
              })}
              {c.empty && <div className="tgrid__more">{tr("common.pending")}</div>}
            </div>
          </div>
        ))}

        {/* shared break bands — one full-width highlighted strip per break, at its
            true time, spanning every column (the parallel forums pause together). */}
        {breakBands.map((b) => (
          <div
            key={b.top}
            className="ufg__break"
            style={{ top: `calc(var(--tg-head) + ${b.top}px)`, height: b.h }}
            aria-hidden
          >
            <span className="ufg__break-label">
              <Icon name="coffee" size={12} />
              <span className="mono">
                {b.start}
                {b.end ? `–${b.end}` : ""}
              </span>
              {b.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
