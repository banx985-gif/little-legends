// Job 17: the colouring studio's bucket fill and line layer. Pure typed-array code (no canvas), so it is quick on cheap
// tablets and testable in Node.
// - The page picture (black lines on white) is read once: `pageLayers` makes the "wall" mask (1 = a line) and the ink
//   layer that is drawn on top of the paint (black, its alpha = how dark the line was, so smooth edges stay smooth).
// - A fill spreads from the tapped point up to the walls, whatever paint is already there (a region can be re-coloured),
//   then grows a couple of pixels into the lines so no white rim shows under their soft edges.

export const LINE_DARK = 150; // brightness (0–255) below which a page pixel is a line

export function pageLayers(rgba, w, h, threshold = LINE_DARK) {
  const n = w * h, mask = new Uint8Array(n), ink = new Uint8ClampedArray(n * 4);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const a = rgba[p + 3];
    if (a < 16) continue; // transparent = paper
    const lum = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
    const dark = ((255 - lum) * a) / 255;
    if (dark > 24) ink[p + 3] = dark; // r, g, b stay 0: black ink
    if (lum < threshold) mask[i] = 1;
  }
  return { mask, ink };
}

export class Filler {
  constructor(mask, w, h) {
    this.mask = mask; this.w = w; this.h = h;
    this.stamp = new Uint32Array(w * h); // which fill last reached each pixel (no clearing between fills)
    this.id = 0;
    this.stack = new Int32Array(Math.max(1024, (w * h) >> 6)); // seeds; grows if a page ever needs more
  }

  // A tap right on a line fills the nearest open space instead (within a few pixels).
  openNear(x, y, reach = 10) {
    const { mask, w, h } = this;
    for (let r = 0; r <= reach; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const px = x + dx, py = y + dy;
      if (px >= 0 && py >= 0 && px < w && py < h && !mask[py * w + px]) return py * w + px;
    }
    return -1;
  }

  // Scanline flood fill from (x, y). Returns the region's id, pixel count and bounding box, or null (no open space there).
  fill(x, y) {
    const { mask, w, h, stamp } = this;
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const start = this.openNear(x, y);
    if (start < 0) return null;
    if (this.id >= 0xfffffff0) { stamp.fill(0); this.id = 0; }
    const id = ++this.id;
    let stack = this.stack, sp = 0;
    stack[sp++] = start;
    let minX = w, maxX = -1, minY = h, maxY = -1, count = 0;
    while (sp > 0) {
      const i = stack[--sp];
      if (stamp[i] === id || mask[i]) continue;
      const row = i - (i % w), y0 = row / w;
      let l = i, r = i;
      while (l > row && !mask[l - 1] && stamp[l - 1] !== id) l--;
      while (r < row + w - 1 && !mask[r + 1] && stamp[r + 1] !== id) r++;
      for (let k = l; k <= r; k++) stamp[k] = id;
      count += r - l + 1;
      const lx = l - row, rx = r - row;
      if (lx < minX) minX = lx; if (rx > maxX) maxX = rx; if (y0 < minY) minY = y0; if (y0 > maxY) maxY = y0;
      // One seed per open run in the rows above and below.
      for (let ny = y0 - 1; ny <= y0 + 1; ny += 2) {
        if (ny < 0 || ny >= h) continue;
        let inRun = false;
        for (let k = ny * w + lx, end = ny * w + rx; k <= end; k++) {
          const open = !mask[k] && stamp[k] !== id;
          if (open && !inRun) {
            if (sp === stack.length) { const bigger = new Int32Array(stack.length * 2); bigger.set(stack); stack = this.stack = bigger; }
            stack[sp++] = k; inRun = true;
          } else if (!open) inRun = false;
        }
      }
    }
    return { id, count, minX, minY, maxX, maxY };
  }

  // Writes the filled region in `rgb` into `out` (RGBA pixels of the box x, y, bw, bh, already holding the current paint),
  // also colouring line pixels up to 2 pixels from it (left/right/up/down). One pass over the box, for speed.
  // Returns the number of pixels coloured.
  colour(region, out, bx, by, bw, bh, rgb) {
    const { mask, w, h, stamp } = this, id = region.id;
    const px = new Uint32Array(out.buffer, out.byteOffset, bw * bh);
    const c = (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; // little-endian RGBA
    const w2 = w * 2;
    let n = 0;
    for (let y = 0; y < bh; y++) {
      const gy = by + y, row = gy * w + bx, dst = y * bw, up1 = gy >= 1, up2 = gy >= 2, dn1 = gy < h - 1, dn2 = gy < h - 2;
      for (let x = 0; x < bw; x++) {
        const i = row + x;
        if (stamp[i] === id) { px[dst + x] = c; n++; continue; }
        if (!mask[i]) continue;
        const gx = bx + x;
        if ((gx >= 1 && stamp[i - 1] === id) || (gx < w - 1 && stamp[i + 1] === id) || (up1 && stamp[i - w] === id) || (dn1 && stamp[i + w] === id)
          || (gx >= 2 && stamp[i - 2] === id) || (gx < w - 2 && stamp[i + 2] === id) || (up2 && stamp[i - w2] === id) || (dn2 && stamp[i + w2] === id)) { px[dst + x] = c; n++; }
      }
    }
    return n;
  }
}

export function hexRgb(hex) {
  const v = parseInt(String(hex).replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
