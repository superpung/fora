import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { useNow } from "../lib/use-now";
import { formatDate } from "../lib/data";
import { buildLiveView, nextStarredItem, fmtClock, type NowRoom } from "../lib/live";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import Icon from "../components/Icon";

/** Talk title, falling back to the "TBD" chip when the title isn't set. */
function Title({ text, tbd }: { text: string; tbd: boolean }) {
  const { t } = useI18n();
  return tbd || !text ? <span className="muted-i">{t("now.tbd")}</span> : <>{text}</>;
}

function RoomCard({ room }: { room: NowRoom }) {
  const { id: confId } = useConference();
  const { t } = useI18n();
  const inner = (
    <>
      <div className="nowcard__top">
        <span className={`nowcard__room ${room.kind === "keynote" ? "nowcard__room--key" : ""}`}>
          <Icon name={room.kind === "keynote" ? "keynotes" : "pin"} size={12} />
          {room.room || (room.kind === "keynote" ? t("now.keynote") : "")}
        </span>
        {room.code && <span className="nowcard__code">{room.code}</span>}
      </div>
      <div className="nowcard__title">
        <Title text={room.title} tbd={room.tbd} />
      </div>
      {room.nowTalk && (
        <div className="nowcard__talk">
          {room.nowTalk.start && <span className="nowcard__time mono">{room.nowTalk.start}</span>}
          <span className="nowcard__talktitle">
            <Title text={room.nowTalk.title} tbd={room.nowTalk.tbd} />
          </span>
          {room.nowTalk.speaker && <span className="nowcard__spk">{room.nowTalk.speaker}</span>}
        </div>
      )}
      {room.nextTalk && (
        <div className="nowcard__next">
          <Icon name="chevron-right" size={11} />
          {room.nextTalk.start && <span className="mono">{room.nextTalk.start}</span>}{" "}
          <Title text={room.nextTalk.title} tbd={room.nextTalk.tbd} />
        </div>
      )}
    </>
  );
  return room.code ? (
    <motion.div variants={riseItem}>
      <Link to={`/${confId}/forum/${room.code}`} className="nowcard nowcard--link">
        {inner}
      </Link>
    </motion.div>
  ) : (
    <motion.div variants={riseItem} className="nowcard">
      {inner}
    </motion.div>
  );
}

export default function Now() {
  const views = useConference();
  const { conference, meta } = views;
  const { t, lang } = useI18n();
  const now = useNow();
  const { forums, speakers, talks } = useFollow();

  const live = useMemo(() => buildLiveView(views, now), [views, now]);
  const starred = useMemo(
    () => nextStarredItem(views, { forums, speakers, talks }, now),
    [views, forums, speakers, talks, now],
  );

  // Date-gate the experience: outside the conference dates the live view can't
  // help, so it degrades to a plain "not in session" note (with the dates).
  const inConference = now.todayStr >= meta.start_date && now.todayStr <= meta.end_date;
  const { md: startMd } = formatDate(conference.start_date, lang);
  const { md: endMd } = formatDate(conference.end_date, lang);

  // Countdown phrasing shared by the "next" panel and the starred panel.
  const relTime = (minutesUntil: number | null, date: string, start: string): string => {
    if (minutesUntil != null && minutesUntil <= 90) return t("now.inMin", { n: minutesUntil });
    if (date === now.todayStr) return t("now.at", { t: start });
    const { md, weekday } = formatDate(date, lang);
    return `${md} ${weekday} · ${start}`;
  };

  return (
    <motion.div
      className="container section nowview"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="nowhead">
        <div className="section__titlerow">
          <span className="section__icon" aria-hidden>
            <Icon name="clock" size={19} />
          </span>
          <h2 className="section__title">{t("now.title")}</h2>
          <span className="nowlive" aria-hidden>
            <span className="nowlive__dot" />
            {t("now.live")}
          </span>
        </div>
        <div className="nowclock">
          <span className="nowclock__time mono">{fmtClock(now.nowMin)}</span>
          <span className="nowclock__date">
            {formatDate(now.todayStr, lang).md} · {formatDate(now.todayStr, lang).weekday}
          </span>
        </div>
      </div>

      {!inConference ? (
        <div className="nowempty">
          <Icon name="calendar" size={22} />
          <p>{t("now.notInSession")}</p>
          <span className="nowempty__sub">
            {startMd}–{endMd}
          </span>
          {starred && (
            <Link to={`../schedule`} className="btn btn--ghost nowempty__link">
              {t("now.viewSchedule")}
            </Link>
          )}
        </div>
      ) : (
        <div className="nowgrid">
          {/* NOW */}
          <section className="nowpanel nowpanel--now">
            <h3 className="nowpanel__label">
              <span className="nowpanel__pulse" />
              {t("now.happening")}
            </h3>
            {live.nowRooms.length === 0 ? (
              <div className="nowpanel__empty">{t("now.nothingNow")}</div>
            ) : (
              <motion.div
                className="nowrooms"
                variants={stagger(0.02, 0.03)}
                initial="initial"
                animate="animate"
              >
                {live.nowRooms.map((r, i) => (
                  <RoomCard key={r.code ?? `key-${i}`} room={r} />
                ))}
              </motion.div>
            )}
          </section>

          {/* NEXT */}
          <section className="nowpanel">
            <h3 className="nowpanel__label">{t("now.startsNext")}</h3>
            {!live.next ? (
              <div className="nowpanel__empty">{t("now.nothingNext")}</div>
            ) : (
              <div className="nownext">
                <div className="nownext__when">
                  <Icon name="clock" size={13} />
                  {relTime(live.next.minutesUntil, live.next.date, live.next.start)}
                </div>
                <ul className="nownext__list">
                  {live.next.sessions.map((s, i) => (
                    <li key={i} className="nownext__item">
                      {s.kind === "forum" ? (
                        <>
                          <Icon name="forums" size={13} />
                          {t("now.forumsBegin", { n: s.count ?? 0 })}
                        </>
                      ) : (
                        <>
                          <Icon name="keynotes" size={13} />
                          <span className="nownext__title">
                            <Title text={s.title} tbd={!!s.tbd} />
                          </span>
                          {s.room && <span className="nownext__room">{s.room}</span>}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* YOUR NEXT STARRED */}
          <section className="nowpanel">
            <h3 className="nowpanel__label">
              <Icon name="star" filled size={13} />
              {t("now.yourNext")}
            </h3>
            {!starred ? (
              <div className="nowpanel__empty">
                {t("now.noStarred")}
                <span className="nowpanel__hint">{t("now.noStarredHint")}</span>
              </div>
            ) : (
              <div className={`nowstar ${starred.running ? "nowstar--live" : ""}`}>
                <div className="nowstar__when">
                  {starred.running
                    ? t("now.starredNow")
                    : relTime(starred.minutesUntil, starred.item.date, starred.item.start ?? "")}
                </div>
                <div className="nowstar__title">
                  {starred.item.title}
                </div>
                <div className="nowstar__meta">
                  {starred.item.speakers && (
                    <span className="nowstar__spk">
                      <Icon name="user" size={12} /> {starred.item.speakers}
                    </span>
                  )}
                  {starred.item.location && (
                    <span className="nowstar__loc">
                      <Icon name="pin" size={12} /> {starred.item.location}
                    </span>
                  )}
                </div>
                {starred.item.code && (
                  <Link
                    to={`/${views.id}/forum/${starred.item.code}`}
                    className="nowstar__link"
                  >
                    {t("now.open")} <Icon name="arrow-right" size={13} />
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </motion.div>
  );
}
