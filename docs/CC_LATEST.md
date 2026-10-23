# CC latest — Job 18 (free to try + one "Unlock everything")

- **When:** 2026-10-24
- **Job:** JOB_18_FULL_UNLOCK
- **Status:** PARTLY DONE.
  - Everything in the game, the docs and the checks is done.
  - The Android billing code is written but has **not been built or tried**: this PC has no Android SDK or Java 21 (see Job 15B), so no APK could be made.

## What changed
- **What's free:**
  - Wonder Island (with its playground)
  - Dino Valley and Rainbow Village
  - the 8 free colouring pages
  - the Collection (sticker book, including My Pictures)
  - Pip's looks in the Collection; the dress-up room itself comes in Job 19
- **Locked worlds and pages** stay visible, with a lilac "sleepy" veil, a padlock and three little z's.
  - A child tapping one gets a bounce, and Pip says "Ask a grown-up!" (spoken, plus a speech bubble).
  - No price and no buy button ever appear on a child screen.
- **PLAY on the island and the world map** only lead to missions in the free worlds. A locked world can't be opened by any route.
- **Parent Area → new FULL GAME tab:**
  - what the full game adds and the price (from Google Play, or "A$4.99" until Play answers);
  - **UNLOCK EVERYTHING** and **RESTORE PURCHASE** buttons.
  - Buying first needs a grown-up check: hold a button for 3 seconds, then answer an easy sum written in words ("What is four plus three?"). A wrong answer gives a new sum.
- **Google Play Billing:** a small plugin inside the app (`BillingPlugin.java`, Play Billing Library 8.0) sells one product, `full_unlock`, as a one-time purchase.
  - The unlock is stored on the tablet, so it works offline.
  - It is re-checked with Google Play when the app starts or comes back to the front. A refund puts the tablet back to the free version.
  - "Reset local data" keeps a bought unlock.
- **Developer test switch** (debug APK only) in FULL GAME turns the unlock on and off without paying. Release builds never show it.
- **Web/GitHub Pages and the one-file test build:** I chose **everything unlocked**, because there's no store there.
  - Add `?locked=1` to the address to preview the free version, e.g. `index.html?locked=1`.
  - The FULL GAME tab on the web says the full game is on Google Play.
- **Privacy (version 1.2):** the in-game PRIVACY tab, `privacy.html` and `docs/PRIVACY.md` now say that Google Play checking the unlock is the only internet use, and that it carries nothing about the child. They also list My Pictures.
- **`docs/GOOGLE_PLAY_STEPS.md`** has a new section on creating the `full_unlock` product in Play Console, licence testers, refunds, the content rating and data-safety answers.

## Checks
- `npm run check`: PASS (new tests: free/locked worlds and pages, Pip's ask, the 3-second hold and the sum, buy/restore/refund/offline, the debug switch, older saves). `npm run standalone`: PASS.

## Not done
- **APK build and a real purchase test:** blocked until Android Studio is installed on this PC. The Java billing code still needs a first compile, so expect a small fix-up when the first APK is built.

## What Aaron needs to do
- Install Android Studio (Job 15B), so CC can build the APK and fix anything the compiler finds.
- In Play Console, after uploading a build with billing:
  - create the one-time product **`full_unlock`** at A$4.99 and activate it;
  - set up the payments profile;
  - add your Google account under **License testing**.

  Full steps are in `docs/GOOGLE_PLAY_STEPS.md`.
- **On the tablet**, with the debug APK:
  - locked worlds and colouring pages show the padlock, and tapping one gets "Ask a grown-up!";
  - Parent Area → FULL GAME → UNLOCK EVERYTHING → the 3-second hold → the sum → Google Play's sheet (as a licence tester);
  - RESTORE PURCHASE works, and so does the developer switch.
- **Decide:** keep the web build fully unlocked (my choice), or lock it too? Locking it is a one-line change in `src/store/FullUnlock.js`.

## Commit
- See the git log for "Job 18". Pushed: yes. APK rebuilt: no (blocked).
