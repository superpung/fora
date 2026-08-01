import type { Conference } from "../types";
import type { Lang } from "./i18n-store";
import { topicLabel } from "./topic-labels";

// "Conference at a glance": the topic landscape of one program, built from the
// AI-derived `talk.enrichment.topics` tags (a controlled vocabulary — see
// source/topics.json). AI-DERIVED, so every surface built on this module is
// gated on useAi().enabled and carries a provenance mark.
//
// A topic travels as its vocabulary KEY and is only ever shown through
// `topicLabel()`, so an English reader reads "Compute-in-Memory" where a Chinese
// one reads 存算一体. The label is baked into the node because it decides the
// bubble's text layout, which makes the map language-dependent — hence the
// per-language memo below.
//
// Everything here is a pure function of the conference JSON. In particular the
// LAYOUT IS DETERMINISTIC: no randomness, no seeding, no force simulation and
// no measurement of the DOM, so the same dataset always produces the same map,
// on every load and on every device. The four ordering decisions that drive it
// (rank, seriation, candidate scan, settling) all break ties on the topic key,
// which is unique, so no comparison can ever end in an arbitrary result. The
// backdrop wash follows the same ranking, for the same reason.

/** One talk carrying a topic, flattened with everything a link needs. */
export interface TopicTalk {
  forumCode: string;
  forumTitle: string;
  /** 0-based index within the forum's talk list — the `#talk-N` anchor is N+1. */
  index: number;
  title?: string;
  titleTbd: boolean;
  room?: string | null;
  date?: string | null;
  period?: string | null;
  start?: string | null;
  end?: string | null;
  topics: string[];
}

export interface TopicNode {
  key: string;
  /** The key as shown to this reader — what `lines` is a wrapping of. */
  label: string;
  count: number;
  /** Layout, in the map's own coordinate space (see `width`/`height`). */
  x: number;
  y: number;
  r: number;
  /** Label split into at most two lines, plus the font size that makes it fit. */
  lines: string[];
  fontSize: number;
  talks: TopicTalk[];
}

export interface TopicEdge {
  a: string;
  b: string;
  /** Number of talks carrying both topics. */
  n: number;
  /** Cosine-normalised strength in (0,1] — how much the two topics travel
      together, independent of how big either one is. */
  w: number;
}

/** One soft light behind the map. The bubbles are colourless glass, so all the
    colour in the visualization comes from these — a handful of wide, heavily
    blurred washes sitting under the biggest topics. Regions of the map are
    therefore tinted by what is IN them, and no reader has to decode forty
    separate hues. */
export interface TopicBlob {
  x: number;
  y: number;
  r: number;
  hue: number;
}

export interface TopicCoverage {
  /** Talks the bubbles actually stand for: forum talks carrying at least one
      topic. Main-stage keynotes are not on the map (they have no `#talk-N`
      anchor to link at), so they are not counted here either — the page states
      this number as "N talks", and it has to be the same N. */
  tagged: number;
}

export interface TopicMapData {
  /** Ranked by count desc, then key — also the DOM/tab order of the map. */
  nodes: TopicNode[];
  byKey: Map<string, TopicNode>;
  /** Co-occurring topics of a topic, strongest first. */
  neighbors: Map<string, TopicEdge[]>;
  /** The strongest links overall, drawn faintly as the map's backbone. */
  backbone: TopicEdge[];
  /** Backdrop washes, largest topic first. */
  blobs: TopicBlob[];
  width: number;
  height: number;
  coverage: TopicCoverage;
}

/* ============================== layout tuning ============================== */

const R_MIN = 30; // smallest bubble: fits a 3-character label and a finger
const R_MAX = 62;
// Bubbles are kept a link's-width apart on purpose: packed edge to edge, a
// co-occurrence line would disappear under its own endpoints.
const GAP = 18;
const LABEL_FONT = 11.5;
const LABEL_FONT_MIN = 8;
const LABEL_FONT_STEP = 0.5;
/** Baseline-to-baseline, as a multiple of the font size. Shared with the page,
    which stacks the tspans on the same rhythm. */
export const LINE_HEIGHT = 1.15;
/** Past three lines a bubble reads as a paragraph, not a label. */
const LABEL_LINES_MAX = 3;
/** Breathing room between the longest line and the bubble's rim. */
const LABEL_INSET = 6;
/** Golden-angle sunflower: an even, gap-free candidate scan around a point. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SCAN_STEP = 9;
const SCAN_LIMIT = 4000;
/** Settling passes after placement — see step 3b. */
const COMPACT_ROUNDS = 60;
/** Move lengths a bubble tries per pass, longest first, in px. */
const COMPACT_STEPS = [12, 6, 3, 1.5];
/** Directions tried, as offsets from "straight at the centre" in radians. A
    bubble that cannot move inward directly slides around whatever is in the
    way instead of giving up — without this the cluster jams almost at once. */
const COMPACT_TURNS = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05];
/** Vertical distance counts this much more than horizontal, so the cluster
    settles into a wide band instead of a circle. A page is wider than it is
    tall; a topic map that scrolls sideways is a topic map nobody finishes. */
const COMPACT_ASPECT = 2.2;
/** How many backdrop washes to lay down, and the hues they use in order.
    Warm-to-cool and deliberately off the blue-violet axis the AI marks own, so
    the wash reads as light in the room rather than as a category legend. */
const BLOB_COUNT = 4;
const BLOB_HUES = [162, 34, 194, 348];
/** Wash radius, as a fraction of the map's longer side. Wide enough that any
    two of them overlap into a gradient instead of reading as four spots. */
const BLOB_SPREAD = 0.62;
/** How many links to draw before any topic is selected. Enough to read the
    shape of the program, few enough not to become a hairball. */
const BACKBONE_MAX = 22;

/** Separator for the co-occurrence pair key — no topic key contains a NUL. */
const PAIR_SEP = "\u0000";

/* ================================= labels ================================= */

const isCjk = (ch: string): boolean => /[㐀-鿿豈-﫿]/.test(ch);
/** Rough advance width of a label in font-size units (CJK is full-width). */
const textUnits = (s: string): number =>
  [...s].reduce((w, ch) => w + (isCjk(ch) ? 1 : 0.58), 0);

/** What a bubble is lettered with: the label trimmed to its first alternative,
    so 存算一体 / CIM and "AI Chip / Accelerator" stay legible at bubble size.
    The panel heading and the accessible name still carry the label in full. */
const bubbleText = (label: string): string => label.split("/")[0].trim();

/** A piece of a label that must not be broken, and whether a space preceded it.
    English breaks between words and after hyphens; CJK, which has neither,
    breaks between any two characters. */
interface Chunk {
  text: string;
  space: boolean;
}

function chunks(label: string): Chunk[] {
  const out: Chunk[] = [];
  let cur = "";
  let pendingSpace = false;
  const flush = () => {
    if (!cur) return;
    out.push({ text: cur, space: pendingSpace });
    cur = "";
    pendingSpace = false;
  };
  for (const ch of [...label]) {
    if (ch === " ") {
      flush();
      pendingSpace = true;
      continue;
    }
    if (isCjk(ch)) {
      flush();
      cur = ch;
      flush();
      continue;
    }
    cur += ch;
    if (ch === "-") flush();
  }
  flush();
  return out;
}

/** Usable width of the text line sitting `y` above or below the bubble's
    centre: the circle's chord there, inset so the letters clear the rim. A
    bubble is round, so its middle line has far more room than its outer ones —
    measuring the chord is what lets "Superconducting" sit inside one. */
const chordAt = (r: number, y: number): number =>
  2 * Math.sqrt(Math.max(0, r * r - y * y)) - LABEL_INSET;

/** Greedy word wrap into lines of the given widths. Null if the chunks do not
    all fit within them. */
function wrapTo(cs: Chunk[], widths: number[], fontSize: number): string[] | null {
  const lines: string[] = [];
  let i = 0;
  for (const w of widths) {
    let line = "";
    while (i < cs.length) {
      const next = line && cs[i].space ? ` ${cs[i].text}` : cs[i].text;
      // The first chunk goes on unconditionally — an over-long word is caught
      // by the caller's fit check, not by producing an empty line.
      if (line && textUnits(line + next) * fontSize > w) break;
      line += next;
      i += 1;
    }
    if (!line) return null;
    lines.push(line);
    if (i >= cs.length) return lines;
  }
  return null;
}

/** Fit a topic label inside its bubble: the largest size, on the fewest lines,
    that keeps every line inside the circle. Falls back to the tightest attempt
    when a single long word cannot be made to fit at all. */
function fitLabel(label: string, r: number): { lines: string[]; fontSize: number } {
  const cs = chunks(label);
  let fallback: { lines: string[]; fontSize: number } = {
    lines: [label],
    fontSize: LABEL_FONT_MIN,
  };
  for (let fontSize = LABEL_FONT; fontSize >= LABEL_FONT_MIN; fontSize -= LABEL_FONT_STEP) {
    const lineH = fontSize * LINE_HEIGHT;
    for (let n = 1; n <= LABEL_LINES_MAX; n++) {
      const top = -((n - 1) * lineH) / 2;
      const widths = Array.from({ length: n }, (_, i) => chordAt(r, top + i * lineH));
      const lines = wrapTo(cs, widths, fontSize);
      if (!lines) continue;
      if (lines.every((l, i) => textUnits(l) * fontSize <= widths[i])) return { lines, fontSize };
      fallback = { lines, fontSize };
    }
  }
  return fallback;
}

/* ================================= builder ================================ */

/** Build the whole topic map for one conference, lettered in `lang`. Pure; the
    page memoises it. */
export function buildTopicMap(conference: Conference, lang: Lang): TopicMapData {
  // ---- 1. counts, co-occurrence, and the talks behind each topic ----
  const counts = new Map<string, number>();
  const talksByTopic = new Map<string, TopicTalk[]>();
  // Co-occurrence counts, keyed by the two topics joined with a separator
  // that cannot occur inside a key.
  const pairs = new Map<string, number>();
  let tagged = 0;

  const pairKey = (a: string, b: string) =>
    a < b ? `${a}${PAIR_SEP}${b}` : `${b}${PAIR_SEP}${a}`;

  for (const f of conference.forums ?? []) {
    // A forum whose agenda has not been parsed contributes no talks at all.
    if (!f.detail_extracted) continue;
    (f.talks ?? []).forEach((talk, index) => {
      const topics = [...new Set(talk.enrichment?.topics ?? [])].sort();
      if (topics.length === 0) return;
      tagged += 1;
      const entry: TopicTalk = {
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
        topics,
      };
      for (const key of topics) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
        const arr = talksByTopic.get(key);
        if (arr) arr.push(entry);
        else talksByTopic.set(key, [entry]);
      }
      for (let i = 0; i < topics.length; i++) {
        for (let j = i + 1; j < topics.length; j++) {
          const k = pairKey(topics[i], topics[j]);
          pairs.set(k, (pairs.get(k) ?? 0) + 1);
        }
      }
    });
  }
  const coverage: TopicCoverage = { tagged };
  const keys = [...counts.keys()].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || (a < b ? -1 : 1),
  );
  if (keys.length === 0) {
    return {
      nodes: [],
      byKey: new Map(),
      neighbors: new Map(),
      backbone: [],
      blobs: [],
      width: 0,
      height: 0,
      coverage,
    };
  }

  const cooc = (a: string, b: string): number => pairs.get(pairKey(a, b)) ?? 0;
  const maxCount = counts.get(keys[0]) ?? 1;
  // Radius on a sqrt scale so bubble AREA tracks the talk count, offset by a
  // floor that keeps the rarest topic readable and tappable.
  const radius = new Map(
    keys.map((k) => [
      k,
      R_MIN + (R_MAX - R_MIN) * Math.sqrt((counts.get(k) ?? 0) / maxCount),
    ]),
  );

  // ---- 2. placement order (seriation) ----
  // Walk a chain: after the biggest topic, always take whichever topic shares
  // the most talks with the one just placed. Related themes therefore get
  // placed consecutively, which — combined with step 3 — lands them near each
  // other on the map. Ties fall back to overall connectedness, then count,
  // then key, so the chain is fully determined by the data.
  const order: string[] = [keys[0]];
  const remaining = new Set(keys.slice(1));
  while (remaining.size > 0) {
    const last = order[order.length - 1];
    let best: string | null = null;
    let bestRank: [number, number, number] = [-1, -1, -1];
    for (const k of remaining) {
      const rank: [number, number, number] = [
        cooc(k, last),
        order.reduce((s, p) => s + cooc(k, p), 0),
        counts.get(k) ?? 0,
      ];
      const better =
        best === null ||
        rank[0] > bestRank[0] ||
        (rank[0] === bestRank[0] &&
          (rank[1] > bestRank[1] ||
            (rank[1] === bestRank[1] &&
              (rank[2] > bestRank[2] || (rank[2] === bestRank[2] && k < best)))));
      if (better) {
        best = k;
        bestRank = rank;
      }
    }
    order.push(best!);
    remaining.delete(best!);
  }

  // ---- 3. placement ----
  // Each topic is dropped as close as possible to the co-occurrence-weighted
  // centroid of the topics already on the map, i.e. next to the themes it
  // actually travels with; the first non-overlapping spot on a golden-angle
  // scan outward from that anchor wins. No forces, no iteration, no randomness.
  const pos = new Map<string, { x: number; y: number }>();
  for (const k of order) {
    const rk = radius.get(k)!;
    let wsum = 0;
    let ax = 0;
    let ay = 0;
    for (const [p, pp] of pos) {
      const w = cooc(k, p);
      if (w > 0) {
        wsum += w;
        ax += w * pp.x;
        ay += w * pp.y;
      }
    }
    if (wsum > 0) {
      ax /= wsum;
      ay /= wsum;
    }
    let placed = false;
    for (let s = 0; s < SCAN_LIMIT; s++) {
      const rad = SCAN_STEP * Math.sqrt(s);
      const th = s * GOLDEN_ANGLE;
      const x = ax + rad * Math.cos(th);
      const y = ay + rad * Math.sin(th);
      let free = true;
      for (const [p, pp] of pos) {
        const need = rk + radius.get(p)! + GAP;
        if ((x - pp.x) ** 2 + (y - pp.y) ** 2 < need * need) {
          free = false;
          break;
        }
      }
      if (free) {
        pos.set(k, { x, y });
        placed = true;
        break;
      }
    }
    // Unreachable for any realistic vocabulary (the scan covers ~570px of
    // radius); park it on the far right rather than drop the topic.
    if (!placed) pos.set(k, { x: ax + SCAN_STEP * Math.sqrt(SCAN_LIMIT), y: ay });
  }

  // ---- 3b. settling ----
  // Placement is greedy and one-shot: a topic dropped early can leave the ones
  // that follow stranded in a spur, so the raw scan produces a ragged, sprawling
  // outline with holes in it. Pull every bubble back toward the cluster's centre
  // — the largest move that still clears every other bubble wins, halving until
  // one fits — until nothing can move any further. Vertical pull is stronger, so
  // the result is a wide band rather than a tall blob.
  //
  // Still no randomness and no physics: bubbles are visited in the seriation
  // order, so the outcome is fully determined by the data.
  const clears = (k: string, x: number, y: number): boolean => {
    const rk = radius.get(k)!;
    for (const [p, pp] of pos) {
      if (p === k) continue;
      const need = rk + radius.get(p)! + GAP;
      if ((x - pp.x) ** 2 + (y - pp.y) ** 2 < need * need) return false;
    }
    return true;
  };
  for (let round = 0; round < COMPACT_ROUNDS; round++) {
    let cx = 0;
    let cy = 0;
    for (const p of pos.values()) {
      cx += p.x;
      cy += p.y;
    }
    cx /= pos.size;
    cy /= pos.size;
    // Distance to the centre, counting vertical distance as the more expensive
    // one — this is the only thing the pass tries to reduce.
    const cost = (x: number, y: number): number =>
      (x - cx) ** 2 + ((y - cy) * COMPACT_ASPECT) ** 2;
    let moved = false;
    for (const k of order) {
      const p = pos.get(k)!;
      const here = cost(p.x, p.y);
      const straight = Math.atan2((cy - p.y) * COMPACT_ASPECT, cx - p.x);
      let best: { x: number; y: number } | null = null;
      let bestCost = here;
      for (const step of COMPACT_STEPS) {
        for (const turn of COMPACT_TURNS) {
          const th = straight + turn;
          const nx = p.x + Math.cos(th) * step;
          const ny = p.y + Math.sin(th) * step;
          const c = cost(nx, ny);
          if (c >= bestCost || !clears(k, nx, ny)) continue;
          bestCost = c;
          best = { x: nx, y: ny };
        }
        // Take the longest step that gets anywhere; only fall back to shorter
        // ones when the bubble is boxed in.
        if (best) break;
      }
      if (best) {
        pos.set(k, best);
        moved = true;
      }
    }
    if (!moved) break;
  }

  // Normalise to a (0,0)-anchored box with a small margin, so the SVG viewBox
  // is exactly the content.
  const MARGIN = 6;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const k of keys) {
    const p = pos.get(k)!;
    const r = radius.get(k)!;
    minX = Math.min(minX, p.x - r);
    minY = Math.min(minY, p.y - r);
    maxX = Math.max(maxX, p.x + r);
    maxY = Math.max(maxY, p.y + r);
  }

  const nodes: TopicNode[] = keys.map((key) => {
    const p = pos.get(key)!;
    const r = radius.get(key)!;
    const label = topicLabel(key, lang);
    const talks = (talksByTopic.get(key) ?? []).slice().sort(
      (x, y) =>
        (x.date ?? "").localeCompare(y.date ?? "") ||
        (x.start ?? "").localeCompare(y.start ?? "") ||
        x.forumCode.localeCompare(y.forumCode) ||
        x.index - y.index,
    );
    return {
      key,
      label,
      count: counts.get(key) ?? 0,
      x: p.x - minX + MARGIN,
      y: p.y - minY + MARGIN,
      r,
      ...fitLabel(bubbleText(label), r),
      talks,
    };
  });

  // ---- 4. links ----
  const edges: TopicEdge[] = [];
  for (const [k, n] of pairs) {
    const [a, b] = k.split(PAIR_SEP);
    const ca = counts.get(a) ?? 0;
    const cb = counts.get(b) ?? 0;
    if (!ca || !cb) continue;
    edges.push({ a, b, n, w: n / Math.sqrt(ca * cb) });
  }
  // Strongest first; the key comparison keeps the order stable.
  edges.sort((x, y) => y.w - x.w || y.n - x.n || (x.a + x.b < y.a + y.b ? -1 : 1));

  const neighbors = new Map<string, TopicEdge[]>();
  const addNeighbor = (key: string, e: TopicEdge) => {
    const arr = neighbors.get(key);
    if (arr) arr.push(e);
    else neighbors.set(key, [e]);
  };
  for (const e of edges) {
    addNeighbor(e.a, e);
    addNeighbor(e.b, e);
  }

  const width = maxX - minX + MARGIN * 2;
  const height = maxY - minY + MARGIN * 2;
  const spread = Math.max(width, height) * BLOB_SPREAD;

  return {
    nodes,
    byKey: new Map(nodes.map((n) => [n.key, n])),
    neighbors,
    backbone: edges.filter((e) => e.n >= 2).slice(0, BACKBONE_MAX),
    blobs: nodes.slice(0, BLOB_COUNT).map((n, i) => ({
      x: n.x,
      y: n.y,
      r: spread,
      hue: BLOB_HUES[i % BLOB_HUES.length],
    })),
    width,
    height,
    coverage,
  };
}

/** The other end of a link, from one topic's point of view. */
export const otherEnd = (e: TopicEdge, key: string): string => (e.a === key ? e.b : e.a);

/* ================================ memoisation ============================== */

const cache = new Map<string, TopicMapData>();

/** Memoised per conference id and language — the map is built on first open of
    the topics page and reused for the rest of the session. Language is part of
    the key because the labels decide how the bubbles are lettered. */
export function topicMapFor(confId: string, conference: Conference, lang: Lang): TopicMapData {
  const cacheKey = `${confId}:${lang}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const built = buildTopicMap(conference, lang);
  cache.set(cacheKey, built);
  return built;
}
