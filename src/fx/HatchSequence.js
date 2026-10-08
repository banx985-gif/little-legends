import { art, artMap, drawArt, lookupArt, hatchFrameIds } from '../core/art.js';

// Egg hatch using the 6-frame sets in assets/rewards/hatch/<theme>/ (see data/art_map.json "hatch").
// Auto mode (play): idle → wobble → small crack → big crack → hatch burst → peek → hatched, about 2.8 s, tap = skip().
// Manual mode (showStage/reveal): the adventure's tap-to-hatch step picks the frame per tap, reveal() plays the ending.
// Gentle on purpose: tiny shake, the burst fades in and out (no flashing). Placeholder drawing is the caller's job
// when render() returns false.

const T_WOBBLE = 0.45, T_CRACK = 1.05, T_BIG = 1.45, T_HATCH = 1.85, T_HATCHED = 2.25, T_END = 2.8;

export class HatchSequence {
  constructor({ theme, rewardId = null } = {}) {
    const h = artMap()?.hatch;
    this.theme = theme;
    this.rewardId = rewardId;
    this.frames = hatchFrameIds(theme);
    this.burst = h?.rewards?.[rewardId]?.burst ?? h?.bursts?.[theme] ?? null; // a reward may have its own burst (dragons)
    this.pedestal = h?.pedestal ?? null;
    this.showBaby = Boolean(h?.rewards?.[rewardId]?.baby);
    this.rewardArt = lookupArt('rewards', rewardId);
    this.t = 0;
    this.manualStage = null;
    this.running = false;
  }

  get ready() { return this.frames.length === 6 && this.frames.every(id => art(id)); }
  get finished() { return this.t >= T_END && this.manualStage === null; }
  play() { this.t = 0; this.manualStage = null; this.running = true; return this; }
  showStage(stage) { this.manualStage = Math.max(0, Math.min(4, stage)); this.running = true; return this; }
  reveal() { this.manualStage = null; this.t = T_HATCH; this.running = true; return this; }
  skip() { this.manualStage = null; this.t = T_END; }

  update(dt) { if (this.running && this.ready) this.t += dt; } // waits for its pictures (slow first visit)

  frameIndex() {
    if (this.manualStage !== null) return this.manualStage;
    if (this.t < T_WOBBLE) return 0;
    if (this.t < T_CRACK) return 1;
    if (this.t < T_BIG) return 2;
    if (this.t < T_HATCH) return 3;
    return this.t < T_HATCHED ? 4 : 5;
  }

  // Egg bottom-centred on (x, y); size = frame box. Returns false when the frames are not loaded.
  render(ctx, x, y, size) {
    if (!this.ready) return false;
    const calm = Boolean(globalThis.__LL_REDUCED_MOTION);
    let index = this.frameIndex();
    const revealing = this.manualStage === null && this.t >= T_HATCH;
    if (revealing && !this.showBaby) index = 3; // the theme's baby is a different creature: never show it
    drawArt(ctx, this.pedestal, x, y + size * 0.06, size * 1.25, size * 0.7, { anchor: 'bottom', alpha: 0.75, blend: 'screen' });
    const shaking = !calm && (index === 1 || (this.manualStage !== null && index <= 1));
    const angle = shaking ? Math.sin(this.t * 13) * 0.05 : 0;
    const eggAlpha = revealing && !this.showBaby ? Math.max(0, 1 - (this.t - T_HATCH) / 0.45) : 1;
    if (eggAlpha > 0) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle); ctx.translate(-x, -y);
      drawArt(ctx, this.frames[index], x, y, size, size, { anchor: 'bottom', alpha: eggAlpha });
      ctx.restore();
    }
    if (revealing && !this.showBaby && this.rewardArt) {
      const p = Math.min(1, (this.t - T_HATCH) / 0.45), grow = 0.55 + 0.45 * (1 - (1 - p) * (1 - p));
      drawArt(ctx, this.rewardArt, x, y, size * grow, size * grow, { anchor: 'bottom', alpha: p });
    }
    if (revealing) {
      const b = this.t - T_HATCH, alpha = b < 0.25 ? b / 0.25 : b < 0.55 ? 1 : Math.max(0, 1 - (b - 0.55) / 0.7);
      if (alpha > 0) drawArt(ctx, this.burst, x, y - size * 0.45, size * 1.5, size * 1.5, { alpha: alpha * (calm ? 0.6 : 0.9), blend: 'screen' });
    }
    return true;
  }
}
