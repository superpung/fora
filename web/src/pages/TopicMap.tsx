import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { useStickyState } from "../lib/sticky-state";
import { pageVariants } from "../lib/motion";
import { formatDate } from "../lib/data";
import {
  topicMapFor,
  hasTopicMap,
  otherEnd,
  type TopicMapData,
  type TopicNode,
  type TopicTalk,
} from "../lib/topics";
import { topicLabel } from "../lib/topic-labels";
import { AiNote, AiBadge } from "../components/AiMark";
import Icon from "../components/Icon";

// "Conference at a glance": what this year is actually about, drawn from the
// AI-derived topic tags. The whole page is AI-derived content, so App.tsx only
// mounts the route (and Nav only shows the entry) while useAi().enabled is on.
//
// The map is a knowledge graph: a disc per topic, its area the number of talks
// carrying it, joined to the topics it shares talks with and placed by those
// ties. See lib/topics.ts for the layout — a deterministic relaxation, so the
// graph is identical on every load.
//
// Two layers: an SVG of the links, and the nodes as real <button>s on top. The
// nodes are HTML because they are controls — focus ring, hover, aria-pressed
// and a label that wraps like text all come for free, and none of them do in
// SVG. The graph is laid out for the width it is actually rendered at (the
// observer below), so nothing is scaled up or down after the fact: a disc is
// the same size on a phone as the count deserves.

/** How the talks under the selected topic are grouped. */
type GroupMode = "forum" | "day" | "none";
const GROUP_MODES: GroupMode[] = ["forum", "day", "none"];

/** The floor on how long the loading state stays up. Laying out the graph is
    the one piece of real work this page does (every talk, every tag, every
    pair, then the relaxation) and it only happens on the first open; without a
    floor the result can land inside a single frame and the page just blinks. */
const MIN_BUILD_MS = 480;

/** The box the graph is laid out for, from the width it has to live in. Wide
    screens get a letterbox; a phone gets something closer to a portrait, where
    forty labelled nodes still have somewhere to go. */
function boxFor(width: number): { w: number; h: number } {
  if (width <= 0) return { w: 0, h: 0 };
  const ratio = width >= 900 ? 0.52 : width >= 620 ? 0.85 : 2.45;
  return { w: width, h: Math.round(width * ratio) };
}

interface TalkGroup {
  key: string;
  /** Null in "none" mode — the list is then rendered without headings. */
  label: string | null;
  sub?: string;
  talks: TopicTalk[];
}

/** The rendered width of the graph, rounded to a step so a drag of the window
    edge does not rebuild the layout on every pixel. */
function useBoxWidth(): [number, (el: HTMLDivElement | null) => void] {
  const [width, setWidth] = useState(0);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!node) return;
    if (typeof ResizeObserver === "undefined") {
      setWidth(Math.round(node.clientWidth / 40) * 40);
      return;
    }
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width / 40) * 40);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [width, setNode];
}

/** One talk under the selected topic, linking into the forum page's anchor. */
function TopicTalkRow({ talk }: { talk: TopicTalk }) {
  const { id: confId } = useConference();
  const { t, lang } = useI18n();
  const dateInfo = talk.date ? formatDate(talk.date, lang) : null;
  return (
    <Link
      className="tmaptalk"
      to={`/${confId}/forum/${talk.forumCode}#talk-${talk.index + 1}`}
    >
      <span className="tmaptalk__title">
        {talk.titleTbd ? <span className="muted-i">{t("forum.titleTbd")}</span> : talk.title}
      </span>
      <span className="tmaptalk__meta">
        <span className="tmaptalk__code mono">{talk.forumCode}</span>
        <span className="tmaptalk__forum">{talk.forumTitle}</span>
        {talk.room && (
          <span className="tmaptalk__bit">
            <Icon name="pin" size={11} /> {talk.room}
          </span>
        )}
        {dateInfo && (
          <span className="tmaptalk__bit mono">
            {dateInfo.md}
            {talk.period ? ` ${t(`period.${talk.period}`)}` : ""}
          </span>
        )}
        {talk.start && (
          <span className="tmaptalk__bit mono">
            <Icon name="clock" size={11} /> {talk.start}
            {talk.end ? `–${talk.end}` : ""}
          </span>
        )}
      </span>
      <span className="tmaptalk__chev" aria-hidden>
        <Icon name="chevron-right" size={15} />
      </span>
    </Link>
  );
}

/** One node: the disc, and its label under it. The whole thing is the control,
    so the label is part of the target — a 12px disc on its own is not. */
function TopicDot({
  node,
  rank,
  state,
  onSelect,
  onHover,
}: {
  node: TopicNode;
  rank: number;
  state: "idle" | "selected" | "near" | "far";
  onSelect: (key: string) => void;
  onHover: (key: string | null) => void;
}) {
  const { t } = useI18n();
  // Each click mounts a fresh ring, so the ripple restarts even on a node that
  // is already selected. The ring removes itself when its animation ends.
  const [pulses, setPulses] = useState<number[]>([]);

  return (
    <button
      type="button"
      className={`tmap__node is-${state}`}
      style={
        {
          left: `${node.x}px`,
          top: `${node.y - node.r}px`,
          "--r": `${node.r}px`,
          "--w": node.weight,
          // A topic whose family the vocabulary does not name keeps the hue
          // slot empty and is drawn at zero saturation — grey, not guessed.
          "--h": node.hue ?? 0,
          "--s": node.hue == null ? "0%" : undefined,
          // Nodes arrive in rank order, biggest first, capped so a large
          // vocabulary still finishes arriving in half a second.
          "--in": `${Math.min(rank * 0.012, 0.42)}s`,
        } as CSSProperties
      }
      aria-pressed={state === "selected"}
      aria-label={t(node.count === 1 ? "topics.nodeAriaOne" : "topics.nodeAria", {
        topic: node.label,
        n: node.count,
      })}
      onPointerEnter={() => onHover(node.key)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(node.key)}
      onBlur={() => onHover(null)}
      onClick={() => {
        setPulses((p) => [...p, (p[p.length - 1] ?? 0) + 1]);
        onSelect(node.key);
      }}
    >
      <span className="tmap__disc" aria-hidden>
        {pulses.map((id) => (
          <span
            key={id}
            className="tmap__pulse"
            onAnimationEnd={() => setPulses((p) => p.filter((x) => x !== id))}
          />
        ))}
      </span>
      <span className="tmap__name">{node.short}</span>
    </button>
  );
}

export default function TopicMap() {
  const { id: confId, conference } = useConference();
  const { t, lang } = useI18n();
  const [width, attachBox] = useBoxWidth();
  const box = useMemo(() => boxFor(width), [width]);

  // Built on first open, memoised per conference / language / box (see
  // lib/topics.ts). Cold, it is computed off the frame that paints the page and
  // the graph shows its loading state meanwhile; warm, it is simply there.
  const [map, setMap] = useState<TopicMapData | null>(null);
  useEffect(() => {
    if (box.w <= 0) return;
    if (hasTopicMap(confId, lang, box.w, box.h)) {
      setMap(topicMapFor(confId, conference, lang, box.w, box.h));
      return;
    }
    setMap(null);
    const started = Date.now();
    let hold = 0;
    const id = window.setTimeout(() => {
      const built = topicMapFor(confId, conference, lang, box.w, box.h);
      hold = window.setTimeout(
        () => setMap(built),
        Math.max(0, MIN_BUILD_MS - (Date.now() - started)),
      );
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(hold);
    };
  }, [confId, conference, lang, box.w, box.h]);

  // Sticky so a trip into a forum page and browser Back restores the selection,
  // matching the speakers/schedule filters.
  const [selected, setSelected] = useStickyState<string | null>(`${confId}:tmap.sel`, null);
  const [group, setGroup] = useStickyState<GroupMode>(`${confId}:tmap.group`, "forum");
  // Hovering a node lights its own corner of the graph. Not sticky: it is a
  // pointer state, and it must not survive the pointer.
  const [hover, setHover] = useState<string | null>(null);

  const node = selected ? map?.byKey.get(selected) : undefined;
  // What the graph is currently lit around: the selection if there is one,
  // otherwise whatever the pointer is on.
  const focusKey = selected ?? hover;
  const nearKeys = useMemo(() => {
    if (!focusKey || !map) return null;
    return new Set((map.neighbors.get(focusKey) ?? []).map((e) => otherEnd(e, focusKey)));
  }, [focusKey, map]);

  // The talks of the selected topic, in the requested grouping. Talks arrive
  // already ordered by date/start/forum, so grouping only has to bucket them:
  // first appearance decides a group's position, which keeps both groupings in
  // the program's own order.
  const groups = useMemo<TalkGroup[]>(() => {
    if (!node) return [];
    if (group === "none") return [{ key: "all", label: null, talks: node.talks }];
    const out: TalkGroup[] = [];
    const byKey = new Map<string, TalkGroup>();
    for (const talk of node.talks) {
      const key = group === "forum" ? talk.forumCode : (talk.date ?? "");
      let g = byKey.get(key);
      if (!g) {
        const date = talk.date ? formatDate(talk.date, lang) : null;
        g =
          group === "forum"
            ? { key, label: talk.forumTitle, sub: talk.forumCode, talks: [] }
            : {
                key,
                label: date ? `${date.md} ${date.weekday}` : t("topics.groupNoDate"),
                talks: [],
              };
        byKey.set(key, g);
        out.push(g);
      }
      g.talks.push(talk);
    }
    return out;
  }, [node, group, lang, t]);

  const select = (key: string) => setSelected((cur) => (cur === key ? null : key));

  // Escape clears the selection from anywhere on the page — by the time a
  // reader wants out, the focus is usually down in the talk list, not on the
  // node they picked. Skipped while a dialog owns the key (search palette,
  // confirm), which closes itself with it.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"]')) return;
      setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, setSelected]);

  if (map && map.nodes.length === 0 && width > 0) {
    return (
      <motion.div
        className="container section"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        <div className="dash__empty">{t("topics.empty")}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="container section tmap"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="section__head">
        <div className="section__titlerow">
          <span className="section__icon" aria-hidden>
            <Icon name="tag" size={19} />
          </span>
          <h2 className="section__title">{t("topics.title")}</h2>
          <AiBadge />
        </div>
      </div>

      {/* One line: the size of what is being looked at, and where it came from.
          The map speaks for the tagged talks and the disclaimer says who wrote
          the tags — anything more belongs in the legend of the map itself. */}
      <div className="tmap__lede">
        <span className="tmap__coverage">
          {map
            ? t("topics.coverage", { tagged: map.coverage.tagged, topics: map.nodes.length })
            : t("common.loading")}
        </span>
        <AiNote className="tmap__note" />
      </div>

      <div
        className={`tmap__canvas ${focusKey ? "is-lit" : ""} ${map ? "" : "is-waiting"}`}
        ref={attachBox}
        style={
          {
            height: box.h ? `${box.h}px` : undefined,
            "--lfs": `${map?.labelFont ?? 11.5}px`,
          } as CSSProperties
        }
        role="group"
        aria-label={t("topics.mapAria")}
        onPointerLeave={() => setHover(null)}
      >
        {map && (
          <>
            {/* Layer 1: the links. They draw themselves in — `pathLength=1`
                makes one dash the whole line whatever its real length, so a
                single offset animation fits every link. */}
            <svg
              className="tmap__links"
              width={map.width}
              height={map.height}
              viewBox={`0 0 ${map.width} ${map.height}`}
              aria-hidden
            >
              {map.links.map((e) => {
                const a = map.byKey.get(e.a);
                const b = map.byKey.get(e.b);
                if (!a || !b) return null;
                const lit = focusKey === e.a || focusKey === e.b;
                return (
                  <line
                    key={`${e.a}|${e.b}`}
                    className={lit ? "is-lit" : ""}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    pathLength={1}
                    strokeWidth={0.8 + 1.9 * e.w}
                  />
                );
              })}
              {/* The selected topic's own ties, including the ones too weak to
                  be part of the drawn backbone: picking a topic is exactly the
                  moment to show everything it touches. */}
              {focusKey &&
                (map.neighbors.get(focusKey) ?? []).map((e) => {
                  const a = map.byKey.get(e.a);
                  const b = map.byKey.get(e.b);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={`lit:${e.a}|${e.b}`}
                      className="tmap__link--focus"
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      pathLength={1}
                      strokeWidth={0.8 + 1.9 * e.w}
                    />
                  );
                })}
            </svg>

            {/* Layer 2: the nodes. */}
            {map.nodes.map((n, i) => (
              <TopicDot
                key={n.key}
                node={n}
                rank={i}
                state={
                  !nearKeys
                    ? "idle"
                    : n.key === focusKey
                      ? "selected"
                      : nearKeys.has(n.key)
                        ? "near"
                        : "far"
                }
                onSelect={select}
                onHover={setHover}
              />
            ))}
          </>
        )}
        {!map && width > 0 && (
          // The wait says what is being built: a handful of nodes finding their
          // places, on the same canvas, breathing.
          <div className="tmap__wait" aria-live="polite" aria-label={t("common.loading")}>
            {WAIT_DOTS.map((d, i) => (
              <span
                key={i}
                className="tmap__waitdot"
                style={
                  {
                    left: `${d[0] * 100}%`,
                    top: `${d[1] * 100}%`,
                    "--r": `${d[2]}px`,
                    "--i": i,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {node && map && (
          <motion.section
            className="tmapsel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="tmapsel__head">
              <h3 className="tmapsel__title">{node.label}</h3>
              <span className="tmapsel__count mono">
                {t("common.reportsCount", { n: node.count })}
              </span>
              <button
                className="iconbtn tmapsel__close"
                onClick={() => setSelected(null)}
                aria-label={t("topics.clear")}
                title={t("topics.clear")}
              >
                <Icon name="x" size={15} />
              </button>
            </header>

            {(map.neighbors.get(node.key) ?? []).length > 0 && (
              <div className="tmapsel__related">
                <span className="tmapsel__rellabel">{t("topics.related")}</span>
                {(map.neighbors.get(node.key) ?? []).slice(0, 8).map((e) => {
                  const key = otherEnd(e, node.key);
                  return (
                    <button key={key} className="tmapsel__chip" onClick={() => select(key)}>
                      {topicLabel(key, lang)}
                      <span className="tmapsel__chipn mono">{e.n}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* A topic's talks are scattered across the program — which forum
                they sit in, and which day they run, are the two things a reader
                actually navigates by. Both, or neither, on request. */}
            <div className="tmapsel__groupbar">
              <span className="tmapsel__rellabel">{t("topics.groupBy")}</span>
              <div className="seg" role="group" aria-label={t("topics.groupBy")}>
                {GROUP_MODES.map((m) => (
                  <button
                    key={m}
                    className={`seg__btn ${group === m ? "is-on" : ""}`}
                    aria-pressed={group === m}
                    onClick={() => setGroup(m)}
                  >
                    {t(`topics.group.${m}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="tmapsel__talks">
              {groups.map((g) => (
                <motion.div
                  className="tmapgrp"
                  key={`${group}:${g.key}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {g.label && (
                    <div className="tmapgrp__head">
                      {g.sub && <span className="tmapgrp__code mono">{g.sub}</span>}
                      <span className="tmapgrp__label">{g.label}</span>
                      <span className="tmapgrp__n mono">{g.talks.length}</span>
                    </div>
                  )}
                  {g.talks.map((talk) => (
                    <TopicTalkRow key={`${talk.forumCode}:${talk.index}`} talk={talk} />
                  ))}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Where the loading state's nodes sit, as fractions of the canvas, and how big
    they are. A fixed constellation — it stands for a graph being placed, so it
    is laid out like one. */
const WAIT_DOTS: [number, number, number][] = [
  [0.5, 0.46, 26],
  [0.31, 0.3, 18],
  [0.68, 0.28, 20],
  [0.72, 0.66, 16],
  [0.28, 0.68, 14],
  [0.15, 0.48, 11],
  [0.86, 0.46, 12],
  [0.45, 0.16, 10],
  [0.56, 0.82, 10],
  [0.38, 0.86, 8],
];
