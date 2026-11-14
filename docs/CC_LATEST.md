# CC latest — Job 19 step 6 (bedtime stories)

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME step 6 (run step 3 of NEXT_CC_ORDER). Done earlier today: Job 19 steps 1–5 and Job 20.
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- **New: bedtime stories.** Luna's Storybook world map → **BEDTIME** (the bottom-right door).
- **A shelf of 3 short, calm stories**, 6–7 pages each, all ending with "Goodnight, … Goodnight, little one.":
  - **Pip Says Goodnight:** the moon, the stars, the bunny, Rory.
  - **Octo's Quiet Sea:** fish, seahorse, turtle.
  - **The Forest Falls Asleep:** Owl, Squirrel, Hedgehog, Bear.
- **The pictures:** every page is made from pictures already in the game; nothing new is drawn. The Storybook world has no illustrated story pages of its own, so I wrote these stories around the characters and night-time pictures we have (sleepy moon, moon lamp, stars, beds, homes).
- **Read aloud page by page**, slowly and softly. It uses a recorded line when one exists, otherwise the tablet's own voice.
  - Each page turns by itself 2.5 seconds after it has been read.
  - If the tablet has no voice, pages still turn after a reading-length pause.
- **Calm music**, a dark night sky with twinkling stars, and the screen getting darker as the story goes on. The Goodnight page stays and dims right down.
- **Grown-up controls:** small arrows turn pages by hand. Home goes back to the shelf, then to the Storybook world.
- **Full game only,** like the Storybook world itself.
- Built to the Job 20 rules. No bars at any of the five screen shapes (26 screens × 5 shapes).

## Not done
- **Recorded voice lines** for the stories: they use the device voice until recordings exist. The new lines can be added to `docs/VOICE_LINES.csv` with `npm run voice:lines` when Aaron records them.

## What Aaron needs to do
- On the tablet (full game): Storybook → BEDTIME. Play a story with the sound on and check the voice speed and the page timing.
- If you'd like the stories in your own voice, say so and I'll add the lines to the recording list.

## Checks / commit
- `npm run check`: PASS (new tests: every picture exists, each story ends with Goodnight, read aloud slowly, auto-turn after reading, turns even with no voice, Goodnight stays and dims, grown-up arrows, home, full game only, the BEDTIME door). `npm run standalone`: PASS. `npm run qa:shapes`: no bars.
- Lite speed check: still needs re-running on a quiet PC.
- Commit: see `git log` ("Job 19 step 6"). Pushed. No APK (Android Studio / Java 21 still missing).
