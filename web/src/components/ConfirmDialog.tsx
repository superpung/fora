import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { easeOut } from "../lib/motion";

// A small animated confirm modal: fading backdrop + a dialog that scales/rises
// in. Escape or a backdrop click cancels. Used for destructive actions like
// signing out.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onCancel]);

  // Rendered through a portal to <body> so the fixed-position backdrop anchors to
  // the viewport, not to any transformed ancestor (framer-motion nav/popover).
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: easeOut }}
          onMouseDown={onCancel}
        >
          <motion.div
            className="confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: easeOut }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="confirm__title">{title}</div>
            {message && <div className="confirm__msg">{message}</div>}
            <div className="confirm__actions">
              <button className="confirm__btn" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                className={`confirm__btn confirm__btn--primary ${danger ? "confirm__btn--danger" : ""}`}
                onClick={onConfirm}
                autoFocus
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
