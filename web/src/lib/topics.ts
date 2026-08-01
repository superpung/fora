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
// type size its tile can carry, which makes the map language-dependent — hence
// the per-language memo below.
//
// The map is a MOSAIC: one rounded tile per topic, laid out in rank order and
// sized so that AREA IS THE TALK COUNT. That is the whole legend — no colour
// scale to decode, no floating circles to compare by eye, no crossing lines. It
// is the same shape a treemap has in any analytics dashboard, for the same
// reason: it is the densest honest way to show "how much of the program is X",
// and every label sits inside its own rectangle where it stays readable.
//
// Which topics travel together is still in the data — it drives the
// co-occurrence chips and the highlight on the selected topic's relatives — but
// it is no longer drawn as lines across the map, where thirty of them read as
// spaghetti rather than as structure.
//
// Everything here is a pure function of the conference JSON and the box it is
// laid out for. In particular the LAYOUT IS DETERMINISTIC: no randomness, no
// physics, no measurement of the DOM, so the same dataset always produces the
// same mosaic, on every load and on every device. Ties break on the topic key,
// which is unique, so no comparison can end in an arbitrary result.

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
  /** The label as lettered on the tile — trimmed to its first alternative. */
  short: string;
  count: number;
  /** The tile, in `cqw` units: hundredths of the mosaic's own width, for both
      axes. The page is a container query, so one set of numbers scales from a
      phone to a wide screen without re-laying anything out. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Type size for the tile, in the same units. */
  fontSize: number;
  /** Whether the tile has the room to also carry its talk count. */
  showCount: boolean;
  /** 0…1 by talk count — how far up the tile's ink ramp its surface sits. */
  weight: number;
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
  /** Talks the tiles actually stand for: forum talks carrying at least one
      topic. Main-stage keynotes are not on the map (they have no `#talk-N`
      anchor to link at), so they are not counted here either — the page states
      this number as "N talks", and it has to be the same N. */
  tagged: number;
}

export interface TopicMapData {
  /** Ranked by count desc, then key — also the mosaic's reading order and the
      DOM/tab order. */
  nodes: TopicNode[];
  byKey: Map<string, TopicNode>;
  /** Co-occurring topics of a topic, strongest first. */
  neighbors: Map<string, TopicEdge[]>;
  /** Width ÷ height of the box the tiles were laid out for. */
  aspect: number;
  coverage: TopicCoverage;
}

/* ============================== layout tuning ============================== */

/** The mosaic's width in layout units — `cqw`, i.e. hundredths of its own
    rendered width. Its height follows from the aspect it is built for. */
const BOX_W = 100;
/** How a talk count becomes an area: `count ** AREA_GAMMA + WEIGHT_FLOOR`.
    Straight proportion does not survive a real program — ChinaSoft's biggest
    topic carries 145 talks and its smallest one, so at 1:1 the tail would come
    out around 30px square, too small to letter in either language. Damping the
    ratio (and lifting the floor) keeps every topic readable while preserving the
    order and the sense of scale exactly: bigger tile, more talks, always. The
    exact number is printed on the tile whenever it fits, and is always in the
    tile's accessible name. */
const AREA_GAMMA = 0.65;
const WEIGHT_FLOOR = 0.8;
/** No row may come out shorter than this fraction of the box — see the pull
    pass in `stripLayout`. */
const MIN_ROW_FRAC = 0.09;
/** Space between two tiles, in layout units. */
const GAP = 0.55;
/** Type size bounds and the step the fitter walks between them. */
const FS_MAX = 2.6;
const FS_MIN = 1.0;
const FS_STEP = 0.05;
/** Type size a tile asks for before its label is considered: a constant plus a
    share of the tile's linear size, so the mosaic is set in a handful of sizes
    that track how big the topic is. */
const FS_BASE = 0.55;
const FS_SCALE = 0.09;
/** Padding inside a tile, and the leading its label is set on. */
const PAD_X = 0.85;
const PAD_Y = 0.7;
const LINE_HEIGHT = 1.3;
/** Past four lines a tile reads as a paragraph, not a label. Only the
    smallest tiles ever get there: the fitter takes the largest type that fits,
    so a big tile is set on one or two lines long before this matters. */
const LINES_MAX = 4;
/** Room a tile needs, under the label, before it also shows its talk count. */
const COUNT_ROOM = 1.9;
/** Aspect ratios worth laying out for. The page picks one per breakpoint and
    the mosaic is rebuilt for it — a layout squarified for a wide screen turns
    into a stack of slivers when it is poured into a phone-shaped box. */
export const MAP_ASPECTS = { wide: 2.05, mid: 1.35, narrow: 0.82 };

/** Separator for the co-occurrence pair key — no topic key contains a NUL. */
const PAIR_SEP = "\u0000";

/* ================================= labels ================================= */

const isCjk = (ch: string): boolean => /[㐀-鿿豈-﫿]/.test(ch);
/** Rough advance width of a label in font-size units (CJK is full-width). */
const textUnits = (s: string): number =>
  [...s].reduce((w, ch) => w + (isCjk(ch) ? 1 : 0.58), 0);

/** What a tile is lettered with: the label trimmed to its first alternative, so
    存算一体 / CIM and "AI Chip / Accelerator" stay legible at tile size. The
    panel heading and the accessible name still carry the label in full. */
const tileText = (label: string): string => label.split("/")[0].trim();

/** A piece of a label that must not be broken, and whether a space preceded it.
    English breaks between words and after hyphens; CJK, which has neither,
    breaks between any two characters. This is what the browser will do inside
    the tile, so it is what the fitter has to measure. */
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

/** Greedy wrap of `cs` into lines `perLine` units wide, exactly as the tile
    will wrap it. Null when a single unbreakable chunk is wider than the line —
    that size does not fit, and the caller steps down rather than letting the
    browser hyphenate "Reliability" into "Reliabilit / y". */
function wrapCount(cs: Chunk[], perLine: number): number | null {
  let lines = 1;
  let line = 0;
  for (const c of cs) {
    const own = textUnits(c.text);
    if (own > perLine) return null;
    const withSpace = line > 0 && c.space ? own + textUnits(" ") : own;
    if (line > 0 && line + withSpace > perLine) {
      lines += 1;
      line = own;
    } else {
      line += withSpace;
    }
  }
  return lines;
}

/** The largest type the label fits in at, and whether the count fits under it.
    A rectangle wraps text by itself, so this only has to decide the size — but
    it has to decide it on the same budget the browser will use, or a word ends
    up split down the middle. */
function fitLabel(text: string, w: number, h: number): { fontSize: number; showCount: boolean } {
  const availW = Math.max(1, w - PAD_X * 2);
  const availH = Math.max(1, h - PAD_Y * 2);
  const cs = chunks(text);
  // Type is sized by the TILE first and only then trimmed to the label, so two
  // tiles of the same size are lettered the same size — a big tile set small
  // because its topic has a long name reads as a mistake. Rounded onto the step
  // grid so near-identical tiles land on exactly the same size.
  const start = Math.min(
    FS_MAX,
    Math.max(FS_MIN, Math.round((FS_BASE + FS_SCALE * Math.sqrt(w * h)) / FS_STEP) * FS_STEP),
  );
  for (let fs = start; fs >= FS_MIN; fs -= FS_STEP) {
    const lines = wrapCount(cs, availW / fs);
    if (lines === null || lines > LINES_MAX) continue;
    const needed = lines * fs * LINE_HEIGHT;
    if (needed > availH) continue;
    return { fontSize: fs, showCount: availH - needed >= COUNT_ROOM && fs >= 1.15 };
  }
  return { fontSize: FS_MIN, showCount: false };
}

/* ================================= layout ================================= */

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Strip treemap (Bederson/Shneiderman): fill the box with left-to-right rows,
    keeping the items in the order they were given, and close a row as soon as
    adding one more would make its tiles worse-shaped on average. Ordered, so the
    biggest topics stay at the top-left where reading starts, and squarish, so no
    topic is reduced to a sliver.
    `weights` must sum to the box's area; the rows then fill it exactly. */
function stripLayout(weights: number[], boxW: number, boxH: number): Cell[] {
  /** Mean of each tile's longer-side ÷ shorter-side, i.e. how square a row is —
      1 is a row of perfect squares, and lower is always better. */
  const badness = (ws: number[], rowH: number): number => {
    let sum = 0;
    for (const w of ws) {
      const tileW = w / rowH;
      sum += Math.max(tileW / rowH, rowH / tileW);
    }
    return sum / ws.length;
  };

  // ---- rows ----
  const rows: number[][] = [];
  let i = 0;
  while (i < weights.length) {
    const row: number[] = [];
    let rowSum = 0;
    let best = Infinity;
    while (i < weights.length) {
      const trySum = rowSum + weights[i];
      const score = badness([...row, weights[i]], trySum / boxW);
      // The first tile always joins — a row cannot be empty.
      if (row.length > 0 && score > best) break;
      best = score;
      row.push(weights[i]);
      rowSum = trySum;
      i += 1;
    }
    rows.push(row);
  }

  // The tail of a long vocabulary is a run of one-talk topics, and the greedy
  // pass can leave them alone in a row of their own — a band a few pixels tall
  // running the whole width. Any row that comes out shorter than MIN_ROW_H
  // borrows tiles from the row above until it is tall enough. Borrowing moves
  // weight between two adjacent rows and never changes the total, so the mosaic
  // still fills the box exactly.
  const MIN_ROW_H = boxH * MIN_ROW_FRAC;
  const heightOf = (row: number[]) => row.reduce((s, w) => s + w, 0) / boxW;
  for (let guard = 0; guard < weights.length * 4; guard++) {
    let moved = false;
    for (let r = 0; r < rows.length; r++) {
      if (rows.length < 2 || heightOf(rows[r]) >= MIN_ROW_H) continue;
      // The row above gives up its last (smallest) tile; the first row, which
      // has no row above, takes from the one below instead.
      const from = r > 0 ? r - 1 : 1;
      if (rows[from].length <= 1) continue;
      if (from < r) rows[r].unshift(rows[from].pop()!);
      else rows[r].push(rows[from].shift()!);
      moved = true;
    }
    if (!moved) break;
  }

  // ---- cells ----
  const cells: Cell[] = [];
  let y = 0;
  for (const row of rows) {
    const rowH = heightOf(row);
    let x = 0;
    for (const w of row) {
      const tileW = w / rowH;
      cells.push({ x, y, w: tileW, h: rowH });
      x += tileW;
    }
    y += rowH;
  }
  // Floating-point drift over ~40 divisions leaves the last row a hair short of
  // the box; stretch it back so the mosaic has a straight bottom edge.
  if (cells.length > 0) {
    const last = cells[cells.length - 1];
    const drift = boxH - (last.y + last.h);
    if (Math.abs(drift) > 1e-9) for (const c of cells) if (c.y + c.h > boxH - 1e-9) c.h += drift;
  }
  return cells;
}

/** Counts a mid-sized conference tends to produce — used only to shape the
    loading state, so the wait has the same rhythm as the mosaic that replaces
    it instead of being a grid of equal boxes. */
const SKELETON_WEIGHTS = [9, 7, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1];

/** The loading state's tiles, laid out by the same algorithm as the real ones. */
export function skeletonMosaic(aspect: number): Cell[] {
  const boxH = BOX_W / aspect;
  const total = SKELETON_WEIGHTS.reduce((s, w) => s + w, 0);
  const area = BOX_W * boxH;
  return stripLayout(
    SKELETON_WEIGHTS.map((w) => (w / total) * area),
    BOX_W,
    boxH,
  ).map((c) => ({
    x: c.x + GAP / 2,
    y: c.y + GAP / 2,
    w: Math.max(0.5, c.w - GAP),
    h: Math.max(0.5, c.h - GAP),
  }));
}

/* ================================= builder ================================ */

/** Build the whole topic map for one conference, lettered in `lang` and laid out
    for a box of the given width ÷ height. Pure; the page memoises it. */
export function buildTopicMap(conference: Conference, lang: Lang, aspect: number): TopicMapData {
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
    return { nodes: [], byKey: new Map(), neighbors: new Map(), aspect, coverage };
  }

  // ---- 2. the mosaic ----
  const boxH = BOX_W / aspect;
  const raw = keys.map((k) => (counts.get(k) ?? 0) ** AREA_GAMMA + WEIGHT_FLOOR);
  const total = raw.reduce((s, w) => s + w, 0);
  const area = BOX_W * boxH;
  const cells = stripLayout(
    raw.map((w) => (w / total) * area),
    BOX_W,
    boxH,
  );
  const maxCount = counts.get(keys[0]) ?? 1;

  const nodes: TopicNode[] = keys.map((key, i) => {
    const cell = cells[i];
    const label = topicLabel(key, lang);
    const short = tileText(label);
    const talks = (talksByTopic.get(key) ?? []).slice().sort(
      (x, y) =>
        (x.date ?? "").localeCompare(y.date ?? "") ||
        (x.start ?? "").localeCompare(y.start ?? "") ||
        x.forumCode.localeCompare(y.forumCode) ||
        x.index - y.index,
    );
    // The gap is taken out of the cell, so the tile a reader sees is exactly
    // the box that was laid out minus its share of the grout.
    const x = cell.x + GAP / 2;
    const y = cell.y + GAP / 2;
    const w = Math.max(0.5, cell.w - GAP);
    const h = Math.max(0.5, cell.h - GAP);
    const count = counts.get(key) ?? 0;
    return {
      key,
      label,
      short,
      count,
      x,
      y,
      w,
      h,
      ...fitLabel(short, w, h),
      weight: maxCount > 1 ? (count - 1) / (maxCount - 1) : 1,
      talks,
    };
  });

  // ---- 3. co-occurrence ----
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

  return {
    nodes,
    byKey: new Map(nodes.map((n) => [n.key, n])),
    neighbors,
    aspect,
    coverage,
  };
}

/** The other end of a link, from one topic's point of view. */
export const otherEnd = (e: TopicEdge, key: string): string => (e.a === key ? e.b : e.a);

/* ================================ memoisation ============================== */

const cache = new Map<string, TopicMapData>();

const cacheKeyFor = (confId: string, lang: Lang, aspect: number) =>
  `${confId}:${lang}:${aspect}`;

/** Has this map already been built? The page shows its loading state only when
    there is real work to do — the first open of a conference — and renders
    straight away on every visit after that. */
export function hasTopicMap(confId: string, lang: Lang, aspect: number): boolean {
  return cache.has(cacheKeyFor(confId, lang, aspect));
}

/** Memoised per conference id, language and box shape — the map is built on
    first open of the topics page and reused for the rest of the session. */
export function topicMapFor(
  confId: string,
  conference: Conference,
  lang: Lang,
  aspect: number,
): TopicMapData {
  const key = cacheKeyFor(confId, lang, aspect);
  const hit = cache.get(key);
  if (hit) return hit;
  const built = buildTopicMap(conference, lang, aspect);
  cache.set(key, built);
  return built;
}
