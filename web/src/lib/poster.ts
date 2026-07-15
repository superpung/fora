// Offline share-poster renderer. Draws a forum / talk poster onto a <canvas>
// with the 2D API (plus a pure-JS QR encoder) — no network — so it works fully
// offline and produces a crisp PNG the user can save.
//
// The poster has a FIXED WIDTH (1080) and a VARIABLE HEIGHT: a forum poster lists
// every talk and a talk poster carries the full abstract, so the canvas grows to
// fit and the modal scrolls. Layout runs a "dry" measuring pass (advance the
// cursor only) to discover the height, then a "wet" paint pass over the identical
// call sequence, so the two never drift.
//
// The visual language mirrors the app itself (Geist / Vercel): flat white, near
// black type, hairline rules, a monospace face for codes/times/dates, thin line
// icons, and a single restrained blue accent. A QR to the page sits bottom-right.

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
  confName: string; // conference name (top identity)
  confDate: string; // "2025年11月27–30日"
  confLocation?: string | null; // "中国·武汉"
  chip?: string | null; // forum category (forum) / kind (talk) — the pill, left of the code
  code?: string | null; // forum code, monospace, right of the chip
  title: string;
  metaLines: PosterMeta[]; // icon-tagged: date / room / forum …
  accent: string; // brand accent color (read from --accent)
  qrUrl: string; // encoded into the bottom-right QR
  // Forum chairs / talk speakers, shown in full (no cap).
  peopleIcon?: IconKey;
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

const INK = "#0a0a0a"; // headings / names (app --fg is #000)
const SUB = "#565656"; // secondary text (app --fg-secondary)
const MUTE = "#8a8a8a"; // muted (app --fg-muted)
const LINE = "#eaeaea"; // hairline rule (app --border)
const PAD = 92;

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

// A CJK (or CJK-punctuation / fullwidth) code point may break on either side;
// Latin letters/digits clump into words that should stay whole.
function isCjk(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x2e80 && c <= 0x9fff) ||
    (c >= 0x3000 && c <= 0x30ff) ||
    (c >= 0xff00 && c <= 0xffef)
  );
}

// Break a string to fit maxWidth. CJK breaks between any two glyphs; Latin words
// (and URLs) are kept whole unless a single word alone overflows, then it
// hard-breaks by character. Wrap points at spaces don't carry the space down.
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
  return lines.length ? lines : [""];
}

function clampLines(lines: string[], max: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = kept[max - 1].replace(/.$/, "…");
  return kept;
}

/** Wrapped text block. In the dry pass it only advances the cursor. Returns the
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

function hrule(ctx: CanvasRenderingContext2D, dry: boolean, x: number, y: number, w: number): void {
  if (dry) return;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 0.5);
  ctx.lineTo(x + w, y + 0.5);
  ctx.stroke();
}

/** One icon-tagged meta line (icon in the gutter, text wraps with a hanging
    indent). Icon and first text line are vertically centered. */
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
  if (!dry) {
    drawIcon(ctx, icon, x, y + Math.round((lineH - isz) / 2), isz, iconColor);
  }
  return textBlock(ctx, dry, text, tx, y + Math.round((lineH - fs) / 2) - 2, maxW - isz - gap, font(500, fs), color, lineH, 2);
}

/** A bigger section header (icon + label), with extra breathing room below it
    before the section content. Returns the content-start y. */
function sectionHeader(
  ctx: CanvasRenderingContext2D,
  dry: boolean,
  icon: IconKey,
  label: string,
  accent: string,
  x: number,
  y: number,
): number {
  const isz = 30;
  if (!dry) {
    drawIcon(ctx, icon, x, y + 4, isz, accent);
    ctx.fillStyle = INK;
    ctx.font = font(700, 34);
    ctx.fillText(label, x + isz + 14, y);
  }
  return y + 40 + 30; // header height + generous gap to content
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

const QR_SIZE = 188; // px, bottom-right

/** Paint a crisp QR (module squares, not a scaled raster) for `url` into a
    white rounded card with a hairline border, at the given top-left. */
function paintQR(ctx: CanvasRenderingContext2D, url: string, x: number, y: number): void {
  const m = qrMatrix(url, "M");
  const n = m.length;
  const quiet = 3; // modules of quiet zone inside the card
  const cell = QR_SIZE / (n + quiet * 2);
  // card
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, QR_SIZE, QR_SIZE, 14);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, QR_SIZE - 1, QR_SIZE - 1, 14);
  ctx.stroke();
  // modules
  ctx.fillStyle = INK;
  const ox = x + quiet * cell;
  const oy = y + quiet * cell;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.6, cell + 0.6);
    }
  }
}

/** Render (or, when dry, measure) the poster top-to-bottom. Uses a `top` text
    baseline so the cursor math is a straight sum of line heights. Returns the
    total height. Background/top bar are painted by drawPoster once the height is
    known. */
function layout(ctx: CanvasRenderingContext2D, spec: PosterSpec, dry: boolean): number {
  const accent = spec.accent;
  const accentRgb = hexToRgb(accent);
  const x = PAD;
  const maxW = POSTER_W - PAD * 2;
  let y = 104;

  // conference identity
  y = textBlock(ctx, dry, spec.confName, x, y, maxW, font(700, 40), INK, 54, 2);
  y += 16;
  // conference date · location (icon-tagged, on one flowing row when it fits)
  {
    const items: PosterMeta[] = [{ icon: "calendar", text: spec.confDate }];
    if (spec.confLocation) items.push({ icon: "pin", text: spec.confLocation });
    ctx.font = font(500, 27, true);
    const isz = 24;
    const gap = 12;
    const sep = 26; // gap between items
    // measure combined width
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += isz + gap + ctx.measureText(items[i].text).width + (i < items.length - 1 ? sep : 0);
    }
    const lineH = 40;
    if (total <= maxW) {
      let cx = x;
      for (const it of items) {
        if (!dry) drawIcon(ctx, it.icon, cx, y + Math.round((lineH - isz) / 2), isz, MUTE);
        cx += isz + gap;
        if (!dry) {
          ctx.fillStyle = SUB;
          ctx.font = font(500, 27, true);
          ctx.fillText(it.text, cx, y + Math.round((lineH - 27) / 2) - 1);
        }
        cx += ctx.measureText(it.text).width + sep;
      }
      y += lineH;
    } else {
      for (const it of items) y = iconMeta(ctx, dry, it.icon, it.text, x, y, maxW, 27, SUB, MUTE);
    }
  }

  y += 30;
  hrule(ctx, dry, x, y, maxW);
  y += 34;

  // category (or kind) chip + code
  if (spec.chip || spec.code) {
    const chipH = 50;
    let cx = x;
    if (spec.chip) {
      const isz = 24;
      ctx.font = font(600, 26);
      const label = spec.chip;
      const chipW = isz + 12 + ctx.measureText(label).width + 22 + 20;
      if (!dry) {
        ctx.fillStyle = rgba(accentRgb, 0.1);
        roundRect(ctx, cx, y, chipW, chipH, 12);
        ctx.fill();
        drawIcon(ctx, "tag", cx + 20, y + (chipH - isz) / 2, isz, accent);
        ctx.fillStyle = accent;
        ctx.font = font(600, 26);
        ctx.fillText(label, cx + 20 + isz + 12, y + (chipH - 26) / 2);
      }
      cx += chipW + 18;
    }
    if (spec.code) {
      if (!dry) {
        ctx.fillStyle = MUTE;
        ctx.font = font(600, 28, true);
        ctx.fillText(spec.code, cx, y + (chipH - 28) / 2);
      }
    }
    y += chipH + 32;
  }

  // title (hero)
  y = textBlock(ctx, dry, spec.title, x, y, maxW, font(800, 62), INK, 82, 6);
  y += 32;

  // forum/talk meta lines (each icon-tagged, own line)
  for (const m of spec.metaLines) {
    y = iconMeta(ctx, dry, m.icon, m.text, x, y, maxW, 30, SUB, accent) + 12;
  }

  // people (chairs / speakers)
  const people = spec.people ?? [];
  if (people.length > 0) {
    y += 26;
    hrule(ctx, dry, x, y, maxW);
    y += 40;
    y = sectionHeader(ctx, dry, spec.peopleIcon ?? "users", spec.peopleLabel ?? "", accent, x, y);
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      ctx.font = font(650, 36);
      const nameW = ctx.measureText(p.name).width;
      if (!dry) {
        ctx.fillStyle = INK;
        ctx.font = font(650, 36);
        ctx.fillText(p.name, x, y);
      }
      if (p.aff) {
        const affX = x + nameW + 24;
        const affMax = x + maxW - affX;
        ctx.font = font(400, 29);
        if (affMax > 180 && wrapText(ctx, p.aff, affMax).length === 1) {
          if (!dry) {
            ctx.fillStyle = MUTE;
            ctx.font = font(400, 29);
            ctx.fillText(p.aff, affX, y + 6);
          }
          y += 46;
        } else {
          y += 48;
          y = textBlock(ctx, dry, p.aff, x, y, maxW, font(400, 29), MUTE, 40, 2);
        }
      } else {
        y += 46;
      }
      if (i < people.length - 1) y += 30; // generous gap between people
    }
    y += 8;
  }

  // abstract (talk poster) — full text, drives height
  if (spec.abstract) {
    y += 26;
    hrule(ctx, dry, x, y, maxW);
    y += 40;
    y = sectionHeader(ctx, dry, "file", spec.abstractLabel ?? "", accent, x, y);
    y = textBlock(ctx, dry, spec.abstract, x, y, maxW, font(400, 31), "#2b2b2b", 50);
  }

  // talks list (forum poster) — every talk, drives height
  const talks = spec.talks ?? [];
  if (talks.length > 0) {
    y += 26;
    hrule(ctx, dry, x, y, maxW);
    y += 40;
    y = sectionHeader(ctx, dry, "forums", spec.talksLabel ?? "", accent, x, y);
    const numW = 58;
    const tx = x + numW;
    const tW = maxW - numW;
    for (let k = 0; k < talks.length; k++) {
      const t = talks[k];
      const rowTop = y;
      if (!dry) {
        ctx.fillStyle = MUTE;
        ctx.font = font(600, 26, true);
        ctx.fillText(String(t.index).padStart(2, "0"), x, y + 4);
      }
      let ty = textBlock(ctx, dry, t.title, tx, y, tW, font(650, 34), INK, 46, 3);
      if (t.time) {
        ty = textBlock(ctx, dry, t.time, tx, ty + 4, tW, font(500, 25, true), accent, 34, 1);
      }
      if (t.speakers.length > 0) {
        const joined = t.speakers
          .map((s) => (s.aff ? `${s.name}（${s.aff}）` : s.name))
          .join("、");
        ty = textBlock(ctx, dry, joined, tx, ty + 8, tW, font(400, 27), SUB, 38, 3);
      }
      y = Math.max(ty, rowTop + 40);
      if (k < talks.length - 1) {
        y += 26;
        hrule(ctx, dry, x, y, maxW);
        y += 28;
      }
    }
  }

  // footer: QR bottom-right (no URL text, no brand)
  y += 40;
  hrule(ctx, dry, x, y, maxW);
  y += 34;
  const qrX = POSTER_W - PAD - QR_SIZE;
  if (!dry) {
    paintQR(ctx, spec.qrUrl, qrX, y);
    // caption to the left of the QR, vertically centered
    ctx.fillStyle = SUB;
    ctx.font = font(600, 30);
    ctx.fillText("扫码查看", x, y + QR_SIZE / 2 - 30);
    ctx.fillStyle = MUTE;
    ctx.font = font(400, 25);
    ctx.fillText("完整信息 · 可关注 · 分享", x, y + QR_SIZE / 2 + 6);
  }
  y += QR_SIZE;

  return y + PAD;
}

/** Draw the poster onto `canvas` at a device pixel ratio that keeps the pixel
    height under MAX_PX_H, so tall posters stay within a safe canvas memory
    budget while short ones stay crisp. Returns the layout height (CSS px). */
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

  // flat white background + a thin accent top rule (Geist restraint)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, POSTER_W, H);
  ctx.fillStyle = spec.accent;
  ctx.fillRect(0, 0, POSTER_W, 8);

  layout(ctx, spec, false);
  return H;
}
