// compose.mjs — merge a promo.config.json with the size matrix (specs.json) and
// theme presets (themes.json) into a flat list of render jobs.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, isAbsolute } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = resolve(__dirname, "..");

export function loadJSON(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

export function loadSpecs() {
  return loadJSON(resolve(SCRIPTS_DIR, "specs.json"));
}

export function loadThemes() {
  return loadJSON(resolve(SCRIPTS_DIR, "themes.json"));
}

// Expand bundle names + dedupe, preserving order.
export function resolveTargets(list, specs) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const ids = specs.bundles[item] ? specs.bundles[item] : [item];
    for (const id of ids) {
      if (!specs.targets[id]) {
        throw new Error(`Unknown target/bundle: "${item}" (id "${id}"). See specs.json.`);
      }
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

// Merge a theme preset with the user's brand/accent overrides.
export function resolveTheme(name, themes, app = {}) {
  const base = themes.themes[name] || themes.themes[themes.default];
  if (!base) throw new Error(`Unknown theme "${name}" and no default theme defined.`);
  const t = structuredClone(base);
  if (app.brandColor) {
    t.tokens["--accent"] = app.brandColor;
    if (name === "brand-solid") t.tokens["--bg"] = app.brandColor;
  }
  if (app.accentColor) t.tokens["--highlight"] = app.accentColor;
  return t;
}

// Choose the largest deviceScaleFactor in {preferred,3,2} that makes css integers.
export function pickScale(out, preferred) {
  const candidates = [preferred, 3, 2, 1].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const s of candidates) {
    if (Number.isInteger(out[0] / s) && Number.isInteger(out[1] / s)) {
      return { scale: s, css: [out[0] / s, out[1] / s], exact: true };
    }
  }
  const s = preferred || 2;
  return { scale: s, css: [Math.round(out[0] / s), Math.round(out[1] / s)], exact: false };
}

function abs(p, baseDir) {
  if (!p) return p;
  return isAbsolute(p) ? p : resolve(baseDir, p);
}

// Build the full job list from a loaded config object.
// configDir is used to resolve relative screenshot/outDir paths.
export function buildJobs(config, configDir, { specs, themes }) {
  const targetIds = resolveTargets(config.targets, specs);
  const globalFormats = config.formats;
  const outDir = abs(config.outDir || "./promo-out", configDir);
  const slides = (config.slides || []).map((s, i) => ({ ...s, index: i }));
  if (!slides.length) throw new Error("config.slides is empty — nothing to render.");

  const jobs = [];
  for (const targetId of targetIds) {
    const spec = specs.targets[targetId];
    const { scale, css, exact } = pickScale(spec.out, spec.scale);
    const count = spec.count || 1;
    const used = slides.slice(0, count);
    used.forEach((slide) => {
      const themeName = slide.theme || config.theme || themes.default;
      const theme = resolveTheme(themeName, themes, config.app || {});
      const frame = slide.frame || spec.frame || "phone";
      const formats = slide.formats || globalFormats || spec.formats || ["png"];
      const seq = count > 1 ? String(slide.index + 1).padStart(2, "0") : null;
      const baseName = seq ? `${targetId}-${seq}` : targetId;
      jobs.push({
        targetId,
        group: spec.group,
        label: spec.label,
        out: spec.out,
        css,
        scale,
        exact,
        alpha: spec.alpha !== false ? spec.alpha === true : false,
        allowAlpha: spec.alpha === true,
        maxBytes: spec.maxBytes || null,
        orientation: spec.orientation,
        formats,
        baseName,
        outDir,
        slide: {
          ...slide,
          frame,
          appName: (config.app && config.app.name) || "",
          screenshot: abs(slide.screenshot, configDir),
          theme: theme.tokens,
          themeMeta: { name: themeName, decoration: theme.decoration, fonts: theme.fonts },
        },
      });
    });
  }
  return { jobs, outDir, targetIds };
}
