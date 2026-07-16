import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Ctx, KEY, detectLang, translate, type I18nCtx, type Lang } from "./i18n-store";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    localStorage.setItem(KEY, lang);
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === "zh" ? "en" : "zh")), []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );

  const value = useMemo<I18nCtx>(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
