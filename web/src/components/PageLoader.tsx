import { motion } from "framer-motion";

// Suspense fallback shown while a conference dataset (or a lazy page chunk)
// loads. Deliberately minimal — a centred spinner on the page surface.
export default function PageLoader() {
  return (
    <div className="pageloader" role="status" aria-label="加载中">
      <motion.span
        className="pageloader__spin"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
