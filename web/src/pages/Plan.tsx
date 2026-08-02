import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useAi } from "../lib/ai-store";
import { useStickyState } from "../lib/sticky-state";
import { formatDate } from "../lib/data";
import { assemblePlan, buildPlanCorpus, rankPlan, type PlanDay, type PlanPick } from "../lib/plan";
import { topicLabel } from "../lib/topic-labels";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import { AiBadge, AiNote } from "../components/AiMark";
import Icon from "../components/Icon";

// "Plan for me": describe an interest, get a time-ordered agenda you can star in
// one tap. The whole page is AI-derived — it recommends, and it reads and shows
// the AI-written enrichment — so it is gated on the AI-content toggle, carries
// the disclaimer once, and badges every generated line.

/** How many one-tap interest chips to offer, drawn from the topics this
    conference's program actually uses (most common first). */
const CHIP_COUNT = 12;

/** How long the "thinking" state stays up at minimum. Ranking is local and
    usually finishes in well under this, but a result that appears in one frame
    reads as a glitch rather than an answer — the floor gives the skeleton time
    to be seen, and gives the work a beginning and an end. */
const MIN_THINK_MS = 900;

function PickRow({
  pick,
  checked,
  onToggle,
}: {
  pick: PlanPick;
  checked: boolean;
  onToggle: () => void;
}) {
  const { id: confId } = useConference();
  const { t, lang } = useI18n();
  const time = pick.start ? `${pick.start}${pick.end ? `–${pick.end}` : ""}` : null;
  const session = pick.session || t("block.keynotes");

  return (
    <motion.div className={`planpick ${pick.clashesWith ? "planpick--clash" : ""}`} variants={riseItem}>
      <input
        type="checkbox"
        className="planpick__check"
        checked={checked}
        onChange={onToggle}
        aria-label={t("plan.include", { title: pick.title })}
      />
      <div className="planpick__body">
        <div className="planpick__meta">
          {time ? (
            <span className="planpick__time mono" title={pick.approxTime ? t("common.approxTime") : undefined}>
              {pick.approxTime ? `~${time}` : time}
            </span>
          ) : (
            <span className="planpick__time planpick__time--tbd">{t("plan.timeTbd")}</span>
          )}
          {pick.room && (
            <span className="planpick__room">
              <Icon name="pin" size={11} /> {pick.room}
            </span>
          )}
          <span className="planpick__session">
            {session}
            {pick.code ? ` · ${pick.code}` : ""}
          </span>
        </div>
        <div className="planpick__title">
          {pick.code ? (
            // Land on the talk itself, not the top of its forum: the forum page
            // scrolls to `#talk-N` and keeps it highlighted while the hash is
            // there. Keynotes carry no anchor, so they stay plain text.
            <Link
              to={`/${confId}/forum/${pick.code}${
                pick.talkIndex != null ? `#talk-${pick.talkIndex + 1}` : ""
              }`}
            >
              {pick.title}
            </Link>
          ) : (
            pick.title
          )}
        </div>
        {pick.speakers && (
          <div className="planpick__spk">
            <Icon name="user" size={12} /> {pick.speakers}
          </div>
        )}
        {pick.summary && (
          <p className="planpick__sum">
            <AiBadge />
            <span>{pick.summary}</span>
          </p>
        )}
        {pick.matched.length > 0 && (
          <div className="planpick__topics">
            {pick.matched.map((k) => (
              <span className="plantag" key={k}>
                {topicLabel(k, lang)}
              </span>
            ))}
          </div>
        )}
        {pick.clashesWith && (
          <div className="planpick__clash">
            <Icon name="alert" size={12} />
            {t("plan.clash", { title: pick.clashesWith })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Plan() {
  const views = useConference();
  const { id: confId } = views;
  const { t, lang } = useI18n();
  const ai = useAi();
  const { importFollows } = useFollow();

  // Everything the user built here is sticky: following a pick into its forum
  // and coming back must return the same interest, the same chips and the same
  // plan — regenerating it from scratch (or worse, showing an empty page) throws
  // away work they did. Session-scoped, like the schedule/speaker filters.
  const [text, setText] = useStickyState(`${confId}:plan.text`, "");
  const [chips, setChips] = useStickyState<string[]>(`${confId}:plan.chips`, []);
  const [plan, setPlan] = useStickyState<PlanDay[] | null>(`${confId}:plan.days`, null);
  const [selected, setSelected] = useStickyState<Set<string>>(
    `${confId}:plan.sel`,
    () => new Set(),
  );
  const [starred, setStarred] = useStickyState(`${confId}:plan.starred`, 0);
  /** The request being worked on, or null when idle. Set on submit; cleared
      when its result lands. */
  const [thinking, setThinking] = useState<{ text: string; chips: string[] } | null>(null);

  // Walking the program is cheap; the BM25 model behind it is built lazily on
  // the first plan (see lib/plan.ts), so mounting the page stays instant.
  const corpus = useMemo(() => buildPlanCorpus(views), [views]);
  const offered = useMemo(() => corpus.topics.slice(0, CHIP_COUNT), [corpus]);
  const canPlan = text.trim().length > 0 || chips.length > 0;

  // The box grows with what is typed rather than offering a drag handle: reset
  // to `auto` first so it can shrink again when text is deleted. Re-measured on
  // resize because a narrower box rewraps into more lines.
  const box = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      // `scrollHeight` is content + padding; under border-box the height we set
      // must also cover the border, or the last line is clipped by 2px.
      el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text]);

  // Ranking is synchronous and blocks the frame it runs in, so it is deferred
  // past two frames: the first paints the skeleton, the second does the work.
  // The result is then held until MIN_THINK_MS has passed.
  useEffect(() => {
    if (!thinking) return;
    const started = performance.now();
    let timer = 0;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const days = assemblePlan(rankPlan(corpus, thinking.text, thinking.chips));
        timer = window.setTimeout(
          () => {
            setPlan(days);
            // Colliding picks start unchecked: the stronger match owns the slot,
            // and the user decides whether to swap.
            setSelected(
              new Set(days.flatMap((d) => d.picks).filter((p) => !p.clashesWith).map((p) => p.id)),
            );
            setStarred(0);
            setThinking(null);
          },
          Math.max(0, MIN_THINK_MS - (performance.now() - started)),
        );
      }),
    );
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [thinking, corpus, setPlan, setSelected, setStarred]);

  function makePlan() {
    if (!canPlan || thinking) return;
    setThinking({ text, chips });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function starAll() {
    if (selected.size === 0) return;
    // Straight into the existing follow store, so the plan joins the user's
    // starred set — synced to their Gist, and read by My Day and reminders.
    importFollows({ forums: [], speakers: [], talks: [...selected] });
    setStarred(selected.size);
  }

  return (
    <motion.div
      className="container section planpage"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="section__head">
        <div className="section__titlerow">
          <span className="section__icon" aria-hidden>
            <Icon name="sparkle" size={19} />
          </span>
          <h2 className="section__title">{t("plan.title")}</h2>
        </div>
      </div>

      {!ai.enabled ? (
        <div className="planoff">
          <Icon name="sparkle" size={22} />
          <p>{t("plan.aiOff")}</p>
          {/* The action itself, not directions to go and find it elsewhere. */}
          <button className="planoff__on ai-hover" onClick={() => ai.setEnabled(true)}>
            <Icon name="sparkle" size={13} />
            {t("plan.aiTurnOn")}
          </button>
        </div>
      ) : (
        <>
          <div className="planform">
            <textarea
              ref={box}
              className="planform__input"
              rows={1}
              value={text}
              aria-label={t("plan.inputLabel")}
              // A hint about the SHAPE of a useful answer — a field, a problem,
              // a goal — deliberately naming no topic and no conference. A
              // worked example would read as the thing to type, and would be
              // wrong for every program that does not happen to cover it.
              placeholder={t("plan.inputHint")}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // ⌘/Ctrl+↵ submits; a bare ↵ stays a newline in a textarea.
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  makePlan();
                }
              }}
            />
            {offered.length > 0 && (
              <div className="planchips" role="group" aria-label={t("plan.topicsLabel")}>
                {offered.map((key) => {
                  const on = chips.includes(key);
                  return (
                    <button
                      key={key}
                      className={`plantag plantag--btn ${on ? "is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() =>
                        setChips((prev) =>
                          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                        )
                      }
                    >
                      {topicLabel(key, lang)}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="planform__actions">
              <button
                className={`btn btn--primary planform__go ai-hover ${thinking ? "is-busy" : ""}`}
                onClick={makePlan}
                disabled={!canPlan || !!thinking}
              >
                <Icon name="sparkle" size={14} className={thinking ? "ai-spark" : undefined} />
                {thinking ? t("plan.thinking") : t("plan.submit")}
              </button>
              <AiNote className="planform__note" />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {thinking && (
              // Deliberately not a spinner: the skeleton says what is being
              // built (a day of timed rows), so the wait shows the shape of the
              // answer instead of an abstract wait.
              <motion.div
                className="planthink"
                aria-live="polite"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                <div className="planthink__head">
                  <span className="ai-orb" aria-hidden>
                    <Icon name="sparkle" size={14} />
                  </span>
                  {t("plan.thinking")}
                </div>
                <div className="planthink__rows" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div className="planthink__row" key={i} style={{ "--i": i } as CSSProperties}>
                      <span className="ai-skel planthink__bar--meta" />
                      <span className="ai-skel planthink__bar--title" />
                      <span className="ai-skel planthink__bar--sub" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {plan &&
            !thinking &&
            (plan.length === 0 ? (
              <div className="planempty">{t("plan.empty")}</div>
            ) : (
              <>
                <motion.div
                  className="plandays"
                  variants={stagger(0.03, 0.04)}
                  initial="initial"
                  animate="animate"
                >
                  {plan.map((day) => {
                    const { md, weekday } = formatDate(day.date, lang);
                    return (
                      <section className="planday" key={day.date}>
                        <h3 className="planday__head">
                          <span className="planday__md">{md}</span>
                          <span className="planday__wd">{weekday}</span>
                        </h3>
                        {day.picks.map((p) => (
                          <PickRow
                            key={p.id}
                            pick={p}
                            checked={selected.has(p.id)}
                            onToggle={() => toggle(p.id)}
                          />
                        ))}
                      </section>
                    );
                  })}
                </motion.div>

                <div className="planbar">
                  <button className="btn btn--primary" onClick={starAll} disabled={selected.size === 0}>
                    <Icon name="star" filled size={14} />
                    {t("plan.starAll", { n: selected.size })}
                  </button>
                  {starred > 0 && (
                    <span className="planbar__done">
                      <Icon name="check" size={13} />
                      {t("plan.starred", { n: starred })}
                      <Link to={`/${confId}/schedule`}>{t("plan.viewStarred")}</Link>
                    </span>
                  )}
                </div>
              </>
            ))}
        </>
      )}
    </motion.div>
  );
}
