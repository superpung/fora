import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { drawPoster, POSTER_W, POSTER_H, type PosterSpec } from "../lib/poster";
import { useI18n } from "../lib/i18n-store";
import Icon from "./Icon";

// A modal that renders a share poster to a <canvas> and lets the user save it as
// a PNG. The canvas is drawn once when the spec changes; "save" reads it back
// with toBlob and triggers a download — all client-side, no network.
export default function PosterModal({
  spec,
  filename,
  onClose,
}: {
  spec: PosterSpec | null;
  filename: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!spec || !canvasRef.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    drawPoster(canvasRef.current, spec, dpr);
  }, [spec]);

  useEffect(() => {
    if (!spec) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spec, onClose]);

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return (
    <AnimatePresence>
      {spec && (
        <motion.div
          className="postermodal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="postermodal__panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <canvas
              ref={canvasRef}
              className="postermodal__canvas"
              style={{ aspectRatio: `${POSTER_W} / ${POSTER_H}` }}
              aria-label={t("poster.previewAria")}
            />
            <div className="postermodal__actions">
              <button className="btn btn--ghost" onClick={onClose}>
                {t("common.close")}
              </button>
              <button className="btn btn--primary" onClick={save}>
                <Icon name="download" size={15} /> {t("poster.save")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
