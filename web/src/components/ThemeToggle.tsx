import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../lib/theme-store";
import { useI18n } from "../lib/i18n-store";
import Icon, { type IconName } from "./Icon";

const ICON: Record<string, IconName> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};
const LABEL: Record<string, Record<string, string>> = {
  zh: { system: "跟随系统", light: "浅色", dark: "深色" },
  en: { system: "System", light: "Light", dark: "Dark" },
};

export default function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const { lang } = useI18n();
  const label = LABEL[lang][mode];
  return (
    <button
      className="theme-toggle"
      onClick={cycle}
      aria-label={lang === "zh" ? `主题：${label}（点击切换）` : `Theme: ${label} (click to switch)`}
      title={lang === "zh" ? `主题：${label}` : `Theme: ${label}`}
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
          <Icon name={ICON[mode]} size={16} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
