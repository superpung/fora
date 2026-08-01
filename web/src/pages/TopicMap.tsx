import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { useStickyState } from "../lib/sticky-state";
import { pageVariants } from "../lib/motion";
import { formatDate } from "../lib/data";
import {
  topicMapFor,
  otherEnd,
  LINE_HEIGHT,
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
// The visualization is a bubble constellation: area = how many talks carry the
// topic, colour and position = which topics travel together (each topic is
// dropped beside the ones it co-occurs with, then the cluster settles inward).
// Selecting a topic lights up its links, dims the rest, and lists its talks
// below. See lib/topics.ts for the layout — it is a pure function of the
// dataset, so the map is identical on every load.

/** How the talks under the selected topic are grouped. */
type GroupMode = "forum" | "day" | "none";
const GROUP_MODES: GroupMode[] = ["forum", "day", "none"];

interface TalkGroup {
  key: string;
  /** Null in "none" mode — the list is then rendered without headings. */
  label: string | null;
  sub?: string;
  talks: TopicTalk[];
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

/** A bubble. Rendered as an SVG group that behaves like a toggle button: it is
    tabbable and driven by Enter/Space, so the map is never hover-only.

    The outer group holds the position and the inner one the entrance pop,
    because a CSS animation and a CSS transition cannot share a property. Hover
    and selection then grow the circle's `r` rather than scaling a group, which
    keeps the label at exactly the size the fitter measured it into. */
function TopicBubble({
  node,
  rank,
  gradient,
  state,
  onSelect,
}: {
  node: TopicNode;
  rank: number;
  gradient: string;
  state: "idle" | "selected" | "related" | "dimmed";
  onSelect: (key: string) => void;
}) {
  const { t } = useI18n();
  // Each click mounts a fresh ring, so the ripple restarts even on a bubble
  // that is already selected. The ring removes itself when its animation ends.
  const [pulses, setPulses] = useState<number[]>([]);

  const fire = () => {
    setPulses((p) => [...p, (p[p.length - 1] ?? 0) + 1]);
    onSelect(node.key);
  };
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    fire();
  };
  // Multi-line labels straddle the centre; one-line labels sit on it. The
  // rhythm is the fitter's, so what was measured is what gets drawn.
  const lineH = node.fontSize * LINE_HEIGHT;
  const top = -((node.lines.length - 1) * lineH) / 2;
  return (
    <g
      className={`tmap__node is-${state}`}
      transform={`translate(${node.x} ${node.y})`}
      style={
        {
          "--h": node.hue,
          "--r": node.r,
          // Bubbles arrive in rank order, biggest first, capped so a large
          // vocabulary still finishes arriving in under a second.
          "--in": `${Math.min(rank * 0.022, 0.9)}s`,
        } as CSSProperties
      }
      role="button"
      tabIndex={0}
      aria-pressed={state === "selected"}
      aria-label={t(node.count === 1 ? "topics.bubbleAriaOne" : "topics.bubbleAria", {
        topic: node.label,
        n: node.count,
      })}
      onClick={fire}
      onKeyDown={onKeyDown}
    >
      <g className="tmap__in">
        {pulses.map((id) => (
          <circle
            key={id}
            className="tmap__pulse"
            r={node.r}
            onAnimationEnd={() => setPulses((p) => p.filter((x) => x !== id))}
          />
        ))}
        <circle className="tmap__halo" r={node.r} />
        <circle className="tmap__bubble" r={node.r} fill={`url(#${gradient})`} />
        <text className="tmap__label" fontSize={node.fontSize} textAnchor="middle">
          {node.lines.map((line, i) => (
            <tspan key={i} x={0} y={top + i * lineH} dominantBaseline="central">
              {line}
            </tspan>
          ))}
        </text>
      </g>
    </g>
  );
}

export default function TopicMap() {
  const { id: confId, conference } = useConference();
  const { t, lang } = useI18n();
  // Built lazily on first open and memoised per conference and language (see
  // lib/topics.ts), so returning to the page costs nothing.
  const map = useMemo(() => topicMapFor(confId, conference, lang), [confId, conference, lang]);
  // Sticky so a trip into a forum page and browser Back restores the selection,
  // matching the speakers/schedule filters.
  const [selected, setSelected] = useStickyState<string | null>(`${confId}:tmap.sel`, null);
  const [group, setGroup] = useStickyState<GroupMode>(`${confId}:tmap.group`, "forum");

  const node = selected ? map.byKey.get(selected) : undefined;
  const links = useMemo(() => {
    if (!node) return map.backbone;
    return map.neighbors.get(node.key) ?? [];
  }, [node, map]);
  const relatedKeys = useMemo(() => {
    if (!node) return null;
    return new Set((map.neighbors.get(node.key) ?? []).map((e) => otherEnd(e, node.key)));
  }, [node, map]);

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

  if (map.nodes.length === 0) {
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

  const maxLinkWeight = links.reduce((m, e) => Math.max(m, e.w), 0) || 1;

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
          {t("topics.coverage", { tagged: map.coverage.tagged, topics: map.nodes.length })}
        </span>
        <AiNote className="tmap__note" />
      </div>

      <div className="tmap__canvas">
        <svg
          className={`tmap__svg ${node ? "is-selecting" : ""}`}
          width={map.width}
          height={map.height}
          viewBox={`0 0 ${map.width} ${map.height}`}
          role="group"
          aria-label={t("topics.mapAria")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
        >
          <defs>
            {/* One light source for the whole map: every bubble is lit from the
                same upper-left, which is what makes a flat circle read as a
                sphere. The stops take their hue from the node. */}
            {map.nodes.map((n, i) => (
              <radialGradient
                key={n.key}
                id={`tmapg-${i}`}
                cx="36%"
                cy="28%"
                r="82%"
                style={{ "--h": n.hue } as CSSProperties}
              >
                <stop className="tmap__stop0" offset="0%" />
                <stop className="tmap__stop1" offset="100%" />
              </radialGradient>
            ))}
          </defs>
          {/* Links sit under the bubbles: the strongest co-occurrences overall
              by default, the selected topic's own links when one is picked.
              They draw themselves in — a new selection mounts new lines, so the
              stroke-dash animation replays every time. */}
          <g
            className="tmap__links"
            aria-hidden
            style={node ? ({ "--h": node.hue } as CSSProperties) : undefined}
          >
            {links.map((e) => {
              const a = map.byKey.get(e.a);
              const b = map.byKey.get(e.b);
              if (!a || !b) return null;
              return (
                <line
                  key={`${e.a}|${e.b}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  pathLength={1}
                  strokeWidth={1 + 2.6 * (e.w / maxLinkWeight)}
                  strokeOpacity={0.2 + 0.55 * (e.w / maxLinkWeight)}
                />
              );
            })}
          </g>
          {map.nodes.map((n, i) => (
            <TopicBubble
              key={n.key}
              node={n}
              rank={i}
              gradient={`tmapg-${i}`}
              state={
                !relatedKeys
                  ? "idle"
                  : n.key === selected
                    ? "selected"
                    : relatedKeys.has(n.key)
                      ? "related"
                      : "dimmed"
              }
              onSelect={select}
            />
          ))}
        </svg>
      </div>

      <AnimatePresence initial={false}>
        {node && (
          <motion.section
            className="tmapsel"
            style={{ "--h": node.hue } as CSSProperties}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="tmapsel__head">
              <span className="tmapsel__dot" aria-hidden />
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

            {relatedKeys && relatedKeys.size > 0 && (
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
