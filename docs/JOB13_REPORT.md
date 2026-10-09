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
- **Offline cache:** **v49**.

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
QA_PLACEHOLDER

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
