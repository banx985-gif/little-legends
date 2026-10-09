// Real-art lookup. art(id) returns a loaded picture or null; every caller keeps its drawn placeholder for null.
// Which game thing uses which picture lives in data/art_map.json (loaded by AssetLoader.loadArtIndex).

const COLOUR_NAMES = new Set(['red','blue','yellow','green','orange','purple','pink','cream','teal']);
const SYMBOL_KINDS = new Set(['clothing','toy','feeling','routine','instrument','word','object']);
const THING_FIT = 0.9;
// Decoded picture memory (MB) kept between scenes, by quality mode. Over it, pictures the next scene doesn't use are let go.
const ART_BUDGET_MB = { high: 260, balanced: 170, lite: 100 };
const REMEMBER_DRAWN = 160; // most pictures remembered per scene, preloaded on the next visit

function loader() { return globalThis.__LL_ASSETS ?? null; }
export function artMap() { return loader()?.artMap ?? null; }

export function art(id) {
  if (!id) return null;
  const assets = loader();
  const img = assets?.get?.(id);
  assets?.drawnNow?.add(id); // what this scene really draws (kept loaded; preloaded next time)
  if (img === undefined) assets?.requestArt?.(id); // not preloaded: fetch in the background, placeholder until it lands
  return img && (img.naturalWidth || img.width) ? img : null;
}

// Draws picture `id` keeping its shape, fitted inside a w×h box centred on (x, y).
// anchor 'bottom' puts the picture's bottom edge on y instead. Returns false (draws nothing) when there is no picture.
export function drawArt(ctx, id, x, y, w, h, { anchor = 'center', flipX = false, alpha = 1, blend = null } = {}) {
  const img = art(id);
  if (!img || typeof ctx?.drawImage !== 'function') return false;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(w / iw, h / ih), dw = iw * s, dh = ih * s;
  const top = anchor === 'bottom' ? y - dh : y - dh / 2;
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  // Lite mode: light blends (screen/lighter) are slow or glitchy on some Android GPUs, so glows draw with plain alpha.
  if (blend && globalThis.__LL_QUALITY === 'lite') ctx.globalAlpha *= 0.7;
  else if (blend) ctx.globalCompositeOperation = blend;
  if (flipX) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(img, x - dw / 2, top, dw, dh);
  ctx.restore();
  return true;
}

// A full-screen picture (0,0 to 1920×1080), drawn once into a screen-sized layer and copied 1:1 after that, so a weak
// GPU doesn't rescale a big picture every frame. Falls back to a direct draw where there is no document (tests).
const layer = { img: null, canvas: null, w: 0, h: 0 };
export function drawFullScreen(ctx, img) {
  if (!img || typeof ctx?.drawImage !== 'function') return false;
  const t = ctx.getTransform?.(), pw = t ? Math.round(1920 * Math.hypot(t.a, t.b)) : 0, ph = t ? Math.round(1080 * Math.hypot(t.c, t.d)) : 0;
  if (!globalThis.__LL_STATIC_CACHE || !pw || !ph || typeof document === 'undefined') { ctx.drawImage(img, 0, 0, 1920, 1080); return true; }
  if (layer.img !== img || layer.w !== pw || layer.h !== ph) {
    layer.canvas ??= document.createElement('canvas');
    layer.canvas.width = pw; layer.canvas.height = ph;
    const c = layer.canvas.getContext('2d', { alpha: false });
    c.imageSmoothingQuality = 'high'; c.drawImage(img, 0, 0, pw, ph);
    Object.assign(layer, { img, w: pw, h: ph });
  }
  ctx.drawImage(layer.canvas, 0, 0, 1920, 1080);
  return true;
}
export function dropFullScreenLayer() { if (layer.canvas) { layer.canvas.width = layer.canvas.height = 1; } Object.assign(layer, { img: null, w: 0, h: 0 }); }

export function lookupArt(group, key) {
  const id = artMap()?.[group]?.[key];
  return typeof id === 'string' ? id : null;
}

export function fxArt(name) { return artMap()?.fx?.[name] ?? null; }

// Picture for an activity token, or null. colour:
//  'strict'  – only a picture whose colour matches the token (default; colour may be the answer)
//  'loose'   – 'soft' kinds (eggs, dinos) fall back to their default picture when no colour matches
//  'uniform' – 'soft' kinds always use one picture, so size/count tasks compare like with like
export function tokenArt(token, { colour = 'strict' } = {}) {
  const map = artMap();
  if (!map || !token) return null;
  const kind = String(token.kind ?? 'circle');
  if (kind === 'thing') return thingArt(token.thing);
  if (kind === 'letter' && map.letters) {
    const v = String(token.value ?? token.label ?? '');
    if (!/^[A-Za-z]$/.test(v)) return null;
    const lower = token.case === 'lower' || (token.case !== 'upper' && v !== v.toUpperCase());
    return { id: (lower ? map.letters.lower : map.letters.upper).replace('{l}', v.toLowerCase()), fit: map.letters.fit, colour: null };
  }
  if (kind === 'numeral' && map.numerals) {
    const n = Number(token.value ?? token.label);
    if (!Number.isInteger(n) || n < map.numerals.min || n > map.numerals.max) return null;
    return { id: map.numerals.id.replace('{n}', String(n)), fit: map.numerals.fit, colour: null };
  }
  if (kind === 'animal') {
    const id = map.animals?.art?.[String(token.animalType ?? token.value ?? token.label ?? '').toLowerCase()];
    return id ? { id, fit: map.animals.fit, colour: null, labelled: true } : null;
  }
  if (SYMBOL_KINDS.has(kind)) {
    const id = map.symbols?.art?.[String(token.symbol ?? token.label ?? token.value ?? '').toUpperCase()];
    return id ? { id, fit: map.symbols.fit, colour: null, card: true } : null;
  }
  const entry = map.tokens?.[kind];
  if (!entry?.art?.length) return null;
  const pick = ([id, c]) => ({ id, fit: entry.fit ?? 0.85, colour: c });
  const want = COLOUR_NAMES.has(token.color) ? token.color : null;
  if (entry.colour === 'soft' && colour === 'uniform') return pick(entry.art[0]);
  if (!want) return pick(entry.art[0]);
  const match = entry.art.find(v => v[1] === want);
  if (match) return pick(match);
  return entry.colour === 'soft' && colour === 'loose' ? pick(entry.art[0]) : null;
}

// A named picture (data/art_map.json "things"): space and town props, rocket parts, vehicles…
// Tokens use { kind: 'thing', thing: 'nose_cone', label: 'Nose' }; the label card is the placeholder.
export function thingArt(name) {
  const things = artMap()?.things;
  const id = things?.art?.[String(name ?? '').toLowerCase()];
  return id ? { id, fit: things.fit ?? THING_FIT, colour: null } : null;
}

// Empty container for a counting activity's drop target (data/art_map.json "countTargets").
export function countTargetArt(definition) {
  const t = artMap()?.countTargets;
  if (!t) return null;
  return t.byActivity?.[definition?.id] ?? t.byObject?.[definition?.object] ?? t.byCharacter?.[definition?.character] ?? t.default ?? null;
}

// Full-screen scene picture for an activity/world theme (data/art_map.json "backgrounds"), or null.
export function backgroundArt(theme) { return artMap()?.backgrounds?.[theme] ?? null; }

// Soft magic effect for an activity (data/art_map.json "ambient"), or null.
export function ambientArt(definition) {
  const a = artMap()?.ambient;
  return a?.byActivity?.[definition?.id] ?? a?.byTheme?.[definition?.theme] ?? null;
}

// The world an adventure reward comes from (adventures.json), for picking its egg theme.
export function worldOfReward(game, rewardId) {
  return game?.adventureEngine?.list?.().find(a => a.reward?.id === rewardId)?.world ?? null;
}

export function characterArt(name) { return artMap()?.characters?.[String(name ?? '').toLowerCase()]?.id ?? null; }

// ---- egg hatching (data/art_map.json "hatch"; played by fx/HatchSequence.js) ----

export function hatchTheme(rewardId, world) {
  const h = artMap()?.hatch;
  if (!h) return null;
  return h.rewards?.[rewardId]?.theme ?? h.worlds?.[world] ?? null;
}

export function hatchFrameIds(theme) {
  const h = artMap()?.hatch;
  if (!h || !theme) return [];
  return h.frames.map(frame => h.id.replaceAll('{theme}', theme).replace('{frame}', frame));
}

export function hatchArtIds(theme, rewardId = null) {
  const h = artMap()?.hatch;
  if (!h || !theme) return [];
  return [...hatchFrameIds(theme), h.rewards?.[rewardId]?.burst ?? h.bursts?.[theme], h.pedestal, lookupArt('rewards', rewardId)].filter(Boolean);
}

// ---- per-scene loading ----

function tokensIn(definition) {
  const out = [];
  const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.kind) out.push(o); Object.values(o).forEach(walk); } };
  walk(definition);
  if (definition?.object) out.push({ kind: definition.object, color: definition.color, symbol: definition.symbol, thing: definition.thing });
  for (const target of definition?.targets ?? []) if (target?.thing) out.push({ kind: 'thing', thing: target.thing });
  for (const value of definition?.values ?? []) out.push({ kind: 'numeral', value });
  return out;
}

function idsForActivity(definition, engine) {
  definition = engine?.resolveDynamic?.(definition) ?? definition;
  const ids = [];
  for (const token of tokensIn(definition)) for (const colour of ['strict', 'loose', 'uniform']) { const a = tokenArt(token, { colour }); if (a) ids.push(a.id); }
  for (const target of definition?.targets ?? []) { const a = tokenArt({ kind: 'letter', value: target?.label }); if (a) ids.push(a.id); }
  const who = characterArt(definition?.character); if (who) ids.push(who);
  const ambient = ambientArt(definition); if (ambient) ids.push(ambient);
  if (definition?.type === 'CountAndPlace') { const box = countTargetArt(definition); if (box) ids.push(box); }
  ids.push(...themeArtIds(definition?.theme));
  return ids;
}

// Pictures a theme's background needs: its full-screen scene, or (Busy Town) the buildings drawn along the street.
function themeArtIds(theme) {
  const map = artMap();
  const bg = backgroundArt(theme);
  if (bg) return [bg];
  return String(theme ?? '').startsWith('town') ? [...(map?.townStreet ?? [])].map(b => b.id) : [];
}

async function artIdsForScene(game, name, data = {}) {
  const map = artMap();
  if (!map) return [];
  const ids = [...(map.preload?.starter ?? [])];
  for (const id of map.preload?.scenes?.[name] ?? []) {
    // '@rewards': what the child owns, the first page of friends and the dragons. Other pages load as they are viewed.
    if (id === '@rewards') {
      const owned = Object.values(game.save?.getProfileState?.()?.unlocks ?? {}).flat();
      const list = game.rewards?.list?.() ?? [];
      const firstPage = list.filter(r => r.catalog && r.type === 'creatures').slice(0, 8).map(r => r.id);
      ids.push(...[...owned, ...firstPage, ...list.filter(r => r.rare).map(r => r.id)].map(r => map.rewards?.[r]).filter(Boolean));
    }
    else ids.push(id);
  }
  if (name === 'island') {
    // Only rewards this child owns are on the island.
    const owned = Object.values(game.save?.getProfileState?.()?.unlocks ?? {}).flat();
    ids.push(...Object.values(map.island ?? {}), ...owned.map(id => map.rewards?.[id]).filter(Boolean));
    // Pieces built on the island; the build tray's own pictures load when MOVE THINGS is opened.
    const pieces = map.islandBuild?.pieces ?? {};
    ids.push(...(game.save?.getProfileState?.()?.island?.built ?? []).map(b => pieces[b.piece]?.id).filter(Boolean));
  }
  // Looks Pip is wearing (outfit.worn, one per slot; older saves: cosmeticId).
  const outfit = game.save?.getProfileState?.()?.pip?.outfit;
  const worn = outfit?.worn && typeof outfit.worn === 'object' ? Object.values(outfit.worn) : [outfit?.cosmeticId];
  for (const id of worn) if (typeof id === 'string' && map.cosmetics?.[id]) ids.push(map.cosmetics[id]);
  const activities = game.activityEngine;
  if (name === 'adventure' && game.adventureEngine) {
    await game.adventureEngine.ensureLoaded?.(game.assets);
    await activities?.ensureLoaded?.(game.assets);
    const adventure = game.adventureEngine.get?.(data.adventureId ?? 'rory_dino_picnic');
    for (const step of adventure?.steps ?? []) if (step.activityId) ids.push(...idsForActivity(activities?.get?.(step.activityId), activities));
    const guide = characterArt(adventure?.guide ?? (adventure?.world === 'rainbow' ? 'octo' : adventure?.world === 'dino' ? 'rory' : null)); if (guide) ids.push(guide);
    ids.push(...themeArtIds(worldTheme(adventure?.world)));
    // Last mission left in its world: the world's dragon egg hatches on the island afterwards.
    const dragon = dragonForWorld(game, adventure?.world), done = game.save?.getProfileState?.()?.adventure?.completed ?? [];
    const lastOne = game.adventureEngine.list().filter(a => a.world === adventure?.world && a.id !== adventure.id).every(a => done.includes(a.id));
    if (dragon && lastOne && !game.rewards?.isUnlocked?.(dragon.id)) ids.push(...hatchArtIds(hatchTheme(dragon.id, adventure?.world), dragon.id));
    const reward = map.rewards?.[adventure?.reward?.id]; if (reward) ids.push(reward);
    // The reward egg (for the hatch steps, and so the island celebration has it ready on arrival).
    const rewardIsCreature = adventure?.reward?.type === 'creatures';
    if (rewardIsCreature || (adventure?.steps ?? []).some(step => step.kind === 'egg' || step.kind === 'hatch')) ids.push(...hatchArtIds(hatchTheme(adventure?.reward?.id, adventure?.world), adventure?.reward?.id));
  }
  if (name === 'activity' && activities) {
    await activities.ensureLoaded?.(game.assets);
    const id = data.activityId ?? data.id;
    if (id) ids.push(...idsForActivity(activities.get?.(id), activities));
  }
  if (name === 'worldHub' && map.worlds?.[data.world]) ids.push(map.worlds[data.world]);
  if (name === 'worldHub') {
    ids.push(...themeArtIds(worldTheme(data.world)));
    await game.adventureEngine?.ensureLoaded?.(game.assets);
    for (const a of game.adventureEngine?.list?.() ?? []) if (a.world === data.world && map.missionIcons?.[a.id]) ids.push(map.missionIcons[a.id]);
  }
  if (name === 'island') for (const id of [data.celebrateReward, ...(data.celebrateNext ?? [])].filter(Boolean).reverse()) ids.unshift(...hatchArtIds(hatchTheme(id, worldOfReward(game, id)), id)); // first in the queue
  return [...new Set(ids.filter(Boolean))];
}

// Loads the pictures a scene needs before it opens. Waits at most `maxWait` ms, then lets the scene start
// (late pictures pop in as they arrive; until then the placeholders show). Never throws.
async function prepareSceneArt(game, name, data = {}, { maxWait = 1500 } = {}) {
  const assets = game?.assets;
  if (name === 'boot' || !assets?.loadArt || !artMap()) return []; // the boot screen shows its own progress bar
  try {
    const ids = [...new Set([...await artIdsForScene(game, name, data), ...(assets.sceneDrawn?.get(sceneKey(name, data)) ?? [])])];
    const loading = assets.loadArt(ids);
    await Promise.race([loading, new Promise(resolve => setTimeout(resolve, maxWait))]);
    return ids;
  } catch (error) {
    console.warn('Little Legends art preload skipped', error);
    return [];
  }
}

function sceneKey(name, data = {}) { return [name, data.adventureId ?? data.activityId ?? data.id ?? data.world ?? data.tab ?? ''].join(':'); }

// Called once the new scene is on screen (never mid-scene, so nothing it draws disappears).
// Remembers what the old scene drew, then — only when decoded pictures are over budget — lets go of pictures
// the new scene doesn't need. ids: what prepareSceneArt loaded for the new scene.
function settleSceneArt(game, name, data = {}, ids = []) {
  const assets = game?.assets;
  if (!assets?.releaseArt) return 0;
  if (assets.drawnNow && assets.sceneKey) {
    assets.sceneDrawn ??= new Map();
    assets.sceneDrawn.set(assets.sceneKey, [...assets.drawnNow].filter(id => assets.artUrls?.has(id)).slice(0, REMEMBER_DRAWN));
  }
  assets.sceneKey = sceneKey(name, data); assets.drawnNow = new Set(ids);
  const budget = (ART_BUDGET_MB[globalThis.__LL_QUALITY] ?? ART_BUDGET_MB.high) * 1048576;
  if ((assets.artMemoryBytes?.() ?? 0) <= budget) return 0;
  dropFullScreenLayer();
  return assets.releaseArt(new Set([...(artMap()?.preload?.starter ?? []), ...ids]));
}

// Each world's look (scene theme) for hubs and story steps.
const WORLD_THEMES = { rainbow: 'rainbow', dino: 'dino', animal: 'forest', storybook: 'storybook', life: 'life', space: 'space_moon_base', town: 'town' };
export function worldTheme(world) { return WORLD_THEMES[world] ?? 'dino'; }

// The rare dragon a world gives once every one of its Little Missions is done (data/rewards.json "dragonWorld").
export function dragonForWorld(game, world) {
  if (!world) return null;
  return game?.rewards?.list?.().find(r => r.dragonWorld === world) ?? null;
}

export { artIdsForScene, prepareSceneArt, settleSceneArt };
