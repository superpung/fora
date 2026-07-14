import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useLocation } from "react-router-dom";
import { getForum, formatDate, periodLabel } from "../lib/data";
import { useFollow, talkId } from "../lib/follow-store";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import type { Person } from "../types";

function PersonLine({ p, role, avatarSize = 40 }: { p: Person; role?: string; avatarSize?: number }) {
  const [open, setOpen] = useState(false);
  const { isSpeaker, toggleSpeaker } = useFollow();
  const followed = p.name ? isSpeaker(p.name) : false;
  return (
    <div className="person">
      <Avatar person={p} size={avatarSize} />
      <div className="person__main">
        <div className="person__head">
          <span className="person__name">{p.name}</span>
          {p.name && (
            <button
              className={`star star--sm ${followed ? "is-on" : ""}`}
              aria-pressed={followed}
              aria-label={followed ? `取消关注 ${p.name}` : `关注 ${p.name}`}
              title={followed ? `取消关注 ${p.name}` : `关注 ${p.name}`}
              onClick={() => toggleSpeaker(p.name)}
            >
              <Icon name="star" filled={followed} size={15} />
            </button>
          )}
          {role && <span className="person__role">{role}</span>}
          {p.honorifics?.map((h) => (
            <span key={h} className="tag">{h}</span>
          ))}
        </div>
        <div className="person__aff">{p.affiliation_raw}</div>
        {p.bio && (
          <>
            <button className="person__toggle" onClick={() => setOpen((v) => !v)}>
              {open ? "收起简介" : "个人简介"}
              <span className={`caret ${open ? "caret--up" : ""}`}>
                <Icon name="chevron-down" size={14} />
              </span>
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
  const { hash } = useLocation();
  const forum = code ? getForum(code) : undefined;
  const { isForum, toggleForum, isTalk, toggleTalk } = useFollow();
  const forumFollowed = code ? isForum(code) : false;

  // deep-link: scroll to a specific talk when arriving with #talk-<index>
  useEffect(() => {
    if (!hash.startsWith("#talk-")) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("talk--highlight");
    });
    // fade the highlight out again so it reads as a transient cue, not a
    // permanent state stuck on whichever talk was last deep-linked.
    const timer = setTimeout(() => el.classList.remove("talk--highlight"), 2400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      el.classList.remove("talk--highlight");
    };
  }, [hash, forum]);

  if (!forum) {
    return (
      <div className="container section">
        <p>未找到论坛 {code}。</p>
        <Link to="/schedule" className="linkbtn">返回日程</Link>
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
      <Link to="/" className="backlink">
        <Icon name="arrow-left" size={14} /> 返回日程面板
      </Link>

      <header className="fd__header">
        <div className="fd__meta">
          <span className="fd__code">{forum.code}</span>
          {forum.room && <span className="fd__room">{forum.room}</span>}
          {dateInfo && (
            <span>
              {dateInfo.md} {dateInfo.weekday}
              {forum.session_period && ` · ${periodLabel[forum.session_period]}`}
            </span>
          )}
          {forum.sponsor && <span className="fd__sponsor">{forum.sponsor}专场</span>}
        </div>
        <div className="fd__titlerow">
          <h1 className="fd__title">{forum.title.zh}</h1>
          <button
            className={`followbtn ${forumFollowed ? "is-on" : ""}`}
            onClick={() => code && toggleForum(code)}
          >
            <Icon name="star" filled={forumFollowed} size={15} />
            {forumFollowed ? "已收藏" : "收藏论坛"}
          </button>
        </div>
      </header>

      {forum.description && (
        <motion.p variants={riseItem} initial="initial" animate="animate" className="fd__desc">
          {forum.description}
        </motion.p>
      )}

      {forum.chairs && forum.chairs.length > 0 && (
        <section className="fd__section">
          <h2 className="fd__sectitle">论坛主席</h2>
          <div className="fd__people">
            {forum.chairs.map((c, i) => (
              <PersonLine key={i} p={c} role={c.chair_role ?? "论坛主席"} />
            ))}
          </div>
        </section>
      )}

      {forum.detail_extracted && forum.talks && forum.talks.length > 0 ? (
        <section className="fd__section">
          <h2 className="fd__sectitle">
            论坛报告 <span className="fd__seccount">{forum.talks.length}</span>
          </h2>
          <motion.div
            className="tallist"
            variants={stagger(0.04, 0.05)}
            initial="initial"
            animate="animate"
          >
            {forum.talks.map((t, i) => {
              const id = talkId(forum.code, i);
              const followed = isTalk(id);
              return (
                <motion.article key={i} id={`talk-${i}`} variants={riseItem} className="talk">
                  <div className="talk__no">{String(i + 1).padStart(2, "0")}</div>
                  <div className="talk__body">
                    <div className="talk__titlerow">
                      <h3 className="talk__title">
                        {t.title_status === "tbd" ? (
                          <span className="muted-i">报告题目待确认</span>
                        ) : (
                          t.title?.zh
                        )}
                      </h3>
                      <button
                        className={`star star--sm talk__star ${followed ? "is-on" : ""}`}
                        aria-pressed={followed}
                        aria-label={followed ? "取消收藏该报告" : "收藏该报告"}
                        title={followed ? "取消收藏该报告" : "收藏该报告"}
                        onClick={() => toggleTalk(id)}
                      >
                        <Icon name="star" filled={followed} size={16} />
                      </button>
                    </div>
                    {t.flags?.length ? (
                      <div className="talk__flag" title={t.flags.join("\n")}>
                        <Icon name="alert" size={13} /> 源数据存在标注，已如实保留
                      </div>
                    ) : null}
                    {t.speakers?.map((sp, j) => (
                      <PersonLine key={j} p={sp} avatarSize={34} />
                    ))}
                    {t.abstract ? (
                      <p className="talk__abstract">{t.abstract}</p>
                    ) : t.abstract_status === "tbd" ? (
                      <p className="talk__abstract muted-i">演讲摘要待确认</p>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </section>
      ) : (
        <section className="fd__section">
          <div className="pending">
            <div className="pending__title">论坛详情整理中</div>
            <p className="pending__text">
              该论坛的报告与讲者信息以海报形式发布，尚未完成结构化解析。
              当前可见其编号、名称、会议室与时段等总览信息。
            </p>
          </div>
        </section>
      )}
    </motion.div>
  );
}
