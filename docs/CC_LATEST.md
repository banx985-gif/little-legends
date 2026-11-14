# CC latest — NEXT_CC_ORDER run finished (Job 19 step 1 → Job 20 → Job 19 steps 2–9)

- **When:** 2026-11-14
- **Status:** the whole run is DONE on the web. The Android parts are written but **not built or tried** (no Android Studio / Java 21 on this PC).
- One commit per step, all pushed:

| Step | Commit | What |
| --- | --- | --- |
| Job 19.1 | 0007760 | Playgrounds in 5 worlds (finished the uncommitted 24 Oct work; colouring fill speed-up) |
| Job 20 | e3ec379 | No black bars on any screen shape + notifications with on/off switches |
| Job 19.2 | 35c2bf9 | Pip's dress-up room (mirror, camera → My Pictures) |
| Job 19.3 | bb9dd05 | Sticker book scene maker |
| Job 19.4 | 564fa46 | Adventure Trail with the explorer boy |
| Job 19.5 | a46de46 | Bigger challenge for ages 4–5 |
| Job 19.6 | b71f4b5 | Bedtime stories |
| Job 19.7 | 98902ce | Jungle Jam song mode |
| Job 19.8 | cad3265 | Free vs paid for every new feature |
| Job 19.9 | this commit | Lite speed check of every new screen |

## Step 9 — cheap tablets first
- Every new screen is in the Lite speed check (`npm run qa:release -- --only=lite`, Lite mode, CPU slowed 4×): the dress-up room, the scene maker (and its background picker), the trail, both bedtime screens, and three playgrounds. All of them are also in the no-bars check (`npm run qa:shapes`).
- **Frame work per screen** (the 30 FPS target is under 16.7 ms):

| Screen | ms |
| --- | --- |
| dress up | 7.9 |
| scene maker | 4.2 |
| background picker | 5.4 |
| trail | 6.8 |
| bedtime | 5.2–5.6 |
| playgrounds | 2.8–11.0 |
| jungle jam | 7.0 |

- **Picture memory:** PASS. The most was 99 MB (scene maker) against the 100 MB budget.
- **Speed-ups made along the way:**
  - the dress-up room loads one kind of look at a time (it was 110 MB);
  - the background picker uses small copies, one full-size background at a time (it was 140 MB);
  - the scene maker caps a scene at 30 things.
- **The overall Lite check still says FAIL, and I believe this PC is the cause, not the game.** Other programs from a different project ("canvas management series" soak tests and "goalworks" tests) kept the CPU at 96–97% all afternoon. Older screens I didn't touch slowed down by the same amount: town hub 20 ms, island 18 ms, and the colouring fill 80 ms (it was 15 ms this morning on a quiet PC). The first Lite run today, before those programs started, passed everything. **Please re-run it on a quiet PC.**

## The whole run in plain words
- **Playgrounds** in Dino Valley, the sea, Space, Animal Forest and Busy Town: drag, hold to size, things react. A PLAYGROUND door on each world map.
- **No black bars on any screen shape** (sideways phones 16:9 / 19.5:9 / 21:9, tablets 16:10 / 4:3):
  - the play area is always whole, inside the notch and gesture-bar safe area;
  - backgrounds stretch to the edges;
  - buttons sit at the screen's safe edges;
  - Android draws edge to edge.
- **Notifications** ("Egg ready", "Reward waiting", "Daily trail"):
  - at most 2 a day, never 10 pm – 8 am;
  - asked only after the first win, behind the 3-second grown-up hold;
  - a main switch plus one per kind in Parent Area → Settings → SWITCHES;
  - made on the tablet, so nothing is sent anywhere (the privacy policy is now version 1.3).
- **Dress-up room** (tap Pip's house, or Collection → LOOKS → DRESS UP), with a mirror and a camera.
- **Make a scene** (Collection → MY PICTURES → MAKE A SCENE).
- **Adventure Trail** (island → TRAIL): 3 missions a day, stamps, a treasure chest.
- **Bigger challenge** (Parent Area → PROFILES): count to 20, letters to words, 3-step patterns.
- **Bedtime stories** (Storybook → BEDTIME): 3 calm read-aloud stories that end with Goodnight.
- **Jungle Jam songs:** record, play back, keep as a song card.

## Not done / untested
- **Android (needs Android Studio + Java 21):** edge-to-edge drawing, the notification plugin and its permission prompt, the white notification icon, tap-to-open. The billing from Job 18 is still unbuilt too. Expect small fix-ups at the first APK build.
- **Recorded voice lines** for the bedtime stories: they use the device voice for now.
- **The Lite speed check** on a quiet PC (see above).

## What Aaron needs to do
1. Re-run `npm run qa:release -- --only=lite` when nothing else is running on the PC.
2. **Web, now, on a phone held sideways and on a tablet:**
   - no bars anywhere;
   - try each new screen: playgrounds, Pip's house, MAKE A SCENE, TRAIL, Bigger challenge, BEDTIME, Jam songs;
   - add `?locked=1` to check the free version.
3. **Decide:**
   - does the explorer boy get a name?
   - do you want to record the bedtime stories in your own voice?
4. Install Android Studio + Java 21 so the APK can be built and the Android parts tried.

## Checks
- `npm run check`: PASS. It now includes the Job 20 tests, all the Job 19 step tests, and a quick real-Chrome no-bars run.
- `npm run standalone`: PASS.
- `npm run qa:shapes`: 26 screens × 5 shapes, no bars.
