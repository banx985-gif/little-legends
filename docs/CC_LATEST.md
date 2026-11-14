# CC latest — Job 19 step 4 (Adventure Trail with the explorer boy)

- **When:** 2026-11-14
- **Job:** JOB_19_MORE_GAME step 4 (run step 3 of NEXT_CC_ORDER). Done earlier today: Job 19 steps 1–3 and Job 20.
- **Status:** DONE (web). Not tried on a tablet yet.

## What changed
- **New: the Adventure Trail.** A **TRAIL** button on Wonder Island, under COLLECTION, opens it.
- **The trail:**
  - Each day each child gets a trail of **3 short Little Missions from 3 different worlds** (missions of 6 steps or fewer).
  - Missions the child hasn't finished come first.
  - The trail stays the same all day, and there's a new one tomorrow.
- **The explorer boy is the guide.** He reads his map at the start of the path and says where the next stop is ("First stop: Luna's Storybook!"). He points at the chest when all 3 stamps are in, and cheers when it's open. I used his own pictures only. He has no name in the art bible, so the game just calls him the explorer; tell me if he should have a name.
- **The map:** a dotted path over the meadow, with 3 stops showing each world's picture and the mission's name. The next stop bounces.
  - Tap a stop to play that mission.
  - When it's done, the game comes straight back to the map and a red **stamp** drops onto that stop.
  - After the third stamp, the **treasure chest** at the end bounces. Tap it: **+3 Discovery Stars**, once a day.
- **Prizes from the missions themselves** (friends, looks, dragons) aren't lost. They show on Wonder Island the next time the child goes there.
- **Free version:** the trail uses only the free worlds (Dino Valley and Rainbow Village). A world can then come up twice.
- **"Daily trail" reminder (from Job 20) now works:**
  - It is switched on like the other kinds, once, for every child.
  - A grown-up who switches it off keeps it off.
  - It says "Today's Adventure Trail is ready! 🗺️" at about 9:30 am the next day, within the 2-a-day cap.
  - Tapping it opens the trail.
- **Art check:** the explorer's pictures used to be listed as "role not decided"; they are now in use. All 973 pictures are now used except 8 left out on purpose.
- Built to the Job 20 rules. No bars at any of the five screen shapes (24 screens × 5 shapes).

## Not done
- Nothing for this step.

## What Aaron needs to do
- On the tablet: Wonder Island → TRAIL. Play the first stop and see the stamp land. Finish all 3 and open the chest. Look again tomorrow for a new trail.
- Decide whether the explorer boy should have a name.

## Checks / commit
- `npm run check`: PASS (new tests: 3 different worlds, short missions, same all day / new tomorrow, free worlds only, stamps, chest once a day, back to the map after a mission, the reminder, old saves). `npm run standalone`: PASS. `npm run qa:shapes`: no bars.
- Lite speed check: still needs re-running on a quiet PC (see the step 3 note: another program was using this PC's CPU).
- Commit: see `git log` ("Job 19 step 4"). Pushed. No APK (Android Studio / Java 21 still missing).
