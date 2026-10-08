# Art wiring report — Jobs 01, 02 and 04 (real art)

All picture choices live in one file: `data/art_map.json`. To change which picture something uses, edit that file. No code change is needed. Anything not listed there keeps its old drawn placeholder. If a picture fails to load, the placeholder shows instead, so nothing goes blank or crashes.

## How it works (short)

- `src/core/AssetLoader.js` reads `assets/art_manifest.json` (every picture) and `data/art_map.json` (which game thing uses which picture).
- `src/core/art.js` has the one lookup, `art(id)`, which returns the picture or `null`. `drawArt()` fits a picture inside the old box, centred, without stretching. Touch areas are unchanged because they never depended on the drawing.
- Each scene loads only its own pictures when it opens. For an adventure, the needed pictures are worked out from the adventure's activities. The scene waits at most 1.5 seconds, then opens anyway, and anything late pops in. The boot screen loads a small starter set (Pip, Bunny, Rory, island and core icons, about 31 pictures) behind its progress bar.
- When more than 140 pictures are in memory, pictures the current scene doesn't need are released.
- Glow effects (gold glow, sparkles, star burst, rings) are drawn with a light ("screen") blend.

### Colour rule (so learning answers stay right)

Colour is the answer in many activities ("tap the red apple", "sort by colour") and tells items apart in others. So:

- **Shapes and food** only use a picture whose colour matches the token. Example: a red circle uses `circle_red`, while a blue circle stays a drawn blue circle.
- **Eggs and dinosaurs**: in size, counting, amount and ordering tasks, every egg (or dino) uses the same picture, so "which is biggest?" compares like with like. In "find the dinosaurs" (colour not asked), each dino gets its matching-colour picture where one exists, otherwise the default.
- **Letters, numbers, animals, words, routines, clothes, instruments**: the picture is the meaning, so they always use art. The colour-blind help mark is only shown when the picture really is that colour.
- **Match the pairs**: both items of a pair use the same style. If either has no picture, both stay drawn. (So the baby–grown-up activity is fully drawn until duckling/cub/kit pictures exist.)

## Now using real art

| Area | What |
|---|---|
| Pip | All states except *sleepy* (see table below). Hats, crowns, hoods and glasses from `objects/hats` show on Pip in the front, side, wave and fly poses. |
| Characters | Bunny (`bunny_tpose`), Rory (`rory_idle`, also used for Baby Raptor as before), Octo (`sea_dino/octopus`, the only purple octopus; please confirm it's Octo). "Feed Rory" now shows Rory instead of Bunny. |
| Food | Red/green apple, banana, blueberry, strawberry, orange, carrot |
| Numbers | 0–20 (`objects/numbers`) |
| Letters | A–Z and a–z, including the big-letter drop boxes in "match little to BIG" |
| Shapes | Red circle, blue square, yellow triangle, green/purple rectangle, yellow/purple/green star, pink heart (colour-matched only) |
| Eggs / dinos | `dino_egg`; T-rex (orange), triceratops (green), brachiosaurus (blue) |
| Animals | duck, fish, bear, frog, cow, fox, owl, rabbit (+ pig, sheep, chicken, lion, monkey ready for future data) |
| Words / routines / clothes | bone (also in "Which group has less?", drawn as plain bones without word cards), ball, berry, book, carrot, cloud, moon, sun, apple, bone, fish, plate, tree, cup, flower; breakfast, brush, wash, dress, pyjamas, story, wake, tidy; boots, raincoat, scarf, sun hat, coat; blocks; fossil, (dino leaf) bed |
| Jungle Jam | Drum kit (Tiko), guitar (Bo), xylophone (Mimi), microphone (Kiki) |
| Island | Pip's house (`cottage_blue`), adventure portal (`portal_gate`), tree, pond lily pads (on the drawn water), bunny house, slide, beach ball, drum, dinosaur home (`dino_cave`), rainbow arch |
| Egg hatching (Job 04) | See "Egg hatching" below. |
| Rewards | 79 rewards (Job 04 added Luna Star = happy star trophy, Moon Lamp = sleepy moon crystal, Kindness Sign = heart sign, Star Path = three-way signpost, Shell Garden = shell garland, Story Lantern = star lantern; Job 02 added Kindness Garden = pink flower bed, Treasure Basket = rainbow basket): all baby dinos except pterosaur, duckling, fox cub, Bella bear, treehouse, fountains, toy chest, Kindness Garden, 14 catalogue friends, 15 Pip looks, 22 decorations, 2 rides. Shown on the island and on Collection cards (faded with a lock icon until earned). |
| Counting containers (Job 02) | Bunny's basket = empty rainbow basket, Rory's picnic plate = empty blue plate, egg counting = empty nest. Food/eggs already in the container are drawn a bit smaller so each one sits apart and can be counted. |
| Menus | BACK / PREV / NEXT buttons use the blue arrow sign (mirrored for BACK and PREV), parent settings ON switches use the toggle picture (OFF stays drawn), island buttons (play, explore, move, collection), parent button, Continue/Home/Next/Island buttons, world cards (`ui/worlds`), Collection tabs and star counter, Rainbow Village mission icons, parent area tabs (learning, settings, profiles, test, release), parent gate lock |
| Effects | Island portal has a slow magic swirl inside the gate; moving something on the island ends with soft sparkle orbs; rainy / sunny / cold weather questions get soft rain, sun rays or clouds; the garden word game gets drifting petals; forest activities get drifting leaves (all light blend, slow, no flashing). Also: hint glow, correct sparkles, reward star burst, finish confetti, correct/drop/try-again rings |

### Pip states → pictures

| State | Picture |
|---|---|
| idle, happy | `pip_front` |
| look, point (and idle look-around) | `pip_side`, mirrored to face the target. *look* at something high up uses `pip_look_up`. |
| laugh, celebrate, bounce | `pip_fly_happy` |
| confused | `pip_look_up` (puzzled look upward) |
| encourage, wave | `pip_wave` |
| fall (and idle "inspect") | `pip_crouch_play` |
| **sleepy** | **still the drawn Pip.** No sleepy/eyes-closed picture exists. |

Pip's existing bounce, squash and tilt animations still play on the pictures. `pip_back` and the `pip_face_*` close-ups aren't used yet; there's no state that fits them.

## Still on placeholders — next drawing list

**Pip & characters**
- Pip **sleepy** pose (full body, eyes closed)
- Luna (Storybook guide) and Bella (Animal Forest / Bella's Day guide): no art yet
- Baby animals for "match baby to grown-up": **duckling, bear cub, fox kit**
- Animals: **dog, eagle**

**Shapes in more colours.** Colour matters, so each needs its own picture:
- circle: **blue, green, orange, purple, yellow**
- square: **green, purple, red, yellow**
- triangle: **green, purple, red**

**Words / clothes / toys**
- cat, dog, leaf, seed, shoe, sock
- mittens, sandals, swimsuit, puzzle
- boat (vehicle)

**Feelings & helping choices.** These are actions, not faces:
- feelings: ask, grab, hide, hug, laugh, rush, share, shout, throw
- helping: carry, help, point, scatter, take, walk away

**Other game pieces**
- "SAME / DIFFERENT" buttons (green circle, orange triangle)
- Jungle Jam **FX** friend (Zuzu)
- Island: shape garden, prism butterfly, parade float
- Profile avatars (they show the child's initial on purpose)
- Parent area **DATA** and **PRIVACY** tabs, the **OFF** switch (only an ON picture exists)

**Rewards without a picture (70)**
- Creatures: Baby Pterosaur, Prism Butterfly, Bumble Bunny, Sunny Gecko, Moon Moth, Puddle Otter, Cocoa Capybara, Pipkin Pony, Noodle Alpaca
- Pip looks: Bee Antennae, Leaf Crown, Explorer Hat, Painter Beret, Storybook Hood, Jungle Headband, Cloud Cap, Sun Visor, Frog Hat, Fox Ears, Bunny Ears, Butterfly Bow, Music Headphones, Dino/Star/Flower Backpack, Tiny/Rainbow/Moon/Comet Cape, Heart Glasses, Sparkle Boots, Dino Slippers
- Buildings: Parade Float, Moon Book Nook
- Decorations: Shape Garden, Fossil Arch, Volcano Lamp, Feather Mobile, Letter Kite, Story Tree, Weather Spinner, Animal Sign, Cloud Pillow, Music Flowers, Shape Stones, Alphabet Banner, Number Flags, Weather Vane, Toy Shelf, Butterfly Post, Duck Pond Sign, Firefly Jar, Story Cushion, Book Stack, Letter Arch, Word Wall, Rainbow Fence, Colour Windmill, Shape Totem, Tempo Flags, Feelings Wheel, Helping Hands Sign, Star Gazebo
- Rides: Dino Scooter, Forest Cart, Moon Buggy, Bubble Boat, Jungle Jeep, Cloud Glider, Star Trike

Scarves and boots show on Collection cards, but Pip still wears the drawn hat shape for them. Only head and eye items are placed on Pip.

## Judgement calls to check

These are "closest picture" matches, not exact ones. Each can be changed in `data/art_map.json`:
- Octo = `sea_dino/octopus`; Baby T-Rex = `dino_orange_stand`; Baby Raptor = Rory's picture (the game already reused Rory's drawing for it)
- Rabbit (animal) = Bunny's picture; Cloud Lamb = sheep; Captain Hat = pirate hat; Rainbow Cap = plain cap; Dino Cap / Dino Hoodie = dino hood; Garden Hat = sun hat
- Coat = puffer jacket; Wake = alarm clock; Tidy = toy box; Bed = dino leaf bed; Bass = guitar; Melody = xylophone; Voice = microphone
- Decorations: Forest Log = hollow log, Fossil Stones = T-rex fossil, Handwash Poster = wash-hands picture, Toothbrush Cup = cup, Routine Clock = alarm clock
- In "match little to BIG letters", the drop boxes used to match each little letter's colour. The letter pictures have their own colours, so that colour hint is gone; the task is now purely about letter shapes.
- Glows use a light blend as asked. On the bright sky the gold hint glow reads as a soft white-gold halo.

## Egg hatching (Job 04)

Pictures: `rewards/hatch/<theme>/` (6 frames: idle, wobble, small crack, big crack, peek, hatched) and `fx/hatch/` bursts, drawn with the light blend. The code is `src/fx/HatchSequence.js`; the settings are under "hatch" in `data/art_map.json`.

- **Rory's Dino Picnic, "The egg is hatching!":** the step still needs 5 taps, as before. Each tap shows the next frame (wobble → small crack → big crack → peek). The last tap plays the dino burst and the hatched baby with "BABY RAPTOR!". While waiting for a tap, the egg rocks gently. "You found a dinosaur egg!" shows the same dino egg.
- **Back on the island after a mission that wins a creature:** the creature's egg hatches above the island in about 2.8 s. A tap skips it, and nothing else on the island can be tapped until it ends.
- **Collection, discovering a friend with stars:** the egg hatches in the side panel where Pip stands. A tap skips it.
- **Egg theme:** from the reward's world (Dino Valley → dino, Animal Forest → forest, Rainbow Village → rainbow, Storybook → moon, Bella's Day → farm). Catalogue friends each have their own theme (e.g. Bubble Seal → ocean, Mango Monkey → jungle, Moon Moth → moon).
- **Right baby only:** each theme's hatched picture shows one particular baby (dino → baby dino, farm → chick, forest → owl, jungle → gecko, ocean → turtle, moon → purple dragon, rainbow → rainbow bird). It's only shown where it *is* the reward: Baby Raptor, Duckling (farm), Daisy Duck, Starry Owl, Sunny Gecko, Mossy Turtle. For every other creature the egg cracks, the burst plays, and the reward's own picture rises out (e.g. Fox Cub, Baby Triceratops). Creatures with no picture yet (Prism Butterfly, Baby Pterosaur, …) just get the crack and burst.
- **Gentle:** small rocking only, the burst fades in and out (no flashing), and with reduced motion on there is no rocking and a softer burst.
- **Not changed:** the still eggs in `rewards/eggs/` aren't used anywhere in the game yet, so there was nothing to keep in step.
- **To check:** the Dino Picnic hatched baby is the dino hatch set's baby. On the island, Baby Raptor still uses Rory's picture, as before. If you want them to match, a "Baby Raptor" picture (or using the hatch baby on the island) would do it.

## Job 02 notes — art checked but not used

- `objects.dino.food_bowl_dino` is not empty (it has meat in it), so it is not a counting target.
- `objects.dino.nest_leaf` is lined with leaves; the plain `objects.nest` reads more clearly with eggs on it.
- `objects.plate_paw` / `objects.bowl_paw` have a paw print in the middle that a child could count as an item, so Rory gets the plain `objects.daily_life.plate`.
- "Tidy" already used `objects.bathroom.toy_box`, the open, empty toy box (the only toy box in the art).
- Emotion faces (`ui/emotions`, `child_surprised`, `child_hungry`): **the game doesn't show a feeling face anywhere today.** The three feelings activities show only action choices ("Bella feels sad. What could help?"). These faces also show a boy, not Bella, so they aren't used yet. If you want a feeling picture next to those stories, a Bella face set would fit.
- New dinos (stegosaurus, ankylosaurus, parasaurolophus) and sea friends (fish, crab, seahorse): stegosaurus, ankylosaurus, triceratops, brachiosaurus and crab were already used for the matching baby dinos and Coral Crab. No reward is named parasaurolophus, fish or seahorse, so those stay unused.
- Buildings, flowers, pond and nature pieces: only Kindness Garden and Treasure Basket had a clear match. Everything else on the list (Moon Book Nook, Star Gazebo, Shell Garden, Firefly Jar, …) has no matching picture.

## Job 02 bug fix found while testing

Opening a world hub (Dino Valley, Rainbow Village, Animal Forest, Storybook, Bella's Day) started its music. The music code played its first note before recording that it had started, and playing a note checked again, so it looped until it crashed. The game then recovered by sending you back to the island. The fix is one line in `src/audio/AudioManager.js`, and `npm run check` now tests it.

## Job 04 loading fix

Testing the live site showed the island preloading every reward picture (~80), not only the ones the child owns. On a first online visit that kept the island's own pictures and the hatch egg waiting. The island now loads only owned rewards and puts the celebration egg first. The hatch and its banner also wait for the egg pictures (up to 6 s) instead of running unseen.

## Job 04 notes — new art not used (no clear match)

- `worlds/decor/`: flags_trio (Tempo/Number Flags need music/numbers), balloons_bunch, statue_dragon, star_monument, crate_wood, barrel, rope_coil, sign_arrow_wood, post_banner (Alphabet Banner needs letters), treasure_chest (Treasure Basket stays the basket), rainbow_clouds, heart_crystal, sign_compass. Also apple_tree, sandpit, seesaw and trampoline (already in the folder) have no matching reward.
- `worlds/beach/`, `worlds/seasons/`, `rewards/podiums/`: no reward or decoration is named for them yet. They're ready for future seasonal or beach rewards.
- `fx/magic/` not used yet: butterflies_glow, fireflies, leaf_swirl, water_drop. No activity fits them cleanly. They could suit a butterfly or night story later.

## Offline and one-file build

- `sw.js` code cache is now `little-legends-m29-playable-fix1-art-v35` (v31 in Job 01, v32 in Job 02, v33–v34 briefly in Job 04). On install it caches only the core files. About 8 seconds after the game starts, the page asks it to fetch the rest of the pictures in the background, three at a time, so the game's own loading isn't slowed. This resumes on each visit until everything is cached. Pictures go in a separate cache, `little-legends-art-v1`, that survives code updates; bump that name only if pictures are redrawn under the same file name. (Job 04 changed this. Before, install downloaded all ~164 MB at once, which starved the game on a first visit to the live site.)
- `npm run standalone`: all the art is ~99 MB on disk (~132 MB once embedded), over the 60 MB limit. So the one-file build embeds only the **starter set**: 101 pictures (Pip, Bunny, Rory, everything in Rory's Dino Picnic, the island, world icons, parent icons, core UI and effects). The file is ~32 MB. Other pictures show placeholders in that build only.
- `npm run check` gained checks that: every art id in the map exists; numbers 0–20 and every letter have art; placeholders still draw when art is missing; art keeps its shape; Pip uses art in every state except sleepy; glows use the light blend; Dino Picnic preloads its food; and the offline cache covers the art.

Saves are untouched: no save fields were added or changed.
