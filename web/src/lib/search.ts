import type { ConferenceViews } from "./data";
import type { Lang } from "./i18n-store";
import type { I18n } from "../types";

// Client-side global search over ALL program content of the active conference:
// talk titles/abstracts, speaker names/affiliations, forum titles/descriptions,
// committee members, and organizations. Pure, keyword-only ranking over the
// already-loaded conference JSON — no network, no embeddings.
//
// The module is deliberately split into two halves so a future semantic ranking
// source can be layered in WITHOUT touching the UI:
//   1. `buildSearchIndex` — turns a conference's derived views into a flat list
//      of typed `SearchRecord`s (each with a lowercased `haystack` + a route).
//   2. `searchIndex` — ranks those records against a query. Today it composes a
//      single `keywordScore` source; a semantic source could be blended in later
//      by combining its score with the keyword score inside `scoreRecord`.

export type SearchType = "talk" | "speaker" | "forum" | "committee" | "organization";

// Group display order (matches the roadmap: Talks / Speakers / Forums / …).
export const SEARCH_TYPE_ORDER: SearchType[] = [
  "talk",
  "speaker",
  "forum",
  "committee",
  "organization",
];

export interface SearchRecord {
  id: string;
  type: SearchType;
  /** Primary label, already resolved to the active language (falls back to zh). */
  title: string;
  /** Optional secondary line (forum name, affiliation, role, room…). */
  subtitle?: string;
  /** Lowercased text used for matching — always spans BOTH languages so a query
      in either matches regardless of the current UI language. */
  haystack: string;
  /** Destination route (may include a #hash anchor for talks). */
  to: string;
}

export interface ScoredRecord extends SearchRecord {
  score: number;
}

export interface SearchGroup {
  type: SearchType;
  items: ScoredRecord[];
  /** Total matches in this group before any per-group cap is applied. */
  total: number;
}

export interface SearchIndex {
  records: SearchRecord[];
}

/* ============================ index construction ============================ */

function pick(v: I18n | undefined, lang: Lang): string {
  if (!v) return "";
  return lang === "en" ? (v.en ?? v.zh ?? "") : (v.zh ?? "");
}

function both(v: I18n | undefined): string {
  if (!v) return "";
  return `${v.zh ?? ""} ${v.en ?? ""}`;
}

/** Build the flat, typed search index for one conference. Pure — the palette
    memoises it per (conference, language). `t` localises UI-side role labels
    (organization roles) that don't live in the dataset. */
export function buildSearchIndex(
  views: ConferenceViews,
  confId: string,
  lang: Lang,
  t: (key: string) => string,
): SearchIndex {
  const { conference, speakerList } = views;
  const records: SearchRecord[] = [];

  // ---- Forums + their talks ----
  for (const f of conference.forums ?? []) {
    const forumTitle = pick(f.title, lang) || f.code;
    const forumHay = [
      both(f.title),
      f.code,
      f.sponsor ?? "",
      f.description ?? "",
      pick(f.category?.name, lang),
      both(f.category?.name),
      f.room ?? "",
      ...(f.chairs ?? []).flatMap((c) => [c.name, c.affiliation_raw ?? "", c.organization ?? ""]),
    ]
      .join(" ")
      .toLowerCase();
    records.push({
      id: `forum:${f.code}`,
      type: "forum",
      title: forumTitle,
      subtitle: [f.code, pick(f.category?.name, lang), f.room ?? ""].filter(Boolean).join(" · "),
      haystack: forumHay,
      to: `/${confId}/forum/${f.code}`,
    });

    // Talk anchors only exist on forums whose detail was extracted (ForumDetail
    // renders the numbered/timeline talk list only then); skip the rest so we
    // never link to a #talk-N that isn't on the page.
    if (!f.detail_extracted) continue;
    (f.talks ?? []).forEach((talk, i) => {
      const speakers = talk.speakers ?? [];
      const speakerNames = speakers.map((s) => s.name).filter(Boolean);
      const title = pick(talk.title, lang);
      const hay = [
        both(talk.title),
        talk.abstract ?? "",
        f.code,
        both(f.title),
        ...speakers.flatMap((s) => [s.name, s.name_en ?? "", s.affiliation_raw ?? "", s.organization ?? ""]),
      ]
        .join(" ")
        .toLowerCase();
      records.push({
        id: `talk:${f.code}:${i}`,
        type: "talk",
        title,
        subtitle: [forumTitle, speakerNames.join("、")].filter(Boolean).join(" · "),
        haystack: hay,
        to: `/${confId}/forum/${f.code}#talk-${i + 1}`,
      });
    });
  }

  // ---- Speakers (reuse the pre-aggregated directory) ----
  for (const s of speakerList) {
    const p = s.person;
    records.push({
      id: `speaker:${s.name}`,
      type: "speaker",
      title: s.name,
      subtitle: p.affiliation_raw ?? p.organization ?? undefined,
      // s.search is already a lowercased haystack (name/aff/org/title/talks).
      haystack: `${s.search} ${p.name_en ?? ""}`.toLowerCase(),
      to: `/${confId}/speakers?q=${encodeURIComponent(s.name)}`,
    });
  }

  // ---- Committee members (deduped by name; roles collected) ----
  const seenMember = new Map<string, { roles: string[]; aff?: string | null; hay: string[] }>();
  for (const c of conference.committees ?? []) {
    const roleLabel = pick(c.role, lang);
    for (const m of c.members) {
      if (!m.name) continue;
      const entry = seenMember.get(m.name) ?? { roles: [], aff: m.affiliation_raw, hay: [] };
      if (roleLabel && !entry.roles.includes(roleLabel)) entry.roles.push(roleLabel);
      if (!entry.aff && m.affiliation_raw) entry.aff = m.affiliation_raw;
      entry.hay.push(m.name, m.name_en ?? "", m.affiliation_raw ?? "", m.organization ?? "", both(c.role));
      seenMember.set(m.name, entry);
    }
  }
  for (const [name, e] of seenMember) {
    records.push({
      id: `committee:${name}`,
      type: "committee",
      title: name,
      subtitle: [e.aff ?? "", e.roles.join(" · ")].filter(Boolean).join(" · ") || undefined,
      haystack: e.hay.join(" ").toLowerCase(),
      to: `/${confId}/committee`,
    });
  }

  // ---- Organizations ----
  (conference.organizations ?? []).forEach((o, i) => {
    const roleLabel = t(`orgRole.${o.role}`);
    records.push({
      id: `org:${i}`,
      type: "organization",
      title: pick(o.name, lang),
      subtitle: [roleLabel, o.sponsor_tier ?? ""].filter(Boolean).join(" · ") || undefined,
      haystack: `${both(o.name)} ${o.role} ${roleLabel} ${o.sponsor_tier ?? ""}`.toLowerCase(),
      to: `/${confId}/organizations`,
    });
  });

  return { records };
}

/* ============================ ranking ============================ */

function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

// Keyword ranking source. Every token must appear in the haystack (AND match).
// A token that also lands in the title scores higher, and a whole-query title
// hit (prefix strongest) is boosted so the most on-the-nose result floats up.
// Returns -1 for "no match" so the caller can drop it.
function keywordScore(record: SearchRecord, tokens: string[], rawQuery: string): number {
  const hay = record.haystack;
  const title = record.title.toLowerCase();
  let score = 0;
  for (const tok of tokens) {
    if (!hay.includes(tok)) return -1;
    score += 1;
    if (title.includes(tok)) score += 2;
  }
  if (title.includes(rawQuery)) score += title.startsWith(rawQuery) ? 6 : 3;
  return score;
}

// Single scoring entry point. A future semantic source would be blended here
// (e.g. `score = keyword + weight * semantic(record, query)`).
function scoreRecord(record: SearchRecord, tokens: string[], rawQuery: string): number {
  return keywordScore(record, tokens, rawQuery);
}

export interface SearchOptions {
  /** Max items returned per group (the rest are counted in `total`). */
  perGroup?: number;
}

/** Rank the index against a query, returning non-empty groups in display order.
    Empty/blank queries return no groups. */
export function searchIndex(
  index: SearchIndex,
  query: string,
  opts: SearchOptions = {},
): SearchGroup[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const rawQuery = query.trim().toLowerCase();
  const perGroup = opts.perGroup ?? 6;

  const buckets = new Map<SearchType, ScoredRecord[]>();
  for (const rec of index.records) {
    const score = scoreRecord(rec, tokens, rawQuery);
    if (score < 0) continue;
    const arr = buckets.get(rec.type) ?? [];
    arr.push({ ...rec, score });
    buckets.set(rec.type, arr);
  }

  const groups: SearchGroup[] = [];
  for (const type of SEARCH_TYPE_ORDER) {
    const arr = buckets.get(type);
    if (!arr || arr.length === 0) continue;
    arr.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "zh-Hans-CN"));
    groups.push({ type, items: arr.slice(0, perGroup), total: arr.length });
  }
  return groups;
}
