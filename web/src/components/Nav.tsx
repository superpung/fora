import { NavLink } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import ConferenceSwitcher from "./ConferenceSwitcher";

// In-conference links, relative to the active conference (`/:conf/...`).
const LINKS = [
  { to: "", label: "日程面板", end: true },
  { to: "/schedule", label: "时间线" },
  { to: "/speakers", label: "讲者" },
  { to: "/committee", label: "委员会" },
  { to: "/organizations", label: "组织与赞助" },
];

export default function Nav({ confId }: { confId: string }) {
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
        <ConferenceSwitcher confId={confId} />
        <nav className="nav__links">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={`/${confId}${l.to}`}
              end={l.end}
              className={({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </motion.header>
  );
}
