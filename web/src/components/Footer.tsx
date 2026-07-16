import { Link, useLocation } from "react-router-dom";
import ForaMark from "./ForaMark";
import Icon from "./Icon";
import { useI18n } from "../lib/i18n-store";
import { conferenceMeta, hasConference, latestUpdatedAt } from "../lib/conferences";

// Global site footer: Fora project info. Brand is the mark alone (→ hub); inside
// a conference it reads "[mark] › <conference>". "Updated" shows the most recent
// conference date on the hub, or the current conference's date on its pages.
const REPO_URL = "https://github.com/superpung/fora";

export default function Footer() {
  const { lang } = useI18n();
  const zh = lang !== "en";
  const confId = useLocation().pathname.split("/").filter(Boolean)[0];
  const conf = hasConference(confId) ? conferenceMeta(confId) : undefined;
  const confName = conf ? (zh ? conf.name.zh : conf.name.en || conf.name.zh) : null;
  const updated = conf ? conf.updated_at : latestUpdatedAt;
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Link to="/" className="footer__mark" aria-label="Fora">
            <ForaMark size={20} />
          </Link>
          {confName && (
            <>
              <Icon name="chevron-right" size={14} className="footer__brandsep" aria-hidden />
              <span className="footer__conf">{confName}</span>
            </>
          )}
        </div>

        <div className="footer__meta">
          <a className="footer__link" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
            <Icon name="github" size={15} />
          </a>
          <Icon name="divider" size={14} className="footer__sep" aria-hidden />
          <span className="footer__ver">v{__APP_VERSION__}</span>
          {updated && (
            <>
              <Icon name="divider" size={14} className="footer__sep" aria-hidden />
              <span className="footer__upd">
                {zh ? "更新于 " : "Updated "}
                {updated}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="container footer__copy">© {year} Fora</div>
    </footer>
  );
}
