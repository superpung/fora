import { useMemo, type KeyboardEvent } from "react";
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
// topic, position = which topics travel together (each topic is dropped beside
// the ones it co-occurs with). Selecting a topic lights up its links, dims the
// rest, and lists its talks below. See lib/topics.ts for the layout — it is a
// pure function of the dataset, so the map is identical on every load.

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
    tabbable and driven by Enter/Space, so the map is never hover-only. */
function TopicBubble({
  node,
  state,
  onSelect,
}: {
  node: TopicNode;
  state: "idle" | "selected" | "related" | "dimmed";
  onSelect: (key: string) => void;
}) {
  const { t } = useI18n();
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onSelect(node.key);
  };
  // Multi-line labels straddle the centre; one-line labels sit on it. The
  // rhythm is the fitter's, so what was measured is what gets drawn.
  const lineH = node.fontSize * LINE_HEIGHT;
  const top = -((node.lines.length - 1) * lineH) / 2;
  return (
    <g
      className={`tmap__node is-${state}`}
      transform={`translate(${node.x} ${node.y})`}
      role="button"
      tabIndex={0}
      aria-pressed={state === "selected"}
      aria-label={t(node.count === 1 ? "topics.bubbleAriaOne" : "topics.bubbleAria", {
        topic: node.label,
        n: node.count,
      })}
      onClick={() => onSelect(node.key)}
      onKeyDown={onKeyDown}
    >
      <circle className="tmap__bubble" r={node.r} />
      <text className="tmap__label" fontSize={node.fontSize} textAnchor="middle">
        {node.lines.map((line, i) => (
          <tspan key={i} x={0} y={top + i * lineH} dominantBaseline="central">
            {line}
          </tspan>
        ))}
      </text>
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

  const node = selected ? map.byKey.get(selected) : undefined;
  const links = useMemo(() => {
    if (!node) return map.backbone;
    return map.neighbors.get(node.key) ?? [];
  }, [node, map]);
  const relatedKeys = useMemo(() => {
    if (!node) return null;
    return new Set((map.neighbors.get(node.key) ?? []).map((e) => otherEnd(e, node.key)));
  }, [node, map]);

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

      {/* Honesty about scope: the map only speaks for the talks that carry a
          tag, and not at all for forums whose agenda is still unparsed. */}
      <p className="tmap__coverage">
        {t("topics.coverage", {
          tagged: map.coverage.tagged,
          total: map.coverage.total,
          topics: map.nodes.length,
        })}
        {map.coverage.pendingForums > 0 &&
          ` · ${t(
            map.coverage.pendingForums === 1 ? "topics.pendingForum" : "topics.pendingForums",
            { n: map.coverage.pendingForums },
          )}`}
      </p>
      <AiNote className="tmap__note" />

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
          {/* Links sit under the bubbles: the strongest co-occurrences overall
              by default, the selected topic's own links when one is picked. */}
          <g className="tmap__links" aria-hidden>
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
                  strokeWidth={1 + 2.6 * (e.w / maxLinkWeight)}
                  strokeOpacity={0.2 + 0.55 * (e.w / maxLinkWeight)}
                />
              );
            })}
          </g>
          {map.nodes.map((n) => (
            <TopicBubble
              key={n.key}
              node={n}
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

            <div className="tmapsel__talks">
              {node.talks.map((talk) => (
                <TopicTalkRow key={`${talk.forumCode}:${talk.index}`} talk={talk} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
