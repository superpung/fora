import type { CSSProperties } from "react";
import { useHeat } from "../lib/heat-store";
import { useI18n } from "../lib/i18n-store";
export default function HeatValue({ kind, id }: { kind: "forums" | "talks"; id: string }) {
  const { data } = useHeat();
  const { lang } = useI18n();
  const score = data?.[kind][id] ?? 0;
  return <span className="heat-value mono" style={{ "--heat-intensity": `${Math.min(score / 600, 1) * 100}%` } as CSSProperties}
    aria-label={`${lang === "en" ? "Heat" : "热度"} ${score}`}>{score}</span>;
}
