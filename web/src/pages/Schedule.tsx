import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { conference, days, formatDate, venueName, blockKindLabel } from "../lib/data";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import type { Block } from "../types";

const daysForumLookup = Object.fromEntries(
  (conference.forums ?? []).map((f) => [f.code, f]),
);

function TimeRange({ start, end }: { start?: string | null; end?: string | null }) {
  if (!start && !end) return null;
  return (
    <span className="time">
      {start}
      {end ? `–${end}` : ""}
    </span>
  );
}

function KeynotesBlock({ block }: { block: Block }) {
  return (
    <div className="talklist">
      {(block.talks ?? []).map((t, i) => (
        <motion.div key={i} variants={riseItem} className="talkrow">
          <div className="talkrow__time">
            <TimeRange start={t.start} end={t.end} />
          </div>
          <div className="talkrow__body">
            {t.type === "opening" ? (
              <div className="talkrow__title">{t.title?.zh}</div>
            ) : (
              <>
                <div className="talkrow__title">
                  {t.title_status === "tbd" ? (
                    <span className="tag tag--tbd">报告题目待定</span>
                  ) : (
                    t.title?.zh
                  )}
                </div>
                <div className="talkrow__speaker">
                  <strong>{t.speakers?.[0]?.name}</strong>
                  {t.speakers?.[0]?.honorifics?.map((h) => (
                    <span key={h} className="tag tag--code">{h}</span>
                  ))}
                  <span className="talkrow__aff">
                    {t.speakers?.[0]?.affiliation_raw}
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      ))}
      {(block.breaks ?? []).map((b, i) => (
        <div key={`br${i}`} className="breakrow">
          <TimeRange start={b.start} end={b.end} />
          <span className="breakrow__label">{b.name}</span>
        </div>
      ))}
    </div>
  );
}

function ForumsBlock({ block }: { block: Block }) {
  return (
    <>
      {(block.breaks ?? []).length > 0 && (
        <div className="forums__breakhint">
          {block.breaks!.map((b) => `${b.name} ${b.start}–${b.end}`).join(" · ")}
        </div>
      )}
      <motion.div
        className="forumgrid"
        variants={stagger(0, 0.035)}
        initial="initial"
        animate="animate"
      >
        {(block.forum_entries ?? []).map((e) => {
          const f = daysForumLookup[e.forum_code];
          return (
            <motion.div key={e.forum_code} variants={riseItem}>
              <Link to={`/forum/${e.forum_code}`} className="forumcard">
                <div className="forumcard__head">
                  <span className="tag tag--code">{e.forum_code}</span>
                  <span className="tag tag--room">{e.room}</span>
                </div>
                <div className="forumcard__title">{f?.title.zh ?? e.forum_code}</div>
                <div className="forumcard__foot">
                  {f?.sponsor && <span className="tag tag--sponsor">{f.sponsor}</span>}
                  {f?.detail_extracted ? (
                    <span className="forumcard__count">
                      {(f.talks ?? []).length} 报告 ›
                    </span>
                  ) : (
                    <span className="forumcard__pending">详情待补 ›</span>
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

const KIND_ICON: Record<string, string> = {
  registration: "✎",
  keynotes: "◆",
  forums: "❖",
  banquet: "♦",
  committee_meetings: "⬡",
  other: "•",
};

export default function Schedule() {
  const hash = useLocation().hash.replace("#", "");
  const initial = days.findIndex((d) => d.date === hash);
  const [active, setActive] = useState(initial >= 0 ? initial : 0);

  useEffect(() => {
    if (initial >= 0) setActive(initial);
  }, [initial]);

  const day = days[active];

  return (
    <motion.div
      className="container section"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="section__head">
        <div className="eyebrow">Program</div>
        <h2 className="section__title">完整日程</h2>
      </div>

      {/* day tabs */}
      <div className="daytabs">
        {days.map((d, i) => {
          const { md, weekday } = formatDate(d.date);
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
            <span className="dayhead__venue">{venueName(day.venue_id)}</span>
          </div>

          <div className="blocks">
            {day.blocks.map((block, bi) => (
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
                    {KIND_ICON[block.kind]}
                  </span>
                  <h3 className="block__title">
                    {block.title?.zh ?? blockKindLabel[block.kind]}
                  </h3>
                  {(block.start || block.location) && (
                    <span className="block__meta">
                      <TimeRange start={block.start} end={block.end} />
                      {block.location && (
                        <span className="block__loc">{block.location}</span>
                      )}
                    </span>
                  )}
                </div>

                {block.kind === "keynotes" && <KeynotesBlock block={block} />}
                {block.kind === "forums" && <ForumsBlock block={block} />}
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
