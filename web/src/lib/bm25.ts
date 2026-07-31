// BM25 relevance ranking over the conference's own text, computed in the
// browser. Shared by global search (search.ts) and the agenda planner (plan.ts).
//
// Why BM25 and not embeddings: the app is offline-first with no backend, and a
// query-side encoder would mean shipping a model into the bundle. BM25 is plain
// arithmetic over term statistics of the already-loaded conference JSON — no
// network, no runtime dependency, and it ranks *every* partial match instead of
// the strict all-terms-present substring test global search started with.
//
// Tokenization is the part that actually decides quality here, because the
// corpus is overwhelmingly Chinese with English terms embedded in it:
//   - Han runs become CHARACTER BIGRAMS (存算一体 -> 存算 / 算一 / 一体). There is
//     no word segmenter in the browser, and bigrams are the standard
//     segmenter-free stand-in: they keep enough word structure to rank on while
//     matching across segmentation choices a segmenter would have to guess.
//   - Latin/digit runs become one lowercased word token, plus a 5-char prefix
//     "stem" for longer words so agent/agentic and verify/verification meet.
// The same tokenizer runs over documents and queries, so the two always agree.

const K1 = 1.2;
const B = 0.75;
/** Words longer than this also emit a prefix token, a cheap English stemmer. */
const STEM_LEN = 5;

// CJK ideographs (incl. extension A and the compatibility block). Han runs are
// bigram-split; everything else falls through to the word-token branch.
function isHan(c: string): boolean {
  const n = c.codePointAt(0) ?? 0;
  return (
    (n >= 0x4e00 && n <= 0x9fff) ||
    (n >= 0x3400 && n <= 0x4dbf) ||
    (n >= 0xf900 && n <= 0xfaff)
  );
}

function isWordChar(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "0" && c <= "9");
}

/** Split text into ranking tokens. Lowercases; drops punctuation and spacing. */
export function tokenize(text: string): string[] {
  const s = text.toLowerCase();
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (isHan(c)) {
      let j = i + 1;
      while (j < s.length && isHan(s[j])) j += 1;
      const run = s.slice(i, j);
      // A lone character has no bigram; keep it so single-char queries still
      // reach the index (e.g. 芯).
      if (run.length === 1) out.push(run);
      else for (let k = 0; k + 1 < run.length; k += 1) out.push(run.slice(k, k + 2));
      i = j;
    } else if (isWordChar(c)) {
      let j = i + 1;
      while (j < s.length && isWordChar(s[j])) j += 1;
      const word = s.slice(i, j);
      out.push(word);
      if (word.length > STEM_LEN) out.push(word.slice(0, STEM_LEN));
      i = j;
    } else {
      i += 1;
    }
  }
  return out;
}

export interface Bm25Model {
  /** term -> flat postings list [docIndex, termFreq, docIndex, termFreq, …].
      Flat numbers rather than objects: one array per term instead of one object
      per (doc, term) pair keeps a ~600-talk corpus small and cache-friendly. */
  postings: Map<string, number[]>;
  /** token count per document, parallel to the input array */
  lengths: number[];
  avgdl: number;
  n: number;
}

/** Build the BM25 statistics (postings, document lengths, average length) for a
    corpus. Linear in total text length; callers memoise it per conference and
    build it lazily, so it never runs on the critical render path. */
export function buildBm25(docs: string[]): Bm25Model {
  const postings = new Map<string, number[]>();
  const lengths = new Array<number>(docs.length);
  const tf = new Map<string, number>();
  let total = 0;
  for (let d = 0; d < docs.length; d += 1) {
    tf.clear();
    const tokens = tokenize(docs[d]);
    for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
    lengths[d] = tokens.length;
    total += tokens.length;
    for (const [term, f] of tf) {
      const arr = postings.get(term);
      if (arr) arr.push(d, f);
      else postings.set(term, [d, f]);
    }
  }
  return { postings, lengths, avgdl: docs.length ? total / docs.length : 1, n: docs.length };
}

/** Score every document that shares at least one token with the query.
    Documents that share nothing are absent from the map (score 0), so cost is
    proportional to the query's postings, not to the corpus size. */
export function bm25Scores(model: Bm25Model, queryTokens: string[]): Map<number, number> {
  const scores = new Map<number, number>();
  if (model.n === 0) return scores;
  const qtf = new Map<string, number>();
  for (const tok of queryTokens) qtf.set(tok, (qtf.get(tok) ?? 0) + 1);
  const avgdl = model.avgdl || 1;
  for (const [term, qf] of qtf) {
    const post = model.postings.get(term);
    if (!post) continue;
    const df = post.length / 2;
    // Smoothed IDF (the "+1" variant) so a term present in almost every
    // document contributes ~0 instead of going negative.
    const idf = Math.log(1 + (model.n - df + 0.5) / (df + 0.5));
    // A term repeated in a long interest description counts for more, with
    // diminishing returns — the planner feeds whole paragraphs in as queries.
    const qw = 1 + Math.log(qf);
    for (let p = 0; p < post.length; p += 2) {
      const d = post[p];
      const f = post[p + 1];
      const norm = f + K1 * (1 - B + (B * model.lengths[d]) / avgdl);
      scores.set(d, (scores.get(d) ?? 0) + qw * idf * ((f * (K1 + 1)) / norm));
    }
  }
  return scores;
}

/** Largest value in a score map (0 when empty) — used to normalise a run of
    scores to 0…1 before blending them with other signals. */
export function maxScore(scores: Map<number, number>): number {
  let max = 0;
  for (const v of scores.values()) if (v > max) max = v;
  return max;
}
