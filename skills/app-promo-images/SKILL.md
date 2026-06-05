---
name: app-promo-images
description: Generate cross-platform app promotional / marketing images (App Store & Google Play screenshots, iPad, Mac, desktop window, web landing hero, and social/Open-Graph cards) from the user's own app screenshots plus a few headlines and brand colors. Use when the user wants to create app store screenshots, promo graphics, marketing images, launch visuals, OG/social cards, or "宣传图" for an app — and wants exact platform sizes exported as PNG/JPG/WebP/AVIF and/or true vector SVG. Renders designed templates with a real browser (Playwright) and rasterizes vectors with resvg.
---

# App Promo Images

Turn `app screenshots + headlines + brand colors` into a full, correctly-sized set of promotional images for every platform. Two render engines share one config and one theme system:

- **HTML/CSS + Playwright** (primary) — highest design fidelity, outputs PNG/JPG/WebP/AVIF at exact platform pixel sizes.
- **Native SVG + resvg** (vector track) — outputs true `.svg` (infinitely scalable) plus rasters, when the user wants vector clarity.

`${CLAUDE_SKILL_DIR}` below is the directory containing this file. On Windows use the path directly (e.g. `node "<skill-dir>/scripts/render.mjs"`).

## Workflow

Follow these steps in order. Create a TodoWrite list from them for non-trivial jobs.

1. **Ensure dependencies are installed (once).** If `${CLAUDE_SKILL_DIR}/scripts/node_modules` does not exist, run:
   ```bash
   cd "${CLAUDE_SKILL_DIR}/scripts" && npm install
   ```
   This installs `playwright`, `sharp`, `@resvg/resvg-js`. Playwright uses the **system Chrome** (`channel:"chrome"`) — no browser download. Fonts are already bundled in `assets/fonts/`.

2. **Gather inputs** (ask only for what is missing):
   - **App name** and optional **brand color** (`#hex`) + **accent color**.
   - **Screenshots**: local file paths to the user's app screenshots (one per slide). Phone shots ≈ 9:19.5 portrait look best in phone frames; desktop shots ≈ 16:10 for mac/browser frames. Any size works (auto-fitted).
   - **Slides**: 1–5 of `{ headline, highlight, subheadline }`. `highlight` is an emphasized second line (rendered in an italic display font). Keep headlines short (2–4 words).
   - **Theme**: one of `purple-gradient` (default), `dark-playful`, `clean-light`, `brand-solid`, `mono`. See `references/design-recipes.md`.
   - **Targets**: platform IDs or bundle names (see list below, full table in `references/platform-specs.md`).
   - **Formats**: any of `png`, `jpg`, `webp`, `avif`, `svg`. Default `["png"]`. `svg` requires the SVG track (step 4b).
   - **Output dir**.

3. **Write `promo.config.json`** (see `scripts/promo.config.example.json` and the schema in `references/workflow.md`). Save it next to the screenshots or in the output dir. Relative paths resolve from the config file's location.

4. **Render.**
   - a) **Raster (default):**
     ```bash
     node "${CLAUDE_SKILL_DIR}/scripts/render.mjs" path/to/promo.config.json
     ```
     Add `--dry` to preview the job list, or `--target id,id` to render a subset.
   - b) **Vector / SVG** (only if `svg` requested, or the user wants vector output):
     ```bash
     node "${CLAUDE_SKILL_DIR}/scripts/render-svg.mjs" path/to/promo.config.json
     ```

5. **Report results.** The scripts validate every output: exact pixel dimensions, no-alpha where the platform forbids it (Apple/Play), and size caps (Play ≤8 MB, Product Hunt ≤3 MB). Relay the ✓/✗ summary and the output folder. If anything failed, fix the config/screenshot and re-run only that `--target`.

## Targets and bundles

Individual target IDs (exact sizes in `references/platform-specs.md`):
`appstore-iphone-6.9`, `appstore-iphone-6.5`, `appstore-ipad-13`, `appstore-ipad-13-landscape`, `mac-appstore`, `play-phone`, `play-feature`, `play-icon`, `desktop-window`, `web-hero`, `og`, `twitter`, `instagram-portrait`, `instagram-square`, `instagram-story`, `producthunt`, `linkedin`.

Bundles (expand to several targets): `ios`, `android`, `mobile`, `desktop`, `web`, `social`, `all-stores`. Use these in `config.targets` for one-line coverage, e.g. `"targets": ["ios", "social"]`.

## Key rules

- **Count limits**: App Store ≤10, Play ≤8 (min 2), Product Hunt ≥2. Each target uses the first N slides automatically.
- **No alpha** on App Store / Play screenshots & feature graphic — handled automatically (flattened onto the theme background). Only `play-icon` and `web-hero` keep transparency.
- **Per-slide overrides**: a slide may set `frame` (`phone`/`tablet`/`mac`/`browser`/`none`), `layout` (`headline-top`/`side-by-side`/`showcase`/`headline-overlay`), `theme`, or `formats` to override the global value.
- **Device frame is auto-chosen per target** (phone→phone frame, mac→mac window, etc.) but a slide's `frame` wins. For mac/desktop targets, supply a landscape desktop screenshot for best results.

## References (read when needed)

- `references/platform-specs.md` — full size matrix, per-platform rules, count/format limits.
- `references/design-recipes.md` — theme tokens, layout guidance, headline writing tips, how to match a reference style.
- `references/workflow.md` — complete `promo.config.json` schema, all fields, and worked examples.
