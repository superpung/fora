import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "./Icon";
import { useFollow } from "../lib/follow-store";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import {
  collectFollowedItems,
  exportFilename,
  toICS,
  toCSV,
  toMarkdown,
  toFollowJSON,
  download,
  type ExportFormat,
} from "../lib/export";

const FORMATS: { key: ExportFormat; labelKey: string; icon: "calendar" | "file" }[] = [
  { key: "ics", labelKey: "export.ics", icon: "calendar" },
  { key: "csv", labelKey: "export.csv", icon: "file" },
  { key: "md", labelKey: "export.md", icon: "file" },
  { key: "json", labelKey: "export.json", icon: "file" },
];

export default function ExportMenu() {
  const { forums, speakers, talks } = useFollow();
  const views = useConference();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const run = (fmt: ExportFormat) => {
    const snapshot = { forums, speakers, talks };
    const items = collectFollowedItems(snapshot, views);
    setOpen(false);
    if (!items.length) return;
    const now = new Date().toISOString();
    if (fmt === "ics")
      download(exportFilename(items, "ics", views), toICS(items, now, views), "text/calendar;charset=utf-8");
    else if (fmt === "csv")
      download(exportFilename(items, "csv", views), toCSV(items), "text/csv;charset=utf-8");
    else if (fmt === "md")
      download(exportFilename(items, "md", views), toMarkdown(items, views), "text/markdown;charset=utf-8");
    else
      download(
        exportFilename(items, "json", views),
        toFollowJSON(snapshot, now, views),
        "application/json;charset=utf-8",
      );
  };

  return (
    <div className="exportmenu" ref={ref}>
      <button className="linkbtn exportmenu__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name="download" size={13} /> {t("export.button")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="exportmenu__pop"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {FORMATS.map((f) => (
              <button key={f.key} role="menuitem" onClick={() => run(f.key)}>
                <Icon name={f.icon} size={14} /> {t(f.labelKey)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
