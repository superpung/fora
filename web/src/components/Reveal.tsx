import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { riseItem } from "../lib/motion";

/** 滚动进入视口时上浮揭示 */
export default function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={riseItem}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
