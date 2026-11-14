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
    // ---- Step 4: the Adventure Trail ----
    {
      const { AdventureTrail, pickTrail, dayKey, TRAIL_PRIZE_STARS, SHORT_STEPS } = await import('../src/trail/AdventureTrail.js');
      const { TrailScene, STOPS, CHEST } = await import('../src/scenes/TrailScene.js');
      const { AdventureEngine } = await import('../src/adventures/AdventureEngine.js');
      const adventures = JSON.parse(fs.readFileSync(path.join(root, 'data/adventures.json'), 'utf8')).adventures;
      // Today's 3: short, from 3 different worlds, the same all day, a different trail on another day / for another child.
      const a = pickTrail(adventures, { day: '2026-11-14', profileId: 'p1' }), byId = id => adventures.find(x => x.id === id);
      assert.equal(a.length, 3); assert.equal(new Set(a.map(id => byId(id).world)).size, 3, '3 different worlds'); assert.ok(a.every(id => byId(id).steps.length <= SHORT_STEPS), 'short missions');
      assert.deepEqual(pickTrail(adventures, { day: '2026-11-14', profileId: 'p1' }), a, 'Same trail all day');
      assert.notDeepEqual(pickTrail(adventures, { day: '2026-11-15', profileId: 'p1' }), a, 'A new trail tomorrow');
      // Free version: only free worlds.
      const free = pickTrail(adventures, { day: '2026-11-14', profileId: 'p1', open: w => w === 'dino' || w === 'rainbow' });
      assert.equal(free.length, 3); assert.ok(free.every(id => ['dino', 'rainbow'].includes(byId(id).world)), 'Free version: free worlds only');
      // Unfinished missions first.
      const most = adventures.filter(x => x.steps.length <= SHORT_STEPS).map(x => x.id).filter(id => id !== 'dino_dino_lunch');
      const fresh = pickTrail(adventures, { day: '2026-11-14', profileId: 'p1', completed: most.filter(id => byId(id).world !== 'dino') });
      assert.ok(fresh.length === 3, 'Still 3 when most are done');
      // The scene: stops, a stamp after each mission (from the mission itself), the chest after three.
      const engine = new AdventureEngine({ assets: null }); engine.setDefinitions?.({ adventures }) ?? (engine.adventures = adventures);
      const tg = { ...game, adventureEngine: { ensureLoaded: async () => {}, list: () => adventures, get: id => byId(id) ?? null, next: () => null }, unlock: null };
      tg.trail = new AdventureTrail(tg);
      const ts = new TrailScene(tg); await ts.enter(); ts.update(0.1); ts.render(new FakeCanvasContext());
      const trail = save.getProfileState().trail; assert.equal(trail.day, dayKey()); assert.equal(trail.missions.length, 3, 'Saved for the child');
      tap(ts, STOPS[0].x, STOPS[0].y); assert.deepEqual(tg.scenes.last, { name: 'adventure', data: { adventureId: trail.missions[0], trail: true } }, 'A stop opens its mission (from the trail)');
      const before = save.getProfileState().discoveryStars;
      tap(ts, CHEST.x, CHEST.y); await tick(); assert.equal(save.getProfileState().discoveryStars, before, 'Chest stays shut before 3 stamps');
      for (const id of trail.missions) await tg.trail.stamp(id);
      await tg.trail.stamp(trail.missions[0]); assert.equal(save.getProfileState().trail.done.length, 3, 'One stamp per stop');
      const ts2 = new TrailScene(tg); await ts2.enter({ stamped: trail.missions[2] }); ts2.update(0.2); ts2.render(new FakeCanvasContext()); assert.ok(ts2.complete());
      ts2.pressed = 'chest'; await ts2.handlePointer({ type: 'up', x: CHEST.x, y: CHEST.y });
      assert.equal(save.getProfileState().discoveryStars, before + TRAIL_PRIZE_STARS, `The chest: +${TRAIL_PRIZE_STARS} stars`); assert.equal(save.getProfileState().trail.total, 1);
      ts2.pressed = 'chest'; await ts2.handlePointer({ type: 'up', x: CHEST.x, y: CHEST.y }); assert.equal(save.getProfileState().discoveryStars, before + TRAIL_PRIZE_STARS, 'Once a day');
      ts2.update(1); ts2.render(new FakeCanvasContext());
      // A mission played from the trail goes back to the trail map with its stamp.
      const src = fs.readFileSync(path.join(root, 'src/scenes/AdventureScene.js'), 'utf8'); assert.ok(src.includes("this.game.scenes.change('trail',{stamped:this.definition.id})"), 'Mission → back to the trail with a stamp');
      // The trail reminder is now real; the island has a TRAIL button.
      assert.equal(tg.trail.readyToday(), true);
      assert.ok(fs.readFileSync(path.join(root, 'src/scenes/WonderIslandScene.js'), 'utf8').includes("change('trail')"), 'Island → TRAIL');
      for (const pose of ['explorer_read_map', 'explorer_point', 'explorer_cheer']) assert.ok(manifestIds.has(`characters.explorer.${pose}`), `explorer ${pose}`);
      tap(ts2, 130, 100); assert.equal(tg.scenes.last.name, 'island', 'Home: the island');
      // Old saves: no trail yet.
      const old = JSON.parse(JSON.stringify(save.root)); delete old.profileStates[kid.id].trail; assert.equal(save.migrate(old).profileStates[kid.id].trail, null);
    }
    // ---- Step 5: big-kid levels ("Bigger challenge") ----
    {
      const { harder, bigKidOn } = await import('../src/learning/BigKid.js');
      const { ActivityEngine } = await import('../src/activities/ActivityEngine.js');
      const { ParentGateScene } = await import('../src/scenes/ParentGateScene.js');
      const defs = JSON.parse(fs.readFileSync(path.join(root, 'data/activities.json'), 'utf8')).activities, def = id => defs.find(d => d.id === id);
      // Counting on, up to 20.
      const c3 = harder(def('feed_bunny_3')); assert.deepEqual([c3.targetCount, c3.startingCount], [8, 5], 'Count 3 → count on from 5 to 8');
      const c10 = harder(def('m16_count_10')); assert.deepEqual([c10.targetCount, c10.startingCount], [20, 10], 'Count 10 → count to 20');
      assert.ok(defs.filter(d => d.type === 'CountAndPlace').every(d => harder(d).targetCount <= 20), 'Never past 20');
      // Letters → words; patterns → 3 steps; more things to choose from.
      const w = harder(def('m19_letters_1')); assert.ok(w.objects.every(o => o.kind === 'word' && o.firstSound && o.label.startsWith(o.firstSound) || o.firstSound === 'X'), 'Letters become words'); assert.deepEqual(w.targets[0], { firstSound: 'A' });
      const pt = harder(def('m13_pattern_complete')); assert.equal(pt.sequence.length, 5); assert.equal(new Set(pt.sequence.map(s => s.color)).size, 3, '3-step pattern'); assert.equal(pt.choices.find(c => c.correct).color, pt.sequence[2].color);
      const tp = harder(def('tap_red_apple')); assert.equal(tp.objects.length, def('tap_red_apple').objects.length + 2, 'Two more things to choose from');
      assert.equal(harder(c3), c3, 'Only once');
      // The real activities run with the harder settings.
      const kidGame = { save, learning: null, adaptive: null, unlock: null };
      const engine = new ActivityEngine(kidGame); engine.setDefinitions({ activities: defs });
      const host = { pip: null, game: kidGame }; let act = engine.create('m16_count_10', host); assert.equal(act.definition.targetCount, 10, 'Switch off: as before');
      const profile = save.getActiveProfile(); assert.ok(profile.age >= 4);
      await save.mutateProfileState(st => { st.settings.bigKid = true; }); assert.equal(bigKidOn(kidGame), true);
      act = engine.create('m16_count_10', host); act.start?.(); assert.equal(act.definition.targetCount, 20); assert.equal(act.tokens.length, 20, '20 to count'); assert.equal(act.count, 10, '10 already in the basket');
      for (const id of ['m19_letters_1', 'm13_pattern_complete', 'tap_red_apple', 'feed_bunny_3']) { const a = engine.create(id, host); a.start?.(); a.render(new FakeCanvasContext()); }
      // Full game only; ages 4–5 only.
      assert.equal(bigKidOn({ ...kidGame, unlock: { isUnlocked: () => false } }), false, 'Free version: off');
      const young = await save.createProfile({ name: 'Tia', age: 3 }); await save.mutateProfileState(st => { st.settings.bigKid = true; }); assert.equal(bigKidOn(kidGame), false, 'Under 4: off'); await save.selectProfile(kid.id);
      // The Parent Area switch (PROFILES tab), per child.
      const pg = new ParentGateScene({ ...game, learning: { getDashboard: () => ({ skills: [] }) }, audio: { ...audio, getSettings: () => ({}) } }); pg.enter({ skipGate: true, tab: 'profiles' }); pg.render(new FakeCanvasContext());
      tap(pg, 900, 700); await tick(); await tick(); assert.equal(save.getProfileState().settings.bigKid, false, 'Switch off from the Parent Area');
      tap(pg, 900, 700); await tick(); await tick(); assert.equal(save.getProfileState().settings.bigKid, true, 'and on again');
      assert.equal(save.getProfileState(young.id).settings.bigKid, true, 'Each child has their own switch');
    }
    // ---- Step 6: bedtime stories ----
    {
      const { STORIES, storyArtIds } = await import('../src/stories/bedtime.js');
      const { BedtimeScene } = await import('../src/scenes/BedtimeScene.js');
      assert.ok(STORIES.length >= 3, 'A shelf of stories');
      for (const s of STORIES) { for (const id of storyArtIds(s)) assert.ok(manifestIds.has(id), `${s.id}: ${id} is existing art`); assert.ok(s.pages.at(-1).goodnight && /Goodnight/.test(s.pages.at(-1).text), `${s.id} ends with Goodnight`); }
      const spoken = []; let finish = null;
      const bAudio = { ...audio, speak: (text, o) => { spoken.push({ text, o }); finish = o.onEnd; return true; }, stopSpeech: () => { finish = null; } };
      const bg = { ...game, audio: bAudio, unlock: null };
      const bed = new BedtimeScene(bg); bed.enter(); bed.update(0.1); bed.render(new FakeCanvasContext());
      tap(bed, 480, 560); assert.equal(bed.story?.id, STORIES[0].id, 'Tap a book: the story opens');
      for (let i = 0; i < 10; i++) bed.update(0.1); assert.equal(spoken.at(-1)?.text, STORIES[0].pages[0].text, 'Page 1 is read aloud'); assert.ok(spoken.at(-1).o.rate < 0.9, 'slowly');
      finish(); for (let i = 0; i < 20; i++) bed.update(0.1); assert.equal(bed.page, 0, 'Time to look at the page after it is read');
      for (let i = 0; i < 10; i++) bed.update(0.1); assert.equal(bed.page, 1, 'Then the page turns by itself');
      // No voice heard (a tablet without one): the pages still turn.
      for (let i = 0; i < 1500 && bed.page < STORIES[0].pages.length - 1; i++) bed.update(0.1);
      assert.equal(bed.page, STORIES[0].pages.length - 1, 'All the way to Goodnight, even with no voice'); bed.render(new FakeCanvasContext());
      for (let i = 0; i < 200; i++) bed.update(0.1); assert.equal(bed.page, STORIES[0].pages.length - 1, 'Goodnight stays'); assert.ok(bed.dim >= 0.5, 'and the screen gets dark');
      tap(bed, 110, 960); assert.equal(bed.page, STORIES[0].pages.length - 2, 'A grown-up can turn back');
      tap(bed, 130, 100); assert.equal(bed.story, null, 'Home: back to the shelf'); tap(bed, 130, 100); assert.deepEqual(bg.scenes.last, { name: 'worldHub', data: { world: 'storybook' } });
      // The full game only; the way in is the Storybook world's BEDTIME door.
      const locked = new BedtimeScene({ ...bg, unlock: { isUnlocked: () => false } }); locked.enter(); assert.equal(bg.scenes.last.name, 'worldSelect', 'Free version: no bedtime stories');
      const { WorldHubScene } = await import('../src/scenes/WorldHubScene.js');
      const hub = new WorldHubScene({ ...bg, adventureEngine: { ensureLoaded: async () => {}, list: () => [] } }); await hub.enter({ world: 'storybook' }); tap(hub, 1640, 970); assert.equal(bg.scenes.last.name, 'bedtime', 'Storybook → BEDTIME');
    }
    // ---- Step 7: Jungle Jam song mode ----
    {
      const { JungleJamScene } = await import('../src/scenes/JungleJamScene.js');
      const { SONG_SECONDS, SONG_BUTTONS } = await import('../src/jam/SongRecorder.js');
      const jg = { ...game, audio: { ...audio, startJam() {}, stopJam() {}, playJamStem() {}, setJamTempo() {} }, learning: null };
      const jam = new JungleJamScene(jg); jam.enter(); jam.update(0.1); jam.render(new FakeCanvasContext());
      const drag = (p, s) => { jam.handlePointer({ type: 'down', x: p.x, y: p.y }); jam.handlePointer({ type: 'move', x: s.x, y: s.y }); jam.handlePointer({ type: 'up', x: s.x, y: s.y }); };
      const press = c => { jam.handlePointer({ type: 'down', x: c.x, y: c.y }); jam.handlePointer({ type: 'up', x: c.x, y: c.y }); };
      press(SONG_BUTTONS.rec()); assert.ok(jam.songs.rec, 'REC starts recording');
      jam.update(1); drag(jam.performers[0], jam.slots[0]); jam.update(2); drag(jam.performers[1], jam.slots[2]); jam.update(1.5);
      drag({ x: jam.slots[0].x, y: jam.slots[0].y }, { x: 300, y: 1000 }); // Tiko off the stage again
      assert.equal(jam.songs.rec.events.length, 3, 'Every band change is recorded');
      for (let i = 0; i < SONG_SECONDS * 10; i++) jam.update(0.1); assert.ok(!jam.songs.rec && jam.songs.song, `Stops by itself after ${SONG_SECONDS} s`);
      const song = jam.songs.song; assert.ok(song.events[0].t > 0.9 && song.events[0].t < 1.2, 'with the timing');
      // Playback: the band is put back as it started, then changes when it did.
      drag(jam.performers[3], jam.slots[4]); press(SONG_BUTTONS.play()); assert.ok(jam.songs.busy, 'PLAY');
      assert.deepEqual(jam.arrangement(), song.start, 'Starts as the recording started');
      jam.update(1.2); assert.equal(jam.arrangement()[0], 'percussion', 'Tiko comes on at about 1 s');
      jam.update(2.2); assert.equal(jam.arrangement()[2], 'bass', 'then Bo');
      jam.handlePointer({ type: 'down', x: jam.performers[2].x, y: jam.performers[2].y }); assert.equal(jam.drag, null, 'Hands off while it plays');
      for (let i = 0; i < SONG_SECONDS * 10; i++) jam.update(0.1); assert.ok(!jam.songs.busy, 'and it ends');
      jam.render(new FakeCanvasContext());
      // Keep it: a song card in MY PICTURES; tapping it plays it again.
      press(SONG_BUTTONS.save()); await tick(); await tick(); await tick();
      const card = save.listPictures().find(p => p.kind === 'song'); assert.ok(card, 'Song card in My Pictures'); assert.ok(jam.songs.saved);
      const again = new JungleJamScene(jg); again.enter({ song: card.id }); await tick(); await tick(); assert.ok(again.songs.busy, 'A song card plays the song');
      const { CollectionScene } = await import('../src/scenes/CollectionScene.js');
      assert.ok(fs.readFileSync(path.join(root, 'src/scenes/CollectionScene.js'), 'utf8').includes("change('jungleJam',{song:p.id})"), 'My Pictures → the song');
      assert.ok(CollectionScene);
    }
  } finally {
    globalThis.__LL_ASSETS = oldAssets;
  }
  return true;
}
