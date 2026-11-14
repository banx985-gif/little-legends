# CC latest — Job 20 (fill every screen + notifications)

- **When:** 2026-11-14
- **Job:** JOB_20_FILL_SCREEN_AND_NOTIFICATIONS (step 2 of the NEXT_CC_ORDER run)
- **Status:** PARTLY DONE. Everything in the game, the checks and the docs is done and tested on the web. The Android parts are written but **not built or tried**, because this PC still has no Android Studio / Java 21.

## Part A — no black bars on any screen
- The game now fills the whole screen on every shape, including under the notch and the gesture bar. The black/blue bars are gone.
- **How it works:**
  - Every screen is still laid out on its 1920×1080 play area.
  - That area is always shown in full, inside the safe area (clear of the notch and the gesture bar), on every shape.
  - The screen around it is drawn too:
    - Backgrounds stretch to cover all of it, trimming a little off their edges.
    - Corner and edge buttons move out to the screen's safe edges: home, BACK, hold-to-leave, Parent, COLLECTION, PLAY / EXPLORE / BUILD, the build tray, the colouring tools / colour dots / right-hand buttons, PREV / NEXT, the JAM / PLAYGROUND doors.
- A phone held sideways (2340×1080) sees exactly the 2340×1080 base size.
- **One choice I made:** the job said "cover" the 2340-wide base. Covering it exactly would cut about a quarter of the width off a 4:3 tablet and hide play items, and tablets are our main hardware. So the play area is always shown whole, and only the background is trimmed. Result: no bars on any shape, and nothing a child needs is ever cut off.
- Touch still lands in the right place on every shape.
- The colouring page keeps its own shape, centred, with the studio background around it.
- The playground roads, sea and sand run to both screen edges, and cars drive off one edge and back on the other.
- **Cheap tablets:** no extra full-screen layers. The Lite pixel cap still holds on wide phones. Lite speed check: PASS (worst frame 16.1 ms of 33 ms; colouring fill 14.8 ms; pictures 89 MB of 100 MB).
- **QA:**
  - New `npm run qa:shapes` opens every screen (20 of them) at 19.5:9, 16:9, 21:9, 16:10 and 4:3, with a fake 40 px notch and a 24 px gesture bar.
  - It fails if any edge row or column is left undrawn (a bar), or if the hold-to-leave button sits outside the safe area.
  - Screenshots go to `docs/qa_shots/shapes/`.
  - All 100 pass.
  - `npm run check` runs a quick version of it in Chrome, plus maths tests for all five shapes.
  - The five shapes were also added to `qa:tablet` and `qa:release` (`--only=shapes`).
- **Android:** the app now draws edge to edge, behind the system bars and the camera cut-out. It stays locked sideways.

## Part B — notifications with on/off switches
- **Kinds:**
  - **Egg ready:** "Pip's egg is wiggling! Come and hatch it 🥚"
  - **Reward waiting:** "A surprise is waiting on Wonder Island! 🎁"
  - **Daily trail:** "Today's Adventure Trail is ready! 🗺️". It's switched off and shows "coming soon" until the Adventure Trail exists (Job 19 step 4).
- **Rules:**
  - At most 2 a day.
  - Never 10 pm – 8 am. One that would land then moves to 8–9 am.
  - Only one waiting per kind.
  - They are scheduled from the save when the game goes to the background or closes, and cleared when it opens.
- **Asking:**
  - Never at first launch.
  - After the first mission win, once the prizes have been shown on the island, a box asks the grown-up: "Want a little ping when Pip's egg is ready, or when a surprise is waiting?"
  - **YES** → hold the button for 3 seconds (the same grown-up check as buying) → the tablet's own question.
  - **NOT NOW** is remembered: it never asks again.
  - If the tablet says no, the switches stay off.
- **Parent Area → Settings → SWITCHES:**
  - one main switch, plus one per kind;
  - saved per child;
  - turning a switch off cancels anything already waiting.
- **Tapping a notification:**
  - Egg → that child's mission with the egg (or the island).
  - Reward → Wonder Island, where the prize is shown.
  - If it isn't clear which child it's for, "Who is playing?" comes first, then the screen.
- **"A surprise waiting" needed something to point at,** so prizes won at the end of a mission are now remembered until the island has shown them. If the game closes before that, the island shows them next time.
- **Older saves** get the defaults: the main switch is off until permission is given, egg and reward are on, and trail is off.
- **Android:** `@capacitor/local-notifications` 8.3.1. Small white status-bar icon made from Pip's outline (no new art). POST_NOTIFICATIONS permission. Inexact alarms only.
- **Web:** the browser's notifications, only while the game is open in the background, and only if allowed. A tap brings the game forward. Otherwise it does nothing quietly. The one-file test build has no notifications.
- **Privacy (policy version 1.3):** the in-game PRIVACY tab, `privacy.html`, `docs/PRIVACY.md` and the Data-safety notes in `docs/GOOGLE_PLAY_STEPS.md` all say the reminders are made on the tablet and send nothing anywhere. The PRIVACY tab's left list also used to run past its panel; it fits now.
- **Event kind:** none added. There is no event system, and I don't think one is needed.

## Checks
- `npm run check`: PASS. New Job 20 tests: the five shapes, safe areas, background cover, touch mapping, Lite cap, the 2-a-day cap, quiet hours, switches cancelling, no ask at first launch / the ask after the first win, NOT NOW, tap routing, old saves, the web with no permission, and the island ask.
- `npm run standalone`: PASS.
- `npm run qa:shapes`: 100/100 PASS.
- `qa:release --only=lite`: PASS.

## Untested (needs the Android build)
- Edge-to-edge drawing and the real notch/gesture-bar sizes on a real phone.
- The notification plugin, its permission prompt, the white icon, and tap-to-open.
- Expect a small fix-up at the first APK build (same as Job 18's billing).

## What Aaron needs to do
- **Web, now:** open the game on a phone held sideways and on a tablet. There should be no bars anywhere, and the corner buttons should sit near the edges. Try Wonder Island, a world map, a mission, colouring and a playground.
- **After the first APK:**
  1. Finish a mission and answer YES to the reminder box.
  2. Put the tablet down with an egg ready. A reminder should come about 3 hours later (never at night).
  3. Tap it.
  4. Check Parent Area → Settings → SWITCHES.

## Commit
- See `git log` ("Job 20"). Pushed. No APK (Android Studio / Java 21 still missing).
