import { createContext, useContext } from "react";

// Open/close state for the global search command palette. Kept component-free
// (the provider is inlined in ConferenceLayout) so this stays Fast-Refresh
// friendly, mirroring the conference-store / i18n-store split. The nav's search
// button toggles it; the palette (mounted inside the conference providers, so it
// can read the loaded dataset) reads it.
export interface SearchUI {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const SearchCtx = createContext<SearchUI | null>(null);

export function useSearchUI(): SearchUI {
  const c = useContext(SearchCtx);
  if (!c) throw new Error("useSearchUI must be used within SearchCtx.Provider");
  return c;
}
