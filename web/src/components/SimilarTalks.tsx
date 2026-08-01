import { useEffect, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAi } from "../lib/ai-store";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { formatDate } from "../lib/data";
import { similarTalks, type SimilarTalk } from "../lib/similar";
import { topicLabel } from "../lib/topic-labels";
import { AiNote, AiBadge } from "../components/AiMark";
import Icon from "./Icon";

// "If you liked this, you might also want" at the foot of a talk on the forum
// page. AI-DERIVED (it leans on the model's topics and one-line summary), so it
// renders only while useAi().enabled is on and carries the provenance mark.
//
// A disclosure, not an always-open block: a forum page can hold 30 talks, and
// building the TF-IDF corpus is only worth doing for a talk somebody is
// actually reading. The corpus is built on the first open of the session and
// then reused by every other talk (memoised in lib/similar.ts).

function SimilarRow({ item }: { item: SimilarTalk }) {
  const { id: confId } = useConference();
  const { t, lang } = useI18n();
  const dateInfo = item.date ? formatDate(item.date, lang) : null;
  return (
    <Link className="simrow" to={`/${confId}/forum/${item.forumCode}#talk-${item.index + 1}`}>
      <span className="simrow__title">
        {item.titleTbd ? <span className="muted-i">{t("forum.titleTbd")}</span> : item.title}
      </span>
      <span className="simrow__meta">
        <span className="simrow__code mono">{item.forumCode}</span>
        <span className="simrow__forum">{item.forumTitle}</span>
        {dateInfo && (
          <span className="simrow__bit mono">
            {dateInfo.md}
            {item.period ? ` ${t(`period.${item.period}`)}` : ""}
          </span>
        )}
        {item.start && (
          <span className="simrow__bit mono">
            <Icon name="clock" size={11} /> {item.start}
            {item.end ? `–${item.end}` : ""}
          </span>
        )}
      </span>
      {item.sharedTopics.length > 0 && (
        <span className="simrow__topics">
          {item.sharedTopics.map((x) => (
            <span key={x} className="tag">
              {topicLabel(x, lang)}
            </span>
          ))}
        </span>
      )}
      <span className="simrow__chev" aria-hidden>
        <Icon name="chevron-right" size={15} />
      </span>
    </Link>
  );
}

export default function SimilarTalks({
  forumCode,
  talkIndex,
}: {
  forumCode: string;
  talkIndex: number;
}) {
  const { enabled } = useAi();
  const { id: confId, conference } = useConference();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SimilarTalk[] | null>(null);

  // Compute after the click has painted, so opening the panel never blocks the
  // frame that animates it (the first call also builds the corpus).
  useEffect(() => {
    if (!open || items) return;
    const id = window.setTimeout(
      () => setItems(similarTalks(confId, conference, forumCode, talkIndex)),
      0,
    );
    return () => window.clearTimeout(id);
  }, [open, items, confId, conference, forumCode, talkIndex]);

  if (!enabled) return null;

  return (
    <div className="simblock">
      <button
        className="simblock__toggle ai-hover"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon name="sparkle" size={13} />
        {t("similar.title")}
        <span className={`caret ${open ? "caret--up" : ""}`}>
          <Icon name="chevron-down" size={13} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="simblock__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {items === null ? (
              // The same skeleton language the planner uses: two rows in the
              // shape of the answer, lit by the shared AI sweep.
              <div className="simblock__wait" aria-live="polite" aria-label={t("common.loading")}>
                {[0, 1].map((i) => (
                  <div className="simblock__waitrow" key={i} style={{ "--i": i } as CSSProperties}>
                    <span className="ai-skel simblock__waitbar--title" />
                    <span className="ai-skel simblock__waitbar--meta" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="simblock__state">{t("similar.none")}</p>
            ) : (
              <>
                <div className="simblock__list">
                  {items.map((item) => (
                    <SimilarRow key={`${item.forumCode}:${item.index}`} item={item} />
                  ))}
                </div>
                <div className="simblock__foot">
                  <AiBadge />
                  <AiNote />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
