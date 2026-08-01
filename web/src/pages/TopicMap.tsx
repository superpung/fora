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
  skeletonMosaic,
  otherEnd,
  MAP_ASPECTS,
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
// The map is a mosaic — one tile per topic, its AREA the number of talks that
// carry it, laid out biggest-first so the shape of the program is readable in
// the first second. Picking a tile lists its talks below and marks the topics
// it travels with. See lib/topics.ts for the layout: a pure function of the
// dataset and the box, so the mosaic is identical on every load.
//
// The tiles are positioned in `cqw` — hundredths of the mosaic's own width —
// and the mosaic is a container query, so one layout scales from a phone to a
// wide screen with nothing to recompute. Only the box's proportions change, at
// the two breakpoints below, and those do rebuild it: a layout squarified for a
// wide screen becomes a stack of slivers in a phone-shaped box.

/** How the talks under the selected topic are grouped. */
type GroupMode = "forum" | "day" | "none";
const GROUP_MODES: GroupMode[] = ["forum", "day", "none"];

/** The floor on how long the loading state stays up. Building the mosaic is the
    one piece of real work this page does (every talk, every tag, every pair)
    and it only happens on the first open; without a floor the result can land
    inside a single frame and the page just blinks. */
const MIN_BUILD_MS = 480;

interface TalkGroup {
  key: string;
  /** Null in "none" mode — the list is then rendered without headings. */
  label: string | null;
  sub?: string;
  talks: TopicTalk[];
}

/** The proportions of the box the mosaic is laid out for. A wide screen gets a
    letterbox; a phone gets something closer to a square, where forty tiles can
    still be lettered. */
function pickAspect(): number {
  if (typeof window === "undefined" || !window.matchMedia) return MAP_ASPECTS.wide;
  if (window.matchMedia("(min-width: 900px)").matches) return MAP_ASPECTS.wide;
  if (window.matchMedia("(min-width: 620px)").matches) return MAP_ASPECTS.mid;
  return MAP_ASPECTS.narrow;
}

function useMapAspect(): number {
  const [aspect, setAspect] = useState(pickAspect);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const queries = [
      window.matchMedia("(min-width: 900px)"),
      window.matchMedia("(min-width: 620px)"),
    ];
    const sync = () => setAspect(pickAspect());
    for (const q of queries) q.addEventListener("change", sync);
    return () => {
      for (const q of queries) q.removeEventListener("change", sync);
    };
  }, []);
  return aspect;
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

/** One tile: a real button filling its cell of the mosaic. Everything about it
    — where it sits, how big it is, what size its label is set in — arrives in
    the same unit, so the whole map is one CSS variable away from any width. */
function TopicTile({
  node,
  rank,
  state,
  onSelect,
}: {
  node: TopicNode;
  rank: number;
  state: "idle" | "selected" | "related" | "dimmed";
  onSelect: (key: string) => void;
}) {
  const { t } = useI18n();
  // Each click mounts a fresh ripple, so it replays even on a tile that is
  // already selected. The ripple removes itself when its animation ends.
  const [pulses, setPulses] = useState<number[]>([]);

  return (
    <button
      type="button"
      className={`tmap__tile is-${state}`}
      style={
        {
          left: `${node.x}cqw`,
          top: `${node.y}cqw`,
          width: `${node.w}cqw`,
          height: `${node.h}cqw`,
          "--fs": node.fontSize,
          "--w": node.weight,
          // Tiles arrive in rank order, biggest first, capped so a large
          // vocabulary still finishes arriving in half a second.
          "--in": `${Math.min(rank * 0.014, 0.5)}s`,
        } as CSSProperties
      }
      aria-pressed={state === "selected"}
      aria-label={t(node.count === 1 ? "topics.tileAriaOne" : "topics.tileAria", {
        topic: node.label,
        n: node.count,
      })}
      onClick={() => {
        setPulses((p) => [...p, (p[p.length - 1] ?? 0) + 1]);
        onSelect(node.key);
      }}
    >
      {pulses.map((id) => (
        <span
          key={id}
          className="tmap__pulse"
          aria-hidden
          onAnimationEnd={() => setPulses((p) => p.filter((x) => x !== id))}
        />
      ))}
      <span className="tmap__tiletext">
        <span className="tmap__tilelabel">{node.short}</span>
        {node.showCount && <span className="tmap__tilen mono">{node.count}</span>}
      </span>
    </button>
  );
}

export default function TopicMap() {
  const { id: confId, conference } = useConference();
  const { t, lang } = useI18n();
  const aspect = useMapAspect();
  // Built on first open, memoised per conference / language / box shape (see
  // lib/topics.ts). Cold, it is computed off the click's frame and the mosaic
  // shows its skeleton meanwhile; warm, it is simply there.
  const [map, setMap] = useState<TopicMapData | null>(() =>
    hasTopicMap(confId, lang, aspect) ? topicMapFor(confId, conference, lang, aspect) : null,
  );
  useEffect(() => {
    if (hasTopicMap(confId, lang, aspect)) {
      setMap(topicMapFor(confId, conference, lang, aspect));
      return;
    }
    setMap(null);
    const started = Date.now();
    let hold = 0;
    const id = window.setTimeout(() => {
      const built = topicMapFor(confId, conference, lang, aspect);
      hold = window.setTimeout(
        () => setMap(built),
        Math.max(0, MIN_BUILD_MS - (Date.now() - started)),
      );
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(hold);
    };
  }, [confId, conference, lang, aspect]);

  // Sticky so a trip into a forum page and browser Back restores the selection,
  // matching the speakers/schedule filters.
  const [selected, setSelected] = useStickyState<string | null>(`${confId}:tmap.sel`, null);
  const [group, setGroup] = useStickyState<GroupMode>(`${confId}:tmap.group`, "forum");

  const node = selected ? map?.byKey.get(selected) : undefined;
  const relatedKeys = useMemo(() => {
    if (!node || !map) return null;
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

  const skeleton = useMemo(() => skeletonMosaic(aspect), [aspect]);
  const select = (key: string) => setSelected((cur) => (cur === key ? null : key));

  if (map && map.nodes.length === 0) {
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

      {map ? (
        <div
          className={`tmap__mosaic ${node ? "is-selecting" : ""}`}
          style={{ aspectRatio: `${map.aspect}` } as CSSProperties}
          role="group"
          aria-label={t("topics.mapAria")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
        >
          {map.nodes.map((n, i) => (
            <TopicTile
              key={n.key}
              node={n}
              rank={i}
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
        </div>
      ) : (
        // The wait wears the shape of the answer: the same mosaic, in the same
        // rhythm, with the light sweeping across it.
        <div
          className="tmap__mosaic tmap__mosaic--wait"
          style={{ aspectRatio: `${aspect}` } as CSSProperties}
          aria-live="polite"
          aria-label={t("common.loading")}
        >
          {skeleton.map((c, i) => (
            <span
              key={i}
              className="tmap__skel"
              style={
                {
                  left: `${c.x}cqw`,
                  top: `${c.y}cqw`,
                  width: `${c.w}cqw`,
                  height: `${c.h}cqw`,
                  "--i": i,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

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
