# CC latest — Job 17 (colouring studio)

- **When:** 2026-10-24
- **Job:** JOB_17_COLOURING_GAME
- **Status:** DONE, using placeholder art. The APK was not rebuilt because this PC still has no Android SDK or Java 21 (see Job 15B).

## What changed
- **Way in:** a rainbow easel stands on the beach at the bottom right of Wonder Island. Tap it to open the colouring studio.
- **Page picker:** big thumbnails, 12 to a screen, with arrows if there are more.
  - A yellow sparkle marks pages this child hasn't opened yet.
  - A saved picture shows the child's own colouring on its thumbnail, plus a green tick.
- **Painting screen:**
  - **Tools (left):** bucket (picked first when a page opens), texta, soft paintbrush, rainbow brush (the colour changes as you drag), eraser, stamp, sticker.
  - **Colours (bottom):** 12 colour dots. The chosen one bounces and gets a ring.
  - **Right side:** home, save (tick), undo, redo, clear, and small/medium/large brush sizes.
  - **Bucket:** fills the tapped shape up to the black lines, even over earlier paint. Tapping right on a line fills the nearest shape.
  - **Stamps:** star, heart, paw, dino foot, flower, circle, in the chosen colour.
  - **Stickers:** a tray of the game's own pictures in 5 groups: animals, characters, food, things, decor. Backgrounds and the rare dragons are left out. Drag one onto the page, or tap it to drop it in the middle. Drag to move; hold for the + and − size buttons, as on the island. Dragging one off the page removes it, and undo brings it back.
  - **Layers:** paint and stamps go under the black lines; stickers sit on top.
  - **Undo / redo:** 20 steps. **Clear** needs a 1.2-second hold, with a red ring filling up, so a quick tap does nothing; clearing can also be undone.
  - **Saving:** home saves by itself and goes back to the pages. The picture is also saved if the tablet is put away mid-picture.
  - **Sounds:** pop for a fill, a soft swish while drawing, a thunk for stamps, a sticker sound, a sparkle on save.
- **My Pictures:** a new "MY PICTURES" tab in the Collection lists each child's saved pictures. Tap one to keep colouring it. With none yet, a big easel opens the studio.
  - Pictures are stored per child, on the tablet only, and kept outside the main save so it stays small.
  - Older saves load fine and simply start with no pictures. "Reset local data" deletes the pictures too.
- **Pages:** all 50 are listed in `data/colouring.json`, and the 8 free ones are tagged for Job 18: 01, 04, 17, 30, 44, 45, 46, 48.
  - Until your pictures arrive, 6 simple code-drawn test pages show: car, rainbow house, flower, sun and cloud, apple, butterfly.
  - The game looks for each real page file every time the studio opens and swaps it in by itself; no code change is needed. The same goes for the tool art.
- **Cheap tablets:** Lite colours at 1280×720 (1920×1080 on fast tablets), with one paint layer, the line layer and stickers.
  - Drawing happens once per frame, undo memory is capped, and everything is freed when you leave the studio.
  - The colouring screen is now part of the Lite speed check.

## Checks
- `npm run check`: PASS (new colouring tests added). `npm run standalone`: PASS (the test pages work there too).
- Lite speed check: PASS.
  - Colouring screen frame work: 1.9 ms of the 33 ms allowed.
  - Slowest bucket fill: 47.9 ms (filling the whole background, CPU slowed 4×), against the 50 ms target. A normal shape takes about 15–20 ms.
  - The whole-background fill is close to the limit, so watch it on the Tab A7 Lite.

## Not done
- APK rebuild: blocked until Android Studio is installed.
- Free vs paid locking: the free pages are only tagged here. Job 18 adds the lock.

## What Aaron needs to do
- **Draw the pages:** file them as `assets/colouring/page_XX_name.png` (1920×1080, black lines on white, closed shapes). They'll appear by themselves.
- **Draw the tool art:** file it in `assets/colouring/tools/` with the names from COLOURING_PAGES_TO_DRAW.md. The texta file must be called `tool_texter.png`, as in that list.
- **Test on the tablet once there's an APK:**
  - the easel opens the studio;
  - the bucket fills inside the lines;
  - holding the bin clears the page, and a quick tap doesn't;
  - stickers drag, resize and come off the page;
  - home keeps the picture, and it shows in Collection → MY PICTURES.

## Commit
- See the git log for "Job 17". Pushed: yes. APK rebuilt: no (blocked).
