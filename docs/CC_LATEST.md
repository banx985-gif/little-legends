# CC latest — Job 15B (new PC check)

- **When:** 2026-10-24
- **Job:** JOB_15B_NEW_PC_SETUP
- **Status:** DONE (Android APK build BLOCKED until two installs — see below)

## This PC (D:\Banx Games)
- Git: OK. HEAD was `2e822ea` (Job 15). No "dubious ownership" warning. `git fetch` and `git push --dry-run` both work — GitHub sign-in is fine.
- Node: OK — v24.22.1, npm 11.19.1. Copied `node_modules` work; no reinstall needed.
- `npm run check`: PASS. `npm run standalone`: PASS (8.1 MB, 90 of 972 pictures embedded as before).
- Counts: `art_manifest.json` lists 972 pictures; `assets/audio/` holds 80 sounds. Both as expected.
- Chrome: OK. Edge: OK (the QA scripts can use either).
- Java 21: **MISSING** (only old Java 8 is installed, which can't build the app).
- Android SDK + adb: **MISSING** (nothing at `%LOCALAPPDATA%\Android\Sdk` or anywhere else on C: or D:).
- ffmpeg: **MISSING** (optional; only needed when converting new sounds).

## What changed
- No game code changed. Committed the new "write docs/CC_LATEST.md" rule in CLAUDE.md and this file.
- `local.properties` still points at the laptop's SDK path. It wasn't changed because this PC has no SDK yet. `app-android/build.mjs` rewrites it automatically once the SDK is installed.

## Not done
- APK rebuild: can't happen until Java 21 and the Android SDK are installed.

## What Aaron needs to do
- Install **Android Studio** (developer.android.com/studio). Open it once and let it download the SDK. That gives the Android SDK, adb and a built-in Java 21, all in the places the build looks.
- Optional: install ffmpeg (`winget install ffmpeg`), only needed for new sound files.
- Tell CC when that's done, and it will rebuild the APK.

## Commit
- See the git log for "Job 15B". Pushed: yes. APK rebuilt: no (blocked).
