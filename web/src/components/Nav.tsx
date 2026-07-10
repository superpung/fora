import { NavLink, Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
import { conference } from "../lib/data";

const LINKS = [
  { to: "/", label: "日程面板", end: true },
  { to: "/schedule", label: "时间线" },
  { to: "/committee", label: "委员会" },
  { to: "/organizations", label: "组织与赞助" },
];

export default function Nav() {
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
        <Link to="/" className="nav__brand">
          <span className="nav__logo" aria-hidden>
            <Icon name="chip" size={18} />
          </span>
          <span className="nav__brandtext">
            {conference.name.en ?? conference.name.zh}
          </span>
        </Link>
        <nav className="nav__links">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `nav__link ${isActive ? "is-active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="nav__underline"
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </motion.header>
  );
}
