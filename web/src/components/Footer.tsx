import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import Icon from "./Icon";

export default function Footer() {
  const { conference } = useConference();
  const { t } = useI18n();
  const site = conference.source_url;
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <div className="footer__title">{conference.name.zh}</div>
          <div className="footer__sub">
            {conference.name.en} · {conference.start_date} – {conference.end_date}
          </div>
        </div>
        {site && (
          <a className="footer__site" href={site} target="_blank" rel="noreferrer">
            {t("common.official")}
            <Icon name="external" size={14} />
          </a>
        )}
      </div>
    </footer>
  );
}
