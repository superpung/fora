import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { apply, serialize } from "./sync";
import { emptyBundle, fingerprint, mergeBundles, type SyncRecord } from "./sync-model";
import { SyncContext, type SyncState, type SyncUser, type Statistics } from "./sync-store";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store",
    signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Object.assign(Error(`Sync HTTP ${response.status}`), { status: response.status });
  return response.json() as Promise<T>;
}
function saved(user: SyncUser): SyncRecord | null {
  try { return JSON.parse(localStorage.getItem(`fora.sync:${user.id}`) || "null"); }
  catch { return null; }
}
function remember(user: SyncUser, record: SyncRecord): void {
  localStorage.setItem(`fora.sync:${user.id}`, JSON.stringify(record));
  localStorage.setItem("fora.sync-owner", user.id);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [statistics, setStatisticsState] = useState<Statistics | null>(null);
  const [statisticsPending, setStatisticsPending] = useState(false);
  const [statisticsError, setStatisticsError] = useState(false);
  const acceptStatistics = (next: Statistics) => setStatisticsState(prev => !prev || next.revision >= prev.revision ? next : prev);
  const [user, setUser] = useState<SyncUser | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<SyncState["status"]>("signed_out");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const account = useRef(user); account.current = user;
  const runRef = useRef<() => Promise<void>>(async () => {});

  const schedule = useCallback(() => {
    if (!account.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void runRef.current(), 2000);
  }, []);

  const syncNow = useCallback(async (choice?: "local" | "cloud" | "merge") => {
    const identity = account.current;
    if (!identity || busy.current) return;
    busy.current = true;
    setStatus("syncing");
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const remote = await api<SyncRecord & { statistics: Statistics }>("/api/sync");
        if (account.current?.id !== identity.id) return;
        acceptStatistics(remote.statistics);
        const local = serialize(), meta = saved(identity);
        const owner = localStorage.getItem("fora.sync-owner");
        const merged = mergeBundles(meta?.bundle ?? emptyBundle(), local, remote.bundle);
        if (!choice && ((owner && owner !== identity.id) || merged.conflicts.length)) {
          setStatus("conflict"); return;
        }
        const bundle = choice === "local" ? local : choice === "cloud" ? remote.bundle :
          choice === "merge" ? { ...merged.bundle, follows: [...new Set([...local.follows, ...remote.bundle.follows])].sort() } : merged.bundle;
        let committed = remote;
        if (fingerprint(bundle) !== fingerprint(remote.bundle)) {
          try {
            committed = await api<SyncRecord & { statistics: Statistics }>("/api/sync", { method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ revision: remote.revision, bundle }) });
          } catch (error) {
            if ((error as { status?: number }).status === 409) continue;
            throw error;
          }
        }
        if (account.current?.id !== identity.id) return;
        // Preserve edits made while the write was in flight; sync them next.
        const latest = serialize();
        const resulting = fingerprint(latest) === fingerprint(local) ? committed.bundle :
          mergeBundles(local, latest, committed.bundle).bundle;
        remember(identity, committed);
        if (fingerprint(latest) !== fingerprint(resulting)) apply(resulting);
        setLastSyncedAt(committed.updated_at || null);
        const pending = fingerprint(resulting) !== fingerprint(committed.bundle);
        setStatus(pending ? "pending" : "synced");
        if (pending) schedule();
        return;
      }
      setStatus("pending"); schedule();
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        account.current = null; setUser(null); setStatus("signed_out");
      } else setStatus("error");
    } finally { busy.current = false; }
  }, [schedule]);
  runRef.current = syncNow;

  useEffect(() => {
    let cancelled = false;
    api<{ enabled: boolean; user: SyncUser | null; statistics: Statistics | null }>("/api/session").then(result => {
      if (cancelled) return;
      setEnabled(result.enabled); setUser(result.user); setStatisticsState(result.statistics);
      if (!result.user) setStatus("signed_out");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) { setStatisticsState(null); setStatisticsError(false); return; }
    void syncNow();
    const refresh = () => { if (document.visibilityState === "visible") void syncNow(); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = setInterval(refresh, 300000);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user, syncNow]);

  const markLocalChange = useCallback(() => {
    if (!user) return;
    const meta = saved(user);
    if (meta && fingerprint(serialize()) === fingerprint(meta.bundle)) return;
    setStatus("pending"); schedule();
  }, [user, schedule]);

  const logout = async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      await api("/api/auth/logout", { method: "POST" });
      account.current = null; setUser(null); setStatus("signed_out");
    } catch { setStatus("error"); }
  };
  const setStatistics = async (next: boolean) => {
    const identity = account.current;
    if (!identity || !statistics || statisticsPending) return;
    setStatisticsPending(true); setStatisticsError(false);
    try {
      const updated = await api<Statistics>("/api/statistics", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next, revision: statistics.revision }) });
      if (account.current?.id === identity.id) acceptStatistics(updated);
    } catch {
      if (account.current?.id === identity.id) { setStatisticsError(true); void syncNow(); }
    } finally { setStatisticsPending(false); }
  };
  const value: SyncState = { statistics, statisticsPending, statisticsError, setStatistics, enabled, user, isLoggedIn: !!user, status, conflict: status === "conflict",
    lastSyncedAt, login: () => { location.href = "/api/auth/login"; }, logout: () => void logout(),
    syncNow, markLocalChange, resolveConflict: choice => syncNow(choice) };
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
