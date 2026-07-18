import { NavLink, Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import AccountMenu from "./AccountMenu";
import ForaMark from "./ForaMark";
import Icon from "./Icon";
import ConferenceSwitcher from "./ConferenceSwitcher";
import { useI18n } from "../lib/i18n-store";
import { useSearchUI } from "../lib/search-store";

// In-conference links, relative to the active conference (`/:conf/...`).
const LINKS = [
  { to: "", key: "nav.dashboard", end: true },
  { to: "/schedule", key: "nav.timeline" },
  { to: "/speakers", key: "nav.speakers" },
  { to: "/committee", key: "nav.committee" },
  { to: "/organizations", key: "nav.orgs" },
];

export default function Nav({ confId }: { confId: string }) {
  const { t } = useI18n();
  const { setOpen: setSearchOpen } = useSearchUI();
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
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={`/${confId}${l.to}`}
              end={l.end}
              className={({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`}
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
        <div className="nav__tools">
          <button
            className="nav__search"
            onClick={() => setSearchOpen(true)}
            aria-label={t("search.open")}
            title={t("search.open")}
          >
            <Icon name="search" size={15} />
            <span className="nav__searchhint mono" aria-hidden>⌘K</span>
          </button>
          <AccountMenu />
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
