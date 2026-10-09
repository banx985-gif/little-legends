# Little Legends: privacy (version 1.1)

The public policy page is `privacy.html` in the game folder. On the live site it is at
https://banx985-gif.github.io/little-legends/privacy.html, which is the link to give Google Play.
The Parent Area → PRIVACY tab (`src/privacy/PrivacyPolicy.js`) says the same thing; keep the two in step.

**Everything stays on the tablet. Little Legends never sends anything over the internet.**

## What is kept on the tablet
- **Child profiles:** first name or nickname, age 2–5, language, favourite colour.
- **Play progress:** missions finished and where a mission was left, Discovery Stars, eggs.
- **Rewards and island:** friends, Pip’s looks, decorations, rides, and where things stand on Wonder Island.
- **Learning record:** which skills were practised, right/try-again counts and hints. It is used only to pick the next activity and for the grown-up learning page.
- **Family settings:** volumes, quiet mode, motion, text size, colour symbols, break reminder, picture quality.
- **Grown-up tools (only if used):** TEST-tab session notes and the RELEASE checklist.
- **Game files:** pictures and code kept for offline play, with no personal data.

Where it is kept:
- The save is in the browser’s or app’s IndexedDB (`little-legends`), with a localStorage copy as backup.
- Two small localStorage switches are kept on the device: the picture-stats overlay and the slowest picture-quality mode it needed.

## Never collected
Email, photos, voice, location, contacts, device or advertising IDs, usage analytics.

## Promises
- No ads.
- No purchases.
- No chat or public profiles.
- No links out of child play.
- No camera, microphone or location.
- No accounts.

## Technical notes
- The Android app (`app-android/`) asks only for INTERNET, which Android's web view needs to show the game's own built-in pages; the game makes no network requests.
- `allowBackup` is off, so Android doesn’t copy saves to the cloud.
- The web version is loaded from GitHub Pages like any website, but the game itself makes no network requests apart from fetching its own files.
- Parents can export or delete everything in Parent Area → DATA.
