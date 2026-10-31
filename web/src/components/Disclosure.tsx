import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { easeOut } from "../lib/motion";
import Icon, { type IconName } from "./Icon";

export default function Disclosure({ label, icon, children, className = "" }: {
  label: string; icon: IconName; children: ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className={`disclosure ${className}`}>
    <button className="disclosure__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <Icon name={icon} size={13} /> {label}
      <span className={`caret ${open ? "caret--up" : ""}`}><Icon name="chevron-down" size={12} /></span>
    </button>
    <AnimatePresence initial={false}>{open && <motion.div id={id} className="disclosure__content"
      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: easeOut }}>
      {children}
    </motion.div>}</AnimatePresence>
  </div>;
}
