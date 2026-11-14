// Job 19 step 6: bedtime stories (Luna's Storybook world → BEDTIME; part of the full game).
// Pick a story from the shelf; then each page is read aloud (a recorded line when one exists, otherwise the tablet's own
// voice) with the calm music, the screen dark and soft, and the pages turning by themselves. Every story ends "Goodnight",
// and the last page stays, getting darker. Small arrows let a grown-up turn pages by hand.
// Built to the Job 20 rules: the night sky covers the screen; home and the arrows sit at the safe area's edges.
import { drawArt } from '../core/art.js';
import { drawHomeButton, onHomeButton } from '../utils/draw.js';
import { fillScreen, drawCovered, pinX, pinY, CORE_W, CORE_H } from '../render/screen.js';
import { STORIES, storyArtIds } from '../stories/bedtime.js';

const AFTER_SPEECH = 2.5;            // seconds to look at a page after it has been read
const WORDS_PER_SECOND = 2.2;        // for the page-turn safety timer when no voice is heard
const book = i => ({ x: 480 + i * 480, y: 560, w: 360, h: 420 });
const ARROW = d => ({ x: pinX(d < 0 ? 110 : 1810), y: pinY(960), r: 56 });

export class BedtimeScene {
  constructor(game) { this.game = game; this.t = 0; this.stars = Array.from({ length: 36 }, (_, i) => ({ x: (i * 397) % 1920, y: (i * 211) % 560 + 20, r: 2 + (i % 3), p: i })); }

  enter(data = {}) {
    if (this.game.unlock && this.game.unlock.isUnlocked?.() === false) { this.game.scenes.change('worldSelect'); return; }
    this.game.audio?.startWorldMusic?.('calm');
    this.t = 0; this.pressed = null; this.story = null; this.page = 0; this.pageT = 0; this.spoken = false; this.speechDone = false; this.doneAt = 0; this.dim = 0;
    this.game.assets?.loadArt?.(STORIES.map(s => s.cover));
    const s = STORIES.find(x => x.id === data.story); if (s) this.open(s);
  }
  exit() { this.game.audio?.stopSpeech?.(); }

  open(story) { this.story = story; this.page = 0; this.game.assets?.loadArt?.(storyArtIds(story)); this.startPage(); this.game.audio?.playCue?.('page'); }
  startPage() { this.pageT = 0; this.spoken = false; this.speechDone = false; this.doneAt = 0; }
  turn(d) {
    const n = this.story.pages.length, next = Math.max(0, Math.min(n - 1, this.page + d));
    if (next === this.page) return false;
    this.game.audio?.stopSpeech?.(); this.page = next; this.startPage(); this.game.audio?.playCue?.('pageTurn', { gain: 0.5 }); return true;
  }
  current() { return this.story?.pages[this.page] ?? null; }
  readFor(p) { return Math.min(16, 2 + String(p?.text ?? '').split(/\s+/).length / WORDS_PER_SECOND); }

  update(dt) {
    this.t += dt;
    if (!this.story) return;
    const p = this.current(); this.pageT += dt;
    if (!this.spoken && this.pageT > 0.6) { // read the page (slowly and softly)
      this.spoken = true;
      const ok = this.game.audio?.speak?.(p.text, { rate: 0.8, pitch: 1.0, volume: 0.85, onEnd: () => { this.speechDone = true; this.doneAt = this.pageT; } });
      if (!ok) { this.speechDone = true; this.doneAt = this.pageT + this.readFor(p) - 2; } // no voice: give time to look
    }
    const last = this.page >= this.story.pages.length - 1;
    const ready = (this.speechDone && this.pageT >= this.doneAt + AFTER_SPEECH) || this.pageT >= this.readFor(p) + 3; // never stuck waiting on a voice
    if (ready && !last) this.turn(1);
    this.dim = last ? Math.min(0.55, this.dim + dt * 0.04) : Math.min(0.2, this.dim + dt * 0.01); // darker and darker
  }

  // ---- drawing ----
  render(ctx) {
    fillScreen(ctx, '#141a3d');
    drawCovered(ctx, c => {
      const g = c.createLinearGradient ? c.createLinearGradient(0, 0, 0, 1080) : null;
      if (g) { g.addColorStop(0, '#151b45'); g.addColorStop(1, '#2d2f6b'); c.fillStyle = g; } else c.fillStyle = '#1d2250';
      c.fillRect(0, 0, CORE_W, CORE_H); // scaled up by drawCovered to fill the screen
      c.fillStyle = '#26285a'; c.beginPath(); c.ellipse(960, 1150, 1300, 300, 0, 0, Math.PI * 2); c.fill();
      for (const s of this.stars) { c.globalAlpha = 0.45 + 0.35 * Math.sin(this.t * 0.8 + s.p); c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    });
    if (!this.story) this.renderShelf(ctx); else this.renderPage(ctx);
    if (this.dim > 0) { ctx.save(); ctx.globalAlpha = this.dim; fillScreen(ctx, '#05060f'); ctx.restore(); }
    drawHomeButton(ctx, this.pressed === 'home');
  }
  renderShelf(ctx) {
    ctx.fillStyle = '#fff6c8'; ctx.textAlign = 'center'; ctx.font = '900 64px ui-rounded, system-ui, sans-serif'; ctx.fillText('Bedtime stories', 960, 150);
    STORIES.forEach((s, i) => {
      const b = book(i), k = this.pressed === `story:${i}` ? 0.95 : 1;
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(k, k);
      ctx.fillStyle = ['#4d5bb8', '#3f8f9e', '#5a8a4f'][i % 3]; ctx.beginPath(); ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 30); ctx.fill();
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(-b.w / 2 + 24, -b.h / 2, 16, b.h);
      drawArt(ctx, s.cover, 0, -40, 250, 250);
      ctx.fillStyle = '#fff6c8'; ctx.font = '900 30px ui-rounded, system-ui'; ctx.fillText(s.title, 0, b.h / 2 - 40, b.w - 40);
      ctx.restore();
    });
  }
  renderPage(ctx) {
    const p = this.current(), fade = Math.min(1, this.pageT / 0.8);
    ctx.save(); ctx.globalAlpha = fade;
    if (p.goodnight) { ctx.fillStyle = '#fff6c822'; ctx.beginPath(); ctx.arc(960, 600, 330, 0, Math.PI * 2); ctx.fill(); }
    for (const [id, x, y, w, h] of p.art) drawArt(ctx, id, x, y, w, h, { anchor: 'bottom' });
    // The words, big and calm, at the bottom.
    ctx.fillStyle = '#0d1030cc'; ctx.beginPath(); ctx.roundRect(260, 900, 1400, 140, 50); ctx.fill();
    ctx.fillStyle = '#fff6c8'; ctx.textAlign = 'center'; ctx.font = `800 ${p.goodnight ? 44 : 38}px ui-rounded, system-ui, sans-serif`; ctx.fillText(p.text, 960, 986, 1340);
    ctx.restore();
    // Page dots and small arrows (for a grown-up).
    this.story.pages.forEach((_, i) => { ctx.fillStyle = i === this.page ? '#fff6c8' : '#fff6c855'; ctx.beginPath(); ctx.arc(960 + (i - (this.story.pages.length - 1) / 2) * 34, 70, 9, 0, Math.PI * 2); ctx.fill(); });
    for (const d of [-1, 1]) {
      const a = ARROW(d), on = d < 0 ? this.page > 0 : this.page < this.story.pages.length - 1; if (!on) continue;
      ctx.fillStyle = '#ffffff2a'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.moveTo(a.x + d * 20, a.y); ctx.lineTo(a.x - d * 12, a.y - 20); ctx.lineTo(a.x - d * 12, a.y + 20); ctx.closePath(); ctx.fill();
    }
  }

  controlAt(e) {
    if (onHomeButton(e.x, e.y)) return 'home';
    if (!this.story) { for (let i = 0; i < STORIES.length; i++) { const b = book(i); if (Math.abs(e.x - b.x) <= b.w / 2 && Math.abs(e.y - b.y) <= b.h / 2) return `story:${i}`; } return null; }
    for (const d of [-1, 1]) { const a = ARROW(d); if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 <= (a.r + 20) ** 2) return `arrow:${d}`; }
    return null;
  }
  handlePointer(e) {
    if (e.type === 'down') { this.pressed = this.controlAt(e); this.dim = Math.min(this.dim, 0.15); return; } // a touch brightens it a little
    if (e.type !== 'up') return;
    const pressed = this.pressed; this.pressed = null;
    if (!pressed || this.controlAt(e) !== pressed) return;
    if (pressed === 'home') { this.game.audio?.stopSpeech?.(); this.game.audio?.playCue?.('back'); if (this.story) { this.story = null; this.dim = 0; } else this.game.scenes.change('worldHub', { world: 'storybook' }); return; } // in a story: back to the shelf
    if (pressed.startsWith('story:')) { this.open(STORIES[Number(pressed.slice(6))]); return; }
    if (pressed.startsWith('arrow:')) this.turn(Number(pressed.slice(6)));
  }
}
