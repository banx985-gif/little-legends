// Job 20: fill every screen, no bars.
// Every scene is laid out on a 1920×1080 "core" (x 0–1920, y 0–1080). The canvas fills the WHOLE screen, and the core is
// scaled to fit inside the screen's safe area (clear of the notch and the gesture bar), so everything a child must see
// or reach is on every screen shape. The screen around the core is still drawn: backgrounds stretch to cover all of it
// (trimming a little off their edges), and buttons in a corner or along an edge move out to the safe area's edges.
// A phone held sideways (2340×1080, 19.5:9) sees 2340×1080 design units: the base size.
//   visible = the whole screen in design units (bigger than the core on any shape that isn't exactly 16:9)
//   safe    = visible minus the notch / gesture-bar insets
export const CORE_W = 1920, CORE_H = 1080, BASE_W = 2340, BASE_H = 1080;
const CORE = Object.freeze({ x: 0, y: 0, w: CORE_W, h: CORE_H });

export function setScreen(visible, safe) { globalThis.__LL_SCREEN = { visible: { ...visible }, safe: { ...(safe ?? visible) } }; }
export function screen() { return globalThis.__LL_SCREEN ?? { visible: CORE, safe: CORE }; }
export const visibleRect = () => screen().visible;
export const safeRect = () => screen().safe;

// Corner/edge buttons: a point or box in core units moves with the nearest safe-area edge (left third → left edge,
// right third → right edge, middle → stays). The same function is used to draw a button and to test a tap on it.
export function pinX(x) { const s = safeRect(); return x < CORE_W / 3 ? x + s.x : x > CORE_W * 2 / 3 ? x + (s.x + s.w - CORE_W) : x; }
export function pinY(y) { const s = safeRect(); return y < CORE_H / 3 ? y + s.y : y > CORE_H * 2 / 3 ? y + (s.y + s.h - CORE_H) : y; }
export function pin(r) { const cx = r.x + r.w / 2, cy = r.y + r.h / 2; return { ...r, x: r.x + pinX(cx) - cx, y: r.y + pinY(cy) - cy }; }
export function inRect(x, y, r, pad = 0) { return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad; }

// A flat colour over the whole screen (backgrounds, dimming layers).
export function fillScreen(ctx, colour) {
  const v = visibleRect();
  if (colour) ctx.fillStyle = colour;
  ctx.fillRect(v.x - 2, v.y - 2, v.w + 4, v.h + 4);
}

// Backgrounds: a 1920×1080 background is scaled up just enough to cover the whole screen (its edges are trimmed), and
// slid so the ground line (y 820, where things stand) stays put wherever the screen shape allows. That keeps the
// background lined up with the things standing on it.
const GROUND = { x: CORE_W / 2, y: 820 };
export function coverTransform() {
  const v = visibleRect(), k = Math.max(1, v.w / CORE_W, v.h / CORE_H);
  const place = (want, lo, hi) => Math.min(hi, Math.max(lo, want));
  // The scaled background's top-left: at or before the screen's near edge, and its far side at or past the far edge.
  const x = place(GROUND.x - GROUND.x * k, v.x + v.w - CORE_W * k, v.x), y = place(GROUND.y - GROUND.y * k, v.y + v.h - CORE_H * k, v.y);
  return { k, x, y };
}
export const coverScale = () => coverTransform().k;
// Draws `draw` (which paints a 1920×1080 background) so it covers the whole screen.
export function drawCovered(ctx, draw) {
  const t = coverTransform();
  if (t.k <= 1.0005 && Math.abs(t.x) < 0.5 && Math.abs(t.y) < 0.5) { draw(ctx); return; }
  ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.k, t.k);
  draw(ctx);
  ctx.restore();
}
