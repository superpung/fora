import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { conferenceList, conferenceMeta } from "../lib/conferences";

// The nav's brand doubles as a conference switcher (Vercel/Linear-style): it
// shows the active conference and opens a popover to jump to another or back to
// the hub. Uses the same open/close animation as the export menu for consistency.
export default function ConferenceSwitcher({ confId }: { confId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const current = conferenceMeta(confId);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="confsw" ref={ref}>
      <button
        className="confsw__btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="切换会议"
      >
        <span className="confsw__logo" aria-hidden>
          <Icon name="chip" size={16} />
        </span>
        <span className="confsw__name">{current?.name.en ?? current?.name.zh}</span>
        <span className={`caret ${open ? "caret--up" : ""}`}>
          <Icon name="chevron-down" size={14} />
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="confsw__pop"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="confsw__label">切换会议</div>
            {conferenceList.map((c) => (
              <button
                key={c.id}
                role="menuitem"
                className={`confsw__item ${c.id === confId ? "is-active" : ""}`}
                onClick={() => {
                  setOpen(false);
                  if (c.id !== confId) navigate(`/${c.id}`);
                }}
              >
                <span className="confsw__itemmain">
                  <span className="confsw__itemname">{c.name.zh}</span>
                  <span className="confsw__itemmeta">
                    {c.start_date}
                    {c.city ? ` · ${c.city}` : ""}
                  </span>
                </span>
                {c.id === confId && <Icon name="check" size={15} />}
              </button>
            ))}
            <Link to="/" className="confsw__all" onClick={() => setOpen(false)}>
              <Icon name="forums" size={14} /> 全部会议
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
