import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useAi } from "../lib/ai-store";
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
            <span className="planpick__time mono" title={pick.approxTime ? t("plan.approxTime") : undefined}>
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
            <Link to={`/${confId}/forum/${pick.code}`}>{pick.title}</Link>
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

  const [text, setText] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanDay[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState(0);

  // Walking the program is cheap; the BM25 model behind it is built lazily on
  // the first plan (see lib/plan.ts), so mounting the page stays instant.
  const corpus = useMemo(() => buildPlanCorpus(views), [views]);
  const offered = useMemo(() => corpus.topics.slice(0, CHIP_COUNT), [corpus]);
  const canPlan = text.trim().length > 0 || chips.length > 0;

  function makePlan() {
    if (!canPlan) return;
    const days = assemblePlan(rankPlan(corpus, text, chips));
    setPlan(days);
    // Colliding picks start unchecked: the stronger match owns the slot, and the
    // user decides whether to swap.
    setSelected(
      new Set(days.flatMap((d) => d.picks).filter((p) => !p.clashesWith).map((p) => p.id)),
    );
    setStarred(0);
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
          <button className="planoff__on" onClick={() => ai.setEnabled(true)}>
            {t("plan.aiTurnOn")}
          </button>
        </div>
      ) : (
        <>
          <div className="planform">
            <textarea
              className="planform__input"
              rows={3}
              value={text}
              placeholder={t("plan.placeholder")}
              aria-label={t("plan.inputLabel")}
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
              <button className="btn btn--primary" onClick={makePlan} disabled={!canPlan}>
                <Icon name="sparkle" size={14} />
                {t("plan.submit")}
              </button>
              <AiNote className="planform__note" />
            </div>
          </div>

          {plan &&
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
