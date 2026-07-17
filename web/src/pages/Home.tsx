import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { formatDate, todayISO, type ScheduleDay, type ForumSlot } from "../lib/data";
import { useConference } from "../lib/conference-store";
import { useFollow, talkId, keynoteId } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useStickyState } from "../lib/sticky-state";
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

// Period key(s) a keynote set actually spans, derived from the talks' start
// times (some conferences run keynotes across morning and afternoon). The caller
// translates the keys (see DaySection).
function keynotePeriods(talks: Talk[]): string[] {
  const set = new Set<string>();
  for (const t of talks) {
    if (!t.start) continue;
    const h = parseInt(t.start.split(":")[0], 10);
    set.add(h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
  }
  return [...set];
}

// Lowercased haystack for matching a keynote against the search box (title +
// speaker names + affiliations) — keeps keynote day-visibility in step with the
// forum search.
function keynoteSearch(kt: Talk): string {
  const parts = [kt.title?.zh ?? "", kt.title?.en ?? ""];
  for (const s of kt.speakers ?? []) parts.push(s.name, s.affiliation_raw ?? "");
  return parts.join(" ").toLowerCase();
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
  const { t } = useI18n();
  return (
    <span className="pline">
      <button
        className={`pauthor ${active ? "is-active" : ""} ${followed ? "is-followed" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSpeaker(name);
        }}
        title={t("home.filterForums", { name })}
      >
        <Icon name="user" size={11} />
        {name}
      </button>
      {affiliation && <span className="pline__aff">{affiliation}</span>}
    </span>
  );
}

// A run of consecutive indices that are shown (followed-relevant) or hidden.
// `pos` places a hidden run so its expand bar can read "earlier / more / hidden".
type RunSeg = { shown: boolean; indices: number[]; pos: "only" | "start" | "mid" | "end" };

function segmentsOf(total: number, isShown: (i: number) => boolean): RunSeg[] {
  const segs: RunSeg[] = [];
  for (let i = 0; i < total; i++) {
    const shown = isShown(i);
    const last = segs[segs.length - 1];
    if (last && last.shown === shown) last.indices.push(i);
    else segs.push({ shown, indices: [i], pos: "mid" });
  }
  const n = segs.length;
  segs.forEach((s, k) => {
    s.pos = n === 1 ? "only" : k === 0 ? "start" : k === n - 1 ? "end" : "mid";
  });
  return segs;
}

// The GitHub-diff-style expander for a hidden run: a slim horizontal bar showing
// just the count (the bar's own position tells you earlier vs later); the chevron
// flips down→up when expanded. The full phrasing lives in the aria-label/tooltip.
function ExpandBar({
  count,
  pos,
  expanded,
  onClick,
}: {
  count: number;
  pos: RunSeg["pos"];
  expanded: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const label = expanded
    ? t("home.collapseRun", { n: count })
    : pos === "start"
      ? t("home.expandBefore", { n: count })
      : pos === "end"
        ? t("home.expandAfter", { n: count })
        : t("home.expandMore", { n: count });
  return (
    <button
      type="button"
      className={`expandbar ${expanded ? "is-open" : ""}`}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="expandbar__label">
        <span className={`caret ${expanded ? "caret--up" : ""}`}>
          <Icon name="chevron-down" size={13} />
        </span>
        {count}
      </span>
    </button>
  );
}

// Renders a list where only followed-relevant items show by default; each hidden
// run collapses behind an ExpandBar the user can open/close in place. Shared by
// the forum-talk list and the keynote rail so both filter identically.
function CollapsibleRuns({
  total,
  isShown,
  renderItem,
  note,
}: {
  total: number;
  isShown: (i: number) => boolean;
  renderItem: (i: number, shown: boolean) => ReactNode;
  note?: ReactNode;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const toggle = (key: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const out: ReactNode[] = [];
  if (note) out.push(<div key="note" className="frow__note">{note}</div>);
  for (const seg of segmentsOf(total, isShown)) {
    if (seg.shown) {
      for (const i of seg.indices) out.push(renderItem(i, true));
      continue;
    }
    const key = seg.indices[0];
    const isExp = open.has(key);
    // Bar stays put; the revealed rows expand/collapse below it with the same
    // height animation the row and keynote rail use.
    out.push(
      <ExpandBar
        key={`run-${key}`}
        count={seg.indices.length}
        pos={seg.pos}
        expanded={isExp}
        onClick={() => toggle(key)}
      />,
    );
    out.push(
      <AnimatePresence key={`wrap-${key}`} initial={false}>
        {isExp && (
          <motion.div
            className="runwrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {seg.indices.map((i) => renderItem(i, false))}
          </motion.div>
        )}
      </AnimatePresence>,
    );
  }
  return <>{out}</>;
}

function KeynoteRow({
  t,
  date,
  index,
  filtered,
  shown = true,
  activeSpeaker,
  onSpeaker,
}: {
  t: Talk;
  date: string;
  index: number;
  filtered: boolean;
  /** false when revealed from a collapsed run — de-emphasised, never tinted */
  shown?: boolean;
  activeSpeaker: string | null;
  onSpeaker: (name: string) => void;
}) {
  const { isTalk, toggleTalk, isSpeaker } = useFollow();
  const { t: tr } = useI18n();
  const speakers = t.speakers ?? [];
  const isOpening = t.type === "opening" || speakers.length === 0;
  const id = keynoteId(date, index);
  const followed = isTalk(id);
  // In the "我的关注" view a followed-relevant keynote is tinted; a keynote merely
  // revealed from a collapsed run stays muted so the followed ones keep salience.
  const followHit = filtered && shown;
  return (
    <div
      className={`krow ${isOpening ? "krow--opening" : ""} ${followHit ? "krow--hit" : ""} ${
        filtered && !shown ? "krow--muted" : ""
      }`}
    >
      <div className="krow__time">
        {t.start}
        {t.end ? `–${t.end}` : ""}
      </div>
      <div className="krow__main">
        <div className="krow__titlerow">
          <div className="krow__title">
            {t.title_status === "tbd" ? (
              <span className="muted-i">{tr("home.tbd")}</span>
            ) : (
              t.title?.zh
            )}
          </div>
          {!isOpening && (
            <StarButton
              active={followed}
              onClick={() => toggleTalk(id)}
              label={followed ? tr("home.keynoteFollowRemove") : tr("home.keynoteFollowAdd")}
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
  const { t: tr } = useI18n();
  const f = slot.forum;
  const talks = f?.talks ?? [];
  const hasTalks = !!f?.detail_extracted && talks.length > 0;
  const followedHere = slot.people.filter((n) => isSpeaker(n));

  // Whole-forum follow keeps every talk; otherwise, in the "我的关注" view a talk
  // is kept only when it's starred or has a followed speaker — the same rule the
  // timeline uses. A talk merely revealed from a collapsed run isn't "shown".
  const showAll = isForum(slot.code);
  const talkMatches = (t: Talk, i: number) =>
    isTalk(talkId(slot.code, i)) || (t.speakers ?? []).some((s) => isSpeaker(s.name));
  const isShown = (i: number) => showAll || !filtered || talkMatches(talks[i], i);
  const matchCount = filtered && !showAll ? talks.filter(talkMatches).length : 0;
  // Chair-only follow: the forum surfaced solely because a followed person chairs
  // it (none of their talks) — show a note and keep talks collapsed behind a bar.
  const chairOnly = filtered && !showAll && matchCount === 0 && followedHere.length > 0;
  const speakerHit = activeSpeaker != null && slot.people.includes(activeSpeaker);

  // Rows auto-open when a filter needs them: the "我的关注" view (so followed talks
  // are visible) or a speaker-chip filter that matched here. Otherwise the user
  // drives it by clicking the row.
  const forcedOpen = speakerHit || (filtered && hasTalks);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = hasTalks && (userOpen ?? forcedOpen);

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
            {f?.category && (
              <span className="frow__cat">
                <Icon name="tag" size={12} /> {f.category.name.zh}
              </span>
            )}
            {f?.sponsor && (
              <span className="frow__sponsor">
                <Icon name="building" size={12} /> {f.sponsor}
              </span>
            )}
            {hasTalks ? (
              <span className="frow__count">
                <Icon name="keynotes" size={12} /> {tr("common.reportsCount", { n: talks.length })}
              </span>
            ) : (
              <span className="frow__pending">{tr("common.pending")}</span>
            )}
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
                  title={tr("home.filterForums", { name: n })}
                >
                  <Icon name="user" size={11} />
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="frow__actions">
          <StarButton
            active={isForum(slot.code)}
            onClick={() => toggleForum(slot.code)}
            label={tr("home.saveForum", { code: slot.code })}
            className="frow__star"
          />
          <Link
            to={`/${confId}/forum/${slot.code}`}
            className="frow__enter"
            aria-label={tr("home.enterForum", { code: slot.code })}
            title={tr("home.forumDetail")}
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
              aria-label={open ? tr("common.collapseReports") : tr("common.expandReports")}
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
            <CollapsibleRuns
              total={talks.length}
              isShown={isShown}
              note={chairOnly ? tr("home.chairNote", { name: followedHere.join("、") }) : undefined}
              renderItem={(i, shown) => {
              const t = talks[i];
              const tFollowed = isTalk(talkId(slot.code, i));
              const spHit =
                activeSpeaker != null &&
                (t.speakers ?? []).some((s) => s.name === activeSpeaker);
              // A shown talk is followed-relevant → tinted; one merely revealed
              // from a collapsed run stays muted so the followed talks keep focus.
              const followHit = filtered && shown;
              return (
                <div
                  className={`ftalk ${spHit || followHit ? "ftalk--hit" : ""} ${
                    filtered && !shown ? "ftalk--muted" : ""
                  }`}
                  key={i}
                >
                  <Link to={`/${confId}/forum/${slot.code}#talk-${i + 1}`} className="ftalk__link">
                    <span className="ftalk__no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ftalk__main">
                      {t.start && (
                        <span className="ftalk__time mono">
                          {t.start}
                          {t.end ? `–${t.end}` : ""}
                        </span>
                      )}
                      <span className="ftalk__title">
                        {t.title_status === "tbd" ? (
                          <span className="muted-i">{tr("home.tbd")}</span>
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
                    label={tFollowed ? tr("common.talkFollowRemove") : tr("common.talkFollowAdd")}
                    className="ftalk__star"
                  />
                </div>
              );
              }}
            />
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
  const { t, lang } = useI18n();
  const [showKeynotes, setShowKeynotes] = useState(false);
  const { md, weekday } = formatDate(day.date, lang);
  // A keynote is followed-relevant when starred or one of its speakers is
  // followed — the same rule forum talks use.
  const keyShown = (i: number) =>
    !filtered ||
    isTalk(keynoteId(day.date, i)) ||
    (day.keynotes[i].speakers ?? []).some((s) => isSpeaker(s.name));
  // In the follow view, auto-open the keynote rail if one of its keynotes is
  // followed, so the highlighted keynote is actually visible.
  const anyKeyFollowed = filtered && day.keynotes.some((_t, i) => keyShown(i));
  const keyOpen = showKeynotes || anyKeyFollowed;
  // A day with no matching forums still shows if a followed keynote keeps it here.
  if (slots.length === 0 && !anyKeyFollowed) return null;
  return (
    <section className="dashday">
      <div className="dashday__head">
        <h2 className="dashday__date">
          <span className="dashday__md">{md}</span>
          <span className="dashday__wd">{weekday}</span>
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
          {slots.length > 0 && (
            <span className="dashday__n">
              <Icon name="forums" size={12} /> {t("home.parallel", { n: slots.length })}
            </span>
          )}
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
            {t("home.keynotes")}
            {keynotePeriods(day.keynotes).length > 0 &&
              ` · ${keynotePeriods(day.keynotes).map((p) => t(`period.${p}`)).join("·")}`}{" "}
            · {t("common.sessionsCount", { n: day.keynotes.length })}
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
                <CollapsibleRuns
                  total={day.keynotes.length}
                  isShown={keyShown}
                  renderItem={(i, shown) => (
                    <KeynoteRow
                      key={i}
                      t={day.keynotes[i]}
                      date={day.date}
                      index={i}
                      filtered={filtered}
                      shown={shown}
                      activeSpeaker={activeSpeaker}
                      onSpeaker={onSpeaker}
                    />
                  )}
                />
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
  const { t, lang } = useI18n();
  const {
    forums: followedForums,
    speakers: followedSpeakers,
    talks: followedTalks,
    isSpeaker,
    isTalk,
  } = useFollow();
  // Filters are sticky so a trip into a forum page and back restores the board
  // (paired with scroll restoration), keyed by conference so a switch is fresh.
  // When the conference is running today, open filtered to today; otherwise show
  // every day ("all"). Matched against a real day so gaps fall back cleanly.
  const todayStr = todayISO();
  const [dayFilter, setDayFilter] = useStickyState<string>(`${confId}:home.day`, () =>
    scheduleDays.some((d) => d.date === todayStr) ? todayStr : "all",
  );
  const [query, setQuery] = useStickyState(`${confId}:home.query`, "");
  const [onlyFollowed, setOnlyFollowed] = useStickyState(`${confId}:home.followed`, false);
  // Clicking a speaker chip filters the board down to that person's forums/talks.
  const [speakerFilter, setSpeakerFilter] = useStickyState<string | null>(`${confId}:home.speaker`, null);
  const [categoryFilter, setCategoryFilter] = useStickyState<string | null>(`${confId}:home.cat`, null);
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
        // A followed keynote also keeps its day (keynotes have no forum code, so
        // the slot filter alone would drop a day whose only match is a keynote).
        // Respect the other active filters — category never applies to keynotes.
        const keynoteHit =
          onlyFollowed &&
          !categoryFilter &&
          d.keynotes.some((kt, i) => {
            if (speakerFilter && !(kt.speakers ?? []).some((s) => s.name === speakerFilter))
              return false;
            if (q && !keynoteSearch(kt).includes(q)) return false;
            return (
              isTalk(keynoteId(d.date, i)) ||
              (kt.speakers ?? []).some((s) => isSpeaker(s.name))
            );
          });
        return { day: d, slots, keynoteHit };
      })
      .filter((x) => x.slots.length > 0 || x.keynoteHit);
    // isSpeaker / isTalk are re-created whenever the followed sets change, so
    // depending on them is enough — the raw sets are redundant here.
  }, [scheduleDays, dayFilter, q, onlyFollowed, categoryFilter, speakerFilter, followedForums, isSpeaker, isTalk]);

  const totalShown = visibleDays.reduce((n, x) => n + x.slots.length, 0);
  const { md: startMd } = formatDate(conference.start_date, lang);
  const { md: endMd } = formatDate(conference.end_date, lang);
  const mainCity = conference.venues?.find((v) => v.type === "main")?.city;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* masthead — line-based, no hero */}
      <div className="dashhead">
        <div className="container dashhead__inner">
          <div className="dashhead__id">
            <div className="dashhead__titlerow">
              <h1 className="dashhead__title">{conference.name.zh}</h1>
              {conference.source_url && (
                <a
                  className="squarebtn dashhead__official"
                  href={conference.source_url}
                  target="_blank"
                  rel="noreferrer"
                  title={t("common.official")}
                  aria-label={t("common.official")}
                >
                  <Icon name="external" size={15} />
                </a>
              )}
            </div>
            <div className="dashhead__venue">
              {startMd}–{endMd}
              {mainCity && ` · ${t("common.inChina", { city: mainCity })}`}
            </div>
          </div>
          <div className="dashhead__stats">
            {[
              { n: stats.forums, label: t("stats.forums") },
              { n: stats.keynotes, label: t("stats.keynotes") },
              { n: uniqueSpeakerCount, label: t("stats.speakers") },
              { n: stats.days, label: t("stats.days") },
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
              {t("common.all")}
            </button>
            {scheduleDays.map((d) => {
              const { md, weekday } = formatDate(d.date, lang);
              return (
                <button
                  key={d.date}
                  className={`daypill ${dayFilter === d.date ? "is-active" : ""} ${
                    d.date === todayStr ? "is-today" : ""
                  }`}
                  onClick={() => setDayFilter(d.date)}
                >
                  <span className="daypill__md">{md}</span>
                  <span className="daypill__wd">{weekday}</span>
                </button>
              );
            })}
          </div>

          <div className="toolbar__right">
            <div className="search">
              <span className="search__icon" aria-hidden>
                <Icon name="search" size={15} />
              </span>
              <input
                className="search__input"
                type="search"
                placeholder={t("home.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="search__clear" onClick={() => setQuery("")} aria-label={t("common.clearSearch")}>
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            <button
              className={`filterchip ${onlyFollowed ? "is-on" : ""}`}
              onClick={() => setOnlyFollowed((v) => !v)}
              title={t("home.onlyFollowsTip")}
            >
              <Icon name="star" filled={onlyFollowed} size={14} />
              <span className="filterchip__label">{t("home.myFollows")}</span>
              {followedCount ? <span className="filterchip__n">{followedCount}</span> : null}
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
              {t("common.all")}
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
            {t("home.forumsCountPre")}<strong>{totalShown}</strong>{t("home.forumsCountSuf")}
            {q && t("home.matching", { q: query })}
            {onlyFollowed && t("home.onlyFollows")}
            {speakerFilter && (
              <button
                className="filtertag"
                onClick={() => setSpeakerFilter(null)}
                title={t("home.clearSpeaker")}
              >
                {t("home.speakerFilter", { name: speakerFilter })}
                <Icon name="x" size={12} />
              </button>
            )}
          </span>
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
                  {t("home.noForums")}
                  {onlyFollowed && t("home.noForumsHint")}
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
      </div>
    </motion.div>
  );
}
