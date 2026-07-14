import { useConference } from "../lib/conference-store";
import Icon from "./Icon";

export default function Footer() {
  const { conference } = useConference();
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
            官方网站
            <Icon name="external" size={14} />
          </a>
        )}
      </div>
    </footer>
  );
}
