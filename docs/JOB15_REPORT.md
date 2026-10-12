# Job 15: Wonder Island becomes a free playground

This was your son's request. The island is now a toy box. Everything on it can be picked up, moved, played with and made bigger or smaller, with no menu or edit mode to find.

## 1. Move anything, anywhere
- **One finger moves anything:** every dino, friend, decoration and toy on the island, plus the tree, pond, slide, ball, drum and houses.
  - Press and drag; it stays exactly where it's let go, with no snapping to spots.
  - A quick tap still does what it did before: the friend says hello and makes its sound.
- **While dragging:** a green ring under the thing means it can stay there; a red cross means it will float back.
- **Let go in the water or off the screen:** it splashes, then floats back to the nearest land (sand or grass).
- **Let go on the portal or the big buttons (PLAY, EXPLORE WORLDS, BUILD):** it's nudged aside, so the buttons always stay tappable.
- **Saving:** positions save for each child. Other children's islands are untouched.
- **New islands:** the tidy Job 14 starting layout is still the default, and anything a child hasn't moved stays in it.
- **The old MOVE THINGS button is now BUILD:**
  - It's only for the building tray (ground tiles, paths, walls), since moving no longer needs a mode.
  - Inside BUILD, dragging works as before.

## 2. Dinos play with toys
Drop a dino or friend on a toy, or next to it, and it plays. Dropping a toy onto a friend works too.
- **Before it starts:** the friend hops onto the toy with a happy chatter.
- **How long:** it plays for 3–5 seconds, then hops off beside the toy and stays there.

| Toy | What happens |
| --- | --- |
| Rainbow slide (and the island's own slide) | Climbs the ladder, then slides down tilted, with a whoosh, twice |
| Cloud swing | Swings back and forth under the cloud, with a soft whoosh each swing |
| Star seesaw | One friend bounces on an end. **Two friends make it go both ways:** one end goes up as the other goes down, and the board tilts |
| Mushroom trampoline | Bounces up, squashes on landing, with the bounce sound |
| Star sandpit | Digs (rocks forwards and back) while little sand puffs fly up |
| Glow climbing dome | Climbs up the side to the top, then jumps for joy, with a sparkle |
| Beach ball | The friend kicks it and it rolls away, slowing down and bouncing off the water's edge and the buttons. A friend it rolls past hops. **Kids can flick it too:** drag and let go quickly and it rolls |
| Bubble machine | The friend watches and sways while bubbles rise, with soft pops |
| Star fountain, wishing well | The friend watches while sparkles float up |
| **Extras:** drum | Bounces to the beat; the drum squashes on each beat with rising notes |
| **Extras:** alphabet blocks | Pushes them; they wobble and hop, with pops |
| **Extras:** balloon bunch | Floats up with the balloons, swaying, then comes back down |
| **Extras:** toy train | Rides on top while the train rolls back and forth |

- **The pictures:** all of this is simple motion on the existing flat pictures (moving, tilting, squash and stretch). Nothing new is drawn on the art.
- **Fitting the toys:** a friend shrinks a little while on a toy so it fits.
- **Toy sizes:** the bought toys are a bit bigger on the island than other decorations, so a dino fits on them.
- **One toy at a time:** each toy takes one friend, and the seesaw takes two.
- **Interrupting:** picking up a playing friend, or the toy it's on, stops the play; the friend lands where it is.

## 3. Bigger and smaller
- **Two fingers:** pinch on anything to make it bigger or smaller.
- **Tap and hold** (about half a second): two big round buttons appear beside the thing, with a pop.
  - A green **+** makes it bigger and a blue **−** makes it smaller.
  - The buttons have no words.
  - Each tap pops and gives the thing a little squash.
  - At the limit a button turns grey.
  - The buttons go away after 4 seconds, or when you tap somewhere else.
- **Limits:** from half size to double size.
- **Saving:** the size saves with the position.

## 4. Front and back
- **Depth:** things lower on the screen are always drawn in front of things higher up, every frame, including while they play, roll or float back.
- **On a toy:** a friend playing on a toy is always drawn in front of that toy.

## 5. Tidy up (Parent Area)
- **Where:** Parent Area → PROFILES → **TIDY UP ISLAND**. It asks for a second tap first, and works on the child who is playing.
- **What it does:** everything goes back to its starting spot at normal size.
- **What it keeps:**
  - built pieces stay where they are, since they have no starting spot (their size goes back to normal);
  - things pinned from the Collection stay pinned.

## 6. Cheap tablets
- **The play animations:** they're just maths on pictures already in memory, so no new pictures are loaded.
- **Effects:** bubbles, sand and sparkles are a few plain shapes. There are at most 48 on screen, 24 in Lite mode, and Lite also makes half as many.
- **A second finger:** only Wonder Island listens to it. Every other screen ignores a second finger, as before.
- **The Lite speed check (`npm run qa:release -- --only=lite`)** now includes **an island with 40 things**: all placed by hand across the island, with 6 friends playing on toys while it's measured.
  - It runs with the CPU slowed 4×.
  - **The result was PASS:**
    - The 40-thing island needs 13.8–16.6 ms of work per frame across runs (the check's line is 16.7 ms, and 30 FPS allows 33 ms).
    - It doesn't freeze, and pictures use 57–74 MB against Lite's 100 MB.
    - Every other screen passed too.
    - The PC had only 1.1–1.9 GB free, so all the numbers are on the slow side.
- **Found while testing:** a Collection for a child who owns 40 things takes up to about 22 ms per frame at the slow end (5 ms typical), with the CPU slowed 4×.
  - That's still inside 30 FPS, but over the check's strict line. The time goes on drawing the cards' pictures and name text.
  - I haven't changed the Collection in this job. Worth a look in a later job if a tablet with lots of rewards feels slow there.

## Checks
- **`npm run check` passes.** The new Job 15 block checks:
  - where things may stand: land, the water, off the screen, the portal and the buttons;
  - every toy has a play;
  - a one-finger drag keeps the exact spot and saves it;
  - a tap still works, and PLAY still works after things are dropped near it;
  - splash and float back, and positions come back next time;
  - each child has their own island;
  - hold, then + and −, with limits;
  - the buttons hide after 4 s or a tap elsewhere;
  - pinch, and sizes saved and restored;
  - the second finger only reaches the island;
  - every toy plays, things move and the play ends;
  - the friend hops off onto land next to the toy, drawn in front of the toy while playing;
  - the slide whooshes and the trampoline bounces;
  - the seesaw takes two, they go opposite ways, and three don't fit;
  - a toy dropped next to a friend starts a play;
  - bubbles, sand and sparkles appear;
  - a kick, and a flick, roll the ball, and it stops on land;
  - drawing stays back to front every frame;
  - Tidy up asks twice, resets, and keeps built pieces and pins;
  - the Lite check includes the 40-thing island.
- **`npm run standalone` passes.**
- **Offline cache:** v51.
- **Tried in real Chrome, including real touches:**
  - all 13 toys with dinos (screenshots checked);
  - a drag with a real finger, hold for the buttons, + taps, and a real two-finger pinch;
  - a flicked ball rolling and bouncing back off the island's edge;
  - no errors.

## What to test on the tablet
1. **Drag** a dino somewhere new, then go to a world and back: it's still there. Drag one into the sea: splash, and it floats back.
2. **Drop things on PLAY or the portal:** they hop aside, and PLAY still works.
3. **Drop a dino on each toy** (slide, swing, seesaw, trampoline, sandpit, dome, bubble machine, fountain, well, balloons, train, blocks, drum).
   - Does each one look fun?
   - Does it hop off nearby afterwards?
   - Is anything off: a dino in the wrong spot on a toy, or a bounce that's too big or too fast?
4. **Seesaw with two dinos:** one up, one down.
5. **Ball:**
   - Drop a dino next to it, and it gets kicked.
   - Flick the ball with a finger.
   - Does it roll nicely, and stay on the island?
6. **Hold** a friend for half a second: + and − appear. Tap + a few times, then −. Try a **two-finger pinch** too. Does the size stick after leaving and coming back?
7. **Watch your son with it:**
   - Does he find dragging and holding by himself?
   - Is the hold too long or too short?
8. **Parent Area → PROFILES → TIDY UP ISLAND** (tap twice): everything is back in place.
9. **Smoothness:** with lots of things on the island and a few dinos playing, is it still smooth on the cheap tablet? Picture stats: Parent Area → DATA.
