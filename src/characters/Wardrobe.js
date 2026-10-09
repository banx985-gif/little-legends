// Pip's wardrobe (Job 09): which looks Pip is wearing, one per slot, and how a look sits on him.
// Placement data lives in data/art_map.json "wardrobe" so each piece is easy to nudge without touching code.
import { art, artMap, drawArt } from '../core/art.js';

// LOOKS sub-tabs in the Collection. Every cosmetic reward has `look` set to one of these (data/rewards.json).
export const LOOK_TABS = [['hats', 'HATS'], ['glasses', 'GLASSES'], ['outfits', 'OUTFITS'], ['onesies', 'ONESIES'], ['backs', 'BAGS & WINGS'], ['extras', 'EXTRAS']];
const TAB_SLOT = { hats: 'head', glasses: 'eyes', outfits: 'body', onesies: 'body', backs: 'back', extras: 'extra' };
export const SLOTS = ['head', 'eyes', 'body', 'back', 'extra'];

export function lookTab(reward) { return TAB_SLOT[reward?.look] ? reward.look : 'hats'; }
export function slotOf(reward) { return TAB_SLOT[lookTab(reward)]; }

// The picture Pip wears for a cosmetic reward, and its wardrobe placement (null for older looks with no placement).
export function lookArt(rewardId) { const id = artMap()?.cosmetics?.[rewardId]; return typeof id === 'string' ? id : null; }
export function placementFor(rewardId) { const id = lookArt(rewardId); return id ? artMap()?.wardrobe?.items?.[id] ?? null : null; }
// Slots a worn look also takes up (a onesie's hood, an outfit's own hat).
function coversOf(rewardId) { return placementFor(rewardId)?.covers ?? []; }

// Worn looks as { slot: rewardId }. Saves from before Job 09 only have outfit.cosmeticId: it is worn in its own slot.
export function wornLooks(outfit, rewards) {
  const worn = {};
  const saved = outfit?.worn && typeof outfit.worn === 'object' && !Array.isArray(outfit.worn) ? outfit.worn : null;
  if (saved) { for (const slot of SLOTS) if (typeof saved[slot] === 'string' && rewards?.get?.(saved[slot])) worn[slot] = saved[slot]; return worn; }
  const id = outfit?.cosmeticId, reward = id ? rewards?.get?.(id) : null;
  if (reward?.type === 'cosmetics') worn[slotOf(reward)] = id;
  return worn;
}

// Save patch for tapping a look: wear it (taking off whatever it clashes with), or take it off if already worn.
// cosmeticId stays the newest worn look so older builds still show one look.
export function toggleLook(outfit, rewards, rewardId) {
  const reward = rewards?.get?.(rewardId);
  const worn = wornLooks(outfit, rewards);
  if (!reward) return { worn, cosmeticId: outfit?.cosmeticId ?? null, wearing: false };
  const slot = slotOf(reward);
  if (worn[slot] === rewardId) {
    delete worn[slot];
    const rest = Object.values(worn);
    return { worn, cosmeticId: rest[rest.length - 1] ?? null, wearing: false };
  }
  const covers = coversOf(rewardId);
  for (const [other, id] of Object.entries(worn)) if (other === slot || covers.includes(other) || coversOf(id).includes(slot)) delete worn[other];
  worn[slot] = rewardId;
  return { worn, cosmeticId: rewardId, wearing: true };
}

export function isWorn(outfit, rewards, rewardId) { return Object.values(wornLooks(outfit, rewards)).includes(rewardId); }

// Reward definitions Pip is wearing, ready for PipController({ looks }).
export function wornRewards(outfit, rewards) { return Object.values(wornLooks(outfit, rewards)).map(id => rewards.get(id)).filter(Boolean); }

// ---- drawing ----
// Coordinates in the data are pixels of pip_front (wardrobe.ref = its size), drawn in Pip's own units
// (feet at y = 30, as PipController draws him) for the pose being shown.
// Sets up the canvas so drawing in pip_front pixels lands on `space` ('head', 'eyes' or 'body') of the current pose.
// Returns false when that pose has no placement for the space (the look is hidden for it).
function applySpace(ctx, wardrobe, pose, poseKey, space) {
  const ref = wardrobe.ref ?? [291, 334];
  const k = pose.h / ref[1];
  if (poseKey === 'front') { ctx.translate(-ref[0] / 2 * k, 30 - (pose.lift ?? 0) - ref[1] * k); ctx.scale(k, k); return true; }
  const map = wardrobe.poses?.[poseKey]?.[space] ?? (space === 'eyes' ? wardrobe.poses?.[poseKey]?.head : null);
  if (!map) return false;
  // map: a point of pip_front (front) lands on a point of the pose picture (at), turned by rot and scaled by scale.
  const poseRef = wardrobe.poses[poseKey].ref, pk = pose.h / poseRef[1];
  const at = [(map.at[0] - poseRef[0] / 2) * pk, 30 - (pose.lift ?? 0) - (poseRef[1] - map.at[1]) * pk];
  ctx.translate(at[0], at[1]); ctx.rotate(map.rot ?? 0); ctx.scale(k * (map.scale ?? 1), k * (map.scale ?? 1));
  ctx.translate(-map.front[0], -map.front[1]);
  return true;
}

// One piece of a look: the whole picture, or a band of it (from: [top, bottom] as 0–1 of its height; fromX the same
// across), drawn centred on (x, y) at width w, all in pip_front pixels.
function drawPart(ctx, img, part) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const [f0, f1] = part.from ?? [0, 1], [g0, g1] = part.fromX ?? [0, 1];
  const sx = iw * g0, sw = iw * (g1 - g0), sy = ih * f0, sh = ih * (f1 - f0), dw = part.w, dh = sh * dw / sw;
  ctx.drawImage(img, sx, sy, sw, sh, part.x - dw / 2, part.y - dh / 2, dw, dh);
}

// Pose to show when wearing these looks: a pose the looks can't sit on (side, flying, crouching) becomes the front
// pose, and the wave pose too when an outfit is worn (the raised arm would poke out of it).
export function poseForLooks(looks, poseKey) {
  const wardrobe = artMap()?.wardrobe;
  const placed = looks.filter(r => placementFor(r.id));
  if (!wardrobe || !placed.length) return poseKey;
  if (poseKey === 'front') return poseKey;
  if (!wardrobe.poses?.[poseKey]) return 'front';
  if (placed.some(r => slotOf(r) === 'body' || placementFor(r.id).frontOnly)) return 'front';
  return poseKey;
}

// Glasses go on last so a hood-shaped hat's face hole (reveal) never hides them.
const ORDER = { back: 0, body: 1, extra: 2, head: 3, eyes: 4 };
// Draws Pip's wardrobe looks around the pose picture. stage 'behind' runs before Pip is drawn, 'front' after.
export function drawLooks(ctx, looks, pose, poseKey, stage) {
  const wardrobe = artMap()?.wardrobe;
  if (!wardrobe) return;
  const placed = looks.map(r => ({ reward: r, slot: slotOf(r), place: placementFor(r.id), img: art(lookArt(r.id)) }))
    .filter(l => l.place && l.img && !(l.place.hideOn ?? []).includes(poseKey))
    .sort((a, b) => ORDER[a.slot] - ORDER[b.slot]);
  for (const look of placed) {
    if ((stage === 'behind') !== (look.slot === 'back')) continue;
    const spaceOf = part => part.space ?? (look.slot === 'head' ? 'head' : look.slot === 'eyes' ? 'eyes' : 'body');
    const drawSpace = space => {
      for (const part of look.place.parts ?? []) {
        if (spaceOf(part) !== space) continue;
        ctx.save();
        if (applySpace(ctx, wardrobe, pose, poseKey, space)) drawPart(ctx, look.img, part);
        ctx.restore();
      }
    };
    // An outfit: its body, then Pip's head back over the collar, then its own hat on his head.
    // A onesie or a hood-shaped hat: then Pip's face through its face hole.
    const front = poseKey === 'front';
    drawSpace('body');
    if (front && look.slot === 'body' && look.place.headOver != null) redrawPip(ctx, wardrobe, pose, { headOver: look.place.headOver });
    drawSpace('head');
    drawSpace('eyes');
    if (front && look.place.reveal) redrawPip(ctx, wardrobe, pose, { reveal: look.place.reveal });
  }
}

function redrawPip(ctx, wardrobe, pose, place) {
  if (place.headOver == null && !place.reveal) return;
  const ref = wardrobe.ref ?? [291, 334];
  ctx.save();
  applySpace(ctx, wardrobe, pose, 'front', 'body');
  ctx.beginPath();
  if (place.reveal) { const [cx, cy, rx, ry] = place.reveal; ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }
  else ctx.rect(-ref[0], -ref[1], ref[0] * 3, ref[1] + place.headOver);
  ctx.clip();
  drawArt(ctx, pose.id, ref[0] / 2, ref[1], ref[0], ref[1], { anchor: 'bottom' });
  ctx.restore();
}

