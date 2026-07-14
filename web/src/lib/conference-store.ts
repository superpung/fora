import { createContext, useContext } from "react";
import type { ConferenceViews } from "./data";
import type { ConferenceMeta } from "./conferences";

// Context + hook for the active conference, kept component-free (the provider
// lives in conference.tsx) so this module stays Fast-Refresh friendly. The value
// is one conference's full derived views plus its id and manifest metadata.

export interface ConferenceContextValue extends ConferenceViews {
  id: string;
  meta: ConferenceMeta;
}

export const ConferenceCtx = createContext<ConferenceContextValue | null>(null);

export function useConference(): ConferenceContextValue {
  const ctx = useContext(ConferenceCtx);
  if (!ctx) throw new Error("useConference must be used within ConferenceProvider");
  return ctx;
}
