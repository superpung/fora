import { createContext, useContext } from "react";

// Lightweight i18n: a language preference persisted to localStorage (no URL
// change — every language shares the same URL) with a browser-language default.
// Kept component-free so the provider file (i18n.tsx) stays Fast-Refresh friendly.
// Only UI chrome is translated; conference content (titles, names, bios) comes
// from the dataset, which is Chinese-only, so it renders as-is in both languages.

export type Lang = "zh" | "en";
export const KEY = "fora-lang";
export const LEGACY_KEY = "cs-lang"; // pre-rebrand key, read once for migration

export function detectLang(): Lang {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (saved === "zh" || saved === "en") return saved;
  }
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) {
    return "zh";
  }
  return "en";
}

type Dict = Record<string, string>;

const zh: Dict = {
  "nav.dashboard": "日程面板",
  "nav.timeline": "时间线",
  "nav.speakers": "讲者",
  "nav.committee": "委员会",
  "nav.orgs": "组织与赞助",

  "common.all": "全部",
  "common.loading": "加载中",
  "common.siteName": "Fora",
  "common.official": "官方网站",
  "common.followAdd": "关注 {name}",
  "common.followRemove": "取消关注 {name}",
  "common.clearSearch": "清除搜索",
  "common.expand": "展开",
  "common.collapse": "收起",
  "common.expandReports": "展开报告",
  "common.collapseReports": "收起报告",
  "common.talkFollowAdd": "收藏该报告",
  "common.talkFollowRemove": "取消收藏该报告",
  "common.reportsCount": "{n} 报告",
  "common.sessionsCount": "{n} 场",
  "common.pending": "详情待补",
  "common.inChina": "中国·{city}",

  "confsw.switch": "切换会议",
  "confsw.all": "全部会议",

  "export.button": "导出",
  "export.ics": "日历 (.ics)",
  "export.csv": "表格 (.csv)",
  "export.md": "Markdown (.md)",
  "export.json": "备份·可导入 (.json)",

  "import.button": "导入",
  "import.title": "导入 .json 备份",
  "import.badFile": "无法识别的文件，请选择本站导出的 .json 备份",
  "import.mismatch": "该备份属于其他会议（{conf}），无法导入",
  "import.done": "已导入 {n} 项关注",
  "import.failed": "导入失败：文件无法解析",

  "timeline.aria": "按时间排列的论坛并行日程",
  "timeline.tbd": "题目待定",
  "timeline.moreUntimed": "另有 {n} 场未标注时间",
  "timeline.enterTalk": "进入报告",
  "timeline.noFollows": "本日暂无已关注的报告",
  "timeline.onlyFollows": "我的关注",
  "timeline.onlyFollowsTip": "只看我关注的会议室与报告",

  "home.filterForums": "筛选包含 {name} 的论坛与报告",
  "home.keynoteFollowAdd": "收藏该主旨报告",
  "home.keynoteFollowRemove": "取消收藏该主旨报告",
  "home.enterForum": "进入论坛 {code}",
  "home.forumDetail": "进入论坛详情页",
  "home.parallel": "{n} 场并行",
  "home.keynotes": "主旨报告",
  "home.saveForum": "收藏论坛 {code}",
  "home.searchPlaceholder": "搜索论坛 / 主题 / 讲者 / 单位…",
  "home.onlyFollowsTip": "只看我的关注",
  "home.myFollows": "我的关注",
  "home.forumsCountPre": "共 ",
  "home.forumsCountSuf": " 场论坛",
  "home.matching": " · 匹配“{q}”",
  "home.onlyFollows": " · 仅关注",
  "home.clearSpeaker": "清除讲者筛选",
  "home.speakerFilter": "讲者：{name}",
  "home.clearMyFollows": "清空我的关注",
  "home.noForums": "没有符合条件的论坛。",
  "home.noForumsHint": "点击论坛、报告或讲者旁的星标即可加入“我的关注”。",
  "home.timelineView": "时间线视图",
  "home.tbd": "题目待定",

  "stats.forums": "技术论坛",
  "stats.keynotes": "主旨报告",
  "stats.speakers": "讲者",
  "stats.days": "会期",

  "schedule.title": "完整日程",
  "schedule.talkTbd": "报告题目待定",
  "schedule.breakNote": "（各分论坛同时休息）",

  "speakers.title": "讲者",
  "speakers.searchPlaceholder": "搜索讲者 / 单位 / 报告…",
  "speakers.onlyFollows": "仅关注",
  "speakers.countShown": "共 {n} 位",
  "speakers.none": "没有符合条件的讲者。",
  "speakers.indexAria": "按姓名首字母定位",
  "speakers.tbd": "题目待定",

  "committee.title": "大会委员会",

  "orgs.title": "组织与赞助",
  "orgs.enterpriseLabs": "企业 / 实验室专场",
  "orgRole.host": "主办单位",
  "orgRole.co_host": "承办单位",
  "orgRole.support": "协办单位",
  "orgRole.sponsor": "赞助单位",

  "forum.showBio": "个人简介",
  "forum.hideBio": "收起简介",
  "forum.notFound": "未找到论坛 {code}。",
  "forum.backToSchedule": "返回日程",
  "forum.titleTbd": "报告题目待确认",
  "forum.copyLink": "复制该报告的分享链接",
  "forum.linkCopied": "链接已复制",
  "forum.copyShareLink": "复制分享链接",
  "forum.sourceAnnotated": "源数据存在标注，已如实保留",
  "forum.abstractTbd": "演讲摘要待确认",
  "forum.saved": "已收藏",
  "forum.save": "收藏论坛",
  "forum.viewOfficial": "在官网查看该论坛页面",
  "forum.official": "官网",
  "common.close": "关闭",
  "poster.forum": "论坛海报",
  "poster.talk": "报告海报",
  "poster.makeForum": "生成论坛分享海报",
  "poster.makeTalk": "生成该报告分享海报",
  "poster.save": "保存图片",
  "poster.previewAria": "分享海报预览",
  "poster.kindForum": "论坛",
  "poster.kindTalk": "报告",
  "poster.speakers": "讲者",
  "poster.roomMeta": "地点：{room}",
  "poster.catMeta": "类别：{cat}",
  "poster.forumMeta": "所属论坛：{forum}",
  "poster.talksLabel": "报告 · {n}",
  "poster.abstractLabel": "报告摘要",
  "poster.footerNote": "大会议程",
  "forum.sponsorSession": "{sponsor}专场",
  "forum.chairs": "论坛主席",
  "forum.chairRole": "论坛主席",
  "forum.talks": "论坛报告",
  "forum.track": "分会场 {n}",
  "forum.pendingTitle": "论坛详情整理中",
  "forum.pendingText":
    "该论坛的报告与讲者信息以海报形式发布，尚未完成结构化解析。当前可见其编号、名称、会议室与时段等总览信息。",

  "hub.title": "会议",
  "hub.ongoing": "进行中",
  "hub.upcoming": "即将开始",
  "hub.ended": "已结束",
  "hub.forums": "论坛",
  "hub.keynotes": "主旨报告",
  "hub.days": "会期",

  "block.registration": "签到",
  "block.keynotes": "大会主旨报告",
  "block.forums": "技术论坛",
  "block.break": "茶歇",
  "block.banquet": "晚宴",
  "block.committee_meetings": "专委工作会议",
  "block.other": "其他",

  "period.morning": "上午",
  "period.afternoon": "下午",
  "period.evening": "晚上",

  "cat.university": "高校",
  "cat.research": "科研院所",
  "cat.industry": "企业",
  "cat.other": "其他",

  "lang.toggle": "切换语言",
};

const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.timeline": "Timeline",
  "nav.speakers": "Speakers",
  "nav.committee": "Committee",
  "nav.orgs": "Organizers",

  "common.all": "All",
  "common.loading": "Loading",
  "common.siteName": "Fora",
  "common.official": "Official site",
  "common.followAdd": "Follow {name}",
  "common.followRemove": "Unfollow {name}",
  "common.clearSearch": "Clear search",
  "common.expand": "More",
  "common.collapse": "Less",
  "common.expandReports": "Expand talks",
  "common.collapseReports": "Collapse talks",
  "common.talkFollowAdd": "Save this talk",
  "common.talkFollowRemove": "Unsave this talk",
  "common.reportsCount": "{n} talks",
  "common.sessionsCount": "{n}",
  "common.pending": "Details pending",
  "common.inChina": "{city}, China",

  "confsw.switch": "Switch conference",
  "confsw.all": "All conferences",

  "export.button": "Export",
  "export.ics": "Calendar (.ics)",
  "export.csv": "Spreadsheet (.csv)",
  "export.md": "Markdown (.md)",
  "export.json": "Backup · importable (.json)",

  "import.button": "Import",
  "import.title": "Import a .json backup",
  "import.badFile": "Unrecognized file — choose a .json backup exported from this site.",
  "import.mismatch": "This backup belongs to another conference ({conf}); it can't be imported.",
  "import.done": "Imported {n} follows",
  "import.failed": "Import failed: the file could not be parsed.",

  "timeline.aria": "Parallel forum schedule by time",
  "timeline.tbd": "TBD",
  "timeline.moreUntimed": "{n} more without a listed time",
  "timeline.enterTalk": "Open talk",
  "timeline.noFollows": "No followed talks today",
  "timeline.onlyFollows": "My follows",
  "timeline.onlyFollowsTip": "Show only rooms & talks I follow",

  "home.filterForums": "Filter forums & talks containing {name}",
  "home.keynoteFollowAdd": "Save this keynote",
  "home.keynoteFollowRemove": "Unsave this keynote",
  "home.enterForum": "Open forum {code}",
  "home.forumDetail": "Open forum detail",
  "home.parallel": "{n} in parallel",
  "home.keynotes": "Keynotes",
  "home.saveForum": "Save forum {code}",
  "home.searchPlaceholder": "Search forums / topics / speakers / affiliations…",
  "home.onlyFollowsTip": "Show only my follows",
  "home.myFollows": "My follows",
  "home.forumsCountPre": "",
  "home.forumsCountSuf": " forums",
  "home.matching": " · matching “{q}”",
  "home.onlyFollows": " · follows only",
  "home.clearSpeaker": "Clear speaker filter",
  "home.speakerFilter": "Speaker: {name}",
  "home.clearMyFollows": "Clear my follows",
  "home.noForums": "No forums match.",
  "home.noForumsHint": "Tap the star next to a forum, talk, or speaker to add it to “My follows”.",
  "home.timelineView": "Timeline view",
  "home.tbd": "TBD",

  "stats.forums": "Forums",
  "stats.keynotes": "Keynotes",
  "stats.speakers": "Speakers",
  "stats.days": "Days",

  "schedule.title": "Full schedule",
  "schedule.talkTbd": "Talk title TBD",
  "schedule.breakNote": " (all forums pause)",

  "speakers.title": "Speakers",
  "speakers.searchPlaceholder": "Search speakers / affiliations / talks…",
  "speakers.onlyFollows": "Follows",
  "speakers.countShown": "{n} people",
  "speakers.none": "No speakers match.",
  "speakers.indexAria": "Jump by name initial",
  "speakers.tbd": "TBD",

  "committee.title": "Conference committee",

  "orgs.title": "Organizers & Sponsors",
  "orgs.enterpriseLabs": "Enterprise / Lab sessions",
  "orgRole.host": "Host",
  "orgRole.co_host": "Co-host",
  "orgRole.support": "Supporter",
  "orgRole.sponsor": "Sponsor",

  "forum.showBio": "Bio",
  "forum.hideBio": "Hide bio",
  "forum.notFound": "Forum {code} not found.",
  "forum.backToSchedule": "Back to schedule",
  "forum.titleTbd": "Talk title to be confirmed",
  "forum.copyLink": "Copy a share link to this talk",
  "forum.linkCopied": "Link copied",
  "forum.copyShareLink": "Copy share link",
  "forum.sourceAnnotated": "Source data carried annotations, preserved as-is",
  "forum.abstractTbd": "Abstract to be confirmed",
  "forum.saved": "Saved",
  "forum.save": "Save forum",
  "forum.viewOfficial": "View this forum on the official site",
  "forum.official": "Official",
  "common.close": "Close",
  "poster.forum": "Forum poster",
  "poster.talk": "Talk poster",
  "poster.makeForum": "Create a shareable forum poster",
  "poster.makeTalk": "Create a shareable poster for this talk",
  "poster.save": "Save image",
  "poster.previewAria": "Share poster preview",
  "poster.kindForum": "Forum",
  "poster.kindTalk": "Talk",
  "poster.speakers": "Speakers",
  "poster.roomMeta": "Room: {room}",
  "poster.catMeta": "Category: {cat}",
  "poster.forumMeta": "Forum: {forum}",
  "poster.talksLabel": "Talks · {n}",
  "poster.abstractLabel": "Abstract",
  "poster.footerNote": "Agenda",
  "forum.sponsorSession": "{sponsor} session",
  "forum.chairs": "Forum chairs",
  "forum.chairRole": "Chair",
  "forum.talks": "Talks",
  "forum.track": "Room {n}",
  "forum.pendingTitle": "Forum details in preparation",
  "forum.pendingText":
    "This forum's talks and speakers were published as a poster and haven't been parsed into structured data yet. Its code, name, room, and time slot are shown for now.",

  "hub.title": "Conferences",
  "hub.ongoing": "Ongoing",
  "hub.upcoming": "Upcoming",
  "hub.ended": "Ended",
  "hub.forums": "forums",
  "hub.keynotes": "keynotes",
  "hub.days": "days",

  "block.registration": "Registration",
  "block.keynotes": "Keynotes",
  "block.forums": "Forums",
  "block.break": "Break",
  "block.banquet": "Banquet",
  "block.committee_meetings": "Committee meetings",
  "block.other": "Other",

  "period.morning": "Morning",
  "period.afternoon": "Afternoon",
  "period.evening": "Evening",

  "cat.university": "Universities",
  "cat.research": "Institutes",
  "cat.industry": "Industry",
  "cat.other": "Other",

  "lang.toggle": "Switch language",
};

const DICTS: Record<Lang, Dict> = { zh, en };

/** Translate a key, interpolating {var} placeholders. Falls back to the key
    itself if missing (surfaces gaps during development). */
export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let s = DICTS[lang][key] ?? DICTS.zh[key] ?? key;
  if (vars) {
    for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]));
  }
  return s;
}

export interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export const Ctx = createContext<I18nCtx | null>(null);

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
