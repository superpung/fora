import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "../lib/i18n-store";

// Language switch (zh ⇄ en). Persists to localStorage via the provider; the URL
// never changes. Shows the language you'd switch TO, matching the theme toggle's
// single-button-cycle feel.
export default function LangToggle() {
  const { lang, toggle, t } = useI18n();
  const next = lang === "zh" ? "EN" : "中";
  return (
    <button className="lang-toggle" onClick={toggle} aria-label={t("lang.toggle")} title={t("lang.toggle")}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={lang}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="lang-toggle__label"
        >
          {next}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
