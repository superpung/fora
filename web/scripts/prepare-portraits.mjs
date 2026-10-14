// Build small, locally hosted portraits from the audited original image cache.
// Keep aspect ratios and record both source and output hashes for reproducibility.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const cache = process.argv[2];
if (!cache) throw new Error("Usage: node scripts/prepare-portraits.mjs <photo-cache>");
const root = new URL("../..", import.meta.url).pathname;
const target = path.join(root, "web/public/portraits/chinasoft2026");
const originals = JSON.parse(await readFile(path.join(cache, "manifest.json"), "utf8"));
await mkdir(target, { recursive: true });
const manifest = {};
for (const [url, source] of Object.entries(originals).sort(([a], [b]) => a.localeCompare(b))) {
  if (source.status !== 200) throw new Error(`Source portrait unavailable: ${url} (${source.status})`);
  const original = await readFile(path.join(cache, source.file));
  if (createHash("sha256").update(original).digest("hex") !== source.sha256) {
    throw new Error(`Source portrait hash mismatch: ${url}`);
  }
  const { data, info } = await sharp(original).rotate()
    .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const sha256 = createHash("sha256").update(data).digest("hex");
  const filename = `${sha256.slice(0, 20)}.webp`;
  await writeFile(path.join(target, filename), data);
  manifest[url] = {
    local_path: `/portraits/chinasoft2026/${filename}`,
    source_sha256: source.sha256, sha256, bytes: data.length,
    width: info.width, height: info.height,
  };
}
await writeFile(path.join(root, "source/chinasoft2026/raw/portraits.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Prepared ${Object.keys(manifest).length} source portraits`);
