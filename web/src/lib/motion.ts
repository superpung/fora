import type { Variants, Transition } from "framer-motion";

export const easeOut: Transition["ease"] = [0.22, 1, 0.36, 1];

// Page enter animation. There is intentionally NO route-level `exit`: with a
// route-level exit + AnimatePresence, an outgoing page is kept mounted while it
// animates out, which (a) stacks it below the incoming page — doubling document
// height — and (b) deadlocks when navigating to a #hash URL because the retained
// outgoing <Routes> re-matches the new route and suspends on its lazy chunk,
// blanking the page on Back. Pages now unmount immediately and the new one
// animates in; per-component AnimatePresence (cards, day switch) keeps its exit.
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut, when: "beforeChildren" },
  },
};

// Stagger container.
export const stagger = (delayChildren = 0.05, stagger = 0.06): Variants => ({
  animate: { transition: { delayChildren, staggerChildren: stagger } },
});

// Child rise-up.
export const riseItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

export const scaleItem: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
};
