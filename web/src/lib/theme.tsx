import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Ctx, KEY, LEGACY_KEY, systemDark, type ThemeCtx, type ThemeMode } from "./theme-store";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    () => ((localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)) as ThemeMode) || "system",
  );
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSysDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const resolved: "light" | "dark" =
    mode === "system" ? (sysDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    localStorage.setItem(KEY, mode);
    localStorage.removeItem(LEGACY_KEY);
  }, [mode]);

  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      resolved,
      cycle: () =>
        setMode((m) =>
          m === "system" ? "light" : m === "light" ? "dark" : "system",
        ),
    }),
    [mode, resolved],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
