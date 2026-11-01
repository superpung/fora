import { useContext, useEffect, useState } from "react";
import { ConferenceCtx } from "./conference-store";
import { clockAt } from "./conference-time";

// A live clock that re-ticks every 30s so "now"-dependent UI (the running-report
// highlight across the dashboard, schedule and timeline) drifts with real time
// without a page reload. Returns the venue's date (YYYY-MM-DD) and the current
// minute-of-day — the two values every "is it running now" check needs.
export interface Now {
  todayStr: string;
  nowMin: number;
}

/** Tick while visible and immediately refresh after returning to the tab. */
export function useClockMs(): number {
  const [ms, setMs] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setMs(Date.now());
    const id = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return ms;
}

export function useNow(): Now {
  const conference = useContext(ConferenceCtx)?.conference;
  return clockAt(useClockMs(), conference?.timezone);
}

// True when `date` is today AND the current minute falls inside [start, end).
// A missing end assumes a 20-min report (the same fallback the timeline uses), so
// every surface — dashboard, schedule, timeline — flags the running report alike.
export function isNowWithin(
  date: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
  now: Now,
): boolean {
  if (!date || !start || date !== now.todayStr) return false;
  const toMin = (t: string): number => {
    const [h, m] = t.split(":").map((x) => parseInt(x, 10));
    return h * 60 + (m || 0);
  };
  const s = toMin(start);
  const e = end ? toMin(end) : s + 20;
  return now.nowMin >= s && now.nowMin < e;
}
