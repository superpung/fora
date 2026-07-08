import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "system" | "light" | "dark";
interface ThemeCtx {
  mode: ThemeMode;
  resolved: "light" | "dark";
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = "cs-theme";

function systemDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem(KEY) as ThemeMode) || "system",
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

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme outside provider");
  return c;
}
