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

## AI play design (MCP server)

Playcaller ships an MCP server so Claude can design plays for you:

> "Build me 10 plays that beat Cover 2."

Claude calls the server's tools — `list_formations`, `get_route_library`,
`coverage_guide` (a built-in knowledge base on attacking each coverage), and
`create_play` — and writes real, correctly-drawn plays to a playbook file.
Open Playcaller and hit **Restore** to load them.

**Claude Code:** the repo's `.mcp.json` registers the server automatically.

**Claude Desktop:** add to your MCP settings:

```json
{
  "mcpServers": {
    "playcaller": {
      "command": "npx",
      "args": ["tsx", "/path/to/playcaller/mcp/server.ts"]
    }
  }
}
```

The playbook file defaults to `./playcaller-playbook.json`; set
`PLAYCALLER_PLAYBOOK` to change it. `npm run test:mcp` runs an end-to-end
test that drives the server the way a client would.

**Cloud mode:** set `PLAYCALLER_PLAYBOOK_ID` to the UUID from the app's
share link (click the "☁ Synced" chip to copy it) and the MCP server writes
straight to that cloud playbook — plays appear in the open app live, no
import step.

**Scout cards:** `create_custom_play` places every player explicitly, so
Claude can draw any opponent look — Wing-T, double wing, flexbone,
unbalanced lines — with pulling guards, ball-carrier paths, and blocking
assignments. Combined with uploaded opponent film breakdowns, this powers
weekly game-plan installs and scout-team card packs.

## Cloud sync & hosting

Plays sync through Supabase using a share-link capability model: the
playbook UUID is the secret; the `playcaller_plays` table has RLS enabled
with no policies, and all access goes through `security definer` RPCs
(`supabase/migrations/`). The app pulls on load, pushes debounced, and
listens on a realtime broadcast channel (30s poll as fallback); with no
network it silently stays local-only.

**Live app: https://utahbuzz.github.io/rally/**

It is served by GitHub Pages from `docs/index.html` (repo Settings -> Pages
-> deploy from this branch, `/docs`). Deploying a new version is `npm run
build && cp dist/index.html docs/index.html` plus a git push.

Note: the app cannot be hosted on Supabase. Both Edge Functions and Storage
force `content-type: text/plain` and `content-security-policy: default-src
'none'; sandbox` on HTML responses as an anti-phishing measure (verified
against the live endpoints), so the page is served as source text and its
scripts are blocked. The GitHub CDNs (jsDelivr, Statically) do the same.
The `playcaller` edge function now just 302-redirects to the Pages URL so
older links keep working.

Roadmap: an in-app AI coordinator chat calling Claude with the same MCP
tools, opponent-data ingestion for tendency analysis, and generated install
sheets / call sheets / practice scripts.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + single-file production build in dist/
node scripts/smoke.mjs  # Playwright smoke test against dist/index.html
```

The production build is a single self-contained `dist/index.html` (~120 KB
gzipped) — host it on any static host, or open it from disk. It must be
served as `text/html`; hosts that serve HTML as `text/plain` (Supabase, the
GitHub CDNs) show the source instead of the app. File downloads (PNG
export, backup) require a normal browser context; sandboxed preview iframes
may block them.

## Stack

Vite + React + TypeScript, SVG canvas, Zustand (localStorage persistence),
Supabase for cloud sync, GitHub Pages for hosting.
