# CC latest — Job 19 step 1 (playgrounds in five worlds)

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME, step 1 (first step of the NEXT_CC_ORDER run)
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- Finished and kept the uncommitted playground work from 24 Oct (nothing thrown away).
- **A PLAYGROUND button** on the world map of five worlds (bottom right, where the jungle has its JAM button):
  - **Dino Valley:** dinos, food bowl, bone, nests, a leaf bed and an egg. A dino dropped on food eats; on a nest it naps (little z's). Tap the egg: it wobbles.
  - **Octo's Sea** (Rainbow Village): Octo, fish, seahorse, turtle and a duck swim to and fro. Drop them on the sand and they go back in the water. Tap: bubbles.
  - **Space:** tap a rocket (or drop it on the landing pad) and it blasts off and lands again; planets spin (tap for a fast spin); the moon rover drives.
  - **Animal Forest:** drop an animal on its home (bear → den, squirrel → stump, fox → burrow…) and it pops inside, then comes back out.
  - **Busy Town:** two roads. A vehicle dropped on a road drives round and round and honks; off a road it parks.
- Same as the island playground (Job 15): drag anything, hold it for the + and − size buttons, tap it for its sound. Where things are and how big is saved per child.
- Free version: playgrounds open only in the free worlds (Dino Valley and the sea). Locked worlds can't be reached.
- Colouring: a speed fix to the bucket fill (it now colours only the rows it filled, and keeps its copy of the picture in memory instead of on a hidden canvas). Same look, faster on cheap tablets.
- The Lite speed check now includes three playgrounds.

## Not done
- Nothing for this step. The screen-fill rules (no black bars) come in the next step (Job 20) and will cover these screens too.

## What Aaron needs to do
- On the tablet: open each world's map → PLAYGROUND. Try dragging, holding, tapping. Check that a second child gets a fresh playground.

## Checks / commit
- `npm run check`: PASS. `npm run standalone`: PASS.
- Commit: see `git log` ("Job 19 step 1"). Pushed. No APK (Android Studio / Java 21 still missing on this PC).
