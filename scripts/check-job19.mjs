// Job 19 steps 2–9 checks (run from scripts/check.mjs). Each step adds its own block.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const tick = () => new Promise(r => setTimeout(r, 0));

export async function checkJob19({ root, FakeCanvasContext, sceneAudio }) {
  const { SaveSystem } = await import('../src/save/SaveSystem.js');
  const { RewardSystem } = await import('../src/rewards/RewardSystem.js');
  const artMapData = JSON.parse(fs.readFileSync(path.join(root, 'data/art_map.json'), 'utf8'));
  const manifestIds = new Set(JSON.parse(fs.readFileSync(path.join(root, 'assets/art_manifest.json'), 'utf8')).map(e => e.id));
  const oldAssets = globalThis.__LL_ASSETS;
  globalThis.__LL_ASSETS = { artMap: artMapData, get: () => undefined, requestArt: () => {} };
  const cues = [];
  const audio = { ...sceneAudio, playCue: (name) => { cues.push(name); }, startWorldMusic() {}, stopWorldMusic() {} };
  const save = new SaveSystem({ indexedDBRef: null, storage: null }); await save.init();
  const kid = await save.createProfile({ name: 'Max', age: 4 });
  const rewards = new RewardSystem({ save }); rewards.setDefinitions(JSON.parse(fs.readFileSync(path.join(root, 'data/rewards.json'), 'utf8')));
  rewards.game.save = save;
  const scenes = { last: null, change(name, data) { this.last = { name, data }; }, registry: new Map() };
  const game = { save, audio, rewards, scenes, assets: { loadArt: async () => {}, artUrls: new Map([...manifestIds].map(id => [id, id])) }, unlock: null };
  const tap = (sc, x, y) => { sc.handlePointer({ type: 'down', x, y }); sc.handlePointer({ type: 'up', x, y }); };
  try {
    // ---- Step 2: Pip's dress-up room ----
    {
      const { DressUpScene, FREE_PER_TAB } = await import('../src/scenes/DressUpScene.js');
      const room = new DressUpScene(game); room.enter(); room.update(0.1);
      const ctx = new FakeCanvasContext(); room.render(ctx); assert.equal(ctx.depth, 0, 'Dress-up room draws');
      const hats = room.tabLooks(0); assert.ok(hats.length >= 4, 'Hats to try on');
      for (const r of room.looks()) assert.ok(manifestIds.has(room.constructor && (await import('../src/characters/Wardrobe.js')).lookArt(r.id)), `${r.id}: its own wardrobe picture`);
      // Tap a look: Pip wears it, saved for this child (not changing Pip's real outfit).
      const before = JSON.stringify(save.getProfileState().pip);
      const cell = i => ({ x: 24 + 215 + (i % 2) * 140, y: 130 + Math.floor(i / 2) * 150 });
      cues.length = 0; tap(room, cell(0).x, cell(0).y); await room.saving;
      assert.ok(room.isWorn(hats[0].id) && room.pip.looks.some(l => l.id === hats[0].id), 'Tap a hat: Pip wears it'); assert.ok(cues.includes('sparkle'));
      assert.equal(save.getProfileState().dressUp.worn.head, hats[0].id, 'Saved per child'); assert.equal(JSON.stringify(save.getProfileState().pip), before, 'Pip\'s real looks are unchanged');
      // Drag a second hat onto Pip: it replaces the first (one per slot).
      room.handlePointer({ type: 'down', ...cell(1) }); room.handlePointer({ type: 'move', x: 600, y: 500 }); room.handlePointer({ type: 'move', x: 930, y: 640 }); room.handlePointer({ type: 'up', x: 930, y: 640 });
      assert.ok(room.isWorn(hats[1].id) && !room.isWorn(hats[0].id), 'Dragged onto Pip: worn, the old hat comes off');
      // Dropped away from Pip: nothing changes.
      room.handlePointer({ type: 'down', ...cell(2) }); room.handlePointer({ type: 'move', x: 1700, y: 950 }); room.handlePointer({ type: 'up', x: 1700, y: 950 }); assert.ok(!room.isWorn(hats[2].id), 'Dropped off Pip: not worn');
      // Other kinds of look.
      tap(room, 24 + 70, 120 + 2 * 150); assert.equal(room.tab, 2, 'Outfits tab'); tap(room, cell(0).x, cell(0).y); assert.ok(Object.keys(room.outfit.worn).length >= 2, 'Hat and outfit together');
      room.render(new FakeCanvasContext());
      // The camera: a photo in MY PICTURES.
      const id = await room.takePhoto(); assert.ok(id && save.listPictures().some(p => p.id === id && p.kind === 'photo'), 'Camera: a photo in My Pictures'); assert.ok(cues.includes('snap'));
      // Take everything off.
      tap(room, 1830, 520); await room.saving; assert.deepEqual(room.outfit.worn, {}, 'Hanger: all off'); assert.deepEqual(save.getProfileState().dressUp.worn, {});
      // Free version: basics only; the rest ask for a grown-up.
      const lockedGame = { ...game, unlock: { isUnlocked: () => false, worldOpen: () => true } };
      const free = new DressUpScene(lockedGame); free.enter(); free.tab = 0;
      assert.ok(free.open(hats[0]) && free.open(hats[FREE_PER_TAB - 1]) && !free.open(hats[FREE_PER_TAB]), `Free: the first ${FREE_PER_TAB} of each kind`);
      free.wear(hats[FREE_PER_TAB].id); assert.ok(!free.isWorn(hats[FREE_PER_TAB].id) && free.ask.id === hats[FREE_PER_TAB].id, 'Locked look: Pip asks for a grown-up');
      await save.award('cosmetics', hats[FREE_PER_TAB].id); assert.ok(free.open(hats[FREE_PER_TAB]), 'A look the child has earned is always open');
      free.render(new FakeCanvasContext());
      // Ways in: Pip's house on the island, the Collection's LOOKS tab, a photo in MY PICTURES. Home goes to the island.
      const { CollectionScene } = await import('../src/scenes/CollectionScene.js');
      const col = new CollectionScene({ ...game, hatchingEnabled: false }); await col.enter?.({ tab: 'cosmetics' }); col.tab = 'cosmetics'; scenes.last = null;
      col.handlePointer({ type: 'down', x: 1650, y: 935 }); col.handlePointer({ type: 'up', x: 1650, y: 935 }); assert.equal(scenes.last?.name, 'dressUp', 'Collection LOOKS → DRESS UP');
      tap(room, 1830, 100); assert.equal(scenes.last?.name, 'island', 'Home: back to the island');
      assert.ok(fs.readFileSync(path.join(root, 'src/scenes/WonderIslandScene.js'), 'utf8').includes("change('dressUp')"), 'Pip\'s house opens the room');
      // Older saves get an empty dress-up outfit.
      const old = JSON.parse(JSON.stringify(save.root)); delete old.profileStates[kid.id].dressUp; assert.deepEqual(save.migrate(old).profileStates[kid.id].dressUp, { worn: {} });
    }
    // ---- Step 3: sticker book / scene maker ----
    {
      const { SceneMakerScene, MAX_THINGS, DRAWN_BACKGROUNDS } = await import('../src/scenes/SceneMakerScene.js');
      const sm = new SceneMakerScene(game); await sm.enter(); assert.equal(sm.mode, 'pick', 'Starts with the backgrounds');
      const bgs = sm.backgrounds(); assert.ok(bgs.length >= 20 && bgs.filter(b => !b.startsWith('theme:')).every(b => manifestIds.has(b)), 'Picture backgrounds and the drawn worlds');
      sm.render(new FakeCanvasContext());
      tap(sm, 170 + 180, 210 + 100); assert.equal(sm.mode, 'make', 'Tap a background: making'); assert.equal(sm.bg, bgs[0]);
      sm.render(new FakeCanvasContext());
      // Tap a sticker: it drops in the middle; drag one onto the picture: it lands where it was dropped.
      const cell = i => ({ x: 24 + 215 + (i % 2) * 140, y: 130 + Math.floor(i / 2) * 150 });
      tap(sm, cell(0).x, cell(0).y); assert.equal(sm.items.length, 1, 'Tap a sticker: it goes in');
      sm.handlePointer({ type: 'down', ...cell(1) }); sm.handlePointer({ type: 'move', x: 900, y: 500 }); sm.handlePointer({ type: 'move', x: 1300, y: 600 }); sm.handlePointer({ type: 'up', x: 1300, y: 600 });
      assert.equal(sm.items.length, 2); const placed = sm.items[1]; assert.ok(Math.abs(placed.x - (1300 - 470) / (1280 / 1920)) < 2, 'Dropped where the finger let go');
      assert.ok(sm.trayItems().every(id => manifestIds.has(id)) && sm.trayItems().length > 8, 'The colouring studio\'s sticker groups');
      // Move it, size it, bin it.
      const at = it => { const b = sm.box(it); return { x: 470 + it.x * (1280 / 1920), y: 70 + (b.y + b.h / 2) * (1280 / 1920) }; };
      let p = at(placed); sm.handlePointer({ type: 'down', ...p }); sm.handlePointer({ type: 'move', x: p.x - 200, y: p.y }); sm.handlePointer({ type: 'up', x: p.x - 200, y: p.y }); assert.ok(placed.x < 1245 - 250, 'Dragged: it moves');
      p = at(placed); tap(sm, p.x, p.y); assert.equal(sm.selected, placed, 'Tap it: + and − show');
      const plus = sm.sizeSpots().find(s => s.dir > 0); tap(sm, plus.x, plus.y); assert.ok(placed.size > 1, '+ makes it bigger');
      p = at(placed); sm.handlePointer({ type: 'down', ...p }); sm.handlePointer({ type: 'move', x: 1830, y: 650 }); sm.handlePointer({ type: 'up', x: 1830, y: 700 }); assert.equal(sm.items.length, 1, 'Dropped in the bin: gone');
      // A cap on things for cheap tablets.
      for (let i = 0; i < MAX_THINGS + 5; i++) sm.add(sm.trayItems()[0], { x: 900, y: 500 }); assert.equal(sm.items.length, MAX_THINGS, `At most ${MAX_THINGS} things`);
      sm.items = sm.items.slice(0, 3); sm.render(new FakeCanvasContext());
      // Saved to MY PICTURES and opened again from there.
      const id = await sm.savePicture(); assert.ok(save.listPictures().some(x => x.id === id && x.kind === 'scene'), 'Saved to My Pictures');
      const again = new SceneMakerScene(game); await again.enter({ picture: id }); assert.equal(again.mode, 'make'); assert.equal(again.bg, bgs[0]); assert.equal(again.items.length, 3, 'Opened again, everything still there');
      again.items.pop(); again.dirty = true; again.exit(); await new Promise(r => setTimeout(r, 0)); const reopened = await save.loadPicture(id, 'data'); assert.equal(reopened.items.length, 2, 'Leaving keeps the changes');
      assert.equal(save.listPictures().filter(x => x.id === id).length, 1, 'Same picture, not a copy');
      // A drawn world as the background.
      const drawn = new SceneMakerScene(game); await drawn.enter({ bg: DRAWN_BACKGROUNDS[1] }); drawn.add(drawn.trayItems()[0], { x: 900, y: 500 }); drawn.render(new FakeCanvasContext());
      // Free in every version; ways in: Collection MY PICTURES → MAKE A SCENE, or tap a saved scene.
      const { CollectionScene } = await import('../src/scenes/CollectionScene.js');
      const col = new CollectionScene({ ...game, unlock: { isUnlocked: () => false, worldOpen: () => false, pageOpen: () => false } }); await col.enter?.({ tab: 'pictures' }); col.tab = 'pictures'; scenes.last = null;
      col.handlePointer({ type: 'down', x: 1650, y: 935 }); col.handlePointer({ type: 'up', x: 1650, y: 935 }); assert.equal(scenes.last?.name, 'sceneMaker', 'MY PICTURES → MAKE A SCENE (free version too)');
      tap(again, 1830, 100); assert.deepEqual(scenes.last, { name: 'collection', data: { tab: 'pictures' } }, 'Home: back to My Pictures');
    }
  } finally {
    globalThis.__LL_ASSETS = oldAssets;
  }
  return true;
}
