// Small fallbacks for older Android tablets whose built-in browser engine is a few versions behind (Job 12).
// Only fills gaps; modern browsers keep their own versions.
const proto = globalThis.CanvasRenderingContext2D?.prototype;
if (proto && typeof proto.roundRect !== 'function') {
  // Chrome < 99: rounded rectangle path with one radius (the game only ever passes one number).
  proto.roundRect = function roundRect(x, y, w, h, r = 0) {
    const radius = Math.max(0, Math.min(Array.isArray(r) ? Number(r[0]) || 0 : Number(r) || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}
