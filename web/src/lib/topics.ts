import type { Conference } from "../types";
import type { Lang } from "./i18n-store";
import { topicLabel, topicCategory } from "./topic-labels";

// "Conference at a glance": the topic landscape of one program, built from the
// AI-derived `talk.enrichment.topics` tags (a controlled vocabulary — see
// source/topics.json). AI-DERIVED, so every surface built on this module is
// gated on useAi().enabled and carries a provenance mark.
//
// A topic travels as its vocabulary KEY and is only ever shown through
// `topicLabel()`, so an English reader reads "Compute-in-Memory" where a Chinese
// one reads 存算一体.
//
// The map is a KNOWLEDGE GRAPH: a node per topic, sized by how many talks carry
// it, joined to the topics it shares talks with, and placed by those links —
// themes that travel together end up together. Two decisions make that readable
// where the earlier drafts were not:
//
//   * The label sits UNDER its node, not inside it. A circle is the worst
//     possible box for text, and fitting 存算一体 inside one is what forced the
//     nodes to be huge, which in turn buried the links they exist to show. With
//     the label outside, a node can be a small disc and the graph can breathe.
//   * The layout reserves the label's own box. Placement separates node+label
//     boxes, not circles, so labels do not land on top of each other.
//
// Everything here is a pure function of the conference JSON and the box it is
// laid out for. The layout is DETERMINISTIC: positions start on a fixed spiral
// and are relaxed for a fixed number of passes, with no randomness anywhere, so
// the same dataset always produces the same graph, on every load and on every
// device. Ties break on the topic key, which is unique.

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
  /** The key as shown to this reader. */
  label: string;
  /** The label as lettered on the graph — trimmed to its first alternative. */
  short: string;
  count: number;
  /** Centre of the disc, in the pixels of the box this map was built for. */
  x: number;
  y: number;
  /** Disc radius, in the same pixels. */
  r: number;
  /** 0…1 by talk count — how deep the disc's colour sits. */
  weight: number;
  /** Hue of the topic's family in the vocabulary (see CATEGORY_HUE), or null
      for a topic whose family the vocabulary does not name — that one stays
      grey rather than being given a colour it has not earned. */
  hue: number | null;
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

export interface TopicCoverage {
  /** Talks the nodes actually stand for: forum talks carrying at least one
      topic. Main-stage keynotes are not on the map (they have no `#talk-N`
      anchor to link at), so they are not counted here either — the page states
      this number as "N talks", and it has to be the same N. */
  tagged: number;
}

export interface TopicMapData {
  /** Ranked by count desc, then key — also the DOM/tab order. */
  nodes: TopicNode[];
  byKey: Map<string, TopicNode>;
  /** Co-occurring topics of a topic, strongest first. */
  neighbors: Map<string, TopicEdge[]>;
  /** The links actually drawn: every topic's strongest ties, plus the strongest
      ties overall, up to a cap. All of them are still in `neighbors`. */
  links: TopicEdge[];
  width: number;
  height: number;
  /** Type size the labels were laid out at — the page sets it on the canvas, so
      what is measured here is exactly what is rendered. */
  labelFont: number;
  coverage: TopicCoverage;
}

/* ============================== layout tuning ============================== */

/** Disc radius bounds, for a box of REF_AREA; smaller boxes scale down. */
const R_MIN = 6;
const R_MAX = 27;
const REF_AREA = 1000 * 520;
/** Label metrics, in px. The graph letters every topic at one size — a label is
    a name, not a quantity, and the disc beside it already carries the count.
    A phone-sized box gets the smaller of the two: forty labelled nodes have to
    find room in a third of the width. */
const LABEL_FONT = 11.5;
const LABEL_FONT_SMALL = 10.5;
const SMALL_BOX = 520;
const LABEL_LEADING = 1.18;
const LABEL_GAP = 5;
/** Longest label line before it wraps, in characters-worth of the label font. */
const LABEL_WRAP = 7.2;
const LABEL_LINES_MAX = 2;
/** Clear space kept around every node+label box. */
const PAD = 8;
/** How far the relaxed graph may be stretched to fill the box. The relaxation
    settles into whatever area its forces balance at, which is usually smaller
    than the canvas; scaling the positions (never the discs) spreads it back
    out, and the cap stops a four-topic conference from being blown apart. */
const FIT_MAX = 2.4;
/** How much of the box the relaxed graph is stretched to. */
const FIT_SLACK = 0.94;
/** Relaxation passes and how far a node may move on the first one (px). */
const PASSES = 320;
const HEAT = 26;
/** Pull along a link, and how much the ideal length shortens as the two topics
    share more talks. */
const PULL = 0.075;
const LINK_LEN = 1.55;
const LINK_LEN_MIN = 0.6;
/** Push between every pair of nodes, as a multiple of the layout's own scale. */
const PUSH = 0.85;
/** Pull toward the centre. */
const GRAVITY = 0.0055;
/** Hard separation passes after the relaxation, where boxes are simply pushed
    out of each other until they stop overlapping. */
const SEPARATE_PASSES = 220;
/** How many links to draw: each topic's strongest few, then the strongest
    remaining ones until the cap. Enough to read the shape of the program, few
    enough not to become a hairball. */
const LINKS_PER_NODE = 3;
const LINKS_MAX_PER_NODE = 2.2;
/** Filling up to the cap stops here: a link this weak says nothing — two
    topics that met once by accident. A topic's own strongest ties are exempt. */
const LINK_MIN_W = 0.12;

/** One hue per family in the topic vocabulary (source/topics.json `category`).
    Colour here is not decoration and not a scale: it says which topics are the
    same KIND of thing, which is the one grouping the reader cannot work out
    from the graph alone. It is kept low-chroma and at one lightness so no
    family shouts over another, and it stays off the violet axis, which in this
    app means "AI-generated" and nothing else. An unknown family falls back to
    neutral, so a vocabulary that grows never invents a colour. */
const CATEGORY_HUE: Record<string, number> = {
  se: 212,          // software engineering — blue
  systems: 168,     // systems — teal
  "ic-system": 140, // chip systems — green
  emerging: 96,     // emerging — olive
  "ic-design": 42,  // chip design — amber
  "ic-process": 20, // process & packaging — orange
  security: 352,    // security — rose
  ai: 322,          // AI/ML — magenta
  // `meta` (industry, governance, education, open data) is deliberately absent:
  // it is not a technical family but the things that cut across all of them, so
  // it stays neutral rather than being given a colour of its own. Nothing here
  // sits between 225° and 290°, the blue-violet the AI mark owns.
};
/** Separator for the co-occurrence pair key — no topic key contains a NUL. */
const PAIR_SEP = "\u0000";

/* ================================= labels ================================= */

const isCjk = (ch: string): boolean => /[㐀-鿿豈-﫿]/.test(ch);
/** Rough advance width of a label in font-size units (CJK is full-width). */
const textUnits = (s: string): number =>
  [...s].reduce((w, ch) => w + (isCjk(ch) ? 1 : 0.58), 0);

/** What a node is lettered with: the label trimmed to its first alternative, so
    存算一体 / CIM and "AI Chip / Accelerator" stay short under the disc. The
    panel heading and the accessible name still carry the label in full. */
const nodeText = (label: string): string => label.split("/")[0].trim();

/** The label's own box under the disc: how wide it runs and how many lines it
    takes, at the one size every label is set in. The page wraps it with the
    same budget (`max-width` in cqw-free px), so this is what is on screen. */
function labelBox(text: string, font: number): { w: number; h: number } {
  const units = textUnits(text);
  const lines = Math.min(LABEL_LINES_MAX, Math.max(1, Math.ceil(units / LABEL_WRAP)));
  const perLine = lines === 1 ? units : Math.min(LABEL_WRAP, units / lines + 0.5);
  return { w: perLine * font, h: lines * font * LABEL_LEADING };
}

/* ================================= layout ================================= */

interface Placed {
  key: string;
  x: number;
  y: number;
  r: number;
  /** Half-width and the extents above/below the disc centre, label included. */
  hw: number;
  up: number;
  down: number;
}

/** Relax the graph into the box: nodes pull along their links, push away from
    each other, and drift toward the centre, cooling over a fixed number of
    passes from a fixed starting spiral. A force layout with the randomness
    taken out — same input, same picture, every time. */
function relax(
  nodes: Placed[],
  edges: TopicEdge[],
  index: Map<string, number>,
  boxW: number,
  boxH: number,
  /** How much more it costs to be off-centre vertically than horizontally —
      the box's own proportions, so the cloud comes out the shape of the space
      it has to live in. A landscape canvas gets a wide graph; a phone gets a
      tall one, instead of a wide one squeezed into a column. */
  vBias: number,
): void {
  const n = nodes.length;
  if (n < 2) return;
  const scale = Math.sqrt((boxW * boxH) / n);
  const cx = boxW / 2;
  const cy = boxH / 2;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);

  for (let pass = 0; pass < PASSES; pass++) {
    const heat = HEAT * (1 - pass / PASSES) ** 1.4 + 0.4;
    dx.fill(0);
    dy.fill(0);

    // push: every pair, falling off with distance
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ux = nodes[i].x - nodes[j].x;
        let uy = (nodes[i].y - nodes[j].y) * vBias;
        let d2 = ux * ux + uy * uy;
        if (d2 < 1e-6) {
          // Exactly coincident (only possible on pass 0 of a degenerate input):
          // nudge along the index difference, which is deterministic.
          ux = (i - j) * 0.01;
          uy = 0.01;
          d2 = ux * ux + uy * uy;
        }
        const d = Math.sqrt(d2);
        const want = nodes[i].hw + nodes[j].hw + PAD;
        const force = (PUSH * scale * scale) / d2 + (d < want ? (want - d) * 0.35 : 0);
        const fx = (ux / d) * force;
        const fy = (uy / d) * force;
        dx[i] += fx;
        dy[i] += fy;
        dx[j] -= fx;
        dy[j] -= fy;
      }
    }

    // pull: along the links, harder for topics that share more talks
    for (const e of edges) {
      const i = index.get(e.a);
      const j = index.get(e.b);
      if (i === undefined || j === undefined) continue;
      const ux = nodes[i].x - nodes[j].x;
      const uy = (nodes[i].y - nodes[j].y) * vBias;
      const d = Math.sqrt(ux * ux + uy * uy) || 1e-3;
      const want = scale * Math.max(LINK_LEN_MIN, LINK_LEN - e.w);
      const force = PULL * (d - want) * (0.35 + e.w);
      const fx = (ux / d) * force;
      const fy = (uy / d) * force;
      dx[i] -= fx;
      dy[i] -= fy;
      dx[j] += fx;
      dy[j] += fy;
    }

    for (let i = 0; i < n; i++) {
      // gravity, so a loosely-tied topic drifts back instead of flying off
      dx[i] += (cx - nodes[i].x) * GRAVITY * scale * 0.1;
      dy[i] += (cy - nodes[i].y) * GRAVITY * scale * 0.1 * vBias;
      const len = Math.hypot(dx[i], dy[i]);
      const step = Math.min(len, heat);
      if (len > 1e-9) {
        nodes[i].x += (dx[i] / len) * step;
        nodes[i].y += (dy[i] / len) * step;
      }
    }
  }
}

/** Push node+label boxes out of each other until nothing overlaps, keeping
    every one of them inside the canvas as it goes. The wall has to be part of
    the same loop: clamping afterwards would shove a node that was pushed off
    the edge straight back into its neighbour, which is exactly the collision
    the pass had just resolved. Moves along the shallower axis, so the shape the
    relaxation found survives. */
function separate(nodes: Placed[], boxW: number, boxH: number): void {
  const n = nodes.length;
  const clamp = (p: Placed) => {
    p.x = Math.min(boxW - p.hw - PAD, Math.max(p.hw + PAD, p.x));
    p.y = Math.min(boxH - p.down - PAD, Math.max(p.up + PAD, p.y));
  };
  for (let pass = 0; pass < SEPARATE_PASSES; pass++) {
    for (const p of nodes) clamp(p);
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const ox = a.hw + b.hw + PAD - Math.abs(a.x - b.x);
        if (ox <= 0) continue;
        const centreA = (a.down - a.up) / 2;
        const centreB = (b.down - b.up) / 2;
        const halfA = (a.up + a.down) / 2;
        const halfB = (b.up + b.down) / 2;
        const oy = halfA + halfB + PAD - Math.abs(a.y + centreA - (b.y + centreB));
        if (oy <= 0) continue;
        moved = true;
        if (ox < oy) {
          const push = (ox / 2) * (a.x <= b.x ? 1 : -1);
          a.x -= push;
          b.x += push;
        } else {
          const push = (oy / 2) * (a.y + centreA <= b.y + centreB ? 1 : -1);
          a.y -= push;
          b.y += push;
        }
      }
    }
    if (!moved) break;
  }
  for (const p of nodes) clamp(p);
}

/** Scale and shift the laid-out graph so it fills the box, labels and all.
    Positions are scaled; radii are not — a disc means a talk count, not a
    fraction of the viewport, so spreading the graph out must not inflate it.
    Runs BEFORE the separation pass: scaling afterwards would squeeze the boxes
    back into each other. */
function fitToBox(nodes: Placed[], boxW: number, boxH: number): void {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of nodes) {
    minX = Math.min(minX, p.x - p.hw);
    maxX = Math.max(maxX, p.x + p.hw);
    minY = Math.min(minY, p.y - p.up);
    maxY = Math.max(maxY, p.y + p.down);
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  // Aim a little under the box: filling it to the millimetre leaves every
  // outer node pinned against a wall, with nowhere to go when the separation
  // pass needs to move it.
  const k = Math.min(FIT_MAX, (boxW * FIT_SLACK) / w, (boxH * FIT_SLACK) / h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  for (const p of nodes) {
    p.x = boxW / 2 + (p.x - cx) * k;
    p.y = boxH / 2 + (p.y - cy) * k;
  }
}

/* ================================= builder ================================ */

/** Build the whole topic map for one conference, lettered in `lang` and laid
    out for a box of `boxW` × `boxH` pixels. Pure; the page memoises it. */
export function buildTopicMap(
  conference: Conference,
  lang: Lang,
  boxW: number,
  boxH: number,
): TopicMapData {
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
  if (keys.length === 0 || boxW <= 0 || boxH <= 0) {
    return {
      nodes: [],
      byKey: new Map(),
      neighbors: new Map(),
      links: [],
      width: boxW,
      height: boxH,
      labelFont: LABEL_FONT,
      coverage,
    };
  }

  // ---- 2. links ----
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

  // Drawn links: every topic's strongest ties first, so no node is left
  // stranded, then the strongest remaining ones up to the cap.
  const drawn = new Map<string, TopicEdge>();
  const idOf = (e: TopicEdge) => `${e.a}${PAIR_SEP}${e.b}`;
  // A phone-sized canvas gets fewer of them: the same eighty lines that read as
  // structure across a desktop are a thicket in a column.
  const perNode = boxW < SMALL_BOX ? LINKS_PER_NODE - 1 : LINKS_PER_NODE;
  for (const key of keys) {
    // A topic's own strongest ties go in whatever their absolute strength is:
    // the strength is cosine-normalised, so two topics that each carry a
    // hundred talks and share ten score LOW — and dropping those would leave
    // the biggest themes in the program floating unconnected.
    for (const e of (neighbors.get(key) ?? []).slice(0, perNode)) {
      if (e.n >= 2) drawn.set(idOf(e), e);
    }
  }
  const cap = Math.round(keys.length * (boxW < SMALL_BOX ? 1.2 : LINKS_MAX_PER_NODE));
  for (const e of edges) {
    if (drawn.size >= cap) break;
    if (e.w >= LINK_MIN_W) drawn.set(idOf(e), e);
  }
  const links = [...drawn.values()].sort(
    (x, y) => y.w - x.w || (x.a + x.b < y.a + y.b ? -1 : 1),
  );

  // ---- 3. placement ----
  const maxCount = counts.get(keys[0]) ?? 1;
  // Radius on a sqrt scale, so the DISC AREA tracks the talk count, with a
  // floor that keeps the rarest topic visible and tappable. The whole scale
  // shrinks with the box, so a phone gets a graph and not a pile.
  const zoom = Math.min(1, Math.max(0.62, Math.sqrt((boxW * boxH) / REF_AREA)));
  const radiusOf = (count: number) =>
    (R_MIN + (R_MAX - R_MIN) * Math.sqrt(count / maxCount)) * zoom;

  const vBias = boxW / boxH;
  const labelFont = boxW < SMALL_BOX ? LABEL_FONT_SMALL : LABEL_FONT;
  const placed: Placed[] = keys.map((key, i) => {
    const r = radiusOf(counts.get(key) ?? 0);
    const box = labelBox(nodeText(topicLabel(key, lang)), labelFont);
    // Start on a spiral, biggest at the middle: a fixed, spread-out opening
    // position, so the relaxation has somewhere sensible to start and nothing
    // it does depends on chance.
    const angle = i * 2.399963;
    const rad = Math.sqrt(i / keys.length) * Math.min(boxW, boxH * vBias) * 0.42;
    return {
      key,
      x: boxW / 2 + Math.cos(angle) * rad,
      y: boxH / 2 + (Math.sin(angle) * rad) / vBias,
      r,
      hw: Math.max(r, box.w / 2),
      up: r,
      down: r + LABEL_GAP + box.h,
    };
  });
  const index = new Map(placed.map((p, i) => [p.key, i]));
  // The layout pulls along the links the reader can SEE, not along every
  // co-occurrence there is: in a program where almost every topic meets almost
  // every other one at least once, attracting on all of them drags the whole
  // vocabulary into one undifferentiated blob. Strong ties only, and the
  // picture matches the lines drawn over it.
  relax(placed, links, index, boxW, boxH, vBias);
  // Spread to the box first, then pull the last collisions apart, then make
  // sure nothing ended up hanging over an edge — and settle once more, since
  // clamping can push two boxes back together.
  fitToBox(placed, boxW, boxH);
  separate(placed, boxW, boxH);

  const nodes: TopicNode[] = placed.map((p) => {
    const key = p.key;
    const label = topicLabel(key, lang);
    const count = counts.get(key) ?? 0;
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
      short: nodeText(label),
      count,
      x: p.x,
      y: p.y,
      r: p.r,
      weight: maxCount > 1 ? (count - 1) / (maxCount - 1) : 1,
      hue: CATEGORY_HUE[topicCategory(key) ?? ""] ?? null,
      talks,
    };
  });

  return {
    nodes,
    byKey: new Map(nodes.map((n) => [n.key, n])),
    neighbors,
    links,
    width: boxW,
    height: boxH,
    labelFont,
    coverage,
  };
}

/** The other end of a link, from one topic's point of view. */
export const otherEnd = (e: TopicEdge, key: string): string => (e.a === key ? e.b : e.a);

/* ================================ memoisation ============================== */

const cache = new Map<string, TopicMapData>();

const cacheKeyFor = (confId: string, lang: Lang, boxW: number, boxH: number) =>
  `${confId}:${lang}:${boxW}x${boxH}`;

/** Has this map already been built? The page shows its loading state only when
    there is real work to do — the first open of a conference — and renders
    straight away on every visit after that. */
export function hasTopicMap(confId: string, lang: Lang, boxW: number, boxH: number): boolean {
  return cache.has(cacheKeyFor(confId, lang, boxW, boxH));
}

/** Memoised per conference id, language and box size — the map is built on
    first open of the topics page and reused for the rest of the session. */
export function topicMapFor(
  confId: string,
  conference: Conference,
  lang: Lang,
  boxW: number,
  boxH: number,
): TopicMapData {
  const key = cacheKeyFor(confId, lang, boxW, boxH);
  const hit = cache.get(key);
  if (hit) return hit;
  const built = buildTopicMap(conference, lang, boxW, boxH);
  cache.set(key, built);
  return built;
}
