// Job 20: asking the grown-up about reminders, once per device, after the child's first mission win (never at first launch).
// 1. Pip says a friendly line for the grown-up, with two big buttons: YES and NOT NOW (NOT NOW is remembered: never asked again).
// 2. YES → the grown-up check (hold the button for 3 seconds, as for buying), then the system's own permission question.
// 3. A short note says what happened; a "no" from the system leaves the switches off (Parent Area → Settings can turn them on).
import { drawCandyButton } from '../utils/draw.js';
import { fillScreen } from '../render/screen.js';
import { HOLD_TO_BUY } from '../store/FullUnlock.js';

export const ASK_LINE = 'Grown-ups: want a little ping when Pip’s egg is ready?';
const YES = { x: 560, y: 600, w: 360, h: 120 }, NO = { x: 1000, y: 600, w: 360, h: 120 }, HOLD = { x: 960, y: 640, r: 140 }, CLOSE = { x: 1560, y: 300, r: 56 };
const inR = (e, r) => e.x >= r.x && e.x <= r.x + r.w && e.y >= r.y && e.y <= r.y + r.h;
const inC = (e, c, pad = 12) => (e.x - c.x) ** 2 + (e.y - c.y) ** 2 <= (c.r + pad) ** 2;

export class NotifyAsk {
  constructor(game, { pip = null } = {}) { this.game = game; this.pip = pip; this.stage = 'ask'; this.hold = 0; this.holding = false; this.note = ''; this.noteT = 0; this.pressed = null; this.said = false; }
  get active() { return this.stage !== 'done'; }
  update(dt) {
    if (!this.said) { this.said = true; this.pip?.say?.('notify_ask', { text: ASK_LINE, bubbleText: 'A little ping?', duration: 3, reaction: 'wave' }); }
    if (this.stage === 'hold' && this.holding) { this.hold += dt; if (this.hold >= HOLD_TO_BUY) { this.holding = false; this.stage = 'asking'; this.request(); } }
    if (this.stage === 'note') { this.noteT -= dt; if (this.noteT <= 0) this.stage = 'done'; }
  }
  async request() {
    const perm = await this.game.notify?.yes?.(this.game.save?.root?.activeProfileId).catch(() => 'denied');
    this.note = perm === 'granted' ? 'Reminders are on. Change them any time in Parent Area → Settings.' : 'No reminders. You can turn them on in Parent Area → Settings.';
    this.stage = 'note'; this.noteT = 3.2;
  }
  async notNow() { this.stage = 'done'; await this.game.notify?.notNow?.(); }
  handlePointer(e) {
    if (this.stage === 'ask') {
      const hit = inR(e, YES) ? 'yes' : inR(e, NO) ? 'no' : null;
      if (e.type === 'down') this.pressed = hit;
      if (e.type === 'up') { const p = this.pressed; this.pressed = null; if (p && p === hit) { this.game.audio?.playCue?.('button'); if (p === 'yes') this.stage = 'hold'; else this.notNow(); } }
      return true;
    }
    if (this.stage === 'hold') {
      if (e.type === 'down' && inC(e, CLOSE)) { this.notNow(); return true; }
      if (e.type === 'down' && inC(e, HOLD, 20)) { this.holding = true; this.hold = 0; }
      if (e.type === 'move' && this.holding && !inC(e, HOLD, 40)) { this.holding = false; this.hold = 0; }
      if (e.type === 'up' || e.type === 'cancel') { this.holding = false; this.hold = 0; }
      return true;
    }
    if (this.stage === 'note' && e.type === 'up') this.stage = 'done';
    return this.stage !== 'done';
  }
  render(ctx) {
    if (this.stage === 'done') return;
    ctx.save();
    fillScreen(ctx, '#2a2036bb');
    ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.roundRect(330, 250, 1260, 560, 70); ctx.fill();
    ctx.fillStyle = '#5a3a73'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (this.stage === 'ask') {
      ctx.font = '900 46px ui-rounded, system-ui'; ctx.fillText('For the grown-up', 960, 350);
      ctx.font = '700 34px system-ui'; ctx.fillText('Want a little ping when Pip’s egg is ready,', 960, 430, 1150); ctx.fillText('or when a surprise is waiting?', 960, 478, 1150);
      ctx.font = '600 24px system-ui'; ctx.fillStyle = '#746a7e'; ctx.fillText('At most 2 a day, never at night. Made on this tablet; nothing is sent anywhere.', 960, 540, 1150);
      drawCandyButton(ctx, YES.x, YES.y, YES.w, YES.h, 'YES', this.pressed === 'yes');
      drawCandyButton(ctx, NO.x, NO.y, NO.w, NO.h, 'NOT NOW', this.pressed === 'no');
    } else if (this.stage === 'hold' || this.stage === 'asking') {
      ctx.font = '900 40px ui-rounded, system-ui'; ctx.fillText('Grown-ups: hold the button for 3 seconds', 960, 360, 1150);
      const p = Math.min(1, this.hold / HOLD_TO_BUY);
      ctx.fillStyle = '#e8def3'; ctx.beginPath(); ctx.arc(HOLD.x, HOLD.y, HOLD.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8b69db'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(HOLD.x, HOLD.y, HOLD.r - 13, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5a3a73'; ctx.font = '900 36px system-ui'; ctx.fillText(this.stage === 'asking' ? '…' : 'HOLD', HOLD.x, HOLD.y + 12);
      ctx.fillStyle = '#efe7f7'; ctx.beginPath(); ctx.arc(CLOSE.x, CLOSE.y, CLOSE.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5a3a73'; ctx.font = '900 44px system-ui'; ctx.fillText('×', CLOSE.x, CLOSE.y + 15);
    } else {
      ctx.font = '800 34px system-ui'; ctx.fillText(this.note, 960, 540, 1150);
    }
    ctx.restore();
  }
}
