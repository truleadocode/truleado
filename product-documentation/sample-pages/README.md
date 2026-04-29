# Per-Platform Full-Profile Mockups

Static HTML pages that mock up the full-page Creator Profile view for
each of the five Truleado-supported platforms. They're a **design
reference and iteration playground** for the eventual real
`/dashboard/creators/[id]?platform=<x>` page redesign — not deployed
routes, not part of the app bundle.

## Files

| Platform | File | Sample creator | Source fixture |
|---|---|---|---|
| Instagram | [instagram-cristiano.html](./instagram-cristiano.html) | @cristiano | `enrichment-full-samples/instagram-cristiano.json` |
| YouTube | [youtube-mrbeast.html](./youtube-mrbeast.html) | MrBeast (UCX6OQ3DkcsbYNE6H8uQQuVA) | `youtube-mrbeast.json` |
| TikTok | [tiktok-khaby.lame.html](./tiktok-khaby.lame.html) | @khaby.lame | `tiktok-khaby.lame.json` |
| Twitter | [twitter-elonmusk.html](./twitter-elonmusk.html) | @elonmusk | `twitter-elonmusk.json` |
| Twitch | [twitch-kaicenat.html](./twitch-kaicenat.html) | @kaicenat | `twitch-kaicenat.json` |

## How to view

Open any file directly in a browser — no server, no build step:

```bash
open product-documentation/sample-pages/instagram-cristiano.html
```

## How they work

Each HTML file contains:
- **Tailwind CDN** in the `<head>`
- **Chart.js CDN** for charts (lighter than Recharts for static pages)
- **The fixture JSON inlined** as `<script type="application/json" id="data">…</script>`
- **Vanilla JS** at the bottom that reads the JSON and renders the layout

The layout matches IC's screenshots:

```
┌─────────────────────────────────────────────────────────┐
│  Header (avatar · name · handle · platform · followers) │
├──────────────────┬──────────────────────────────────────┤
│ Meta column      │ [ Analytics ] [ Posts ] [ Similar ]  │
│ - Avatar/bio     │                                      │
│ - Location       │ Creator Growth chart                 │
│ - Niche          │ ER Distribution histogram            │
│ - Links          │ Per-platform highlights              │
│ - Add to list    │ Income card (YouTube only)           │
│ - Cross-platform │ Top Hashtags chips                   │
│ - 8-row stats    │                                      │
└──────────────────┴──────────────────────────────────────┘
```

## Editing

These files are designed for fast iteration. To experiment with a
section's layout:

1. Open the HTML file in a browser.
2. Open DevTools, find the section, edit the markup or Tailwind classes
   inline.
3. Once you like the result, paste it back into the file.

When the design is approved, the React equivalents under
`src/components/discovery/enriched-data/` get the same treatment in a
follow-up PR.

## Refreshing the fixtures

If IC's payload shape changes, refresh the underlying fixtures by
following the curl commands in
`src/lib/influencers-club/__tests__/fixtures/enrichment-full-samples/README.md`,
then copy-paste the new JSON into the `<script id="data">` block of
each HTML file.
