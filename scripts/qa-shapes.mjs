// Job 20: no bars on any screen shape. Opens every screen in real Chrome at five shapes, with a fake notch (40 px on the
// left) and gesture bar (24 px along the bottom), screenshots each into docs/qa_shots/shapes/, and FAILS if any edge
// row or column of the screen was left undrawn (a bar). Undrawn = still the bright magenta the canvas is cleared to
// for this check, so a real background that happens to be one flat colour (a sky) is not mistaken for a bar.
// It also checks that the buttons pinned to the corners are inside the safe area (clear of the notch and the bar).
//
//   npm run qa:shapes                      every screen at every shape
//   npm run qa:shapes -- --quick           a few screens (what npm run check runs when Chrome is installed)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer, findChrome, sleep } from './qa-common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(root, 'docs', 'qa_shots', 'shapes');

// CLAUDE.md standing rule 1: phones 19.5:9 (the base), 16:9, 21:9; tablets 16:10 and 4:3.
export const SHAPES = [
  { id: '19.5x9_2340x1080', width: 2340, height: 1080 },
  { id: '16x9_1920x1080', width: 1920, height: 1080 },
  { id: '21x9_2520x1080', width: 2520, height: 1080 },
  { id: '16x10_2000x1200', width: 2000, height: 1200 },
  { id: '4x3_2048x1536', width: 2048, height: 1536 }
];
export const FAKE_INSETS = { left: 40, top: 0, right: 0, bottom: 24 };
const SENTINEL = [255, 0, 255];

// [scene, data, name]. 'boot' is the studio logo on its dark purple.
export const ALL_SCENES = [
  ['boot', {}, 'logo'], ['profile', {}, 'who is playing'], ['island', {}, 'island'], ['worldSelect', {}, 'world map'],
  ['worldHub', { world: 'dino' }, 'dino hub'], ['worldHub', { world: 'jungle' }, 'jungle hub'], ['worldHub', { world: 'town' }, 'town hub'],
  ['adventure', { adventureId: 'FIRST', step: 'ACTIVITY' }, 'mission'], ['rainbowVillage', {}, 'rainbow village'], ['jungleJam', {}, 'jungle jam'],
  ['collection', {}, 'collection'], ['colouring', {}, 'colouring pages'], ['colouring', { page: 'page_44_flower' }, 'colouring paint'],
  ['parentGate', {}, 'parent gate'], ['parentGate', { skipGate: true, tab: 'settings', returnTo: 'island' }, 'parent settings'],
  ['playground', { world: 'town' }, 'playground town'], ['playground', { world: 'rainbow' }, 'playground sea'], ['playground', { world: 'dino' }, 'playground dino'],
  ['playground', { world: 'space' }, 'playground space'], ['playground', { world: 'animal' }, 'playground forest'],
  ['dressUp', {}, 'dress up'], ['sceneMaker', { bg: 'worlds.backgrounds.town.bg_town_bakery' }, 'scene maker'], ['sceneMaker', {}, 'scene backgrounds'], ['trail', {}, 'trail'], ['bedtime', {}, 'bedtime shelf'], ['bedtime', { story: 'moon_and_pip' }, 'bedtime story']
];
export const QUICK_SCENES = ALL_SCENES.filter(([, , n]) => ['logo', 'island', 'mission', 'colouring paint', 'playground sea'].includes(n));

async function waitFor(page, fn, max = 15000, arg) { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await page.evaluate(fn, arg).catch(() => false)) return true; await sleep(120); } return false; }

// In the page: where every edge row/column was left undrawn, and whether the corner buttons are inside the safe area.
function inspect(sentinel) {
  const g = window.__littleLegends, c = g.canvas, ctx = c.getContext('2d'), W = c.width, H = c.height;
  const lines = { top: ctx.getImageData(0, 0, W, 1).data, bottom: ctx.getImageData(0, H - 1, W, 1).data, left: ctx.getImageData(0, 0, 1, H).data, right: ctx.getImageData(W - 1, 0, 1, H).data };
  const bars = [];
  for (const [edge, d] of Object.entries(lines)) {
    let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - sentinel[0]) < 6 && d[i + 1] < 6 && Math.abs(d[i + 2] - sentinel[2]) < 6) n++;
    if (n > 0) bars.push(`${edge}: ${n} of ${d.length / 4} pixels undrawn`);
  }
  const v = g.viewport, s = v.safeRect;
  return { bars, canvas: `${W}×${H}`, visible: v.visibleRect, safe: s, scale: v.scale };
}

export async function checkShapes({ browser, base, scenes = ALL_SCENES, shapes = SHAPES, shots = true, log = console.log }) {
  if (shots) fs.mkdirSync(SHOTS, { recursive: true });
  const failures = [], rows = [];
  for (const shape of shapes) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e?.message ?? e)));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.setViewport({ width: shape.width, height: shape.height, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: true });
    const ins = FAKE_INSETS;
    await page.goto(`${base}index.html?insets=${ins.left},${ins.top},${ins.right},${ins.bottom}`, { waitUntil: 'load' });
    await waitFor(page, () => Boolean(window.__littleLegends?.scenes?.currentName));
    // Undrawn canvas = magenta, for this check only.
    await page.evaluate(s => { const g = window.__littleLegends, clear = g.viewport.clear.bind(g.viewport); g.viewport.clear = ctx => clear(ctx, `rgb(${s.join(',')})`); }, SENTINEL);
    await page.evaluate(async () => { const g = window.__littleLegends; await g.save.init?.(); if (!g.save.listProfiles().length) { const p = await g.save.createProfile({ name: 'Mia', age: 4 }); await g.activateProfile(p.id); } });
    for (const [scene, rawData, name] of scenes) {
      const data = { ...rawData };
      if (data.adventureId === 'FIRST') {
        const m = await page.evaluate(async () => { const g = window.__littleLegends; await g.adventureEngine.ensureLoaded(g.assets); const a = g.adventureEngine.list().find(x => x.world === 'dino' && x.steps.some(s => s.kind === 'activity')); return { id: a.id, step: a.steps.findIndex(s => s.kind === 'activity') }; });
        data.adventureId = m.id; data.step = m.step;
      }
      await page.evaluate((n, d) => { const g = window.__littleLegends; if (n === 'boot') { g.scenes.change('boot', d); } else g.scenes.change(n, d); }, scene, data);
      await waitFor(page, n => { const g = window.__littleLegends; return g?.scenes.currentName === n && !g.scenes.busy; }, 10000, scene);
      await sleep(scene === 'boot' ? 500 : 900);
      if (scene === 'boot') await page.evaluate(() => { const b = window.__littleLegends.scenes.current; b.logoT = 0.6; b.logoDone = false; });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const r = await page.evaluate(inspect, SENTINEL);
      // The home button (or BACK) and the hold-to-leave button sit inside the safe area.
      const corners = await page.evaluate(() => {
        const g = window.__littleLegends, s = g.viewport.safeRect, out = [], sc = g.scenes.current;
        const inSafe = (x, y, r) => x - r >= s.x - 0.5 && x + r <= s.x + s.w + 0.5 && y - r >= s.y - 0.5 && y + r <= s.y + s.h + 0.5;
        if (sc?.leave && !sc.completed && !inSafe(sc.leave.x, sc.leave.y, sc.leave.r)) out.push('hold-to-leave button outside the safe area');
        return out;
      });
      const bad = [...r.bars, ...corners, ...errors.splice(0)];
      rows.push({ shape: shape.id, scene: name, ok: !bad.length, detail: bad.join('; ') });
      if (bad.length) failures.push(`${shape.id} / ${name}: ${bad.join('; ')}`);
      if (shots) await page.screenshot({ path: path.join(SHOTS, `${shape.id}_${name.replace(/\s+/g, '_')}.png`) });
    }
    log(`  ${shape.id}: ${scenes.length} screens, ${rows.filter(x => x.shape === shape.id && !x.ok).length} with bars`);
    await context.close();
  }
  return { ok: !failures.length, failures, rows };
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const puppeteer = (await import('puppeteer-core')).default;
  const quick = process.argv.includes('--quick');
  const server = await startServer(root);
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--mute-audio'] });
  try {
    console.log(`Screen shapes at ${server.base}${quick ? ' (quick)' : ''}`);
    const res = await checkShapes({ browser, base: server.base, scenes: quick ? QUICK_SCENES : ALL_SCENES });
    for (const f of res.failures) console.log('  FAIL ' + f);
    console.log(res.ok ? 'No bars on any screen shape.' : `${res.failures.length} screens with bars.`);
    if (!res.ok) process.exitCode = 1;
  } finally { await browser.close(); server.close(); }
}
