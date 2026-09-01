# Playcaller

A fast, modern football play designer that runs entirely in the browser — a
web-native competitor to Pro Quick Draw (which is a PowerPoint/Visio plugin).

**Positioning:** draw a complete play in ~30 seconds. No install, no plugin,
no learning curve, works on a laptop or a sideline tablet.

## Competitive advantages

| Pro Quick Draw | Playcaller |
| --- | --- |
| PowerPoint/Visio plugin, desktop only | Runs in any browser, zero install |
| Dated UI, steep learning curve | Modern canvas, one-click everything |
| Freehand drawing from scratch | Formation library + quick-route tree |
| License pricing for a drawing tool | Local-first, instant start |

## Features

- **11v11 field canvas** with hashes, line of scrimmage, and first-down marker
- **Formation library** — 8 offensive sets (Gun Spread, Trips, Empty, Bunch,
  Singleback, Pistol, I-Form, Ace 12) and 4 defensive looks (4-3, 3-4,
  Nickel, Cover 3) with realistic alignments
- **Quick routes** — click a player, click "Post": the full route tree
  (plus blocks, pulls, motion, blitz) is applied and auto-mirrored by side
  of field
- **Custom drawing** — routes (arrow), blocks (⊤), motion (dashed), with
  45° snap, rounded breaks, draggable break points, and six route colors
- **Drag anything** — players carry their routes with them
- **Playbook** — searchable, taggable play list with live thumbnails,
  duplicate and mirror ("Flip") in one click
- **Print / PDF** — 4-per-page play cards or 8-per-page wristband sheets via
  the browser print dialog
- **PNG export** per play, **JSON backup/restore** for the whole playbook
- **Undo/redo**, keyboard shortcuts (V/R/B/M tools, Ctrl+Z), autosave to
  localStorage

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + single-file production build in dist/
node scripts/smoke.mjs  # Playwright smoke test against dist/index.html
```

The production build is a single self-contained `dist/index.html` (~61 KB
gzipped) — host it anywhere, or open it from disk. File downloads (PNG
export, backup) require a normal browser context; sandboxed preview iframes
may block them.

## Stack

Vite + React + TypeScript, SVG canvas, Zustand (localStorage persistence).
No backend — cloud sync/accounts (Supabase) is the planned next layer.
