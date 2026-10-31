export function relativeTime(iso: string | null, zh: boolean, now = Date.now()): string {
  if (!iso) return "";
  const ms = now - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  if (ms < 60_000) return zh ? "刚刚" : "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}${zh ? " 分钟前" : " min ago"}`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}${zh ? " 小时前" : " h ago"}`;
  return `${Math.floor(ms / 86_400_000)}${zh ? " 天前" : " d ago"}`;
}

