import { useEffect } from "react";
import { useI18n } from "./i18n-store";

/** Set document.title to the given parts joined by " · " (falsy parts dropped),
    always ending in the (translated) site name. e.g. useTitle("完整日程", "CCF
    Chip 2026") → "完整日程 · CCF Chip 2026 · Fora". Nothing is restored on
    unmount — the next route sets its own title. */
export function useTitle(...parts: Array<string | undefined | null>) {
  const { t } = useI18n();
  const title = [...parts, t("common.siteName")].filter(Boolean).join(" · ");
  useEffect(() => {
    document.title = title;
  }, [title]);
}
