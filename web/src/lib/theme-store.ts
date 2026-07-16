import { createContext, useContext } from "react";

// Theme context and helpers. Kept component-free so the provider file
// (theme.tsx) exports only a component and stays Fast-Refresh friendly.

export type ThemeMode = "system" | "light" | "dark";

export interface ThemeCtx {
  mode: ThemeMode;
  resolved: "light" | "dark";
  cycle: () => void;
}

export const KEY = "fora-theme";

export function systemDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme outside provider");
  return c;
}
