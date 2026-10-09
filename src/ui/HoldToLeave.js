import { drawArt, lookupArt } from '../core/art.js';

// A way out of a mission that a grown-up can find but a toddler won't trigger by accident:
// the home button in the top-right corner must be held for HOLD_SECONDS. A quick tap only shows
// "Grown-ups: hold to leave". Same idea as the parent gate (hold the big circle).
const HOLD_SECONDS = 1.5;

export class HoldToLeave {
  constructor({ x = 1830, y = 100, r = 62, onLeave = () => {} } = {}) {
    this.x = x; this.y = y; this.r = r; this.onLeave = onLeave;
    this.holding = false; this.hold = 0; this.tipT = 0; this.done = false;
  }

  contains(e) { return (e.x - this.x) ** 2 + (e.y - this.y) ** 2 <= (this.r + 18) ** 2; }

  // Returns true when the button used the event (the activity underneath must not see it).
  handlePointer(e) {
    if (this.done) return false;
    if (e.type === 'down') { if (!this.contains(e)) return false; this.holding = true; this.hold = 0; this.tipT = 2.2; return true; }
    if (!this.holding) return false;
    if (e.type === 'move') { if (!this.contains(e)) { this.holding = false; this.hold = 0; } return true; }
    if (e.type === 'up' || e.type === 'cancel') { this.holding = false; this.hold = 0; return true; }
    return true;
  }

  update(dt) {
    if (this.tipT > 0) this.tipT = Math.max(0, this.tipT - dt);
    if (!this.holding || this.done) return;
    this.hold += dt;
    if (this.hold >= HOLD_SECONDS) { this.done = true; this.holding = false; this.onLeave(); }
  }

  render(ctx) {
    const { x, y, r } = this;
    ctx.save();
    // The round home button picture; without it, a white circle with the home icon (or a drawn house).
    if (!drawArt(ctx, lookupArt('ui', 'homeButton'), x, y, r * 2.1, r * 2.1)) {
    ctx.fillStyle = '#ffffffd9';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (!drawArt(ctx, lookupArt('ui', 'home'), x, y, r * 1.3, r * 1.3)) {
      ctx.fillStyle = '#5a3a73'; ctx.beginPath(); ctx.moveTo(x - 34, y - 2); ctx.lineTo(x, y - 34); ctx.lineTo(x + 34, y - 2); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 24, y - 4, 48, 36);
    }
    }
    if (this.holding) {
      ctx.strokeStyle = '#8b69db'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.hold / HOLD_SECONDS)); ctx.stroke();
    }
    if (this.tipT > 0) {
      ctx.globalAlpha = Math.min(1, this.tipT / 0.3);
      ctx.fillStyle = '#453857ee'; ctx.beginPath(); ctx.roundRect(x - 400, y + r + 18, 400 + r, 70, 30); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 30px ui-rounded, system-ui, sans-serif';
      ctx.fillText('Grown-ups: hold to leave', x - 200 + r / 2, y + r + 54, 380 + r);
    }
    ctx.restore();
  }
}
