# Little Legends Build Status — M0–M29 Playable Fix 1

## Playability blocker fixed
- Fixed a legacy-save migration bug that could crash/reset when opening Dino Valley / the **1 2 3** world.
- Old profile states now deep-migrate `adventure.completed`, island placements, Pip outfit, unlock arrays and nested settings safely.
- World hub completion rendering is defensive against malformed/older save data.
- Scene update/render/input errors are contained so one activity cannot kill the main game loop.
- Regression now runs **all 29 generic Little Missions end-to-end**, plus Rory's custom Dino Picnic flow.
- 119 activity definitions remain covered by the reusable activity-engine checks.

## Current checkpoint

**M0–M29 release-qualification implementation complete.**

The locked JavaScript/Canvas build plan ends at Milestone 29. The codebase now contains the implementation and evidence tooling needed to qualify that milestone, but **M26 child independence and M29 real-device release gates remain human/device tests and are not claimed as passed**.

## M29 qualification tooling added

- [x] Parent Area → RELEASE tab
- [x] Automated local self-check
- [x] Device snapshot capture
- [x] Persistent manual release checklist
- [x] PASS / FAIL / PENDING / N/A evidence states
- [x] Child, experience, device and parent gate coverage
- [x] Purchase gate explicitly N/A while commerce is disabled
- [x] Release qualification JSON export
- [x] Device/runtime/save/performance metadata in export
- [x] Child-test sessions included in release report
- [x] Release evidence persists locally between sessions
- [x] M29 qualification module included in offline PWA cache
- [x] Standalone one-file M29 qualification build
- [x] SHA-256 artifact manifest generation
- [x] Repeatable `npm run rc:check` pipeline
- [x] Release test protocol document

## Automated regression status

PASS:

- 74 required files
- 66 JavaScript syntax checks
- 119 JSON activities
- 25 reusable activity families
- 30 Little Missions
- profile isolation
- local saves / backup recovery / migration foundation
- rewards / collection / Wonder Island
- adaptive learning / scheduler
- accessibility settings
- privacy static audit
- child-test recorder
- release qualification recorder
- performance instrumentation
- offline/PWA source-cache coverage
- embedded Bunny meadow artwork
- standalone package generation

## Human/device gates still required

### M26 / Gate 4

- [ ] Age 2 independent observation
- [ ] Age 3 independent observation
- [ ] Age 4 independent observation
- [ ] Age 5 independent observation
- [ ] Most core activities understandable without adult instruction

### M29

- [ ] First / returning / multiple-profile walkthrough
- [ ] Hint recovery walkthrough
- [ ] Reward use + free play walkthrough
- [ ] Modern iPad sustained performance
- [ ] Supported Android tablet sustained performance
- [ ] Weak-device Lite-mode 30 FPS playability
- [ ] Offline installed-PWA cold start
- [ ] Install / update / reinstall behaviour
- [ ] Real prior-build save migration
- [ ] Low-storage behaviour
- [ ] Suspend/resume during drag, voice, reward and save
- [ ] Parent profiles/settings/progress/privacy walkthrough
- [ ] Store/legal privacy wording review

## Art state

The approved Bunny meadow/picnic background is integrated and embedded in the standalone tester. Pip/Bunny/guide character rendering remains replaceable until the 3D-model → rig → sprite-capture pipeline produces the final sprite sheets.

## Next action

Use the standalone tester and **Parent Area → RELEASE** to begin recording real device evidence. The next coding changes should be driven by failures found in those tests or by final art/audio replacement, not by adding new gameplay systems.