import { NavLink, Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import AccountMenu from "./AccountMenu";
import ForaMark from "./ForaMark";
import ConferenceSwitcher from "./ConferenceSwitcher";
import { useI18n } from "../lib/i18n-store";
import { conferenceMeta } from "../lib/conferences";
import { todayISO } from "../lib/data";

// In-conference links, relative to the active conference (`/:conf/...`).
interface NavLinkDef {
  to: string;
  key: string;
  end?: boolean;
  live?: boolean;
}
const LINKS: NavLinkDef[] = [
  { to: "", key: "nav.dashboard", end: true },
  { to: "/schedule", key: "nav.timeline" },
  { to: "/speakers", key: "nav.speakers" },
  { to: "/committee", key: "nav.committee" },
  { to: "/organizations", key: "nav.orgs" },
];

export default function Nav({ confId }: { confId: string }) {
  const { t } = useI18n();
  // The live "Now" view is only meaningful while the conference is running, so
  // its nav entry appears solely between the conference's start and end dates
  // (read from the lightweight manifest — no dataset load needed).
  const meta = conferenceMeta(confId);
  const today = todayISO();
  const showNow = !!meta && today >= meta.start_date && today <= meta.end_date;
  const links: NavLinkDef[] = showNow
    ? [LINKS[0], { to: "/now", key: "nav.now", live: true }, ...LINKS.slice(1)]
    : LINKS;
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <motion.header
      className={`nav ${scrolled ? "nav--scrolled" : ""}`}
      initial={{ y: -70 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="nav__inner container">
        <Link to="/" className="nav__home" aria-label="Fora">
          <ForaMark size={22} />
        </Link>
        <ConferenceSwitcher confId={confId} />
        <nav className="nav__links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={`/${confId}${l.to}`}
              end={l.end}
              className={({ isActive }) =>
                `nav__link ${l.live ? "nav__link--live" : ""} ${isActive ? "is-active" : ""}`
              }
            >
              {l.live && <span className="nav__livedot" aria-hidden />}
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
        <div className="nav__tools">
          <AccountMenu />
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
