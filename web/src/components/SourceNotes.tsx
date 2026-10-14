import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "../lib/i18n-store";
import Icon from "./Icon";

/** Source discrepancies remain readable with touch and keyboard, not only hover. */
export default function SourceNotes({ flags }: { flags?: string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { t } = useI18n();
  if (!flags?.length) return null;
  return (
    <div className="source-notes">
      <button className="source-notes__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Icon name="alert" size={13} /> {t("forum.sourceNotes")}
        <span className={`caret ${open ? "caret--up" : ""}`}><Icon name="chevron-down" size={12} /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div id={id} className="source-notes__content"
          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
          <ul>{flags.map((flag, i) => <li key={i}>{flag}</li>)}</ul>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
