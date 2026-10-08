# Little Legends — notes for Claude Code

- Game: kids' learning game (ages 2–5), plain JavaScript + HTML5 Canvas, tablet first. No framework, no build step. Entry: `index.html` → `src/main.js`.
- Checks: `npm run check` (full regression). One-file test build: `npm run standalone`. Run both after every job; both must pass.
- Art: ~600 finished cut-out PNGs live in `assets/` by folder (characters, creatures, objects, worlds, ui, fx, rewards). Full list with ids: `assets/art_manifest.json` (id = folder path with dots, e.g. `creatures.safari.lion`). Cowork files the art — do NOT rename, move, recolour or redraw art files.
- Never draw invented detail (faces, eyes, marks) onto art. If a picture is missing, keep the existing placeholder.
- Jobs are written in `../../03_PLANS_AND_BIBLES/CC_JOBS/`. Do the newest job, then summarise in plain words what changed and what Aaron should test.
- Older saves must keep working (see save migration in `src/save/`).
