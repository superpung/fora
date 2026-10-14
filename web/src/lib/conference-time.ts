// Venue-local dates and instants shared by live views, reminders and exports.
export function clockAt(ms: number, timeZone?: string): { todayStr: string; nowMin: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(ms);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { todayStr: `${p.year}-${p.month}-${p.day}`, nowMin: Number(p.hour) * 60 + Number(p.minute) };
}

// How far the given instant's wall clock in `tz` runs ahead of UTC.
function tzOffsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const p: Record<string, string> = {};
  for (const x of parts) p[x.type] = x.value;
  // Intl can render midnight as hour 24; Date.UTC wants 0.
  const h = p.hour === "24" ? 0 : Number(p.hour);
  return (
    Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), h, Number(p.minute), Number(p.second)) -
    at.getTime()
  );
}

/** Resolve a venue wall clock to an instant; an absent zone retains local time. */
export function scheduleTimeMs(date: string, time: string, timeZone?: string): number {
  if (!timeZone) return new Date(`${date}T${time}:00`).getTime();
  const naive = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(naive)) return NaN;
  const rough = new Date(naive - tzOffsetMs(new Date(naive), timeZone));
  return naive - tzOffsetMs(rough, timeZone);
}
