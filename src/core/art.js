// Real-art lookup. art(id) returns a loaded picture or null; every caller keeps its drawn placeholder for null.
// Which game thing uses which picture lives in data/art_map.json (loaded by AssetLoader.loadArtIndex).

const COLOUR_NAMES = new Set(['red','blue','yellow','green','orange','purple','pink','cream','teal']);
const SYMBOL_KINDS = new Set(['clothing','toy','feeling','routine','instrument','word','object']);
const STARTER_KEEP_LIMIT = 140;

function loader() { return globalThis.__LL_ASSETS ?? null; }
export function artMap() { return loader()?.artMap ?? null; }

export function art(id) {
  if (!id) return null;
  const assets = loader();
  const img = assets?.get?.(id);
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
  if (blend) ctx.globalCompositeOperation = blend;
  if (flipX) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(img, x - dw / 2, top, dw, dh);
  ctx.restore();
  return true;
}

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

// Empty container for a counting activity's drop target (data/art_map.json "countTargets").
export function countTargetArt(definition) {
  const t = artMap()?.countTargets;
  if (!t) return null;
  return t.byObject?.[definition?.object] ?? t.byCharacter?.[definition?.character] ?? t.default ?? null;
}

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
  return [...hatchFrameIds(theme), h.bursts?.[theme], h.pedestal, lookupArt('rewards', rewardId)].filter(Boolean);
}

// ---- per-scene loading ----

function tokensIn(definition) {
  const out = [];
  const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.kind) out.push(o); Object.values(o).forEach(walk); } };
  walk(definition);
  if (definition?.object) out.push({ kind: definition.object, color: definition.color, symbol: definition.symbol });
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
  return ids;
}

async function artIdsForScene(game, name, data = {}) {
  const map = artMap();
  if (!map) return [];
  const ids = [...(map.preload?.starter ?? [])];
  for (const id of map.preload?.scenes?.[name] ?? []) {
    if (id === '@rewards') ids.push(...Object.values(map.rewards ?? {}));
    else ids.push(id);
  }
  if (name === 'island') ids.push(...Object.values(map.island ?? {}), ...Object.values(map.rewards ?? {}).filter(id => !id.startsWith('objects.hats') && !id.startsWith('objects.clothes')));
  const cosmeticId = game.save?.getProfileState?.()?.pip?.outfit?.cosmeticId;
  if (cosmeticId && map.cosmetics?.[cosmeticId]) ids.push(map.cosmetics[cosmeticId]);
  const activities = game.activityEngine;
  if (name === 'adventure' && game.adventureEngine) {
    await game.adventureEngine.ensureLoaded?.(game.assets);
    await activities?.ensureLoaded?.(game.assets);
    const adventure = game.adventureEngine.get?.(data.adventureId ?? 'rory_dino_picnic');
    for (const step of adventure?.steps ?? []) if (step.activityId) ids.push(...idsForActivity(activities?.get?.(step.activityId), activities));
    const guide = characterArt(adventure?.guide ?? (adventure?.world === 'rainbow' ? 'octo' : adventure?.world === 'dino' ? 'rory' : null)); if (guide) ids.push(guide);
    const reward = map.rewards?.[adventure?.reward?.id]; if (reward) ids.push(reward);
    if ((adventure?.steps ?? []).some(step => step.kind === 'egg' || step.kind === 'hatch')) ids.push(...hatchArtIds(hatchTheme(adventure?.reward?.id, adventure?.world), adventure?.reward?.id));
  }
  if (name === 'activity' && activities) {
    await activities.ensureLoaded?.(game.assets);
    const id = data.activityId ?? data.id;
    if (id) ids.push(...idsForActivity(activities.get?.(id), activities));
  }
  if (name === 'worldHub' && map.worlds?.[data.world]) ids.push(map.worlds[data.world]);
  if (name === 'island' && data.celebrateReward) ids.push(...hatchArtIds(hatchTheme(data.celebrateReward, worldOfReward(game, data.celebrateReward)), data.celebrateReward));
  return [...new Set(ids.filter(Boolean))];
}

// Loads the pictures a scene needs before it opens. Waits at most `maxWait` ms, then lets the scene start
// (late pictures pop in as they arrive; until then the placeholders show). Never throws.
async function prepareSceneArt(game, name, data = {}, { maxWait = 1500 } = {}) {
  const assets = game?.assets;
  if (name === 'boot' || !assets?.loadArt || !artMap()) return 0; // the boot screen shows its own progress bar
  try {
    const ids = await artIdsForScene(game, name, data);
    const keep = new Set(ids);
    if (assets.loadedArtCount?.() > STARTER_KEEP_LIMIT) assets.releaseArt?.(keep);
    const loading = assets.loadArt(ids);
    await Promise.race([loading, new Promise(resolve => setTimeout(resolve, maxWait))]);
    return ids.length;
  } catch (error) {
    console.warn('Little Legends art preload skipped', error);
    return 0;
  }
}

export { artIdsForScene, prepareSceneArt };
