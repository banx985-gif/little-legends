# Job 13: Real sounds in place of the beeps

All 80 of your sound files are now in the game and committed (`assets/audio/`).
- `data/sound_map.json` says which file plays for what.
- The old built-in beeps and synth music stay as the **fallback**. That covers a missing file, an old browser that can't play Ogg (old Safari), and the one-file test build.

## What you'll hear
- **Every button press:**
  - tap, button, page and tab sounds;
  - a soft "back" on the home pictures;
  - "start" on PLAY and the next-mission arrow.
- **Activities:**
  - picking up and dropping;
  - pieces that click into place (shape, build and puzzle games);
  - a pop when you tap the thing asked for;
  - splashes in washing games, pops in painting;
  - a munch when you feed fruit (a dino munch in Dino Valley);
  - three different "correct" sounds and two gentle "try again" sounds (never a buzzer);
  - counting goes up a little in pitch with each number.
- **Missions:**
  - a page turn between story pages (a whoosh outside Luna's Storybook);
  - a soft dino roar, rocket, bell or parrot on a world's first page;
  - the trophy fanfare and a star "ding" for each star earned on the last page;
  - egg cracks while you tap the egg, and a reveal when it hatches.
- **Island:**
  - each thing you tap has its own sound: Baby T-Rex roars (**the big T-Rex roar plays at about half volume**), chickens, parrots, monkeys…;
  - creatures without their own sound chirp or chatter;
  - rides honk, the ball and slide bounce, the pond splashes, decorations sparkle;
  - dragons arrive with the big win sound.
- **World map:** the portal sound as Pip steps in.
- **Collection:**
  - unlock and coin when you discover something with stars;
  - a sticker sound when you tap something you own;
  - a treasure chest for a dragon.
  - A world certificate plays the level-up sound.
- **Animal sounds in "Who makes that sound?":** the real recording plays first, then Pip says the word.
  - Chicken, parrot, monkey and the dinos have recordings.
  - Cow, cat and the rest have none yet, so you'll only hear Pip's words for those.

## Music and ambience
| Where | Music | Quiet bed under it |
| --- | --- | --- |
| Who is playing? | menu | — |
| Wonder Island, Collection | island | beach |
| World map | adventure | — |
| Dino Valley | dino | forest |
| Rainbow Village | rainbow | sea |
| Space Station | space | — |
| Animal Forest | forest | forest |
| Jungle | jungle | birds |
| Luna's Storybook | storybook | — |
| Bella's Day | life | birds |
| Busy Town | town | — |
| Quiet mode (Parent Area) | calm | — |

- **Streaming, not decoding:** music and ambience **stream** through an audio player, so a 3-minute track never sits decoded in memory.
- **Changing tracks:** tracks crossfade over about 1 second when you change world.
- **Speech:** the music still dips while Pip speaks.
- **Lite mode:** the ambience bed is **off**.

## Jungle Jam
- **Opening the Jam:** the 6 band stems load (banjo, recorder, drum, tambourine, accordion, mandolin). They start together and loop in step.
- **Playing:**
  - Each band friend on the stage turns its stem up: Tiko drum, Bo banjo, Mimi recorder, Zuzu tambourine, Kiki accordion.
  - With 4 or more friends on stage, the mandolin joins.
  - FAST/SLOW speeds the band up or slows it down.
  - LOUD/QUIET changes the volume.
- **Leaving the Jam:** the stems are let go, so the memory comes back.
- **Fallback:** if the stems can't load, the old synth notes play.

## Kid-safe levels
- Sound effects are always quieter than Pip's voice; each has a level in the sound map, never above 0.8.
- No more than **4 effects** play at once. A sound is skipped if the same one played less than **60 ms** ago, so rapid tapping doesn't blare.
- The parent volume sliders, quiet mode and mute still control everything; all sounds go through the existing channels.

## Cheap tablets
- **What loads when:**
  - The core effects (about 26 short files) decode at the first touch.
  - Everything else decodes when a scene or world that uses it opens; animal sounds load the first time an animal is tapped.
  - **In Lite mode**, sounds for a world you've left are let go again.
- **Lite mode also runs the audio engine at 24 kHz.** That halves the memory of every decoded sound, and the Jam goes from about 35 MB to about 17 MB.
- **Measured in Chrome (normal mode):**
  - about **9 MB** of decoded sound on the island;
  - about 12 MB after visiting a few worlds;
  - about 35 MB while the Jam is open;
  - back to about 12 MB after leaving it.
- **The Picture stats overlay** (Parent Area → DATA) now shows **MB sound** too.

## Offline
- **Up front:** the core effects, the sound map and the voice list are in the offline cache.
- **On first play:** music, ambience and the other sounds are cached the first time they play. That cache survives updates, like the pictures.
- **Audio players:** they ask for parts of a file, and the cache answers those properly.
- **Offline cache:** **v50** (v49 at the Job 13 commit; v50 adds the QA fixes).

## Credits
Parent Area → DATA now ends with the credits line: "Credits — sounds: Epic Stock Media (Vibrant Game, Pirate Game), Sonniss GDC 2026 / 344 Audio, TomMusic."

Please still check the TomMusic pack's ReadMe before the Play Store release (see the sound intake notes).

## Still missing
These are the same gaps as in your intake notes:
- moo and meow;
- train, fire truck and real car horns;
- the character voices;
- single instrument notes.

The game keeps Pip's spoken words or the synth tones there. Recorded voice lines can now be dropped in (Job 14 and `docs/VOICE_LINES.csv`).

## Checks
- **`npm run check` passes.** The new Job 13 block checks:
  - every file in the sound map exists, and every delivered sound is used;
  - effects stay below the voice level, and the T-Rex roar is quieter;
  - the tones play when nothing is decoded;
  - at most 4 effects play at once, and a repeat within 60 ms is skipped;
  - Lite lets go of sounds; music streams;
  - the Jam stems are let go;
  - core sounds are cached offline, and music is cached with byte ranges;
  - the credits and the "MB sound" stat are there.
- **`npm run standalone` passes.** Offline cache v50.
- **In real Chrome:**
  - core effects decode at the first touch;
  - island music and the beach bed stream;
  - Dino Valley switches to the dino track;
  - the Jam's 6 stems load, play and are let go on leaving;
  - quiet mode switches to calm;
  - no console errors.

### Re-runs after Jobs 13 and 14 (the ones the memory stop cut short)
**Tablet QA play-through, Android 1280×800 (`npm run qa:tablet -- --only=android`)**
- It was run one world at a time, because the PC was short of memory.
- **All 8 worlds played start to finish: every mission, plus all 5 Jungle Jam modes, the Collection tabs and the Parent Area.**

| World | Screenshots | Findings |
| --- | --- | --- |
| Dino Valley | 97 | 11 name tags too small → **fixed** (tags keep full size whatever the depth) |
| Rainbow Village | 71 | 0 |
| Space Station | 69 | 1: the moon-base background hadn't finished loading when the hub was photographed (slow loading on the busy PC; it appears a moment later) |
| Animal Forest | 71 | 2 "aborted" music downloads: the music player cancels its download on a track change, which is normal. The QA script now ignores that case. |
| Jungle (missions + Jam) | 77 | 0 |
| Luna's Storybook | 72 | 0 |
| Bella's Day | 76 | 0 |
| Busy Town | 84 | 1: two name tags overlapped in MOVE THINGS mode → **fixed** (only the thing being moved shows its tag) |

- The new next-mission offer appears after every mission's reward; the run takes the home button each time.
- The Job 14 navigation was followed throughout: home pictures go to the island, and the Jam's home goes to the island.

**Low-end Lite check (`npm run qa:release -- --only=lite`, CPU slowed 4×, now also the island, Collection and Jam)**
- **Picture memory: PASS.** At most 88 MB (town hub) against Lite's 100 MB budget.
- **Frame time: FAIL, but only because the PC was swapping.**
  - Free memory was 0.3–0.9 GB the whole time, with Unity, WSL and other programs open.
  - Two runs gave wildly different numbers for the same screens: island 64 ms, then 19 ms; jungle hub 14 ms, then 38 ms; storybook stalled with 0 frames in the first run.
  - In the second run every screen ran about 40+ frames per second, and most frames took 11–28 ms of work. The check's strict line is 16.7 ms, half of the 33 ms a 30 FPS frame allows.
  - **To make sure Jobs 13–14 didn't slow anything down,** I ran the Job 12 build and this build side by side, Lite mode, CPU 4× slower, twice each.
    - The island draws *faster* now: p95 8–10 ms against 16–39 ms (fewer things on it).
    - The Collection and the world hubs are about the same (13–29 ms against 12–82 ms, all noisy).
  - **Please run `npm run qa:release -- --only=lite` once with Unity and WSL closed,** and look at the picture-stats overlay on the real tablet. The Job 10 runs on a quiet PC passed with plenty of room.

**Android app rebuilt:**
- `app-android/dist/LittleLegends-debug.apk` (80 MB).
- It contains all 80 sounds, the sound map and all the Job 13 and 14 code.
- It still needs its first try on a real tablet.

## What to test on the tablet
1. **First touch:** music starts on "Who is playing?". On the island you hear the island tune and soft waves. Tap things: each has its own sound, and Baby T-Rex's roar is gentle.
2. **Play Dino Picnic:**
   - pick up/drop sounds;
   - counting pitch going up;
   - munching fruit;
   - egg cracks and the hatch reveal;
   - the trophy fanfare and star dings at the end.
3. **Change world:** the music crossfades; Storybook pages turn with a page sound.
4. **Jungle Jam:** drag friends onto the stage. Each adds a real instrument and they stay in time; 4 friends bring the mandolin. Try FAST/SLOW and LOUD/QUIET.
5. **Mash the screen fast:** sounds shouldn't pile up into a racket.
6. **Parent Area:** quiet mode switches to the calm track; the music and voice sliders still work.
7. **Wi-Fi off after a play session:** the sounds you've heard still play.
8. **Picture stats on:** read the "MB sound" number on the island and in the Jam, and send me a screenshot.
