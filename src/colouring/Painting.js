// Job 17: one colouring picture — the child's paint, the page's black lines on top, stickers above both.
// Built for cheap tablets:
// - It works at 1280×720 in Lite (1600×900 Balanced, 1920×1080 High): one paint layer, one line layer, and a copy of the
//   paint kept on the CPU side ("shadow") so a fill or an undo never has to read pixels back from the GPU.
// - Undo keeps only the changed box of each step (20 steps), within a memory budget; the oldest steps go first.
// Everything is in page units (1920×1080) outside this class.
import { Filler, pageLayers, hexRgb } from './fill.js';
import { PAGE_W, PAGE_H, drawStampShape } from './pages.js';

export const UNDO_STEPS = 20;
const UNDO_BYTES = { high: 80e6, balanced: 56e6, lite: 32e6 };
// Brush sizes (small, medium, large) in page units.
export const SIZES = { texta: [14, 30, 60], brush: [26, 54, 100], rainbow: [16, 34, 64], eraser: [30, 64, 120], stamp: [110, 170, 250] };
export function workSize(quality = globalThis.__LL_QUALITY) { return quality === 'lite' ? [1280, 720] : quality === 'balanced' ? [1600, 900] : [1920, 1080]; }

export function makeCanvas(w, h) {
  if (typeof document !== 'undefined' && document.createElement) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  return null;
}

export class Painting {
  constructor({ quality = globalThis.__LL_QUALITY, canvas = makeCanvas } = {}) {
    [this.w, this.h] = workSize(quality);
    this.k = this.w / PAGE_W;
    this.newCanvas = canvas;
    this.paint = canvas(this.w, this.h); this.pctx = this.paint.getContext('2d');
    this.shadow = canvas(this.w, this.h); this.sctx = this.shadow.getContext('2d', { willReadFrequently: true });
    this.lines = canvas(this.w, this.h); this.lctx = this.lines.getContext('2d');
    this.budget = UNDO_BYTES[quality] ?? UNDO_BYTES.high;
    this.filler = null;
    this.stickers = []; // { art, x, y, size } — page units, size 1 = 220 units across
    this.undoList = []; this.redoList = [];
    this.stroke = null;
    this.dirty = false;
    this.blank();
  }

  blank() { for (const c of [this.pctx, this.sctx]) { c.fillStyle = '#fff'; c.fillRect(0, 0, this.w, this.h); } }

  // The page: an <img> (Aaron's picture) or a function that draws it in page units. Reads its lines once.
  setPage(source) {
    const tmp = this.newCanvas(this.w, this.h), t = tmp.getContext('2d', { willReadFrequently: true });
    t.fillStyle = '#fff'; t.fillRect(0, 0, this.w, this.h);
    if (typeof source === 'function') { t.save(); t.scale(this.k, this.k); source(t); t.restore(); }
    else if (source) t.drawImage(source, 0, 0, this.w, this.h);
    const { mask, ink } = pageLayers(t.getImageData(0, 0, this.w, this.h).data, this.w, this.h);
    const out = this.lctx.createImageData(this.w, this.h); out.data.set(ink);
    this.lctx.clearRect(0, 0, this.w, this.h); this.lctx.putImageData(out, 0, 0);
    this.filler = new Filler(mask, this.w, this.h);
    tmp.width = tmp.height = 0;
    // The first fills on a page are ~3× slower than later ones (the browser hasn't optimised the fill code yet): a few
    // here, while the page is opening, make the child's first tap as quick as the rest. They change no paint.
    const scratch = new Uint8ClampedArray(16 * 16 * 4);
    for (let i = 0; i < 3; i++) { const r = this.filler.fill(4 + i, 4); if (r) this.filler.colour(r, scratch, 0, 0, 16, 16, [0, 0, 0]); }
  }

  // A saved painting (an <img>) back onto the paint layer.
  loadPaint(img) { if (!img) return; this.pctx.drawImage(img, 0, 0, this.w, this.h); this.sctx.drawImage(img, 0, 0, this.w, this.h); }

  // ---- history ----
  bytesUsed() { let n = 0; for (const e of [...this.undoList, ...this.redoList]) n += e.before?.data?.length ?? 0; return n; }
  push(entry) {
    this.undoList.push(entry); this.redoList = []; this.dirty = true;
    while (this.undoList.length > UNDO_STEPS || (this.undoList.length > 1 && this.bytesUsed() > this.budget)) this.undoList.shift();
  }
  canUndo() { return this.undoList.length > 0; }
  canRedo() { return this.redoList.length > 0; }
  undo() { return this.swap(this.undoList, this.redoList); }
  redo() { return this.swap(this.redoList, this.undoList); }
  swap(from, to) {
    const e = from.pop(); if (!e) return false;
    const back = { ...e };
    if (e.before) { back.before = this.sctx.getImageData(e.x, e.y, e.w, e.h); this.put(e.before, e.x, e.y); }
    if (e.stickers) { back.stickers = this.stickers.map(s => ({ ...s })); this.stickers = e.stickers.map(s => ({ ...s })); }
    to.push(back); this.dirty = true;
    return true;
  }
  put(data, x, y) { this.pctx.putImageData(data, x, y); this.sctx.putImageData(data, x, y); }
  // Box in work pixels, clamped to the canvas; null when empty.
  box(x0, y0, x1, y1) {
    const x = Math.max(0, Math.floor(x0)), y = Math.max(0, Math.floor(y0)), w = Math.min(this.w, Math.ceil(x1)) - x, h = Math.min(this.h, Math.ceil(y1)) - y;
    return w > 0 && h > 0 ? { x, y, w, h } : null;
  }
  // After drawing into the paint layer: remember the box as it was (from the shadow), then copy the new paint across.
  commit(b) {
    if (!b) return;
    const before = this.sctx.getImageData(b.x, b.y, b.w, b.h);
    this.sctx.drawImage(this.paint, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h);
    this.push({ ...b, before });
  }
  stickersChanged(before) { this.push({ stickers: before.map(s => ({ ...s })) }); }

  // ---- brushes: texta (crisp), brush (soft), rainbow (colour changes as it goes), eraser ----
  beginStroke(tool, colour, size, x, y) {
    const r = (SIZES[tool] ?? SIZES.texta)[size] * this.k / 2;
    this.stroke = { tool, colour, r, x: x * this.k, y: y * this.k, hue: Math.random() * 360, left: 0, box: [Infinity, Infinity, -Infinity, -Infinity] };
    if (tool === 'brush') this.sprite = this.softDot(colour, r);
    this.segment(this.stroke.x, this.stroke.y, true);
  }
  strokeTo(x, y) { if (this.stroke) this.segment(x * this.k, y * this.k, false); }
  endStroke() {
    const s = this.stroke; this.stroke = null; this.sprite = null;
    if (!s) return false;
    const [x0, y0, x1, y1] = s.box, pad = s.r + 2;
    this.commit(this.box(x0 - pad, y0 - pad, x1 + pad, y1 + pad));
    return true;
  }
  segment(x, y, first) {
    const s = this.stroke, c = this.pctx, b = s.box;
    b[0] = Math.min(b[0], x, s.x); b[1] = Math.min(b[1], y, s.y); b[2] = Math.max(b[2], x, s.x); b[3] = Math.max(b[3], y, s.y);
    if (s.tool === 'brush') {
      // Soft dots along the line, a quarter of the brush apart.
      const d = Math.hypot(x - s.x, y - s.y), step = Math.max(1, s.r * 0.25), sz = s.r * 2;
      if (first) c.drawImage(this.sprite, x - s.r, y - s.r, sz, sz);
      let t = s.left;
      while (t + step <= d) { t += step; const p = t / d; c.drawImage(this.sprite, s.x + (x - s.x) * p - s.r, s.y + (y - s.y) * p - s.r, sz, sz); }
      s.left = t - d;
      if (!first && d > 0) { s.x = x; s.y = y; } // keep the spacing across segments
      return;
    }
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = s.r * 2;
    if (s.tool === 'rainbow') { s.hue = (s.hue + Math.hypot(x - s.x, y - s.y) * 0.5 / this.k) % 360; c.strokeStyle = `hsl(${s.hue},90%,55%)`; }
    else c.strokeStyle = s.tool === 'eraser' ? '#fff' : s.colour;
    c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(first ? x + 0.01 : x, y); c.stroke(); c.restore();
    s.x = x; s.y = y;
  }
  softDot(colour, r) {
    const size = Math.max(2, Math.ceil(r * 2)), cv = this.newCanvas(size, size), g = cv.getContext('2d');
    const [R, G, B] = hexRgb(colour), grad = g.createRadialGradient?.(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    if (grad) { grad.addColorStop(0, `rgba(${R},${G},${B},0.55)`); grad.addColorStop(0.55, `rgba(${R},${G},${B},0.35)`); grad.addColorStop(1, `rgba(${R},${G},${B},0)`); g.fillStyle = grad; }
    else g.fillStyle = colour;
    g.fillRect(0, 0, size, size);
    return cv;
  }

  // ---- bucket ----
  // Fills the shape under (x, y) up to the black lines. Returns the time it took (ms), or null (nothing to fill).
  fill(x, y, colour) {
    if (!this.filler) return null;
    const t0 = globalThis.performance?.now?.() ?? Date.now();
    const r = this.filler.fill(x * this.k, y * this.k);
    if (!r) return null;
    const b = this.box(r.minX - 2, r.minY - 2, r.maxX + 3, r.maxY + 3);
    const before = this.sctx.getImageData(b.x, b.y, b.w, b.h);
    const copy = new Uint8ClampedArray(before.data), after = typeof ImageData === 'function' ? new ImageData(copy, b.w, b.h) : { data: copy, width: b.w, height: b.h };
    this.filler.colour(r, after.data, b.x, b.y, b.w, b.h, hexRgb(colour));
    this.put(after, b.x, b.y);
    this.push({ ...b, before });
    return (globalThis.performance?.now?.() ?? Date.now()) - t0;
  }

  // ---- stamp: a solid shape in the chosen colour (the stamp picture tinted, or a drawn shape) ----
  stamp(shape, colour, size, x, y, img = null) {
    const s = SIZES.stamp[size] * this.k, cx = x * this.k, cy = y * this.k, c = this.pctx;
    if (img) {
      const tmp = this.newCanvas(Math.ceil(s), Math.ceil(s)), t = tmp.getContext('2d');
      t.drawImage(img, 0, 0, s, s); t.globalCompositeOperation = 'source-in'; t.fillStyle = colour; t.fillRect(0, 0, s, s);
      c.drawImage(tmp, cx - s / 2, cy - s / 2, s, s); tmp.width = tmp.height = 0;
    } else { c.save(); c.fillStyle = colour; drawStampShape(c, shape, cx, cy, s); c.restore(); }
    this.commit(this.box(cx - s / 2 - 2, cy - s / 2 - 2, cx + s / 2 + 2, cy + s / 2 + 2));
  }

  clear() {
    const before = this.sctx.getImageData(0, 0, this.w, this.h), stickers = this.stickers.map(s => ({ ...s }));
    this.blank(); this.stickers = [];
    this.push({ x: 0, y: 0, w: this.w, h: this.h, before, stickers });
  }

  // ---- saving ----
  // A small picture for the page picker and My Pictures: paint, lines and stickers (drawSticker draws one, page units).
  thumbnail(drawSticker, tw = 384, th = 216) {
    const cv = this.newCanvas(tw, th), t = cv.getContext('2d');
    t.drawImage(this.paint, 0, 0, tw, th); t.drawImage(this.lines, 0, 0, tw, th);
    t.save(); t.scale(tw / PAGE_W, th / PAGE_H); for (const s of this.stickers) drawSticker?.(t, s); t.restore();
    const url = cv.toDataURL?.('image/jpeg', 0.82) ?? null;
    cv.width = cv.height = 0;
    return url;
  }
  // The paint layer as a PNG (a Blob where the browser can, else a data URL).
  paintImage() {
    const cv = this.paint;
    if (typeof cv.toBlob === 'function') return new Promise(resolve => cv.toBlob(b => resolve(b ?? cv.toDataURL('image/png')), 'image/png'));
    if (typeof cv.convertToBlob === 'function') return cv.convertToBlob({ type: 'image/png' });
    return Promise.resolve(null);
  }

  // Leaving the studio: let the big canvases go now rather than whenever the garbage collector gets to them.
  dispose() {
    for (const c of [this.paint, this.shadow, this.lines]) if (c) { c.width = 0; c.height = 0; }
    this.paint = this.shadow = this.lines = this.pctx = this.sctx = this.lctx = null;
    this.filler = null; this.undoList = []; this.redoList = []; this.stickers = [];
  }
}
