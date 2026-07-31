import type { Conference } from "../types";

// "If you liked this, you might also want" — related talks for one open talk.
//
// Deliberately NOT embeddings: no model, no vectors to ship, no network. The
// whole thing is TF-IDF cosine over the talk text plus overlap of the AI-derived
// `enrichment.topics`, computed in the browser over the conference JSON that is
// already loaded. It is AI-DERIVED all the same (the topics and the one-line
// summary are model output), so the surface is gated on useAi().enabled and
// carries a provenance mark.
//
// Cost model: the corpus (tokenise + TF-IDF + inverted index) is built ONCE per
// conference, lazily, the first time a user asks for related talks — never on
// the critical render path. A query is then O(postings of the query's terms),
// not an all-pairs matrix: ~1k talks is a few milliseconds.

export interface SimilarTalk {
  forumCode: string;
  forumTitle: string;
  /** 0-based index in the forum's talk list; the anchor is `#talk-${index+1}`. */
  index: number;
  title?: string;
  titleTbd: boolean;
  room?: string | null;
  date?: string | null;
  period?: string | null;
  start?: string | null;
  end?: string | null;
  /** Topics this talk shares with the one being viewed — the "why". */
  sharedTopics: string[];
  score: number;
}

/* ================================ tokenizer =============================== */

const CJK_RUN = /[㐀-鿿豈-﫿]+/g;
const LATIN_RUN = /[a-z0-9]+/g;

/** Tokenise mixed Chinese/English talk text.
 *
 *  There is no word segmenter in the browser and shipping one would cost more
 *  than the feature is worth, so Chinese is cut into CHARACTER BIGRAMS — the
 *  standard segmentation-free approach: "存算一体" yields 存算/算一/一体, which
 *  matches any other talk using the same compound without a dictionary. Latin
 *  and digit runs are kept as whole lowercased words (RISC-V → risc, v). */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const w of lower.match(LATIN_RUN) ?? []) {
    if (w.length >= 2) out.push(w);
  }
  for (const run of lower.match(CJK_RUN) ?? []) {
    if (run.length === 1) {
      out.push(run);
      continue;
    }
    for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
  }
  return out;
}

/* ================================== corpus ================================ */

interface Doc {
  forumCode: string;
  forumTitle: string;
  index: number;
  title?: string;
  titleTbd: boolean;
  room?: string | null;
  date?: string | null;
  period?: string | null;
  start?: string | null;
  end?: string | null;
  topics: string[];
  /** L2-normalised TF-IDF weights, sparse. */
  vec: Map<string, number>;
}

interface Corpus {
  docs: Doc[];
  /** term -> [doc index, weight] pairs, so a query only touches its own terms. */
  postings: Map<string, { d: number; w: number }[]>;
  byTalk: Map<string, number>;
}

const talkKey = (forumCode: string, index: number) => `${forumCode}:${index}`;

function buildCorpus(conference: Conference): Corpus {
  const docs: Doc[] = [];
  const tfs: Map<string, number>[] = [];
  const df = new Map<string, number>();

  for (const f of conference.forums ?? []) {
    // Only forums whose agenda was extracted have a rendered talk list, so only
    // those have a `#talk-N` anchor we could link to.
    if (!f.detail_extracted) continue;
    (f.talks ?? []).forEach((talk, index) => {
      // Source text (title + abstract) plus the AI one-line summary, which is
      // often the only body a talk has. `summary.en` is always null by design.
      const text = [talk.title?.zh ?? "", talk.abstract ?? "", talk.enrichment?.summary?.zh ?? ""]
        .join(" ")
        .trim();
      const tf = new Map<string, number>();
      for (const term of tokenize(text)) tf.set(term, (tf.get(term) ?? 0) + 1);
      for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
      tfs.push(tf);
      docs.push({
        forumCode: f.code,
        forumTitle: f.title.zh,
        index,
        title: talk.title?.zh ?? undefined,
        titleTbd: talk.title_status === "tbd" || !talk.title?.zh,
        room: f.room,
        date: f.day_date,
        period: f.session_period,
        start: talk.start,
        end: talk.end,
        topics: [...new Set(talk.enrichment?.topics ?? [])],
        vec: new Map(),
      });
    });
  }

  const n = docs.length;
  const postings = new Map<string, { d: number; w: number }[]>();
  docs.forEach((doc, d) => {
    const tf = tfs[d];
    let norm = 0;
    const raw = new Map<string, number>();
    for (const [term, count] of tf) {
      // Sublinear tf × smoothed idf — the textbook weighting; it keeps a term
      // repeated ten times from drowning out everything else.
      const w = (1 + Math.log(count)) * (Math.log((n + 1) / ((df.get(term) ?? 0) + 1)) + 1);
      raw.set(term, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, w] of raw) {
      const nw = w / norm;
      doc.vec.set(term, nw);
      const list = postings.get(term);
      if (list) list.push({ d, w: nw });
      else postings.set(term, [{ d, w: nw }]);
    }
  });

  return {
    docs,
    postings,
    byTalk: new Map(docs.map((doc, d) => [talkKey(doc.forumCode, doc.index), d])),
  };
}

const cache = new Map<string, Corpus>();

/** Memoised per conference id. Built on first use only. */
function corpusFor(confId: string, conference: Conference): Corpus {
  const hit = cache.get(confId);
  if (hit) return hit;
  const built = buildCorpus(conference);
  cache.set(confId, built);
  return built;
}

/* ================================= scoring ================================ */

/** Weight of the topic-overlap term. The text carries most of the signal;
    shared topics act as a corrective that pulls together talks phrased
    differently about the same theme. */
const TOPIC_WEIGHT = 0.3;

/** Minimum combined score for a suggestion to be shown at all. Calibrated on
    both shipped datasets: at 0.15 the top-5 lists stay on-topic (only ~4% of
    candidate slots fall away as junk) while the handful of genuinely isolated
    talks correctly get no suggestions — three unrelated talks are worse than
    none. */
export const SIMILARITY_FLOOR = 0.15;

const DEFAULT_LIMIT = 5;

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const x of a) if (setB.has(x)) shared += 1;
  return shared / (a.length + b.length - shared);
}

/** Related talks for ONE talk, ranked. Cross-forum by design: same-forum talks
    are already listed on the page the user is reading, and a session's own
    agenda is trivially similar — the value is in what sits elsewhere in the
    program. Returns [] when nothing clears SIMILARITY_FLOOR. */
export function similarTalks(
  confId: string,
  conference: Conference,
  forumCode: string,
  index: number,
  limit: number = DEFAULT_LIMIT,
): SimilarTalk[] {
  const corpus = corpusFor(confId, conference);
  const self = corpus.byTalk.get(talkKey(forumCode, index));
  if (self == null) return [];
  const query = corpus.docs[self];

  // Accumulate the cosine through the inverted index: only documents that share
  // at least one term with the query are ever touched.
  const cos = new Map<number, number>();
  for (const [term, qw] of query.vec) {
    for (const { d, w } of corpus.postings.get(term) ?? []) {
      if (d === self) continue;
      cos.set(d, (cos.get(d) ?? 0) + qw * w);
    }
  }

  const results: SimilarTalk[] = [];
  const consider = (d: number, cosine: number) => {
    const doc = corpus.docs[d];
    if (doc.forumCode === forumCode) return;
    const score = (1 - TOPIC_WEIGHT) * cosine + TOPIC_WEIGHT * jaccard(query.topics, doc.topics);
    if (score < SIMILARITY_FLOOR) return;
    const shared = doc.topics.filter((x) => query.topics.includes(x));
    results.push({
      forumCode: doc.forumCode,
      forumTitle: doc.forumTitle,
      index: doc.index,
      title: doc.title,
      titleTbd: doc.titleTbd,
      room: doc.room,
      date: doc.date,
      period: doc.period,
      start: doc.start,
      end: doc.end,
      sharedTopics: shared,
      score,
    });
  };
  for (const [d, cosine] of cos) consider(d, cosine);
  // A talk sharing topics but no vocabulary can still clear the floor, so give
  // topic-only candidates a chance too (cheap: only same-topic talks).
  if (query.topics.length > 0) {
    corpus.docs.forEach((doc, d) => {
      if (cos.has(d) || d === self) return;
      if (doc.topics.some((x) => query.topics.includes(x))) consider(d, 0);
    });
  }

  results.sort(
    (a, b) =>
      b.score - a.score ||
      a.forumCode.localeCompare(b.forumCode) ||
      a.index - b.index,
  );
  return results.slice(0, limit);
}
