import type { Conference } from "../types";
import type { Lang } from "./i18n-store";
import { topicLabel, topicMapLabel, topicCategory } from "./topic-labels";
import { ownTitle, titleLine } from "./talk-title";

// "Conference at a glance": the topic landscape of one program, built from the
// AI-derived `talk.enrichment.topics` tags (a controlled vocabulary — see
// source/topics.json). AI-DERIVED, so every surface built on this module is
// gated on useAi().enabled and carries a provenance mark.
//
// A topic travels as its vocabulary KEY and is only ever shown through
// `topicLabel()`, so an English reader reads "Compute-in-Memory" where a Chinese
// one reads 存算一体.
//
// The map is a RADIAL SECTOR GRAPH. The figure is divided into one sector per
// FAMILY in the vocabulary (software engineering, systems, AI, security, the
// chip families…); inside a sector a topic sits on a ring, the biggest nearest
// the centre, and its dot's area is the number of talks carrying it. Topics
// that share talks are joined by a chord bowing through the middle.
//
// That geometry is the whole legend, and it is why this shape and not a free
// force-directed cloud: position now MEANS something a reader can state — which
// family, how central — instead of being wherever the forces happened to
// settle. Sectors keep related topics together without needing forty hues,
// rings give the eye a grid to read against, and bundling every chord through
// the centre turns what was a mess of crossing hairlines into one woven shape.
//
// Everything here is a pure function of the conference JSON and the box it is
// laid out for: no randomness, no physics, no measurement of the DOM, so the
// same dataset always produces the same figure. Ties break on the topic key,
// which is unique.

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

/** Which side of its dot a label is set on, so it always reads outward. */
export type LabelSide = "left" | "right" | "top" | "bottom";

export interface TopicNode {
  key: string;
  /** The key as shown to this reader. */
  label: string;
  /** The label as lettered on the map — trimmed to its first alternative. */
  short: string;
  count: number;
  /** The family whose sector the topic sits in (`se`, `systems`, …). */
  family: string;
  /** Centre of the dot, in the pixels of the box this map was built for. */
  x: number;
  y: number;
  /** Dot radius, in the same pixels. */
  r: number;
  side: LabelSide;
  /** Width the label was laid out at, in px — the page sets it as the label's
      own max-width, so what was measured is what is rendered. */
  labelW: number;
  /** 0…1 by talk count — how solid the dot is drawn. */
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

/** One family's slice of the figure, and where its name is set. */
export interface TopicFamily {
  key: string;
  /** Number of topics in the sector — its share of the circle. */
  size: number;
  /** Where the family's name sits, just outside the outermost ring. */
  x: number;
  y: number;
  side: LabelSide;
  /** The divider drawn at the sector's leading edge. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TopicCoverage {
  /** Talks the dots actually stand for: forum talks carrying at least one
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
  /** The chords actually drawn: every topic's strongest ties, plus the
      strongest ties overall, up to a cap. All of them are still in
      `neighbors`. */
  links: TopicEdge[];
  families: TopicFamily[];
  /** Ring guides, as [rx, ry] pairs — the figure is an ellipse on a wide box. */
  rings: [number, number][];
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Type size the labels were laid out at — the page sets it on the canvas, so
      what is measured here is exactly what is rendered. */
  labelFont: number;
  coverage: TopicCoverage;
}

/* ============================== layout tuning ============================== */

/** Dot radius bounds, for a box of REF_AREA; smaller boxes scale down. */
const R_MIN = 4.5;
const R_MAX = 19;
const REF_AREA = 1000 * 620;
/** Label metrics, in px. A phone-sized box gets the smaller of the two. */
const LABEL_FONT = 11.5;
const LABEL_FONT_SMALL = 10.5;
const SMALL_BOX = 520;
const LABEL_LEADING = 1.2;
const LABEL_LINES_MAX = 3;
/** Longest label line before it wraps, in characters-worth of the label font,
    and how far that stretches for a single word that does not fit in it. */
const LABEL_WRAP = 5;
const LABEL_WRAP_MAX = 8.5;
/** Gap between a dot and its label. */
const LABEL_GAP = 6;
/** Room kept outside the outermost ring for the labels that read outward from
    it. The family names do not need a band of their own — they are set out at
    the canvas edge, and the separation pass keeps topics clear of them. */
const OUTER_ROOM = 10;
/** Clear space kept around every dot+label box. */
const PAD = 6;
/** How far in from the canvas edge a family's name is set, the type it is set
    in, and the box the topics keep clear of. Its width is measured from the
    name itself — an eleven-character family in English is not the same object
    as a two-character one in Chinese. */
const FAM_EDGE = 14;
const FAM_FONT = 11;
const FAM_TRACK = 1.1;
const FAM_BOX_H = 16;
/** How far a family name may slide along its edge to clear a topic, and in what
    steps. It marks a whole sector, so a few pixels along the rim change nothing
    about what it points at. */
const FAM_SLIDE_STEP = 8;
const FAM_SLIDE_MAX = 80;
/** The innermost ring, as a fraction of the outer one: the hole in the middle
    that the chords are bundled through. */
const RING_MIN = 0.42;
/** Most rings a sector will use before it starts crowding the outer one. The
    real cap is worked out from the figure's size — see `ringsFor` — because two
    rings closer together than a label is wide would put every label from the
    inner one straight through the dots of the outer one. */
const RINGS_MAX = 6;
/** The smallest hit area a topic gets, whatever its dot's radius: a 9px dot is
    not something anybody can point at, so the button around it is padded out to
    this and the layout keeps that much room clear. */
const HIT_MIN = 11;
/** Gap between two sectors, in radians. */
const SECTOR_GAP = 0.13;
/** Padding inside a sector, as a fraction of its width, so a family's outermost
    topics do not sit on the divider. */
const SECTOR_INSET = 0.13;
/** Arc actually usable for placement, as a fraction of the arc there is: the
    labels are measured at their widest, and a ring filled to the last pixel has
    nowhere to go when the separation pass needs to move something. */
const ARC_SAFETY = 0.66;
/** How many topics a ring will take, innermost first. A ring's arc says how
    many labels fit side by side, but the inner rings are short AND every label
    on them reads outward across the ring gap, where the next ring's topics are
    — so the inside is kept deliberately sparse and the crowd goes outward,
    which is also where a sector has the room. */
const RING_CAP_BASE = 2;
const RING_CAP_STEP = 4;
/** Tangential separation passes after placement, and how much of the radius one
    pass may add to a topic's drift off its ring. */
const SEPARATE_PASSES = 900;
const RAD_STEP = 0.004;
/** The share of one ring gap a topic may drift, when rotating cannot separate
    it from its neighbour. */
const RAD_DRIFT = 0.55;
/** How many chords to draw: each topic's strongest few, then the strongest
    remaining ones until the cap. */
const LINKS_PER_NODE = 2;
const LINKS_MAX_PER_NODE = 1.6;
/** Filling up to the cap stops here: a link this weak says nothing — two topics
    that met once by accident. A topic's own strongest ties are exempt. */
const LINK_MIN_W = 0.12;

/** Order the sectors are laid out in, clockwise from the top. Fixed rather than
    derived, so the same family sits in the same place in every conference and
    two programs can be compared at a glance; a family the vocabulary adds later
    falls in after these, alphabetically. */
const FAMILY_ORDER = [
  "ai",
  "se",
  "systems",
  "ic-design",
  "ic-process",
  "ic-system",
  "security",
  "emerging",
  "meta",
];

/** Separator for the co-occurrence pair key — no topic key contains a NUL. */
const PAIR_SEP = "\u0000";

/* ================================= labels ================================= */

const isCjk = (ch: string): boolean => /[㐀-鿿豈-﫿]/.test(ch);
/** Rough advance width of a label in font-size units. CJK is full-width; Latin
    is not one width but three, and treating it as one is what left "LLM" and
    "EDA" measured narrower than they render — a label whose box is too small
    for it is broken across lines by the browser, mid-word. */
const charUnits = (ch: string): number => {
  if (isCjk(ch)) return 1;
  if (/[A-Z0-9]/.test(ch)) return 0.72;
  if (/[a-z]/.test(ch)) return 0.56;
  if (/[iIljt.,'’\-\s]/.test(ch)) return 0.32;
  return 0.5;
};
const textUnits = (s: string): number => [...s].reduce((w, ch) => w + charUnits(ch), 0);

/** What a dot is lettered with — see topicMapLabel: the label trimmed to its
    first alternative (存算一体 / CIM), or the vocabulary's own short name where
    even that does not fit ("AI for Software Engineering" → AI4SE). The panel
    heading and the accessible name still carry the label in full. */

/** The label's own box: how wide it runs and how tall, at the one size every
    label is set in. The page wraps it on the same budget. */
function labelBox(text: string, font: number): { w: number; h: number } {
  const units = textUnits(text);
  // A word longer than the measure would be snapped in half at whatever letter
  // the line ends on ("Supercond|ucting"), so the measure widens to hold the
  // longest word instead — up to a limit, past which breaking is the lesser
  // evil. Hyphenation is not an answer: it needs dictionaries the browser may
  // not have.
  const longest = Math.min(LABEL_WRAP_MAX, Math.max(...text.split(/\s+/).map(textUnits), 0));
  const measure = Math.max(LABEL_WRAP, longest);
  const lines = Math.min(LABEL_LINES_MAX, Math.max(1, Math.ceil(units / measure)));
  // A label that wraps fills its measure — the browser puts as much on each line
  // as fits, and hyphenates rather than leaving the line short. Averaging the
  // characters over the lines instead would under-measure every wrapped English
  // name by the better part of a centimetre, which is exactly where the last
  // overlaps came from.
  const perLine = lines === 1 ? Math.max(units, longest) : measure;
  // A hair of slack: the estimate is an estimate, and being a pixel short is
  // what breaks a word in half.
  return { w: perLine * font + 3, h: lines * font * LABEL_LEADING };
}

/* ================================= layout ================================= */

interface Placed {
  key: string;
  family: string;
  angle: number;
  ring: number;
  /** Where the topic actually sits, as a fraction of the outer radius. It
      starts on its ring and the separation pass may lift it a little off it —
      see `separate`. */
  rad: number;
  r: number;
  lw: number;
  lh: number;
  side: LabelSide;
  x: number;
  y: number;
}

/** Ring k as a fraction of the outer radius, stretched so that however many
    rings this particular conference needed, the outermost one lands on the edge
    of the figure. Otherwise a program with four rings of topics would draw a
    small disc adrift in the middle of the canvas. */
function ringScale(maxRing: number): (k: number) => number {
  const span = Math.max(1, maxRing);
  return (k) => RING_MIN + (1 - RING_MIN) * (Math.min(k, span) / span);
}

/** Which way a label leans at this angle: sideways wherever there is room to
    the left or right, above or below at the top and bottom of the figure —
    where a sideways label would run straight into its neighbour. */
function sideAt(angle: number): LabelSide {
  const c = Math.cos(angle);
  return Math.abs(c) >= 0.4 ? (c > 0 ? "right" : "left") : Math.sin(angle) > 0 ? "bottom" : "top";
}

/** Half-extents of a dot+label box. A label reads outward, so the box is not
    centred on the dot; treating it as symmetric costs a few pixels of clearance
    and saves a great deal of arithmetic. */
function extents(p: Placed): { hx: number; hy: number } {
  const r = Math.max(p.r, HIT_MIN);
  if (p.side === "left" || p.side === "right") {
    return { hx: r + LABEL_GAP + p.lw, hy: Math.max(r, p.lh / 2) };
  }
  return { hx: Math.max(r, p.lw / 2), hy: r + LABEL_GAP + p.lh };
}

/** Push overlapping dots apart AROUND the figure, never in or out: the ring a
    topic sits on is what says how big it is, so its radius may not drift. */
function separate(
  nodes: Placed[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  frac: (k: number) => number,
  fixed: { x: number; y: number; w: number; side: LabelSide }[],
  /** How far off its ring a topic may drift, as a fraction of the radius. */
  drift: number,
): void {
  const n = nodes.length;
  const project = (p: Placed) => {
    const f = p.rad;
    p.x = cx + rx * f * Math.cos(p.angle);
    p.y = cy + ry * f * Math.sin(p.angle);
    // Only a topic that already letters outward may change which way it leans.
    if (p.side === "left" || p.side === "right") p.side = sideAt(p.angle);
  };
  for (let pass = 0; pass < SEPARATE_PASSES; pass++) {
    let moved = false;
    // The family names are set in stone; a topic that lands on one rotates away.
    for (const p of nodes) {
      const e = extents(p);
      for (const f of fixed) {
        // The name hangs off its anchor in the direction it reads, so its box
        // sits to one side of the point, not around it.
        const fx = f.side === "right" ? f.x + f.w / 2 : f.side === "left" ? f.x - f.w / 2 : f.x;
        const ox = e.hx + f.w / 2 + PAD - Math.abs(p.x - fx);
        if (ox <= 0) continue;
        const fy = f.side === "bottom" ? f.y + FAM_BOX_H / 2 : f.side === "top" ? f.y - FAM_BOX_H / 2 : f.y;
        const oy = e.hy + FAM_BOX_H / 2 + PAD - Math.abs(p.y - fy);
        if (oy <= 0) continue;
        p.angle += (p.y <= f.y ? -1 : 1) * 0.016;
        project(p);
        moved = true;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const ea = extents(a);
        const eb = extents(b);
        const ox = ea.hx + eb.hx + PAD - Math.abs(a.x - b.x);
        if (ox <= 0) continue;
        const oy = ea.hy + eb.hy + PAD - Math.abs(a.y - b.y);
        if (oy <= 0) continue;
        // Overlapping in both axes: rotate them apart, and — when rotating is
        // not enough, which is exactly what a full ring means — let one drift a
        // little off its ring. The drift is capped at a fraction of the ring
        // gap, so a topic still reads as belonging to the ring it was given.
        const step = 0.014 * (1 + Math.min(ox, oy) / 40);
        const dir = a.angle <= b.angle ? 1 : -1;
        a.angle -= step * dir;
        b.angle += step * dir;
        const inner = a.rad <= b.rad ? a : b;
        const outer = inner === a ? b : a;
        // Never past the outermost ring or inside the hole: the figure's own
        // bounds are what the canvas was sized for.
        inner.rad = Math.max(RING_MIN * 0.94, Math.max(frac(inner.ring) - drift, inner.rad - RAD_STEP));
        outer.rad = Math.min(1, Math.min(frac(outer.ring) + drift, outer.rad + RAD_STEP));
        project(a);
        project(b);
        moved = true;
      }
    }
    if (!moved) break;
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
  /** The reader's name for a vocabulary family — the page's translation, passed
      in rather than looked up here, so this module still knows nothing about
      the UI's strings. */
  famName: (key: string) => string,
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
        title: titleLine(talk, "").text || undefined,
        titleTbd: !ownTitle(talk),
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
      families: [],
      rings: [],
      cx: boxW / 2,
      cy: boxH / 2,
      width: boxW,
      height: boxH,
      labelFont: LABEL_FONT,
      coverage,
    };
  }

  // ---- 2. chords ----
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

  const small = boxW < SMALL_BOX;
  const drawn = new Map<string, TopicEdge>();
  const idOf = (e: TopicEdge) => `${e.a}${PAIR_SEP}${e.b}`;
  const perNode = small ? LINKS_PER_NODE - 1 : LINKS_PER_NODE;
  for (const key of keys) {
    // A topic's own strongest ties go in whatever their absolute strength is:
    // the strength is cosine-normalised, so two topics that each carry a
    // hundred talks and share ten score LOW — and dropping those would leave
    // the biggest themes in the program unconnected.
    for (const e of (neighbors.get(key) ?? []).slice(0, perNode)) {
      if (e.n >= 2) drawn.set(idOf(e), e);
    }
  }
  const cap = Math.round(keys.length * (small ? 1.1 : LINKS_MAX_PER_NODE));
  for (const e of edges) {
    if (drawn.size >= cap) break;
    if (e.w >= LINK_MIN_W) drawn.set(idOf(e), e);
  }
  const links = [...drawn.values()].sort(
    (x, y) => y.w - x.w || (x.a + x.b < y.a + y.b ? -1 : 1),
  );

  // ---- 3. sectors ----
  const byFamily = new Map<string, string[]>();
  for (const key of keys) {
    const fam = topicCategory(key) ?? "meta";
    const arr = byFamily.get(fam);
    if (arr) arr.push(key);
    else byFamily.set(fam, [key]);
  }
  const famKeys = [...byFamily.keys()].sort((a, b) => {
    const ia = FAMILY_ORDER.indexOf(a);
    const ib = FAMILY_ORDER.indexOf(b);
    const ra = ia < 0 ? FAMILY_ORDER.length : ia;
    const rb = ib < 0 ? FAMILY_ORDER.length : ib;
    return ra !== rb ? ra - rb : a < b ? -1 : 1;
  });

  const labelFont = small ? LABEL_FONT_SMALL : LABEL_FONT;
  const zoom = Math.min(1, Math.max(0.6, Math.sqrt((boxW * boxH) / REF_AREA)));
  const maxCount = counts.get(keys[0]) ?? 1;
  const radiusOf = (count: number) =>
    (R_MIN + (R_MAX - R_MIN) * Math.sqrt(count / maxCount)) * zoom;

  // The figure is an ellipse: a page is far wider than it is tall, and a circle
  // in a letterbox wastes both ends. Room is kept at the sides for the labels
  // that read outward there, and above and below for the ones that read up and
  // down.
  const maxLabelW = LABEL_WRAP * labelFont;
  const cx = boxW / 2;
  const cy = boxH / 2;
  // Three things have to fit outside the outermost ring: a topic's dot, the
  // label reading outward from it, and beyond that the family's own name.
  const outerX = maxLabelW + R_MAX * zoom + LABEL_GAP + OUTER_ROOM;
  const outerY = labelFont * LABEL_LEADING * 2 + R_MAX * zoom + LABEL_GAP + OUTER_ROOM;
  const rx = Math.max(40, boxW / 2 - outerX);
  const ry = Math.max(40, boxH / 2 - outerY);

  // How many rings the figure can hold with the labels it has to letter: two
  // rings closer together than a label is wide, in the regions where labels
  // read sideways, would drive every inner label through the outer ring's dots.
  const ringGap = labelFont * LABEL_LEADING * 2 + R_MAX * zoom + LABEL_GAP + 10;
  const ringsAllowed = Math.max(
    1,
    Math.min(RINGS_MAX, Math.floor((rx * (1 - RING_MIN)) / ringGap)),
  );

  const total = keys.length;
  const placed: Placed[] = [];
  const sectors: { key: string; size: number; mid: number; divider: number }[] = [];
  let cursor = -Math.PI / 2; // twelve o'clock
  for (const fam of famKeys) {
    const members = byFamily.get(fam)!;
    const span = (Math.PI * 2 * members.length) / total;
    const a0 = cursor + SECTOR_GAP / 2;
    const a1 = cursor + span - SECTOR_GAP / 2;
    const divider = cursor;
    cursor += span;
    const inset = (a1 - a0) * SECTOR_INSET;
    const lo = a0 + inset;
    const hi = a1 - inset;
    const mid = (a0 + a1) / 2;

    // Fill the sector ring by ring from the inside out, taking as many topics
    // per ring as the arc there can letter without labels touching. How much
    // room one topic needs ALONG the ring is a different measurement at the top
    // of the figure (labels stack sideways) than at its sides (they stack
    // vertically), so it is measured per ring.
    let i = 0;
    let ring = 0;
    while (i < members.length) {
      const rest = members.slice(i).map((k) => labelBox(topicMapLabel(k, lang), labelFont));
      const wide = Math.max(...rest.map((b) => b.w)) + PAD * 2;
      const tall = Math.max(...rest.map((b) => b.h)) + PAD * 2;
      // Assume the ring will end up spread over the whole radius: what matters
      // is only how many fit side by side, and the exact radius is settled once
      // every sector has been laid out.
      const guess = RING_MIN + (1 - RING_MIN) * (ring / Math.max(1, ringsAllowed - 1));
      // Arc measured where the sector actually is: on an ellipse the distance
      // one radian buys at the top of the figure is ry, and at the side rx.
      // Averaging the two overfills every sector that is not on a diagonal.
      const localR = Math.hypot(rx * Math.sin(mid), ry * Math.cos(mid));
      const arc = (hi - lo) * localR * guess * ARC_SAFETY;
      const outerSide = sideAt(mid);
      // An inner ring stacks its labels above and below its dots, so it needs a
      // label's WIDTH of arc each; the outermost one letters outward, and there
      // a label's height is what has to fit — see the projection below.
      const room = (need: number) =>
        Math.max(1, Math.min(Math.floor(arc / need) + 1, RING_CAP_BASE + RING_CAP_STEP * ring));
      const capInner = room(wide);
      const capOuter = room(outerSide === "left" || outerSide === "right" ? tall : wide);
      const remaining = members.length - i;
      const last = ring >= ringsAllowed - 1 || remaining <= capOuter;
      const take = last ? remaining : Math.min(capInner, remaining);
      for (let j = 0; j < take; j++) {
        const key = members[i + j];
        const t = take === 1 ? 0.5 : j / (take - 1);
        const a = lo + (hi - lo) * t;
        const box = labelBox(topicMapLabel(key, lang), labelFont);
        placed.push({
          key,
          family: fam,
          angle: a,
          ring,
          r: radiusOf(counts.get(key) ?? 0),
          lw: box.w,
          lh: box.h,
          side: sideAt(a),
          rad: 0,
          x: 0,
          y: 0,
        });
      }
      i += take;
      ring += 1;
    }
    sectors.push({ key: fam, size: members.length, mid, divider });
  }

  // Now that every sector has claimed its rings, stretch them across the whole
  // figure and put every topic where it actually goes.
  //
  // Only the OUTERMOST ring of a sector letters outward. An inner label reading
  // sideways has to cross the gap to the next ring, and that gap is the width of
  // a label — which is what limited the whole figure to one or two rings. Set
  // above or below its dot instead, an inner label needs a fraction of that, so
  // the figure can carry the rings it actually needs.
  const maxRing = placed.reduce((m, p) => Math.max(m, p.ring), 0);
  const outerRingOf = new Map<string, number>();
  for (const p of placed) {
    outerRingOf.set(p.family, Math.max(outerRingOf.get(p.family) ?? 0, p.ring));
  }
  const frac = ringScale(maxRing);
  for (const p of placed) {
    const f = frac(p.ring);
    p.rad = f;
    p.x = cx + rx * f * Math.cos(p.angle);
    p.y = cy + ry * f * Math.sin(p.angle);
    p.side =
      p.ring === outerRingOf.get(p.family)
        ? sideAt(p.angle)
        : Math.sin(p.angle) >= 0
          ? "bottom"
          : "top";
  }

  // A family's name goes where its sector points, out at the edge of the
  // canvas — the corners a round figure cannot use anyway. The separation pass
  // then keeps the topics clear of it.
  const famBoxW = (key: string) =>
    textUnits(famName(key)) * FAM_FONT * FAM_TRACK + 20;
  const famAt = (mid: number, boxWidth: number) => {
    const c = Math.cos(mid);
    const sn = Math.sin(mid);
    const tx = Math.abs(c) < 1e-6 ? Infinity : (boxW / 2 - FAM_EDGE) / Math.abs(c);
    const ty = Math.abs(sn) < 1e-6 ? Infinity : (boxH / 2 - FAM_EDGE) / Math.abs(sn);
    const t = Math.min(tx, ty);
    // The anchor is where the name is hung from, and it reads outward from
    // there — so it has to be pulled back far enough for its own box to stay
    // inside the canvas.
    const side = sideAt(mid);
    let x = cx + c * t;
    let y = cy + sn * t;
    if (side === "right") x = Math.min(x, boxW - FAM_EDGE - boxWidth);
    if (side === "left") x = Math.max(x, FAM_EDGE + boxWidth);
    if (side === "top") y = Math.max(y, FAM_EDGE + FAM_BOX_H);
    if (side === "bottom") y = Math.min(y, boxH - FAM_EDGE - FAM_BOX_H);
    y = Math.min(Math.max(y, FAM_EDGE + FAM_BOX_H / 2), boxH - FAM_EDGE - FAM_BOX_H / 2);
    x = Math.min(Math.max(x, FAM_EDGE), boxW - FAM_EDGE);
    return { x, y };
  };
  const families: TopicFamily[] = sectors.map((sec) => ({
    key: sec.key,
    size: sec.size,
    ...famAt(sec.mid, famBoxW(sec.key)),
    side: sideAt(sec.mid),
    x1: cx + rx * (RING_MIN * 0.5) * Math.cos(sec.divider),
    y1: cy + ry * (RING_MIN * 0.5) * Math.sin(sec.divider),
    x2: cx + rx * 1.02 * Math.cos(sec.divider),
    y2: cy + ry * 1.02 * Math.sin(sec.divider),
  }));

  // Two small sectors next to each other point in nearly the same direction, so
  // their names land on top of one another. Slide them apart along the edge
  // they share.
  for (const side of ["top", "bottom", "left", "right"] as LabelSide[]) {
    const row = families.filter((f) => f.side === side);
    if (row.length < 2) continue;
    const horizontal = side === "top" || side === "bottom";
    row.sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1];
      const cur = row[i];
      const need = horizontal ? (famBoxW(prev.key) + famBoxW(cur.key)) / 2 + 10 : FAM_BOX_H + 6;
      if (horizontal) {
        if (cur.x - prev.x < need) cur.x = prev.x + need;
      } else if (cur.y - prev.y < need) {
        cur.y = prev.y + need;
      }
    }
    // Anything pushed past the far edge comes back, taking its neighbours with
    // it, so a crowded edge stays inside the canvas.
    const last = row[row.length - 1];
    const limit = horizontal ? boxW - FAM_EDGE - famBoxW(last.key) / 2 : boxH - FAM_EDGE - FAM_BOX_H;
    const over = (horizontal ? last.x : last.y) - limit;
    if (over > 0) for (const f of row) if (horizontal) f.x -= over; else f.y -= over;
  }

  separate(
    placed,
    cx,
    cy,
    rx,
    ry,
    frac,
    families.map((f) => ({ x: f.x, y: f.y, w: famBoxW(f.key), side: f.side })),
    ((1 - RING_MIN) / Math.max(1, maxRing)) * RAD_DRIFT,
  );

  // Last, the family names get out of the topics' way. They are the only labels
  // on the figure that mean nothing positionally — sliding one along the edge it
  // is pinned to costs nothing, where moving a topic would move information.
  for (const fam of families) {
    const vertical = fam.side === "left" || fam.side === "right";
    const famBox = () => {
      const w = famBoxW(fam.key);
      const cxx = fam.side === "right" ? fam.x + w / 2 : fam.side === "left" ? fam.x - w / 2 : fam.x;
      const cyy =
        fam.side === "bottom" ? fam.y + FAM_BOX_H / 2
          : fam.side === "top" ? fam.y - FAM_BOX_H / 2
            : fam.y;
      return { x: cxx, y: cyy, hx: w / 2, hy: FAM_BOX_H / 2 };
    };
    const clashes = () => {
      const f = famBox();
      return placed.some((p) => {
        const e = extents(p);
        return (
          Math.abs(p.x - f.x) < e.hx + f.hx + PAD && Math.abs(p.y - f.y) < e.hy + f.hy + PAD
        );
      });
    };
    if (!clashes()) continue;
    const home = vertical ? fam.y : fam.x;
    for (let step = FAM_SLIDE_STEP; step <= FAM_SLIDE_MAX; step += FAM_SLIDE_STEP) {
      let clear = false;
      for (const dir of [-1, 1]) {
        if (vertical) fam.y = home + dir * step;
        else fam.x = home + dir * step;
        if (!clashes()) {
          clear = true;
          break;
        }
      }
      if (clear) break;
      if (vertical) fam.y = home;
      else fam.x = home;
    }
    // Whatever happened, it stays on the canvas.
    fam.x = Math.min(Math.max(fam.x, FAM_EDGE), boxW - FAM_EDGE);
    fam.y = Math.min(Math.max(fam.y, FAM_EDGE + FAM_BOX_H), boxH - FAM_EDGE - FAM_BOX_H);
  }

  const rings: [number, number][] = [...new Set(placed.map((p) => p.ring))]
    .sort((a, b) => a - b)
    .map((k) => [rx * frac(k), ry * frac(k)] as [number, number]);

  const byPlacedKey = new Map(placed.map((p) => [p.key, p]));
  const nodes: TopicNode[] = keys.map((key) => {
    const p = byPlacedKey.get(key)!;
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
      short: topicMapLabel(key, lang),
      count,
      family: p.family,
      x: p.x,
      y: p.y,
      r: p.r,
      side: p.side,
      labelW: p.lw,
      weight: maxCount > 1 ? (count - 1) / (maxCount - 1) : 1,
      talks,
    };
  });

  return {
    nodes,
    byKey: new Map(nodes.map((n) => [n.key, n])),
    neighbors,
    links,
    families,
    rings,
    cx,
    cy,
    width: boxW,
    height: boxH,
    labelFont,
    coverage,
  };
}

/** The other end of a link, from one topic's point of view. */
export const otherEnd = (e: TopicEdge, key: string): string => (e.a === key ? e.b : e.a);

/** The chord between two nodes: a quadratic curve bent toward the centre, so
    every link is bundled through the middle of the figure instead of cutting
    straight across whatever lies between its ends. */
export function chordPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  cx: number,
  cy: number,
): string {
  const qx = cx + ((a.x + b.x) / 2 - cx) * 0.12;
  const qy = cy + ((a.y + b.y) / 2 - cy) * 0.12;
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

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
  famName: (key: string) => string,
): TopicMapData {
  const key = cacheKeyFor(confId, lang, boxW, boxH);
  const hit = cache.get(key);
  if (hit) return hit;
  const built = buildTopicMap(conference, lang, boxW, boxH, famName);
  cache.set(key, built);
  return built;
}
