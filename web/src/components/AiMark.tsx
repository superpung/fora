import { useI18n } from "../lib/i18n-store";
import Icon from "./Icon";

// Provenance marking for AI-GENERATED content — the visible half of the rule
// that model output is never passed off as the conference's own words.
//
// Dataset side: everything a model produced lives in a talk's separate
// `enrichment` container, never mixed into the verbatim `title`/`abstract`.
// UI side: any surface that renders such content must carry a mark. Use
//   <AiBadge />  — a compact chip next to the content itself, and
//   <AiNote />   — the spelled-out disclaimer, once per surface.
// Whether the content renders at all is decided by useAi().enabled (ai-store).

/** Compact "AI" chip to sit beside a generated line (a TL;DR, a topic row).
    Carries the disclaimer as its tooltip/accessible name. */
export function AiBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={`ai-badge${className ? ` ${className}` : ""}`}
      title={t("ai.disclaimer")}
      aria-label={t("ai.disclaimer")}
    >
      <Icon name="sparkle" size={11} />
      {t("ai.badge")}
    </span>
  );
}

/** The spelled-out disclaimer: "AI-generated — may contain errors; refer to the
    original." Render once per surface that shows AI content. */
export function AiNote({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <p className={`ai-note${className ? ` ${className}` : ""}`}>
      <Icon name="sparkle" size={12} />
      <span>{t("ai.disclaimer")}</span>
    </p>
  );
}
