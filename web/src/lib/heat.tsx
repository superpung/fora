import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { conferenceMeta } from "./conferences";
import { useConference } from "./conference-store";
import { HeatContext, type HeatSnapshot, type HeatState } from "./heat-store";

let cached: { value: HeatSnapshot; expires: number } | null = null;
let pending: Promise<HeatSnapshot> | null = null;
async function load(force: boolean): Promise<HeatSnapshot> {
  if (!force && cached && cached.expires > Date.now()) return cached.value;
  if (pending) return pending;
  pending = (async () => {
    const request = () => fetch("/api/heat", { cache: "no-cache", signal: AbortSignal.timeout(15000) });
    let response = await request();
    for (let retry = 0; retry < 24 && response.status === 503 && response.headers.get("Retry-After") === "1"; retry++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      response = await request();
    }
    if (!response.ok) throw Error("Heat unavailable");
    const value = await response.json() as HeatSnapshot;
    if (!value?.conferences || !Number.isFinite(Date.parse(value.generated_at)) ||
      Object.values(value.conferences).some(entry => !entry || typeof entry.sha256 !== "string" ||
        [entry.forums, entry.talks].some(scores => !scores || Array.isArray(scores) || typeof scores !== "object" ||
          Object.values(scores).some(score => !Number.isSafeInteger(score) || score < 0)))) throw Error("Invalid heat response");
    const age = Number(response.headers.get("Cache-Control")?.match(/max-age=(\d+)/)?.[1] ?? 0);
    cached = { value, expires: Date.now() + Math.min(age, 300) * 1000 };
    return value;
  })();
  try { return await pending; } catch (error) { cached = null; throw error; }
  finally { pending = null; }
}

export function HeatProvider({ children }: { children: ReactNode }) {
  const { id } = useConference();
  const { pathname } = useLocation();
  const [snapshot, setSnapshot] = useState<HeatSnapshot | null>(null);
  const [status, setStatus] = useState<HeatState["status"]>("loading");
  const refresh = useCallback((force = false) => {
    setStatus("loading");
    void load(force).then(value => { setSnapshot(value); setStatus("ready"); })
      .catch(() => { setSnapshot(null); setStatus("error"); });
  }, []);
  useEffect(() => {
    const active = pathname === `/${id}` || pathname === `/${id}/` || pathname.includes("/forum/") || pathname.endsWith("/popular");
    if (!active) return;
    refresh();
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("online", visible); document.removeEventListener("visibilitychange", visible); };
  }, [id, pathname, refresh]);
  const entry = snapshot?.conferences[id];
  const data = entry && entry.sha256 === conferenceMeta(id)?.sha256 ? entry : null;
  return <HeatContext.Provider value={{ data, status: status === "ready" && !data ? "error" : status, refresh: () => refresh(true) }}>
    {children}
  </HeatContext.Provider>;
}
