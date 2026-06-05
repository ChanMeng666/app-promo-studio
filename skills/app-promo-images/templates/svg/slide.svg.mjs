// slide.svg.mjs — build a native (vector) SVG for one slide/target.
// No <foreignObject>, so the output is valid vector everywhere and rasterizes
// crisply via @resvg/resvg-js. Text is wrapped manually into <tspan> lines.

const xml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

// Greedy word-wrap by estimated glyph advance (~0.54em average).
function wrap(text, fontPx, maxWidth) {
  if (!text) return [];
  const adv = fontPx * 0.54;
  const maxChars = Math.max(6, Math.floor(maxWidth / adv));
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (t.length > maxChars && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function tspans(lines, x, startY, lineH, attrs = "") {
  return lines.map((l, i) =>
    `<tspan x="${x.toFixed(1)}" y="${(startY + i * lineH).toFixed(1)}" ${attrs}>${xml(l)}</tspan>`
  ).join("");
}

function defaultLayout(slide, orientation) {
  if (slide.layout) return slide.layout;
  if (slide.frame === "mac" || slide.frame === "browser") return "side-by-side";
  if (slide.frame === "none") return "showcase";
  if (orientation === "landscape") return "side-by-side";
  if (orientation === "square") return "showcase";
  return "headline-top";
}

function gradientDef(bg) {
  // Recognise our radial purple token, else fall back to a vertical 2-stop or solid.
  if (/radial-gradient/.test(bg)) {
    return { def: `<radialGradient id="bg" cx="50%" cy="0%" r="120%"><stop offset="0" stop-color="#8b5cf6"/><stop offset="0.38" stop-color="#6d28d9"/><stop offset="1" stop-color="#3b1380"/></radialGradient>`, fill: "url(#bg)" };
  }
  const m = bg.match(/linear-gradient\([^,]+,\s*([^ ]+)[^,]*,\s*([^ )]+)/);
  if (m) {
    return { def: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[2]}"/></linearGradient>`, fill: "url(#bg)" };
  }
  return { def: "", fill: bg };
}

function sparkle(cx, cy, r, fill, op) {
  const p = `M${cx} ${cy - r} C${cx + r * 0.08} ${cy - r * 0.24} ${cx + r * 0.24} ${cy - r * 0.08} ${cx + r} ${cy} C${cx + r * 0.24} ${cy + r * 0.08} ${cx + r * 0.08} ${cy + r * 0.24} ${cx} ${cy + r} C${cx - r * 0.08} ${cy + r * 0.24} ${cx - r * 0.24} ${cy + r * 0.08} ${cx - r} ${cy} C${cx - r * 0.24} ${cy - r * 0.08} ${cx - r * 0.08} ${cy - r * 0.24} ${cx} ${cy - r}Z`;
  return `<path d="${p}" fill="${fill}" opacity="${op}"/>`;
}

function decoSVG(kind, W, H, t) {
  if (kind === "sparkles") {
    const c = t["--deco"] || "#c4b5fd";
    return [
      sparkle(W * 0.88, H * 0.10, Math.min(W, H) * 0.05, c, 0.9),
      sparkle(W * 0.10, H * 0.32, Math.min(W, H) * 0.03, c, 0.7),
      sparkle(W * 0.85, H * 0.80, Math.min(W, H) * 0.035, c, 0.8),
      sparkle(W * 0.18, H * 0.86, Math.min(W, H) * 0.025, c, 0.6),
    ].join("");
  }
  if (kind === "blobs") {
    const a = t["--accent"] || "#ff4500", h = t["--highlight"] || "#ffd400";
    return `<g filter="url(#soft)"><circle cx="${W * 0.92}" cy="${H * 0.08}" r="${Math.min(W, H) * 0.22}" fill="${a}" opacity="0.5"/><circle cx="${W * 0.06}" cy="${H * 0.9}" r="${Math.min(W, H) * 0.18}" fill="${h}" opacity="0.4"/></g>`;
  }
  return "";
}

// --- device frames (vector) -------------------------------------------------
function clip(id, x, y, w, h, r) {
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>`;
}
function shot(href, x, y, w, h, clipId) {
  if (!href) return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#222" clip-path="url(#${clipId})"/>`;
  return `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${clipId})"/>`;
}

// Returns { defs, body } drawing a device of given box; auto-sizes by frame.
function deviceSVG(frame, box, slide, t, idp) {
  const { x, y, w, h } = box;
  const bezel = t["--bezel"] || "#0b0b14";
  const screenBg = t["--screen-bg"] || "#15101f";
  const href = slide.screenshotData || null;

  if (frame === "mac" || frame === "browser") {
    const r = w * 0.018, bar = w * 0.05;
    const sx = x, sy = y + bar, sw = w, sh = h - bar;
    const dots = [["#ff5f57", x + bar * 0.5], ["#febc2e", x + bar * 0.95], ["#28c840", x + bar * 1.4]]
      .map(([c, cx]) => `<circle cx="${cx.toFixed(1)}" cy="${(y + bar / 2).toFixed(1)}" r="${(bar * 0.16).toFixed(1)}" fill="${c}"/>`).join("");
    const label = frame === "browser"
      ? `<rect x="${x + bar * 2}" y="${y + bar * 0.28}" width="${w * 0.5}" height="${bar * 0.44}" rx="${bar * 0.22}" fill="rgba(0,0,0,0.28)"/><text x="${x + bar * 2.4}" y="${y + bar * 0.62}" font-family="${t._fontBody}" font-size="${bar * 0.34}" fill="${t["--fg"]}" opacity="0.8">${xml(slide.appName || "app")}</text>`
      : `<text x="${x + w / 2}" y="${y + bar * 0.62}" text-anchor="middle" font-family="${t._fontBody}" font-size="${bar * 0.34}" fill="${t["--fg"]}" opacity="0.7">${xml(slide.appName || "")}</text>`;
    return {
      defs: clip(idp, sx, sy, sw, sh, 0),
      body: `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${screenBg}"/><rect x="${x}" y="${y}" width="${w}" height="${bar}" fill="rgba(255,255,255,0.10)"/>${dots}${label}${shot(href, sx, sy, sw, sh, idp)}</g>`,
    };
  }

  if (frame === "none") {
    const r = w * 0.06;
    return { defs: clip(idp, x, y, w, h, r), body: `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${screenBg}"/>${shot(href, x, y, w, h, idp)}</g>` };
  }

  // phone / tablet: aspect-locked, height-driven inside box
  const ratio = frame === "tablet" ? 1668 / 2388 : 1170 / 2532;
  let dh = h, dw = dh * ratio;
  if (dw > w) { dw = w; dh = dw / ratio; }
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  const pad = dw * (frame === "tablet" ? 0.03 : 0.028);
  const rOuter = dw * (frame === "tablet" ? 0.05 : 0.11);
  const sx = dx + pad, sy = dy + pad, sw = dw - pad * 2, sh = dh - pad * 2;
  const rIn = rOuter - pad;
  const island = frame === "tablet" ? "" :
    `<rect x="${dx + dw / 2 - dw * 0.10}" y="${dy + pad + dh * 0.012}" width="${dw * 0.20}" height="${dw * 0.055}" rx="${dw * 0.03}" fill="#000"/>`;
  return {
    defs: clip(idp, sx, sy, sw, sh, rIn),
    body: `<g><rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="${rOuter}" fill="${bezel}"/><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${rIn}" fill="${screenBg}"/>${shot(href, sx, sy, sw, sh, idp)}${island}</g>`,
  };
}

// --- main -------------------------------------------------------------------
export function slideSVG(slide, target) {
  const [W, H] = target.out;
  const t = { ...slide.theme };
  const fonts = (slide.themeMeta && slide.themeMeta.fonts) || {};
  t._fontHead = fonts.headline || "Inter";
  t._fontHi = fonts.highlight || "Fraunces";
  t._fontBody = fonts.body || "Inter";
  const base = Math.min(W, H) / 100;
  const orientation = target.orientation;
  const layout = defaultLayout(slide, orientation);
  const fg = t["--fg"] || "#fff", muted = t["--muted"] || "#ddd", hi = t["--highlight"] || "#eee";
  const { def: bgDef, fill: bgFill } = gradientDef(t["--bg"] || t["--bg-solid"] || "#4c1d95");
  const idp = "scr";

  let copy = "", device = "", deviceDefs = "";

  if (layout === "side-by-side") {
    const padX = W * 0.06;
    const colW = W * 0.40;
    const hSize = Math.min(W, H) * 0.085;
    const hiSize = hSize * 1.02;
    const subSize = Math.min(W, H) * 0.034;
    let cy = H * 0.30;
    const headLines = wrap(slide.headline, hSize, colW);
    copy += `<text font-family="${t._fontHead}" font-weight="800" font-size="${hSize}" fill="${fg}" letter-spacing="-0.02em">${tspans(headLines, padX, cy, hSize * 1.0)}</text>`;
    cy += headLines.length * hSize * 1.0 + hSize * 0.1;
    if (slide.highlight) { copy += `<text x="${padX}" y="${cy + hiSize * 0.8}" font-family="${t._fontHi}" font-style="italic" font-size="${hiSize}" fill="${hi}">${xml(slide.highlight)}</text>`; cy += hiSize * 1.1; }
    if (slide.subheadline) { const sl = wrap(slide.subheadline, subSize, colW); cy += subSize * 0.8; copy += `<text font-family="${t._fontBody}" font-size="${subSize}" fill="${muted}">${tspans(sl, padX, cy, subSize * 1.3)}</text>`; cy += sl.length * subSize * 1.3; }
    if (slide.badge) copy += badge(slide.badge, padX, cy + subSize, base, t);
    const box = { x: W * 0.46, y: H * 0.12, w: W * 0.48, h: H * 0.76 };
    const d = deviceSVG(slide.frame, box, slide, t, idp); device = d.body; deviceDefs = d.defs;

  } else if (layout === "showcase") {
    const hSize = Math.min(W, H) * 0.09;
    const headLines = wrap(slide.headline, hSize, W * 0.86);
    let cy = H * 0.14;
    copy += `<text text-anchor="middle" font-family="${t._fontHead}" font-weight="800" font-size="${hSize}" fill="${fg}">${tspans(headLines, W / 2, cy, hSize)}</text>`;
    cy += headLines.length * hSize;
    if (slide.highlight) { copy += `<text x="${W / 2}" y="${cy + hSize * 0.8}" text-anchor="middle" font-family="${t._fontHi}" font-style="italic" font-size="${hSize}" fill="${hi}">${xml(slide.highlight)}</text>`; cy += hSize; }
    const box = { x: W * 0.18, y: cy + H * 0.04, w: W * 0.64, h: H * 0.6 };
    const d = deviceSVG(slide.frame, box, slide, t, idp); device = d.body; deviceDefs = d.defs;

  } else { // headline-top
    const padX = W * 0.07;
    const hSize = Math.min(W, H) * 0.082;
    const headLines = wrap(slide.headline, hSize, W - padX * 2);
    let cy = H * 0.07;
    copy += `<text text-anchor="middle" font-family="${t._fontHead}" font-weight="800" font-size="${hSize}" fill="${fg}" letter-spacing="-0.02em">${tspans(headLines, W / 2, cy + hSize * 0.8, hSize)}</text>`;
    cy += hSize * 0.8 + headLines.length * hSize;
    if (slide.highlight) { copy += `<text x="${W / 2}" y="${cy + hSize * 0.8}" text-anchor="middle" font-family="${t._fontHi}" font-style="italic" font-size="${hSize * 1.02}" fill="${hi}">${xml(slide.highlight)}</text>`; cy += hSize * 1.1; }
    const subSize = Math.min(W, H) * 0.032;
    if (slide.subheadline) { const sl = wrap(slide.subheadline, subSize, W * 0.8); cy += subSize * 1.1; copy += `<text text-anchor="middle" font-family="${t._fontBody}" font-size="${subSize}" fill="${muted}">${tspans(sl, W / 2, cy, subSize * 1.3)}</text>`; cy += sl.length * subSize * 1.3; }
    if (slide.badge) copy += badge(slide.badge, W / 2, cy + subSize * 1.2, base, t, true);
    const box = { x: W * 0.08, y: cy + H * 0.05, w: W * 0.84, h: H - (cy + H * 0.05) + H * 0.05 };
    const d = deviceSVG(slide.frame, box, slide, t, idp); device = d.body; deviceDefs = d.defs;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${bgDef}<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${base * 2}"/></filter>${deviceDefs}</defs>
${slide.transparent ? "" : `<rect width="${W}" height="${H}" fill="${bgFill}"/>`}
${decoSVG((slide.themeMeta && slide.themeMeta.decoration) || "none", W, H, t)}
${device}
${copy}
</svg>`;
}

function badge(text, x, y, base, t, center) {
  const fs = base * 2.5, padX = fs * 0.7, padY = fs * 0.45;
  const w = text.length * fs * 0.6 + padX * 2, h = fs + padY * 2;
  const bx = center ? x - w / 2 : x;
  return `<g><rect x="${bx}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${t["--badge-bg"] || "#fff"}"/><text x="${bx + w / 2}" y="${y + h / 2 + fs * 0.34}" text-anchor="middle" font-family="${t._fontBody}" font-weight="700" font-size="${fs}" fill="${t["--badge-fg"] || "#000"}">${xml(text)}</text></g>`;
}
