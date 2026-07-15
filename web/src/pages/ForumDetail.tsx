import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { formatDate, periodLabel } from "../lib/data";
import { useConference } from "../lib/conference-store";
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

/** A talk abstract, clamped to three lines by default with a 展开/收起 toggle
    that animates the height open/closed (same house easing as the bio / talk
    sublist). The toggle only appears when the text actually overflows. */
function Abstract({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [dims, setDims] = useState<{ clamped: number; full: number } | null>(null);
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prev = el.style.height;
    el.style.height = "auto";
    const full = el.scrollHeight;
    el.style.height = prev;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 22;
    const clamped = Math.min(full, Math.round(lh * 3) + 2); // ~3 lines
    setDims({ clamped, full });
  }, [text]);
  const overflowing = dims ? dims.full - dims.clamped > 4 : false;
  return (
    <div className="talk__abstract">
      <motion.p
        ref={ref}
        className="talk__abstracttext"
        style={{ overflow: "hidden" }}
        initial={false}
        animate={{ height: dims ? (open ? dims.full : dims.clamped) : "auto" }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {text}
      </motion.p>
      {(overflowing || open) && (
        <button className="talk__absmore" onClick={() => setOpen((v) => !v)}>
          {open ? "收起" : "展开"}
          <span className={`caret ${open ? "caret--up" : ""}`}>
            <Icon name="chevron-down" size={13} />
          </span>
        </button>
      )}
    </div>
  );
}

export default function ForumDetail() {
  const { id: confId, getForum, officialAssetUrl } = useConference();
  const { code } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const forum = code ? getForum(code) : undefined;
  const { isForum, toggleForum, isTalk, toggleTalk } = useFollow();
  const forumFollowed = code ? isForum(code) : false;
  const [copied, setCopied] = useState<number | null>(null);

  // The talk pointed at by the URL hash (1-based, e.g. #talk-3) stays highlighted
  // for as long as the hash is present — it's a shareable anchor, not a flash.
  const activeId = hash.startsWith("#talk-") ? hash.slice(1) : null;
  // Prefer the official article page (general_NNNN); fall back to the CMS poster.
  const officialUrl = forum?.source_url ?? officialAssetUrl(forum?.poster?.source_url);

  // deep-link: scroll to the anchored talk when arriving with / changing #talk-<n>
  useEffect(() => {
    if (!activeId) return;
    const el = document.getElementById(activeId);
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeId, forum]);

  // Copy a talk's shareable permalink and move the URL hash to it (so it lights up).
  function shareTalk(i: number) {
    const anchor = `talk-${i + 1}`;
    const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    navigate(`#${anchor}`, { replace: false });
    setCopied(i);
    window.setTimeout(() => setCopied((c) => (c === i ? null : c)), 1600);
  }

  if (!forum) {
    return (
      <div className="container section">
        <p>未找到论坛 {code}。</p>
        <Link to={`/${confId}/schedule`} className="linkbtn">返回日程</Link>
      </div>
    );
  }

  const dateInfo = forum.day_date ? formatDate(forum.day_date) : null;
  // When any talk carries a start time, render the talks on a vertical time rail;
  // otherwise fall back to the numbered card list (untimed forums / conferences).
  const timed = (forum.talks ?? []).some((t) => t.start);

  return (
    <motion.div
      className="container section forumdetail"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <header className="fd__header">
        <div className="fd__titlerow">
          <h1 className="fd__title">{forum.title.zh}</h1>
          <div className="fd__actions">
            <button
              className={`followbtn ${forumFollowed ? "is-on" : ""}`}
              onClick={() => code && toggleForum(code)}
            >
              <Icon name="star" filled={forumFollowed} size={15} />
              {forumFollowed ? "已收藏" : "收藏论坛"}
            </button>
            {officialUrl && (
              <a
                className="btn btn--ghost"
                href={officialUrl}
                target="_blank"
                rel="noreferrer"
                title="在官网查看该论坛页面"
              >
                <Icon name="external" size={15} /> 官网
              </a>
            )}
          </div>
        </div>
        <div className="fd__meta">
          <span className="fd__code">{forum.code}</span>
          {forum.category && <span className="fd__cat">{forum.category.name.zh}</span>}
          {forum.room && (
            <span className="fd__room">
              <Icon name="pin" size={13} /> {forum.room}
            </span>
          )}
          {dateInfo && (
            <span>
              <Icon name="calendar" size={13} /> {dateInfo.md} {dateInfo.weekday}
              {forum.session_period && ` · ${periodLabel[forum.session_period]}`}
            </span>
          )}
          {forum.sponsor && (
            <span className="fd__sponsor">
              <Icon name="building" size={13} /> {forum.sponsor}专场
            </span>
          )}
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
            className={timed ? "tline" : "tallist"}
            variants={stagger(0.04, 0.05)}
            initial="initial"
            animate="animate"
          >
            {forum.talks.map((t, i) => {
              const id = talkId(forum.code, i);
              const followed = isTalk(id);
              const anchor = `talk-${i + 1}`;
              const isActive = activeId === anchor;
              // Title row + speakers + abstract, shared by both layouts. In the
              // timeline layout the time moves to the left rail, so the inline
              // pill is only rendered for the untimed card layout.
              const body = (
                <>
                  <div className="talk__titlerow">
                    {!timed && (t.start || t.end) && (
                      <span className="talk__time">
                        {t.start}
                        {t.end ? `–${t.end}` : ""}
                      </span>
                    )}
                    <h3 className="talk__title">
                      {t.title_status === "tbd" ? (
                        <span className="muted-i">报告题目待确认</span>
                      ) : (
                        t.title?.zh
                      )}
                    </h3>
                    <button
                      className={`iconbtn talk__perma ${copied === i ? "is-copied" : ""}`}
                      aria-label="复制该报告的分享链接"
                      title={copied === i ? "链接已复制" : "复制分享链接"}
                      onClick={() => shareTalk(i)}
                    >
                      <Icon name={copied === i ? "check" : "link"} size={15} />
                    </button>
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
                    <Abstract text={t.abstract} />
                  ) : t.abstract_status === "tbd" ? (
                    <p className="talk__abstract muted-i">演讲摘要待确认</p>
                  ) : null}
                </>
              );

              if (timed) {
                return (
                  <motion.article
                    key={i}
                    id={anchor}
                    variants={riseItem}
                    className={`tlrow ${isActive ? "tlrow--active" : ""} ${
                      t.start ? "" : "tlrow--notime"
                    }`}
                  >
                    <div className="tlrow__time">
                      {t.start ? (
                        <>
                          <span className="tlrow__start mono">{t.start}</span>
                          {t.end && <span className="tlrow__end mono">{t.end}</span>}
                        </>
                      ) : (
                        <span className="tlrow__tbd">—</span>
                      )}
                    </div>
                    <div className="tlrow__rail" aria-hidden>
                      <span className="tlrow__dot" />
                    </div>
                    <div className="tlrow__card">{body}</div>
                  </motion.article>
                );
              }

              return (
                <motion.article
                  key={i}
                  id={anchor}
                  variants={riseItem}
                  className={`talk ${isActive ? "talk--active" : ""}`}
                >
                  <div className="talk__no">{String(i + 1).padStart(2, "0")}</div>
                  <div className="talk__body">{body}</div>
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
