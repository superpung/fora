import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  conference,
  scheduleDays,
  stats,
  uniqueSpeakerCount,
  periodLabel,
  formatDate,
  type ScheduleDay,
  type ForumSlot,
} from "../lib/data";
import { useFollow } from "../lib/follow";
import { pageVariants } from "../lib/motion";
import type { Talk } from "../types";

/* ---------------- small pieces ---------------- */

function StarButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={`star ${active ? "is-on" : ""}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

function timeRange(b?: { start?: string | null; end?: string | null }) {
  if (!b?.start) return "";
  return b.end ? `${b.start}–${b.end}` : b.start;
}

function KeynoteChip({ t }: { t: Talk }) {
  const { isSpeaker, toggleSpeaker } = useFollow();
  const sp = t.speakers?.[0];
  const isOpening = t.type === "opening" || !sp;
  return (
    <div className={`kchip ${isOpening ? "kchip--opening" : ""}`}>
      <div className="kchip__time">
        {t.start}
        {t.end ? `–${t.end}` : ""}
      </div>
      <div className="kchip__title">
        {t.title_status === "tbd" ? (
          <span className="tag tag--tbd">题目待定</span>
        ) : (
          t.title?.zh
        )}
      </div>
      {sp && (
        <div className="kchip__speaker">
          <StarButton
            active={isSpeaker(sp.name)}
            onClick={() => toggleSpeaker(sp.name)}
            label={`关注 ${sp.name}`}
          />
          <strong>{sp.name}</strong>
          <span className="kchip__aff">{sp.affiliation_raw}</span>
        </div>
      )}
    </div>
  );
}

function ForumCard({ slot }: { slot: ForumSlot }) {
  const { isForum, toggleForum, isSpeaker } = useFollow();
  const f = slot.forum;
  const talks = f?.talks ?? [];
  const followedHere = slot.people.filter((n) => isSpeaker(n));
  const previewNames = slot.people.slice(0, 3);
  const extra = slot.people.length - previewNames.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={`fcard ${followedHere.length ? "fcard--tracked" : ""}`}
    >
      <StarButton
        active={isForum(slot.code)}
        onClick={() => toggleForum(slot.code)}
        label={`收藏论坛 ${slot.code}`}
      />
      <Link to={`/forum/${slot.code}`} className="fcard__link">
        <div className="fcard__head">
          <span className="tag tag--code">{slot.code}</span>
          <span className="tag tag--room">{slot.room}</span>
        </div>
        <h3 className="fcard__title">{f?.title.zh ?? slot.code}</h3>

        {previewNames.length > 0 && (
          <div className="fcard__people">
            {previewNames.map((n) => (
              <span
                key={n}
                className={`fcard__person ${isSpeaker(n) ? "is-followed" : ""}`}
              >
                {n}
              </span>
            ))}
            {extra > 0 && <span className="fcard__more">+{extra}</span>}
          </div>
        )}

        <div className="fcard__foot">
          {f?.sponsor && <span className="tag tag--sponsor">{f.sponsor}</span>}
          {f?.detail_extracted ? (
            <span className="fcard__count">{talks.length} 报告</span>
          ) : (
            <span className="fcard__pending">详情待补</span>
          )}
          {followedHere.length > 0 && (
            <span className="fcard__track" title={followedHere.join("、")}>
              ★ 关注讲者
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function DaySection({
  day,
  slots,
}: {
  day: ScheduleDay;
  slots: ForumSlot[];
}) {
  if (slots.length === 0) return null;
  return (
    <section className="dashday">
      <div className="dashday__head">
        <div className="dashday__date">
          <span className="dashday__md">{day.md}</span>
          <span className="dashday__wd">{day.weekday}</span>
        </div>
        <div className="dashday__meta">
          <span>{day.venue}</span>
          {day.forumBlock && (
            <span className="dashday__time">{timeRange(day.forumBlock)}</span>
          )}
          <span className="dashday__n">{slots.length} 场并行论坛</span>
        </div>
      </div>

      {day.keynotes.length > 0 && (
        <div className="krail">
          <div className="krail__label">主旨报告 · 上午</div>
          <div className="krail__track">
            {day.keynotes.map((t, i) => (
              <KeynoteChip key={i} t={t} />
            ))}
          </div>
        </div>
      )}

      <motion.div layout className="fgrid">
        {slots.map((s) => (
          <ForumCard key={s.code} slot={s} />
        ))}
      </motion.div>
    </section>
  );
}

/* ---------------- dashboard ---------------- */

export default function Home() {
  const { forums: followedForums, speakers: followedSpeakers, isSpeaker, clearAll } =
    useFollow();
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [onlySponsored, setOnlySponsored] = useState(false);

  const followedCount = followedForums.size + followedSpeakers.size;
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
              followedForums.has(s.code) || s.people.some((n) => isSpeaker(n));
            if (!tracked) return false;
          }
          return true;
        });
        return { day: d, slots };
      })
      .filter((x) => x.slots.length > 0);
  }, [dayFilter, q, onlyFollowed, onlySponsored, followedForums, followedSpeakers, isSpeaker]);

  const totalShown = visibleDays.reduce((n, x) => n + x.slots.length, 0);
  const { md: startMd } = formatDate(conference.start_date);
  const { md: endMd } = formatDate(conference.end_date);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* compact masthead — not a hero */}
      <div className="dashhead">
        <div className="container dashhead__inner">
          <div className="dashhead__id">
            <div className="eyebrow">
              {conference.edition} · {startMd}–{endMd}
            </div>
            <h1 className="dashhead__title">{conference.name.zh}</h1>
            <div className="dashhead__venue">
              {conference.venues?.map((v) => v.name.zh).join(" · ")}
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
              <span className="search__icon" aria-hidden>⌕</span>
              <input
                className="search__input"
                type="search"
                placeholder="搜索论坛 / 主题 / 讲者 / 单位…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="search__clear" onClick={() => setQuery("")} aria-label="清除">
                  ✕
                </button>
              )}
            </div>
            <button
              className={`filterchip ${onlyFollowed ? "is-on" : ""}`}
              onClick={() => setOnlyFollowed((v) => !v)}
            >
              ★ 我的关注{followedCount ? ` ${followedCount}` : ""}
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
            <div className="dash__emptyicon">◷</div>
            <p>
              没有符合条件的论坛。
              {onlyFollowed && "点击论坛或讲者旁的 ☆ 可加入“我的关注”。"}
            </p>
          </div>
        ) : (
          visibleDays.map(({ day, slots }) => (
            <DaySection key={day.date} day={day} slots={slots} />
          ))
        )}

        <div className="dash__hint">
          需要按时间线逐场浏览？前往
          <Link to="/schedule" className="linkbtn linkbtn--inline">完整日程</Link>
          。全部时段为并行论坛（{periodLabel.afternoon}/{periodLabel.morning}）。
        </div>
      </div>
    </motion.div>
  );
}
