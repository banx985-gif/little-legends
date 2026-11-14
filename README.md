# Little Legends: Magic World

## Server decision: NO live server (Studio server standard, 13 Nov 2026; waiting on Aaron to confirm)
Little Legends is single-player. It has no player-vs-player, leaderboards, live events, friends/chat/gifting or shared world, so it gets **no Supabase project**.
- **Saves:** on the tablet, per child. No cloud save: on a new tablet the bought unlock comes back with RESTORE PURCHASE, and progress starts fresh (fine for ages 2–5).
- **Purchases:** Google Play Billing only (one-time `full_unlock`, checked by Google Play, stored on the tablet, works offline). Cheating on one A$4.99 unlock isn't worth a server.
- **Ads:** none. Aaron decided "no ads" for this kids' game, and it keeps the Google Play Families policy simple. So no AdMob, even though the studio standard allows it.
- **Notifications** (Job 20) are scheduled on the device, so they need no server either.
- **Stores:** Google Play first. Apple App Store later: keep the code shared and avoid Android-only shortcuts where an easy shared way exists, but build no iPhone-store features yet.
- **Billing test mode:** keep a test mode with one switch to go live, plus a build check so a store release can't ship in test mode. The Play Console account is still waiting on Aaron's DUNS number.
- Don't add any network use, accounts or analytics "just in case". If a future feature needs sharing between players, stop and ask Aaron first.


Tablet-first JavaScript + HTML5 Canvas educational adventure game for ages 2–5.

## Current build

`0.29.0-pre-rc.1`

The locked M0–M29 implementation is present. M26 child-independence and M29 real-device release gates are intentionally still open.

## Run locally

Serve this folder with any static HTTP server, then open `index.html`.

For no-server testing, use the generated single-file standalone build:

`LITTLE_LEGENDS_STANDALONE_M0_M29_PRE_RC.html`

## Commands

```bash
npm run check
npm run standalone
npm run rc:check
```

`npm run rc:check` runs the regression suite, generates the standalone, verifies the M29 package marker/art/evidence tooling, writes `RELEASE_CANDIDATE_STATUS.md`, and creates `RELEASE_ARTIFACT_MANIFEST.json` with SHA-256 hashes.

## Parent Area

- **LEARNING** — evidence-based learning summary
- **SETTINGS** — audio, accessibility, break reminder and performance mode
- **PROFILES** — up to four local child profiles
- **TEST** — M26 child-observation recorder
- **RELEASE** — M29 self-check, device snapshots and release evidence checklist
- **DATA** — export/reset and device/save health
- **PRIVACY** — local-only V1 privacy contract

## Release qualification

Read:

- `docs/RELEASE_TEST_PROTOCOL.md`
- `RELEASE_CANDIDATE_STATUS.md`
- `RELEASE_ARTIFACT_MANIFEST.json`

The RELEASE panel does not automatically mark human/device checks as passed. Those gates must be recorded only after actual testing.
