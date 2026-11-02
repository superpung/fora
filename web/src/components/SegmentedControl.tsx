import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { easeOut } from "../lib/motion";

export default function SegmentedControl<T extends string>({ value, onChange, label, options, subtle = false }: {
  value: T;
  onChange: (value: T) => void;
  label: string;
  options: { value: T; label: ReactNode; title?: string }[];
  subtle?: boolean;
}) {
  return <div className={`segtoggle${subtle ? " segtoggle--sub" : ""}`} role="tablist" aria-label={label}>
    {options.map((option, index) => <motion.button key={option.value} role="tab"
      aria-selected={value === option.value} tabIndex={value === option.value ? 0 : -1}
      className={`segtoggle__opt ${value === option.value ? "is-on" : ""}`} title={option.title}
      whileTap={{ scale: 0.97 }} transition={{ duration: 0.12, ease: easeOut }}
      onClick={() => onChange(option.value)} onKeyDown={event => {
        const next = event.key === "ArrowRight" ? (index + 1) % options.length
          : event.key === "ArrowLeft" ? (index + options.length - 1) % options.length
          : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : null;
        if (next === null) return;
        event.preventDefault();
        onChange(options[next].value);
        (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
      }}>{option.label}</motion.button>)}
  </div>;
}
