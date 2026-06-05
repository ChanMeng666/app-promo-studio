# promo.config.json schema & examples

The config is the single repeatable artifact. Re-running the scripts regenerates the whole set; change one field and re-run to update everything. Relative paths (`screenshot`, `outDir`) resolve from the **config file's own directory**.

## Schema

```jsonc
{
  "app": {
    "name": "Lumen",            // shown in mac/browser window chrome
    "brandColor": "#6d28d9",    // overrides theme --accent; for brand-solid it sets the background
    "accentColor": "#fde68a"    // overrides theme --highlight (the emphasized word / italic line)
  },
  "theme": "purple-gradient",   // global theme: purple-gradient | dark-playful | clean-light | brand-solid | mono
  "targets": ["ios", "og"],     // target IDs and/or bundle names (see platform-specs.md)
  "formats": ["png", "webp"],   // global default; any of png jpg webp avif svg
  "outDir": "./promo-out",      // output directory (created if missing)
  "svg": false,                 // informational; SVG is produced by render-svg.mjs

  "slides": [
    {
      "headline": "Search smarter",      // main line (bold). Keep to 2–4 words.
      "highlight": "instantly",          // optional emphasized 2nd line (italic display font)
      "subheadline": "Reliable AI answers in seconds.",  // optional supporting sentence
      "screenshot": "./screens/home.png",// local path to the app screenshot for this slide
      "badge": "Editors' Choice",        // optional pill badge (award/quote)

      // optional per-slide overrides:
      "frame": "phone",                  // phone | tablet | mac | browser | none
      "layout": "headline-top",          // headline-top | side-by-side | showcase | headline-overlay
      "theme": "clean-light",            // override global theme for this slide
      "formats": ["png"],                // override global formats for this slide
      "transparent": false               // drop the background -> real transparency, but ONLY on
                                         // alpha-capable targets (web-hero, play-icon). Ignored on
                                         // App Store / Play screenshots (those are always flattened).
    }
  ]
}
```

### Field notes
- **Slides vs targets**: each target uses the first *N* slides up to its count limit (App Store ≤10, Play ≤8, single-image targets like `og`/`play-feature` use slide 1). Provide as many slides as your largest screenshot set needs.
- **frame defaults** come from the target (phone→`phone`, mac→`mac`, browser/social→`browser`/`phone`); set a slide `frame` to override. For `mac`/`browser`/`desktop` frames, give a **landscape desktop screenshot**; for phone/tablet give a **portrait** one.
- **layout defaults**: phone/tablet portrait → `headline-top`; mac/browser → `side-by-side`; square/`none` → `showcase`. Override per slide if desired.
- **No-alpha targets** are flattened onto the theme's solid background automatically.

## Running

```bash
# raster (PNG/JPG/WebP/AVIF)
node "<skill-dir>/scripts/render.mjs" promo.config.json
node "<skill-dir>/scripts/render.mjs" promo.config.json --dry              # preview job list
node "<skill-dir>/scripts/render.mjs" promo.config.json --target og,ios    # subset

# vector (.svg) + raster via resvg
node "<skill-dir>/scripts/render-svg.mjs" promo.config.json
```

Output files are named `<targetId>.<ext>` (single) or `<targetId>-01.<ext>`, `<targetId>-02.<ext>` … (multi-slide), under `outDir`.

## Example A — iOS + Android stores + social, two engines

```json
{
  "app": { "name": "Lumen", "brandColor": "#6d28d9", "accentColor": "#fde68a" },
  "theme": "purple-gradient",
  "targets": ["ios", "android", "social"],
  "formats": ["png"],
  "outDir": "./promo-out",
  "slides": [
    { "headline": "Search smarter", "highlight": "instantly", "subheadline": "Answers in seconds.", "screenshot": "./screens/home.png", "badge": "Editors' Choice" },
    { "headline": "Discover more", "highlight": "every day", "subheadline": "A feed that learns what you love.", "screenshot": "./screens/discover.png" }
  ]
}
```
Then also run `render-svg.mjs` with `"formats": ["svg"]` if you want vector deliverables.

## Example B — desktop app + web landing, clean light theme

```json
{
  "app": { "name": "Lumen", "brandColor": "#0071e3" },
  "theme": "clean-light",
  "targets": ["mac-appstore", "desktop-window", "web-hero", "og"],
  "formats": ["png", "webp"],
  "outDir": "./promo-out",
  "slides": [
    { "headline": "Built for focus", "highlight": "by design", "subheadline": "Everything in one calm workspace.", "screenshot": "./screens/desktop-dashboard.png", "frame": "mac" }
  ]
}
```

## Adding new sizes or themes
- **New target size**: add an entry to `scripts/specs.json` (`out`, `scale`, `frame`, `alpha`, `count`, optional `maxBytes`). No code change.
- **New theme**: add a preset to `scripts/themes.json` (`tokens`, `decoration`, `fonts`). Both engines pick it up.
