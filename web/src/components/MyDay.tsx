import { Fragment } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useNow, isNowWithin } from "../lib/use-now";
import { stagger, riseItem } from "../lib/motion";
import type { ExportItem } from "../lib/export";
import Icon from "../components/Icon";
import StarButton from "../components/StarButton";

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

    Rendered in the schedule's own idiom: a block panel whose rows are the same
    time-column-plus-body rows the keynote list uses, with the connectors drawn
    like the breaks between them. My Day is another way to read the schedule,
    not another kind of thing. */
export default function MyDay({ date, items }: { date: string; items: ExportItem[] }) {
  const { id: confId } = useConference();
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

        <div className="talklist">
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
            const moved = !!prev && !clash && !!it.room && prev.room !== it.room;
            // A borrowed window can say its forum is on; it cannot say that this
            // talk is the one being given right now.
            const running = !it.approx && isNowWithin(date, it.start, it.end, now);
            const body = (
              <>
                <div className={`talkrow__time${running ? " is-now" : ""}`}>
                  {it.start ? (
                    <span
                      className="time"
                      title={it.approx ? t("common.approxTime") : undefined}
                    >
                      {it.approx ? "~" : ""}
                      {it.start}
                      {it.end ? `–${it.end}` : ""}
                    </span>
                  ) : (
                    <span className="myday__untimed">{t("myday.untimed")}</span>
                  )}
                </div>
                <div className="talkrow__body">
                  <div className="talkrow__title">
                    {it.title}
                    {running && <span className="myday__nowtag">{t("myday.now")}</span>}
                  </div>
                  <div className="talkrow__speaker">
                    {/* Speaker with a person icon, room with a pin, session
                        plain — the way the plan list and the live card write the
                        same three facts. */}
                    {it.speakers && (
                      <strong className="myday__spk">
                        <Icon name="user" size={12} /> {it.speakers}
                      </strong>
                    )}
                    <span className="talkrow__aff">
                      {it.session}
                      {it.code ? ` · ${it.code}` : ""}
                    </span>
                    {it.room && (
                      <span className="talkrow__aff myday__room">
                        <Icon name="pin" size={12} /> {it.room}
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
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
                {/* The row is the grid cell, so it stays one element: the forum
                    link covers it (the speakers list does the same) and the star
                    layers above, which keeps a button out of an anchor. */}
                <motion.div
                  variants={riseItem}
                  className={`talkrow${it.code ? " talkrow--link" : ""}${
                    running ? " talkrow--now" : ""
                  }`}
                >
                  {body}
                  {it.via === "talk" ? (
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
                  )}
                  {it.code && (
                    <Link
                      to={`/${confId}/forum/${it.code}${
                        it.talkIndex != null ? `#talk-${it.talkIndex + 1}` : ""
                      }`}
                      className="talkrow__cover"
                      aria-label={it.title}
                    />
                  )}
                </motion.div>
              </Fragment>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
