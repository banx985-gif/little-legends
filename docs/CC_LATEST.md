# CC latest — Job 19 step 7 (Jungle Jam song mode)

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME step 7 (run step 3 of NEXT_CC_ORDER). Done earlier today: Job 19 steps 1–6 and Job 20.
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- **Jungle Jam → FREE JAM** now has three round buttons on the right edge:
  - **Record** (a red dot): records about 20 seconds of the child putting band friends on and off the stage. The time runs round the button, and it stops by itself at 20 seconds (or tap it again).
  - **Play** (a green triangle): the band is put back as it was when recording started, then each friend comes on or goes off exactly when they did. Hands off while it plays, so a stray tap doesn't spoil it. Tap again to stop.
  - **Keep** (a tick): saves it to Collection → MY PICTURES as a **song card** (a little picture of the band and music notes). Tapping the card later opens Jungle Jam and plays the song.
- The song itself is tiny: who was on the stage, and when. No sound is recorded, so there's no microphone and nothing private.
- Part of the full game, because Jungle Jam is a full-game world.
- Built to the Job 20 rules. The buttons sit on the safe area's right edge, clear of the stage at every screen shape.

## Not done
- Nothing for this step.

## What Aaron needs to do
- On the tablet (full game): Jungle Jam → record a song, play it back, keep it, then find the card in MY PICTURES and tap it.

## Checks / commit
- `npm run check`: PASS (new tests: record, every band change kept with its timing, stops at 20 s, playback order and timing, hands off while playing, it ends, song card saved, card plays the song). `npm run standalone`: PASS. `npm run qa:shapes`: no bars.
- Lite speed check: still needs re-running on a quiet PC.
- Commit: see `git log` ("Job 19 step 7"). Pushed. No APK (Android Studio / Java 21 still missing).
