# CC latest — Job 19 step 2 (Pip's dress-up room)

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME step 2 (run step 3 of NEXT_CC_ORDER; Job 19 step 1 and Job 20 were committed before this)
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- **New: Pip's dress-up room.** Two ways in:
  - Tap **Pip's house** on Wonder Island.
  - The new **DRESS UP** button on the Collection's LOOKS tab.
- **Big Pip in the middle, with a mirror beside him** that shows him the other way round, wearing the same looks.
- **Wardrobe tray down the left:** the six kinds of look (hats, glasses, outfits, onesies, bags & wings, extras) and their pictures, 8 to a page.
  - Tap a look, or drag it onto Pip, and he wears it with a sparkle.
  - One per place: a new hat replaces the old one, and a onesie hood replaces the hat, as in Job 09.
  - Tap a worn look again to take it off.
  - The hanger button takes everything off.
  - Tap Pip and he celebrates.
- **Camera button:** a flash and a click, then a photo of Pip goes into the Collection → MY PICTURES (the sticker book). Tapping that photo opens the room again.
- **This room is play.** Every look can be tried on here, and the room keeps its own outfit per child. It doesn't change the looks Pip wears elsewhere; those are still earned with stars in the Collection.
- **Free version:** the first 3 looks of each kind, plus any look the child has earned. The rest sleep behind a padlock, and Pip says "Ask a grown-up!". The full wardrobe comes with the unlock.
- **Built to the Job 20 rules:** the tray is on the left edge of the safe area; home, camera and hanger are on the right edge. No bars at any of the five screen shapes (`npm run qa:shapes`: 105/105).
- Uses existing art only: the wardrobe pictures, the stage curtain and spotlight, and the wardrobe camera. The mirror frame is a plain drawn shape.

## Not done
- Nothing for this step.

## What Aaron needs to do
- On the tablet: tap Pip's house, dress him up, take a photo, then find it in Collection → MY PICTURES.
- With `?locked=1` (the free version), check that only the basics open.

## Checks / commit
- `npm run check`: PASS (new tests: wear, drag, one per place, camera → My Pictures, hanger, the free basics, the ways in, old saves). `npm run standalone`: PASS.
- Commit: see `git log` ("Job 19 step 2"). Pushed. No APK (Android Studio / Java 21 still missing).
