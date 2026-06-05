# Design recipes — themes, layouts, copywriting

Themes are defined in `scripts/themes.json` as CSS-variable token sets. Both the HTML and SVG engines consume them. Brand/accent colors from `config.app` override `--accent` / `--highlight` at runtime.

## Themes

| Theme | Vibe | Background | Headline font | Highlight | Decoration |
|---|---|---|---|---|---|
| `purple-gradient` (default) | Modern AI / consumer (Perplexity-style) | Radial violet → deep indigo | Inter 800 | Fraunces italic, cream | Sparkles ✦ |
| `dark-playful` | Social / community (Reddit-style) | Dark indigo gradient | Baloo 2 (rounded) | Baloo 2, yellow | Color blobs |
| `clean-light` | Productivity / Apple-like | White → light grey | Inter 800, near-black | Fraunces italic / accent | None |
| `brand-solid` | On-brand flat color | Your `brandColor` flat | Inter 800, white | Warm amber | None |
| `mono` | Minimal dark, neutral | Near-black gradient | Inter 800 | Muted grey | None |

Token keys (override-able): `--bg`, `--bg-solid` (used to flatten alpha), `--fg`, `--muted`, `--accent`, `--highlight`, `--bezel`, `--screen-bg`, `--badge-bg`, `--badge-fg`, `--deco`.

## Layouts

| Layout | Best for | Composition |
|---|---|---|
| `headline-top` | Phone/tablet App Store & Play screenshots | Centered headline block on top, device bleeds off the bottom edge. |
| `side-by-side` | Mac/desktop, web hero, OG, LinkedIn | Copy left, windowed device right. |
| `showcase` | Square social (IG square), `frame:none` cards | Centered copy with the device/screenshot centered below. |
| `headline-overlay` | Bold hero shots | Headline overlaid near the top, large device behind/below. |

Defaults are auto-selected from the target's frame/orientation (see `workflow.md`); override per slide with `layout`.

## Copywriting tips (matched to the reference style)

- **Two-part headlines** read best: a bold main line + an italic `highlight` line. Examples from real App Store sets: "Search anything / *instantly*", "Endless / *communities*", "Read real / *opinions*".
- Keep the main line to **2–4 words**; let the `highlight` carry the twist.
- `subheadline` = one short benefit sentence (≤ ~10 words). Optional.
- Use `badge` sparingly for social proof ("Editors' Choice", "App of the Day", "4.9 ★").
- One **idea per slide**. A 3–5 slide arc: hook → core feature → differentiator → proof → CTA.

## Matching a specific look
- Want the **Perplexity** look → `purple-gradient`, `headline-top`, phone frame, sparkles, Fraunces highlight.
- Want the **Reddit** playful look → `dark-playful`, phone frame, blobs, Baloo 2 headline.
- Want **Apple/clean SaaS** → `clean-light`, `side-by-side` for desktop/web, no decoration.
- Want strictly **on-brand** → `brand-solid` with the app's `brandColor`.

## Screenshots
- Phone/tablet frames expect **portrait** screenshots; mac/browser expect **landscape**. Any resolution works (auto-fitted, top-aligned cover). Higher-res input = crisper output.
- For `play-icon`, supply the **icon artwork** as the slide screenshot (it renders alpha-enabled).

## Vector (SVG) caveats
- The SVG track uses bundled fonts and native `<text>` (manual word-wrap). It does not apply variable-font weights as strongly as the browser, so headlines can look a touch lighter than the HTML engine. Prefer the HTML engine for store screenshots; use SVG when you specifically need infinite-scale vector assets (hero/OG/logos).
