// Job 15: Wonder Island is a free playground.
// - Where things may stand: anywhere on the island's sand or grass. Dropped in the water or off the screen, a thing floats back
//   to the nearest land; dropped on the portal or the big buttons, it is nudged aside.
// - What the toys do: drop a dino or friend on (or next to) a toy and it plays for a few seconds, then hops off beside it.
//   All of it is simple motion on the flat pictures (move, tilt, squash and stretch); nothing new is drawn on the art.
// Positions here are 1920×1080 units. A thing's x, y is its centre; its "base" is the middle of its bottom edge.

export const SIZE_MIN = 0.5, SIZE_MAX = 2, SIZE_STEP = 1.25;
export const HOLD_SECONDS = 0.55;      // tap and hold this long: the + and − buttons appear
export const SIZE_BUTTONS_SECONDS = 4; // they go away after this long without a tap
export const DRAG_START = 16;          // a finger moving further than this is a drag, not a tap
export const FLOAT_SECONDS = 0.6, HOP_SECONDS = 0.4, APPROACH_SECONDS = 0.35;

// The island: the sand ellipse drawn by WonderIslandScene (the grass sits inside it). Bases stay on screen.
export const LAND = { x: 960, y: 850, rx: 820, ry: 330 };
const BASE_MIN_Y = 525, BASE_MAX_Y = 1070, SIDE = 70;
// Kept clear: the portal, the PLAY / EXPLORE WORLDS / BUILD buttons and the colouring easel (Job 17).
export const EASEL = { x: 1715, y: 670, w: 175, h: 210 };
export const KEEP_OUT = [{ x: 805, y: 270, w: 310, h: 400 }, { x: 335, y: 872, w: 1415, h: 190 }, EASEL];

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function onLand(x, baseY) {
  if (baseY < BASE_MIN_Y || baseY > BASE_MAX_Y || x < SIDE || x > 1920 - SIDE) return false;
  return ((x - LAND.x) / LAND.rx) ** 2 + ((baseY - LAND.y) / LAND.ry) ** 2 <= 1;
}
// The nearest point of land to a base point (pulled in along the line to the island's middle, then onto the screen).
function nearestLand(x, baseY) {
  if (onLand(x, baseY)) return [x, baseY];
  const dx = (x - LAND.x) / LAND.rx, dy = (baseY - LAND.y) / LAND.ry, d = Math.hypot(dx, dy);
  if (d > 0.97) { x = LAND.x + dx / d * 0.97 * LAND.rx; baseY = LAND.y + dy / d * 0.97 * LAND.ry; }
  x = clamp(x, SIDE + 5, 1920 - SIDE - 5); baseY = clamp(baseY, BASE_MIN_Y + 5, BASE_MAX_Y - 5);
  if (onLand(x, baseY)) return [x, baseY];
  // Off the screen's bottom corners the ellipse and the screen edges disagree: walk towards the middle until on land.
  for (let i = 1; i <= 20; i++) { const p = i / 20, nx = x + (LAND.x - x) * p, ny = baseY + (LAND.y - 60 - baseY) * p; if (onLand(nx, ny)) return [nx, ny]; }
  return [LAND.x, LAND.y - 60];
}
function overlapFraction(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? (w * h) / (a.w * a.h) : 0;
}
// Where a thing of drawn size w×h, dropped with its centre at x, y, comes to rest. Returns its new centre and whether it
// was in the water (for the splash).
export function settle(x, y, w, h) {
  let [bx, by] = nearestLand(x, y + h / 2);
  const wet = Math.hypot(bx - x, by - (y + h / 2)) > 2;
  for (let i = 0; i < 4; i++) {
    const box = { x: bx - w / 2, y: by - h, w, h };
    const rect = KEEP_OUT.find(r => overlapFraction(box, r) > 0.2);
    if (!rect) break;
    // Out by the shortest way: left, right, up or down, a little past the edge.
    const moves = [[rect.x - 12 - (box.x + w), 0], [rect.x + rect.w + 12 - box.x, 0], [0, rect.y - 12 - (box.y + h)], [0, rect.y + rect.h + 12 - box.y]]
      .map(([mx, my]) => ({ mx, my, ok: onLand(bx + mx, by + my) }))
      .sort((a, b) => (b.ok - a.ok) || (Math.abs(a.mx) + Math.abs(a.my) - Math.abs(b.mx) - Math.abs(b.my)));
    [bx, by] = nearestLand(bx + moves[0].mx, by + moves[0].my);
  }
  return { x: bx, y: by - h / 2, wet };
}

// ---- What each toy does ----
// Keyed by the island thing's id (the base slide, ball and drum, and the rewards that are toys).
export const TOYS = {
  slide: 'slide', decor_slide_rainbow: 'slide',
  decor_swing_cloud: 'swing', decor_seesaw_stars: 'seesaw', decor_trampoline_mushroom: 'trampoline',
  decor_sandpit_star: 'sandpit', decor_climbing_dome_glow: 'dome',
  ball: 'ball', catalog_beach_beach_ball: 'ball',
  decor_bubble_machine: 'bubbles', decor_fountain_star: 'fountain', decor_wishing_well: 'well',
  drum: 'drum', catalog_jungle_drum: 'drum', alphabet_blocks: 'blocks', catalog_decor_balloons_bunch: 'balloons', catalog_story_train: 'train'
};
export function toyKind(o) { return o ? TOYS[o.id] ?? null : null; }
// Toys a friend plays *on* draw the friend in front of them and a little smaller (so a dino fits the slide).
const ON = new Set(['slide', 'swing', 'seesaw', 'trampoline', 'sandpit', 'dome', 'train']);
export function playsOn(kind) { return ON.has(kind); }

const lerp = (a, b, p) => a + (b - a) * p;
const smooth = p => p * p * (3 - 2 * p);
const arc = p => 4 * p * (1 - p); // 0 → 1 → 0
const ramp = (t, dur, edge = 0.5) => clamp(Math.min(t / edge, (dur - t) / edge), 0, 1);

// Each play: dur (seconds), optional sound (cue every `every` seconds from `at`), optional puff (particles per second), and
// run(t, g, p) → the friend's base point and pose, plus the toy's own wobble.
// g: the toy as drawn {cx, cy, W, H, base}. p: {w, h, side (−1 came from the left, 1 the right), slot (seesaw: 0 or 1),
// two (seesaw has two friends), A (1, or 0.5 with reduced motion)}.
export const PLAYS = {
  slide: { dur: 4.25, sound: { cue: 'whoosh', at: 1.25, every: 2.4 },
    run(t, g) {
      const L = [g.cx - 0.3 * g.W, g.cy + 0.4 * g.H], T = [g.cx - 0.14 * g.W, g.cy - 0.28 * g.H], E = [g.cx + 0.42 * g.W, g.cy + 0.38 * g.H];
      const u = t % 2.4;
      if (u < 1) { const q = u; return { bx: lerp(L[0], T[0], q), by: lerp(L[1], T[1], q) - Math.abs(Math.sin(q * Math.PI * 4)) * 0.03 * g.H }; }
      if (u < 1.25) return { bx: T[0], by: T[1], rot: 0.08 * Math.sin(u * 20) };
      if (u < 1.85) { const q = ((u - 1.25) / 0.6) ** 2, c = [g.cx + 0.12 * g.W, g.cy - 0.15 * g.H];
        return { bx: (1 - q) ** 2 * T[0] + 2 * (1 - q) * q * c[0] + q * q * E[0], by: (1 - q) ** 2 * T[1] + 2 * (1 - q) * q * c[1] + q * q * E[1], rot: 0.45 }; }
      const q = (u - 1.85) / 0.55; return { bx: lerp(E[0], L[0], q), by: lerp(E[1], L[1], q) - arc(q) * 0.3 * g.H };
    } },
  swing: { dur: 4.6, sound: { cue: 'whoosh', at: 0.4, every: 1.6 },
    run(t, g, p) {
      const a = 0.5 * p.A * ramp(t, 4.6, 0.6) * Math.sin(t * Math.PI * 2 / 1.6), L = 0.5 * g.H, px = g.cx, py = g.cy - 0.32 * g.H;
      return { bx: px + Math.sin(a) * L, by: py + Math.cos(a) * L, rot: a };
    } },
  seesaw: { dur: 4.8, sound: { cue: 'bounce', at: 0.65, every: 1.3 },
    run(t, g, p) {
      const a = (p.two ? 0.2 : 0.09) * p.A * ramp(t, 4.8) * Math.sin(t * Math.PI * 2 / 1.3), pv = [g.cx, g.cy + 0.05 * g.H];
      const end = p.slot ? [g.cx - 0.35 * g.W, g.cy - 0.06 * g.H] : [g.cx + 0.33 * g.W, g.cy - 0.2 * g.H];
      const rx = end[0] - pv[0], ry = end[1] - pv[1], c = Math.cos(-a), n = Math.sin(-a); // the board is one piece: both ends turn together
      const hop = p.two ? 0 : Math.max(0, -Math.sin(t * Math.PI * 2 / 1.3)) * 0.12 * g.H * p.A;
      return { bx: pv[0] + rx * c - ry * n, by: pv[1] + rx * n + ry * c - hop, rot: -a * 0.8, toy: { rot: -a, pivot: 0.55 } };
    } },
  trampoline: { dur: 3.6, sound: { cue: 'bounce', at: 0, every: 0.9 },
    run(t, g, p) {
      const u = (t % 0.9) / 0.9, h = Math.sin(Math.PI * u) * 0.55 * g.H * p.A, low = u < 0.08 || u > 0.92;
      return { bx: g.cx, by: g.cy - 0.22 * g.H - h, sx: low ? 1.12 : 0.96, sy: low ? 0.82 : 1.05, toy: { sy: low ? 0.93 : 1 } };
    } },
  sandpit: { dur: 4, puff: { kind: 'sand', rate: 9, at: [0.15, 0.05] },
    run(t, g, p) { return { bx: g.cx + 0.05 * g.W, by: g.cy + 0.12 * g.H - Math.abs(Math.sin(t * Math.PI * 4)) * 0.03 * g.H, rot: 0.18 * p.A * Math.sin(t * Math.PI * 4) }; } },
  dome: { dur: 4.2, sound: { cue: 'sparkle', at: 2.2 },
    run(t, g, p) {
      const S = [g.cx - 0.42 * g.W, g.cy + 0.38 * g.H], M = [g.cx - 0.28 * g.W, g.cy - 0.05 * g.H], T = [g.cx, g.cy - 0.45 * g.H];
      if (t < 2.2) { const q = t / 2.2, a = q < 0.5 ? S : M, b = q < 0.5 ? M : T, r = q < 0.5 ? q * 2 : q * 2 - 1;
        return { bx: lerp(a[0], b[0], r), by: lerp(a[1], b[1], r) - Math.abs(Math.sin(q * Math.PI * 6)) * 0.03 * g.H, rot: -0.12 }; }
      return { bx: T[0], by: T[1] - Math.abs(Math.sin((t - 2.2) * Math.PI / 0.5)) * 0.12 * g.H * p.A };
    } },
  // Beside the toy: the friend stands next to it and watches, bounces or pushes.
  bubbles: { dur: 4.5, beside: true, sound: { cue: 'pop', at: 0.5, every: 0.8 }, puff: { kind: 'bubble', rate: 5, at: [0, -0.35] }, run: watch },
  fountain: { dur: 4.5, beside: true, sound: { cue: 'sparkle', at: 0 }, puff: { kind: 'sparkle', rate: 6, at: [0, -0.3] }, run: watch },
  well: { dur: 4.5, beside: true, sound: { cue: 'sparkle', at: 0 }, puff: { kind: 'sparkle', rate: 5, at: [0, -0.2] }, run: watch },
  drum: { dur: 3.6, beside: true, sound: { cue: 'count', at: 0, every: 0.45, count: true },
    run(t, g, p) { const u = (t % 0.45) / 0.45; return { ...besideSpot(g, p), lift: arc(u) * 0.15 * p.h * p.A, toy: { sy: u < 0.15 ? 0.9 : 1 } }; } },
  blocks: { dur: 3.6, beside: true, sound: { cue: 'pop', at: 0.3, every: 0.6 },
    run(t, g, p) { const u = (t % 0.6) / 0.6; return { ...besideSpot(g, p), rot: -p.side * 0.15 * arc(u) * p.A, toy: { rot: 0.08 * p.A * Math.sin(t * Math.PI * 2 / 0.6), dy: -arc(u) * 0.06 * g.H } }; } },
  balloons: { dur: 4.4, beside: true, sound: { cue: 'magic', at: 0 },
    run(t, g, p) {
      const up = smooth(clamp(t / 1.2, 0, 1)) * smooth(clamp((4.4 - t) / 1, 0, 1)) * 0.45 * g.H * p.A, sway = Math.sin(t * Math.PI * 2 / 1.8) * 0.06 * g.W * p.A;
      const b = besideSpot(g, p); return { bx: b.bx + sway, by: b.by, lift: up, rot: sway / g.W, toy: { dx: sway, dy: -up } };
    } },
  train: { dur: 4.4, sound: { cue: 'whoosh', at: 0, every: 2.2 },
    run(t, g, p) { const dx = Math.sin(t * Math.PI * 2 / 2.2) * 0.35 * g.W * p.A * ramp(t, 4.4); return { bx: g.cx + dx, by: g.cy - 0.1 * g.H - Math.abs(Math.sin(t * Math.PI * 4)) * 0.02 * g.H, toy: { dx } }; } },
  // The ball: a little kick, and the ball rolls away (WonderIslandScene rolls it).
  ball: { dur: 0.8, beside: true, kickAt: 0.3, sound: { cue: 'bounce', at: 0.3 },
    run(t, g, p) { const b = besideSpot(g, p); return { ...b, lift: arc(clamp(t / 0.6, 0, 1)) * 0.12 * p.h, rot: -p.side * 0.25 * arc(clamp(t / 0.6, 0, 1)) }; } }
};
function besideSpot(g, p) { return { bx: g.cx + p.side * (g.W / 2 + p.w * 0.42), by: g.base }; }
function watch(t, g, p) { const b = besideSpot(g, p); return { ...b, rot: 0.08 * p.A * Math.sin(t * Math.PI * 2 / 1.2), lift: Math.abs(Math.sin(t * Math.PI * 2 / 1.2)) * 0.04 * p.h * p.A }; }

// Where a friend lands when it hops off a toy: beside it, on the side it came from (the other side if that is in the water).
export function hopOffSpot(g, p) {
  for (const side of [p.side, -p.side]) {
    const x = g.cx + side * (g.W / 2 + p.w * 0.45);
    if (onLand(x, g.base)) return settle(x, g.base - p.h / 2, p.w, p.h);
  }
  return settle(g.cx + p.side * (g.W / 2 + p.w * 0.45), g.base - p.h / 2, p.w, p.h);
}
