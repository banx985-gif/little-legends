# Job 12: Finish line

## In short
- **Pictures:** every delivered picture is now in the game. The only ones left out are the explorer boy, the Pip rig parts and the 4 small scene cards.
- **No grey placeholders:** children never see a grey box or a word card in place of a picture.
- **Missions:** every one of the 8 worlds has 8 or more Little Missions, a world prize and a clear "world complete" moment.
- **Android app:** built and ready to try on a tablet (not published).
- **Google Play:** a plain-English guide covers what's left for you.

## 1. Every picture used
`npm run art:unused` went from **42 unused to 0**. The 30 left out on purpose are unchanged.

| Pictures | Where they are now |
| --- | --- |
| `pip_back`, `fx_portal` | Tap a world card: Pip turns round and steps into a glowing portal (half a second) before the world opens. |
| `dino_orange_grin` | Baby T-Rex grins while you tap it on Wonder Island. |
| `speech_bubble` | Tap a friend on the island and it says hello in a bubble: "Roar!", "Moo!", "Tweet!", "Blub!"… |
| `fx_beam_pink` | A soft light beam behind the gold trophy when a whole world is finished. |
| `fx_egg_crack` | A flash of light on the egg with each tap while it hatches (Rory's Dino Picnic). |
| `fx_slime_splat` | Green paint splats in the new green painting game. |
| `ring_green` / `ring_purple` / `ring_red` | Jungle Jam: each friend on stage stands in a light ring of its colour that pulses with the beat. |
| Bathroom `bubbles`, `water_splash`, `fx_sparkle_gold` | Washing games: each spot you wash pops a bubble, splash or sparkle, taking turns. |
| `number_tile_blank` | Number-line games: every number sits on a tile. |
| `food_bowl_dino`, `footprint_paw`, `dino_egg_nest` | The new Dino mission **Rory's Nest Check**: which nest has an egg, whose footprint, which bowl is Rory's. |
| `letter_stone_a`, `word_card_apple` | The new Storybook mission **A is for Apple**. |
| `maracas` (jungle) | Jungle missions ("Which one do we shake?" and others). |
| Candy shapes (4) | The new Rainbow mission **Sweet Shape Shop**. |
| `scroll_certificate`, `frame_card_blank` | A finished world's hub shows a certificate: the world's picture in the gold frame, on the scroll, with "ALL DONE!". Tapping it makes Pip cheer. |
| `icon_badge` | A finished world gets a badge on its card on the world map. |
| `egg_farm`, `egg_ocean` | Pictures on the first page of **Farm Morning** and **Octo's Sea Friends**. Those friends hatch from that egg. |
| `star_gold` | The last page of a mission shows the stars you just earned (first time only). |
| `reward_star` | **Bella's Golden Star**, the prize for finishing all of Bella's Day, which has no dragon. |
| `reward_pedestal` | New decorations and houses stand on it when they arrive on the island. Rides keep the podium. |
| `btn_home`, `btn_play`, `btn_settings` | The hold-to-leave home button in missions; the play button on each child's card; the settings icon in the Parent Area. |
| `child_hungry`, `child_surprised` | The feelings games ("How does Bella feel?"). |
| `world_logic`, `world_nature`, `world_shapes`, `world_stories`, `rocket_engine` | Mission card pictures. **Every** mission card in every world now has a picture, not just Space and Town. |

## 2. Placeholders closed
Fixes are listed in `docs/STILL_TO_DRAW.md`.
- **Word cards → pictures.** About 20 game choices showed a word on a card because there was no picture. They now use pictures that exist:
  - "How does Bella feel?" uses the face pictures.
  - "Help each animal find its home" (den, burrow, nest) replaces "match the baby animal".
  - Pig, parrot, shorts, sunglasses, teddy, plate, toy box and towel stand in where the old words had no picture.
- **9 rewards got an existing picture:**
  - Prism Butterfly → glowing butterflies
  - Moon Buggy → the space rover
  - Star Trike → Star Bike (the bicycle)
  - Fossil Arch → Fossil Footprint
  - Volcano Lamp → Dino Picnic Bowl
  - Feather Mobile → Big Feather
  - Letter Kite → Letter A Stone
  - Weather Spinner → Rainy Day Umbrella
  - Shape Garden → the shape sorter board

  Ids are unchanged, so children who already own them keep them.
- **43 rewards with no fitting picture are hidden** until they're drawn: 8 friends, 17 of Pip's looks, 17 decorations and 1 ride. They're never offered or drawn, but saves keep them. The list is in `docs/STILL_TO_DRAW.md`.
- **Baby Pterosaur** was one of those hidden. Its mission, "Giant Beds", now gives the **Giant Dino Bed**.
- Still drawn stand-ins (not grey):
  - Luna and Bella. The art bible says the generic owl and bear must look different from them.
  - Some plain coloured shapes.

## 3. Content: every world finished
| World | Missions | World prize |
| --- | --- | --- |
| Dino Valley | 11 (+1: Rory's Nest Check) | Number Dragon |
| Rainbow Village | 8 (+3: Sweet Shape Shop, Octo's Sea Friends, Colour Splash Day) | Rainbow Dragon |
| Space Station | 8 | Space Dragon |
| Animal Forest | 8 (+3 farm missions: Farm Morning, Muddy Piglet, Moo Moo Parade) | Nature Dragon |
| Jungle Jam | **8 new** + the Jam | Music Dragon (finish the missions **or** the 4 Jam games) |
| Luna's Storybook | 8 (+3: A is for Apple, Luna's Moon Story, Word Builders) | Story Dragon |
| Bella's Day | 8 (+3: How Do I Feel?, Bedtime for Bella, Tidy-Up Helpers) | **Bella's Golden Star** (new) |
| Busy Town | 10 | Puzzle Dragon |

- **69 missions in all** (was 48), with 64 new activities built from the existing activity families. No new kinds of game.
- **Easier first, harder later:** inside each world the new missions start easy (tap one thing, count 2–3) and get harder (4–6 items, patterns like drum-shake-shake, putting letters A–D in order, 4-beat rhythms).
- **New friends to win:**
  - Little Chick, Little Piglet, Little Calf. These use the farm pictures that were never rewards.
  - Rainbow Fish.
  - Lion Cub.
  - Missions that hand out a Collection thing also give their Discovery Stars.
- **Jungle is a world like the others now:**
  - Its card opens a mission hub, with a big **JUNGLE JAM** button bottom right.
  - The Jam's BACK button returns to the hub.
- **"World complete" moment:**
  - The last mission shows the gold trophy under the rainbow arch, with a light beam and the stars.
  - The world's prize (dragon or Golden Star) arrives on the island.
  - The hub shows the certificate, and the world map shows a badge.
- **First 10 minutes for a new child:**
  - On the island, DINO PICNIC glows softly and Pip says "Let's go on a Dino Picnic!" until the first mission is done.
  - After that, EXPLORE WORLDS glows once.
  - The path: profile → island → Dino Picnic → the egg hatches → Baby Raptor on the island.

## 4. Release-ready
- **Child side:**
  - No test or debug buttons. The test tools, release checklist and picture stats are all behind the Parent Gate.
  - The `?scene=` web address shortcut used by the QA scripts stays; a child can't reach it, and the app doesn't use web addresses.
- **Privacy:**
  - The Parent Area → PRIVACY tab now lists exactly what is kept on the tablet, and says that **nothing leaves the device**.
  - A public `privacy.html` page says the same thing; it's the link Google Play needs.
  - `docs/PRIVACY.md` is updated to match.
- **App name, icon, splash and home-screen install:**
  - New icons from Pip's waving picture on the game's sky blue: normal and "maskable" for Android home screens, an iPhone/iPad icon, and the Play Store icon.
  - The loading screen shows Pip waving and "Magic World".
  - The install manifest has a proper description and categories.
- **Older tablets:** a small fallback for the rounded boxes, for tablets whose built-in browser is a few versions behind.
- **Android app** (`app-android/`, Capacitor 8.5):
  - `npm run build` makes `app-android/dist/LittleLegends-debug.apk` (80 MB).
  - Everything is inside, so it works offline from the first launch.
  - Only the INTERNET permission, which the web view needs to show the built-in game (the game sends nothing). No camera, microphone, location or storage access. No cloud backup, landscape, full screen, and the Android back button does nothing.
  - I tried to start it on an Android emulator. The download was stopped when the PC ran low on memory, so the APK is built but **not yet tried on a device**. The first install on a tablet is the real test.
  - `npm run build:release` makes the Google Play bundle once you have an upload key.
  - Not published.
- **`docs/GOOGLE_PLAY_STEPS.md`:** everything only you can do (account, upload key, Families policy, content rating, data safety, screenshots, privacy link, testing tracks).

## 5. Checks
- **`npm run check` passes.** The new Job 12 block checks:
  - every picture is used;
  - every world has 8+ missions, a world prize and a picture on every mission card;
  - no shown reward lacks a picture, and hidden rewards are never offered or drawn;
  - mission activities show pictures, not word cards;
  - the Jungle hub and Jam round trip, and the certificate and badge;
  - mission stars, the privacy lists and the install icons;
  - the Android app's permissions and backup setting.
- **`npm run standalone` passes.** I also fixed a bug: the one-file build didn't understand the new fallback file's `import` line.
- **Tablet QA play-through** (`npm run qa:tablet`, Android 1280×800):
  - It played every mission in Dino Valley, Rainbow Village, Space Station, Animal Forest and the new Jungle missions, plus all 5 Jam modes, and the start of Storybook. That's 325 screenshots, with no stuck screens seen.
  - Then the PC ran low on memory and Claude Code stopped it, so Bella's Day, Busy Town, the Collection and the Parent Area weren't re-played this time.
  - Re-run it when the PC is free: `npm run qa:tablet -- --only=android`.
- **Low-end check** (`npm run qa:release -- --only=lite`, Job 10 budgets):
  - Now it also measures Jungle, the island, the Collection and the Jam, and checks picture memory stays within Lite's 100 MB.
  - **Not run** this time because of the memory problem above. Please run it once.
- **Fixed after looking at screenshots:**
  - the world-complete light beam glowed over the story card's words;
  - the settings icon floated on its own.
- **Offline cache:** v47.

## What only you can do
- **Draw:** the 43 hidden rewards; Luna, Bella and Zig model sheets; the coloured shapes still drawn. See `docs/STILL_TO_DRAW.md`.
- **Test with children:** play the new missions with a 2-year-old and a 5-year-old. Is anything too hard or too easy, or confusing without reading?
- **Google Play:**
  - the developer account;
  - the upload key;
  - the Families/target-audience, content-rating and data-safety forms;
  - tablet screenshots and a feature graphic;
  - 12 testers for 14 days.

  All of it is in `docs/GOOGLE_PLAY_STEPS.md`.

## What to test on the tablet
1. **Install the app:** copy `app-android/dist/LittleLegends-debug.apk` to a cheap tablet (Tab A7 Lite / Fire HD 8 if you have one) and install it.
   - Does it open?
   - Is it landscape and full screen?
   - Does it play with **Wi-Fi off**?
   - Does the back button do nothing?
   - Is the icon Pip?
2. **New child, first 10 minutes:**
   1. Make a profile. DINO PICNIC should glow and Pip should say "Let's go on a Dino Picnic!".
   2. Play it. Tapping the egg shows a crack of light, then Baby Raptor arrives.
   3. Back on the island, EXPLORE WORLDS should glow.
3. **Tap a world card:** Pip turns and steps into a portal for half a second.
4. **Jungle:** the card opens 8 missions with a JUNGLE JAM button. Play one, then try the Jam; BACK returns to the Jungle missions. In the Jam, friends on stage stand in coloured rings.
5. **New missions:** try at least one each.
   - Sweet Shape Shop, Octo's Sea Friends (sea egg → Rainbow Fish), Colour Splash Day (green splats).
   - Farm Morning (farm egg → Little Chick), Muddy Piglet (wash bubbles/splashes).
   - A is for Apple, How Do I Feel?, Bedtime for Bella, Rory's Nest Check.
6. **Island:** tap Baby T-Rex (it grins and says "Roar!") and other friends (hello bubbles). New decorations arrive on the pedestal.
7. **Finish a world** (any): gold trophy, light beam and stars, then its dragon (or Bella's Golden Star). The hub shows the certificate; the world map shows a badge.
8. **Collection:** no grey boxes on any tab.
9. **Parent Area → PRIVACY:** the "What is kept on this tablet" list reads well.
10. **Smoothness:** with Parent Area → DATA → Picture stats on, look for about 30 FPS and picture memory under about 100 MB on the cheap tablet. Screenshot it for me.
