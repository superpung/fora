import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  conference,
  scheduleDays,
  stats,
  uniqueSpeakerCount,
  formatDate,
  type ScheduleDay,
  type ForumSlot,
} from "../lib/data";
import { useFollow, talkId } from "../lib/follow-store";
import { pageVariants } from "../lib/motion";
import Icon from "../components/Icon";
import type { Talk } from "../types";

/* ---------------- small pieces ---------------- */

function StarButton({
  active,
  onClick,
  label,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      className={`star ${className} ${active ? "is-on" : ""}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <Icon name="star" filled={active} size={16} />
    </button>
  );
}

function timeRange(b?: { start?: string | null; end?: string | null }) {
  if (!b?.start) return "";
  return b.end ? `${b.start}–${b.end}` : b.start;
}

function KeynoteRow({ t }: { t: Talk }) {
  const { isSpeaker, toggleSpeaker } = useFollow();
  const sp = t.speakers?.[0];
  const isOpening = t.type === "opening" || !sp;
  return (
    <div className={`krow ${isOpening ? "krow--opening" : ""}`}>
      <div className="krow__time">
        {t.start}
        {t.end ? `–${t.end}` : ""}
      </div>
      <div className="krow__main">
        <div className="krow__title">
          {t.title_status === "tbd" ? (
            <span className="muted-i">题目待定</span>
          ) : (
            t.title?.zh
          )}
        </div>
        {sp && (
          <div className="krow__speaker">
            <StarButton
              active={isSpeaker(sp.name)}
              onClick={() => toggleSpeaker(sp.name)}
              label={`关注 ${sp.name}`}
              className="star--sm"
            />
            <strong>{sp.name}</strong>
            <span className="krow__aff">{sp.affiliation_raw}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ForumRow({ slot, filtered }: { slot: ForumSlot; filtered: boolean }) {
  const { isForum, toggleForum, isSpeaker, isTalk, toggleTalk } = useFollow();
  const f = slot.forum;
  const talks = f?.talks ?? [];
  const followedHere = slot.people.filter((n) => isSpeaker(n));
  const followedTalks = talks
    .map((t, i) => ({ t, i }))
    .filter(({ i }) => isTalk(talkId(slot.code, i)));
  const previewNames = slot.people.slice(0, 4);
  const extra = slot.people.length - previewNames.length;

  // When filtering "我的关注", if this forum surfaced ONLY because of a starred
  // talk (the forum itself / its speakers aren't followed), present it talk-first:
  // suppress the whole-forum summary and list just the followed talk(s) below.
  const forumTracked = isForum(slot.code) || followedHere.length > 0;
  const talkOnly = filtered && !forumTracked && followedTalks.length > 0;

  return (
    <div className={`frow ${followedHere.length ? "frow--tracked" : ""}`}>
      <div className="frow__head">
      <Link to={`/forum/${slot.code}`} className="frow__link">
        <span className="frow__room">{slot.room}</span>
        <span className="frow__code">{slot.code}</span>
        <span className="frow__body">
          <span className="frow__title">{f?.title.zh ?? slot.code}</span>
          {!talkOnly && previewNames.length > 0 && (
            <span className="frow__people">
              {previewNames.map((n, i) => (
                <span key={n} className={isSpeaker(n) ? "is-followed" : ""}>
                  {n}
                  {i < previewNames.length - 1 || extra > 0 ? "、" : ""}
                </span>
              ))}
              {extra > 0 && <span className="frow__more">等 {slot.people.length} 人</span>}
            </span>
          )}
          {talkOnly && (
            <span className="frow__people">已收藏本论坛的 {followedTalks.length} 场报告</span>
          )}
        </span>
        <span className="frow__meta">
          {f?.sponsor && <span className="frow__sponsor">{f.sponsor}</span>}
          {!talkOnly &&
            (f?.detail_extracted ? (
              <span className="frow__count">{talks.length} 报告</span>
            ) : (
              <span className="frow__pending">详情待补</span>
            ))}
        </span>
      </Link>
      <StarButton
        active={isForum(slot.code)}
        onClick={() => toggleForum(slot.code)}
        label={`收藏论坛 ${slot.code}`}
      />
      </div>

      {filtered && followedTalks.length > 0 && (
        <div className="frow__talks">
          {followedTalks.map(({ t, i }) => {
            const sp = t.speakers?.[0];
            return (
              <div className="ftalk" key={i}>
                <Link to={`/forum/${slot.code}`} className="ftalk__link">
                  <span className="ftalk__no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ftalk__main">
                    <span className="ftalk__title">
                      {t.title_status === "tbd" ? (
                        <span className="muted-i">题目待定</span>
                      ) : (
                        t.title?.zh
                      )}
                    </span>
                    {sp && <span className="ftalk__speaker">{sp.name}</span>}
                  </span>
                </Link>
                <StarButton
                  active
                  onClick={() => toggleTalk(talkId(slot.code, i))}
                  label={`取消收藏该报告`}
                  className="ftalk__star"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DaySection({ day, slots, filtered }: { day: ScheduleDay; slots: ForumSlot[]; filtered: boolean }) {
  const [showKeynotes, setShowKeynotes] = useState(false);
  if (slots.length === 0) return null;
  return (
    <section className="dashday">
      <div className="dashday__head">
        <h2 className="dashday__date">
          <span className="dashday__md">{day.md}</span>
          <span className="dashday__wd">{day.weekday}</span>
        </h2>
        <div className="dashday__meta">
          <span>{day.venue}</span>
          {day.forumBlock && <span className="dashday__time">{timeRange(day.forumBlock)}</span>}
          <span className="dashday__n">{slots.length} 场并行</span>
        </div>
      </div>

      {day.keynotes.length > 0 && (
        <div className="krail">
          <button
            className="krail__toggle"
            onClick={() => setShowKeynotes((v) => !v)}
            aria-expanded={showKeynotes}
          >
            主旨报告 · 上午 · {day.keynotes.length} 场
            <span className={`caret ${showKeynotes ? "caret--up" : ""}`}>
              <Icon name="chevron-down" size={16} />
            </span>
          </button>
          {showKeynotes && (
            <div className="krail__list">
              {day.keynotes.map((t, i) => (
                <KeynoteRow key={i} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ftable">
        {slots.map((s) => (
          <ForumRow key={s.code} slot={s} filtered={filtered} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- dashboard ---------------- */

export default function Home() {
  const {
    forums: followedForums,
    speakers: followedSpeakers,
    talks: followedTalks,
    isSpeaker,
    isTalk,
    clearAll,
  } = useFollow();
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [onlySponsored, setOnlySponsored] = useState(false);

  const followedCount =
    followedForums.size + followedSpeakers.size + followedTalks.size;
  const q = query.trim().toLowerCase();

  const visibleDays = useMemo(() => {
    return scheduleDays
      .filter((d) => dayFilter === "all" || d.date === dayFilter)
      .map((d) => {
        const slots = d.slots.filter((s) => {
          if (q && !s.search.includes(q)) return false;
          if (onlySponsored && !s.forum?.sponsor) return false;
          if (onlyFollowed) {
            const tracked =
              followedForums.has(s.code) ||
              s.people.some((n) => isSpeaker(n)) ||
              (s.forum?.talks ?? []).some((_, i) => isTalk(talkId(s.code, i)));
            if (!tracked) return false;
          }
          return true;
        });
        return { day: d, slots };
      })
      .filter((x) => x.slots.length > 0);
    // isSpeaker / isTalk are re-created whenever the followed sets change, so
    // depending on them is enough — the raw sets are redundant here.
  }, [dayFilter, q, onlyFollowed, onlySponsored, followedForums, isSpeaker, isTalk]);

  const totalShown = visibleDays.reduce((n, x) => n + x.slots.length, 0);
  const { md: startMd } = formatDate(conference.start_date);
  const { md: endMd } = formatDate(conference.end_date);
  const mainCity = conference.venues?.find((v) => v.type === "main")?.city;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* masthead — line-based, no hero */}
      <div className="dashhead">
        <div className="container dashhead__inner">
          <div className="dashhead__id">
            <h1 className="dashhead__title">{conference.name.zh}</h1>
            <div className="dashhead__venue">
              {startMd}–{endMd}
              {mainCity && ` · 中国·${mainCity}`}
            </div>
          </div>
          <div className="dashhead__stats">
            {[
              { n: stats.forums, label: "技术论坛" },
              { n: stats.keynotes, label: "主旨报告" },
              { n: uniqueSpeakerCount, label: "讲者" },
              { n: stats.days, label: "会期" },
            ].map((s) => (
              <div key={s.label} className="dstat">
                <div className="dstat__n">{s.n}</div>
                <div className="dstat__l">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sticky control bar */}
      <div className="toolbar">
        <div className="container toolbar__inner">
          <div className="daypills">
            <button
              className={`daypill ${dayFilter === "all" ? "is-active" : ""}`}
              onClick={() => setDayFilter("all")}
            >
              全部
            </button>
            {scheduleDays.map((d) => (
              <button
                key={d.date}
                className={`daypill ${dayFilter === d.date ? "is-active" : ""}`}
                onClick={() => setDayFilter(d.date)}
              >
                <span className="daypill__md">{d.md}</span>
                <span className="daypill__wd">{d.weekday}</span>
              </button>
            ))}
          </div>

          <div className="toolbar__right">
            <div className="search">
              <span className="search__icon" aria-hidden>
                <Icon name="search" size={15} />
              </span>
              <input
                className="search__input"
                type="search"
                placeholder="搜索论坛 / 主题 / 讲者 / 单位…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="search__clear" onClick={() => setQuery("")} aria-label="清除搜索">
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            <button
              className={`filterchip ${onlyFollowed ? "is-on" : ""}`}
              onClick={() => setOnlyFollowed((v) => !v)}
            >
              <Icon name="star" filled={onlyFollowed} size={14} />
              我的关注{followedCount ? ` ${followedCount}` : ""}
            </button>
            <button
              className={`filterchip ${onlySponsored ? "is-on" : ""}`}
              onClick={() => setOnlySponsored((v) => !v)}
            >
              赞助专场
            </button>
          </div>
        </div>
      </div>

      <div className="container dash">
        <div className="dash__resultbar">
          <span>
            共 <strong>{totalShown}</strong> 场论坛
            {q && ` · 匹配“${query}”`}
            {onlyFollowed && " · 仅关注"}
            {onlySponsored && " · 仅赞助专场"}
          </span>
          {followedCount > 0 && (
            <button className="linkbtn" onClick={clearAll}>
              清空我的关注
            </button>
          )}
        </div>

        {visibleDays.length === 0 ? (
          <div className="dash__empty">
            <p>
              没有符合条件的论坛。
              {onlyFollowed && "点击论坛、报告或讲者旁的星标即可加入“我的关注”。"}
            </p>
          </div>
        ) : (
          visibleDays.map(({ day, slots }) => (
            <DaySection key={day.date} day={day} slots={slots} filtered={onlyFollowed} />
          ))
        )}

        <div className="dash__hint">
          <Link to="/schedule" className="btn btn--ghost">
            <Icon name="calendar" size={15} /> 时间线视图
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
