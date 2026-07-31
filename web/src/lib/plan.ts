import { buildBm25, bm25Scores, maxScore, tokenize, type Bm25Model } from "./bm25";
import { keynoteId, talkId } from "./follow-store";
import { topicAliases, topicSearchText } from "./topic-labels";
import type { ConferenceViews } from "./data";
import type { Talk } from "../types";

// The "Plan for me" recommender behind /:conf/plan. A user describes an
// interest in prose; this module ranks every talk in the conference against
// that description and assembles the winners into a real, time-ordered agenda.
//
// It is AI-DERIVED and gated on the AI-content toggle: it recommends (which is
// a judgement the conference never made), it reads each talk's AI-written
// `enrichment` (topic tags + one-line summary), and it surfaces those summaries
// in its output. Ranking itself is BM25 (bm25.ts) — no network, no model.
//
// The author declined a general schedule-conflict feature, so nothing here
// warns about the user's existing agenda. What it does do is stay honest about
// its OWN output: two picks that collide in one time slot are both shown, the
// stronger match pre-selected and the weaker one labelled with what it clashes
// with, instead of one of them quietly disappearing.

/** Weight of BM25 relevance vs. topic-tag agreement in the final score. */
const RELEVANCE_W = 0.72;
const TOPIC_W = 1 - RELEVANCE_W;
/** Minimum blended score (0…1) for a talk to be worth proposing. */
const SCORE_FLOOR = 0.18;
/** How many talks a plan proposes at most. */
export const PLAN_SIZE = 12;

export interface PlanCandidate {
  /** Follow-store id — `${forumCode}#${index}` or `KEYNOTE:${date}#${index}`. */
  id: string;
  kind: "talk" | "keynote";
  title: string;
  speakers: string;
  /** Forum title; empty for main-conference keynotes (the page labels those). */
  session: string;
  code?: string;
  room: string | null;
  date: string;
  start: string | null;
  end: string | null;
  /** true when start/end come from the forum block rather than the talk. */
  approxTime: boolean;
  topics: string[];
  /** AI-written one-line summary (zh only by design; never translated). */
  summary: string | null;
  /** The text BM25 ranks — never rendered. */
  text: string;
}

export interface PlanPick extends PlanCandidate {
  /** Blended relevance, 0…1. */
  score: number;
  /** Topic tags this pick shares with the stated interest. */
  matched: string[];
  /** Title of the higher-scoring pick this one collides with, if any. */
  clashesWith?: string;
}

export interface PlanDay {
  date: string;
  picks: PlanPick[];
}

export interface PlanCorpus {
  candidates: PlanCandidate[];
  /** BM25 statistics, built on first use and then reused — tokenizing a whole
      program costs ~100ms, which belongs on the first "plan me", not on mount. */
  model: () => Bm25Model;
  /** Topic keys present in this conference, most common first. */
  topics: string[];
}

function speakerText(t: Talk): string {
  return (t.speakers ?? [])
    .flatMap((s) => [s.name, s.affiliation_raw ?? "", s.organization ?? ""])
    .join(" ");
}

/** Is this something a person would plan to attend? Untitled entries have
    nothing to recommend yet, and openings/greetings are ceremony, not a talk. */
function plannable(t: Talk): boolean {
  return t.title_status !== "tbd" && !!t.title?.zh && t.type !== "opening";
}

/** Every plannable talk of a conference (forum talks + main-stage keynotes),
    with its BM25 model and the topic vocabulary actually used by its program.
    Pure and memoised by the page, since it walks the whole dataset. */
export function buildPlanCorpus(views: ConferenceViews): PlanCorpus {
  const { conference, keynoteEntries, forumTimeWindow } = views;
  const candidates: PlanCandidate[] = [];
  const topicCount = new Map<string, number>();

  const countTopics = (t: Talk) => {
    for (const key of t.enrichment?.topics ?? []) {
      topicCount.set(key, (topicCount.get(key) ?? 0) + 1);
    }
  };

  const docText = (t: Talk, session: string): string =>
    [
      // The title carries the most signal, so it goes in twice — the same field
      // boost global search applies.
      t.title?.zh ?? "",
      t.title?.zh ?? "",
      t.title?.en ?? "",
      t.abstract ?? "",
      t.enrichment?.summary?.zh ?? "",
      (t.enrichment?.topics ?? []).map(topicSearchText).join(" "),
      speakerText(t),
      session,
    ].join(" ");

  for (const f of conference.forums ?? []) {
    const win = forumTimeWindow(f);
    (f.talks ?? []).forEach((t, i) => {
      countTopics(t);
      if (!plannable(t)) return;
      candidates.push({
        id: talkId(f.code, i),
        kind: "talk",
        title: t.title?.zh ?? "",
        speakers: (t.speakers ?? []).map((s) => s.name).filter(Boolean).join("、"),
        session: f.title.zh,
        code: f.code,
        room: f.room ?? null,
        date: f.day_date ?? "",
        start: t.start ?? win.start ?? null,
        end: t.end ?? win.end ?? null,
        approxTime: !t.start,
        topics: t.enrichment?.topics ?? [],
        summary: t.enrichment?.summary?.zh ?? null,
        text: docText(t, f.title.zh),
      });
    });
  }

  for (const e of keynoteEntries) {
    countTopics(e.talk);
    if (!plannable(e.talk)) continue;
    candidates.push({
      id: keynoteId(e.date, e.index),
      kind: "keynote",
      title: e.talk.title?.zh ?? "",
      speakers: (e.talk.speakers ?? []).map((s) => s.name).filter(Boolean).join("、"),
      session: "",
      room: e.location ?? null,
      date: e.date,
      start: e.talk.start ?? null,
      end: e.talk.end ?? null,
      approxTime: false,
      topics: e.talk.enrichment?.topics ?? [],
      summary: e.talk.enrichment?.summary?.zh ?? null,
      text: docText(e.talk, ""),
    });
  }

  const topics = [...topicCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
    .map(([key]) => key);

  let model: Bm25Model | null = null;
  return {
    candidates,
    topics,
    model: () => (model ??= buildBm25(candidates.map((c) => c.text))),
  };
}

function toMin(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

// Two picks collide when their windows overlap AND they sit in different
// sessions. Same forum = sequential talks (or, where the dataset has no
// per-talk times, the same room for the whole block) — not a clash.
function collides(a: PlanCandidate, b: PlanCandidate): boolean {
  if (a.date !== b.date) return false;
  if (a.code && b.code && a.code === b.code) return false;
  const as = toMin(a.start);
  const bs = toMin(b.start);
  if (as == null || bs == null) return false;
  const ae = toMin(a.end) ?? as + 20;
  const be = toMin(b.end) ?? bs + 20;
  return as < be && bs < ae;
}

/** Rank the corpus against a stated interest (free text + chosen topic tags)
    and return the best picks, strongest first. */
export function rankPlan(
  corpus: PlanCorpus,
  interest: string,
  selected: string[],
  size = PLAN_SIZE,
): PlanPick[] {
  const text = interest.trim();
  if (!text && selected.length === 0) return [];
  const lower = text.toLowerCase();
  // Chosen tags join the query through their labels, so they rank the same way
  // typing the topic's name would.
  const query = `${lower} ${selected.map(topicSearchText).join(" ")}`;
  const relevance = bm25Scores(corpus.model(), tokenize(query));
  const best = maxScore(relevance);
  // A pick agreeing on two tags is already a strong topical match; asking for
  // all of a long chip selection would punish every real talk.
  const need = Math.max(1, Math.min(selected.length, 2));

  const scored: PlanPick[] = [];
  corpus.candidates.forEach((c, i) => {
    const rel = best > 0 ? (relevance.get(i) ?? 0) / best : 0;
    // A tag matches when the user picked it, or when they named it in prose
    // ("关注智能体和形式化验证" hits the 智能体 tag).
    const matched = c.topics.filter(
      (k) => selected.includes(k) || topicAliases(k).some((a) => lower.includes(a)),
    );
    const topical = Math.min(1, matched.length / need);
    const score = RELEVANCE_W * rel + TOPIC_W * topical;
    if (score < SCORE_FLOOR) return;
    scored.push({ ...c, score, matched });
  });

  scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return scored.slice(0, size);
}

/** Turn ranked picks into the actual agenda: grouped by day, ordered by start
    time, with every pick that collides with a stronger one labelled. */
export function assemblePlan(picks: PlanPick[]): PlanDay[] {
  const kept: PlanPick[] = [];
  // Strongest first, so the first pick to claim a slot is the better match and
  // later collisions are labelled against it — never dropped.
  for (const p of [...picks].sort((a, b) => b.score - a.score)) {
    // Only a pick that still owns its slot can push another one out. A talk that
    // already lost a slot must not knock a third one out of the default agenda —
    // otherwise a single collision cascades through the rest of the block.
    const clash = kept.find((k) => !k.clashesWith && collides(k, p));
    kept.push(clash ? { ...p, clashesWith: clash.title } : p);
  }

  const byDate = new Map<string, PlanPick[]>();
  for (const p of kept) {
    const arr = byDate.get(p.date);
    if (arr) arr.push(p);
    else byDate.set(p.date, [p]);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dayPicks]) => ({
      date,
      picks: dayPicks.sort((a, b) => {
        // Untimed picks sort last; equal starts fall back to the better match.
        const as = toMin(a.start);
        const bs = toMin(b.start);
        if (as == null || bs == null) return (as == null ? 1 : 0) - (bs == null ? 1 : 0);
        return as - bs || b.score - a.score;
      }),
    }));
}
