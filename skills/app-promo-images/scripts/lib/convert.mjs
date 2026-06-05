// convert.mjs — take a raw rendered PNG buffer and emit the requested formats at the
// EXACT target size, flattening alpha where the platform forbids transparency.
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const EXT = { png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp", avif: "avif" };

function applyFormat(pipe, fmt, quality) {
  switch (fmt) {
    case "png": return pipe.png({ compressionLevel: 9 });
    case "jpg":
    case "jpeg": return pipe.jpeg({ quality: quality ?? 90, mozjpeg: true });
    case "webp": return pipe.webp({ quality: quality ?? 88 });
    case "avif": return pipe.avif({ quality: quality ?? 55 });
    default: throw new Error(`Unsupported format: ${fmt}`);
  }
}

// Write all requested formats for one job. Returns [{ path, format, bytes }].
export async function emit(rawPng, job, flattenColor) {
  mkdirSync(job.outDir, { recursive: true });
  const [w, h] = job.out;
  const results = [];

  for (const rawFmt of job.formats) {
    const fmt = rawFmt.toLowerCase();
    if (!EXT[fmt]) throw new Error(`Unknown format "${rawFmt}" for ${job.baseName}`);
    const noAlpha = job.allowAlpha !== true; // only icon/hero keep alpha

    let q = fmt === "jpg" || fmt === "jpeg" ? 90 : fmt === "webp" ? 88 : 55;
    let outPath = join(job.outDir, `${job.baseName}.${fmt === "jpeg" ? "jpg" : fmt}`);

    // Quality backoff loop to respect maxBytes (lossy formats only).
    for (let attempt = 0; attempt < 6; attempt++) {
      let pipe = sharp(rawPng).resize(w, h, { fit: "fill" });
      if (noAlpha) pipe = pipe.flatten({ background: flattenColor || "#000000" });
      const buf = await applyFormat(pipe, fmt, q).toBuffer();
      const { writeFileSync } = await import("node:fs");
      writeFileSync(outPath, buf);
      const bytes = buf.length;
      const overCap = job.maxBytes && bytes > job.maxBytes;
      const lossy = fmt === "jpg" || fmt === "jpeg" || fmt === "webp" || fmt === "avif";
      if (overCap && lossy && q > 35) { q -= 12; continue; }
      results.push({ path: outPath, format: fmt, bytes, overCap: !!overCap });
      break;
    }
  }
  return results;
}

// Verify an output file is exactly the target size and has the expected alpha state.
export async function verify(path, job) {
  const meta = await sharp(path).metadata();
  const [w, h] = job.out;
  const sizeOk = meta.width === w && meta.height === h;
  const alphaOk = job.allowAlpha === true ? true : !meta.hasAlpha;
  const bytes = statSync(path).size;
  return { sizeOk, alphaOk, width: meta.width, height: meta.height, hasAlpha: !!meta.hasAlpha, bytes };
}

export { dirname };
