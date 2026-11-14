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
  } finally {
    globalThis.__LL_ASSETS = oldAssets;
  }
  return true;
}
