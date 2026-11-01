import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useI18n } from "../lib/i18n-store";
import { easeOut } from "../lib/motion";
import Icon from "./Icon";

export default function BackToTop() {
  const { lang } = useI18n();
  const { scrollY, scrollYProgress } = useScroll({ trackContentSize: true });
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
      <svg className="backtotop__ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle className="backtotop__track" cx="22" cy="22" r="21" />
        <motion.circle className="backtotop__progress" cx="22" cy="22" r="21"
          style={{ pathLength: scrollYProgress }} />
      </svg>
      <Icon name="arrow-up" size={18} />
    </motion.button>}
  </AnimatePresence>, document.body);
}
