import { Fragment } from "react";
import { motion } from "framer-motion";
import { useFollow } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useNow, isNowWithin } from "../lib/use-now";
import { stagger, riseItem } from "../lib/motion";
import type { ExportItem } from "../lib/export";
import Icon from "../components/Icon";
import StarButton from "../components/StarButton";
import AgendaRow from "./AgendaRow";

function toMin(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

/** The user's starred items for one day, in reading order. Between consecutive
    items it surfaces the free gap, a room-to-room move, and — when two starred
    talks run at the same time — the clash, so the day reads as a plan rather
    than a list. `items` is expected to be one day's, sorted by start time.

    Shares AgendaRow with discovery lists; gaps, moves and clashes use the
    schedule's break strips. Report facts and follow controls have one renderer. */
export default function MyDay({ date, items }: { date: string; items: ExportItem[] }) {
  const { toggleTalk } = useFollow();
  const { t } = useI18n();
  const now = useNow();

  if (items.length === 0) {
    return (
      <div className="myday__empty">
        <Icon name="star" size={22} />
        <p>{t("myday.empty")}</p>
        <span className="myday__emptyhint">{t("myday.emptyHint")}</span>
      </div>
    );
  }

  return (
    <div className="blocks">
      <motion.section
        className="block block--myday"
        variants={stagger(0.04, 0.05)}
        initial="initial"
        animate="animate"
      >
        <div className="block__head">
          <span className="block__icon" aria-hidden>
            <Icon name="star" filled size={16} />
          </span>
          <h3 className="block__title">{t("schedule.viewMyDay")}</h3>
        </div>

        <div className="talklist talklist--flush">
          {items.map((it, i) => {
            const prev = i > 0 ? items[i - 1] : null;
            const prevEnd = toMin(prev?.end) ?? toMin(prev?.start);
            const thisStart = toMin(it.start);
            const bothTimed = !!prev && prevEnd != null && thisStart != null;
            // Talks of one forum that carry no time of their own all wear that
            // forum's window, so they all "overlap" each other — but they run one
            // after another, in the order the agenda prints them. Only a borrowed
            // window shared with ANOTHER session is a real clash: two rooms at
            // once is a choice the reader has to make.
            const sameSession = !!prev && !!it.code && prev.code === it.code;
            const borrowed = it.approx || !!prev?.approx;
            const clash = bothTimed && thisStart < prevEnd && !(sameSession && borrowed);
            // A gap counted off borrowed times would be invented, so only exact
            // ones are subtracted.
            const gap = bothTimed && !borrowed && !clash ? thisStart - prevEnd : null;
            const moved = bothTimed && !clash && !!prev?.room && !!it.room && prev.room !== it.room;
            // A borrowed window can say its forum is on; it cannot say that this
            // talk is the one being given right now.
            const running = !it.approx && isNowWithin(date, it.start, it.end, now);
            return (
              <Fragment key={it.uid}>
                {clash || (gap != null && gap > 0) || moved ? (
                  <div className="breakrow myday__linkrow">
                    {clash && (
                      <span className="breakrow__label myday__clash">
                        <Icon name="alert" size={13} /> {t("myday.clash")}
                      </span>
                    )}
                    {gap != null && gap > 0 && (
                      <span className="breakrow__label">
                        <Icon name="clock" size={13} /> {t("myday.gap", { n: gap })}
                      </span>
                    )}
                    {moved && (
                      <span className="breakrow__label myday__move">
                        <Icon name="pin" size={13} /> {t("myday.moveTo", { to: it.room })}
                      </span>
                    )}
                  </div>
                ) : null}
                <AgendaRow item={it} running={running} variants={riseItem} actions={
                  it.via === "talk" ? (
                    <StarButton
                      active
                      size={15}
                      className="star--sm talkrow__star"
                      label={t("common.talkFollowRemove")}
                      onClick={() => toggleTalk(it.followId)}
                    />
                  ) : (
                    // Not starred on its own: it is here because a forum or a
                    // speaker is followed, and that is where it can be removed.
                    <span
                      className="talkrow__via"
                      role="img"
                      aria-label={t(
                        it.via === "forum" ? "myday.viaForum" : "myday.viaSpeaker",
                        { name: it.viaName ?? "" },
                      )}
                      title={t(
                        it.via === "forum" ? "myday.viaForum" : "myday.viaSpeaker",
                        { name: it.viaName ?? "" },
                      )}
                    >
                      <Icon name={it.via === "forum" ? "forums" : "user"} size={13} />
                    </span>
                  )
                } />
              </Fragment>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
