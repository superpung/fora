// A tiny wrapper around qrcode-generator (pure JS, no transitive deps, runs
// fully offline) that returns a plain boolean matrix — true = dark module — so
// the poster renderer can paint crisp QR squares at exact pixel positions rather
// than scaling a raster. Error-correction level M balances density vs. scan
// robustness; version 0 lets the library pick the smallest fitting version.
import qrcode from "qrcode-generator";

export function qrMatrix(text: string, ec: "L" | "M" | "Q" | "H" = "M"): boolean[][] {
  const qr = qrcode(0, ec);
  qr.addData(text); // default Byte mode; ASCII URLs map 1:1
  qr.make();
  const n = qr.getModuleCount();
  const m: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    m.push(row);
  }
  return m;
}
