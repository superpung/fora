import { Fragment } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { useNow, isNowWithin } from "../lib/use-now";
import { stagger, riseItem } from "../lib/motion";
import type { ExportItem } from "../lib/export";
import Icon from "../components/Icon";

function toMin(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

/** The user's starred items for one day, as an ordered vertical timeline.
    Between consecutive items it surfaces the free gap and any room-to-room move
    so the day reads as a walkable plan, not just a list. `items` is expected to
    already be filtered to a single day and sorted by start time. */
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
    <motion.div
      className="myday"
      variants={stagger(0.04, 0.05)}
      initial="initial"
      animate="animate"
    >
      {items.map((it, i) => {
        const prev = i > 0 ? items[i - 1] : null;
        // Gap = free minutes between the previous item's end and this start.
        const prevEnd = toMin(prev?.end) ?? toMin(prev?.start);
        const thisStart = toMin(it.start);
        const gap = prev && prevEnd != null && thisStart != null ? thisStart - prevEnd : null;
        const moved = !!prev && !!it.location && prev.location !== it.location;
        const running = isNowWithin(date, it.start, it.end, now);
        const body = (
          <>
            <div className="myday__rail">
              <span className={`myday__dot ${running ? "myday__dot--now" : ""}`} />
            </div>
            <div className="myday__card">
              <div className="myday__time">
                {it.start ? (
                  <span className={`mono ${running ? "is-now" : ""}`}>
                    {it.start}
                    {it.end ? `–${it.end}` : ""}
                  </span>
                ) : (
                  <span className="myday__untimed">{t("myday.untimed")}</span>
                )}
                {running && <span className="myday__nowtag">{t("myday.now")}</span>}
              </div>
              <div className="myday__title">{it.title}</div>
              <div className="myday__meta">
                <span className="myday__session">{it.session}{it.code ? ` · ${it.code}` : ""}</span>
                {it.speakers && (
                  <span className="myday__spk">
                    <Icon name="user" size={12} /> {it.speakers}
                  </span>
                )}
                {it.location && (
                  <span className="myday__loc">
                    <Icon name="pin" size={12} /> {it.location}
                  </span>
                )}
              </div>
            </div>
          </>
        );
        return (
          <Fragment key={it.uid}>
            {(gap != null && gap > 0) || moved ? (
              <div className="myday__link">
                <span className="myday__linkline" />
                <span className="myday__linktext">
                  {gap != null && gap > 0 && (
                    <span className="myday__gap">
                      <Icon name="clock" size={11} /> {t("myday.gap", { n: gap })}
                    </span>
                  )}
                  {moved && (
                    <span className="myday__move">
                      <Icon name="pin" size={11} /> {t("myday.moveTo", { to: it.location ?? "" })}
                    </span>
                  )}
                </span>
              </div>
            ) : null}
            <motion.div className={`myday__row ${running ? "myday__row--now" : ""}`} variants={riseItem}>
              {it.code ? (
                <Link to={`/${confId}/forum/${it.code}`} className="myday__rowlink">
                  {body}
                </Link>
              ) : (
                body
              )}
            </motion.div>
          </Fragment>
        );
      })}
    </motion.div>
  );
}
