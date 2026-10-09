// Pip's wardrobe preview (Job 09). Draws Pip wearing every wardrobe look, with the game's own drawing code in real
// Chrome, so the placements in data/art_map.json "wardrobe" can be checked and nudged.
//
//   npm run wardrobe:preview                 front pose, wave pose and a few mixes -> docs/qa_shots/wardrobe/
//   npm run wardrobe:preview -- --only=hat    only looks whose picture id contains "hat"
//
// Needs Google Chrome (or Edge) installed. Uses puppeteer-core, which is already in node_modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer, findChrome } from './qa-common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const OUT = path.join(root, 'docs', 'qa_shots', 'wardrobe');

const MIXES = [
  ['catalog_explorer_hat', 'look_binoculars', 'look_backpack_explorer', 'look_glasses_star_round'],
  ['look_onesie_frog', 'catalog_heart_glasses', 'look_wings_fairy'],
  ['look_outfit_police', 'look_mask_hero', 'look_jetpack_rocket'],
  ['look_outfit_princess_dress', 'look_tiara_heart', 'look_wings_butterfly', 'look_medal_star'],
  ['catalog_outfit_astronaut', 'look_headband_stars', 'look_jetpack_rocket'],
  ['catalog_bunny_ears', 'catalog_dino_backpack', 'look_bow_rainbow', 'look_camera']
];

const server = await startServer(root);
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new', args: ['--no-first-run'] });
try {
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(server.base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__littleLegends?.assets?.artMap && window.__littleLegends?.rewards?.loaded, { timeout: 30000 });
  fs.mkdirSync(OUT, { recursive: true });
  const sheets = await page.evaluate(async ({ only, mixes }) => {
    const game = window.__littleLegends;
    const { PipController } = await import('./src/characters/PipController.js');
    const { lookArt, slotOf } = await import('./src/characters/Wardrobe.js');
    const items = game.assets.artMap.wardrobe.items;
    const looks = game.rewards.list().filter(r => r.type === 'cosmetics' && items[lookArt(r.id)] && (!only || lookArt(r.id).includes(only)));
    const ids = ['characters.pip.pip_front', 'characters.pip.pip_wave', ...looks.map(r => lookArt(r.id)), ...mixes.flat().map(id => lookArt(id)).filter(Boolean)];
    await game.assets.loadArt(ids);
    const sheet = (groups, pose) => {
      const cols = 6, cw = 330, ch = 430, canvas = document.createElement('canvas');
      canvas.width = cols * cw; canvas.height = Math.ceil(groups.length / cols) * ch;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#cfe8f5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      groups.forEach((group, i) => {
        const x = (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * ch + ch - 70;
        const pip = new PipController({ x, y, scale: 0.78, rng: () => 0.99, looks: group.map(id => game.rewards.get(id)) });
        if (pose === 'wave') { pip.react('wave', { duration: 99 }); pip.update(0.0001); pip.t = 0; }
        pip.render(ctx);
        ctx.fillStyle = '#3d315a'; ctx.font = '700 17px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(group.map(id => game.rewards.get(id)?.name ?? id).join(' + ').slice(0, 44), x, y + 55);
      });
      return canvas.toDataURL('image/png');
    };
    const single = looks.map(r => [r.id]);
    return {
      front: sheet(single, 'front'),
      wave: sheet(single.filter(([id]) => slotOf(game.rewards.get(id)) !== 'body'), 'wave'),
      mixes: only ? null : sheet(mixes, 'front'),
      mixesWave: only ? null : sheet(mixes, 'wave')
    };
  }, { only: typeof args.only === 'string' ? args.only : null, mixes: MIXES });
  for (const [name, url] of Object.entries(sheets)) {
    if (!url) continue;
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log(`wrote docs/qa_shots/wardrobe/${name}.png`);
  }
} finally {
  await browser.close();
  server.close();
}
