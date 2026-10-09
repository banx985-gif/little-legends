# Job 09: Pip's wardrobe

All 60 new pieces in `assets/objects/wardrobe/` are now rewards that Pip wears in the Collection and on Wonder Island. Before they went in, they were shrunk with `scripts/shrink-art.cjs` (13 MB down to 3.5 MB). File names are unchanged and nothing was redrawn.

## What the child sees

- **The LOOKS tab now has six smaller tabs down the left:** Hats, Glasses, Outfits, Onesies, Bags & Wings, and Extras. Each tab shows a picture so children who can't read can still choose. Looks Pip can wear on his body come first.
- **Pip wears one look in each place at once:** hat, glasses, outfit or onesie, back (bag, wings or jetpack), and one extra (chest or held).
  - Tapping a look puts it on. Tapping it again takes it off.
  - A look that clashes takes off the old one. For example, a onesie hood replaces the hat, and a police outfit's cap replaces the hat.
- **Where each piece sits on Pip:**
  - Hats, headbands and the tiara go on his head; glasses and masks go on his eyes.
  - Bags, wings and the jetpack go behind him.
  - Outfits go over his body, with his head in front of the collar. An outfit that comes with its own hat puts that hat on his head.
  - Onesies go over his whole body, with his face showing through the hood. The frog hat and teddy headband show his face the same way.
  - Medal, badge, bow tie, camera and binoculars go on his chest; the star satchel hangs at his side.
- **Poses:**
  - Hats, glasses and bags stay on when Pip waves.
  - In poses a piece can't sit on cleanly (side-on, flying, crouching, looking up), Pip stays front-on while he wears it. He still bounces and celebrates. Nothing is ever drawn crooked.
  - The wave pose also switches to front-on while he wears an outfit, because his raised arm would poke through it.

## Rewards

These existing placeholder looks now have their real picture:

| Look | Picture |
| --- | --- |
| Explorer Hat | `hat_pith_explorer` |
| Bunny Ears | `ears_bunny` |
| Frog Hat | `headband_frog` |
| Heart Glasses | `glasses_heart` |
| Dino Backpack | `backpack_dino_tail` |
| Star Backpack | `backpack_rainbow`, the rainbow backpack with a star on it |

The Astronaut Outfit also switched to its new picture, so Pip now wears it instead of showing it beside him.

The other 53 pieces are new LOOKS rewards. Like the other looks, they can be discovered with stars (2–4 each).

25 missions now also give a new look the first time they are finished. It is celebrated on the island after the mission reward and before any dragon:

| World | Looks |
| --- | --- |
| Busy Town | Firefighter, Police, Detective, Gardener, Postie, Train Driver, Paramedic and Builder outfits |
| Space Station | Astronaut Outfit, Rocket Jetpack, Star Headband, Star Sunglasses, Pilot Cap, Pilot Outfit |
| Animal Forest | Ranger Outfit, plus the Bear, Bunny, Penguin and Frog onesies |
| Rainbow Village | Rainbow Glasses, Painter Outfit, Rainbow Bow Tie, Butterfly Wings, Star Backpack |
| Dino Valley | Dragon Onesie (Ten Egg Rescue) |

## Saves

- Older saves keep their one Pip look. It is worn in its own place.
- The new `pip.outfit.worn` field holds one look for each place.
- `cosmeticId` still holds the newest look, so an older build still shows one look.

## Tweaking where a piece sits

- Placements live in `data/art_map.json` → `wardrobe.items`, in pixels of `pip_front` (291×334).
- Each piece has a centre (`x`, `y`) and a width (`w`). An outfit can also have its hat as a separate band (`from`). Onesies have `reveal`, the oval where Pip's face shows through.
- `npm run wardrobe:preview` draws Pip wearing every piece with the game's own drawing code, in Chrome. It saves front, wave and mixed-look sheets to `docs/qa_shots/wardrobe/`.

## Still to check by eye

- The Dragon and Unicorn onesies have small face holes. Pip's face sits over the hood, with the horns showing behind.
- Pip's big ears stick out of every hood, which is on purpose.
- Pip doesn't wear his looks inside missions, the same as before this job.
- The Flower Backpack and the other placeholder looks with no matching picture keep their placeholder.
