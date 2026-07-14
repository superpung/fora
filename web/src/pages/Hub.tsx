import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import Icon from "../components/Icon";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import { conferenceList } from "../lib/conferences";
import { formatDate } from "../lib/data";

// The site hub: a catalogue of every hosted conference. Rendered from the
// lightweight manifest (no full dataset is loaded here) — picking a card enters
// that conference's viewer under `/:conf`.
export default function Hub() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className="hubtop">
        <div className="container hubtop__inner">
          <div className="hubtop__brand">
            <span className="hubtop__logo" aria-hidden>
              <Icon name="calendar" size={18} />
            </span>
            <span className="hubtop__name">会议日程</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container hub">
        <div className="hub__head">
          <h1 className="hub__title">会议</h1>
        </div>

        <motion.div
          className="hubgrid"
          variants={stagger(0.04, 0.05)}
          initial="initial"
          animate="animate"
        >
          {conferenceList.map((c) => {
            const start = formatDate(c.start_date);
            const end = formatDate(c.end_date);
            const year = c.start_date.slice(0, 4);
            return (
              <motion.div key={c.id} variants={riseItem}>
                <Link to={`/${c.id}`} className="hubcard">
                  <span className="hubcard__logo" aria-hidden>
                    <Icon name="chip" size={18} />
                  </span>
                  <h2 className="hubcard__name">{c.name.zh}</h2>
                  {c.name.en && <div className="hubcard__en">{c.name.en}</div>}
                  <div className="hubcard__meta">
                    <span>
                      <Icon name="calendar" size={13} /> {year}年{start.md}-{end.md}
                    </span>
                    {c.city && (
                      <span>
                        <Icon name="pin" size={13} /> 中国·{c.city}
                      </span>
                    )}
                  </div>
                  <div className="hubcard__stats">
                    <span>
                      <strong>{c.forums}</strong> 论坛
                    </span>
                    <span>
                      <strong>{c.keynotes}</strong> 主旨报告
                    </span>
                    <span>
                      <strong>{c.days}</strong> 会期
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
