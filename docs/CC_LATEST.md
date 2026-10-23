# CC latest — Job 16 (studio logo)

- **When:** 2026-10-24
- **Job:** JOB_16_STUDIO_LOGO
- **Status:** DONE. The APK was not rebuilt because this PC has no Android SDK or Java 21 yet (see Job 15B).

## What changed
- **Opening logo:** when the game opens, the Banx Games logo fades in and out over 1.5 seconds on dark purple, before the loading screen and Pip. A tap skips it. The game's starter pictures load while the logo is showing, so it adds almost no wait.
- **Dark purple:** I used the logo picture's own background colour, #0e0115, instead of #120a1f. That way the square edge of the picture doesn't show. The page behind the game and the screen edges on non-16:9 tablets are the same purple while the logo is up.
- **Android splash** (the picture shown while the app opens): now the full upright Banx Games logo on the same purple, in every size. Android 12+ tablets show their own opening screen first, and that is set to the same purple. The splash pictures total 3.4 MB (the old Pip ones were 2.7 MB).
- **Parent Area → new CREDITS tab:** the logo at the top, "Little Legends: Magic World — made by Banx Games", then the sound credits (moved there from the DATA tab).
- **Logo file:** shrunk from 578 KB to 186 KB and still 680×680. It's in `art_manifest.json` (id `ui.studio_logo`; now 973 pictures), the starter set and the offline cache (cache version bumped).
- **Check fix:** the Job 15 "flick the ball" test failed about 1 run in 3. When the rolling ball stopped under the alphabet blocks, the test grabbed the blocks instead. Only the test was wrong, not the game. It now moves the blocks aside first, and the check passed 6 times out of 6.
- `scripts/make-icons.cjs` now builds the splash from `Banx Games/_BRAND/banx_games_logo.png`. The app icons are unchanged (still Pip).

## Not done
- APK rebuild: blocked until Android Studio is installed on this PC.

## What Aaron needs to do
- Install Android Studio (see Job 15B) so CC can rebuild the APK.
- On the tablet, once there's a new APK: check that the logo shows for about 1.5 s and a tap skips it, that the splash is the new logo, and look at Parent Area → CREDITS.
- Say if you'd rather have #120a1f exactly. It would show a faint square around the logo.

## Commit
- See the git log for "Job 16". Pushed: yes. APK rebuilt: no (blocked).
