import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import LangToggle from "../components/LangToggle";
import Icon from "../components/Icon";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import { conferenceList, type ConferenceMeta } from "../lib/conferences";
import { formatDate } from "../lib/data";
import { useTitle } from "../lib/use-title";
import { useI18n } from "../lib/i18n-store";

// The site hub: a catalogue of every hosted conference, grouped by status
// (ongoing / upcoming / ended) relative to today. Rendered from the lightweight
// manifest (no full dataset is loaded here) — picking a card enters that
// conference's viewer under `/:conf`.

type Status = "ongoing" | "upcoming" | "ended";
const GROUPS: { key: Status; labelKey: string }[] = [
  { key: "ongoing", labelKey: "hub.ongoing" },
  { key: "upcoming", labelKey: "hub.upcoming" },
  { key: "ended", labelKey: "hub.ended" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function ConferenceCard({ c }: { c: ConferenceMeta }) {
  const { t, lang } = useI18n();
  const start = formatDate(c.start_date, lang);
  const end = formatDate(c.end_date, lang);
  const year = c.start_date.slice(0, 4);
  const dateRange =
    lang === "en" ? `${start.md} – ${end.md}, ${year}` : `${year}年${start.md}-${end.md}`;
  return (
    <motion.div variants={riseItem}>
      <Link to={`/${c.id}`} className="hubcard">
        <span className="hubcard__logo" aria-hidden>
          <Icon name="conference" size={18} />
        </span>
        <h3 className="hubcard__name">{c.name.zh}</h3>
        {c.name.en && <div className="hubcard__en">{c.name.en}</div>}
        <div className="hubcard__meta">
          <span>
            <Icon name="calendar" size={13} /> {dateRange}
          </span>
          {c.city && (
            <span>
              <Icon name="pin" size={13} /> {t("common.inChina", { city: c.city })}
            </span>
          )}
        </div>
        <div className="hubcard__stats">
          <span>
            <strong>{c.forums}</strong> {t("hub.forums")}
          </span>
          <span>
            <strong>{c.keynotes}</strong> {t("hub.keynotes")}
          </span>
          <span>
            <strong>{c.days}</strong> {t("hub.days")}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Hub() {
  useTitle();
  const { t } = useI18n();
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
            <span className="hubtop__name">{t("common.siteName")}</span>
          </div>
          <div className="nav__tools">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container hub">
        <div className="hub__head">
          <h1 className="hub__title">{t("hub.title")}</h1>
        </div>

        {GROUPS.filter((g) => grouped[g.key].length > 0).map((g) => (
          <section className="hubgroup" key={g.key}>
            <h2 className="hubgroup__title">
              {t(g.labelKey)}
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
