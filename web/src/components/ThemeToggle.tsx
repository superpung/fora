import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../lib/theme";

const ICON: Record<string, string> = {
  system: "◐",
  light: "☀",
  dark: "☾",
};
const LABEL: Record<string, string> = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};

export default function ThemeToggle() {
  const { mode, cycle } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={cycle}
      aria-label={`主题：${LABEL[mode]}（点击切换）`}
      title={`主题：${LABEL[mode]}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mode}
          initial={{ opacity: 0, rotate: -40, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 40, scale: 0.6 }}
          transition={{ duration: 0.25 }}
          className="theme-toggle__icon"
        >
          {ICON[mode]}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
