import { buildBm25, bm25Scores, maxScore, tokenize, type Bm25Model } from "./bm25";
import { topicSearchText } from "./topics";
import type { ConferenceViews } from "./data";
import type { Lang } from "./i18n-store";
import { talkSummaryText } from "./ai-store";
import type { I18n, Talk } from "../types";

// Client-side global search over ALL program content of the active conference:
// talk titles/abstracts, speaker names/affiliations, forum titles/descriptions,
// committee members, and organizations. Everything is ranked in the browser over
// the already-loaded conference JSON — no network, no model, works offline.
//
// The module is split into two halves so ranking sources compose without the UI
// knowing about them:
//   1. `buildSearchIndex` — turns a conference's derived views into a flat list
//      of typed `SearchRecord`s (each with a lowercased `haystack` + a route).
//   2. `searchIndex` — ranks those records against a query by blending two
//      sources inside `scoreRecord`:
//        - the literal keyword signals (substring / title / prefix hits), which
//          keep on-the-nose answers pinned to the top, and
//        - BM25 relevance (bm25.ts) over Chinese character bigrams + English
//          word tokens, which ranks partial and paraphrased matches instead of
//          discarding them the way the original strict all-terms-present test
//          did ("智能体 形式化" now returns talks that lean on either term).
//
// BM25 is arithmetic over the conference's own words, so search results are NOT
// AI-generated content and carry no AI marking. What the AI toggle governs here
// is narrower: whether each talk's `enrichment` (the AI-written one-line summary
// and topic tags) is part of the indexed text at all — see `includeAi` below.

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
  /** A talk's AI-generated TL;DR, carried for DISPLAY ONLY — deliberately kept
      out of `haystack` so matching, ranking and result order are identical
      whether or not the reader has AI content switched on. */
  summary?: string;
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
    memoises it per (conference, language, AI setting). `t` localises UI-side
    role labels (organization roles) that don't live in the dataset.

    `includeAi` is the AI-content toggle: when true a talk's AI-written
    `enrichment` (one-line summary + topic tags) joins its searchable text, so a
    query can reach a talk through a topic its abstract never spells out. When
    false the index is built from the conference's own words only. Nothing
    AI-generated is ever *displayed* by search — it only widens what matches. */
export function buildSearchIndex(
  views: ConferenceViews,
  confId: string,
  lang: Lang,
  t: (key: string) => string,
  includeAi = false,
): SearchIndex {
  const { conference, speakerList } = views;
  const records: SearchRecord[] = [];

  // AI-derived text for a talk, or "" when the toggle is off. Topic tags carry
  // most of the retrieval value (they name the field a talk belongs to); the
  // one-line summary adds a second phrasing of the same content.
  // Topics are indexed through their bilingual vocabulary labels, so an English
  // query reaches Chinese content the abstract never spells out in English
  // ("in-memory computing" -> the 存算一体 label "Compute-in-Memory").
  const aiText = (talk: Talk): string =>
    includeAi && talk.enrichment
      ? `${talk.enrichment.summary?.zh ?? ""} ${(talk.enrichment.topics ?? [])
          .map(topicSearchText)
          .join(" ")}`
      : "";

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
      // A forum inherits its talks' topic tags, so a topical query can land on
      // the whole session and not only on individual talks.
      ...(includeAi
        ? (f.talks ?? []).flatMap((tk) => (tk.enrichment?.topics ?? []).map(topicSearchText))
        : []),
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
        aiText(talk),
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
        summary: talkSummaryText(talk) ?? undefined,
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

/** How much a top BM25 hit is worth, in keyword-score points. Sized so a pure
    relevance hit (no literal match at all) lands below an exact title match but
    above an incidental mention buried in one abstract. */
const RELEVANCE_WEIGHT = 8;
/** Keep a record with no literal match only while its relevance is within this
    fraction of the run's best — the floor that replaced the old all-terms-
    present test. Low enough to surface paraphrases, high enough that a query
    matching one very common bigram doesn't return the whole program. */
const RELEVANCE_FLOOR = 0.3;

/** Split the raw query on whitespace into the literal substrings the keyword
    source looks for (unchanged from the substring-only implementation). */
function queryTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

interface KeywordHit {
  score: number;
  /** true when every term appears literally — the old AND match, kept as an
      unconditional keep so today's results can never drop out. */
  all: boolean;
}

// Keyword ranking source: literal substring signals. A term that lands in the
// title scores higher than one buried in the haystack, and a whole-query title
// hit (prefix strongest) is boosted so the most on-the-nose result floats up.
function keywordScore(record: SearchRecord, terms: string[], rawQuery: string): KeywordHit {
  const hay = record.haystack;
  const title = record.title.toLowerCase();
  let score = 0;
  let all = true;
  for (const term of terms) {
    if (!hay.includes(term)) {
      all = false;
      continue;
    }
    score += 1;
    if (title.includes(term)) score += 2;
  }
  if (all) score += 4; // every term present — the strongest lexical evidence
  if (title.includes(rawQuery)) score += title.startsWith(rawQuery) ? 6 : 3;
  return { score, all };
}

// Single scoring entry point: literal keyword signals blended with normalised
// BM25 relevance. `relevance` is 0…1 (the run's best hit is 1).
function scoreRecord(
  record: SearchRecord,
  terms: string[],
  rawQuery: string,
  relevance: number,
): number {
  const kw = keywordScore(record, terms, rawQuery);
  if (!kw.all && relevance < RELEVANCE_FLOOR) return -1;
  return kw.score + RELEVANCE_WEIGHT * relevance;
}

// BM25 statistics are derived from the index and cost a full pass over every
// record's text, so they are built lazily on the first query and memoised
// against the index object itself — a rebuilt index (new conference, language,
// or AI setting) is a new key and gets its own model, and the old one is
// collected with it.
const models = new WeakMap<SearchIndex, Bm25Model>();

function modelFor(index: SearchIndex): Bm25Model {
  let model = models.get(index);
  if (!model) {
    // The title is repeated into the ranking document as a light field boost:
    // a term in the title counts twice as often as one in the body.
    model = buildBm25(index.records.map((r) => `${r.title.toLowerCase()} ${r.haystack}`));
    models.set(index, model);
  }
  return model;
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
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const rawQuery = query.trim().toLowerCase();
  const perGroup = opts.perGroup ?? 6;

  // Relevance pass: only records sharing a token with the query are scored, so
  // this touches a slice of the corpus rather than all of it.
  const relevance = bm25Scores(modelFor(index), tokenize(rawQuery));
  const best = maxScore(relevance);

  const buckets = new Map<SearchType, ScoredRecord[]>();
  index.records.forEach((rec, i) => {
    const rel = best > 0 ? (relevance.get(i) ?? 0) / best : 0;
    const score = scoreRecord(rec, terms, rawQuery, rel);
    if (score < 0) return;
    const arr = buckets.get(rec.type) ?? [];
    arr.push({ ...rec, score });
    buckets.set(rec.type, arr);
  });

  const groups: SearchGroup[] = [];
  for (const type of SEARCH_TYPE_ORDER) {
    const arr = buckets.get(type);
    if (!arr || arr.length === 0) continue;
    arr.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "zh-Hans-CN"));
    groups.push({ type, items: arr.slice(0, perGroup), total: arr.length });
  }
  return groups;
}
