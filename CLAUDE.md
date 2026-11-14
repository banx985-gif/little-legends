# Little Legends — notes for Claude Code

## SERVER DECISION: NO live server (Studio server standard, 13 Nov 2026; waiting on Aaron to confirm)
Little Legends is single-player. It has no player-vs-player, leaderboards, live events, friends/chat/gifting or shared world, so it gets **no Supabase project**.
- **Saves:** on the tablet, per child. No cloud save: on a new tablet the bought unlock comes back with RESTORE PURCHASE, and progress starts fresh (fine for ages 2–5).
- **Purchases:** Google Play Billing only (one-time `full_unlock`, checked by Google Play, stored on the tablet, works offline). Cheating on one A$4.99 unlock isn't worth a server.
- **Ads:** none. Aaron decided "no ads" for this kids' game, and it keeps the Google Play Families policy simple. So no AdMob, even though the studio standard allows it.
- **Notifications** (Job 20) are scheduled on the device, so they need no server either.
- **Stores:** Google Play first. Apple App Store later: keep the code shared and avoid Android-only shortcuts where an easy shared way exists, but build no iPhone-store features yet.
- **Billing test mode:** keep a test mode with one switch to go live, plus a build check so a store release can't ship in test mode. The Play Console account is still waiting on Aaron's DUNS number.
- Don't add any network use, accounts or analytics "just in case". If a future feature needs sharing between players, stop and ask Aaron first.


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

## STANDING RULES (Aaron, 2026-11-08) — apply to every job from now on
### 1. Fill every screen — no black bars, ever
- The game is SIDEWAYS (landscape). Base size = a normal phone held sideways, **2340×1080**; stretch from there. (Aaron chose sideways over upright on 2026-11-08.)
- Backgrounds always COVER the whole screen. Trim a little off the edges rather than show bars.
- Buttons and bars are pinned to the screen edges and inside the phone's safe areas (the notch/camera cut-out and the gesture bar), using `env(safe-area-inset-*)` / the Android insets. Only buttons and words are kept out of those areas: the background still runs under them.
- Never letterbox (black or coloured bars), and never make a separate layout per phone. One layout that stretches.
- Anything a child must reach or see stays inside the part of the screen every shape shows.
- Before a job is done, look at it at 16:9, 19.5:9 and 21:9 (phones), and at 4:3 and 16:10 (tablets). Add these shapes to the QA screenshots.
### 2. Notifications with on/off switches
- Notifications only for things worth coming back for. Keep them short, fun and written for the grown-up.
- At most 2 a day, and none between 10 pm and 8 am (the device's own time).
- **Android app:** schedule them on the device (Capacitor Local Notifications). **Web:** use the browser's notifications where allowed; otherwise skip quietly with no error.
- No permission request when the game opens. Ask after the child's first win: a friendly line first, then the grown-up check, then the system request.
- Parent Area → Settings:
  - one main Notifications switch, plus one switch per kind;
  - saved per child with the game;
  - switching a kind (or the main switch) off cancels any of those already scheduled.
- Tapping a notification opens the game on the right screen.
- Local notifications send nothing off the tablet. Keep the privacy promise and the docs true.
