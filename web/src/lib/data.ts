import raw from "../data/conference.json";
import { keynoteId } from "./follow-store";
import type { Conference, Forum, Day, Block, Talk, Person, I18n, Status } from "../types";

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

// Origin of the official conference site, derived from the dataset (not hard-coded)
// so per-forum assets stored as site-absolute paths can be linked back to the source.
export const siteOrigin: string = (() => {
  try {
    return new URL(conference.source_url ?? "").origin;
  } catch {
    return "";
  }
})();

/** Resolve a site-absolute asset path (e.g. a poster) to a full official URL. */
export function officialAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return siteOrigin ? siteOrigin + path : null;
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

// ---- Keynote index (followable / exportable main-conference talks) ----
export interface KeynoteEntry {
  id: string;
  date: string;
  index: number;
  talk: Talk;
  location?: string | null;
}

/** Flattened main-conference keynotes, indexed the same way the dashboard rail is. */
export const keynoteEntries: KeynoteEntry[] = days.flatMap((d) => {
  const talks = d.blocks
    .filter((b) => b.kind === "keynotes")
    .flatMap((b) => (b.talks ?? []).map((t) => ({ t, loc: b.location })));
  return talks.map(({ t, loc }, i) => ({
    id: keynoteId(d.date, i),
    date: d.date,
    index: i,
    talk: t,
    location: loc,
  }));
});
export const keynoteById = new Map(keynoteEntries.map((e) => [e.id, e]));

/** The main venue name (used to build a complete export location). */
export const mainVenueName: string =
  (conference.venues ?? []).find((v) => v.type === "main")?.name.zh ??
  (conference.venues ?? [])[0]?.name.zh ??
  "";

const forumBlockByDate = new Map(scheduleDays.map((d) => [d.date, d.forumBlock]));

/** A forum talk has no time of its own; fall back to its forum block's window. */
export function forumTimeWindow(forum: Forum): { start?: string | null; end?: string | null } {
  const blk = forum.day_date ? forumBlockByDate.get(forum.day_date) : undefined;
  return { start: blk?.start, end: blk?.end };
}

// ---- Speaker classification + name indexing ----
export type SpeakerCategory = "university" | "research" | "industry" | "other";

export const categoryLabel: Record<SpeakerCategory, string> = {
  university: "高校",
  research: "科研院所",
  industry: "企业",
  other: "其他",
};

// Classify a person by their affiliation string. Order matters: a corporate
// research institute (e.g. 电科集团…研究所) reads as an institute, not a company.
export function speakerCategory(aff?: string | null): SpeakerCategory {
  const s = aff ?? "";
  // Research institutes / national labs / R&D centres (incl. abbreviations like
  // 中科院, and corporate research institutes such as 电科集团…研究所).
  if (
    /研究院|研究所|科学院|工程院|实验室|研究中心|科学中心|中科院|计算所|总体设计部|设计院|\d+所|Institut|Laborator|Academy|Research (?:Institut|Cent|Fellow|Council)/i.test(
      s,
    )
  )
    return "research";
  // Universities (incl. abbreviations like 国防科大 / 中科大 / 电子科大).
  if (/大学|学院|University|College|School|国防科大|中科大|电子科大|华中科大/i.test(s)) return "university";
  // Companies: legal-entity / sector keywords, well-known brands, or industry
  // roles (科大讯飞's "科大" is a company, not the 国防科大 university).
  if (
    /公司|集团|科技|技术|微电子|半导体|电子|股份|有限|Inc\.?|Corp|Ltd|Technolog|Semiconductor|阿里巴巴|字节跳动|科大讯飞|浪潮|沐曦|华大九天|天数智芯|合见工软|中科麒芯|寒武纪|地平线|海光|燧原|华为|腾讯|百度|CEO|CTO|总裁|总经理|事业部/i.test(
      s,
    )
  )
    return "industry";
  return "other";
}

// Pinyin first-letter of a name, for an A–Z jump index. Chinese initials are
// derived by comparing the first char against per-letter boundary characters
// under ICU pinyin collation (validated 340/340 against pypinyin for this data).
const PY_ANCHORS: [string, string][] = [
  ["A", "阿"], ["B", "芭"], ["C", "擦"], ["D", "搭"], ["E", "蛾"], ["F", "发"],
  ["G", "噶"], ["H", "哈"], ["J", "击"], ["K", "喀"], ["L", "垃"], ["M", "妈"],
  ["N", "拿"], ["O", "哦"], ["P", "啪"], ["Q", "期"], ["R", "然"], ["S", "撒"],
  ["T", "塌"], ["W", "挖"], ["X", "昔"], ["Y", "压"], ["Z", "匝"],
];
const pyCollator = new Intl.Collator("zh-Hans-CN", { collation: "pinyin" });

export function firstLetter(name: string): string {
  const c = (name.trim()[0] ?? "").toString();
  if (/[a-zA-Z]/.test(c)) return c.toUpperCase();
  if (!/[一-鿿]/.test(c)) return "#";
  for (let i = PY_ANCHORS.length - 1; i >= 0; i--) {
    if (pyCollator.compare(c, PY_ANCHORS[i][1]) >= 0) return PY_ANCHORS[i][0];
  }
  return "#";
}

// ---- Speaker directory (aggregate every talk a person gives) ----
export interface SpeakerTalk {
  forumCode?: string; // undefined for main-conference keynotes
  talkIndex?: number; // 0-based position within the forum's talk list
  forumTitle: string; // forum name, or the keynote block label
  talkTitle?: I18n;
  titleStatus?: Status;
  room?: string | null;
  date?: string | null;
  period?: string | null; // morning / afternoon / evening
  start?: string | null;
  end?: string | null;
  isKeynote: boolean;
}

export interface SpeakerAgg {
  name: string;
  person: Person; // representative record (prefers one carrying a bio)
  talks: SpeakerTalk[];
  search: string;
  category: SpeakerCategory;
  initial: string; // pinyin first-letter, for the A–Z index
}

function pickPerson(current: Person | undefined, next: Person): Person {
  if (!current) return next;
  // upgrade to a record with more detail (bio, then affiliation)
  if (!current.bio && next.bio) return next;
  if (!current.affiliation_raw && next.affiliation_raw) return next;
  return current;
}

const speakerMap = new Map<string, SpeakerAgg>();

function addSpeakerTalk(sp: Person, talk: SpeakerTalk) {
  if (!sp.name) return;
  const existing = speakerMap.get(sp.name);
  if (existing) {
    existing.person = pickPerson(existing.person, sp);
    existing.talks.push(talk);
  } else {
    speakerMap.set(sp.name, {
      name: sp.name,
      person: sp,
      talks: [talk],
      search: "",
      category: "other",
      initial: "",
    });
  }
}

// forum talks
(conference.forums ?? []).forEach((f) => {
  (f.talks ?? []).forEach((t, ti) => {
    (t.speakers ?? []).forEach((sp) =>
      addSpeakerTalk(sp, {
        forumCode: f.code,
        talkIndex: ti,
        forumTitle: f.title.zh,
        talkTitle: t.title,
        titleStatus: t.title_status,
        room: f.room,
        date: f.day_date,
        period: f.session_period,
        start: t.start,
        end: t.end,
        isKeynote: false,
      }),
    );
  });
});

// main-conference keynotes (day blocks)
days.forEach((d) => {
  d.blocks
    .filter((b) => b.kind === "keynotes")
    .forEach((b) => {
      (b.talks ?? []).forEach((t) => {
        if (t.type === "opening") return; // ceremony, no speaker
        (t.speakers ?? []).forEach((sp) =>
          addSpeakerTalk(sp, {
            forumTitle: b.title?.zh ?? blockKindLabel.keynotes,
            talkTitle: t.title,
            titleStatus: t.title_status,
            room: b.location,
            date: d.date,
            period: "morning",
            start: t.start,
            end: t.end,
            isKeynote: true,
          }),
        );
      });
    });
});

/** All speakers, each with the full list of talks they give, name-sorted. */
export const speakerList: SpeakerAgg[] = [...speakerMap.values()]
  .map((s) => {
    // chronological talks; keynotes (no code) read naturally first by time
    s.talks.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || (a.start ?? "").localeCompare(b.start ?? ""));
    const p = s.person;
    s.search = [
      s.name,
      p.affiliation_raw ?? "",
      p.organization ?? "",
      p.title ?? "",
      ...s.talks.map((t) => `${t.forumTitle} ${t.talkTitle?.zh ?? ""} ${t.forumCode ?? ""}`),
    ]
      .join(" ")
      .toLowerCase();
    s.category = speakerCategory(p.affiliation_raw);
    s.initial = firstLetter(s.name);
    return s;
  })
  .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));

/** Per-category speaker counts (for the directory filter chips). */
export const speakerCategoryCounts: Record<SpeakerCategory, number> = speakerList.reduce(
  (acc, s) => {
    acc[s.category] += 1;
    return acc;
  },
  { university: 0, research: 0, industry: 0, other: 0 } as Record<SpeakerCategory, number>,
);
