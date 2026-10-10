# Job 14: Fixes from the tablet playtest

The rule for all of it: a 2–5 year old can't read and won't find a menu. Tapping the big obvious thing must always work, and things should carry on by themselves.

## 1. Activities move on by themselves
- **One big PLAY button.** The island's "DINO PICNIC" button is now **PLAY**. It always starts the child's next mission:
  - a mission left half-way first;
  - otherwise the next unfinished one: Dino Picnic first, then the rest of Dino Valley, then the next world on the map;
  - with everything finished, the next mission anyway, so play never stops.
- **Inside a mission:**
  - A finished activity moves on by itself after **3 seconds**; the hatching egg gets 5.
  - A story page moves on after **7 seconds**, by which time Pip has said it.
  - Tapping still moves on straight away.
- **After the reward:** when a mission ends, the reward is celebrated on the island as before. Then the screen dims and shows **two huge picture buttons with no words**:
  - a **home** button: stay on the island and play there;
  - a big green **play arrow** with a yellow ring that fills up. When it's full (6 seconds), the next mission starts by itself.
- **Free-play activities** (the activity screen outside missions) end the same way:
  - two big round picture buttons, home and next, in place of the old ISLAND/NEXT word buttons;
  - next starts by itself after 5 seconds.
- **The "variant picker":** a child no longer has to go through the world list to get a new picnic.
  - The world map and mission lists are still there for choosing on purpose.
  - Every mission card has a picture, and the next one to play bounces.

## 2. Navigation, screen by screen
| Screen | Main action | What changed |
| --- | --- | --- |
| Who is playing? | Tap your card | Unchanged; the card already has a big play picture (Job 12). New profiles need a grown-up to type a name. |
| Wonder Island | **PLAY** | Renamed from DINO PICNIC; always goes to the next mission. It glows for a new child. After 5 s with no touch it bounces and Pip points at it. |
| Next-mission offer (new) | Big play arrow | Starts by itself. The other choice is a big home button. |
| World map | The world with your next mission | That world's card bounces after 5 s and Pip points at it. **BACK** (a word) is now a **big round home picture** that goes to the island. |
| A world's missions | The next unfinished mission | Its card bounces after 5 s and Pip points. The home picture goes straight to the island; it used to go back to the world map. |
| Mission | Big play/CONTINUE button | Moves on by itself (part 1). After 5 s the button bounces and Pip points at it. The grown-up hold-to-leave home button is unchanged. |
| Activity finish | Big next arrow | Home and next pictures, no words; next starts by itself. |
| Collection | Tabs (with pictures) | The home picture replaces BACK. Tapping something you own now also puts it on Wonder Island (see part 3). |
| Jungle Jam | Drag friends onto the stage | The 5 mode buttons now have pictures (drum, sloth, speaker…), not just words. The home picture goes to the island. Pip moved to the corner so he no longer covers the first band friend. |
| Parent Area | Grown-ups only | Unchanged (behind the hold-to-open gate). |

There are no dead ends: every screen outside a mission has the round home picture top-left, and every mission has the hold-to-leave home button.

## 3. Wonder Island placement
- **Spots on the grass:** things now go to proper spots.
  - Each spot is inside the green, clear of the portal, Pip's house, Pip and the three big buttons.
  - A thing goes to the nearest spot where it **doesn't overlap** anything else (trees, pond, slide, houses and the other friends).
- **Further back looks further away:** things are drawn a little smaller near the back (70% at the back, 90% at the front) and behind the ones in front.
- **No piles:** at most **10** things the child didn't place by hand stand on the island.
  - The newest wins go first, and anything just won always shows.
  - Things the child moved by hand always stay where they were put.
  - **Tapping an owned friend or decoration in the Collection puts it on the island** ("… is on Wonder Island!").
  - A child with 100 rewards gets a tidy island, and the cheap tablet draws fewer pictures.
- **Dragging:** a thing grows or shrinks as it's dragged forward or back.

## 4. Characters never cover things to tap
- In every activity, Pip is now drawn **underneath** the things to tap and the drop targets, so a dragged apple is never hidden behind him.
- **Pip steps aside:**
  - The game checks Pip's spot against every tappable thing and target.
  - If anything would be under him, he moves to a free corner (bottom right, or small in a corner).
  - Before, 32 of the 250 activities had something under Pip (mostly the counting games). Now there are **0**, and `npm run check` tests all 250.
- Rory, Octo, Luna and Bella stand small in the bottom-right corner on steps where the child taps things: the picnic blankets, the pattern, the egg, the new home.
- The creatures in counting games (bunny, dino) were already drawn behind the fruit and basket, and never covered a target.

## 5. Voice
- **Short term:**
  - The game now picks the friendliest voice the tablet has: natural/neural/Google voices first, then a female English voice, then Australian, British or American English.
  - It speaks a little slower (0.9) and a little higher (1.12).
  - It only uses **voices that run on the tablet itself**. An online voice would send the words to a server, and the game promises nothing leaves the tablet.
  - The one long line ("Some vehicles drive on the road…") is now "Road, sea or sky? Put each one where it goes."
- **Recorded voice:**
  - The game now plays `assets/audio/voice/pip/<line_id>.ogg` when that recording exists, and the tablet's voice when it doesn't.
  - Each line's id comes from its words, for example "Let's go on a Dino Picnic! …" → `lets_go_on_a_dino_picnic_953a4`.
  - Only a few recordings are kept in memory at once.
- **`docs/VOICE_LINES.csv`:** every spoken line, **478** of them (character, line_id, text, where it's used), ready to send for recording.
- **After adding recordings:** run `npm run voice:lines`. It updates the CSV and `assets/audio/voice/index.json`, the list of recordings the game knows exist.
- Lines with the child's name in them are made on the fly and always use the tablet voice.

## Checks
- `npm run check` passes. The new Job 14 block checks:
  - story pages and finished activities move on by themselves;
  - the next mission starts after the reward, home stays, and PLAY starts the next one;
  - the free-play finish moves on by itself;
  - no BACK words on the child screens;
  - hub home goes to the island, and Pip points after 5 s;
  - a full island doesn't pile up and stays clear of the buttons;
  - Pip covers nothing in all 250 activities;
  - recorded voice lines play their file;
  - the voice-lines list exists.
- `npm run standalone` passes. Offline cache **v48**.
- After Job 13 the full tablet QA play-through was re-run on all 8 worlds. It played every mission, followed the new navigation and saw the next-mission offer; the two findings were fixed. Details are in `docs/JOB13_REPORT.md`.
- The Lite check passes in full: picture memory at most 88 MB, frame work at most 6.8 ms on every screen with the CPU slowed 4×. See `docs/JOB13_REPORT.md`.
- The APK is rebuilt with Jobs 13 and 14.

## What to test on the tablet
1. **New child:** tap PLAY (no reading needed). In Dino Picnic, don't touch anything after a step: it should move on alone. Story pages go on after about 7 s, finished activities after about 3 s.
2. **After a mission:** the reward shows, then two big buttons. Leave it: the ring fills and the next mission starts. Try again and tap home: you stay on the island.
3. **Leave the island alone for 5 s:** PLAY bounces and Pip points at it. Do the same on the world map (the next world's card bounces) and on a world's mission list.
4. **Home pictures:** world map, mission list, Collection and Jam all have the round home picture top-left, and it goes to the island.
5. **Island with lots of rewards:**
   - friends spaced out, none on the portal, Pip's house or the buttons;
   - further-back ones smaller;
   - tap an owned friend in the Collection, then go home: it's there.
6. **Counting games (feed Rory 5 fruit, bunny apples…):** Pip stands in the bottom-right corner, never on the fruit; drag fruit over where he was.
7. **Voice:**
   - Does the voice sound better than before?
   - Tell me which voice the tablet picked: Parent Area → DATA, or just describe it.
   - On a Fire tablet, check speech still works.
