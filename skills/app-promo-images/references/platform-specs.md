# Platform size matrix & rules

All targets are defined in `scripts/specs.json` (the machine-readable source of truth). This doc explains them. `out` = exact exported pixel size. Apple/Play screenshots must have **no transparency** (flattened automatically).

## App stores

| Target ID | Label | Size (px) | Frame | Alpha | Count | Notes |
|---|---|---|---|---|---|---|
| `appstore-iphone-6.9` | iPhone App Store 6.9" | 1320×2868 | phone | no | ≤10 | Primary iPhone size; Apple auto-downscales to smaller iPhones. |
| `appstore-iphone-6.5` | iPhone App Store 6.5" | 1284×2778 | phone | no | ≤10 | Fallback if 6.9" not supplied. |
| `appstore-ipad-13` | iPad App Store 13" | 2064×2752 | tablet | no | ≤10 | Primary iPad size (portrait). |
| `appstore-ipad-13-landscape` | iPad 13" landscape | 2752×2064 | tablet | no | ≤10 | Landscape variant. |
| `mac-appstore` | Mac App Store | 2880×1800 | mac | no | ≤10 | 16:10. Also accepts 1280×800 / 1440×900 / 2560×1600. |
| `play-phone` | Google Play phone | 1080×1920 | phone | no | 2–8 | ≤8 MB each. |
| `play-feature` | Play feature graphic | 1024×500 | none | no | 1 | Mandatory store banner. |
| `play-icon` | Play app icon | 512×512 | none | **yes** | 1 | 32-bit PNG, ≤1 MB. Supply an icon-art screenshot. |

## Desktop & web

| Target ID | Label | Size (px) | Frame | Alpha |
|---|---|---|---|---|
| `desktop-window` | Desktop app window | 2560×1600 | mac | no |
| `web-hero` | Web landing hero | 1600×900 | browser | **yes** |

## Social / Open Graph

| Target ID | Label | Size (px) | Frame | Alpha | Notes |
|---|---|---|---|---|---|
| `og` | Open Graph card | 1200×630 | browser | no | og:image / FB / LinkedIn / X link preview. |
| `twitter` | Twitter / X post | 1200×675 | phone | no | |
| `instagram-portrait` | Instagram portrait | 1080×1350 | phone | no | 4:5, best-performing IG feed ratio. |
| `instagram-square` | Instagram square | 1080×1080 | phone | no | |
| `instagram-story` | Story / Reels | 1080×1920 | phone | no | 9:16 full screen. |
| `producthunt` | Product Hunt gallery | 1270×760 | browser | no | ≥2 images, ≤3 MB each. |
| `linkedin` | LinkedIn post | 1200×627 | browser | no | |

## Bundles

| Bundle | Expands to |
|---|---|
| `ios` | appstore-iphone-6.9, appstore-ipad-13 |
| `android` | play-phone, play-feature, play-icon |
| `mobile` | appstore-iphone-6.9, play-phone |
| `desktop` | mac-appstore, desktop-window |
| `web` | web-hero, og |
| `social` | og, twitter, instagram-portrait, producthunt, linkedin |
| `all-stores` | appstore-iphone-6.9, appstore-ipad-13, play-phone, play-feature, mac-appstore |

## How sizing works

The renderer derives a CSS viewport = `out / scale` and a Chromium `deviceScaleFactor = scale` (preferring 2× or 3× that divides evenly), so the screenshot lands at the exact pixel size. A final `sharp` resize guarantees the precise dimensions, and validation rejects any mismatch.

To add or change a size, edit `scripts/specs.json` — no code changes needed. To produce a landscape variant of a portrait target, add an entry with swapped `out` dims.

Sources: Apple App Store Connect screenshot specs (2024–2025 revision), Google Play listing requirements, and current social platform image-size guides.
