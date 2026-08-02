import { Fragment } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { useNow, isNowWithin } from "../lib/use-now";
import { stagger, riseItem } from "../lib/motion";
import type { ExportItem } from "../lib/export";
import Icon from "../components/Icon";

// A row is one grid cell of the list, so the row element itself has to be the
// animated one — a wrapper around it would break `.talkrow:first-child` and the
// hairline rhythm the list is drawn with.
const MotionLink = motion.create(Link);

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
            // Two starred talks running at once are a clash to resolve, not a
            // walk between rooms — say so instead of inventing a room move.
            const clash = bothTimed && thisStart < prevEnd;
            const gap = bothTimed && !clash ? thisStart - prevEnd : null;
            const moved = !!prev && !clash && !!it.room && prev.room !== it.room;
            const running = isNowWithin(date, it.start, it.end, now);
            const body = (
              <>
                <div className={`talkrow__time${running ? " is-now" : ""}`}>
                  {it.start ? (
                    <span className="time">
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
                    {it.speakers && <strong>{it.speakers}</strong>}
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
                {it.code ? (
                  <MotionLink
                    variants={riseItem}
                    to={`/${confId}/forum/${it.code}`}
                    className={`talkrow talkrow--link${running ? " talkrow--now" : ""}`}
                  >
                    {body}
                  </MotionLink>
                ) : (
                  <motion.div
                    variants={riseItem}
                    className={`talkrow${running ? " talkrow--now" : ""}`}
                  >
                    {body}
                  </motion.div>
                )}
              </Fragment>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
