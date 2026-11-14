// Job 19: a playground in a world (Dino Valley, Octo's Sea, Space, Animal Forest, Busy Town), the Job 15 way:
// drag anything anywhere it can stand, tap it for its sound, hold it for the + and − size buttons, and things react
// (dinos eat and nap, animals go home, vehicles drive the roads, rockets launch, planets spin, sea friends swim).
// Where things are and how big is saved per child. Cheap tablets: at most ~15 pictures, simple motion only.
import { drawActivityBackground } from '../activities/activityDraw.js';
import { drawHomeButton, HOME_BUTTON } from '../utils/draw.js';
import { drawArt } from '../core/art.js';
import { fillScreen, visibleRect } from '../render/screen.js';
import { PLAYGROUNDS } from '../playgrounds/playgrounds.js';
import { SIZE_MIN, SIZE_MAX, SIZE_STEP, HOLD_SECONDS, SIZE_BUTTONS_SECONDS, DRAG_START } from '../island/islandPlay.js';

const SIZE_R = 58, DRIVE_SPEED = 230, SWIM_SPEED = 90;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DUR = { bounce: 0.35, eat: 2.6, sleep: 4.5, home: 3.4, launch: 3.4, spin: 2.2, wobble: 0.9 };
const SKY_KINDS = new Set(['planet', 'floater']);

export class PlaygroundScene {
  constructor(game) { this.game = game; this.objects = []; this.particles = []; this.t = 0; }

  async enter(data = {}) {
    this.world = PLAYGROUNDS[data.world] ? data.world : 'dino';
    this.cfg = PLAYGROUNDS[this.world];
    if (this.game.unlock && !this.game.unlock.worldOpen(this.world)) { this.game.scenes.change('worldSelect'); return; }
    this.game.audio?.startWorldMusic?.(this.cfg.music);
    this.t = 0; this.press = null; this.drag = null; this.sizeButtons = null; this.sizePress = null; this.pressed = null; this.particles = [];
    const saved = this.game.save?.getProfileState?.()?.playgrounds?.[this.world] ?? {};
    this.objects = this.cfg.things.map(t => {
      const p = saved[t.id] ?? {};
      return { ...t, x: Number.isFinite(p.x) ? p.x : t.x, y: Number.isFinite(p.y) ? p.y : t.y, size: clamp(Number(p.size) || 1, SIZE_MIN, SIZE_MAX), anim: null, rot: 0 };
    });
    for (const o of this.objects) { if (o.kind === 'swimmer') o.swim = { dir: o.x < 960 ? 1 : -1, speed: SWIM_SPEED * (0.7 + ((o.id.length * 37) % 10) / 15), phase: o.x / 100 }; if (o.kind === 'vehicle') this.startDriving(o, false); }
    this.game.assets?.loadArt?.(this.objects.map(o => o.art));
  }

  // ---- geometry ----
  isSky(o) { return SKY_KINDS.has(o.kind) || o.kind === 'swimmer'; }
  depthK(o) { if (this.isSky(o)) return 1; const g = this.cfg.ground; return 0.8 + 0.2 * clamp((o.y - g.top) / (g.bottom - g.top), 0, 1); }
  drawn(o) { const k = this.depthK(o) * o.size; return { w: o.w * k, h: o.h * k }; }
  box(o) { const d = this.drawn(o); return { x: o.x - d.w / 2, y: o.y - d.h, w: d.w, h: d.h }; }
  objectAt(x, y) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i]; if (o.hidden) continue;
      const b = this.box(o), lift = this.offset(o);
      if (x >= b.x + lift.dx && x <= b.x + b.w + lift.dx && y >= b.y + lift.dy && y <= b.y + b.h + lift.dy) return o;
    }
    return null;
  }
  // Where a thing may stand: sea friends in the water, planets and floaters in the sky, everything else on the ground.
  settle(o) {
    const d = this.drawn(o), area = o.kind === 'swimmer' ? this.cfg.water : SKY_KINDS.has(o.kind) ? (this.cfg.sky ?? this.cfg.water) : null;
    o.x = clamp(o.x, 70, 1850);
    if (o.surface && this.cfg.water) o.y = clamp(o.y, this.cfg.water.top - 10, this.cfg.water.top + 60);
    else if (area) o.y = clamp(o.y, area.top + d.h, area.bottom);
    else o.y = clamp(o.y, this.cfg.ground.top, this.cfg.ground.bottom);
  }
  roadAt(y) { return (this.cfg.roads ?? []).find(r => y >= r.top && y <= r.bottom) ?? null; }
  sort() { this.objects.sort((a, b) => (this.isSky(a) === this.isSky(b) ? a.y - b.y : this.isSky(a) ? -1 : 1)); }
  near(o, kinds) {
    let best = null, bestD = Infinity;
    for (const t of this.objects) {
      if (t === o || !kinds.includes(t.kind) || t.hidden) continue;
      const tw = this.drawn(t).w, dx = Math.abs(t.x - o.x), dy = Math.abs(t.y - o.y);
      if (dx <= tw / 2 + 50 && dy <= 110 && dx + dy < bestD) { best = t; bestD = dx + dy; }
    }
    return best;
  }

  // ---- what things do ----
  play(o, kind, extra = {}) { o.anim = { kind, t: 0, dur: DUR[kind] ?? 1, ...extra }; }
  startDriving(o, honk = true) {
    const road = this.roadAt(o.y); if (!road) { o.drive = null; return; }
    o.y = road.y; o.drive = { dir: road.dir }; if (honk) this.game.audio?.playCue?.(o.sound ?? 'horn');
  }
  tap(o) {
    this.game.audio?.playCue?.(o.sound ?? (o.kind === 'egg' ? 'pop' : 'tap'));
    if (o.kind === 'rocket') { this.launch(o); return; }
    if (o.kind === 'planet') { this.play(o, 'spin'); this.game.audio?.playCue?.('magic'); return; }
    if (o.kind === 'egg') { this.play(o, 'wobble'); return; }
    if (o.kind === 'swimmer') this.puff(o, 'bubble', 6);
    if (o.kind === 'vehicle' && !o.drive) this.startDriving(o, false);
    if (!o.anim) this.play(o, 'bounce');
  }
  launch(o) { if (o.anim?.kind === 'launch') return; this.play(o, 'launch', { homeY: o.y }); this.game.audio?.playCue?.('rocket'); }
  drop(o) {
    this.settle(o); this.sort();
    if (o.kind === 'vehicle') this.startDriving(o);
    if (o.kind === 'rocket' && this.near(o, ['pad'])) { const pad = this.near(o, ['pad']); o.x = pad.x; o.y = pad.y - 20; this.launch(o); }
    if (o.kind === 'friend' || o.kind === 'animal') {
      const food = this.near(o, ['food']), bed = this.near(o, ['nest']), home = o.kind === 'animal' && this.near(o, ['home']);
      if (home) { this.play(o, 'home', { home, fromX: o.x, fromY: o.y }); this.game.audio?.playCue?.('pop'); }
      else if (food) { o.x = food.x + (o.x < food.x ? -1 : 1) * (this.drawn(food).w / 2 + this.drawn(o).w * 0.3); this.settle(o); this.play(o, 'eat'); this.game.audio?.playCue?.(this.world === 'dino' ? 'dinoEat' : 'eat'); }
      else if (bed) { o.x = bed.x; o.y = bed.y - 8; this.play(o, 'sleep'); this.game.audio?.playCue?.('pop'); }
    }
    this.save(o);
  }
  save(o) {
    const world = this.world, id = o.id, p = { x: Math.round(o.x), y: Math.round(o.y), size: o.size };
    // One save at a time: two quick drops must not overwrite each other.
    this.saving = (this.saving ?? Promise.resolve()).then(() => this.game.save?.mutateProfileState?.(state => { state.playgrounds ??= {}; state.playgrounds[world] ??= {}; state.playgrounds[world][id] = p; })).catch(() => {});
    return this.saving;
  }
  puff(o, kind, n) { for (let i = 0; i < n; i++) this.particles.push({ kind, x: o.x + (Math.random() - 0.5) * 60, y: o.y - this.drawn(o).h * (0.5 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 80, life: 1.2, max: 1.2, size: 8 + Math.random() * 10 }); }

  update(dt) {
    this.t += dt;
    if (this.press && !this.press.held && !this.press.moved) { this.press.t += dt; if (this.press.t >= HOLD_SECONDS) { this.press.held = true; this.sizeButtons = { o: this.press.o, t: SIZE_BUTTONS_SECONDS }; this.game.audio?.playCue?.('pop'); } }
    if (this.sizeButtons && !this.press) { this.sizeButtons.t -= dt; if (this.sizeButtons.t <= 0) this.sizeButtons = null; }
    for (const o of this.objects) {
      if (o === this.drag) continue;
      if (o.drive) { const v = visibleRect(), a = Math.min(-160, v.x - 160), b = Math.max(2080, v.x + v.w + 160); o.x += o.drive.dir * DRIVE_SPEED * dt; if (o.x > b) o.x = a; if (o.x < a) o.x = b; } // round and round, off one edge of the screen and back on the other
      if (o.swim) { o.x += o.swim.dir * o.swim.speed * dt; if (o.x > 1800) o.swim.dir = -1; if (o.x < 120) o.swim.dir = 1; }
      if (o.kind === 'planet') o.rot += dt * (o.anim?.kind === 'spin' ? 7 : 0.35);
      const a = o.anim; if (!a) continue;
      a.t += dt;
      if (a.kind === 'eat' && Math.floor(a.t / 0.5) !== Math.floor((a.t - dt) / 0.5)) this.puff(o, 'crumb', 3);
      if (a.kind === 'sleep' && Math.floor(a.t / 0.9) !== Math.floor((a.t - dt) / 0.9)) this.particles.push({ kind: 'z', x: o.x + 40, y: o.y - this.drawn(o).h * 0.8, vx: 20, vy: -40, life: 1.6, max: 1.6, size: 30 });
      if (a.kind === 'launch' && a.t > 0.4 && a.t < 3.2) this.particles.push({ kind: 'flame', x: o.x + (Math.random() - 0.5) * 30, y: o.y + this.offset(o).dy, vx: (Math.random() - 0.5) * 40, vy: 120, life: 0.4, max: 0.4, size: 14 + Math.random() * 10 });
      if (a.kind === 'home') { o.hidden = a.t > 0.6 && a.t < 2.6; if (a.t >= 2.6 && !a.out) { a.out = true; o.x = a.home.x + this.drawn(a.home).w * 0.55; o.y = a.home.y; this.settle(o); this.game.audio?.playCue?.(o.sound ?? 'pop'); } }
      if (a.t >= a.dur) { o.anim = null; o.hidden = false; if (a.kind === 'home') { this.sort(); this.save(o); } }
    }
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.particles.length > 60) this.particles.splice(0, this.particles.length - 60); // cheap tablets
  }

  // Motion drawn on the flat pictures: no new detail is drawn on the art.
  offset(o) {
    const a = o.anim, out = { dx: 0, dy: 0, sx: 1, sy: 1, rot: o.rot ?? 0, alpha: 1 };
    if (o.swim) { out.dy = Math.sin(this.t * 2 + o.swim.phase) * 14; }
    if (o.kind === 'floater') out.dy = Math.sin(this.t * 1.3 + o.x / 200) * 12;
    if (!a) return out;
    const p = a.t / a.dur;
    if (a.kind === 'bounce') { const s = Math.sin(p * Math.PI); out.sy = 1 + s * 0.12; out.sx = 1 - s * 0.06; out.dy -= s * 24; }
    else if (a.kind === 'eat') out.rot = Math.sin(a.t * 12) * 0.07;
    else if (a.kind === 'sleep') { out.sy = 1 + Math.sin(a.t * 2.4) * 0.035; out.rot = -0.05; }
    else if (a.kind === 'wobble') out.rot = Math.sin(a.t * 26) * 0.18 * (1 - p);
    else if (a.kind === 'home') {
      if (a.t < 0.6) { const q = a.t / 0.6; out.dx = (a.home.x - a.fromX) * q; out.dy = (a.home.y - a.fromY) * q - Math.sin(q * Math.PI) * 40; out.sx = out.sy = 1 - q * 0.9; }
      else if (a.t >= 2.6) { const q = Math.min(1, (a.t - 2.6) / 0.5); out.sx = out.sy = q < 0.7 ? q / 0.7 * 1.1 : 1.1 - (q - 0.7) / 0.3 * 0.1; }
    } else if (a.kind === 'launch') {
      const t = a.t;
      if (t < 0.4) out.dx = Math.sin(t * 90) * 5;
      else if (t < 1.6) out.dy = -Math.pow((t - 0.4) / 1.2, 2) * 1200;
      else if (t < 2.0) out.dy = -1300;
      else { const q = Math.min(1, (t - 2.0) / 1.2); out.dy = -1300 * Math.pow(1 - q, 2); }
    }
    return out;
  }

  render(ctx) {
    this.drawBackdrop(ctx);
    for (const o of this.objects) {
      if (o.hidden) continue;
      const d = this.drawn(o), m = this.offset(o), lifted = o === this.drag || this.sizeButtons?.o === o ? 1.06 : 1;
      ctx.save();
      ctx.translate(o.x + m.dx, o.y + m.dy - d.h / 2); ctx.rotate(m.rot); ctx.scale(m.sx * lifted, m.sy * lifted);
      if (!SKY_KINDS.has(o.kind) && o.kind !== 'swimmer') { ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(0, d.h / 2 - 4, d.w * 0.36, 12, 0, 0, Math.PI * 2); ctx.fill(); }
      const flip = (o.drive && o.drive.dir < 0) || (o.swim && o.swim.dir < 0);
      if (!drawArt(ctx, o.art, 0, 0, d.w, d.h, { flipX: flip })) { ctx.fillStyle = '#ffffffaa'; ctx.beginPath(); ctx.roundRect(-d.w * 0.3, -d.h * 0.3, d.w * 0.6, d.h * 0.6, 24); ctx.fill(); }
      ctx.restore();
    }
    this.renderParticles(ctx);
    if (this.sizeButtons) this.renderSizeButtons(ctx);
    drawHomeButton(ctx, this.pressed === 'home');
  }
  drawBackdrop(ctx) {
    if (this.cfg.theme === 'sea') {
      const v = visibleRect(), L = v.x - 2, W = v.w + 4; // Job 20: sky, sea and sand run to every edge of the screen
      fillScreen(ctx, '#9fe3ff');
      const g = ctx.createLinearGradient ? ctx.createLinearGradient(0, 300, 0, 940) : null;
      if (g) { g.addColorStop(0, '#5cc8f5'); g.addColorStop(1, '#2a7fc9'); ctx.fillStyle = g; } else ctx.fillStyle = '#3f9fe0';
      ctx.fillRect(L, 300, W, 640);
      ctx.fillStyle = '#ffffff55'; for (let i = 0, n = Math.ceil(W / 170) + 1; i < n; i++) { const x = L + (i * 170 + this.t * 30) % (n * 170) - 60; ctx.beginPath(); ctx.ellipse(x, 312, 60, 10, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f2d98b'; ctx.beginPath(); ctx.moveTo(L, 940); ctx.quadraticCurveTo(960, 880, L + W, 940); ctx.lineTo(L + W, v.y + v.h + 2); ctx.lineTo(L, v.y + v.h + 2); ctx.closePath(); ctx.fill();
    } else drawActivityBackground(ctx, this.cfg.theme);
    // Drawn worlds: a wider hill than the mission screens have, so there is room to play.
    if (this.cfg.hill) { ctx.fillStyle = this.cfg.hill; ctx.beginPath(); ctx.ellipse(960, 1300, 1900, 780, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const r of this.cfg.roads ?? []) {
      if (r.hidden) continue; // the moon rover just drives across the moon
      const v = visibleRect(); // the roads run to both edges of the screen
      ctx.fillStyle = '#5d5a66'; ctx.fillRect(v.x - 2, r.top + 20, v.w + 4, r.bottom - r.top - 20);
      ctx.fillStyle = '#fff3a6'; for (let x = 20 - Math.ceil((20 - v.x) / 160) * 160; x < v.x + v.w; x += 160) ctx.fillRect(x, (r.top + r.bottom) / 2 + 6, 90, 10);
    }
  }
  renderParticles(ctx) {
    if (!this.particles.length) return;
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.kind === 'z') { ctx.fillStyle = '#5a3a73'; ctx.font = `900 ${p.size}px ui-rounded, system-ui`; ctx.textAlign = 'center'; ctx.fillText('z', p.x, p.y); }
      else if (p.kind === 'bubble') { ctx.strokeStyle = '#ffffffdd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = p.kind === 'flame' ? (p.size > 18 ? '#ffb43a' : '#ff6a2a') : '#c98b4c'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.kind === 'flame' ? p.life / p.max : 0.5), 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  sizeButtonSpots() {
    const o = this.sizeButtons?.o; if (!o) return [];
    const b = this.box(o), y = clamp(b.y + b.h / 2, 170, 1000);
    let l = b.x - SIZE_R - 14, r = b.x + b.w + SIZE_R + 14;
    if (l < SIZE_R + 10) { l = r; r = l + SIZE_R * 2 + 20; } if (r > 1910 - SIZE_R) { r = l; l = r - SIZE_R * 2 - 20; }
    return [{ dir: -1, x: l, y }, { dir: 1, x: r, y }];
  }
  sizeButtonAt(x, y) { return this.sizeButtonSpots().find(c => (x - c.x) ** 2 + (y - c.y) ** 2 <= (SIZE_R + 16) ** 2)?.dir ?? null; }
  renderSizeButtons(ctx) {
    const o = this.sizeButtons.o;
    for (const c of this.sizeButtonSpots()) {
      const limit = c.dir > 0 ? o.size >= SIZE_MAX - 1e-6 : o.size <= SIZE_MIN + 1e-6, R = SIZE_R * (this.sizePress === c.dir ? 0.9 : 1);
      ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(c.x, c.y, R + 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = limit ? '#b9b2c4' : c.dir > 0 ? '#66bd62' : '#4d8ee8'; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(c.x - R * 0.55, c.y - R * 0.13, R * 1.1, R * 0.26, R * 0.13); ctx.fill();
      if (c.dir > 0) { ctx.beginPath(); ctx.roundRect(c.x - R * 0.13, c.y - R * 0.55, R * 0.26, R * 1.1, R * 0.13); ctx.fill(); }
    }
  }

  handlePointer(e) {
    const onHome = (e.x - HOME_BUTTON.x) ** 2 + (e.y - HOME_BUTTON.y) ** 2 <= (HOME_BUTTON.r + 30) ** 2;
    if (e.type === 'down') {
      if (this.sizeButtons) { const dir = this.sizeButtonAt(e.x, e.y); if (dir) { this.sizePress = dir; return; } this.sizeButtons = null; }
      if (onHome) { this.pressed = 'home'; return; }
      const o = this.objectAt(e.x, e.y); if (!o) return;
      this.press = { o, x: e.x, y: e.y, t: 0, held: false, moved: false, ox: o.x - e.x, oy: o.y - e.y };
      return;
    }
    if (e.type === 'move') {
      if (this.pressed === 'home' && !onHome) this.pressed = null;
      const p = this.press; if (!p) return;
      if (!p.moved && Math.hypot(e.x - p.x, e.y - p.y) > DRAG_START) { p.moved = true; this.drag = p.o; this.sizeButtons = null; p.o.anim = null; p.o.hidden = false; p.o.drive = null; this.game.audio?.playCue?.('grab'); }
      if (p.moved) { p.o.x = clamp(e.x + p.ox, 40, 1880); p.o.y = clamp(e.y + p.oy, 120, 1075); }
      return;
    }
    if (this.sizePress) { const dir = this.sizePress; this.sizePress = null; if (e.type === 'up' && this.sizeButtonAt(e.x, e.y) === dir && this.sizeButtons) { this.sizeButtons.t = SIZE_BUTTONS_SECONDS; this.resize(this.sizeButtons.o, dir); } return; }
    if (this.pressed === 'home') { this.pressed = null; if (e.type === 'up' && onHome) { this.game.audio?.playCue?.('back'); this.game.scenes.change('worldHub', { world: this.world }); } return; }
    const p = this.press; this.press = null; if (!p) return;
    if (p.moved) { this.drag = null; this.game.audio?.playCue?.('drop'); this.drop(p.o); return; }
    if (p.held) { this.sizeButtons = { o: p.o, t: SIZE_BUTTONS_SECONDS }; return; }
    if (e.type === 'up') this.tap(p.o);
  }
  resize(o, dir) {
    const next = clamp(o.size * (dir > 0 ? SIZE_STEP : 1 / SIZE_STEP), SIZE_MIN, SIZE_MAX);
    if (Math.abs(next - o.size) < 1e-6) { this.game.audio?.playCue?.('tap'); return; }
    o.size = Math.abs(next - 1) < 0.02 ? 1 : next; this.settle(o); this.play(o, 'bounce'); this.game.audio?.playCue?.('pop'); this.save(o);
  }
}
