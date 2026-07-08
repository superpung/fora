import { conference } from "../lib/data";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <div className="footer__title">{conference.name.zh}</div>
          <div className="footer__sub">
            {conference.name.en} · {conference.start_date} – {conference.end_date}
          </div>
        </div>
        <div className="footer__meta">
          {conference.contact?.email && (
            <a href={`mailto:${conference.contact.email}`}>
              {conference.contact.email}
            </a>
          )}
          <span className="footer__note">
            数据解析自官网 · 演示原型 · 非官方发布
          </span>
        </div>
      </div>
    </footer>
  );
}
