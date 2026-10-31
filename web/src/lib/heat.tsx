import { useEffect, useState, type ReactNode } from "react";
import { conferenceMeta } from "./conferences";
import { useConference } from "./conference-store";
import { HEAT_INTERVAL_MS, HeatContext, type HeatSnapshot, type HeatState } from "./heat-store";

let cached: { value: HeatSnapshot; expires: number } | null = null;
async function load(signal: AbortSignal) {
  if (cached && cached.expires > Date.now()) return cached;
  const request = () => fetch("/api/heat", { cache: "no-cache", signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  let response = await request();
  for (let retry = 0; retry < 24 && response.status === 503 && response.headers.get("Retry-After") === "1"; retry++) {
    await new Promise<void>((resolve, reject) => {
      const aborted = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", aborted); resolve(); }, 1000);
      signal.addEventListener("abort", aborted, { once: true });
      if (signal.aborted) aborted();
    });
    response = await request();
  }
  if (!response.ok) throw Error("Heat unavailable");
  const value = await response.json() as HeatSnapshot;
  if (!value?.conferences || !Number.isFinite(Date.parse(value.generated_at)) ||
    Object.values(value.conferences).some(entry => !entry || typeof entry.sha256 !== "string" ||
      [entry.forums, entry.talks].some(scores => !scores || Array.isArray(scores) || typeof scores !== "object" ||
        Object.values(scores).some(score => !Number.isSafeInteger(score) || score < 0)))) throw Error("Invalid heat response");
  const age = Number(response.headers.get("Cache-Control")?.match(/max-age=(\d+)/)?.[1] ?? 0);
  // The server rounds remaining seconds down. Avoid another request just before expiry.
  cached = { value, expires: Date.now() + Math.min(age + 1, HEAT_INTERVAL_MS / 1000) * 1000 };
  return cached;
}

/** Mounted only on the enabled heat page; other routes never poll heat. */
export function HeatProvider({ children }: { children: ReactNode }) {
  const { id } = useConference();
  const [snapshot, setSnapshot] = useState<HeatSnapshot | null>(null);
  const [status, setStatus] = useState<HeatState["status"]>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [nextRefreshAt, setNextRefreshAt] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let disposed = false;
    const visible = () => document.visibilityState === "visible" && navigator.onLine;
    const refresh = async () => {
      if (disposed || controller) return;
      if (!visible()) { if (!navigator.onLine) setStatus("error"); return; }
      clearTimeout(timer);
      controller = new AbortController();
      setRefreshing(true);
      let next = Date.now() + HEAT_INTERVAL_MS;
      try {
        const result = await load(controller.signal);
        if (disposed) return;
        setSnapshot(result.value);
        setStatus("ready");
        next = result.expires;
      } catch {
        if (disposed) return;
        cached = null;
        setSnapshot(null);
        setStatus("error");
      } finally {
        controller = null;
        if (!disposed) {
          setRefreshing(false);
          setNextRefreshAt(navigator.onLine ? next : 0);
          if (visible()) timer = setTimeout(() => void refresh(), Math.max(0, next - Date.now()));
        }
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      if (!navigator.onLine) { setSnapshot(null); setStatus("error"); setNextRefreshAt(0); }
      else if (visible()) void refresh();
    };
    void refresh();
    window.addEventListener("online", visibility);
    window.addEventListener("offline", visibility);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("online", visibility);
      window.removeEventListener("offline", visibility);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [id]);
  const entry = snapshot?.conferences[id];
  const data = entry && entry.sha256 === conferenceMeta(id)?.sha256 ? entry : null;
  return <HeatContext.Provider value={{ data, status: status === "ready" && !data ? "error" : status,
    refreshing, updatedAt: data ? snapshot!.generated_at : null, nextRefreshAt }}>
    {children}
  </HeatContext.Provider>;
}
