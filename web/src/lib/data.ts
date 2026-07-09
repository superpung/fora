import raw from "../data/conference.json";
import type { Conference, Forum, Day, Block, Talk } from "../types";

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

export const periodLabel: Record<string, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

// ---- Scheduler-dashboard derived views ----
export interface ForumSlot {
  code: string;
  room?: string | null;
  forum?: Forum;
  /** lowercased haystack for search: title/code/sponsor/room/people/talk titles */
  search: string;
  /** distinct speaker + chair names in this forum */
  people: string[];
}

export interface ScheduleDay {
  date: string;
  md: string;
  weekday: string;
  venue: string;
  forumBlock?: Block;
  keynotes: Talk[];
  slots: ForumSlot[];
}

function forumPeople(f?: Forum): string[] {
  if (!f) return [];
  const names = new Set<string>();
  (f.chairs ?? []).forEach((c) => c.name && names.add(c.name));
  (f.talks ?? []).forEach((t) =>
    (t.speakers ?? []).forEach((s) => s.name && names.add(s.name)),
  );
  return [...names];
}

function forumSearchText(f: Forum | undefined, code: string, room?: string | null): string {
  const parts: string[] = [code, room ?? ""];
  if (f) {
    parts.push(f.title.zh, f.title.en ?? "", f.sponsor ?? "", f.description ?? "");
    (f.chairs ?? []).forEach((c) => parts.push(c.name, c.affiliation_raw ?? "", c.organization ?? ""));
    (f.talks ?? []).forEach((t) => {
      parts.push(t.title?.zh ?? "");
      (t.speakers ?? []).forEach((s) =>
        parts.push(s.name, s.affiliation_raw ?? "", s.organization ?? ""),
      );
    });
  }
  return parts.join(" ").toLowerCase();
}

/** Days that actually host forums, each enriched with keynotes + forum slots. */
export const scheduleDays: ScheduleDay[] = days
  .map((d) => {
    const forumBlock = d.blocks.find((b) => b.kind === "forums");
    const keynotes = d.blocks
      .filter((b) => b.kind === "keynotes")
      .flatMap((b) => b.talks ?? []);
    const slots: ForumSlot[] = (forumBlock?.forum_entries ?? []).map((e) => {
      const f = forumsByCode[e.forum_code];
      return {
        code: e.forum_code,
        room: e.room ?? f?.room ?? null,
        forum: f,
        search: forumSearchText(f, e.forum_code, e.room),
        people: forumPeople(f),
      };
    });
    // sort slots by room label for a stable, location-scannable grid
    slots.sort((a, b) => (a.room ?? "").localeCompare(b.room ?? "", "en"));
    return {
      date: d.date,
      ...formatDate(d.date),
      venue: venueName(d.venue_id),
      forumBlock,
      keynotes,
      slots,
    };
  })
  .filter((d) => d.slots.length > 0);

/** Unique speaker/chair count across all forums (dashboard stat). */
export const uniqueSpeakerCount = new Set(
  (conference.forums ?? []).flatMap((f) => forumPeople(f)),
).size;
