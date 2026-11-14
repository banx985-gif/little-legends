# CC latest — Job 19 step 8 (free vs paid)

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME step 8 (run step 3 of NEXT_CC_ORDER). Done earlier today: Job 19 steps 1–7 and Job 20.
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- **Checked every new Job 19 feature against the Job 18 "free to try + one unlock" rules**, with one test that runs them all in the free version:

| Feature | Free version | Full game |
| --- | --- | --- |
| Playgrounds | Dino Valley and the sea (the free worlds) | all five |
| Dress-up room | the basics (first 3 of each kind + anything earned) | full wardrobe |
| Sticker book / scene maker | yes | yes |
| Adventure Trail | yes, missions from the free worlds only | all worlds |
| Bigger challenge | off (the switch says "full game") | on per child, ages 4–5 |
| Bedtime stories | no (Storybook is a full-game world) | yes |
| Jungle Jam songs | no (Jungle Jam is a full-game world) | yes |

- **Fix:** a song card in MY PICTURES could have opened Jungle Jam in the free version, for example after a refund. Jungle Jam now checks the unlock itself, like the other full-game screens.
- **Parent Area → FULL GAME** now lists what the unlock adds:
  - every world and its playground;
  - all 50 colouring pages and Pip's full wardrobe;
  - bedtime stories, Jungle Jam songs and the Bigger challenge.
- As before, children never see a price. Locked things show the sleepy padlock and Pip's "Ask a grown-up!".

## Not done
- Nothing for this step.

## What Aaron needs to do
- Open the web game with `?locked=1` (the free version) and check the table above.

## Checks / commit
- `npm run check`: PASS (new free-vs-paid test covering every row above). `npm run standalone`: PASS.
- Lite speed check: step 9 next.
- Commit: see `git log` ("Job 19 step 8"). Pushed. No APK (Android Studio / Java 21 still missing).
