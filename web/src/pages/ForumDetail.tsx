import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { getForum, formatDate, periodLabel } from "../lib/data";
import { useFollow } from "../lib/follow";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import type { Person } from "../types";

function Avatar({ name }: { name?: string }) {
  return <span className="avatar" aria-hidden>{name?.[0] ?? "·"}</span>;
}

function PersonLine({ p, role }: { p: Person; role?: string }) {
  const [open, setOpen] = useState(false);
  const { isSpeaker, toggleSpeaker } = useFollow();
  const followed = p.name ? isSpeaker(p.name) : false;
  return (
    <div className="person">
      <Avatar name={p.name} />
      <div className="person__body">
        <div className="person__head">
          <span className="person__name">{p.name}</span>
          {p.name && (
            <button
              className={`star star--sm ${followed ? "is-on" : ""}`}
              aria-pressed={followed}
              title={followed ? `取消关注 ${p.name}` : `关注 ${p.name}`}
              onClick={() => toggleSpeaker(p.name)}
            >
              {followed ? "★" : "☆"}
            </button>
          )}
          {role && <span className="tag tag--code">{role}</span>}
          {p.honorifics?.map((h) => (
            <span key={h} className="tag">{h}</span>
          ))}
        </div>
        <div className="person__aff">{p.affiliation_raw}</div>
        {p.bio && (
          <>
            <button className="person__toggle" onClick={() => setOpen((v) => !v)}>
              {open ? "收起简介" : "个人简介"}
              <span className={`caret ${open ? "caret--up" : ""}`}>⌄</span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.p
                  className="person__bio"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {p.bio}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

export default function ForumDetail() {
  const { code } = useParams();
  const forum = code ? getForum(code) : undefined;
  const { isForum, toggleForum } = useFollow();
  const forumFollowed = code ? isForum(code) : false;

  if (!forum) {
    return (
      <div className="container section">
        <p>未找到论坛 {code}。</p>
        <Link to="/schedule" className="btn btn--ghost">返回日程</Link>
      </div>
    );
  }

  const dateInfo = forum.day_date ? formatDate(forum.day_date) : null;

  return (
    <motion.div
      className="container section forumdetail"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Link to="/schedule" className="backlink">← 返回日程</Link>

      <header className="fd__header">
        <div className="fd__badges">
          <span className="tag tag--code">{forum.code}</span>
          {forum.room && <span className="tag tag--room">{forum.room}</span>}
          {forum.sponsor && <span className="tag tag--sponsor">{forum.sponsor}专场</span>}
        </div>
        <div className="fd__titlerow">
          <h1 className="fd__title">{forum.title.zh}</h1>
          <button
            className={`followbtn ${forumFollowed ? "is-on" : ""}`}
            onClick={() => code && toggleForum(code)}
          >
            {forumFollowed ? "★ 已收藏" : "☆ 收藏论坛"}
          </button>
        </div>
        {dateInfo && (
          <div className="fd__when">
            {dateInfo.md} {dateInfo.weekday}
            {forum.session_period && ` · ${periodLabel[forum.session_period]}`}
          </div>
        )}
      </header>

      {forum.description && (
        <motion.p variants={riseItem} initial="initial" animate="animate" className="fd__desc">
          {forum.description}
        </motion.p>
      )}

      {forum.chairs && forum.chairs.length > 0 && (
        <section className="fd__section">
          <h2 className="fd__sectitle">论坛主席</h2>
          <motion.div variants={stagger(0.05, 0.06)} initial="initial" animate="animate">
            {forum.chairs.map((c, i) => (
              <motion.div key={i} variants={riseItem}>
                <PersonLine p={c} role={c.chair_role ?? "论坛主席"} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {forum.detail_extracted && forum.talks && forum.talks.length > 0 ? (
        <section className="fd__section">
          <h2 className="fd__sectitle">论坛报告 · {forum.talks.length}</h2>
          <motion.div
            className="tallist"
            variants={stagger(0.05, 0.07)}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.05 }}
          >
            {forum.talks.map((t, i) => (
              <motion.article key={i} variants={riseItem} className="talkcard">
                <div className="talkcard__idx">{String(i + 1).padStart(2, "0")}</div>
                <div className="talkcard__main">
                  <h3 className="talkcard__title">
                    {t.title_status === "tbd" ? (
                      <span className="tag tag--tbd">报告题目待确认</span>
                    ) : (
                      t.title?.zh
                    )}
                  </h3>
                  {t.flags?.length ? (
                    <div className="talkcard__flag" title={t.flags.join("\n")}>
                      ⚠ 源数据存在标注，已如实保留
                    </div>
                  ) : null}
                  {t.speakers?.map((sp, j) => (
                    <PersonLine key={j} p={sp} />
                  ))}
                  {t.abstract ? (
                    <p className="talkcard__abstract">{t.abstract}</p>
                  ) : t.abstract_status === "tbd" ? (
                    <p className="talkcard__abstract talkcard__abstract--tbd">
                      演讲摘要待确认
                    </p>
                  ) : null}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </section>
      ) : (
        <section className="fd__section">
          <div className="pending">
            <div className="pending__icon">◷</div>
            <div>
              <div className="pending__title">论坛详情整理中</div>
              <p className="pending__text">
                该论坛的报告与讲者信息以海报形式发布，尚未完成结构化解析。
                当前可见其编号、名称、会议室与时段等总览信息。
              </p>
            </div>
          </div>
        </section>
      )}
    </motion.div>
  );
}
