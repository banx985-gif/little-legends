// Job 18: what a child gets when tapping something that is in the full game: Pip pops up and says "Ask a grown-up!",
// and the thing bounces. Never a price, never anything to buy.
import { drawArt, artMap } from '../core/art.js';
import { drawSpeechBubble } from '../utils/draw.js';

export const ASK_TEXT = 'Ask a grown-up!';
const SHOW_SECONDS = 2.4;

export class AskGrownUp {
  // pip: a PipController already on screen (it reacts and the bubble sits above it); without one, Pip pops up bottom left.
  constructor(game, { pip = null, bubble = null } = {}) { this.game = game; this.pip = pip; this.bubble = bubble; this.t = 0; this.id = null; }
  show(id = null) {
    this.id = id; this.t = SHOW_SECONDS;
    this.game.audio?.playCue?.('tap');
    this.game.audio?.speak?.(ASK_TEXT);
    this.pip?.react?.('bounce', { duration: 0.8 });
  }
  get showing() { return this.t > 0; }
  update(dt) { if (this.t > 0) this.t = Math.max(0, this.t - dt); }
  // How much the tapped thing grows right now (a quick bounce); 1 when it isn't bouncing.
  bounce(id) { if (this.id !== id || this.t <= 0) return 1; const p = SHOW_SECONDS - this.t; return p < 0.5 && !globalThis.__LL_REDUCED_MOTION ? 1 + Math.sin(p * Math.PI * 4) * (0.5 - p) * 0.16 : 1; }
  render(ctx) {
    if (this.t <= 0) return;
    const appear = Math.min(1, (SHOW_SECONDS - this.t) / 0.25, this.t / 0.3);
    if (this.pip) { const b = this.bubble ?? { x: this.pip.x - 220, y: this.pip.y - 420 }; drawSpeechBubble(ctx, ASK_TEXT, b.x, b.y, 440, 112, appear); return; }
    ctx.save(); ctx.globalAlpha *= appear;
    const rise = (1 - appear) * 160;
    drawArt(ctx, artMap()?.pip?.poses?.wave?.id, 190, 1080 + rise, 300, 380, { anchor: 'bottom' });
    ctx.restore();
    drawSpeechBubble(ctx, ASK_TEXT, 40, 560 + rise, 440, 112, appear);
  }
}

// The "sleepy" look on a locked card: a soft lilac veil, a padlock and three little z's.
export function drawSleepy(ctx, x, y, w, h, r, t = 0, lockArt = null) {
  ctx.save();
  ctx.fillStyle = '#e9e1f2b8'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  const cx = x + w - 46, cy = y + 44;
  ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
  if (!lockArt || !drawArt(ctx, lockArt, cx, cy, 52, 52)) {
    ctx.strokeStyle = '#8a7aa0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy - 6, 11, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#8a7aa0'; ctx.beginPath(); ctx.roundRect(cx - 16, cy - 4, 32, 24, 6); ctx.fill();
  }
  ctx.fillStyle = '#8a7aa0'; ctx.textAlign = 'center'; ctx.font = '900 26px ui-rounded, system-ui, sans-serif';
  const drift = globalThis.__LL_REDUCED_MOTION ? 0 : Math.sin(t * 1.5) * 4;
  ctx.globalAlpha *= 0.8; ctx.fillText('z', x + 34, y + h - 34 + drift); ctx.font = '900 32px ui-rounded, system-ui, sans-serif'; ctx.fillText('z', x + 56, y + h - 54 + drift); ctx.font = '900 40px ui-rounded, system-ui, sans-serif'; ctx.fillText('z', x + 84, y + h - 78 + drift);
  ctx.restore();
}
