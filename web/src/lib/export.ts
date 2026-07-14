// Export the user's followed talks (forum talks + main-conference keynotes) to
// calendar / spreadsheet / markdown. A forum talk has no time of its own, so we
// fall back to its forum block's window; the location is the full venue name
// joined with the room (e.g. "无锡国际会议中心 205A").
import {
  conference,
  getForum,
  forumTimeWindow,
  keynoteById,
  keynoteEntries,
  mainVenueName,
  blockKindLabel,
} from "./data";
import { isKeynoteId } from "./follow-store";
import type { Forum, Talk } from "../types";

export interface ExportItem {
  uid: string;
  title: string;
  speakers: string;
  session: string; // forum name or 大会主旨报告
  code?: string;
  date: string; // YYYY-MM-DD
  start?: string | null;
  end?: string | null;
  location: string;
  abstract?: string | null;
}

export interface FollowSnapshot {
  forums: Set<string>;
  speakers: Set<string>;
  talks: Set<string>;
}

export type ExportFormat = "ics" | "csv" | "md";

function talkTitle(t: Talk): string {
  return t.title_status === "tbd" || !t.title?.zh ? "（题目待定）" : t.title.zh;
}
function speakerNames(t: Talk): string {
  return (t.speakers ?? []).map((s) => s.name).filter(Boolean).join("、");
}
function fullLocation(room?: string | null): string {
  return [mainVenueName, room].filter(Boolean).join(" ");
}

function forumTalkItem(forum: Forum, i: number): ExportItem {
  const t = (forum.talks ?? [])[i];
  const win = forumTimeWindow(forum);
  return {
    uid: `${forum.code}-${i}`,
    title: talkTitle(t),
    speakers: speakerNames(t),
    session: forum.title.zh,
    code: forum.code,
    date: forum.day_date ?? "",
    start: t.start ?? win.start ?? null,
    end: t.end ?? win.end ?? null,
    location: fullLocation(forum.room),
    abstract: t.abstract ?? null,
  };
}
function keynoteItem(id: string): ExportItem | null {
  const e = keynoteById.get(id);
  if (!e) return null;
  return {
    uid: id.replace(/[:#]/g, "-"),
    title: talkTitle(e.talk),
    speakers: speakerNames(e.talk),
    session: blockKindLabel.keynotes,
    date: e.date,
    start: e.talk.start ?? null,
    end: e.talk.end ?? null,
    location: fullLocation(e.location),
    abstract: e.talk.abstract ?? null,
  };
}

/** Every talk the user follows, via a starred talk, forum, or speaker (deduped). */
export function collectFollowedItems(f: FollowSnapshot): ExportItem[] {
  const map = new Map<string, ExportItem>();
  const putForum = (forum: Forum, i: number) => {
    const key = `${forum.code}#${i}`;
    if (!map.has(key)) map.set(key, forumTalkItem(forum, i));
  };
  const putKeynote = (id: string) => {
    if (map.has(id)) return;
    const it = keynoteItem(id);
    if (it) map.set(id, it);
  };

  f.talks.forEach((id) => {
    if (isKeynoteId(id)) return putKeynote(id);
    const [code, idx] = id.split("#");
    const forum = getForum(code);
    const i = Number(idx);
    if (forum && (forum.talks ?? [])[i]) putForum(forum, i);
  });
  f.forums.forEach((code) => {
    const forum = getForum(code);
    (forum?.talks ?? []).forEach((_, i) => forum && putForum(forum, i));
  });
  if (f.speakers.size) {
    (conference.forums ?? []).forEach((forum) =>
      (forum.talks ?? []).forEach((t, i) => {
        if ((t.speakers ?? []).some((s) => f.speakers.has(s.name))) putForum(forum, i);
      }),
    );
    keynoteEntries.forEach((e) => {
      if ((e.talk.speakers ?? []).some((s) => f.speakers.has(s.name))) putKeynote(e.id);
    });
  }

  return [...map.values()].sort((a, b) =>
    (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? "")),
  );
}

/** A download filename built from the conference name + the dates it spans,
    e.g. "CCF Chip 2026 我的日程 2026-07-18~07-19.ics". */
export function exportFilename(items: ExportItem[], ext: string): string {
  const dates = [...new Set(items.map((it) => it.date).filter(Boolean))].sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  let range = "";
  if (dates.length === 1) range = first;
  else if (dates.length > 1)
    range = first.slice(0, 4) === last.slice(0, 4) ? `${first}~${last.slice(5)}` : `${first}~${last}`;
  const base = conference.name.en || conference.name.zh;
  return `${[base, "我的日程", range].filter(Boolean).join(" ")}.${ext}`;
}

/* ---------------- formatters ---------------- */

function csvCell(v: string | null | undefined): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function toCSV(items: ExportItem[]): string {
  const head = ["日期", "开始", "结束", "标题", "讲者", "场次", "编号", "地点"];
  const rows = items.map((it) =>
    [it.date, it.start ?? "", it.end ?? "", it.title, it.speakers, it.session, it.code ?? "", it.location]
      .map(csvCell)
      .join(","),
  );
  // BOM so Excel reads UTF-8 correctly.
  return "﻿" + [head.map(csvCell).join(","), ...rows].join("\r\n");
}

export function toMarkdown(items: ExportItem[]): string {
  const byDate = new Map<string, ExportItem[]>();
  items.forEach((it) => {
    const arr = byDate.get(it.date);
    if (arr) arr.push(it);
    else byDate.set(it.date, [it]);
  });
  let out = `# 我的日程 · ${conference.name.zh}\n\n> 共 ${items.length} 场\n`;
  for (const [date, list] of byDate) {
    out += `\n## ${date}\n\n`;
    for (const it of list) {
      const time = it.start ? `\`${it.start}${it.end ? `–${it.end}` : ""}\` ` : "";
      out += `- ${time}**${it.title}**\n`;
      if (it.speakers) out += `  - 讲者：${it.speakers}\n`;
      out += `  - 场次：${it.session}${it.code ? ` (${it.code})` : ""}\n`;
      out += `  - 地点：${it.location}\n`;
    }
  }
  return out;
}

function icsEscape(s: string): string {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
function icsDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}
// RFC 5545 line folding at 74 UTF-8 bytes (continuation lines start with a space).
function icsFold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 74) return line;
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 74) {
      parts.push(cur);
      cur = ch;
      bytes = b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

export function toICS(items: ExportItem[], stampISO: string): string {
  const stamp = stampISO.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//conf-scheduler//CCF Chip 2026//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const it of items) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${it.uid}@ccfchip2026`);
    lines.push(`DTSTAMP:${stamp}`);
    if (it.start && it.date) {
      lines.push(`DTSTART:${icsDateTime(it.date, it.start)}`);
      lines.push(`DTEND:${icsDateTime(it.date, it.end || it.start)}`);
    } else if (it.date) {
      lines.push(`DTSTART;VALUE=DATE:${it.date.replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${icsEscape(it.title)}`);
    if (it.location) lines.push(`LOCATION:${icsEscape(it.location)}`);
    const desc = [
      `${it.session}${it.code ? ` (${it.code})` : ""}`,
      it.speakers ? `讲者：${it.speakers}` : "",
      it.abstract ?? "",
    ]
      .filter(Boolean)
      .join("\n");
    if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n");
}

/** Trigger a client-side file download. */
export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
