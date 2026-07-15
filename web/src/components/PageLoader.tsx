import { motion } from "framer-motion";
import { useI18n } from "../lib/i18n-store";

// Suspense fallback shown while a conference dataset (or a lazy page chunk)
// loads. Deliberately minimal — a centred spinner on the page surface.
export default function PageLoader() {
  const { t } = useI18n();
  return (
    <div className="pageloader" role="status" aria-label={t("common.loading")}>
      <motion.span
        className="pageloader__spin"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
