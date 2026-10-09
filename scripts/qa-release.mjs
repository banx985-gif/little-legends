// Release checks we can automate (Job 08), in real Chrome:
//   1. Offline: load once, play a world, go offline, reload — the game and that world still work.
//   2. Save migration: a save made by an older build (build history zip + the build that is live now)
//      is loaded by this build, and the child's profile, progress, rewards and island survive.
//   3. Lite mode holds 30 FPS on every world, with the CPU slowed down 4× to stand in for a weak tablet.
// Results: docs/qa_shots/release_checks.json (+ screenshots in docs/qa_shots/release/).
//
//   npm run qa:release                 all three
//   npm run qa:release -- --only=offline|migration|lite
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer, findChrome, sleep } from './qa-common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'docs', 'qa_shots');
const SHOTS = path.join(OUT, 'release');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const HISTORY_ZIP = path.resolve(root, '../../08_BUILD_HISTORY/LITTLE_LEGENDS_BUILD_M0_M29_PLAYABLE_FIX1.zip');
const WORLDS = ['dino', 'rainbow', 'space', 'animal', 'storybook', 'life', 'town'];

const results = [];
const record = (id, label, ok, detail) => { results.push({ id, label, status: ok ? 'pass' : 'fail', detail }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`); };

async function newPage(browser, { blockArtCaching = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept('Mia'));
  // Stand-in for a slow connection: the background "cache every picture" job never gets to run before going offline.
  if (blockArtCaching) await page.evaluateOnNewDocument(() => { const post = ServiceWorker.prototype.postMessage; ServiceWorker.prototype.postMessage = function (m, ...r) { if (m === 'cache-art') return; return post.call(this, m, ...r); }; });
  return { context, page, errors };
}
const game = (page, fn, arg) => page.evaluate(fn, arg);
async function waitFor(page, fn, max = 15000, arg) { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await page.evaluate(fn, arg).catch(() => false)) return true; await sleep(150); } return false; }
async function goScene(page, name, data = {}) {
  await page.evaluate((n, d) => window.__littleLegends.scenes.change(n, d), name, data);
  await waitFor(page, n => { const g = window.__littleLegends; return g?.scenes.currentName === n && !g.scenes.busy; }, 10000, name);
  await sleep(600);
}
async function newProfile(page) {
  await waitFor(page, () => window.__littleLegends?.scenes.currentName === 'profile');
  await page.evaluate(async () => { const g = window.__littleLegends; const p = await g.save.createProfile({ name: 'Mia', age: 4 }); await g.activateProfile(p.id); });
  await goScene(page, 'island');
}
// Pictures that exist but were not on screen (placeholder drawn instead), counted over one frame.
async function placeholders(page) {
  return page.evaluate(() => new Promise(resolve => {
    const g = window.__littleLegends, misses = new Set(), get = g.assets.get.bind(g.assets);
    g.assets.get = id => { const v = get(id); if (!(v && (v.naturalWidth || v.width)) && g.assets.artUrls?.has(id)) misses.add(id); return v; };
    requestAnimationFrame(() => requestAnimationFrame(() => { g.assets.get = get; resolve([...misses]); }));
  }));
}

// ---------- 1. offline ----------
async function offline(browser, server, { slow }) {
  const base = server.base;
  const label = slow ? 'Offline reload right after first play (art still caching)' : 'Offline reload after first play';
  const { context, page, errors } = await newPage(browser, { blockArtCaching: slow });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await newProfile(page);
  await waitFor(page, () => navigator.serviceWorker?.ready.then(r => Boolean(r.active)), 20000);
  // Play into Space Station: hub, then the first mission's building activity.
  await goScene(page, 'worldHub', { world: 'space' });
  await goScene(page, 'adventure', { adventureId: 'space_build_rocket_mission', step: 1 });
  await sleep(slow ? 1500 : 12000); // the full run gives the background art caching time to work
  await page.screenshot({ path: path.join(SHOTS, `offline_${slow ? 'slow' : 'normal'}_1_online.png`) });
  await page.setOfflineMode(true); server.setOffline(true);
  await page.reload({ waitUntil: 'load' }).catch(e => errors.push('reload: ' + e.message));
  const booted = await waitFor(page, () => ['profile', 'island'].includes(window.__littleLegends?.scenes.currentName), 20000);
  if (booted && await page.evaluate(() => window.__littleLegends.scenes.currentName === 'profile')) {
    await page.evaluate(async () => { const g = window.__littleLegends; const p = g.save.listProfiles()[0]; await g.activateProfile(p.id); });
    await goScene(page, 'island');
  }
  const profileKept = booted && await page.evaluate(() => window.__littleLegends.save.listProfiles().some(p => p.name === 'Mia'));
  await goScene(page, 'worldHub', { world: 'space' }); await sleep(1500);
  const hubMissing = await placeholders(page);
  await page.screenshot({ path: path.join(SHOTS, `offline_${slow ? 'slow' : 'normal'}_2_hub.png`) });
  await goScene(page, 'adventure', { adventureId: 'space_build_rocket_mission', step: 1 }); await sleep(1500);
  const missionMissing = await placeholders(page);
  await page.screenshot({ path: path.join(SHOTS, `offline_${slow ? 'slow' : 'normal'}_3_mission.png`) });
  const scene = await page.evaluate(() => window.__littleLegends.scenes.currentName);
  const missing = [...new Set([...hubMissing, ...missionMissing])];
  const ok = booted && profileKept && scene === 'adventure' && !missing.length && !errors.length;
  server.setOffline(false);
  record(slow ? 'offline-slow' : 'offline', label, ok, `${booted ? 'game loaded offline' : 'GAME DID NOT LOAD OFFLINE'}; profile ${profileKept ? 'kept' : 'LOST'}; Space hub + mission ${scene === 'adventure' ? 'opened' : 'did not open'}; ${missing.length} picture(s) missing${missing.length ? ' (' + missing.slice(0, 6).join(', ') + ')' : ''}${errors.length ? '; errors: ' + errors.slice(0, 2).join(' | ') : ''}`);
  await context.close();
}

// ---------- 2. save migration ----------
function extractOldBuilds() {
  const dir = path.join(OUT, '_old_builds');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const builds = [];
  if (fs.existsSync(HISTORY_ZIP)) {
    const to = path.join(dir, 'history_m29_playable_fix1');
    fs.mkdirSync(to);
    execFileSync('unzip', ['-q', HISTORY_ZIP, '-d', to]);
    const inner = fs.readdirSync(to).map(n => path.join(to, n)).find(p => fs.existsSync(path.join(p, 'index.html'))) ?? to;
    builds.push({ id: 'history-m29-fix1', label: '08_BUILD_HISTORY M29 playable fix 1', dir: inner });
  }
  const live = path.join(dir, 'live_head');
  fs.mkdirSync(live);
  const tarFile = path.join(dir, 'live.tar');
  execFileSync('git', ['archive', '--format=tar', '-o', tarFile, 'HEAD'], { cwd: root });
  execFileSync('tar', ['-xf', '../live.tar'], { cwd: live });
  fs.rmSync(tarFile);
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
  builds.push({ id: 'live-' + sha, label: `the build that is live now (${sha})`, dir: live });
  return builds;
}

async function migration(browser, server, build) {
  server.setRoot(build.dir);
  const { context, page, errors } = await newPage(browser);
  await page.goto(server.base + 'index.html', { waitUntil: 'load' });
  await waitFor(page, () => window.__littleLegends?.scenes.currentName === 'profile', 20000);
  // Play-made progress in the OLD build, through its own code: two children, finished missions, rewards, island, settings.
  const before = await page.evaluate(async () => {
    const g = window.__littleLegends, s = g.save;
    const mia = await s.createProfile({ name: 'Mia', age: 4, favoriteColor: 'blue' });
    const leo = await s.createProfile({ name: 'Leo', age: 2, favoriteColor: 'red' });
    await g.activateProfile(mia.id);
    await g.adventureEngine.ensureLoaded?.(g.assets); await g.rewards.ensureLoaded?.(g.assets);
    const missions = g.adventureEngine.list().slice(0, 4);
    for (const m of missions) { if (m.reward?.id && g.rewards.get(m.reward.id)) await g.rewards.award(m.reward.id); await s.saveAdventure(m.id, 0, { completed: true }); }
    await s.saveAdventure(g.adventureEngine.list()[5].id, 2);
    await s.saveIslandPlacement('dinosaur_home', { x: 1400, y: 700, zone: 'creature' });
    g.learning.recordResponse({ activityId: 'feed_bunny_3', skillIds: ['COUNT_3'], outcome: 'success' });
    await s.saveLearning(g.learning.snapshot());
    await s.setSettings({ ...s.getSettings(), quietMode: true, performanceMode: 'lite' });
    await s.persist?.();
    const st = s.getProfileState();
    return { profiles: s.listProfiles().map(p => p.name).sort(), active: s.getActiveProfile()?.name, completed: [...(st.adventure?.completed ?? [])].sort(), current: st.adventure?.currentId, step: st.adventure?.step, unlocks: Object.fromEntries(Object.entries(st.unlocks ?? {}).map(([k, v]) => [k, [...v].sort()])), stars: st.discoveryStars, island: Object.keys(st.island?.placements ?? st.islandPlacements ?? {}).sort(), quiet: s.getSettings().quietMode, perf: s.getSettings().performanceMode, count3: g.learning.getSkill?.('COUNT_3')?.attempts ?? null };
  });
  // Swap in THIS build on the same web address (old offline cache removed so the new files load), then reload.
  await page.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); });
  server.setRoot(root);
  await page.reload({ waitUntil: 'load' });
  const loaded = await waitFor(page, () => ['profile', 'island'].includes(window.__littleLegends?.scenes.currentName) && window.__littleLegends.loop?.running !== false, 20000);
  const after = await page.evaluate(async () => {
    const g = window.__littleLegends, s = g.save; const mia = s.listProfiles().find(p => p.name === 'Mia'); if (mia) await g.activateProfile(mia.id);
    const st = s.getProfileState();
    return { profiles: s.listProfiles().map(p => p.name).sort(), active: s.getActiveProfile()?.name, completed: [...(st.adventure?.completed ?? [])].sort(), current: st.adventure?.currentId, step: st.adventure?.step, unlocks: Object.fromEntries(Object.entries(st.unlocks ?? {}).map(([k, v]) => [k, [...v].sort()])), stars: st.discoveryStars, island: Object.keys(st.island?.placements ?? st.islandPlacements ?? {}).sort(), quiet: s.getSettings().quietMode, perf: s.getSettings().performanceMode, count3: g.learning.getSkill?.('COUNT_3')?.attempts ?? null, version: s.getSaveHealth().saveVersion };
  });
  await goScene(page, 'island'); await sleep(1200);
  await page.screenshot({ path: path.join(SHOTS, `migration_${build.id}_island.png`) });
  await goScene(page, 'collection', { tab: 'creatures' }); await sleep(800);
  await page.screenshot({ path: path.join(SHOTS, `migration_${build.id}_collection.png`) });
  const runtimeErrors = await page.evaluate(() => window.__littleLegends.runtimeErrorCount);
  const lost = [];
  for (const key of ['profiles', 'completed', 'current', 'step', 'stars', 'island', 'quiet', 'perf', 'count3']) if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) lost.push(`${key}: ${JSON.stringify(before[key])} -> ${JSON.stringify(after[key])}`);
  for (const [kind, ids] of Object.entries(before.unlocks)) for (const id of ids) if (!(after.unlocks[kind] ?? []).includes(id)) lost.push(`reward ${kind}/${id} lost`);
  const ok = loaded && !lost.length && !runtimeErrors && !errors.length;
  if (!loaded) lost.push('this build did not reach the profile/island screen after loading the old save');
  record(`migration-${build.id}`, `Save from ${build.label} loads in this build`, ok, `${before.profiles.length} profiles, ${before.completed.length} finished missions, ${Object.values(before.unlocks).flat().length} rewards, ${before.stars} stars, mission in progress at step ${before.step + 1}${lost.length ? '; LOST: ' + lost.join('; ') : '; all kept'}${runtimeErrors || errors.length ? `; errors: ${runtimeErrors} runtime, ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await context.close();
}

// ---------- 3. Lite mode 30 FPS ----------
async function lite(browser, base) {
  const { context, page, errors } = await newPage(browser);
  const cdp = await page.createCDPSession();
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await newProfile(page);
  await page.evaluate(async () => { const g = window.__littleLegends; const next = { ...g.save.getSettings(), performanceMode: 'lite' }; await g.save.setSettings(next); g.applyFamilySettings(next); });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const rows = [];
  for (const world of WORLDS) {
    const mission = await page.evaluate(async w => { const g = window.__littleLegends; await g.adventureEngine.ensureLoaded(g.assets); return g.adventureEngine.list().find(a => a.world === w && a.steps.some(s => s.kind === 'activity')); }, world);
    const step = mission.steps.findIndex(s => s.kind === 'activity');
    for (const [scene, data, name] of [['worldHub', { world }, `${world} hub`], ['adventure', { adventureId: mission.id, step }, `${world} mission`]]) {
      await goScene(page, scene, data); await sleep(3000);
      // Headless Chrome's own refresh timer swings wildly (2–140 Hz), so FPS there means nothing. What the game controls is
      // the work per frame (update + draw): Lite mode keeps 30 FPS while that stays well under 33 ms. Freezes > 100 ms count too.
      const m = await page.evaluate(() => new Promise(resolve => {
        const g = window.__littleLegends, work = [], long = [];
        const onFrame = g.loop.onFrame; g.loop.onFrame = sample => { work.push(sample.updateMs + sample.renderMs); (window.__parts ??= []).push([sample.updateMs, sample.renderMs, sample.steps]); onFrame?.(sample); };
        const obs = new PerformanceObserver(list => { for (const e of list.getEntries()) long.push(e.duration); }); obs.observe({ entryTypes: ['longtask'] });
        setTimeout(() => { g.loop.onFrame = onFrame; obs.disconnect(); work.sort((x, y) => x - y); const P = window.__parts ?? []; window.__parts = []; const q = (arr) => { arr.sort((x, y) => x - y); return arr[Math.floor(arr.length * .95)] ?? 0; }; resolve({ updP95: q(P.map(x => x[0])), drawP95: q(P.map(x => x[1])), steps: P.reduce((n, x) => n + x[2], 0) / Math.max(1, P.length), frames: work.length, workP95: work[Math.floor(work.length * .95)] ?? 99, workMax: work.at(-1) ?? 99, longest: Math.max(0, ...long), quality: globalThis.__LL_QUALITY }); }, 5000);
      }));
      rows.push({ name, ...m });
    }
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const worst = rows.reduce((x, y) => (y.workP95 > x.workP95 ? y : x));
  const freeze = rows.reduce((x, y) => (y.longest > x.longest ? y : x));
  const ok = rows.every(r => r.quality === 'lite' && r.frames > 20 && r.workP95 < 16.7 && r.longest < 100) && !errors.length;
  record('lite-30fps', 'Lite mode has room for 30 FPS on every world (CPU slowed 4×)', ok, `frame work p95 at most ${worst.workP95.toFixed(1)} ms (${worst.name}) of the 33 ms a 30 FPS frame allows; longest freeze ${Math.round(freeze.longest)} ms (${freeze.name}); ${rows.length} scenes`);
  await context.close();
  return rows;
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const only = args.only ? String(args.only) : null;
  const server = await startServer(root);
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--mute-audio'] });
  let liteRows = null;
  console.log(`Release checks at ${server.base}`);
  try {
    if (!only || only === 'offline') { await offline(browser, server, { slow: false }); await offline(browser, server, { slow: true }); }
    if (!only || only === 'migration') for (const build of extractOldBuilds()) await migration(browser, server, build);
    if (!only || only === 'lite') liteRows = await lite(browser, server.base);
  } finally { await browser.close(); server.close(); }
  const file = path.join(OUT, 'release_checks.json');
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { results: [] };
  const merged = [...previous.results.filter(r => !results.some(x => x.id === r.id)), ...results];
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), results: merged, lite: liteRows ?? previous.lite ?? null }, null, 2));
  if (results.some(r => r.status === 'fail')) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
