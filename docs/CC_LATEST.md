# CC latest — Job 19 step 3 (sticker book / scene maker)

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME step 3 (run step 3 of NEXT_CC_ORDER). Before this today: Job 19 step 1, Job 20, Job 19 step 2.
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- **New: Make a scene.** Way in: Collection → MY PICTURES → **MAKE A SCENE**. Tapping a saved scene there opens it again.
  1. Pick a background: 15 picture backgrounds (meadow, space rooms, town) plus 7 drawn worlds (dino, forest, rainbow, jungle, storybook, Bella's day, space).
  2. Then play:
     - The sticker tray (the same groups as the colouring studio: animals, characters, food, things, decor) sits on the left.
     - Tap a sticker and it drops in the middle; drag one and it lands where the finger lets go.
     - Drag things around. Tap one for its + and − size buttons.
     - Drag one to the bin, or off the picture, to take it away.
  3. The tick button saves it to MY PICTURES. Leaving saves it too. Opening it again keeps the same picture rather than making a copy.
  4. The landscape button picks a different background.
- Free in every version, as the job says.
- **Cheap tablets:**
  - At most 30 things in a scene.
  - The background picker shows small copies, made once and one at a time. Each full-size background is let go again straight after. (The first try drew 12 full-size backgrounds every frame: too heavy, and some didn't show.)
- **Dress-up room (step 2) memory fix:** it now loads only the kind of look on show (plus what Pip wears), not the whole wardrobe at once.
- Built to the Job 20 rules: tray on the left edge, home / save / background / bin on the right edge, the picture centred in its own 16:9 shape. No bars at any of the five screen shapes.

## Speed check (Lite, CPU slowed 4×) — needs a re-run
- **Picture memory:** PASS. The scene maker peaked at 99 MB (budget 100). The dress-up room went from 110 MB to within budget.
- **Frame time and the colouring fill:** these failed on this run, but the numbers are not trustworthy. Another program on this PC (a different project's test, `tests/goalworks/m20.test.mjs`, running since 5:17 pm) was keeping the CPU at 97%.
  - Screens I didn't change got slower too: the Collection went from about 12 to 27.5 ms, and the colouring fill went from 14.8 to 70 ms.
  - The first run today, before that program started, passed everything.
  - Re-run `npm run qa:release -- --only=lite` on a quiet PC.

## Not done
- Nothing else for this step.

## What Aaron needs to do
- On the tablet: Collection → MY PICTURES → MAKE A SCENE. Build a scene, save it, then reopen it from My Pictures.
- Re-run the Lite speed check when the PC is quiet.

## Checks / commit
- `npm run check`: PASS (new tests: pick a background, tap and drag stickers in, move, size, bin, the 30-thing cap, save, reopen, leaving keeps changes, free version, the ways in). `npm run standalone`: PASS. `npm run qa:shapes`: no bars.
- Commit: see `git log` ("Job 19 step 3"). Pushed. No APK (Android Studio / Java 21 still missing).
