// Job 14: characters never cover things a child needs to tap.
// interactiveRects(activity) lists every tappable/draggable thing and drop target on screen (1920×1080 units).
// pipSpot(activity) picks where Pip stands: his usual place bottom-left, or the first corner clear of all of them.

const LISTS = ['tokens', 'choices', 'targets', 'spots', 'cards', 'sequence', 'slots', 'pieces'];

function rectOf(item) {
  if (!item || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return null;
  if (Number.isFinite(item.w) && Number.isFinite(item.h)) return { x: item.x - item.w / 2, y: item.y - item.h / 2, w: item.w, h: item.h };
  const size = Number(item.r) ? item.r * 2 : (Number(item.size) || 150) * (item.scale ?? 1);
  return { x: item.x - size / 2, y: item.y - size / 2, w: size, h: size };
}

export function interactiveRects(activity) {
  const out = [];
  for (const key of LISTS) for (const item of activity?.[key] ?? []) { if (item?.found || item?.cleared) continue; const r = rectOf(item); if (r) out.push(r); }
  const basket = rectOf(activity?.target); if (basket) out.push(basket);
  return out;
}

function overlapArea(a, b) { return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); }

// Where Pip can stand, best first: his usual spot, the bottom-right corner, then small in the bottom-left corner.
export const PIP_SPOTS = [
  { x: 230, y: 760, scale: 0.72 },
  { x: 1800, y: 1000, scale: 0.5 },
  { x: 95, y: 1040, scale: 0.42 },
  { x: 1820, y: 560, scale: 0.42 }
];
// Pip's body box at a spot (feet at y, about 400 units tall at scale 1, a little narrower than tall).
export function pipBox({ x, y, scale }) { const h = 400 * scale, w = 330 * scale; return { x: x - w / 2, y: y - h + 20 * scale, w, h }; }

export function pipSpot(activity) {
  const rects = interactiveRects(activity);
  if (!rects.length) return PIP_SPOTS[0];
  let best = PIP_SPOTS[0], bestArea = Infinity;
  for (const spot of PIP_SPOTS) {
    const box = pipBox(spot);
    const area = rects.reduce((sum, r) => sum + overlapArea(box, r), 0);
    if (area < 300) return spot;
    if (area < bestArea) { best = spot; bestArea = area; }
  }
  return best;
}
