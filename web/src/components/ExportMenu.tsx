import { useState, useRef, useEffect } from "react";
import Icon from "./Icon";
import { useFollow } from "../lib/follow-store";
import {
  collectFollowedItems,
  toICS,
  toCSV,
  toMarkdown,
  download,
  type ExportFormat,
} from "../lib/export";

const FORMATS: { key: ExportFormat; label: string; icon: "calendar" | "file" }[] = [
  { key: "ics", label: "日历 (.ics)", icon: "calendar" },
  { key: "csv", label: "表格 (.csv)", icon: "file" },
  { key: "md", label: "Markdown (.md)", icon: "file" },
];

export default function ExportMenu() {
  const { forums, speakers, talks } = useFollow();
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
    const items = collectFollowedItems({ forums, speakers, talks });
    setOpen(false);
    if (!items.length) return;
    if (fmt === "ics")
      download("我的日程.ics", toICS(items, new Date().toISOString()), "text/calendar;charset=utf-8");
    else if (fmt === "csv") download("我的日程.csv", toCSV(items), "text/csv;charset=utf-8");
    else download("我的日程.md", toMarkdown(items), "text/markdown;charset=utf-8");
  };

  return (
    <div className="exportmenu" ref={ref}>
      <button className="linkbtn exportmenu__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name="download" size={13} /> 导出
      </button>
      {open && (
        <div className="exportmenu__pop" role="menu">
          {FORMATS.map((f) => (
            <button key={f.key} role="menuitem" onClick={() => run(f.key)}>
              <Icon name={f.icon} size={14} /> {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
