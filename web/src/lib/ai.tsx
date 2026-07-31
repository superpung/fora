import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGistSync } from "@repus/gist-sync/react";
import {
  AiCtx,
  AI_PREFS_UPDATED,
  loadAiEnabled,
  saveAiEnabled,
  type AiCtxValue,
} from "./ai-store";

// Provider for the site-wide "show AI-generated content" switch. Mounted inside
// GistSyncProvider so a change can markLocalChange() and push to the Gist —
// same shape as ReminderProvider.

export function AiProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(loadAiEnabled);

  // Persist and, after the first (mount) run, tell the sync engine so the change
  // pushes to the Gist. Mirrors reminder.tsx / follow.tsx.
  const { markLocalChange } = useGistSync();
  const markRef = useRef(markLocalChange);
  markRef.current = markLocalChange;
  const firstRun = useRef(true);
  useEffect(() => {
    saveAiEnabled(enabled);
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    markRef.current();
  }, [enabled]);

  // A sync pull writes the pref straight into localStorage; reload from there.
  useEffect(() => {
    const on = () => setEnabledState(loadAiEnabled());
    window.addEventListener(AI_PREFS_UPDATED, on);
    return () => window.removeEventListener(AI_PREFS_UPDATED, on);
  }, []);

  const setEnabled = useCallback((v: boolean) => setEnabledState(v), []);
  const toggle = useCallback(() => setEnabledState((v) => !v), []);

  const value = useMemo<AiCtxValue>(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle],
  );

  return <AiCtx.Provider value={value}>{children}</AiCtx.Provider>;
}
