# QA report — Job 08 (tablet check and polish)

## Summary

A computer played the whole game in real Chrome at four screen sizes, with touch input. It played every world and every mission from start to finish, plus the island, the Collection (every tab, including Looks) and every Parent area tab. It saved a screenshot of every scene, about 1,300 in all.

It found real problems. All of them are fixed except the ones listed under "Still needs a person with a real tablet". The biggest fixes:

- Pip's speech bubble was hidden behind the instruction banner in every mission.
- There was no way out of a mission once it had started.
- 15 activities had no spoken instruction.
- 13 "Find the …" activities had Pip read out "{target}" instead of the word.
- A child who went offline straight after their first visit lost the pictures for the world they had just played.

The game's own checks pass (`npm run check`), and so does the one-file build (`npm run standalone`).

## How it was tested

| What | Tool | Result file |
| --- | --- | --- |
| Every world, mission, island, Collection and Parent tab, at 4 sizes: iPad 1024×768, iPad 1180×820, Android 1280×800, phone 844×390 | `npm run qa:tablet` | `docs/qa_shots/<size>/` (screenshots), `docs/qa_shots/findings.json` |
| Offline, older saves, Lite mode at 30 FPS | `npm run qa:release` | `docs/qa_shots/release_checks.json`, `docs/qa_shots/release/` |

- `docs/qa_shots/` is git-ignored, so the screenshots stay on this computer only.
- Playwright isn't installed. The scripts use `puppeteer-core`, which was already in the project, to drive the installed Google Chrome. It works the same way: real touch events at real screen sizes.

On each screen, the play-through checks for:

- text that is off-screen, overlapping or too small
- buttons and tap targets smaller than a finger (48 px)
- pictures that are stretched or squashed
- placeholders showing where a real picture exists
- scenes that get stuck
- console errors and network errors

It also checks that:

- every step speaks its instruction out loud
- the instruction repeats after 8 s with no touch
- two wrong answers bring a hint
- the hold-to-leave button works

## What was fixed

### Problems a child would hit

1. **Pip's speech bubble was cut off in every mission.** It sat behind the instruction banner, so you saw text like "Build the Rocke". It now sits under the banner and points at Pip. Long sentences wrap onto two lines instead of being cut off.
2. **No way out of a mission (dead end).** There is now a home button in the top-right corner of every mission and activity.
   - A quick tap only shows "Grown-ups: hold to leave".
   - Holding it for 1.5 s goes back to that world's missions. This is the same idea as the parent gate.
   - Progress is saved, so the mission carries on where it stopped.
3. **15 activities said nothing out loud.** These were the weather, feelings, helping, vocabulary, animal sorting, toy sorting and "your name letter" activities. Pip now says the question shown on screen.
4. **13 activities read out "{target}".** For example, Pip said "Find letter {target}!". Pip now says the real letter, number or thing. When a "find" activity asks for the next thing, Pip says that out loud too.
5. **Instructions now repeat after about 8 seconds with no touch.**
   - Before, they repeated once and then stopped.
   - Now they repeat every 8 s, up to 4 times, then wait for a touch.
   - Story and choice steps in missions repeat too.
6. **Hints after two misses.** Two wrong answers in a row now bring the hint straight away: Pip repeats the instruction and the right object and its place glow. Before, hints only came with time.
   - The Dino Picnic blanket and pattern choices glow after two misses.
   - The "show me" hand animation was never drawn inside missions. It is now.
7. **Finishing a trace skipped the celebration.** Lifting the finger at the end of a trace counted as tapping "continue", so the "well done" moment was skipped. The next step now needs a new tap.
8. **Dino Picnic steps without a voice now speak.** These were the blanket, pattern, egg and home steps. A new step's words also play straight away instead of waiting for Pip's previous cheer.
9. **Placeholder words spilled out of their card.** "SWIMSUIT" was drawn across its neighbours. Placeholder words now shrink to fit their card.
10. **Story cards cut sentences off with "…".** They now show the whole sentence on up to two lines.
11. **Story questions had the wrong heading.** The heading said "Choose what happens next" above questions like "What could Bella wear?". It now says "Pick one!".

### Layout and size

12. **Wonder Island became a pile when full.** After all 8 worlds there are about 50 rewards, and their name tags crossed each other.
    - Name tags now show only when a thing is tapped, has just been won, or is being moved.
    - Things lower on the grass now stand in front of things higher up.
    - A new reward whose usual spot is already covered goes to the nearest free spot. Spots the child chose with MOVE THINGS are always kept.
13. **Collection was hard to use on an iPad.**
    - Tabs are bigger and the item names are larger.
    - PREV, NEXT and BACK are taller.
    - The island's COLLECTION button is taller.
14. **Parent area controls were about 31 px tall on an iPad**, which is too small even for adults.
    - Tabs and every button are bigger.
    - Every control also accepts taps a little outside its edge.
15. **Long button labels overflowed their button.** "+ NEW LEGEND" was one example. Labels now shrink to fit.

### Release

16. **Offline after the first visit.** If the tablet went offline before the background picture download finished, the world just played showed placeholders, even for Pip.
    - On the first visit, the pictures already on screen now go into the offline cache straight away.
    - The new offline cache also looks after the open page, but only on the very first install. Updates still wait for the play session to end, as before.
    - The offline cache version is now **v42**.
17. **Missing favicon.** This was the only console error. There is now a favicon.
18. **Lite mode really ran at about 26 FPS, not 30.** The frame limiter was too strict. Lite mode is now exactly 30 FPS.
19. **Touch could lock up.** If a finger-lift was never reported (for example after a system swipe), every later touch was ignored. A new first finger, or lost touch capture, now clears the stuck one.

## Release checks (automated)

| Check | Result | Detail |
| --- | --- | --- |
| Offline reload after playing a world | **Pass** | Game, profile, Space Station hub and mission all worked with the network off. No pictures missing. |
| Offline straight after the first visit (art still downloading) | **Pass** (failed before the fix: 16 pictures missing, Pip included) | Same as above |
| Save from `08_BUILD_HISTORY` M29 playable fix 1 | **Pass** | 2 profiles, 4 finished missions, 4 rewards, stars, island placement, settings, learning, and the mission in progress at step 3. All kept. |
| Save from the build that is live now (8c11afc) | **Pass** | Same as above |
| Lite mode 30 FPS | **Fixed. Unsure on PC, test on the tablet.** | See below |

**Lite mode 30 FPS**

- **Real bug fixed.** The 30 FPS frame limiter only allowed 0.25 ms of timing wobble. On a normal 60 Hz screen, Lite mode was really running at about 26 FPS (exact test: 25.9). It is now exactly 30 FPS on 60 Hz and 120 Hz screens. `npm run check` tests this.
- **Each world fits the frame budget.** With the PC's CPU slowed 4×, drawing a frame takes 1–26 ms on every world, and 30 FPS allows 33 ms.
- **The PC test itself can't be trusted.** The PC test browser froze for up to 1 s at random moments, on a different world each run. So a weak-tablet test on the real device is still needed.

These checks are shown in **Parent area → RELEASE**:

- "RUN SELF-CHECK" now lists each of these computer checks.
- These tablet checklist items show **"COMPUTER ✓ — CONFIRM ON TABLET"**:
  - offline cold start
  - prior-save migration
  - hint recovery
- "Lite mode 30 FPS" shows **"COMPUTER: UNSURE — TEST ON TABLET"**.
- They all stay *pending*, because these are real-device checks and a person has to tick them.

## Play-through results

Final full run, all four sizes at once:

| Size | Screenshots | Spoken lines | Child checks (8 s repeat, 2-miss hint, hold-to-leave) | Problems left |
| --- | --- | --- | --- | --- |
| iPad 1024×768 | 340 | 363 | 33 of 33 passed | 105, all small (see below) |
| iPad 1180×820 | 327 | 335 | (run on 1024 only) | 47 |
| Android 1280×800 | 326 | 330 | — | 50 |
| Phone 844×390 | 325 | 342 | — | 1,765 (phone is too small, see below) |

- **Every mission played start to finish at every size.** That is all 8 worlds and 46 missions, plus Jungle Jam's 4 music games, the island, Move Things, the Collection (all 7 tabs) and the Parent area (all 7 tabs).
- **No console errors, page errors, failed downloads or stuck scenes on the tablets.** (Before the fixes there were 2 console errors and 7 stuck scenes.)
  - The one stuck activity in the last run was Dino Picnic "Sort the fruit", on 3 of the 4 sizes. It was traced to a lost finger-lift event under heavy load.
  - The input code now recovers from that (see below). The activity then played cleanly when re-run.
- **Every step spoke its instruction out loud.** Before the fixes, 119 mission steps were silent.
- **No stretched or squashed pictures, no pictures off-screen, and no placeholders where a real picture exists.**
- **What is left on the tablets is small:**
  - Name labels overlap in two cases: when Move Things shows every tag at once, and on island items that have no picture, whose placeholder badges always show their name.
  - "★ TO DISCOVER" in the Collection is 10.7 px on the smallest iPad.
  - The tiny colour-blind symbols (● ▲ ■) are small icons on purpose.

**Also fixed during the final run:** the touch code ignored every new touch if a finger-lift went missing. A new first finger, or lost touch capture, now clears the stuck one.

Before and after, at iPad 1024×768: 831 findings before → 105 after. At Android 1280×800: 576 → 50.

## Still needs a person with a real tablet

1. **Voice.** The computer checked that the game asks the tablet to speak every instruction. It can't hear whether the iPad or Android voice sounds right, or whether the volume is right.
2. **Real-device speed.** Lite mode held 30 FPS with the CPU slowed 4× on a PC. Check the weakest real tablet for about 10 minutes, especially in Space Station and Busy Town.
3. **Offline on the installed app.** Add the game to the home screen, play one world, turn on aeroplane mode, then close and reopen the app.
4. **Hold-to-leave.** Make sure a grown-up finds it easily and a toddler doesn't trigger it.
5. **Phone (844×390).** The game is letterboxed, so on a phone everything is about two-thirds of its iPad size. Most buttons there are 36–44 px, below the 48 px aim. Tablets are fine. Making phones bigger would need a new phone layout, so I flagged it rather than changing it.
6. **Pictures still missing.** About 15 Collection items have no picture in `assets/`, so they keep their drawn placeholder (grey shape) and nothing was invented. These are:
   - Bumble Bunny, Sunny Gecko, Moon Moth, Puddle Otter
   - Bee Antennae, Leaf Crown, Explorer Hat, Painter Beret
   - Animal Sign
   - Dino Scooter, Forest Cart, Moon Buggy, Bubble Boat, Jungle Jeep, Cloud Glider

   The Swimsuit, Sandals and "Walk Away" cards also have no picture.
7. **A real child's first go.** The checklist's child tests (ages 2–5) are still open.
