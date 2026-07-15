// Offline share-poster renderer. Draws a forum / talk poster onto a <canvas>
// with the 2D API — no external library, no network — so it works fully offline
// and produces a crisp PNG the user can save.
//
// The poster has a FIXED WIDTH (1080) but a VARIABLE HEIGHT: a forum poster lists
// every talk (title + speakers + affiliation) and a talk poster carries the full
// abstract, so the canvas grows to fit its content and the modal scrolls. Layout
// runs in two passes over the same call sequence — a "dry" measuring pass that
// only advances the cursor to discover the total height, then a "wet" pass that
// paints — so the two never drift. It always renders light-on-white so a shared
// image reads the same everywhere, regardless of the app's theme.

export interface PosterPerson {
  name: string;
  aff?: string | null;
}

export interface PosterTalk {
  index: number; // 1-based display number
  title: string;
  time?: string | null;
  speakers: PosterPerson[];
}

export interface PosterSpec {
  brand: string; // small eyebrow, e.g. "CCF Chip 2026 · 大会议程"
  confName: string; // conference name
  kindLabel: string; // "论坛" | "报告"
  title: string;
  code?: string | null;
  metaLines: string[]; // date / room / category / period …
  accent: string; // brand accent color (read from --accent)
  footer: string; // share URL
  footerNote?: string; // small right-aligned mark under the rule
  // Forum chairs / talk speakers, shown in full (no cap).
  peopleLabel?: string;
  people?: PosterPerson[];
  // Talk poster: the full abstract (drives the poster height).
  abstractLabel?: string;
  abstract?: string | null;
  // Forum poster: every talk (title + speakers), drives the poster height.
  talksLabel?: string;
  talks?: PosterTalk[];
}

export const POSTER_W = 1080;
// A hard cap on the painted pixel height keeps a very long forum/abstract from
// allocating a multi-hundred-MB canvas (toBlob would fail). The CSS layout height
// is uncapped — this only bounds device pixels via the effective dpr.
const MAX_PX_H = 6000;

const INK = "#10151b";
const SUB = "#414b57";
const MUTE = "#7b8593";
const FAINT = "#aeb6c0";
const LINE = "#e4e9f0";
const PAD = 88;

const FONT = `-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT}`;
}

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6) || "0070f3", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLum([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function mix(a: RGB, b: RGB, t: number): string {
  const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

/** A readable text color to place ON the accent (white on dark accents, ink on
    pale ones like yellow), so the brand chip/badges never wash out. */
function onAccent(accentRgb: RGB): string {
  return relLum(accentRgb) > 0.6 ? INK : "#ffffff";
}

// A CJK (or CJK-punctuation / fullwidth) code point may break on either side;
// Latin letters/digits clump into words that should stay whole.
function isCjk(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x2e80 && c <= 0x9fff) || // CJK radicals … unified ideographs
    (c >= 0x3000 && c <= 0x30ff) || // CJK punctuation + kana
    (c >= 0xff00 && c <= 0xffef) // fullwidth forms
  );
}

// Break a string to fit maxWidth. CJK breaks between any two glyphs; Latin words
// (and URLs) are kept whole unless a single word alone overflows, in which case
// it hard-breaks by character. Wrap points at spaces don't carry the space down.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // tokenize into: single spaces, standalone CJK glyphs, and whole Latin words
  const tokens: string[] = [];
  let word = "";
  for (const ch of text) {
    if (ch === " " || ch === "\t" || ch === "\n") {
      if (word) { tokens.push(word); word = ""; }
      tokens.push(" ");
    } else if (isCjk(ch)) {
      if (word) { tokens.push(word); word = ""; }
      tokens.push(ch);
    } else {
      word += ch;
    }
  }
  if (word) tokens.push(word);

  const lines: string[] = [];
  let line = "";
  const hardBreak = (w: string) => {
    for (const ch of w) {
      if (line && ctx.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
  };
  for (const tk of tokens) {
    if (tk === " ") {
      if (line && ctx.measureText(line + " ").width <= maxWidth) line += " ";
      continue;
    }
    if (ctx.measureText(line + tk).width <= maxWidth) {
      line += tk;
      continue;
    }
    if (line) { lines.push(line.replace(/\s+$/, "")); line = ""; }
    if (ctx.measureText(tk).width > maxWidth) hardBreak(tk);
    else line = tk;
  }
  if (line) lines.push(line.replace(/\s+$/, ""));
  return lines.length ? lines : [""];
}

function clampLines(lines: string[], max: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = kept[max - 1].replace(/.$/, "…");
  return kept;
}

/** Wrapped text block. In the dry pass it only advances the cursor; both passes
    walk the identical wrap so the measured height matches the paint. Returns the
    y just below the block. */
function textBlock(
  ctx: CanvasRenderingContext2D,
  dry: boolean,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fontStr: string,
  color: string,
  lineH: number,
  maxLines?: number,
): number {
  ctx.font = fontStr;
  let lines = wrapText(ctx, text, maxW);
  if (maxLines) lines = clampLines(lines, maxLines);
  if (!dry) {
    ctx.fillStyle = color;
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
  }
  return y + lines.length * lineH;
}

/** Render (or, when dry, measure) the whole poster top-to-bottom. Uses a `top`
    text baseline so the cursor math is a straight sum of line heights. Returns
    the total height. Background/decoration are painted by drawPoster once the
    height is known — this only lays out the content + footer. */
function layout(ctx: CanvasRenderingContext2D, spec: PosterSpec, dry: boolean): number {
  const accent = hexToRgb(spec.accent);
  const ink2 = onAccent(accent);
  const x = PAD;
  const maxW = POSTER_W - PAD * 2;
  let y = 116;

  // eyebrow (brand)
  y = textBlock(ctx, dry, spec.brand, x, y, maxW, font(700, 27), spec.accent, 38, 1);
  y += 8;
  // conference name
  y = textBlock(ctx, dry, spec.confName, x, y, maxW, font(500, 33), SUB, 46, 2);
  y += 34;

  // kind chip + code
  {
    const chipH = 52;
    ctx.font = font(700, 27);
    const label = spec.kindLabel;
    const chipW = ctx.measureText(label).width + 44;
    if (!dry) {
      ctx.fillStyle = spec.accent;
      roundRect(ctx, x, y, chipW, chipH, 12);
      ctx.fill();
      ctx.fillStyle = ink2;
      ctx.fillText(label, x + 22, y + 14);
      if (spec.code) {
        ctx.fillStyle = MUTE;
        ctx.font = font(700, 27);
        ctx.fillText(spec.code, x + chipW + 20, y + 14);
      }
    }
    y += chipH + 34;
  }

  // title (the hero line — wraps freely)
  y = textBlock(ctx, dry, spec.title, x, y, maxW, font(800, 60), INK, 80, 6);
  y += 30;

  // meta lines, each with a small accent bullet
  ctx.font = font(500, 30);
  for (const m of spec.metaLines) {
    const lines = clampLines(wrapText(ctx, m, maxW - 26), 2);
    if (!dry) {
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(x + 5, y + 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SUB;
      ctx.font = font(500, 30);
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x + 26, y + i * 44);
    }
    y += lines.length * 44 + 12;
  }
  y += 22;

  // people panel (chairs / speakers) — all of them
  const people = spec.people ?? [];
  if (people.length > 0) {
    y = divider(ctx, dry, x, y, maxW);
    if (spec.peopleLabel) y = sectionLabel(ctx, dry, spec.peopleLabel, spec.accent, x, y, maxW);
    for (const p of people) {
      ctx.font = font(650, 34);
      const nameW = ctx.measureText(p.name).width;
      if (!dry) {
        ctx.fillStyle = INK;
        ctx.font = font(650, 34);
        ctx.fillText(p.name, x, y + 4);
      }
      if (p.aff) {
        const affX = x + nameW + 22;
        const affMax = x + maxW - affX;
        if (affMax > 160) {
          // affiliation trails the name on the same line when it fits on one line
          ctx.font = font(400, 28);
          const affLines = wrapText(ctx, p.aff, affMax);
          if (affLines.length === 1) {
            if (!dry) {
              ctx.fillStyle = MUTE;
              ctx.font = font(400, 28);
              ctx.fillText(affLines[0], affX, y + 8);
            }
            y += 50;
            continue;
          }
        }
        // otherwise drop the affiliation to its own wrapped line(s)
        y += 46;
        y = textBlock(ctx, dry, p.aff, x, y, maxW, font(400, 28), MUTE, 38, 2);
        y += 14;
      } else {
        y += 50;
      }
    }
    y += 22;
  }

  // talk abstract (talk poster) — full text, drives height
  if (spec.abstract) {
    y = divider(ctx, dry, x, y, maxW);
    if (spec.abstractLabel) y = sectionLabel(ctx, dry, spec.abstractLabel, spec.accent, x, y, maxW);
    y = textBlock(ctx, dry, spec.abstract, x, y, maxW, font(400, 30), "#2b333d", 48);
    y += 30;
  }

  // talks list (forum poster) — every talk, drives height
  const talks = spec.talks ?? [];
  if (talks.length > 0) {
    y = divider(ctx, dry, x, y, maxW);
    if (spec.talksLabel) y = sectionLabel(ctx, dry, spec.talksLabel, spec.accent, x, y, maxW);
    const badge = 46;
    const tx = x + badge + 22;
    const tW = maxW - badge - 22;
    for (let k = 0; k < talks.length; k++) {
      const t = talks[k];
      const rowTop = y;
      // number badge
      if (!dry) {
        ctx.fillStyle = rgba(accent, 0.12);
        roundRect(ctx, x, y, badge, badge, 12);
        ctx.fill();
        ctx.fillStyle = spec.accent;
        ctx.font = font(700, 26);
        const num = String(t.index).padStart(2, "0");
        const nw = ctx.measureText(num).width;
        ctx.fillText(num, x + (badge - nw) / 2, y + 11);
      }
      // title
      const titleBottom = textBlock(ctx, dry, t.title, tx, y, tW, font(650, 33), INK, 44, 3);
      y = titleBottom;
      // time
      if (t.time) {
        y = textBlock(ctx, dry, t.time, tx, y + 4, tW, font(500, 25), spec.accent, 34, 1);
      }
      // speakers, joined compactly: name（aff）、name（aff）
      if (t.speakers.length > 0) {
        const joined = t.speakers
          .map((s) => (s.aff ? `${s.name}（${s.aff}）` : s.name))
          .join("、");
        y = textBlock(ctx, dry, joined, tx, y + 6, tW, font(400, 27), SUB, 38, 3);
      }
      // keep the row at least as tall as its badge, then divider
      y = Math.max(y, rowTop + badge);
      if (k < talks.length - 1) {
        y += 22;
        if (!dry) {
          ctx.strokeStyle = LINE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + maxW, y);
          ctx.stroke();
        }
        y += 24;
      }
    }
    y += 30;
  }

  // footer
  y += 20;
  if (!dry) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + maxW, y);
    ctx.stroke();
  }
  y += 26;
  if (!dry) {
    ctx.font = font(400, 26);
    ctx.fillStyle = MUTE;
    const footer = clampLines(wrapText(ctx, spec.footer, maxW - 220), 1)[0] ?? spec.footer;
    ctx.fillText(footer, x, y);
    if (spec.footerNote) {
      ctx.font = font(600, 26);
      ctx.fillStyle = FAINT;
      const nw = ctx.measureText(spec.footerNote).width;
      ctx.fillText(spec.footerNote, x + maxW - nw, y);
    }
  }
  y += 40;

  return y + PAD;
}

function divider(ctx: CanvasRenderingContext2D, dry: boolean, x: number, y: number, w: number): number {
  if (!dry) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }
  return y + 34;
}

function sectionLabel(
  ctx: CanvasRenderingContext2D,
  dry: boolean,
  label: string,
  accent: string,
  x: number,
  y: number,
  _w: number,
): number {
  if (!dry) {
    ctx.fillStyle = accent;
    roundRect(ctx, x, y + 2, 5, 24, 2.5);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = font(700, 30);
    ctx.fillText(label, x + 18, y);
  }
  return y + 52;
}

/** Draw the poster onto `canvas` at a device pixel ratio that keeps the pixel
    height under MAX_PX_H, so tall (many-talk / long-abstract) posters stay within
    a safe canvas memory budget while short ones stay crisp. */
export function drawPoster(canvas: HTMLCanvasElement, spec: PosterSpec, dpr = 2): number {
  // pass 1: measure on a throwaway ctx to discover the height
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return POSTER_W;
  probe.textBaseline = "top";
  const H = Math.ceil(layout(probe, spec, true));

  const eff = Math.max(1, Math.min(dpr, MAX_PX_H / H));
  canvas.width = Math.round(POSTER_W * eff);
  canvas.height = Math.round(H * eff);
  const ctx = canvas.getContext("2d");
  if (!ctx) return H;
  ctx.scale(eff, eff);
  ctx.textBaseline = "top";

  const accent = hexToRgb(spec.accent);
  // base gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#eef2f8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, POSTER_W, H);
  // soft accent glow, top-right, bleeding off the corner
  const glow1 = ctx.createRadialGradient(POSTER_W - 20, 60, 0, POSTER_W - 20, 60, 460);
  glow1.addColorStop(0, rgba(accent, 0.16));
  glow1.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, POSTER_W, 620);
  // a fainter one near the footer, bottom-left
  const glow2 = ctx.createRadialGradient(20, H - 40, 0, 20, H - 40, 420);
  glow2.addColorStop(0, rgba(accent, 0.1));
  glow2.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = glow2;
  ctx.fillRect(0, Math.max(0, H - 520), POSTER_W, 520);
  // top accent bar
  const bar = ctx.createLinearGradient(0, 0, POSTER_W, 0);
  bar.addColorStop(0, spec.accent);
  bar.addColorStop(1, mix(accent, [255, 255, 255], 0.4));
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, POSTER_W, 14);

  // pass 2: paint
  layout(ctx, spec, false);
  return H;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
