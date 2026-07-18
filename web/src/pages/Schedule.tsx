import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { formatDate, todayISO } from "../lib/data";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useStickyState } from "../lib/sticky-state";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import Icon, { type IconName } from "../components/Icon";
import TimeGrid from "../components/TimeGrid";
import UntimedForumGrid from "../components/UntimedForumGrid";
import type { Block, Forum, Talk, Break } from "../types";

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
  | { kind: "talk"; start?: string | null; end?: string | null; talk: Talk }
  | { kind: "break"; start?: string | null; end?: string | null; brk: Break };

function chronoRows(block: Block): Row[] {
  const rows: Row[] = [
    ...(block.talks ?? []).map(
      (t): Row => ({ kind: "talk", start: t.start, end: t.end, talk: t }),
    ),
    ...(block.breaks ?? []).map(
      (b): Row => ({ kind: "break", start: b.start, end: b.end, brk: b }),
    ),
  ];
  return rows.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
}

function KeynotesBlock({ block }: { block: Block }) {
  const { t } = useI18n();
  return (
    <div className="talklist">
      {chronoRows(block).map((row, i) =>
        row.kind === "break" ? (
          <div key={`br${i}`} className="breakrow">
            <TimeRange start={row.start} end={row.end} />
            <span className="breakrow__label">
              <Icon name="coffee" size={14} /> {row.brk.name}
            </span>
          </div>
        ) : (
          <motion.div key={`t${i}`} variants={riseItem} className="talkrow">
            <div className="talkrow__time">
              <TimeRange start={row.start} end={row.end} />
            </div>
            <div className="talkrow__body">
              {row.talk.type === "opening" ? (
                <div className="talkrow__title">{row.talk.title?.zh}</div>
              ) : (
                <>
                  <div className="talkrow__title">
                    {row.talk.title_status === "tbd" ? (
                      <span className="tag tag--tbd">{t("schedule.talkTbd")}</span>
                    ) : (
                      row.talk.title?.zh
                    )}
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
  const { id: confId, days, venueName } = useConference();
  const { t, lang } = useI18n();
  const { forums, speakers, talks } = useFollow();
  const followCount = forums.size + speakers.size + talks.size;
  // Sticky so returning from a forum page restores the day tab and follow filter
  // (paired with scroll restoration), keyed by conference so a switch is fresh.
  const [onlyFollowed, setOnlyFollowed] = useStickyState(`${confId}:sched.followed`, false);
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
  // In the follow view only the forum timeline is meaningful (that's where a
  // "room / forum" lives); non-forum blocks — keynotes, check-in, committee
  // meetings, breaks — aren't followable, so hide them while filtering.
  const blocks = onlyFollowed
    ? day.blocks.filter((b) => b.kind === "forums")
    : day.blocks;

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
        <button
          className={`filterchip ${onlyFollowed ? "is-on" : ""}`}
          onClick={() => setOnlyFollowed((v) => !v)}
          title={t("timeline.onlyFollowsTip")}
          aria-pressed={onlyFollowed}
        >
          <Icon name="star" filled={onlyFollowed} size={14} />
          <span className="filterchip__label">{t("timeline.onlyFollows")}</span>
          {followCount ? <span className="filterchip__n">{followCount}</span> : null}
        </button>
      </div>

      {/* day tabs */}
      <div className="daytabs">
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

      <AnimatePresence mode="wait">
        <motion.div
          key={day.date}
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

          <div className="blocks">
            {onlyFollowed && blocks.length === 0 && (
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

                {block.kind === "keynotes" && <KeynotesBlock block={block} />}
                {block.kind === "forums" && <ForumsBlock block={block} date={day.date} filtered={onlyFollowed} />}
                {block.kind === "committee_meetings" && <MeetingsBlock block={block} />}
                {block.note && <div className="simplerow">{block.note}</div>}
              </motion.section>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
