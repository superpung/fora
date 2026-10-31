import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { formatDate } from "../lib/data";
import type { ExportItem } from "../lib/export";
import Icon from "./Icon";

/** The same source facts, link and action placement in My Day and discovery lists. */
export default function AgendaRow({ item, actions, metric, showDate = false, running = false, className = "", ...motionProps }: {
  item: ExportItem; actions: ReactNode; metric?: ReactNode; showDate?: boolean; running?: boolean;
} & Omit<HTMLMotionProps<"div">, "children">) {
  const { id } = useConference();
  const { t, lang } = useI18n();
  const zh = lang !== "en";
  const href = item.code ? `/${id}/forum/${item.code}${item.anchor ? `#${item.anchor}` : ""}` : `/${id}/schedule#${item.date}`;
  return <motion.div {...motionProps}
    className={`talkrow talkrow--agenda talkrow--link${running ? " talkrow--now" : ""} ${className}`}>
    <div className="talkrow__body">
      <div className="talkrow__title">{item.title}
        {running && <span className="myday__nowtag">{t("myday.now")}</span>}
      </div>
      <div className="talkrow__speaker">
        {(item.speakers || !item.code || item.talkIndex != null) && <strong className="talkrow__fact"><Icon name="user" size={12} />{item.speakers || (zh ? "讲者待定" : "Speaker pending")}</strong>}
        <span className="talkrow__fact talkrow__aff"><Icon name="pin" size={12} />{item.room || (zh ? "地点待定" : "Room pending")}</span>
        <span className={`talkrow__fact talkrow__time${running ? " is-now" : ""}`}
          title={item.approx && item.start ? t("common.approxTime") : undefined}>
          <Icon name="clock" size={12} /><span className="time">
            {showDate && `${item.date ? formatDate(item.date, lang).md : (zh ? "日期待定" : "Date pending")} · `}
            {item.start ? `${item.approx ? "~" : ""}${item.start}${item.end ? `–${item.end}` : ""}` : t("myday.untimed")}
          </span>
        </span>
        {metric}
      </div>
      <div className="talkrow__aff talkrow__session">{item.session}{item.code ? ` · ${item.code}` : ""}</div>
    </div>
    {actions}
    <Link to={href} className="talkrow__cover" aria-label={item.title} />
  </motion.div>;
}
