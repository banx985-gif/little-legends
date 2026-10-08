# Little Legends — M29 Release Test Protocol

This protocol records evidence for the release-candidate checks in the locked JavaScript/Canvas milestone plan. Automated checks do not substitute for the child/device gates.

## 1. Start a qualification record

1. Open the build.
2. Enter **Parent Area**.
3. Open **RELEASE**.
4. Tap **RUN SELF-CHECK**.
5. Tap **CAPTURE DEVICE**.
6. Leave checklist items PENDING until they are actually tested.

## 2. Child independence

Use Parent Area → TEST for separate age 2, 3, 4 and 5 observations.

Do not coach. Record first tap, mis-taps, lost drags, confusing instructions, completion, hint frequency, repeat requests, boredom, favourites and parent interventions.

Only mark **Gate 4** PASS when most core activities are understandable without adult instruction.

## 3. Device performance

On each target tablet:

- play for at least 10 minutes in Auto mode;
- visit several activity families, Wonder Island and Jungle Jam;
- record the Parent Area → DATA FPS / frame-time values;
- capture a RELEASE device snapshot;
- test Lite mode on the weaker device.

Mark iPad / Android / Lite checks individually.

## 4. Offline cold start

For the installable PWA build (not only the single-file standalone):

1. Load once online and allow installation/cache population.
2. Close the app completely.
3. Disable Wi-Fi/mobile data.
4. Cold-start the installed app.
5. Create/play/resume a mission and return to Wonder Island.
6. Confirm saves still work.

## 5. Install / update / reinstall

Test these as separate behaviours:

- clean install;
- update from a prior build without losing child profiles;
- reinstall behaviour, noting whether browser/platform storage is preserved or removed;
- real prior-build save migration.

Never infer these from a desktop browser test.

## 6. Suspension / interruption

Suspend or background during:

- active drag;
- Pip voice;
- reward reveal;
- a save-producing action.

Resume and confirm there is no stuck pointer, duplicated reward, broken audio or corrupt save.

## 7. Parent walkthrough

Confirm:

- create/switch profiles;
- settings persist;
- learning summary is understandable;
- privacy screen is clear;
- data export works;
- release report exports;
- purchase gate is N/A while commerce remains disabled.

## 8. Finish

In Parent Area → RELEASE, tap each row to record PASS / FAIL / N/A. Export the release qualification JSON and keep it with the exact build that was tested.

M29 only passes when the required human/device items are no longer pending and there are no unresolved failures.
