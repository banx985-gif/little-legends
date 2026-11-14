# CC latest — Job 19 step 5 (big-kid levels: "Bigger challenge")

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME step 5 (run step 3 of NEXT_CC_ORDER). Done earlier today: Job 19 steps 1–4 and Job 20.
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- **New switch:** Parent Area → PROFILES → **Bigger challenge** for the child playing now. It's saved per child.
  - It only works for ages 4–5. For a younger child it is greyed out and says why.
  - It's part of the full game. In the free version it is greyed out and points to the FULL GAME tab.
- **With it on, the same missions get harder:**
  - **Counting to 20:** the child counts on from a bigger number. For example, "Count to 20!" with 10 already in the basket, or "count on from 5 to 8". The child still drags as many as before, so it isn't longer, just bigger numbers. Up to 20 fit neatly in the basket.
  - **Letters to words:** "Find letter A" becomes "Which word starts with A?" with word cards (Apple, Ball, Cat, Dog, Egg…). The cards are the game's existing word cards; no new art.
  - **3-step patterns:** red, blue, red, …? becomes red, blue, yellow, red, blue, …?
  - **More items:** "tap the …" activities get two extra things to choose from.
- The usual adjusting of difficulty to each child (Job 10) still runs first; the bigger challenge goes on top.

## Not done
- Nothing for this step.

## What Aaron needs to do
- For a child aged 4–5, switch on **Bigger challenge** (Parent Area → PROFILES), then play a counting mission, a Storybook letters mission and a Rainbow pattern.

## Checks / commit
- `npm run check`: PASS (new tests: count-on numbers and the 20 cap, letters to words, 3-step patterns, extra items, the real activities running at 20, free version and under-4 off, the Parent Area switch per child). `npm run standalone`: PASS.
- Lite speed check: still needs re-running on a quiet PC (another program was using this PC's CPU earlier today).
- Commit: see `git log` ("Job 19 step 5"). Pushed. No APK (Android Studio / Java 21 still missing).
