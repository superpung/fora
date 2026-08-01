import { Link, useLocation } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { useHScroll } from "../lib/hscroll";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import AccountMenu from "./AccountMenu";
import ForaMark from "./ForaMark";
import Icon from "./Icon";
import ConferenceSwitcher from "./ConferenceSwitcher";
import { useI18n } from "../lib/i18n-store";
import { useAi } from "../lib/ai-store";
import { useSearchUI } from "../lib/search-store";
import { conferenceMeta } from "../lib/conferences";
import { todayISO } from "../lib/data";

// In-conference links, relative to the active conference (`/:conf/...`).
interface NavLinkDef {
  to: string;
  key: string;
  live?: boolean;
}
const LINKS: NavLinkDef[] = [
  { to: "", key: "nav.dashboard" },
  { to: "/schedule", key: "nav.timeline" },
  { to: "/speakers", key: "nav.speakers" },
  { to: "/committee", key: "nav.committee" },
  { to: "/organizations", key: "nav.orgs" },
];

export default function Nav({ confId }: { confId: string }) {
  const { t, lang } = useI18n();
  const { enabled: aiEnabled } = useAi();
  const { setOpen: setSearchOpen } = useSearchUI();
  // The live "Now" view is only meaningful while the conference is running, so
  // its nav entry appears solely between the conference's start and end dates
  // (read from the lightweight manifest — no dataset load needed).
  const meta = conferenceMeta(confId);
  const today = todayISO();
  const showNow = !!meta && today >= meta.start_date && today <= meta.end_date;
  const links: NavLinkDef[] = [
    LINKS[0],
    ...(showNow ? [{ to: "/now", key: "nav.now", live: true } as NavLinkDef] : []),
    LINKS[1], // the timeline; the two AI views sit behind it
    // Both the planner and the topic map are AI-derived: with AI content off
    // they do not exist (their routes explain themselves if reached directly).
    ...(aiEnabled
      ? ([
          { to: "/plan", key: "nav.plan" },
          { to: "/topics", key: "nav.topics" },
        ] as NavLinkDef[])
      : []),
    ...LINKS.slice(2),
  ];
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  // On a narrow screen the row does not fit and scrolls. Keep the current view
  // in sight and fade the side that continues — the links are the only way into
  // most of the site, so a silent cut hides it. Re-run on the route (the active
  // link moved), the language (every label re-measures) and the AI toggle
  // (which adds or removes two entries).
  const { pathname } = useLocation();
  const linksRef = useHScroll<HTMLElement>([pathname, lang, aiEnabled, showNow]);

  // Which entry is the current view. React Router's NavLink decides this by
  // comparing path strings, so `/:conf/` — a trailing slash anyone can type,
  // bookmark or share, and which renders the dashboard perfectly well — matched
  // no entry at all and the bar showed no current view. Normalise the path once
  // and decide here, so the highlight and `aria-current` agree on every
  // spelling of the same URL.
  const here = pathname.replace(/\/+$/, "") || "/";
  const isActive = (to: string) => {
    const target = `/${confId}${to}`;
    // The dashboard is `/:conf` exactly; the rest also own their sub-paths.
    return here === target || (to !== "" && here.startsWith(`${target}/`));
  };

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
        <nav className="nav__links hstrip" ref={linksRef}>
          {links.map((l) => {
            const active = isActive(l.to);
            return (
              <Link
                key={l.to}
                to={`/${confId}${l.to}`}
                aria-current={active ? "page" : undefined}
                className={`nav__link ${l.live ? "nav__link--live" : ""} ${active ? "is-active" : ""}`}
              >
                {l.live && <span className="nav__livedot" aria-hidden />}
                {t(l.key)}
              </Link>
            );
          })}
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
