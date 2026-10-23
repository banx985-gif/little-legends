# Little Legends: privacy (version 1.2)

The public policy page is `privacy.html` in the game folder. On the live site it is at
https://banx985-gif.github.io/little-legends/privacy.html, which is the link to give Google Play.
The Parent Area → PRIVACY tab (`src/privacy/PrivacyPolicy.js`) says the same thing; keep the two in step.

**Everything about the child stays on the tablet.** The only network use is Google Play Billing in the Android app, checking the one-time "Unlock everything" (Job 18). It sends nothing about the child.

## What is kept on the tablet
- **Child profiles:** first name or nickname, age 2–5, language, favourite colour.
- **Play progress:** missions finished and where a mission was left, Discovery Stars, eggs.
- **Rewards and island:** friends, Pip’s looks, decorations, rides, and where things stand on Wonder Island.
- **My Pictures (Job 17):** the child's colouring, saved as pictures in IndexedDB on the tablet.
- **Full-game unlock (Job 18):** whether this tablet has the full game. Google Play keeps the purchase with the grown-up's Google account.
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
- No coins, gems or repeat buying. One optional payment, only in the Parent Area after a grown-up check (hold 3 s, then a sum in words). Children never see a price.
- No chat or public profiles.
- No links out of child play.
- No camera, microphone or location.
- No accounts.

## Technical notes
- The Android app (`app-android/`) asks for INTERNET (Android's web view needs it for the built-in pages, and Google Play Billing uses it) and Google Play's BILLING permission, which the billing library adds. The game itself makes no other network requests.
- Billing: `src/store/FullUnlock.js` and `BillingPlugin.java` talk only to Google Play on the tablet (product `full_unlock`). There is no server of ours. The result (owned or not) is kept on the tablet, so the unlock works offline. It is re-checked when the app starts or comes back to the front.
- `allowBackup` is off, so Android doesn’t copy saves to the cloud.
- The web version is loaded from GitHub Pages like any website, but the game itself makes no network requests apart from fetching its own files. It has no store, so everything is unlocked there.
- Parents can export or delete everything in Parent Area → DATA.
