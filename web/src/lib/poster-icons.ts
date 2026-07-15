// Canvas renditions of the app's line-icon set (Icon.tsx): a 24-unit grid, 1.5
// stroke, round caps/joins, currentColor — so the posters carry the same thin
// Geist/feather glyphs as the web UI. Only the glyphs the poster uses are here;
// add more as needed. drawIcon strokes into a `size`×`size` box at top-left (x,y).

export type IconKey =
  | "calendar"
  | "pin"
  | "clock"
  | "tag"
  | "building"
  | "users"
  | "forums"
  | "file";

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function path(ctx: CanvasRenderingContext2D, d: string): void {
  ctx.stroke(new Path2D(d));
}

const GLYPHS: Record<IconKey, (ctx: CanvasRenderingContext2D) => void> = {
  calendar: (ctx) => {
    rr(ctx, 3.5, 4.5, 17, 16, 2);
    line(ctx, 3.5, 9, 20.5, 9);
    line(ctx, 8, 2.5, 8, 6.5);
    line(ctx, 16, 2.5, 16, 6.5);
  },
  pin: (ctx) => {
    path(ctx, "M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z");
    circle(ctx, 12, 10, 2.5);
  },
  clock: (ctx) => {
    circle(ctx, 12, 12, 8.5);
    path(ctx, "M12 7v5l3.5 2");
  },
  tag: (ctx) => {
    path(
      ctx,
      "M3.5 11.3V5a1.5 1.5 0 0 1 1.5-1.5h6.3a2 2 0 0 1 1.4.6l7 7a1.8 1.8 0 0 1 0 2.5l-5.9 5.9a1.8 1.8 0 0 1-2.5 0l-7-7a2 2 0 0 1-.6-1.4z",
    );
    circle(ctx, 7.75, 7.75, 1.25);
  },
  building: (ctx) => {
    path(ctx, "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16");
    path(ctx, "M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19");
    path(ctx, "M7.5 8h3M7.5 12h3M7.5 16h3");
  },
  users: (ctx) => {
    circle(ctx, 8.5, 8, 3.2);
    path(ctx, "M2.5 20a6 6 0 0 1 12 0");
    path(ctx, "M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17 14.4a6 6 0 0 1 4.5 5.6");
  },
  forums: (ctx) => {
    rr(ctx, 3, 3, 7, 7, 1);
    rr(ctx, 14, 3, 7, 7, 1);
    rr(ctx, 3, 14, 7, 7, 1);
    rr(ctx, 14, 14, 7, 7, 1);
  },
  file: (ctx) => {
    path(ctx, "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z");
    path(ctx, "M14 3v5h5M8.5 13h7M8.5 17h7");
  },
};

/** Stroke `name` into a size×size box whose top-left is (x, y), in `color`. */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconKey,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  GLYPHS[name](ctx);
  ctx.restore();
}
