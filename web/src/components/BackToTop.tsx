import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useI18n } from "../lib/i18n-store";
import { easeOut } from "../lib/motion";
import Icon from "./Icon";

export default function BackToTop() {
  const { lang } = useI18n();
  const { scrollY } = useScroll();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(() => window.scrollY > 600);
  useMotionValueEvent(scrollY, "change", y => setVisible(y > 600));
  const label = lang === "en" ? "Back to top" : "回到顶部";
  return createPortal(<AnimatePresence>
    {visible && <motion.button type="button" className="squarebtn backtotop"
      aria-label={label} title={label}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      transition={{ duration: reducedMotion ? 0 : 0.2, ease: easeOut }}
      onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" })}>
      <Icon name="arrow-up" size={18} />
    </motion.button>}
  </AnimatePresence>, document.body);
}
