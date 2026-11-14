// Job 19 step 2: Pip's dress-up room. The Job 09 wardrobe as a game: drag (or tap) a look onto Pip, see him in the
// mirror, and take a photo with the camera button (it goes into the Collection's MY PICTURES, the sticker book).
// - Every wardrobe look can be tried on here; this is play, so it doesn't change the looks Pip wears elsewhere
//   (those are still earned in the Collection). The room's own outfit is saved per child (state.dressUp).
// - Free version: the basics (the first 3 looks of each kind, plus any the child has earned); the rest sleep behind a
//   padlock and Pip says "Ask a grown-up!". Full wardrobe with the unlock.
// - Built to the Job 20 rules: the background covers the screen, the tray and buttons sit at the safe area's edges.
// Cheap tablets: one Pip and his mirror image; tray pictures are the small cut-outs already used by the Collection.
import { drawArt, lookupArt } from '../core/art.js';
import { drawHomeButton, HOME_BUTTON } from '../utils/draw.js';
import { fillScreen, drawCovered, pinX, pinY, screen } from '../render/screen.js';
import { PipController } from '../characters/PipController.js';
import { LOOK_TABS, lookTab, lookArt, toggleLook, wornLooks, wornRewards } from '../characters/Wardrobe.js';
import { AskGrownUp, drawSleepy } from '../ui/AskGrownUp.js';
import { makeCanvas } from '../colouring/Painting.js';

export const FREE_PER_TAB = 3;
const PIP = { x: 930, y: 960, scale: 1.55 }, PIP_BOX = { x: 650, y: 380, w: 560, h: 620 };
const MIRROR = { x: 1270, y: 250, w: 360, h: 660 };
const PER_PAGE = 8;
// The tray (left edge of the safe area): kinds down its left, looks in two columns, page arrows at the bottom.
const trayX = () => pinX(24);
const tabSpot = i => ({ x: trayX() + 70, y: 120 + i * 150, r: 58 });
const cellSpot = i => ({ x: trayX() + 215 + (i % 2) * 140, y: 130 + Math.floor(i / 2) * 150, r: 64 });
const arrowSpot = d => ({ x: trayX() + (d < 0 ? 215 : 355), y: 760, r: 50 });
// Right edge: home, camera, take everything off (the wardrobe tray has the top-left corner here).
const HOME = () => ({ x: pinX(1830), y: pinY(100), r: 72 });
const CAMERA = () => ({ x: pinX(1830), y: 330, r: 74 });
const CLEAR = () => ({ x: pinX(1830), y: 520, r: 62 });
const inCircle = (e, c, pad = 12) => (e.x - c.x) ** 2 + (e.y - c.y) ** 2 <= (c.r + pad) ** 2;
const inBox = (e, b) => e.x >= b.x && e.x <= b.x + b.w && e.y >= b.y && e.y <= b.y + b.h;

export class DressUpScene {
  constructor(game) { this.game = game; this.t = 0; this.tab = 0; this.page = 0; }

  enter() {
    this.game.audio?.startWorldMusic?.('calm');
    this.t = 0; this.drag = null; this.pressed = null; this.flash = 0; this.saved = 0;
    this.ask = new AskGrownUp(this.game, { bubble: { x: 560, y: 700 } });
    this.outfit = { worn: { ...(this.game.save?.getProfileState?.()?.dressUp?.worn ?? {}) } };
    this.pip = new PipController({ x: PIP.x, y: PIP.y, scale: PIP.scale, looks: this.wearing() });
    this.mirrorPip = new PipController({ x: 0, y: 0, scale: 0.92, looks: this.wearing() });
    this.loadTab();
  }

  // Cheap tablets: only the open kind's pictures (and what Pip wears) are loaded, not the whole wardrobe at once.
  loadTab() { const ids = [...this.tabLooks(), ...this.wearing()].map(r => lookArt(r.id)); for (let i = 0; i < LOOK_TABS.length; i++) ids.push(lookArt(this.tabLooks(i)[0]?.id)); this.game.assets?.loadArt?.([...new Set(ids.filter(Boolean))]); }

  // ---- the looks ----
  looks() { return (this.game.rewards?.list?.() ?? []).filter(r => r.type === 'cosmetics' && !r.hidden && lookArt(r.id)); }
  tabLooks(i = this.tab) { const key = LOOK_TABS[i][0]; return this.looks().filter(r => lookTab(r) === key); }
  open(r) {
    if (!this.game.unlock || this.game.unlock.isUnlocked?.()) return true;
    if (this.game.rewards?.isUnlocked?.(r.id)) return true;
    return this.tabLooks(LOOK_TABS.findIndex(([k]) => k === lookTab(r))).slice(0, FREE_PER_TAB).some(x => x.id === r.id);
  }
  // A rewards lookup that knows every look (the room can try on looks not yet earned).
  get all() { const list = this.looks(); return { get: id => list.find(r => r.id === id) ?? null }; }
  wearing() { return wornRewards(this.outfit, this.all); }
  isWorn(id) { return Object.values(wornLooks(this.outfit, this.all)).includes(id); }
  wear(id) {
    const r = this.all.get(id); if (!r) return;
    if (!this.open(r)) { this.ask.show(id); this.game.audio?.playCue?.('tap'); return; }
    const next = toggleLook(this.outfit, this.all, id);
    this.outfit = { worn: next.worn };
    this.refreshPip(next.wearing ? 'celebrate' : 'bounce');
    this.game.audio?.playCue?.(next.wearing ? 'sparkle' : 'pop');
    this.store();
  }
  clearAll() { if (!Object.keys(this.outfit.worn).length) return; this.outfit = { worn: {} }; this.refreshPip('bounce'); this.game.audio?.playCue?.('whoosh'); this.store(); }
  refreshPip(reaction) { const looks = this.wearing(); this.pip.looks = looks; this.mirrorPip.looks = looks; this.pip.react?.(reaction, { duration: 1 }); }
  store() { const worn = { ...this.outfit.worn }; this.saving = Promise.resolve(this.game.save?.mutateProfileState?.(st => { st.dressUp = { worn }; })).catch(() => {}); return this.saving; }

  // ---- the camera: a photo of Pip in the mirror room, into MY PICTURES ----
  async takePhoto() {
    this.flash = 1; this.game.audio?.playCue?.('snap'); this.pip.react?.('celebrate', { duration: 1.4 });
    const id = `photo_${Date.now().toString(36)}`;
    let thumb = null;
    const c = makeCanvas(640, 360);
    if (c?.getContext && typeof c.toDataURL === 'function') {
      const ctx = c.getContext('2d'), old = globalThis.__LL_SCREEN;
      globalThis.__LL_SCREEN = undefined; // the photo is the 1920×1080 room itself, whatever the screen's shape
      try { ctx.scale(640 / 1920, 360 / 1080); this.renderRoom(ctx); thumb = c.toDataURL('image/jpeg', 0.82); } catch { thumb = null; } finally { globalThis.__LL_SCREEN = old; c.width = c.height = 0; }
    }
    const ok = await this.game.save?.savePicture?.({ id, kind: 'photo' }, { thumb, data: { worn: { ...this.outfit.worn } } });
    if (ok) this.saved = 2.2;
    return ok ? id : null;
  }

  update(dt) {
    this.t += dt; this.pip.update(dt); this.mirrorPip.update(dt); this.ask.update(dt);
    this.flash = Math.max(0, this.flash - dt * 2.5); this.saved = Math.max(0, this.saved - dt);
  }

  // ---- drawing ----
  renderRoom(ctx) {
    fillScreen(ctx, '#f6dcea');
    drawCovered(ctx, c => {
      c.fillStyle = '#f9e6f0'; c.fillRect(0, 0, 1920, 760);
      c.fillStyle = '#e9b98a'; c.fillRect(0, 760, 1920, 320);
      c.fillStyle = '#fff3c4aa'; c.beginPath(); c.ellipse(PIP.x, 980, 330, 70, 0, 0, Math.PI * 2); c.fill(); // the spotlight's pool on the floor
      drawArt(c, 'objects.stage.curtain', 1080, 440, 420, 760, { alpha: 0.95 });
      drawArt(c, 'objects.stage.spotlight', 640, 250, 170, 170);
    });
    // The mirror: a frame, the glass, and Pip seen in it (the same looks, the other way round).
    const m = MIRROR;
    ctx.fillStyle = '#c99a6b'; ctx.beginPath(); ctx.roundRect(m.x - 22, m.y - 22, m.w + 44, m.h + 44, 180); ctx.fill();
    ctx.fillStyle = '#dff3fb'; ctx.beginPath(); ctx.roundRect(m.x, m.y, m.w, m.h, 160); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(m.x, m.y, m.w, m.h, 160); ctx.clip();
    ctx.translate(m.x + m.w / 2, m.y + m.h - 40); ctx.scale(-1, 1); this.mirrorPip.render(ctx);
    ctx.fillStyle = '#ffffff55'; ctx.fillRect(-m.w, -m.h, m.w * 2, m.h); // a soft sheen on the glass
    ctx.restore();
    ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.x + 70, m.y + 150); ctx.lineTo(m.x + 140, m.y + 80); ctx.stroke();
    this.pip.render(ctx);
  }
  render(ctx) {
    this.renderRoom(ctx);
    this.renderTray(ctx);
    { const h = HOME(); ctx.save(); ctx.translate(h.x - HOME_BUTTON.x, h.y - HOME_BUTTON.y); drawHomeButton(ctx, this.pressed === 'home'); ctx.restore(); }
    this.roundButton(ctx, CAMERA(), this.pressed === 'camera');
    if (!drawArt(ctx, 'objects.wardrobe.accessories.camera', CAMERA().x, CAMERA().y, 110, 110)) { const c = CAMERA(); ctx.fillStyle = '#5a3a73'; ctx.beginPath(); ctx.roundRect(c.x - 40, c.y - 26, 80, 54, 12); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x, c.y + 2, 17, 0, Math.PI * 2); ctx.fill(); }
    this.roundButton(ctx, CLEAR(), this.pressed === 'clear'); this.drawHanger(ctx, CLEAR());
    if (this.drag?.moved) drawArt(ctx, lookArt(this.drag.id), this.drag.x, this.drag.y, 170, 170);
    if (this.saved > 0) { const c = CAMERA(); ctx.save(); ctx.globalAlpha = Math.min(1, this.saved); ctx.fillStyle = '#66bd62'; ctx.beginPath(); ctx.arc(c.x + 52, c.y - 52, 30, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(c.x + 38, c.y - 52); ctx.lineTo(c.x + 49, c.y - 41); ctx.lineTo(c.x + 67, c.y - 63); ctx.stroke(); ctx.restore(); }
    this.ask.render(ctx);
    if (this.flash > 0) { ctx.save(); ctx.globalAlpha = this.flash * 0.8; fillScreen(ctx, '#ffffff'); ctx.restore(); }
  }
  roundButton(ctx, c, pressed) { const r = c.r * (pressed ? 0.92 : 1); ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(c.x, c.y, r + 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd56f'; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill(); }
  drawHanger(ctx, c) { ctx.save(); ctx.strokeStyle = '#6b3f2b'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.arc(c.x, c.y - 22, 12, Math.PI, Math.PI * 2.4); ctx.moveTo(c.x, c.y - 8); ctx.lineTo(c.x - 38, c.y + 22); ctx.lineTo(c.x + 38, c.y + 22); ctx.closePath(); ctx.stroke(); ctx.restore(); }
  renderTray(ctx) {
    const x = trayX(), s = screen().safe;
    ctx.fillStyle = '#fffdf0e8'; ctx.beginPath(); ctx.roundRect(x, 30, 420, 930, 44); ctx.fill();
    LOOK_TABS.forEach(([key], i) => {
      const c = tabSpot(i), on = this.tab === i;
      ctx.fillStyle = on ? '#fff2a8' : '#f1eaf8'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
      if (on) { ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 6; ctx.stroke(); }
      const first = this.tabLooks(i)[0]; if (first) drawArt(ctx, lookArt(first.id), c.x, c.y, c.r * 1.5, c.r * 1.5);
    });
    const items = this.tabLooks(), pages = Math.max(1, Math.ceil(items.length / PER_PAGE)); this.page = Math.min(this.page, pages - 1);
    items.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((r, i) => {
      const c = cellSpot(i), worn = this.isWorn(r.id), k = this.ask.bounce(r.id);
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(k, k); ctx.translate(-c.x, -c.y);
      ctx.fillStyle = worn ? '#d9f2cf' : this.pressed === `look:${r.id}` ? '#fff2a8' : '#ffffff'; ctx.beginPath(); ctx.roundRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, 26); ctx.fill();
      if (worn) { ctx.strokeStyle = '#66bd62'; ctx.lineWidth = 7; ctx.stroke(); }
      if (this.drag?.moved && this.drag.id === r.id) ctx.globalAlpha = 0.35;
      drawArt(ctx, lookArt(r.id), c.x, c.y, c.r * 1.7, c.r * 1.7);
      ctx.globalAlpha = 1;
      if (!this.open(r)) drawSleepy(ctx, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, 26, this.t + i, lookupArt('ui', 'lock'));
      ctx.restore();
    });
    if (pages > 1) for (const d of [-1, 1]) {
      const a = arrowSpot(d), on = d < 0 ? this.page > 0 : this.page < pages - 1;
      ctx.globalAlpha = on ? 1 : 0.35; this.roundButton(ctx, a, this.pressed === `arrow:${d}`);
      ctx.fillStyle = '#6b3f2b'; ctx.beginPath(); ctx.moveTo(a.x + d * 22, a.y); ctx.lineTo(a.x - d * 14, a.y - 22); ctx.lineTo(a.x - d * 14, a.y + 22); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    return s;
  }

  // ---- touch ----
  controlAt(e) {
    if (inCircle(e, HOME(), 24)) return 'home';
    if (inCircle(e, CAMERA())) return 'camera';
    if (inCircle(e, CLEAR())) return 'clear';
    for (let i = 0; i < LOOK_TABS.length; i++) if (inCircle(e, tabSpot(i), 6)) return `tab:${i}`;
    const items = this.tabLooks().slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    for (let i = 0; i < items.length; i++) if (inCircle(e, cellSpot(i), 4)) return `look:${items[i].id}`;
    for (const d of [-1, 1]) if (inCircle(e, arrowSpot(d))) return `arrow:${d}`;
    if (inBox(e, PIP_BOX)) return 'pip';
    return null;
  }
  handlePointer(e) {
    if (e.type === 'down') {
      const c = this.controlAt(e); this.pressed = c;
      if (c?.startsWith('look:')) this.drag = { id: c.slice(5), x: e.x, y: e.y, sx: e.x, sy: e.y, moved: false };
      return;
    }
    if (e.type === 'move') {
      if (this.drag) { this.drag.x = e.x; this.drag.y = e.y; if (!this.drag.moved && Math.hypot(e.x - this.drag.sx, e.y - this.drag.sy) > 24) { this.drag.moved = true; this.game.audio?.playCue?.('grab'); } }
      return;
    }
    const pressed = this.pressed, drag = this.drag; this.pressed = null; this.drag = null;
    if (e.type !== 'up') return;
    if (drag) { if (!drag.moved || inBox(e, PIP_BOX) || inBox(e, MIRROR)) this.wear(drag.id); else this.game.audio?.playCue?.('drop'); return; } // dropped on Pip (or just tapped): he wears it
    const now = this.controlAt(e); if (!pressed || now !== pressed) return;
    if (pressed === 'home') { this.game.audio?.playCue?.('back'); this.game.scenes.change('island'); return; }
    if (pressed === 'camera') { this.takePhoto(); return; }
    if (pressed === 'clear') { this.clearAll(); return; }
    if (pressed === 'pip') { this.pip.react?.('celebrate', { duration: 1.2 }); this.game.audio?.playCue?.('bounce'); return; }
    if (pressed.startsWith('tab:')) { this.tab = Number(pressed.slice(4)); this.page = 0; this.loadTab(); this.game.audio?.playCue?.('tab'); return; }
    if (pressed.startsWith('arrow:')) { const pages = Math.ceil(this.tabLooks().length / PER_PAGE); this.page = Math.max(0, Math.min(pages - 1, this.page + Number(pressed.slice(6)))); this.game.audio?.playCue?.('page'); }
  }
}
