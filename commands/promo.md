---
description: Generate cross-platform app promotional images (App Store / Google Play / iPad / Mac / web hero / social & OG cards) from your app screenshots, headlines and brand colors. Outputs exact platform sizes in PNG/JPG/WebP/AVIF and true vector SVG.
---

The user wants to create app promotional / marketing images.

Invoke the **app-promo-images** skill (in this same plugin) and follow it end-to-end.

User request / arguments: $ARGUMENTS

Steps:
1. Read the skill at `skills/app-promo-images/SKILL.md` and follow its workflow exactly.
2. Gather the required inputs (app name, headlines, screenshot file paths, brand color/theme, target platforms, output formats, output dir) — ask only for what is missing from `$ARGUMENTS`.
3. Write a `promo.config.json`, run the render scripts, then report the generated files.
