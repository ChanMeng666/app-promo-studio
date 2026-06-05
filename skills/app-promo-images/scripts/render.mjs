#!/usr/bin/env node
// render.mjs — HTML/CSS -> raster (primary engine).
// Usage: node render.mjs <promo.config.json> [--target id,id] [--dry]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { loadSpecs, loadThemes, loadJSON, buildJobs } from "./lib/compose.mjs";
import { emit, verify } from "./lib/convert.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(__dirname, "..");
const RENDERER = pathToFileURL(resolve(SKILL_DIR, "templates/html/renderer.html")).href;

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };

function dataUri(path) {
  if (!path) return null;
  const buf = readFileSync(path);
  const mime = MIME[extname(path).toLowerCase()] || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function parseArgs(argv) {
  const args = { _: [], target: null, dry: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry") args.dry = true;
    else if (a === "--target") args.target = argv[++i].split(",").map((s) => s.trim());
    else args._.push(a);
  }
  return args;
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

  console.log(`▶ ${jobs.length} render job(s) → ${outDir}`);
  if (args.dry) {
    for (const j of jobs) console.log(`  · ${j.baseName} ${j.out[0]}x${j.out[1]} (css ${j.css[0]}x${j.css[1]} @${j.scale}x) [${j.formats.join(",")}] frame=${j.slide.frame}`);
    return;
  }

  const browser = await chromium.launch({ channel: "chrome" });
  const contexts = new Map();
  const manifest = [];
  let failures = 0;

  try {
    for (const job of jobs) {
      const key = `${job.css[0]}x${job.css[1]}@${job.scale}`;
      let ctx = contexts.get(key);
      if (!ctx) {
        ctx = await browser.newContext({
          viewport: { width: job.css[0], height: job.css[1] },
          deviceScaleFactor: job.scale,
        });
        contexts.set(key, ctx);
      }
      const page = await ctx.newPage();
      await page.goto(RENDERER, { waitUntil: "load" });

      const slidePayload = {
        ...job.slide,
        screenshotData: dataUri(job.slide.screenshot),
        canvas: { w: job.css[0], h: job.css[1], orientation: job.orientation },
      };
      delete slidePayload.screenshot;

      await page.evaluate((s) => window.__render(s), slidePayload);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(120);

      const raw = await page.screenshot({ clip: { x: 0, y: 0, width: job.css[0], height: job.css[1] }, type: "png", omitBackground: !!(job.slide.transparent && job.allowAlpha) });
      await page.close();

      const flatten = job.slide.theme["--bg-solid"] || "#000000";
      const written = await emit(raw, job, flatten);
      for (const w of written) {
        const v = await verify(w.path, job);
        const ok = v.sizeOk && v.alphaOk && !w.overCap;
        if (!ok) failures++;
        manifest.push({ target: job.targetId, file: w.path, ...v, overCap: w.overCap, ok });
        const flag = ok ? "✓" : "✗";
        console.log(`  ${flag} ${w.path}  ${v.width}x${v.height} ${(v.bytes / 1024).toFixed(0)}KB${v.hasAlpha ? " alpha" : ""}${w.overCap ? " OVER-CAP" : ""}${v.sizeOk ? "" : " SIZE-MISMATCH"}${v.alphaOk ? "" : " ALPHA-NOT-ALLOWED"}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${manifest.filter((m) => m.ok).length}/${manifest.length} outputs OK → ${outDir}`);
  if (failures) {
    console.error(`✗ ${failures} output(s) failed validation`);
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
