# Little Legends: Magic World

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
