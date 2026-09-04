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
- **Field position** — spot the ball anywhere from the open field to the +1 or
  your own 2: the end zone comes into view, the first-down marker disappears
  when it's goal to go, and the play compresses into the space actually in
  front of it (see below)
- **Display settings** — position letters, jersey numbers or blank markers;
  circles, squares, triangles or bare letters per side; and fills by team or
  by position group, plus a colour on any single player
- **Drag anything** — players carry their routes with them
- **Read progression** — number a route 1 / 2 / 3 / C and the badge is drawn
  at the end of it, so a quarterback can read the order straight off the card;
  print cards carry the progression line ("1 Z → 2 Y → 3 RB")
- **Notes on the diagram** — the Note tool (T) drops text anywhere on the
  field for a coverage alert, a check or a coaching point; drag to place it
- **Playbook** — grouped by formation or by your own tags, collapsible with
  counts, starred shortlist for a game plan, and a search across names,
  formations, tags and notes; live thumbnails, duplicate and mirror ("Flip")
  in one click
- **Print / PDF** — 4-per-page play cards or 8-per-page wristband sheets via
  the browser print dialog
- **PNG export** per play, **JSON backup/restore** for the whole playbook
- **Undo/redo**, keyboard shortcuts (V/R/B/M tools, Ctrl+Z), autosave to
  localStorage

## Coach AI (in-app chat)

Click **✦ Coach AI** in the app for a side panel where you ask for plays in
plain language — "5 plays to beat Cover 2 on 3rd and 6" — and they draw
straight onto the canvas and into the playbook.

The `claude-proxy` edge function is a thin pass-through to the Anthropic
Messages API that exists only so an API key never ships in the browser
bundle; the tool loop itself runs in the browser (`src/coordinator.ts`), so
the AI draws through the same formation, route, hash and spotting code as
the canvas and can never produce an invalid play.

Enable it either way:

- paste an Anthropic API key into the panel (kept in that browser only), or
- set an `ANTHROPIC_API_KEY` secret on the Supabase project, which enables it
  for everyone — note the endpoint is public, so anyone with the URL could
  then spend those credits.

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

**Team packs:** point `PLAYCALLER_TEAM_PACK` at a pack file and the server
learns a program's own formations and call grammar, so generated plays read
like their playbook ("Gun Trey Open Right Rod Michigan") instead of generic
football. `team_terminology` returns their protections, run series and pass
concepts; `list_formations` adds their sets, flagging any whose alignment
was inferred rather than supplied. Pack files are gitignored — a playbook is
the program's IP and does not belong in this public repo.

```json
{
  "team": "Example HS",
  "call_grammar": "Formation + Direction + Protection + Concept",
  "terminology": { "Protections": ["Solo", "Rip/Liz"] },
  "formations": [
    { "name": "Gun Trey Right", "confirmed": false,
      "players": [{ "label": "C", "x_yards": 26.65, "depth_yards": 0 }] }
  ],
  "needs_alignment": ["Gun Dallas Right"]
}
```

**Hashes:** plays record where the ball is spotted (L / LM / MOF / RM / R,
the notation practice scripts use). The box travels with the ball while
detached receivers compress into the boundary and widen to the field, the
way alignments actually work — see `src/utils/field.ts`.

**Field position:** plays also record how far it is to the goal line, and
`create_play` / `create_custom_play` take `field_position` (yards to the
opponent's goal, or 90-99 to back the offense up). Depth compresses the same
way splits do at a hash: the front seven do not move, because an end and a
linebacker line up where they line up whatever the yard line, while the space
downfield scales to what is really in front of the ball — so safeties walk
down and vertical routes finish in the end zone instead of running off the
top of the field. Anchored to open-field depth rather than to the play's own
contents, the transform is invertible: move the ball back out of the red zone
and you get the play you drew.

**Reads and notes:** every assignment takes a `read` ("1", "2", "3", "C") and
both play tools take `labels` — short notes placed on the diagram by yard
coordinates. Ask for a concept and the progression comes numbered, which is
what makes a printed card usable by a player rather than only by the staff.

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

**Display settings** (labels, marker shapes, team and position-group fills)
are a per-browser preference stored alongside the playbook and applied to the
canvas, thumbnails and print alike. They travel in a JSON backup, so handing a
staff a backup file hands them the look too. A colour set on an individual
player lives on the play itself, so it syncs and survives export — which is
what `create_custom_play`'s per-player `fill` is for: colour the scout offense
so the defense can pick it out on a card.

Roadmap: opponent-data ingestion (Hudl breakdown exports) for tendency
analysis, and generating a full week of installs, call sheets and practice
scripts from it.

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
