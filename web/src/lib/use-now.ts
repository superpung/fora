import { useEffect, useState } from "react";

// A live clock that re-ticks every 30s so "now"-dependent UI (the running-report
// highlight across the dashboard, schedule and timeline) drifts with real time
// without a page reload. Returns today's LOCAL date (YYYY-MM-DD) and the current
// minute-of-day — the two values every "is it running now" check needs.
export interface Now {
  todayStr: string;
  nowMin: number;
}

const p2 = (n: number) => String(n).padStart(2, "0");

export function useNow(): Now {
  const [ms, setMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const d = new Date(ms);
  return {
    todayStr: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`,
    nowMin: d.getHours() * 60 + d.getMinutes(),
  };
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
