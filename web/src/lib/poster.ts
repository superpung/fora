// Offline share-poster renderer. Draws a forum / talk poster onto a <canvas>
// with the 2D API — no external library, no network — so it works fully offline
// and produces a crisp PNG the user can save. The poster is a fixed portrait
// card (1080×1350, phone-share friendly) and is always drawn light-on-white so
// it reads the same wherever it's shared, regardless of the app's theme.

export interface PosterPerson {
  name: string;
  aff?: string | null;
}

export interface PosterSpec {
  brand: string; // small eyebrow, e.g. "CCF Chip 2026 · 大会议程"
  confName: string; // conference name
  kindLabel: string; // "论坛" | "报告"
  title: string;
  code?: string | null;
  metaLines: string[]; // date / room / category / period …
  peopleLabel?: string; // "论坛主席" | "讲者"
  people: PosterPerson[];
  footer: string; // share URL
  accent: string; // brand accent color (read from --accent)
}

export const POSTER_W = 1080;
export const POSTER_H = 1350;

const INK = "#0d1116";
const SUB = "#4a5560";
const MUTE = "#8a94a0";
const LINE = "#e6e9ee";
const PANEL = "#f6f8fa";
const PAD = 96;

const FONT = `-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT}`;
}

// Break a string to fit maxWidth. CJK has no spaces, so we measure and break
// character-by-character; Latin words are kept whole where they fit.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const trial = line + ch;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = ch === " " ? "" : ch;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function clampLines(lines: string[], max: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = kept[max - 1].replace(/.$/, "…");
  return kept;
}

/** Draw the poster onto `canvas`, scaled for the given device pixel ratio so the
    text stays sharp on hi-dpi screens and in the saved PNG. */
export function drawPoster(canvas: HTMLCanvasElement, spec: PosterSpec, dpr = 2): void {
  canvas.width = POSTER_W * dpr;
  canvas.height = POSTER_H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.textBaseline = "alphabetic";

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  // top accent band
  ctx.fillStyle = spec.accent;
  ctx.fillRect(0, 0, POSTER_W, 12);

  const x = PAD;
  const maxW = POSTER_W - PAD * 2;
  let y = 150;

  // eyebrow (brand) + conference name
  ctx.fillStyle = spec.accent;
  ctx.font = font(600, 26);
  ctx.fillText(spec.brand, x, y);
  y += 60;
  ctx.fillStyle = SUB;
  ctx.font = font(500, 34);
  for (const l of clampLines(wrapText(ctx, spec.confName, maxW), 2)) {
    ctx.fillText(l, x, y);
    y += 46;
  }

  y += 26;
  // kind chip
  const chipText = spec.kindLabel;
  ctx.font = font(600, 26);
  const chipW = ctx.measureText(chipText).width + 40;
  const chipH = 46;
  ctx.fillStyle = spec.accent;
  roundRect(ctx, x, y, chipW, chipH, 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(chipText, x + 20, y + 31);
  if (spec.code) {
    ctx.fillStyle = MUTE;
    ctx.font = font(600, 26);
    ctx.fillText(spec.code, x + chipW + 18, y + 31);
  }
  y += chipH + 40;

  // title
  ctx.fillStyle = INK;
  ctx.font = font(700, 60);
  const titleLines = clampLines(wrapText(ctx, spec.title, maxW), 4);
  for (const l of titleLines) {
    ctx.fillText(l, x, y + 52);
    y += 78;
  }
  y += 34;

  // meta lines
  ctx.font = font(500, 30);
  for (const m of spec.metaLines) {
    ctx.fillStyle = SUB;
    for (const l of clampLines(wrapText(ctx, m, maxW), 2)) {
      ctx.fillText(l, x, y + 24);
      y += 46;
    }
    y += 6;
  }

  // people panel
  if (spec.people.length > 0) {
    y += 24;
    const shown = spec.people.slice(0, 6);
    const extra = spec.people.length - shown.length;
    const rowH = 68;
    const panelTop = y;
    const panelH = 40 + (spec.peopleLabel ? 44 : 0) + shown.length * rowH + (extra > 0 ? 44 : 0);
    ctx.fillStyle = PANEL;
    roundRect(ctx, x, panelTop, maxW, panelH, 16);
    ctx.fill();
    // accent tab
    ctx.fillStyle = spec.accent;
    roundRect(ctx, x, panelTop, 6, panelH, 3);
    ctx.fill();

    let py = panelTop + 40;
    const px = x + 40;
    if (spec.peopleLabel) {
      ctx.fillStyle = MUTE;
      ctx.font = font(600, 26);
      ctx.fillText(spec.peopleLabel, px, py + 8);
      py += 44;
    }
    for (const p of shown) {
      ctx.fillStyle = INK;
      ctx.font = font(600, 34);
      const nameW = ctx.measureText(p.name).width;
      ctx.fillText(p.name, px, py + 34);
      if (p.aff) {
        ctx.fillStyle = MUTE;
        ctx.font = font(400, 28);
        const affMax = maxW - 80 - nameW - 20;
        const aff = clampLines(wrapText(ctx, p.aff, Math.max(affMax, 200)), 1)[0] ?? "";
        ctx.fillText(aff, px + nameW + 20, py + 32);
      }
      py += rowH;
    }
    if (extra > 0) {
      ctx.fillStyle = MUTE;
      ctx.font = font(500, 28);
      ctx.fillText(`等 ${spec.people.length} 位`, px, py + 30);
    }
    y = panelTop + panelH;
  }

  // footer
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, POSTER_H - 120);
  ctx.lineTo(POSTER_W - PAD, POSTER_H - 120);
  ctx.stroke();
  ctx.fillStyle = MUTE;
  ctx.font = font(400, 26);
  const footer = clampLines(wrapText(ctx, spec.footer, maxW), 1)[0] ?? spec.footer;
  ctx.fillText(footer, x, POSTER_H - 78);
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
