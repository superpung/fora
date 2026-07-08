import raw from "../data/conference.json";
import type { Conference, Forum, Day } from "../types";

export const conference = raw as unknown as Conference;

export const forumsByCode: Record<string, Forum> = Object.fromEntries(
  (conference.forums ?? []).map((f) => [f.code, f]),
);

export function getForum(code: string): Forum | undefined {
  return forumsByCode[code];
}

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export function formatDate(iso: string): { md: string; weekday: string } {
  const d = new Date(iso + "T00:00:00");
  return {
    md: `${d.getMonth() + 1}月${d.getDate()}日`,
    weekday: WEEKDAY[d.getDay()],
  };
}

export function venueName(id?: string | null): string {
  const v = (conference.venues ?? []).find((x) => x.id === id);
  return v?.name.zh ?? "";
}

export const days: Day[] = conference.days ?? [];

// 统计数字（首页展示）
export const stats = {
  days: (conference.days ?? []).length,
  forums: (conference.forums ?? []).length,
  keynotes: (conference.days ?? [])
    .flatMap((d) => d.blocks)
    .filter((b) => b.kind === "keynotes")
    .flatMap((b) => b.talks ?? [])
    .filter((t) => t.type === "keynote").length,
  committeeMembers: (conference.committees ?? []).reduce(
    (n, c) => n + c.members.length,
    0,
  ),
};

export const blockKindLabel: Record<string, string> = {
  registration: "签到",
  keynotes: "大会主旨报告",
  forums: "技术论坛",
  break: "茶歇",
  banquet: "晚宴",
  committee_meetings: "专委工作会议",
  other: "其他",
};
