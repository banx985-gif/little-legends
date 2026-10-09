# Job 10: Glitchy pictures on cheap tablets, and using all the art

## Part 1: Glitchy pictures on low-end Android

### What was causing the glitches, and the fix for each

| Cause | Fix |
| --- | --- |
| **Pictures dropped while still in use.** When more than 140 pictures were loaded, the game let go of everything the next screen hadn't listed. That happened *before* the new screen opened. Pictures that screen fetched on demand then flickered back in. | Pictures are only let go **after** the new screen is showing, and only when picture memory is over budget (High 260 MB, Balanced 170 MB, Lite 100 MB). The budget is now counted in megabytes, not number of pictures. The game also remembers what each screen actually drew and loads those in advance next time. Nothing a screen is drawing is ever released while it is on screen. |
| **Too much picture memory for a weak GPU.** Every picture was decoded at full file size. | Pictures are decoded at the size they are drawn on this screen (`createImageBitmap` with resize, `AssetLoader.drawnSize`). An ImageBitmap keeps its decoded pixels, so Android Chrome can't silently throw them away and re-decode them mid-frame. Released pictures free their memory at once with `close()`. |
| **Canvas too big.** DPR 2 on a 1340×800 tablet gave a 2680×1600 canvas, about 4.3 million pixels. | Each mode now has a canvas pixel cap (Lite 1.5 M, Balanced 2.4 M, High 4.2 M) on top of the DPR cap. On the emulated Tab A11+, Lite gives a 1585×946 canvas, DPR about 1.18. |
| **Full-screen backgrounds rescaled every frame.** | Backgrounds are drawn once into a screen-sized layer and copied 1:1 after that (`drawFullScreen`). |
| **Glow / blend modes (`screen`) are slow or glitchy on some Android GPUs.** | In Lite mode, glows draw with plain see-through alpha instead. |
| **Pictures drawn before they finished decoding.** | Already handled: every picture waits for `decode()` before the game can draw it, and bitmaps are fully decoded. |
| **Lite mode was never chosen automatically at start-up.** | **Auto mode** now starts in Lite on low-memory devices (`navigator.deviceMemory` ≤ 4 GB). It also runs a first-second test once the first real screen opens: below 24 FPS → Lite, below 42 FPS → Balanced. The slowest mode a device needed is remembered on that device. A parent can still pick High in Settings → Performance. |
| **Pip's speech bubble dropped every letter "s".** "Three buses!" showed as "Three bu e !". This was a typo from Job 08. | Fixed, with a check. |

### Tested in Chrome as a budget tablet

Settings: 1340×800, DPR 2, 4 GB, CPU 4× slower.

| Check | Result |
| --- | --- |
| Lite mode | Switched on by itself |
| Frame rate | 28–30 FPS (Lite's target is 30) across the island, build mode, town hub, the six new activities, painting, bathroom, Collection, profiles and Parent Area |
| Picture memory | 29 MB (60 pictures) on the island; 88 MB (149 pictures) after visiting every screen above |
| Canvas | 1585×946 instead of 2680×1600 |
| Console | No errors |

### Picture stats overlay

**Parent Area → DATA → "Picture stats (FPS, pictures, memory)"** turns on a small box in the bottom-right corner on every screen. It shows:
- frames per second, the quality mode and the current screen;
- how many pictures are loaded and their memory in MB;
- the canvas size, DPR and the device's RAM.

The switch is remembered. Screenshot it from the tablet and send it over.

## Part 2: Art that was delivered but not used

`npm run art:unused` lists every picture the game never draws. It checks the data files and the code, and counts ids the game builds from patterns, such as `num_{n}`, `letter_{l}`, hatch frames and `drop_{colour}`.

Before: **151** unused. Now: **43** unused, plus 30 left out on purpose.

### Wired in

- **All 60 vehicles.** They were shrunk with `scripts/shrink-art.cjs` (about 15 MB down to 3.9 MB); the originals are backed up in `_masters_pending/objects/vehicles/`.
  - **Two new Busy Town missions:**
    - **Vehicle Parade:** Road, sea or sky (sorting), Bring 3 buses to the bus stop (counting), and Match each vehicle to its job. The reward is an **Ice Cream Van**.
    - **Big Helpers:** Who helps at sea?, Farm helpers, and Snow on the road! The reward is a **Rescue Helicopter**.
  - **Rides that already existed now have pictures:**

    | Ride | Picture |
    | --- | --- |
    | Parade Float | `special/parade_float` |
    | Bubble Boat | sailboat |
    | Cloud Glider | hot air balloon |
    | Jungle Jeep | mountain rescue 4x4 |
    | Forest Cart | farm buggy |

  - **53 more rides** can be discovered with stars (2–4) in Collection → RIDES. Once found, they drive onto Wonder Island like other bought things.
- **Wonder Island build mode.** MOVE THINGS now opens a **BUILD** tray on the left:
  - **Pieces:** 6 ground tiles, the rainbow wall and roof, 2 doors and 3 windows.
  - **Adding:** tap a piece and it lands on a clear patch of grass, which is marked by the see-through ghost house.
  - **While dragging:** a green ring means "fine here"; a red cross means it will hop back onto the grass.
  - **Removing:** drag a built piece back onto the tray (an × shows) to take it away.
  - **Layering:** tiles lie flat under everything. Doors, windows and the roof sit in front of a wall, so children can build a little house.
  - **Saving:** pieces are kept in the save (`island.built`, up to 30). Older saves start with nothing built.
- **Pip's faces:**
  - a different one on each child's card on "Who is playing?";
  - worried on the "something went wobbly" notice;
  - surprised on the wiggle-break reminder.
- **Parent Area:**
  - parent picture by the title, and a child picture on each profile card;
  - sound icons on Music/Voice and Quiet mode, and a language icon;
  - goals icon on "Worth reinforcing".
- **Smaller fits:**
  - sticker-book icon for the FRIENDS tab;
  - Collection podium grows from bronze to silver to gold as the collection grows;
  - paint-colour drop on the painting board;
  - splash when the island pond is tapped;
  - leaf swirl on a forest sorting game;
  - tap above the sink in the bathroom game;
  - paw plate in a bunny counting game;
  - empty bus shelter as the bus counting target.

### Left out on purpose (30)

- Explorer boy (22 pictures): his role isn't decided yet.
- Pip rig parts (4): for a future jointed Pip.
- The 4 small scene cards: the full-screen backgrounds are used instead.

### Still unused (43), and why

| Pictures | Why |
| --- | --- |
| `pip_back` | No moment yet where Pip turns away. It would suit walking into the portal. |
| `btn_home`, `btn_play`, `btn_settings`, `reward_star`, `star_gold` | Second styles of icons the game already shows (home, play, settings, star). |
| `speech_bubble` | Pip's bubble has to stretch to fit its words; the picture would be squashed. |
| `fx_slime_splat` | Feels like a "wrong" splat. The game avoids negative feedback for 2–5 year olds. |
| `fx_egg_crack` | It is its own egg; the hatch sets already have crack frames in each world's egg. |
| `fx_portal`, `fx_beam_pink`, `ring_green`, `ring_purple`, `ring_red` | Spare effects. The portal already has its swirl, and the feedback rings use yellow, blue and pink. |
| Bathroom `bubbles`, `water_splash`, `fx_sparkle_gold` | Second versions of the bubbles, splash and sparkle effects already in the washing games. |
| `food_bowl_dino`, `dino_egg_nest` | Already have food or an egg in them. Counting needs an empty container so the count stays right. |
| `footprint_paw`, `letter_stone_a`, `word_card_apple`, `number_tile_blank`, `maracas`, `frame_card_blank`, `scroll_certificate` | Each needs a new activity or screen (tracks, a letter-A stone hunt, a number tile game, a shaker in Jungle Jam, a certificate). Good candidates for a later job. |
| Candy shapes (`circle_red`, `heart_pink`, `square_blue`, `triangle_yellow`) | Same shapes and colours as the shape pictures already used. One would be picked at random. |
| `egg_farm`, `egg_ocean` | No farm or ocean dragon or world yet. |
| `world_logic`, `world_nature`, `world_shapes`, `world_stories`, `rocket_engine`, `icon_badge`, `child_hungry`, `child_surprised`, `dino_orange_grin` | Icons for worlds, screens or feelings cards the game doesn't have yet. |

## Checks

- `npm run check` passes, with a new Job 10 block covering:
  - memory budget and release timing, and bitmaps being freed;
  - Lite blends, auto Lite, the first-frames test and the remembered mode;
  - all vehicles, tiles, house parts and build markers being used;
  - the new missions and rides;
  - build mode (add, keep, take away) and older saves;
  - the stats switch and the bubble fix.
- `npm run standalone` passes.
- Offline cache is **v44**.
