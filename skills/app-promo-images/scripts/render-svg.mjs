#!/usr/bin/env node
// render-svg.mjs — native SVG vector track. Writes .svg (infinitely scalable)
// and rasterizes to PNG/JPG/WebP/AVIF via @resvg/resvg-js (no browser).
// Usage: node render-svg.mjs <promo.config.json> [--target id,id]
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSpecs, loadThemes, loadJSON, buildJobs } from "./lib/compose.mjs";
import { emit, verify } from "./lib/convert.mjs";
import { slideSVG } from "../templates/svg/slide.svg.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(__dirname, "..");
const FONT_DIR = resolve(SKILL_DIR, "assets/fonts");
const FONTS = ["Inter.ttf", "Fraunces.ttf", "Baloo2.ttf"].map((f) => join(FONT_DIR, f));

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
function dataUri(p) {
  if (!p) return null;
  const buf = readFileSync(p);
  const mime = MIME[extname(p).toLowerCase()] || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function parseArgs(argv) {
  const a = { _: [], target: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--target") a.target = argv[++i].split(",").map((s) => s.trim());
    else a._.push(argv[i]);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv);
  const configPath = resolve(args._[0] || "promo.config.json");
  const config = loadJSON(configPath);
  const configDir = dirname(configPath);
  if (args.target) config.targets = args.target;

  const specs = loadSpecs();
  const themes = loadThemes();
  const { jobs, outDir } = buildJobs(config, configDir, { specs, themes });

  console.log(`▶ SVG: ${jobs.length} job(s) → ${outDir}`);
  const manifest = [];
  let failures = 0;

  for (const job of jobs) {
    const slide = { ...job.slide, screenshotData: dataUri(job.slide.screenshot) };
    const svg = slideSVG(slide, { out: job.out, orientation: job.orientation });

    mkdirSync(job.outDir, { recursive: true });
    const formats = job.formats.map((f) => f.toLowerCase());
    const wantSvg = formats.includes("svg");
    const raster = formats.filter((f) => f !== "svg");

    if (wantSvg) {
      const p = join(job.outDir, `${job.baseName}.svg`);
      writeFileSync(p, svg);
      manifest.push({ target: job.targetId, file: p, vector: true, ok: true });
      console.log(`  ✓ ${p}  (vector)`);
    }

    if (raster.length) {
      const r = new Resvg(svg, {
        fitTo: { mode: "width", value: job.out[0] },
        font: { loadSystemFonts: false, fontFiles: FONTS, defaultFontFamily: "Inter" },
        background: job.allowAlpha === true ? "rgba(0,0,0,0)" : undefined,
      });
      const rawPng = Buffer.from(r.render().asPng());
      const flatten = job.slide.theme["--bg-solid"] || "#000000";
      const written = await emit(rawPng, { ...job, formats: raster }, flatten);
      for (const w of written) {
        const v = await verify(w.path, job);
        const ok = v.sizeOk && v.alphaOk && !w.overCap;
        if (!ok) failures++;
        manifest.push({ target: job.targetId, file: w.path, ...v, ok });
        console.log(`  ${ok ? "✓" : "✗"} ${w.path}  ${v.width}x${v.height} ${(v.bytes / 1024).toFixed(0)}KB${v.sizeOk ? "" : " SIZE-MISMATCH"}${v.alphaOk ? "" : " ALPHA-NOT-ALLOWED"}`);
      }
    }
  }

  console.log(`\n${manifest.filter((m) => m.ok).length}/${manifest.length} outputs OK → ${outDir}`);
  if (failures) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
