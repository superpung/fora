import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FollowActionsCtx, type FollowActionsApi } from "./follow-actions-store";
import { useConference } from "./conference-store";
import { useFollow } from "./follow-store";
import { useI18n } from "./i18n-store";
import {
  collectFollowedItems,
  exportFilename,
  toICS,
  toCSV,
  toMarkdown,
  toFollowJSON,
  download,
  parseFollowJSON,
  type ExportFormat,
} from "./export";
import { reminderItemsKey, REMINDER_ITEMS_UPDATED } from "./reminder-store";

// Site-wide provider for the follow-actions slot (see follow-actions-store.ts).
export function FollowActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<FollowActionsApi | null>(null);
  const register = useCallback((api: FollowActionsApi | null) => setActions(api), []);
  const value = useMemo(() => ({ actions, register }), [actions, register]);
  return <FollowActionsCtx.Provider value={value}>{children}</FollowActionsCtx.Provider>;
}

// Headless bridge mounted INSIDE a conference's data providers. It packages the
// conference-scoped import/export/clear operations and publishes them to the
// global slot, so the nav's account menu can offer them. Re-registers whenever
// the followed sets change so exports always snapshot the latest agenda.
export function FollowActionsBridge() {
  const register = useContext(FollowActionsCtx).register;
  const views = useConference();
  const { forums, speakers, talks, clearAll, importFollows } = useFollow();
  const { t } = useI18n();
  const confId = views.id;

  // Cache this conference's starred items (resolved title/date/start) so the
  // site-wide reminder scheduler can plan notifications for every conference the
  // user has opened — even from the hub — without reloading each dataset.
  useEffect(() => {
    const items = collectFollowedItems({ forums, speakers, talks }, views);
    const payload = {
      confId,
      nameZh: views.conference.name.zh,
      nameEn: views.conference.name.en || views.conference.name.zh,
      // drop abstracts to keep the cache small; the scheduler only needs timing.
      items: items.map(({ abstract: _abstract, ...rest }) => rest),
    };
    try {
      localStorage.setItem(reminderItemsKey(confId), JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(REMINDER_ITEMS_UPDATED));
    } catch {
      /* quota / privacy mode — reminders simply won't have this conference's items */
    }
  }, [confId, views, forums, speakers, talks]);

  useEffect(() => {
    const runExport = (fmt: ExportFormat) => {
      const snapshot = { forums, speakers, talks };
      const items = collectFollowedItems(snapshot, views);
      if (!items.length) return;
      const now = new Date().toISOString();
      if (fmt === "ics")
        download(exportFilename(items, "ics", views), toICS(items, now, views), "text/calendar;charset=utf-8");
      else if (fmt === "csv")
        download(exportFilename(items, "csv", views), toCSV(items), "text/csv;charset=utf-8");
      else if (fmt === "md")
        download(exportFilename(items, "md", views), toMarkdown(items, views), "text/markdown;charset=utf-8");
      else
        download(
          exportFilename(items, "json", views),
          toFollowJSON(snapshot, now, views),
          "application/json;charset=utf-8",
        );
    };

    const importFile = async (file: File): Promise<{ ok: boolean; message: string }> => {
      try {
        const parsed = parseFollowJSON(await file.text(), confId);
        if (!parsed) return { ok: false, message: t("import.badFile") };
        if (parsed.conferenceMismatch)
          return { ok: false, message: t("import.mismatch", { conf: parsed.conference ?? "" }) };
        const n = importFollows(parsed.follows);
        return { ok: true, message: t("import.done", { n }) };
      } catch {
        return { ok: false, message: t("import.failed") };
      }
    };

    register({
      followedCount: forums.size + speakers.size + talks.size,
      runExport,
      importFile,
      clearAll,
    });
    return () => register(null);
  }, [register, views, forums, speakers, talks, clearAll, importFollows, t, confId]);

  return null;
}
