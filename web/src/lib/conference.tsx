import { use, useMemo } from "react";
import { ConferenceCtx, type ConferenceContextValue } from "./conference-store";
import { conferenceMeta, loadConferenceViews } from "./conferences";

// Provides the active conference's derived views to the tree. It suspends on the
// (memoised) dataset promise via React's `use`, so the nearest <Suspense> shows
// a fallback until the conference's data has loaded and its views are built.
export function ConferenceProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const views = use(loadConferenceViews(id));
  const value = useMemo<ConferenceContextValue>(
    () => ({ ...views, id, meta: conferenceMeta(id)! }),
    [views, id],
  );
  return <ConferenceCtx.Provider value={value}>{children}</ConferenceCtx.Provider>;
}
