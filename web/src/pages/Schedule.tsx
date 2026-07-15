import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { formatDate } from "../lib/data";
import { useConference } from "../lib/conference-store";
import { useFollow, talkId } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import Icon, { type IconName } from "../components/Icon";
import TimeGrid from "../components/TimeGrid";
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

function ForumsBlock({ block, filtered }: { block: Block; filtered: boolean }) {
  const { id: confId, forumsByCode } = useConference();
  const { t } = useI18n();
  const { isForum, isTalk, isSpeaker } = useFollow();
  // When talks carry real times, show the time-vs-forum matrix; otherwise the
  // conference only has forum-level slots, so fall back to the card grid.
  if (hasForumTimes(block, forumsByCode)) return <TimeGrid block={block} filtered={filtered} />;
  const entries = (block.forum_entries ?? []).filter((e) => {
    if (!filtered) return true;
    const f = forumsByCode[e.forum_code];
    return (
      isForum(e.forum_code) ||
      (f?.talks ?? []).some((t, i) => isTalk(talkId(e.forum_code, i))) ||
      (f?.talks ?? []).some((t) => (t.speakers ?? []).some((s) => isSpeaker(s.name)))
    );
  });
  return (
    <>
      {!filtered && (block.breaks ?? []).map((b, i) => (
        <div key={`fbr${i}`} className="breakrow breakrow--forums">
          <TimeRange start={b.start} end={b.end} />
          <span className="breakrow__label">
            <Icon name="coffee" size={14} /> {b.name}{t("schedule.breakNote")}
          </span>
        </div>
      ))}
      <motion.div
        className="forumgrid"
        variants={stagger(0, 0.035)}
        initial="initial"
        animate="animate"
      >
        {entries.map((e) => {
          const f = forumsByCode[e.forum_code];
          return (
            <motion.div key={e.forum_code} variants={riseItem}>
              <Link to={`/${confId}/forum/${e.forum_code}`} className="forumcard">
                <span className="forumcard__room mono">
                  <Icon name="pin" size={11} /> {e.room ?? f?.room}
                </span>
                <span className="forumcard__code mono">{e.forum_code}</span>
                <div className="forumcard__title">{f?.title.zh ?? e.forum_code}</div>
                <div className="forumcard__foot">
                  {f?.sponsor && <span className="tag tag--sponsor">{f.sponsor}</span>}
                  {f?.detail_extracted ? (
                    <span className="forumcard__count">
                      {t("common.reportsCount", { n: (f.talks ?? []).length })}
                      <Icon name="chevron-right" size={13} />
                    </span>
                  ) : (
                    <span className="forumcard__pending">
                      {t("common.pending")}
                      <Icon name="chevron-right" size={13} />
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </>
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
  const { days, venueName } = useConference();
  const { t, lang } = useI18n();
  const { forums, speakers, talks } = useFollow();
  const followCount = forums.size + speakers.size + talks.size;
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const hash = useLocation().hash.replace("#", "");
  const initial = days.findIndex((d) => d.date === hash);
  const [active, setActive] = useState(initial >= 0 ? initial : 0);

  useEffect(() => {
    if (initial >= 0) setActive(initial);
  }, [initial]);

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
          return (
            <button
              key={d.date}
              className={`daytab ${i === active ? "is-active" : ""}`}
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
                {block.kind === "forums" && <ForumsBlock block={block} filtered={onlyFollowed} />}
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
