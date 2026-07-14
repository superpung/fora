import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { riseItem } from "../lib/motion";

/** Rise-and-reveal when scrolled into view. */
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
