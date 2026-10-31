import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { formatDate } from "../lib/data";
import type { ExportItem } from "../lib/export";
import Icon from "./Icon";

/** Share report facts while preserving My Day's chronological time column. */
export default function AgendaRow({ item, actions, metric, showDate = false, running = false, className = "", ...motionProps }: {
  item: ExportItem; actions: ReactNode; metric?: ReactNode; showDate?: boolean; running?: boolean;
} & Omit<HTMLMotionProps<"div">, "children">) {
  const { id } = useConference();
  const { t, lang } = useI18n();
  const zh = lang !== "en";
  const href = item.code ? `/${id}/forum/${item.code}${item.anchor ? `#${item.anchor}` : ""}` : `/${id}/schedule#${item.date}`;
  const time = <span className="time" title={item.approx && item.start ? t("common.approxTime") : undefined}>
    {showDate && `${item.date ? formatDate(item.date, lang).md : (zh ? "日期待定" : "Date pending")} `}
    {item.start ? `${item.approx ? "~" : ""}${item.start}${item.end ? `–${item.end}` : ""}` : <span className="myday__untimed">{t("myday.untimed")}</span>}
  </span>;
  const speaker = (item.speakers || showDate) && <strong className="talkrow__fact">
    <Icon name="user" size={12} />{item.speakers || (zh ? "讲者待定" : "Speaker pending")}
  </strong>;
  const room = (item.room || showDate) && <span className="talkrow__fact talkrow__aff talkrow__room">
    <Icon name="pin" size={12} />{item.room || (zh ? "地点待定" : "Room pending")}
  </span>;
  return <motion.div {...motionProps}
    className={`talkrow talkrow--agenda${showDate ? " talkrow--discovery" : ""}${item.code || showDate ? " talkrow--link" : ""}${running ? " talkrow--now" : ""} ${className}`}>
    {!showDate && <div className={`talkrow__time${running ? " is-now" : ""}`}>{time}</div>}
    <div className="talkrow__body">
      <div className="talkrow__title">{item.title}
        {running && <span className="myday__nowtag">{t("myday.now")}</span>}
      </div>
      <div className="talkrow__speaker">
        {speaker}
        {!showDate && <span className="talkrow__aff">{item.session}{item.code ? ` · ${item.code}` : ""}</span>}
        {room}
        {showDate && <span className="talkrow__fact talkrow__time"><Icon name="clock" size={12} />{time}</span>}
      </div>
      {showDate && <div className="talkrow__aff talkrow__session">
        {item.code && <span className="code-tag">{item.code}</span>}{item.session}
      </div>}
    </div>
    {metric ? <div className="row-actions">{actions}{metric}</div> : actions}
    {(item.code || showDate) && <Link to={href} className="talkrow__cover" aria-label={item.title} />}
  </motion.div>;
}
