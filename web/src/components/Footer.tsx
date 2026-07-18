import { Link, useLocation } from "react-router-dom";
import ForaMark from "./ForaMark";
import Icon from "./Icon";
import { useI18n } from "../lib/i18n-store";
import { conferenceMeta, hasConference, latestUpdatedAt } from "../lib/conferences";
import { REPO_URL } from "../lib/repo";

// Global site footer: Fora project info. Brand is the mark alone (→ hub); inside
// a conference it reads "[mark] › <conference>". "Updated" shows the most recent
// conference date on the hub, or the current conference's date on its pages.
const AUTHOR_URL = "https://github.com/superpung";
const CLAUDE_URL = "https://claude.com/product/claude-code";

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-07-17" → "July 17, 2026" (en) / "2026年7月17日" (zh).
function formatUpdated(iso: string, zh: boolean): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return zh ? `${y}年${m}月${d}日` : `${MONTHS_EN[m - 1]} ${d}, ${y}`;
}

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
          <a
            className="footer__ver"
            href={`${REPO_URL}/releases/tag/v${__APP_VERSION__}`}
            target="_blank"
            rel="noreferrer"
          >
            v{__APP_VERSION__}
          </a>
          {updated && (
            <>
              <Icon name="divider" size={14} className="footer__sep" aria-hidden />
              <span className="footer__upd">
                {zh ? "更新于 " : "Updated "}
                {formatUpdated(updated, zh)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="container footer__copy">
        Copyright © {year}{" "}
        <a href={AUTHOR_URL} target="_blank" rel="noreferrer">Super Lee</a>
        {" & "}
        <a href={CLAUDE_URL} target="_blank" rel="noreferrer">Claude</a>
      </div>
    </footer>
  );
}
