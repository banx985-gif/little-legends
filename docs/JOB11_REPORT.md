# Job 11: 60 new Wonder Island decorations

## Art

There are 54 decorations in `assets/worlds/island_decor/<group>/` and 6 trophy pictures in `assets/rewards/trophies/`.

- The originals were copied to `_masters_pending/` before shrinking.
- `scripts/shrink-art.cjs` now caps island decorations at 512 px. They are drawn at 250 px or less on the island, which keeps them inside the low-end budget from Job 10.
- Shrinking took them from 15.2 MB to 7.7 MB. File names are unchanged and nothing was redrawn.

## Rewards that were waiting for a picture

| Reward | Picture |
| --- | --- |
| Moon Lamp | `lights/lamp_moon` |
| Firefly Jar | `lights/jar_firefly` |
| Star Gazebo | `houses/gazebo_crystal` |
| Colour Windmill | `magic/windmill_rainbow` |
| Star Path | `paths/stepping_stones_star` |
| Music Flowers | `magic/flower_music` |
| Moon Book Nook | `houses/tower_wizard` |
| Story Tree | `trees/tree_lanterns` |
| Luna Star | `lights/lamp_star` |
| Shape Stones | `paths/stepping_stones_grey` |
| Kindness Garden | `plants/flowers_star` |

Four of these rewards already had a stand-in picture. Those pictures stay in the game as their own star decorations, so nothing becomes unused:
- Sleepy Moon Crystal
- Happy Star Trophy
- Three-Way Signpost
- Pink Flowers

## New decorations

- **New decorations:** the other 43 pieces, plus the 4 above, are new island decorations (47 in all), found with stars (2–4 each) in Collection → DECOR. Once found, they appear on the island like other bought things.
- **Size on the island:** houses and trees stand a little bigger than other decorations.
- **DECOR sub-tabs:** the tab now has nine picture tabs down the left, like LOOKS: Magic, Play, Lights, Crystals, Trees, Paths, Houses, Plants and Adventure.
  - The new pieces use the group of the folder they came in.
  - The older decorations were sorted by what they are; anything that fits no group goes under Adventure.
  - Seasons keep their own SEASONS tab.

## Trophies

These show on the last "Great work!" screen of every Little Mission:
- **Mission finished:** a trophy in front of the star podium.
  - Bronze while less than a third of the world's missions are done.
  - Silver from a third.
  - Gold from two thirds.
- **World complete** (that world's last mission): the gold trophy on the crystal pedestal under the rainbow arch.

## Fixed along the way

Some rewards from earlier jobs had a fixed island spot on top of the portal or Pip's house; the Story Tree showed up inside the portal. The island now treats the portal and Pip's house as taken, so a reward placed there moves to the nearest free grass. Anything a child has moved by hand stays where they put it.

## Cheap-tablet check

Tested in Chrome with Lite mode, 1340×800, 3 GB and the CPU 4× slower:

| Screen | Frame rate | Picture memory |
| --- | --- | --- |
| Island with 12 new decorations | 28–29 FPS | 26 MB |
| DECOR tabs | 28–29 FPS | 40–43 MB |
| Trophy screens | 28–29 FPS | 72–77 MB |

There were no console errors.

## Still unused (`npm run art:unused`)

- All 60 new pictures are used.
- 42 pictures are still unused. These are the same ones listed in `docs/JOB10_REPORT.md`: mostly second versions of icons already in the game, and a few that need a new activity.
- 30 more are left out on purpose: the explorer boy, the Pip rig parts and the scene cards.

## Checks

- `npm run check` passes, with a new Job 11 block covering:
  - every decoration and trophy picture is used;
  - the 11 reward matches, and the replaced pictures kept;
  - every DECOR group, and every decoration in exactly one group;
  - rewards moved off the portal;
  - bronze trophy on a first mission, gold on the arch for a finished world, and nothing before the last step.
- `npm run standalone` passes.
- Offline cache is **v45**.
