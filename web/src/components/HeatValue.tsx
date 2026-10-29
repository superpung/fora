import { useHeat } from "../lib/heat-store";
import { useI18n } from "../lib/i18n-store";
export default function HeatValue({ kind, id }: { kind: "forums" | "talks"; id: string }) {
  const { data, status } = useHeat();
  const { lang } = useI18n();
  const label = lang === "en" ? "Heat" : "热度";
  const score = status === "ready" && data ? data[kind][id] ?? 0 : null;
  return <span className="heat-value mono" title={lang === "en" ? "Weighted interest, not attendance" : "关注行为加权值，非人数"}
    aria-label={`${label} ${score ?? (lang === "en" ? "unavailable" : "不可用")}`}>
    {label} {score ?? "—"}
  </span>;
}
