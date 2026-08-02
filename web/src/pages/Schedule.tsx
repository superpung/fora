import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { formatDate, todayISO } from "../lib/data";
import { useConference } from "../lib/conference-store";
import { useFollow, keynoteId } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useStickyState } from "../lib/sticky-state";
import { useHScroll } from "../lib/hscroll";
import { useNow, isNowWithin } from "../lib/use-now";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import { collectFollowedItems } from "../lib/export";
import Icon, { type IconName } from "../components/Icon";
import TimeGrid from "../components/TimeGrid";
import UntimedForumGrid from "../components/UntimedForumGrid";
import MyDay from "../components/MyDay";
import type { Block, Forum, Talk, Break } from "../types";
import { titleLine } from "../lib/talk-title";

/** True when at least one talk in the day's forum block carries a start time —
    the signal to switch from the forum-card list to the time-vs-forum matrix. */
function hasForumTimes(block: Block, forumsByCode: Record<string, Forum>): boolean {
  return (block.forum_entries ?? []).some((e) =>
    (forumsByCode[e.forum_code]?.talks ?? []).some((t) => t.start),
  );
}

function TimeRange({ start, end }: { start?: string | null; end?: string | null }) {
  if (!start && !end) return null;
  return (
    <span className="time">
      {start}
      {end ? `–${end}` : ""}
    </span>
  );
}

// Merge talks and breaks into a single chronological list so a mid-morning
// tea break sits between the talks it actually falls between — not at the end.
type Row =
  | { kind: "talk"; start?: string | null; end?: string | null; talk: Talk; i: number }
  | { kind: "break"; start?: string | null; end?: string | null; brk: Break };

function chronoRows(block: Block): Row[] {
  const rows: Row[] = [
    // The talk keeps its position in the block: that, plus the day, is the id a
    // keynote is starred under.
    ...(block.talks ?? []).map(
      (t, i): Row => ({ kind: "talk", start: t.start, end: t.end, talk: t, i }),
    ),
    ...(block.breaks ?? []).map(
      (b): Row => ({ kind: "break", start: b.start, end: b.end, brk: b }),
    ),
  ];
  return rows.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
}

function KeynotesBlock({
  block,
  date,
  base = 0,
  keep,
}: {
  block: Block;
  date: string;
  /** how many keynote talks the day's earlier keynote blocks hold — a keynote's
      star id counts across the whole day, not within one block */
  base?: number;
  /** in the follow view, the rows to keep; breaks are context, so they go */
  keep?: (index: number, talk: Talk) => boolean;
}) {
  const { t } = useI18n();
  const now = useNow();
  const rows = keep
    ? chronoRows(block).filter((r) => r.kind === "talk" && keep(base + r.i, r.talk))
    : chronoRows(block);
  return (
    <div className="talklist">
      {rows.map((row, i) =>
        row.kind === "break" ? (
          <div key={`br${i}`} className="breakrow">
            <TimeRange start={row.start} end={row.end} />
            <span className="breakrow__label">
              <Icon name="coffee" size={14} /> {row.brk.name}
            </span>
          </div>
        ) : (
          <motion.div key={`t${i}`} variants={riseItem} className="talkrow">
            <div
              className={`talkrow__time${
                isNowWithin(date, row.start, row.end, now) ? " is-now" : ""
              }`}
            >
              <TimeRange start={row.start} end={row.end} />
            </div>
            <div className="talkrow__body">
              {row.talk.type === "opening" ? (
                <div className="talkrow__title">{row.talk.title?.zh}</div>
              ) : (
                <>
                  <div className="talkrow__title">
                    {(() => {
                      const line = titleLine(row.talk, t("schedule.talkTbd"));
                      return line.own ? (
                        line.text
                      ) : (
                        <span className="tag tag--tbd">{line.text}</span>
                      );
                    })()}
                  </div>
                  <div className="talkrow__speaker">
                    <strong>{row.talk.speakers?.[0]?.name}</strong>
                    {row.talk.speakers?.[0]?.honorifics?.map((h) => (
                      <span key={h} className="tag tag--code">{h}</span>
                    ))}
                    <span className="talkrow__aff">
                      {row.talk.speakers?.[0]?.affiliation_raw}
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ),
      )}
    </div>
  );
}

function ForumsBlock({ block, date, filtered }: { block: Block; date: string; filtered: boolean }) {
  const { forumsByCode } = useConference();
  // Both paths are time-axis boards showing the forums running in parallel: when
  // talks carry real per-talk times, the proportional TimeGrid; otherwise the
  // untimed board that bands the shared window at its real breaks.
  return hasForumTimes(block, forumsByCode) ? (
    <TimeGrid block={block} date={date} filtered={filtered} />
  ) : (
    <UntimedForumGrid block={block} date={date} filtered={filtered} />
  );
}

function MeetingsBlock({ block }: { block: Block }) {
  return (
    <div className="meetlist">
      {(block.meetings ?? []).map((m, i) => (
        <motion.div key={i} variants={riseItem} className="meetrow">
          <span className="tag tag--room">{m.room}</span>
          <TimeRange start={m.start} end={m.end} />
          <span className="meetrow__name">{m.name.zh}</span>
        </motion.div>
      ))}
    </div>
  );
}

const KIND_ICON: Record<string, IconName> = {
  registration: "registration",
  keynotes: "keynotes",
  forums: "forums",
  break: "coffee",
  banquet: "banquet",
  committee_meetings: "committee",
  other: "dot",
};

export default function Schedule() {
  const views = useConference();
  const { id: confId, days, venueName } = views;
  const { t, lang } = useI18n();
  const { forums, speakers, talks, isTalk, isSpeaker } = useFollow();
  // Two questions, asked in order, instead of two controls that both said
  // "mine" and left the reader to work out how they differed:
  //   scope — whose day is this, everyone's or the one I starred?
  //   shape — and if it's mine, laid out across the rooms, or as one walk?
  // Shape only means anything inside "mine", so it only appears there. Sticky so
  // a trip to a forum page and back restores both (paired with scroll
  // restoration), keyed by conference so switching conferences starts fresh.
  const [scope, setScope] = useStickyState<"all" | "mine">(`${confId}:sched.scope`, "all");
  const [shape, setShape] = useStickyState<"board" | "day">(`${confId}:sched.shape`, "day");
  const mine = scope === "mine";

  // Every starred item, resolved to a talk with time/room, grouped by day. Reused
  // by My Day (the day tabs pick which day). Recomputed only when follows change.
  const myDayByDate = useMemo(() => {
    const items = collectFollowedItems({ forums, speakers, talks }, views);
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const arr = map.get(it.date);
      if (arr) arr.push(it);
      else map.set(it.date, [it]);
    }
    return map;
  }, [forums, speakers, talks, views]);
  // Local calendar date (YYYY-MM-DD) for highlighting today's tab and, when the
  // conference is running today, opening on it by default.
  const todayStr = todayISO();
  const hash = useLocation().hash.replace("#", "");
  const initial = days.findIndex((d) => d.date === hash);
  // A hash (deep link) wins; otherwise open on today if the conference runs
  // today, else the first day.
  const todayIdx = days.findIndex((d) => d.date === todayStr);
  const [active, setActive] = useStickyState(`${confId}:sched.active`, () =>
    initial >= 0 ? initial : todayIdx >= 0 ? todayIdx : 0,
  );

  useEffect(() => {
    if (initial >= 0) setActive(initial);
  }, [initial, setActive]);

  const day = days[active];
  // A long conference has more day tabs than a phone can show. Keep the
  // selected day in sight and fade the side that continues.
  const dayTabsRef = useHScroll<HTMLDivElement>([active, lang, days.length]);
  // The toggle reads one day, so its badge counts that day — the same number the
  // view it opens shows, not a site-wide follow total that would disagree.
  const myDayItems = myDayByDate.get(day.date) ?? [];

  // A keynote is followed-relevant when starred or one of its speakers is —
  // the same rule the forum board and My Day use. Its id counts keynote talks
  // across the whole day, so each block starts where the previous one ended.
  const keynoteFollowed = (index: number, talk: Talk) =>
    isTalk(keynoteId(day.date, index)) ||
    (talk.speakers ?? []).some((s) => isSpeaker(s.name));
  const keynoteBase = new Map<Block, number>();
  let keynoteSeen = 0;
  for (const b of day.blocks) {
    if (b.kind !== "keynotes") continue;
    keynoteBase.set(b, keynoteSeen);
    keynoteSeen += (b.talks ?? []).length;
  }
  // In the follow board, a block earns its place by holding something followed.
  // Keynotes are starrable, so the block stays when one of its own is starred —
  // it used to be dropped wholesale, which lost starred keynotes that My Day
  // showed. Check-in, banquets and committee meetings can't be starred at all.
  const boardBlocks = day.blocks.filter(
    (b) =>
      b.kind === "forums" ||
      (b.kind === "keynotes" &&
        (b.talks ?? []).some((t, i) => keynoteFollowed((keynoteBase.get(b) ?? 0) + i, t))),
  );
  const blocks = mine && shape === "board" ? boardBlocks : day.blocks;

  return (
    <motion.div
      className="container section"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="section__head">
        <div className="section__titlerow">
          <span className="section__icon" aria-hidden>
            <Icon name="calendar" size={19} />
          </span>
          <h2 className="section__title">{t("schedule.title")}</h2>
        </div>
        <div className="section__controls">
          <div className="segtoggle" role="tablist" aria-label={t("schedule.scopeLabel")}>
            <button
              role="tab"
              aria-selected={!mine}
              className={`segtoggle__opt ${!mine ? "is-on" : ""}`}
              onClick={() => setScope("all")}
              title={t("schedule.scopeAllTip")}
            >
              <Icon name="calendar" size={13} />
              <span className="segtoggle__label">{t("schedule.scopeAll")}</span>
            </button>
            <button
              role="tab"
              aria-selected={mine}
              className={`segtoggle__opt ${mine ? "is-on" : ""}`}
              onClick={() => setScope("mine")}
              title={t("schedule.scopeMineTip")}
            >
              <Icon name="star" filled={mine} size={13} />
              <span className="segtoggle__label">{t("schedule.scopeMine")}</span>
              {myDayItems.length ? (
                <span className="filterchip__n">{myDayItems.length}</span>
              ) : null}
            </button>
          </div>
          {/* The shape of "mine" — only a choice once there is a "mine". */}
          <AnimatePresence>
            {mine && (
              <motion.div
                className="segtoggle segtoggle--sub"
                role="tablist"
                aria-label={t("schedule.shapeLabel")}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  role="tab"
                  aria-selected={shape === "board"}
                  className={`segtoggle__opt ${shape === "board" ? "is-on" : ""}`}
                  onClick={() => setShape("board")}
                  title={t("schedule.shapeBoardTip")}
                >
                  <Icon name="forums" size={13} />
                  <span className="segtoggle__label">{t("schedule.shapeBoard")}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={shape === "day"}
                  className={`segtoggle__opt ${shape === "day" ? "is-on" : ""}`}
                  onClick={() => setShape("day")}
                  title={t("schedule.shapeDayTip")}
                >
                  <Icon name="clock" size={13} />
                  <span className="segtoggle__label">{t("schedule.shapeDay")}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Day tabs. The bar keeps the sticky backdrop and the rule; the track
          inside it is what scrolls, so the fade at a scrollable edge dims the
          tabs without punching a hole in the backdrop they sit on. */}
      <div className="daytabs">
        <div className="daytabs__track hstrip" ref={dayTabsRef}>
          {days.map((d, i) => {
            const { md, weekday } = formatDate(d.date, lang);
            const isToday = d.date === todayStr;
            return (
              <button
                key={d.date}
                className={`daytab ${i === active ? "is-active" : ""} ${isToday ? "is-today" : ""}`}
                onClick={() => setActive(i)}
              >
                <span className="daytab__md">{md}</span>
                <span className="daytab__wd">{weekday}</span>
                {i === active && (
                  <motion.span
                    layoutId="daytab-bg"
                    className="daytab__bg"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyed by day *and* what is being shown: switching either replaces the
          whole board, so both switches get the same enter/exit motion. Keyed by
          day alone, going back to the full schedule swapped it in with no
          animation at all, while the opposite direction appeared to have one. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${day.date}:${mine ? shape : "all"}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="dayhead">
            <span className="dayhead__venue">
              <Icon name="building" size={13} /> {venueName(day.venue_id)}
            </span>
          </div>

          {mine && shape === "day" ? (
            <MyDay date={day.date} items={myDayItems} />
          ) : (
          <div className="blocks">
            {mine && blocks.length === 0 && (
              <div className="tgrid__empty">{t("timeline.noFollows")}</div>
            )}
            {blocks.map((block, bi) => (
              <motion.section
                key={bi}
                className={`block block--${block.kind}`}
                variants={stagger(0.05, 0.05)}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, amount: 0.1 }}
              >
                <div className="block__head">
                  <span className="block__icon" aria-hidden>
                    <Icon name={KIND_ICON[block.kind] ?? "dot"} size={16} />
                  </span>
                  <h3 className="block__title">
                    {block.title?.zh ?? t(`block.${block.kind}`)}
                  </h3>
                  {(block.start || block.location) && (
                    <span className="block__meta">
                      <TimeRange start={block.start} end={block.end} />
                      {block.location && (
                        <span className="block__loc">
                          <Icon name="pin" size={12} /> {block.location}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {block.kind === "keynotes" && (
                  <KeynotesBlock
                    block={block}
                    date={day.date}
                    base={keynoteBase.get(block) ?? 0}
                    keep={mine ? keynoteFollowed : undefined}
                  />
                )}
                {block.kind === "forums" && (
                  <ForumsBlock block={block} date={day.date} filtered={mine} />
                )}
                {block.kind === "committee_meetings" && <MeetingsBlock block={block} />}
                {block.note && <div className="simplerow">{block.note}</div>}
              </motion.section>
            ))}
          </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
