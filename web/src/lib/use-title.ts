import { useEffect } from "react";

/** Trailing brand shown in the browser tab / document title. */
export const SITE_NAME = "会议日程";

/** Set document.title to the given parts joined by " · " (falsy parts dropped),
    always ending in the site name. e.g. useTitle("完整日程", "CCF Chip 2026")
    → "完整日程 · CCF Chip 2026 · 会议日程". Nothing is restored on unmount — the
    next route sets its own title. */
export function useTitle(...parts: Array<string | undefined | null>) {
  const title = [...parts, SITE_NAME].filter(Boolean).join(" · ");
  useEffect(() => {
    document.title = title;
  }, [title]);
}
