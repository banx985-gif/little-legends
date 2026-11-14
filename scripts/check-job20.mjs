// Job 20 checks (run from scripts/check.mjs): every screen filled (no bars), and notifications with on/off switches.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function checkJob20({ root, FakeCanvasContext, sceneAudio }) {
  const { CanvasViewport } = await import('../src/render/CanvasViewport.js');
  const screen = await import('../src/render/screen.js');
  const { HOME_BUTTON, onHomeButton } = await import('../src/utils/draw.js');
  const { HoldToLeave } = await import('../src/ui/HoldToLeave.js');
  const { SHAPES, FAKE_INSETS } = await import('./qa-shapes.mjs');
  const N = await import('../src/notify/Notifications.js');
  const { SaveSystem } = await import('../src/save/SaveSystem.js');
  const { WonderIslandScene } = await import('../src/scenes/WonderIslandScene.js');
  const { ParentGateScene } = await import('../src/scenes/ParentGateScene.js');
  const { NotifyAsk } = await import('../src/ui/NotifyAsk.js');

  // ---------- Part A: fill every screen ----------
  const hadWindow = 'window' in globalThis, oldWindow = globalThis.window, oldScreen = globalThis.__LL_SCREEN;
  globalThis.window ??= { devicePixelRatio: 3 };
  try {
    assert.deepEqual(SHAPES.map(s => `${s.width}x${s.height}`), ['2340x1080', '1920x1080', '2520x1080', '2000x1200', '2048x1536'], 'QA covers 19.5:9 (base), 16:9, 21:9, 16:10 and 4:3');
    assert.deepEqual(FAKE_INSETS, { left: 40, top: 0, right: 0, bottom: 24 }, 'QA fakes a 40 px notch on the left and a 24 px gesture bar');
    const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`);
    for (const shape of SHAPES) for (const fake of [null, FAKE_INSETS]) {
      globalThis.__LL_FAKE_INSETS = fake;
      const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ left: 0, top: 0, width: shape.width, height: shape.height }) };
      const v = new CanvasViewport(canvas, 1920, 1080), vis = v.visibleRect, safe = v.safeRect, tag = `${shape.width}×${shape.height}${fake ? ' with insets' : ''}`;
      // The whole screen is the canvas (no bars), and it is the visible area.
      const tl = v.clientToWorld(0, 0), br = v.clientToWorld(shape.width, shape.height);
      near(tl.x, vis.x, `${tag}: left edge`); near(tl.y, vis.y, `${tag}: top edge`); near(br.x, vis.x + vis.w, `${tag}: right edge`); near(br.y, vis.y + vis.h, `${tag}: bottom edge`);
      // The 1920×1080 core is always all there, inside the safe area (clear of the notch and the gesture bar).
      assert.ok(safe.x <= 0.01 && safe.y <= 0.01 && safe.x + safe.w >= 1919.99 && safe.y + safe.h >= 1079.99, `${tag}: the play area is inside the safe area`);
      assert.ok(Math.abs(safe.w - 1920) < 0.5 || Math.abs(safe.h - 1080) < 0.5, `${tag}: the play area fills the safe area one way`);
      if (fake) { near(safe.x - vis.x, fake.left / v.scale, `${tag}: notch kept clear`); near(vis.y + vis.h - (safe.y + safe.h), fake.bottom / v.scale, `${tag}: gesture bar kept clear`); }
      // A phone held sideways (19.5:9) sees the base size, 2340×1080.
      if (shape.width === 2340 && !fake) { near(vis.w, 2340, 'base width'); near(vis.h, 1080, 'base height'); }
      // Backgrounds cover the whole screen.
      const c = screen.coverTransform();
      assert.ok(c.x <= vis.x + 0.01 && c.y <= vis.y + 0.01 && c.x + 1920 * c.k >= vis.x + vis.w - 0.01 && c.y + 1080 * c.k >= vis.y + vis.h - 0.01, `${tag}: backgrounds cover the screen`);
      // Corner buttons sit inside the safe area, and a tap on them still hits.
      const hb = HOME_BUTTON; assert.ok(hb.x - hb.r >= safe.x && hb.y - hb.r >= safe.y, `${tag}: home button inside the safe area`); assert.ok(onHomeButton(hb.x, hb.y), `${tag}: home button tap`);
      const leave = new HoldToLeave(); assert.ok(leave.x + leave.r <= safe.x + safe.w && leave.contains({ x: leave.x, y: leave.y }), `${tag}: hold-to-leave inside the safe area`);
      // Touch: a finger at the screen's centre lands on the core's centre when the safe area is centred.
      if (!fake) { const m = v.clientToWorld(shape.width / 2, shape.height / 2); near(m.x, 960, `${tag}: touch x`); near(m.y, 540, `${tag}: touch y`); }
    }
    // Cheap tablets: a wide phone's bigger canvas still keeps to the Lite pixel cap.
    globalThis.__LL_FAKE_INSETS = null;
    const wide = { width: 0, height: 0, getBoundingClientRect: () => ({ left: 0, top: 0, width: 2520 / 3, height: 1080 / 3 }) };
    const wv = new CanvasViewport(wide); wv.setMaxPixels(1280 * 720); assert.ok(wide.width * wide.height <= 1280 * 720 * 1.02, 'Lite pixel cap holds on a 21:9 phone');
  } finally {
    globalThis.__LL_FAKE_INSETS = null; globalThis.__LL_SCREEN = oldScreen;
    if (hadWindow) globalThis.window = oldWindow; else delete globalThis.window;
  }
  // No screen paints only the 1920×1080 box any more; the safe-area padding is gone from #app.
  for (const f of fs.readdirSync(path.join(root, 'src/scenes'))) assert.ok(!/fillRect\(\s*0\s*,\s*0\s*,\s*1920\s*,\s*1080\s*\)/.test(fs.readFileSync(path.join(root, 'src/scenes', f), 'utf8')), `${f} fills the whole screen, not just 1920×1080`);
  assert.ok(!/padding:\s*\n?\s*env\(safe-area/.test(fs.readFileSync(path.join(root, 'styles.css'), 'utf8')), 'No safe-area padding around the canvas (it shrank it and showed bars)');
  const main = fs.readFileSync(path.join(root, 'app-android/android/app/src/main/java/com/banxgames/littlelegends/MainActivity.java'), 'utf8');
  assert.ok(main.includes('setDecorFitsSystemWindows(getWindow(), false)') && main.includes('LAYOUT_IN_DISPLAY_CUTOUT_MODE'), 'Android: edge to edge, under the camera cut-out');
  assert.ok(fs.readFileSync(path.join(root, 'app-android/android/app/src/main/AndroidManifest.xml'), 'utf8').includes('sensorLandscape'), 'Android: still sideways');

  // ---------- Part B: notifications ----------
  const H = 3600e3, local = (y, mo, d, h, mi = 0) => new Date(y, mo, d, h, mi).getTime();
  // Quiet hours: nothing between 22:00 and 08:00; one that would land there moves to 08:00–09:00.
  for (const [h, m] of [[22, 0], [23, 30], [2, 0], [7, 59]]) { const t = N.outOfQuietHours(local(2026, 10, 14, h, m)); const d = new Date(t); assert.ok(d.getHours() === 8, `${h}:${m} moves to 8 am`); }
  assert.equal(N.outOfQuietHours(local(2026, 10, 14, 12)), local(2026, 10, 14, 12), 'Daytime stays');
  // Planned at 20:30: egg (+3 h = 23:30) and reward (+4 h) both move to the next morning, at most 2 that day.
  const evening = local(2026, 10, 14, 20, 30);
  let list = N.plan(evening, [{ kind: 'egg', profileId: 'a' }, { kind: 'reward', profileId: 'a' }]);
  assert.equal(list.length, 2); for (const n of list) { const d = new Date(n.at); assert.ok(!N.inQuietHours(n.at) && d.getHours() === 8 && d.getDate() === 15, 'Moved out of quiet hours to 08:00–09:00'); }
  assert.notEqual(list[0].at, list[1].at, 'Two reminders don\'t land on the same minute');
  // The 2-a-day cap counts what was already sent that day: the third moves to the next day.
  const noon = local(2026, 10, 14, 10);
  list = N.plan(noon, [{ kind: 'egg', profileId: 'a' }, { kind: 'reward', profileId: 'a' }], [local(2026, 10, 14, 9), local(2026, 10, 14, 9, 30)]);
  for (const n of list) assert.equal(new Date(n.at).getDate(), 15, 'Day already had 2: next day');
  list = N.plan(noon, [{ kind: 'egg', profileId: 'a' }, { kind: 'reward', profileId: 'a' }], [local(2026, 10, 14, 9)]);
  assert.deepEqual(list.map(n => new Date(n.at).getDate()), [14, 15], 'One left today, the other tomorrow');
  assert.deepEqual(list.map(n => n.id), [N.NOTIFY_IDS.egg, N.NOTIFY_IDS.reward], 'One fixed id per kind: never two pending of a kind');

  // A save: old saves migrate (main switch off until permission, kinds on, trail off).
  const save = new SaveSystem({ indexedDBRef: null, storage: null }); await save.init();
  const kid = await save.createProfile({ name: 'Mia', age: 4 });
  const old = JSON.parse(JSON.stringify(save.root)); delete old.notify; delete old.profileStates[kid.id].notify; delete old.profileStates[kid.id].rewardsWaiting;
  const old2 = JSON.parse(JSON.stringify(old)); old2.notify = { permission: 'granted' };
  const migrated = save.migrate(old);
  assert.deepEqual(migrated.notify, { permission: 'unknown', asked: false, askDue: false, sent: [] }, 'Older saves: the device has not been asked');
  assert.deepEqual(migrated.profileStates[kid.id].notify, { on: false, egg: true, reward: true, trail: true, trailOffered: true }, 'Older saves: main switch off, kinds on (the trail kind too, now the Adventure Trail exists)');
  { const o3 = JSON.parse(JSON.stringify(old2)); o3.profileStates[kid.id].notify = { on: true, egg: true, reward: true, trail: false, trailOffered: true }; assert.equal(save.migrate(o3).profileStates[kid.id].notify.trail, false, 'A grown-up who switched the trail off keeps it off'); }
  assert.equal(save.migrate(old2).profileStates[kid.id].notify.on, true, 'Main switch on once this device has permission');

  // A fake device notifier (records what it was asked to do).
  const fakeNotifier = (perm = 'denied', answer = 'granted') => ({ name: 'test', perm, answer, scheduled: [], cancelled: [], cleared: 0, tapFn: null, requests: 0,
    async permission() { return this.perm; }, async request() { this.requests++; this.perm = this.answer; return this.perm; },
    async schedule(l) { this.scheduled.push(...l); }, async cancel(ids) { this.cancelled.push(...ids); }, async clearAll() { this.cleared++; }, onTap(f) { this.tapFn = f; } });
  const scenesLog = [];
  const game = { save, scenes: { registry: new Map([['island', 1], ['adventure', 1], ['profile', 1]]), change(name, data) { scenesLog.push({ name, data }); } }, activateProfile: async id => save.selectProfile(id), audio: sceneAudio };
  const dev = fakeNotifier();
  const notify = new N.Notifications(game, dev); game.notify = notify;
  // No ask at first launch.
  assert.equal(notify.shouldAsk(), false, 'No ask at first launch');
  await notify.leaving(); assert.equal(dev.scheduled.length, 0, 'Nothing scheduled without permission');
  // After the first win: Pip asks (once per device). NOT NOW is remembered for good.
  await notify.firstWin(); assert.equal(notify.shouldAsk(), true, 'Asked after the first win');
  await notify.notNow(); assert.equal(notify.shouldAsk(), false); await notify.firstWin(); assert.equal(notify.shouldAsk(), false, 'NOT NOW: never asked again');
  // YES path (fresh device): grown-up hold, then the system's question; granted → this child's main switch on.
  await save.setNotifyDevice({ asked: false, askDue: false }); await notify.firstWin();
  const islandGame = { ...game, notify, rewards: { list: () => [], get: () => null, isUnlocked: () => false, ensureLoaded: async () => {} }, assets: { loadArt: async () => {} }, adventureEngine: { ensureLoaded: async () => {}, next: () => null, list: () => [] } };
  const ask = new NotifyAsk(islandGame);
  ask.update(0.1); ask.handlePointer({ type: 'down', x: 740, y: 660 }); ask.handlePointer({ type: 'up', x: 740, y: 660 }); assert.equal(ask.stage, 'hold', 'YES → the grown-up hold');
  assert.equal(dev.requests, 0, 'No system question before the grown-up hold');
  ask.handlePointer({ type: 'down', x: 960, y: 640 }); ask.update(1.5); ask.handlePointer({ type: 'up', x: 960, y: 640 }); assert.equal(ask.stage, 'hold', 'Letting go early does nothing');
  ask.handlePointer({ type: 'down', x: 960, y: 640 }); for (let i = 0; i < 32; i++) ask.update(0.1); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  assert.equal(dev.requests, 1, 'After 3 s: the system question'); assert.equal(save.getNotifyDevice().permission, 'granted'); assert.equal(save.getNotify(kid.id).on, true, 'Granted: this child\'s reminders on');
  assert.equal(notify.shouldAsk(), false, 'Asked once only');
  const fctx = new FakeCanvasContext(); ask.render(fctx); assert.equal(fctx.depth ?? 0, 0);
  // System says no: switches stay off.
  { const s2 = new SaveSystem({ indexedDBRef: null, storage: null }); await s2.init(); const k2 = await s2.createProfile({ name: 'Leo', age: 3 }); const d2 = fakeNotifier('denied', 'denied'); const n2 = new N.Notifications({ ...game, save: s2 }, d2);
    assert.equal(await n2.yes(k2.id), 'denied'); assert.equal(s2.getNotify(k2.id).on, false, 'System said no: switches off'); assert.equal(s2.getNotifyDevice().permission, 'denied'); await n2.leaving(); assert.equal(d2.scheduled.length, 0); }
  // Scheduling from the save: an egg READY → one egg reminder; a prize waiting → one reward reminder.
  await save.saveEgg('rory-dino-egg', { id: 'rory-dino-egg', rewardId: 'baby_raptor', state: 'READY', interactions: 0 });
  await save.mutateProfileState(st => { st.rewardsWaiting = ['decor_slide_rainbow']; });
  dev.scheduled.length = 0; await notify.leaving(local(2026, 10, 14, 10));
  assert.deepEqual(dev.scheduled.map(n => n.kind).sort(), ['egg', 'reward'], 'Egg ready and reward waiting scheduled');
  assert.ok(dev.scheduled.every(n => !N.inQuietHours(n.at)), 'Never at night');
  assert.equal(dev.scheduled.find(n => n.kind === 'egg').body, N.NOTIFY_TEXT.egg.body);
  // Turning a kind off (or the main switch) cancels the pending ones; turned-off kinds are not scheduled again.
  dev.cancelled.length = 0; await notify.setSwitch('egg', false, kid.id); assert.deepEqual(dev.cancelled, [N.NOTIFY_IDS.egg], 'Egg switch off cancels the egg reminder');
  dev.scheduled.length = 0; await notify.leaving(local(2026, 10, 16, 10)); assert.deepEqual(dev.scheduled.map(n => n.kind), ['reward'], 'Switched-off kind not scheduled');
  dev.cancelled.length = 0; await notify.setSwitch('on', false, kid.id); assert.deepEqual(dev.cancelled.sort(), Object.values(N.NOTIFY_IDS).sort(), 'Main switch off cancels everything');
  dev.scheduled.length = 0; await notify.leaving(local(2026, 10, 17, 10)); assert.equal(dev.scheduled.length, 0, 'Main switch off: nothing');
  await notify.setSwitch('on', true, kid.id); await notify.setSwitch('egg', true, kid.id);
  // Coming back clears shown and pending.
  const c0 = dev.cleared; await notify.opened(); assert.equal(dev.cleared, c0 + 1, 'Opening the game clears reminders');
  // Tap routing: egg → that child's mission with the egg (or the island); reward → island; unknown child with 2 children → picker first.
  await save.saveAdventure?.('rory_dino_picnic', 3);
  scenesLog.length = 0; dev.tapFn({ kind: 'egg', profileId: kid.id }); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  assert.equal(scenesLog.at(-1)?.name, save.getProfileState(kid.id).adventure.currentId ? 'adventure' : 'island', 'Egg tap: the egg\'s mission');
  scenesLog.length = 0; dev.tapFn({ kind: 'reward', profileId: kid.id }); await new Promise(r => setTimeout(r, 0)); assert.equal(scenesLog.at(-1)?.name, 'island', 'Reward tap: Wonder Island');
  assert.deepEqual(N.route(save, { kind: 'reward', profileId: 'gone' }).scene, 'island', 'One child only: no doubt who');
  await save.createProfile({ name: 'Ava', age: 5 }); await save.selectProfile(kid.id);
  const r = N.route(save, { kind: 'reward', profileId: 'gone' }); assert.equal(r.scene, 'profile', 'Unknown child: Who is playing? first'); assert.equal(r.data.then.scene, 'island', 'then the screen');
  // Settings: the switches in Parent Area → Settings → SWITCHES.
  const pgame = { ...game, notify, unlock: null, audio: { ...sceneAudio, getSettings: () => ({}) }, learning: { getDashboard: () => ({ skills: [] }) } };
  const pg = new ParentGateScene(pgame); pg.enter({ skipGate: true, tab: 'settings' });
  const tapAt = (x, y) => { pg.handlePointer({ type: 'down', x, y }); pg.handlePointer({ type: 'up', x, y }); };
  tapAt(1400, 830); assert.equal(pg.notifyOpen, true, 'SWITCHES opens the notification switches'); pg.render(new FakeCanvasContext());
  dev.cancelled.length = 0; tapAt(500, 410); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  assert.equal(save.getNotify(kid.id).egg, false, 'Egg switch off from Settings'); assert.ok(dev.cancelled.includes(N.NOTIFY_IDS.egg), '…and its reminder cancelled');
  tapAt(900, 890); assert.equal(pg.notifyOpen, false, 'DONE closes them');
  // Web without permission does nothing (and never throws); the one-file build and plain Node have no notifier.
  const web = N.pickNotifier({ Notification: Object.assign(function () { throw new Error('must not be called'); }, { permission: 'default', requestPermission: async () => 'denied' }), location: { protocol: 'https:' }, navigator: {} });
  assert.equal(web.name, 'web'); assert.equal(await web.permission(), 'denied'); await web.schedule([{ id: 1, at: Date.now(), kind: 'egg' }]); await new Promise(r => setTimeout(r, 5)); await web.clearAll();
  assert.equal(N.pickNotifier({ __LL_STANDALONE: true, Notification: function () {} }).name, 'none', 'One-file build: no notifications');
  assert.equal(N.pickNotifier({}).name, 'none', 'No notification support: skipped quietly');
  const webGame = new N.Notifications({ ...game, save: new SaveSystem({ indexedDBRef: null, storage: null }) }, web); await webGame.save.init(); assert.deepEqual(await webGame.leaving(), [], 'Web without permission: nothing scheduled');
  // Android: plugin, small white icon, permission, inexact alarms.
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'app-android/package.json'), 'utf8'));
  assert.ok(pkg.devDependencies['@capacitor/local-notifications'], 'Android: Capacitor Local Notifications');
  const cap = JSON.parse(fs.readFileSync(path.join(root, 'app-android/capacitor.config.json'), 'utf8'));
  assert.equal(cap.plugins?.LocalNotifications?.smallIcon, 'ic_stat_notify');
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) assert.ok(fs.existsSync(path.join(root, `app-android/android/app/src/main/res/drawable-${d}/ic_stat_notify.png`)), `notification icon ${d}`);
  assert.ok(!fs.readFileSync(path.join(root, 'app-android/android/app/src/main/AndroidManifest.xml'), 'utf8').includes('android.permission.SCHEDULE_EXACT_ALARM'), 'Inexact alarms only');
  // Privacy says so everywhere.
  for (const f of ['privacy.html', 'docs/PRIVACY.md', 'docs/GOOGLE_PLAY_STEPS.md', 'src/privacy/PrivacyPolicy.js']) assert.ok(/[Rr]eminders?/.test(fs.readFileSync(path.join(root, f), 'utf8')) && /nothing is sent|send nothing|sends nothing|Nothing is sent/i.test(fs.readFileSync(path.join(root, f), 'utf8')), `${f} says reminders are local and send nothing`);
  assert.ok(fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes('notificationclick'), 'Web: a tap opens the game');
  // Island: the reminder ask waits for the prizes, then shows (once).
  { const s3 = new SaveSystem({ indexedDBRef: null, storage: null }); await s3.init(); await s3.createProfile({ name: 'Zoe', age: 4 }); const d3 = fakeNotifier(); const g3 = { ...islandGame, save: s3 }; g3.notify = new N.Notifications(g3, d3);
    const isl = new WonderIslandScene(g3); await isl.enter({}); isl.update(0.1); assert.ok(!isl.notifyAsk, 'No ask on the island at first launch');
    await g3.notify.firstWin(); isl.update(0.1); assert.ok(isl.notifyAsk?.active, 'After the first win the island asks'); isl.render(new FakeCanvasContext());
    isl.handlePointer({ type: 'down', x: 1180, y: 660 }); isl.handlePointer({ type: 'up', x: 1180, y: 660 }); await new Promise(r => setTimeout(r, 0)); isl.update(0.1); assert.ok(!isl.notifyAsk, 'NOT NOW closes it'); assert.equal(s3.getNotifyDevice().asked, true); }
  return true;
}
