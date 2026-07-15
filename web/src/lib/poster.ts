// Offline share-poster renderer. Draws a forum / talk poster onto a <canvas>
// with the 2D API (plus a pure-JS QR encoder) — no network — so it works fully
// offline and produces a crisp PNG the user can save.
//
// FIXED WIDTH (1080), VARIABLE HEIGHT: a forum poster lists every talk and a talk
// poster carries the full abstract, so the canvas grows to fit and the modal
// scrolls. Layout runs a "dry" measuring pass (advance the cursor only) to find
// the height, then a "wet" paint pass over the identical call sequence.
//
// Design: an editorial dark masthead (conference identity, white on near-black
// with an accent kicker) over a clean white body. No hairline rules — sections
// are set off by whitespace and an accent underline under each label. A monospace
// face carries codes/times/dates; thin line icons match the app UI; one restrained
// accent. A QR to the page sits bottom-right.

import { qrMatrix } from "./qr";
import { drawIcon, type IconKey } from "./poster-icons";

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

export interface PosterMeta {
  icon: IconKey;
  text: string;
}

export interface PosterSpec {
  confName: string; // conference name (masthead)
  confDate: string; // "2025年11月27–30日"
  confVenue?: string | null; // "武汉国际会议中心"
  confLocation?: string | null; // "中国·武汉"
  chip?: string | null; // forum category (forum) / kind (talk)
  code?: string | null; // forum code, monospace, right of the chip
  title: string;
  metaLines: PosterMeta[]; // icon-tagged: date / room / forum …
  accent: string; // brand accent color (read from --accent)
  qrUrl: string; // encoded into the bottom-right QR
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
const MAX_PX_H = 6000;
const PAD = 92;

const INK = "#111318";
const SUB = "#54606e";
const MUTE = "#8b93a0";
const FAINT = "#c4cad3";

const SANS = `-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
const MONO = `ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace`;

function font(weight: number, size: number, mono = false): string {
  return `${weight} ${size}px ${mono ? MONO : SANS}`;
}

type RGB = [number, number, number];
function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6) || "0070f3", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

function isCjk(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x2e80 && c <= 0x9fff) ||
    (c >= 0x3000 && c <= 0x30ff) ||
    (c >= 0xff00 && c <= 0xffef)
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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
      if (line && ctx.measureText(line + ch).width > maxWidth) { lines.push(line); line = ch; }
      else line += ch;
    }
  };
  for (const tk of tokens) {
    if (tk === " ") {
      if (line && ctx.measureText(line + " ").width <= maxWidth) line += " ";
      continue;
    }
    if (ctx.measureText(line + tk).width <= maxWidth) { line += tk; continue; }
    if (line) { lines.push(line.replace(/\s+$/, "")); line = ""; }
    if (ctx.measureText(tk).width > maxWidth) hardBreak(tk);
    else line = tk;
  }
  if (line) lines.push(line.replace(/\s+$/, ""));
  return applyKinsoku(lines.length ? lines : [""]);
}

// Kinsoku: a closing mark may not begin a line, an opening mark may not end one —
// so a bracket never drops alone to the next line.
const NO_START = "）)]}〉》」』】、。，．·・？！：；’”%〕〗";
const NO_END = "（([{〈《「『【〔〖‘“";
function applyKinsoku(lines: string[]): string[] {
  for (let i = 0; i < lines.length - 1; i++) {
    while (lines[i + 1] && NO_START.includes(lines[i + 1][0])) {
      lines[i] += lines[i + 1][0];
      lines[i + 1] = lines[i + 1].slice(1);
    }
    while (lines[i] && NO_END.includes(lines[i][lines[i].length - 1])) {
      lines[i + 1] = lines[i][lines[i].length - 1] + lines[i + 1];
      lines[i] = lines[i].slice(0, -1);
    }
  }
  return lines.filter((l) => l.length);
}

function clampLines(lines: string[], max: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = kept[max - 1].replace(/.$/, "…");
  return kept;
}

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

/** Mixed-style inline flow: each segment carries its own font/color, tokens wrap
    at CJK glyphs / Latin word boundaries. Used so a talk's speakers read as a
    bold name + a lighter, smaller affiliation (no parentheses) rather than a flat
    joined string. Returns the y below the last line. */
interface Seg {
  text: string;
  font: string;
  color: string;
}
function styledFlow(
  ctx: CanvasRenderingContext2D,
  dry: boolean,
  segs: Seg[],
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  interface Tok { t: string; font: string; color: string; space: boolean }
  const toks: Tok[] = [];
  for (const s of segs) {
    let word = "";
    const flush = () => { if (word) { toks.push({ t: word, font: s.font, color: s.color, space: false }); word = ""; } };
    for (const ch of s.text) {
      if (ch === " " || ch === "\t" || ch === "\n") { flush(); toks.push({ t: " ", font: s.font, color: s.color, space: true }); }
      else if (isCjk(ch)) { flush(); toks.push({ t: ch, font: s.font, color: s.color, space: false }); }
      else word += ch;
    }
    flush();
  }
  const placed: { t: string; font: string; color: string; x: number; y: number }[] = [];
  let lx = x;
  let cy = y;
  for (const tok of toks) {
    ctx.font = tok.font;
    const w = ctx.measureText(tok.t).width;
    if (tok.space) {
      if (lx === x) continue;
      if (lx + w > x + maxW) { lx = x; cy += lineH; continue; }
      lx += w;
      continue;
    }
    if (lx > x && lx + w > x + maxW) { lx = x; cy += lineH; }
    if (w > maxW) {
      for (const ch of tok.t) {
        const cw = ctx.measureText(ch).width;
        if (lx > x && lx + cw > x + maxW) { lx = x; cy += lineH; }
        placed.push({ t: ch, font: tok.font, color: tok.color, x: lx, y: cy });
        lx += cw;
      }
      continue;
    }
    placed.push({ t: tok.t, font: tok.font, color: tok.color, x: lx, y: cy });
    lx += w;
  }
  if (!dry) {
    // Bottom-align mixed sizes on a line: a smaller affiliation drops so its
    // baseline sits with the larger name's, instead of sharing the top edge.
    const sizeOf = (f: string) => {
      const m = f.match(/(\d+)px/);
      return m ? parseInt(m[1], 10) : 0;
    };
    const refSize = placed.reduce((mx, p) => Math.max(mx, sizeOf(p.font)), 0);
    for (const p of placed) {
      ctx.font = p.font;
      ctx.fillStyle = p.color;
      ctx.fillText(p.t, p.x, p.y + (refSize - sizeOf(p.font)) * 0.82);
    }
  }
  return cy + lineH;
}

/** A row of icon-tagged items that flow across the width, wrapping between items.
    Used for the masthead's date / venue / location. Returns the y below. */
function iconFlow(
  ctx: CanvasRenderingContext2D,
  dry: boolean,
  items: PosterMeta[],
  x: number,
  y: number,
  maxW: number,
  fs: number,
  textColor: string,
  iconColor: string,
): number {
  const isz = Math.round(fs * 0.92);
  const igap = 10;
  const sep = 26;
  const lineH = Math.round(fs * 1.5);
  let lx = x;
  let cy = y;
  for (const it of items) {
    ctx.font = font(500, fs, true);
    const tw = ctx.measureText(it.text).width;
    const w = isz + igap + tw;
    if (lx > x && lx + w > x + maxW) { lx = x; cy += lineH; }
    if (!dry) {
      drawIcon(ctx, it.icon, lx, cy + Math.round((lineH - isz) / 2), isz, iconColor);
      ctx.fillStyle = textColor;
      ctx.font = font(500, fs, true);
      ctx.fillText(it.text, lx + isz + igap, cy + Math.round((lineH - fs) / 2) - 1);
    }
    lx += w + sep;
  }
  return cy + lineH;
}

/** One icon-tagged meta line (icon gutter, text wraps with a hanging indent). */
function iconMeta(
  ctx: CanvasRenderingContext2D,
  dry: boolean,
  icon: IconKey,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fs: number,
  color: string,
  iconColor: string,
): number {
  const isz = Math.round(fs * 0.95);
  const gap = 14;
  const tx = x + isz + gap;
  const lineH = Math.round(fs * 1.5);
  if (!dry) drawIcon(ctx, icon, x, y + Math.round((lineH - isz) / 2), isz, iconColor);
  return textBlock(ctx, dry, text, tx, y + Math.round((lineH - fs) / 2) - 2, maxW - isz - gap, font(500, fs), color, lineH, 2);
}

/** A quiet section label — smaller, mid-grey, no accent underline — so it recedes
    behind the content it introduces. Returns the content-start y. */
function sectionLabel(
  ctx: CanvasRenderingContext2D,
  dry: boolean,
  label: string,
  _accent: string,
  x: number,
  y: number,
): number {
  if (!dry) {
    ctx.fillStyle = MUTE;
    ctx.font = font(600, 24);
    ctx.fillText(label, x, y);
  }
  return y + 24 + 24;
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

/** Light masthead (no dark band): an accent kicker + the conference name +
    a date · location line. The venue is not shown here — it moves down to the
    room meta. Measures its lines first, then paints. Returns its height. */
function masthead(ctx: CanvasRenderingContext2D, spec: PosterSpec, dry: boolean): number {
  const x = PAD;
  const maxW = POSTER_W - PAD * 2;
  const topPad = 66;
  const kickerH = 5;

  ctx.font = font(700, 44);
  const nameLines = clampLines(wrapText(ctx, spec.confName, maxW), 2);
  const nameLH = 56;

  const items: PosterMeta[] = [{ icon: "calendar", text: spec.confDate }];
  if (spec.confLocation) items.push({ icon: "pin", text: spec.confLocation });

  const nameTop = topPad + kickerH + 22;
  const metaTop = nameTop + nameLines.length * nameLH + 20;
  const metaBottom = iconFlow(ctx, true, items, x, metaTop, maxW, 27, SUB, MUTE);
  const height = metaBottom + 28;

  if (!dry) {
    ctx.fillStyle = spec.accent;
    roundRect(ctx, x, topPad, 52, kickerH, 2.5);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = font(700, 44);
    for (let i = 0; i < nameLines.length; i++) ctx.fillText(nameLines[i], x, nameTop + i * nameLH);
    iconFlow(ctx, false, items, x, metaTop, maxW, 27, SUB, MUTE);
  }
  return height;
}

const QR_SIZE = 188;
function paintQR(ctx: CanvasRenderingContext2D, url: string, x: number, y: number): void {
  const m = qrMatrix(url, "M");
  const n = m.length;
  const quiet = 3;
  const cell = QR_SIZE / (n + quiet * 2);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, QR_SIZE, QR_SIZE, 14);
  ctx.fill();
  ctx.strokeStyle = "#e7e9ee";
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, QR_SIZE - 1, QR_SIZE - 1, 14);
  ctx.stroke();
  ctx.fillStyle = INK;
  const ox = x + quiet * cell;
  const oy = y + quiet * cell;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.6, cell + 0.6);
    }
  }
}

function layout(ctx: CanvasRenderingContext2D, spec: PosterSpec, dry: boolean): number {
  const accent = spec.accent;
  const accentRgb = hexToRgb(accent);
  const x = PAD;
  const maxW = POSTER_W - PAD * 2;

  let y = masthead(ctx, spec, dry) + 44;

  // category (or kind) chip + code
  if (spec.chip || spec.code) {
    const chipH = 50;
    let cx = x;
    if (spec.chip) {
      const isz = 24;
      ctx.font = font(600, 26);
      const chipW = 20 + isz + 12 + ctx.measureText(spec.chip).width + 22;
      if (!dry) {
        ctx.fillStyle = rgba(accentRgb, 0.1);
        roundRect(ctx, cx, y, chipW, chipH, 12);
        ctx.fill();
        drawIcon(ctx, "tag", cx + 20, y + (chipH - isz) / 2, isz, accent);
        ctx.fillStyle = accent;
        ctx.font = font(600, 26);
        ctx.fillText(spec.chip, cx + 20 + isz + 12, y + (chipH - 26) / 2);
      }
      cx += chipW + 18;
    }
    if (spec.code && !dry) {
      ctx.fillStyle = MUTE;
      ctx.font = font(600, 28, true);
      ctx.fillText(spec.code, cx, y + (chipH - 28) / 2);
    }
    y += chipH + 30;
  }

  // title (hero)
  y = textBlock(ctx, dry, spec.title, x, y, maxW, font(800, 62), INK, 82, 6);
  y += 30;

  // forum/talk meta lines (each icon-tagged, accent icon)
  for (const m of spec.metaLines) {
    y = iconMeta(ctx, dry, m.icon, m.text, x, y, maxW, 30, SUB, accent) + 12;
  }

  // people (chairs / speakers): name (bold) + affiliation (lighter, smaller)
  const people = spec.people ?? [];
  if (people.length > 0) {
    y += 40;
    y = sectionLabel(ctx, dry, spec.peopleLabel ?? "", accent, x, y);
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const segs: Seg[] = [{ text: p.name, font: font(650, 36), color: INK }];
      if (p.aff) segs.push({ text: "  " + p.aff, font: font(400, 29), color: MUTE });
      y = styledFlow(ctx, dry, segs, x, y, maxW, 48);
      if (i < people.length - 1) y += 26;
    }
  }

  // abstract (talk poster) — full text, drives height
  if (spec.abstract) {
    y += 40;
    y = sectionLabel(ctx, dry, spec.abstractLabel ?? "", accent, x, y);
    y = textBlock(ctx, dry, spec.abstract, x, y, maxW, font(400, 31), "#2b2b2b", 50);
  }

  // talks list (forum poster) — every talk, drives height
  const talks = spec.talks ?? [];
  if (talks.length > 0) {
    y += 40;
    y = sectionLabel(ctx, dry, spec.talksLabel ?? "", accent, x, y);
    // Two columns: a fixed left column (number over time) and a right column
    // (title over speakers), so number+time and title+speakers read as a pair.
    const numW = 150;
    const tx = x + numW + 24;
    const tW = maxW - numW - 24;
    for (let k = 0; k < talks.length; k++) {
      const t = talks[k];
      const rowTop = y;
      if (!dry) {
        ctx.fillStyle = accent;
        ctx.font = font(700, 26, true);
        ctx.fillText(String(t.index).padStart(2, "0"), x, rowTop);
        if (t.time) {
          ctx.fillStyle = accent;
          ctx.font = font(500, 25, true);
          ctx.fillText(t.time, x, rowTop + 34);
        }
      }
      let ty = textBlock(ctx, dry, t.title, tx, rowTop, tW, font(650, 34), INK, 46, 3);
      if (t.speakers.length > 0) {
        const segs: Seg[] = [];
        t.speakers.forEach((s, i) => {
          if (i > 0) segs.push({ text: "   ·   ", font: font(400, 26), color: FAINT });
          segs.push({ text: s.name, font: font(600, 28), color: SUB });
          if (s.aff) segs.push({ text: " " + s.aff, font: font(400, 25), color: MUTE });
        });
        ty = styledFlow(ctx, dry, segs, tx, ty + 10, tW, 40);
      }
      const leftBottom = rowTop + (t.time ? 34 + 30 : 30);
      y = Math.max(ty, leftBottom);
      if (k < talks.length - 1) y += 34;
    }
  }

  // footer: QR only, bottom-right (no caption text)
  y += 56;
  const qrX = POSTER_W - PAD - QR_SIZE;
  if (!dry) paintQR(ctx, spec.qrUrl, qrX, y);
  y += QR_SIZE;

  return y + PAD;
}

/** Draw the poster at a device pixel ratio that keeps the pixel height under
    MAX_PX_H (a safe canvas memory budget for tall posters). Returns the layout
    height in CSS px. */
export function drawPoster(canvas: HTMLCanvasElement, spec: PosterSpec, dpr = 2): number {
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
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, POSTER_W, H);
  layout(ctx, spec, false);
  return H;
}
