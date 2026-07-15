import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { formatDate, type ScheduleDay, type ForumSlot } from "../lib/data";
import { useConference } from "../lib/conference-store";
import { useFollow, talkId, keynoteId } from "../lib/follow-store";
import { pageVariants } from "../lib/motion";
import Icon from "../components/Icon";
import ExportMenu from "../components/ExportMenu";
import ImportButton from "../components/ImportButton";
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

// Period(s) a keynote set actually spans, derived from the talks' start times
// (some conferences run keynotes across morning and afternoon).
function keynotePeriods(talks: Talk[]): string {
  const set = new Set<string>();
  for (const t of talks) {
    if (!t.start) continue;
    const h = parseInt(t.start.split(":")[0], 10);
    set.add(h < 12 ? "上午" : h < 18 ? "下午" : "晚上");
  }
  return [...set].join("·");
}

/** A clickable author: person icon + name (hover underline) + affiliation.
    Shared by keynote rows and forum-talk rows so both read identically. */
function PersonLine({
  name,
  affiliation,
  active,
  followed,
  onSpeaker,
}: {
  name: string;
  affiliation?: string | null;
  active?: boolean;
  followed?: boolean;
  onSpeaker: (name: string) => void;
}) {
  return (
    <span className="pline">
      <button
        className={`pauthor ${active ? "is-active" : ""} ${followed ? "is-followed" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSpeaker(name);
        }}
        title={`筛选包含 ${name} 的论坛与报告`}
      >
        <Icon name="user" size={11} />
        {name}
      </button>
      {affiliation && <span className="pline__aff">{affiliation}</span>}
    </span>
  );
}

function KeynoteRow({
  t,
  date,
  index,
  filtered,
  activeSpeaker,
  onSpeaker,
}: {
  t: Talk;
  date: string;
  index: number;
  filtered: boolean;
  activeSpeaker: string | null;
  onSpeaker: (name: string) => void;
}) {
  const { isTalk, toggleTalk, isSpeaker } = useFollow();
  const speakers = t.speakers ?? [];
  const isOpening = t.type === "opening" || speakers.length === 0;
  const id = keynoteId(date, index);
  const followed = isTalk(id);
  // In the "我的关注" view, highlight a keynote that is followed directly or via
  // one of its speakers — same treatment as forum talks (star marks the explicit
  // unit, tint marks "this resolves to a followed talk").
  const followHit = filtered && (followed || speakers.some((s) => isSpeaker(s.name)));
  return (
    <div className={`krow ${isOpening ? "krow--opening" : ""} ${followHit ? "krow--hit" : ""}`}>
      <div className="krow__time">
        {t.start}
        {t.end ? `–${t.end}` : ""}
      </div>
      <div className="krow__main">
        <div className="krow__titlerow">
          <div className="krow__title">
            {t.title_status === "tbd" ? (
              <span className="muted-i">题目待定</span>
            ) : (
              t.title?.zh
            )}
          </div>
          {!isOpening && (
            <StarButton
              active={followed}
              onClick={() => toggleTalk(id)}
              label={followed ? "取消收藏该主旨报告" : "收藏该主旨报告"}
              className="star--sm"
            />
          )}
        </div>
        {speakers.length > 0 && (
          <div className="krow__speaker">
            {speakers.map((s) => (
              <PersonLine
                key={s.name}
                name={s.name}
                affiliation={s.affiliation_raw}
                active={activeSpeaker === s.name}
                followed={isSpeaker(s.name)}
                onSpeaker={onSpeaker}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ForumRow({
  slot,
  filtered,
  activeSpeaker,
  onSpeaker,
}: {
  slot: ForumSlot;
  filtered: boolean;
  activeSpeaker: string | null;
  onSpeaker: (name: string) => void;
}) {
  const { isForum, toggleForum, isSpeaker, isTalk, toggleTalk } = useFollow();
  const { id: confId } = useConference();
  const f = slot.forum;
  const talks = f?.talks ?? [];
  const hasTalks = !!f?.detail_extracted && talks.length > 0;
  const followedHere = slot.people.filter((n) => isSpeaker(n));
  const followedTalks = talks
    .map((t, i) => ({ t, i }))
    .filter(({ i }) => isTalk(talkId(slot.code, i)));

  // When filtering "我的关注", if this forum surfaced ONLY because of a starred
  // talk (the forum / its speakers aren't followed), show just those talks.
  const forumTracked = isForum(slot.code) || followedHere.length > 0;
  const talkOnly = filtered && !forumTracked && followedTalks.length > 0;
  const speakerHit = activeSpeaker != null && slot.people.includes(activeSpeaker);

  // Rows auto-open when a filter needs them: the starred-talk-only view, a speaker
  // filter that matched here, or the "我的关注" view (so every followed talk is
  // visible and highlighted). Otherwise the user drives it by clicking the row.
  const forcedOpen = talkOnly || speakerHit || (filtered && forumTracked && hasTalks);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = hasTalks && (userOpen ?? forcedOpen);
  const shownTalks = talkOnly ? followedTalks : talks.map((t, i) => ({ t, i }));

  return (
    <div
      className={`frow ${followedHere.length ? "frow--tracked" : ""} ${open ? "is-open" : ""}`}
    >
      {/* The whole header row is one hover/expand unit; interactive children
          (author links, star, enter, caret) stop propagation so they don't
          also toggle the row. */}
      <div
        className={`frow__row ${hasTalks ? "frow__row--expandable" : ""}`}
        onClick={() => hasTalks && setUserOpen(!open)}
      >
        <div className="frow__body">
          <div className="frow__title">
            <span className="frow__code">{slot.code}</span>
            <span className="frow__titletext">{f?.title.zh ?? slot.code}</span>
          </div>
          <span className="frow__rc">
            <span className="frow__room">
              <Icon name="pin" size={11} /> {slot.room}
            </span>
            {f?.category && <span className="frow__cat">{f.category.name.zh}</span>}
          </span>
          {slot.people.length > 0 && (
            <div className="frow__people">
              {slot.people.map((n) => (
                <button
                  key={n}
                  className={`pauthor ${activeSpeaker === n ? "is-active" : ""} ${
                    isSpeaker(n) ? "is-followed" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpeaker(n);
                  }}
                  title={`筛选包含 ${n} 的论坛与报告`}
                >
                  <Icon name="user" size={11} />
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="frow__actions">
          {/* meta (sponsor · N 报告) sits to the left of the buttons and is
              vertically centred with them — the report count stays rightmost. */}
          <div className="frow__meta">
            {f?.sponsor && (
              <span className="frow__sponsor">
                <Icon name="building" size={12} /> {f.sponsor}
              </span>
            )}
            {hasTalks ? (
              <span className="frow__count">
                <Icon name="keynotes" size={12} /> {talks.length} 报告
              </span>
            ) : (
              <span className="frow__pending">详情待补</span>
            )}
          </div>
          <StarButton
            active={isForum(slot.code)}
            onClick={() => toggleForum(slot.code)}
            label={`收藏论坛 ${slot.code}`}
            className="frow__star"
          />
          <Link
            to={`/${confId}/forum/${slot.code}`}
            className="frow__enter"
            aria-label={`进入论坛 ${slot.code}`}
            title="进入论坛详情页"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon name="arrow-right" size={16} />
          </Link>
          {hasTalks && (
            <button
              className="frow__caretbtn"
              onClick={(e) => {
                e.stopPropagation();
                setUserOpen(!open);
              }}
              aria-expanded={open}
              aria-label={open ? "收起报告" : "展开报告"}
            >
              <span className={`caret ${open ? "caret--up" : ""}`}>
                <Icon name="chevron-down" size={16} />
              </span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="frow__talks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {shownTalks.map(({ t, i }) => {
              const tFollowed = isTalk(talkId(slot.code, i));
              const spHit =
                activeSpeaker != null &&
                (t.speakers ?? []).some((s) => s.name === activeSpeaker);
              // In the "我的关注" view, highlight every talk that is followed —
              // directly, via its forum, or via one of its speakers — even though
              // only the explicitly-followed unit carries a filled star.
              const followHit =
                filtered &&
                (isForum(slot.code) ||
                  tFollowed ||
                  (t.speakers ?? []).some((s) => isSpeaker(s.name)));
              return (
                <div className={`ftalk ${spHit || followHit ? "ftalk--hit" : ""}`} key={i}>
                  <Link to={`/${confId}/forum/${slot.code}#talk-${i + 1}`} className="ftalk__link">
                    <span className="ftalk__no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ftalk__main">
                      <span className="ftalk__title">
                        {t.title_status === "tbd" ? (
                          <span className="muted-i">题目待定</span>
                        ) : (
                          t.title?.zh
                        )}
                      </span>
                      {(t.speakers ?? []).length > 0 && (
                        <span className="ftalk__speakers">
                          {t.speakers!.map((s) => (
                            <PersonLine
                              key={s.name}
                              name={s.name}
                              affiliation={s.affiliation_raw}
                              active={activeSpeaker === s.name}
                              followed={isSpeaker(s.name)}
                              onSpeaker={onSpeaker}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  </Link>
                  <StarButton
                    active={tFollowed}
                    onClick={() => toggleTalk(talkId(slot.code, i))}
                    label={tFollowed ? "取消收藏该报告" : "收藏该报告"}
                    className="ftalk__star"
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DaySection({
  day,
  slots,
  filtered,
  activeSpeaker,
  onSpeaker,
}: {
  day: ScheduleDay;
  slots: ForumSlot[];
  filtered: boolean;
  activeSpeaker: string | null;
  onSpeaker: (name: string) => void;
}) {
  const { isTalk, isSpeaker } = useFollow();
  const [showKeynotes, setShowKeynotes] = useState(false);
  if (slots.length === 0) return null;
  // In the follow view, auto-open the keynote rail if one of its keynotes is
  // followed, so the highlighted talk is actually visible.
  const anyKeyFollowed =
    filtered &&
    day.keynotes.some(
      (t, i) =>
        isTalk(keynoteId(day.date, i)) ||
        (t.speakers ?? []).some((s) => isSpeaker(s.name)),
    );
  const keyOpen = showKeynotes || anyKeyFollowed;
  return (
    <section className="dashday">
      <div className="dashday__head">
        <h2 className="dashday__date">
          <span className="dashday__md">{day.md}</span>
          <span className="dashday__wd">{day.weekday}</span>
        </h2>
        <div className="dashday__meta">
          <span>
            <Icon name="building" size={12} /> {day.venue}
          </span>
          {day.forumBlock && (
            <span className="dashday__time">
              <Icon name="clock" size={12} /> {timeRange(day.forumBlock)}
            </span>
          )}
          <span className="dashday__n">
            <Icon name="forums" size={12} /> {slots.length} 场并行
          </span>
        </div>
      </div>

      {day.keynotes.length > 0 && (
        <div className="krail">
          <button
            className="krail__toggle"
            onClick={() => setShowKeynotes((v) => !v)}
            aria-expanded={keyOpen}
          >
            <Icon name="keynotes" size={15} />
            主旨报告{keynotePeriods(day.keynotes) && ` · ${keynotePeriods(day.keynotes)}`} ·{" "}
            {day.keynotes.length} 场
            <span className={`caret ${keyOpen ? "caret--up" : ""}`}>
              <Icon name="chevron-down" size={16} />
            </span>
          </button>
          <AnimatePresence initial={false}>
            {keyOpen && (
              <motion.div
                className="krail__list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {day.keynotes.map((t, i) => (
                  <KeynoteRow
                    key={i}
                    t={t}
                    date={day.date}
                    index={i}
                    filtered={filtered}
                    activeSpeaker={activeSpeaker}
                    onSpeaker={onSpeaker}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="ftable">
        {slots.map((s) => (
          <ForumRow
            key={s.code}
            slot={s}
            filtered={filtered}
            activeSpeaker={activeSpeaker}
            onSpeaker={onSpeaker}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------- dashboard ---------------- */

export default function Home() {
  const { id: confId, conference, scheduleDays, stats, uniqueSpeakerCount } = useConference();
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
  // Clicking a speaker chip filters the board down to that person's forums/talks.
  const [speakerFilter, setSpeakerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const onSpeaker = (name: string) =>
    setSpeakerFilter((s) => (s === name ? null : name));

  // Distinct forum categories present (conferences that group forums; empty for
  // a flat forum list like ccfchip). Drives the optional category filter row.
  const categories = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of scheduleDays)
      for (const s of d.slots) {
        const c = s.forum?.category;
        if (c?.key && !m.has(c.key)) m.set(c.key, c.name.zh);
      }
    return [...m.entries()];
  }, [scheduleDays]);

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
          if (categoryFilter && s.forum?.category?.key !== categoryFilter) return false;
          if (speakerFilter && !s.people.includes(speakerFilter)) return false;
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
  }, [scheduleDays, dayFilter, q, onlyFollowed, onlySponsored, categoryFilter, speakerFilter, followedForums, isSpeaker, isTalk]);

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
              title="只看我的关注"
            >
              <Icon name="star" filled={onlyFollowed} size={14} />
              <span className="filterchip__label">我的关注</span>
              {followedCount ? <span className="filterchip__n">{followedCount}</span> : null}
            </button>
            <button
              className={`filterchip ${onlySponsored ? "is-on" : ""}`}
              onClick={() => setOnlySponsored((v) => !v)}
              title="只看赞助专场"
            >
              <Icon name="building" size={14} />
              <span className="filterchip__label">赞助专场</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container dash">
        {categories.length > 0 && (
          <div className="dashcats">
            <button
              className={`chipfilter ${!categoryFilter ? "is-on" : ""}`}
              onClick={() => setCategoryFilter(null)}
            >
              全部
            </button>
            {categories.map(([key, zh]) => (
              <button
                key={key}
                className={`chipfilter ${categoryFilter === key ? "is-on" : ""}`}
                onClick={() => setCategoryFilter((c) => (c === key ? null : key))}
              >
                {zh}
              </button>
            ))}
          </div>
        )}
        <div className="dash__resultbar">
          <span className="dash__resultinfo">
            共 <strong>{totalShown}</strong> 场论坛
            {q && ` · 匹配“${query}”`}
            {onlyFollowed && " · 仅关注"}
            {onlySponsored && " · 仅赞助专场"}
            {speakerFilter && (
              <button
                className="filtertag"
                onClick={() => setSpeakerFilter(null)}
                title="清除讲者筛选"
              >
                讲者：{speakerFilter}
                <Icon name="x" size={12} />
              </button>
            )}
          </span>
          <div className="dash__actions">
            <ImportButton />
            {followedCount > 0 && <ExportMenu />}
            {followedCount > 0 && (
              <button className="linkbtn" onClick={clearAll}>
                清空我的关注
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={dayFilter}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {visibleDays.length === 0 ? (
              <div className="dash__empty">
                <p>
                  没有符合条件的论坛。
                  {onlyFollowed && "点击论坛、报告或讲者旁的星标即可加入“我的关注”。"}
                </p>
              </div>
            ) : (
              visibleDays.map(({ day, slots }) => (
                <DaySection
                  key={day.date}
                  day={day}
                  slots={slots}
                  filtered={onlyFollowed}
                  activeSpeaker={speakerFilter}
                  onSpeaker={onSpeaker}
                />
              ))
            )}
          </motion.div>
        </AnimatePresence>

        <div className="dash__hint">
          <Link to={`/${confId}/schedule`} className="btn btn--ghost">
            <Icon name="calendar" size={15} /> 时间线视图
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
