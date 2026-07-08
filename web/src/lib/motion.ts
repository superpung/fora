import type { Variants, Transition } from "framer-motion";

export const easeOut: Transition["ease"] = [0.22, 1, 0.36, 1];

// 页面进入/退出
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut, when: "beforeChildren" },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.28, ease: easeOut } },
};

// 交错容器
export const stagger = (delayChildren = 0.05, stagger = 0.06): Variants => ({
  animate: { transition: { delayChildren, staggerChildren: stagger } },
});

// 子项上浮
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
