# Overnight report — Job 06 (big build)

**Live game:** https://banx985-gif.github.io/little-legends/ (reload twice to get the new version, offline cache v41)

Every part passed `npm run check` and the one-file build (`npm run standalone`) before it was pushed.
I also opened all 236 screens (every world hub, every mission and every activity) in a real browser:
no errors and no missing pictures.

## What was built

**Part 0 — Art housekeeping**
- The 7 space backgrounds were shrunk from 15 MB to 4 MB. The 7 town backgrounds that arrived during the night were shrunk from 13 MB to 3.7 MB.
- The full-size originals are in `little-legends/_masters_pending/` (git ignores this folder). See "Skipped" for why they aren't in the masters folder yet.

**Part 1 — Space Station (new world, 8 missions, Pip is the guide)**
- Each mission has its own space scene picture, and the moon base is the hub.
- The missions are Build the Rocket, Build a Robot Helper, Count the Stars, The Shape Lab, Control Panel Lights, Moon Rock Samples, Lunch in Space and Tidy the Space Base.
- In the build activities the child drags each part onto a faded picture of that part.
- Other activities: a 5-4-3-2-1 countdown, a launch button, counting stars, more/fewer planets, planet and light patterns, shape slots, sample jars, a lunch plate, and sorting into the locker or the shelf.
- Rewards: 8 space decorations for the island (rocket, rover, satellite, hologram planets, lander and more).

**Part 2 — Busy Town (new world, 8 missions, Pip is the guide)**
- Cowork delivered 7 town scene pictures overnight, so the missions use those instead of a drawn street.
- The missions are Who Helps?, Traffic Lights, Park the Cars, Shopping Day, Deliver the Parcels, Bus Stop, Town Hospital and Building Site.
- New skills it tracks: community helpers and road safety.
- Rewards: town buildings, a fountain, a bus shelter, a traffic light and a Fire Truck ride.

**Part 3 — Dragons (7 rare friends)**
- Finishing every mission in a world hatches that world's dragon on the island, straight after the mission reward. Each dragon has its own special burst.

| Dragon | How to earn it |
| --- | --- |
| Number | Dino Valley |
| Rainbow | Rainbow Village |
| Story | Luna's Storybook |
| Nature | Animal Forest |
| Space | Space Station |
| Puzzle | Busy Town |
| Music | Get each of the 4 Jungle Jam music games right once |

- The Collection has a new DRAGONS tab. Dragons you own have a gold frame and a slow star glow. Dragons you don't own yet show their mystery egg and how to earn them. Dragons can't be bought with stars.
- Dragons glow softly on the island. Nothing flashes.

**Part 4 — Unused art: 489 pictures were unused, now 116**
- The Collection is now a shop with 7 tabs:

| Tab | What it holds |
| --- | --- |
| FRIENDS | 32 new friends: safari, zoo, tropical and wild animals, colour blobs, shape friends |
| LOOKS | 22 new hats, outfits and glasses |
| DECOR | 110 new decorations, including the beach set |
| HOUSES | 27 buildings |
| SEASONS | Autumn, spring and winter sets |
| RIDES | Unchanged |
| DRAGONS | The 7 rare dragons |

- Anything bought now shows up on Wonder Island and can be moved. While moving things, a soft glow shows under them.
- Hats sit on Pip's head. Outfits show in a circle beside Pip, because they can't be drawn onto his body. I also removed the made-up placeholder hat Pip used to get for scarves and boots.
- Pip stands on a gold podium in the Collection. When you win a decoration, it stands on the podium during the island celebration.
- World hubs show a medal as missions are finished: bronze, then silver, then gold, then a trophy.
- Jungle Jam friends on stage get bobbing music notes.
- Gentle background effects were added: fireflies in the storybook, butterflies in Bella's Day, shooting stars in some space scenes, and bubbles while washing.
- 14 new activities were slotted into existing missions, each placed just before the last story step:
  - Meet new animals (elephant, giraffe, panda)
  - Whose footprints? (bear, duck and fox tracks, plus a feather for the owl)
  - Name the feeling (emotion faces)
  - Bathroom things
  - Snow clothes
  - Hot or cold?
  - Set the table
  - Bedtime picture
  - Bunny's bowl (counting)
  - Weather words
  - Number stones 1-2-3
  - Book colours
  - Colour friends
  - Shape friends

**Part 5 — Polish and safety**
- Every mission in every world plays start to finish in the automatic check, including all 16 new missions.
- Every new tap target is at least 110 px. The old smallest was 100 px.
- Nothing new sits within 60 px of the screen edges or under the title.
- The game is letterboxed on tablets, so nothing gets cut off.
- Lite mode: in a headless browser, a space scene draws in about 0.3 ms per frame, the same as the island. Frame rate matched the island at about 29 FPS, which is the headless browser's limit. **Still to confirm on the real iPad** (test item 8).
- New worlds and dragons are never loaded at start-up. Each world's pictures load when you open that world.
- The Collection only loads the things you own, the first page and the dragons. Other pages load as you look at them.
- The offline cache is now v41.
- Older saves keep working. There are no new save fields: dragons are saved as normal friends.

## Skipped, and why

- **Masters folder.** I wasn't allowed to write outside the project. That blocked:
  - renaming the 3 dragon masters
  - copying the space and town originals into `04_ART/MASTERS_FULL_SIZE`

  Please do these yourself:
  - In `04_ART/MASTERS_FULL_SIZE/creatures/dragons/`, rename:
    - `dragon_numbers` → `dragon_number`
    - `dragon_leaf` → `dragon_nature`
    - `dragon_moon` → `dragon_space`
  - Move `little-legends/_masters_pending/worlds/backgrounds/` into `04_ART/MASTERS_FULL_SIZE/worlds/`.
- **Zig Robot.** There's no art for Zig, so Pip guides Space Station. Nothing was invented.
- **"Sort the rubbish" mission.** There are no rubbish pictures (cans, bottles, paper), so Busy Town has other missions instead.
- **Puzzle Dragon.** There's no "logic" world, so I gave it to Busy Town (sorting, matching, traffic-light patterns). Bella's Day has no dragon, because there are only 7 dragons.
- **Busy Town hub.** The train-station scene is used as the hub. The drawn street with building pictures is only a fallback while it loads.

## Art still unused (116), and why

| Art | Why it's unused |
| --- | --- |
| Explorer boy (22) | He isn't in the art bible, so his role needs your decision |
| Pip face and body parts (12) | Rig pieces for future animation |
| 4 small scene pictures: dino_valley_clearing, egg_hatch_cave, welcome_back_dock, wonder_island_path | About 500 px with rounded frames, too small for full-screen backgrounds |
| Ground tiles (6), door and window parts (5), rainbow roof and wall (2) | For a future build-a-house or map feature |
| UI spares: buttons (btn_*), sound icons, speech bubble, place_ok, place_blocked, place_ghost_house, shop, avatars, parent-area icons, world_logic, world_nature, world_shapes, rocket_engine, icon_badge, icon_sticker_book, world_stories | The current screens already have working versions; swapping them is a design choice |
| Candy shapes (4) | Same colours as the shapes already in use |
| Paint drops (6), some effects (beam, egg crack, portal, slime, rings), leaf_swirl, water_drop | No clear spot without adding flashing or clutter |
| egg_farm, egg_ocean, podium_bronze, podium_silver, reward_pedestal, reward_star, star_gold, scroll_certificate, frame_card_blank | Spare reward pieces |
| Bathroom bubbles, tap, water_splash; food_bowl_dino; footprint_paw; dino_egg_nest; plate_paw; letter_stone_a; word_card_apple; maracas (jungle); dino_orange_grin | Duplicates, or no matching activity yet |

## Art to draw next

1. **Zig Robot** (bible 5.8): idle, wave, point, happy, so he can guide Space Station.
2. **Luna Owl and Bella Bear** character pictures. Both are still drawn placeholders in their missions.
3. **Full-size (1920×1080) versions** of the 4 small scenes, plus a **Busy Town main street** hub scene.
4. **A space egg hatch set** (6 frames, like the other eggs). The Space and Story dragons use the moon egg for now.
5. **Rubbish items** (can, bottle, paper, banana peel) for a "sort the rubbish" mission.
6. Pictures that activities already ask for but that have no art yet:
   - Animals: dog, cat, eagle, duckling, bear cub, fox kit
   - Clothes: shoe, sock, swimsuit, sandals
   - Other: leaf, seed, puzzle

## What to test in the morning

1. Open the live link and reload twice. The world map should show **8 worlds**, including Space Station and Busy Town.
2. **Space Station → Build the Rocket.** Drag the parts onto the faded pictures, count down 5 to 1, and tap the launch button.
3. **Busy Town → Park the Cars** and **Who Helps?** Check the town pictures and that the vehicle choices make sense.
4. **Get a dragon.** Fastest way: Jungle Jam. Get one right in COPY BEAT, FAST/SLOW, LOUD/QUIET and WHO MADE IT, then tap BACK. The egg should hatch on the island.
5. **Collection.** Look at all 7 tabs. Buy something from SEASONS, and check it appears on the island and can be moved (MOVE THINGS).
6. **LOOKS.** Try a hat (it goes on Pip's head) and an outfit (it shows in a circle beside Pip).
7. **Finish a mission** and check the reward stands on the podium during the cheer, and that the world hub shows a medal.
8. **On the iPad:** go to Parent area and tap the Performance setting until it says **Lite**, then play a Space mission. Check it stays smooth, and check your existing child profile still has all its rewards.
