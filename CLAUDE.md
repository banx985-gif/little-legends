# Little Legends — notes for Claude Code

- Game: kids' learning game (ages 2–5), plain JavaScript + HTML5 Canvas, tablet first. No framework, no build step. Entry: `index.html` → `src/main.js`.
- Checks: `npm run check` (full regression). One-file test build: `npm run standalone`. Run both after every job; both must pass.
- Art: ~600 finished cut-out PNGs live in `assets/` by folder (characters, creatures, objects, worlds, ui, fx, rewards). Full list with ids: `assets/art_manifest.json` (id = folder path with dots, e.g. `creatures.safari.lion`). Cowork files the art — do NOT rename, move, recolour or redraw art files.
- Art bible: `../../03_PLANS_AND_BIBLES/LITTLE_LEGENDS_MASTER_ART_DESIGN_BIBLE_v11.md` (names and roles of every character, creature and dragon).
- Never draw invented detail (faces, eyes, marks) onto art. If a picture is missing, keep the existing placeholder.
- Jobs are written in `../../03_PLANS_AND_BIBLES/CC_JOBS/`. Do the newest job, then summarise in plain words what changed and what Aaron should test.
- Older saves must keep working (see save migration in `src/save/`).
- You can't write outside this folder. Put any full-size originals in `_masters_pending/` (git-ignored); Cowork moves them into `04_ART/MASTERS_FULL_SIZE/`.
- TARGET HARDWARE: cheap/older kids' Android tablets (2–3 GB RAM, slow GPU, e.g. Tab A7 Lite, Fire HD 8, Tab A11+) must play smoothly. Every change must keep low-end performance — design for these first.

## END OF EVERY JOB — write docs/CC_LATEST.md (required)
Aaron no longer screenshots your summary; Cowork reads this file instead. When you finish any job or prompt, OVERWRITE `docs/CC_LATEST.md` (replace it, don't append) with:
- Date/time, which job, and whether it is DONE, PARTLY DONE or BLOCKED
- What changed (short, plain English)
- Anything not done and why
- What Aaron needs to do (test on the tablet, draw art, decide something). Write "nothing" if there's nothing.
- Commit id and whether it was pushed / APK rebuilt
Then commit it with the job.
