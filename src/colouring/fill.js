// Job 17: the colouring studio's bucket fill and line layer. Pure typed-array code (no canvas), so it is quick on cheap
// tablets and testable in Node.
// - The page picture (black lines on white) is read once: `pageLayers` makes the "wall" mask (1 = a line) and the ink
//   layer that is drawn on top of the paint (black, its alpha = how dark the line was, so smooth edges stay smooth).
// - A fill spreads from the tapped point up to the walls, whatever paint is already there (a region can be re-coloured),
//   then grows a couple of pixels into the lines so no white rim shows under their soft edges.
// - Speed (Job 19 re-check): the fill remembers the rows it covered, and the line pixels next to open space are listed
//   once per page, so colouring a fill touches only those.

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
    this.runs = new Int32Array(Math.max(1024, h * 8));         // the last fill's rows: (row start index, left, right)
    this.runCount = 0;
    this.findEdges();
  }

  // Once per page: the line pixels within 2 pixels of open space (left/right/up/down, through line only), each with up to
  // two open pixels next to it. A fill that reaches one of those open pixels also colours the line pixel under the ink.
  findEdges() {
    const { mask, w, h } = this, list = [];
    for (let y = 0; y < h; y++) for (let x = 0, i = y * w; x < w; x++, i++) {
      if (!mask[i]) continue;
      let a = -1, b = -1;
      const add = j => { if (a < 0) a = j; else if (b < 0 && j !== a) b = j; };
      if (x > 0 && !mask[i - 1]) add(i - 1); if (x < w - 1 && !mask[i + 1]) add(i + 1);
      if (y > 0 && !mask[i - w]) add(i - w); if (y < h - 1 && !mask[i + w]) add(i + w);
      if (b < 0) {
        if (x > 1 && mask[i - 1] && !mask[i - 2]) add(i - 2); if (x < w - 2 && mask[i + 1] && !mask[i + 2]) add(i + 2);
        if (y > 1 && mask[i - w] && !mask[i - 2 * w]) add(i - 2 * w); if (y < h - 2 && mask[i + w] && !mask[i + 2 * w]) add(i + 2 * w);
      }
      if (a >= 0) list.push(i, a, b);
    }
    this.edges = Int32Array.from(list);
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
    let stack = this.stack, sp = 0, runs = this.runs, rc = 0;
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
      if (rc + 3 > runs.length) { const bigger = new Int32Array(runs.length * 2); bigger.set(runs); runs = this.runs = bigger; }
      runs[rc++] = row; runs[rc++] = lx; runs[rc++] = rx;
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
    this.runCount = rc;
    return { id, count, minX, minY, maxX, maxY };
  }

  // Writes the last fill in `rgb` into `out` (RGBA pixels of the box bx, by, bw, bh — the whole page or part of it, already
  // holding the current paint), also colouring the line pixels next to it (see findEdges). Returns the number of pixels coloured.
  colour(region, out, bx, by, bw, bh, rgb) {
    const { w, stamp, runs, runCount, edges } = this, id = region.id;
    const px = new Uint32Array(out.buffer, out.byteOffset, bw * bh);
    const c = (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; // little-endian RGBA
    let n = 0;
    for (let k = 0; k < runCount; k += 3) {
      // The run itself (clipped to the box): a native fill for long runs, a plain loop for short ones (faster there).
      const y0 = runs[k] / w - by;
      if (y0 < 0 || y0 >= bh) continue;
      const a = Math.max(runs[k + 1], bx), b = Math.min(runs[k + 2], bx + bw - 1);
      if (b < a) continue;
      const s0 = y0 * bw + a - bx, s1 = y0 * bw + b - bx;
      if (s1 - s0 > 48) px.fill(c, s0, s1 + 1); else for (let q = s0; q <= s1; q++) px[q] = c;
      n += b - a + 1;
    }
    for (let k = 0; k < edges.length; k += 3) {
      if (stamp[edges[k + 1]] !== id && (edges[k + 2] < 0 || stamp[edges[k + 2]] !== id)) continue;
      const i = edges[k], gx = i % w, gy = (i - gx) / w;
      if (gx >= bx && gx < bx + bw && gy >= by && gy < by + bh) { px[(gy - by) * bw + gx - bx] = c; n++; }
    }
    return n;
  }
}

export function hexRgb(hex) {
  const v = parseInt(String(hex).replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
