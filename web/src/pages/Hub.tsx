import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import Icon from "../components/Icon";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import { conferenceList, type ConferenceMeta } from "../lib/conferences";
import { formatDate } from "../lib/data";

// The site hub: a catalogue of every hosted conference, grouped by status
// (ongoing / upcoming / ended) relative to today. Rendered from the lightweight
// manifest (no full dataset is loaded here) — picking a card enters that
// conference's viewer under `/:conf`.

type Status = "ongoing" | "upcoming" | "ended";
const GROUPS: { key: Status; label: string }[] = [
  { key: "ongoing", label: "进行中" },
  { key: "upcoming", label: "即将开始" },
  { key: "ended", label: "已结束" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function ConferenceCard({ c }: { c: ConferenceMeta }) {
  const start = formatDate(c.start_date);
  const end = formatDate(c.end_date);
  const year = c.start_date.slice(0, 4);
  return (
    <motion.div variants={riseItem}>
      <Link to={`/${c.id}`} className="hubcard">
        <span className="hubcard__logo" aria-hidden>
          <Icon name="chip" size={18} />
        </span>
        <h3 className="hubcard__name">{c.name.zh}</h3>
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
}

export default function Hub() {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const statusOf = (c: ConferenceMeta): Status =>
    c.end_date < today ? "ended" : c.start_date > today ? "upcoming" : "ongoing";

  const grouped: Record<Status, ConferenceMeta[]> = { ongoing: [], upcoming: [], ended: [] };
  for (const c of conferenceList) grouped[statusOf(c)].push(c);
  // upcoming: soonest first; ongoing: by start; ended: most recent first
  grouped.upcoming.sort((a, b) => a.start_date.localeCompare(b.start_date));
  grouped.ongoing.sort((a, b) => a.start_date.localeCompare(b.start_date));
  grouped.ended.sort((a, b) => b.end_date.localeCompare(a.end_date));

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

        {GROUPS.filter((g) => grouped[g.key].length > 0).map((g) => (
          <section className="hubgroup" key={g.key}>
            <h2 className="hubgroup__title">
              {g.label}
              <span className="hubgroup__n">{grouped[g.key].length}</span>
            </h2>
            <motion.div
              className="hubgrid"
              variants={stagger(0.04, 0.05)}
              initial="initial"
              animate="animate"
            >
              {grouped[g.key].map((c) => (
                <ConferenceCard key={c.id} c={c} />
              ))}
            </motion.div>
          </section>
        ))}
      </div>
    </motion.div>
  );
}
