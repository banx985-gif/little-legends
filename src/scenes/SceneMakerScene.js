// Job 19 step 3: the sticker book's scene maker. Pick any background, then drop in any character or thing from the same
// sticker tray as the colouring studio (Job 17); move them, tap one for its + and − size buttons, drag one to the bin to
// take it away. Saved to MY PICTURES (kind 'scene'), and opened again from there to keep playing. Free in every version.
// - The picture keeps its own 16:9 shape (page units 1920×1080), centred, with the tray on the left edge of the safe area
//   and home / save / bin on the right edge (Job 20).
// Cheap tablets: at most MAX_THINGS pictures in a scene, drawn straight from the small cut-outs; no extra layers.
import { drawArt, art } from '../core/art.js';
import { drawHomeButton, HOME_BUTTON } from '../utils/draw.js';
import { fillScreen, pinX } from '../render/screen.js';
import { drawBackgroundOnly } from '../activities/activityDraw.js';
import { TRAY_GROUPS } from './ColouringScene.js';
import { SIZE_MIN, SIZE_MAX, SIZE_STEP } from '../island/islandPlay.js';
import { makeCanvas } from '../colouring/Painting.js';

export const MAX_THINGS = 30;
// The drawn worlds join the picture backgrounds (Dino Valley, the forest… have no single picture yet).
export const DRAWN_BACKGROUNDS = ['theme:meadow', 'theme:dino', 'theme:forest', 'theme:rainbow', 'theme:jungle', 'theme:storybook', 'theme:life', 'theme:space'];
const PIC_W = 1920, PIC_H = 1080; // the picture's own units (it is not the screen)
const PAGE = { x: 470, y: 70, w: 1280, h: 720 }, K = PAGE.w / PIC_W;
const BOX = 240; // page units across for a thing of size 1
const trayX = () => pinX(24);
const tabSpot = i => ({ x: trayX() + 70, y: 130 + i * 150, r: 58 });
const cellSpot = i => ({ x: trayX() + 215 + (i % 2) * 140, y: 130 + Math.floor(i / 2) * 150, r: 64 });
const PER_PAGE = 8, arrowSpot = d => ({ x: trayX() + (d < 0 ? 215 : 355), y: 760, r: 50 });
const HOME = () => ({ x: pinX(1830), y: 100, r: 72 }), SAVE = () => ({ x: pinX(1830), y: 300, r: 64 }), NEWBG = () => ({ x: pinX(1830), y: 480, r: 58 }), BIN = () => ({ x: pinX(1830), y: 700, r: 70 });
// Background picker grid.
const GRID_PER = 12, gridCell = i => ({ x: 170 + (i % 4) * 410, y: 210 + Math.floor(i / 4) * 260, w: 360, h: 203 }), gridArrow = d => ({ x: pinX(d < 0 ? 70 : 1850), y: 520, r: 56 });
const inCircle = (e, c, pad = 12) => (e.x - c.x) ** 2 + (e.y - c.y) ** 2 <= (c.r + pad) ** 2;
const inBox = (e, b) => e.x >= b.x && e.x <= b.x + b.w && e.y >= b.y && e.y <= b.y + b.h;
const toPage = e => ({ x: (e.x - PAGE.x) / K, y: (e.y - PAGE.y) / K });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class SceneMakerScene {
  constructor(game) { this.game = game; this.t = 0; }

  async enter(data = {}) {
    this.game.audio?.startWorldMusic?.('calm');
    this.t = 0; this.mode = 'pick'; this.gridPage = 0; this.group = 0; this.page = 0; this.pressed = null; this.drag = null; this.selected = null; this.saved = 0;
    this.bg = null; this.items = []; this.pictureId = null; this.dirty = false; this.dropThumbs(); this.thumbs = new Map();
    if (data.picture) {
      const d = await this.game.save?.loadPicture?.(data.picture, 'data');
      if (d?.bg) { this.bg = d.bg; this.items = (d.items ?? []).filter(i => typeof i?.id === 'string').slice(0, MAX_THINGS).map(i => ({ id: i.id, x: +i.x || 960, y: +i.y || 700, size: clamp(+i.size || 1, SIZE_MIN, SIZE_MAX) })); this.pictureId = data.picture; this.mode = 'make'; }
    }
    if (data.bg) { this.bg = data.bg; this.mode = 'make'; }
    this.game.assets?.loadArt?.([...this.items.map(i => i.id), ...(this.bg && !this.bg.startsWith('theme:') ? [this.bg] : [])]); // backgrounds for the picker load one at a time (thumbFor)
  }
  exit() { if (this.dirty && this.mode === 'make') this.savePicture(); this.dropThumbs(); }
  // Cheap tablets: the picker shows small copies (made once, one per frame), never 12 full-size backgrounds every frame.
  dropThumbs() { for (const c of this.thumbs?.values?.() ?? []) if (c) { c.width = c.height = 0; } this.thumbs = new Map(); }
  thumbFor(bg) {
    if (this.thumbs.has(bg)) return this.thumbs.get(bg);
    if (this.thumbMadeAt === this.t) return null;
    // One full-size background at a time: load it, make its small copy, then let it go again (unless it is the one in use).
    if (!bg.startsWith('theme:')) { if (this.loadingBg && this.loadingBg !== bg) return null; this.loadingBg = bg; if (!art(bg)) return null; }
    this.thumbMadeAt = this.t;
    const c = makeCanvas(360, 203); if (!c?.getContext) { this.thumbs.set(bg, null); return null; }
    const ctx = c.getContext('2d'); ctx.scale(360 / PIC_W, 203 / PIC_H);
    try { if (bg.startsWith('theme:')) drawBackgroundOnly(ctx, bg.slice(6)); else ctx.drawImage(art(bg), 0, 0, PIC_W, PIC_H); } catch {}
    this.thumbs.set(bg, c);
    if (this.loadingBg === bg) { this.loadingBg = null; if (bg !== this.bg) this.game.assets?.release?.(bg); }
    return c;
  }

  backgrounds() {
    const ids = [...(this.game.assets?.artUrls?.keys?.() ?? [])].filter(id => id.startsWith('worlds.backgrounds.') || id === 'art.meadow_picnic_clearing');
    return [...ids, ...DRAWN_BACKGROUNDS.filter(b => b !== 'theme:meadow' || !ids.includes('art.meadow_picnic_clearing'))];
  }
  trayItems() {
    const [, prefixes, skip] = TRAY_GROUPS[this.group];
    return [...(this.game.assets?.artUrls?.keys?.() ?? [])].filter(id => prefixes.some(p => id.startsWith(p)) && !skip.some(s => id.includes(s)));
  }
  chooseBackground(bg) { this.bg = bg; this.mode = 'make'; this.dirty = true; if (!bg.startsWith('theme:')) this.game.assets?.loadArt?.([bg]); this.game.audio?.playCue?.('open'); }

  // ---- things ----
  box(i) { const s = BOX * i.size; return { x: i.x - s / 2, y: i.y - s, w: s, h: s }; } // page units; x, y = middle of the bottom
  itemAt(p) { for (let n = this.items.length - 1; n >= 0; n--) { const b = this.box(this.items[n]); if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return this.items[n]; } return null; }
  add(id, p) {
    if (this.items.length >= MAX_THINGS) { this.game.audio?.playCue?.('tap'); return null; }
    const it = { id, x: clamp(p.x, 40, 1880), y: clamp(p.y + BOX / 2, BOX / 2, 1080), size: 1 };
    this.items.push(it); this.selected = it; this.dirty = true; this.game.audio?.playCue?.('sticker'); this.game.assets?.loadArt?.([id]);
    return it;
  }
  remove(it) { this.items = this.items.filter(x => x !== it); if (this.selected === it) this.selected = null; this.dirty = true; this.game.audio?.playCue?.('whoosh'); }
  resize(it, dir) { const next = clamp(it.size * (dir > 0 ? SIZE_STEP : 1 / SIZE_STEP), SIZE_MIN, SIZE_MAX); if (Math.abs(next - it.size) < 1e-6) { this.game.audio?.playCue?.('tap'); return; } it.size = next; this.dirty = true; this.game.audio?.playCue?.('pop'); }
  sizeSpots() { const it = this.selected; if (!it) return []; const b = this.box(it), y = PAGE.y + (b.y + b.h / 2) * K, l = PAGE.x + b.x * K - 60, r = PAGE.x + (b.x + b.w) * K + 60; return [{ dir: -1, x: Math.max(PAGE.x + 50, l), y, r: 48 }, { dir: 1, x: Math.min(PAGE.x + PAGE.w - 50, r), y, r: 48 }]; }

  // ---- saving: a picture for MY PICTURES, and what's in it so it can be opened again ----
  async savePicture() {
    if (!this.bg) return null;
    this.pictureId ??= `scene_${Date.now().toString(36)}`;
    let thumb = null; const c = makeCanvas(480, 270);
    if (c?.getContext && typeof c.toDataURL === 'function') { try { const ctx = c.getContext('2d'); ctx.scale(480 / 1920, 270 / 1080); this.drawPicture(ctx); thumb = c.toDataURL('image/jpeg', 0.8); } catch { thumb = null; } finally { c.width = c.height = 0; } }
    const ok = await this.game.save?.savePicture?.({ id: this.pictureId, kind: 'scene' }, { thumb, data: { bg: this.bg, items: this.items.map(i => ({ ...i })) } });
    if (ok) { this.dirty = false; this.saved = 2; }
    return ok ? this.pictureId : null;
  }

  update(dt) { this.t += dt; this.saved = Math.max(0, this.saved - dt); }

  // ---- drawing ----
  // The picture itself, in page units (1920×1080).
  drawPicture(ctx) {
    const bg = this.bg;
    if (bg?.startsWith('theme:')) drawBackgroundOnly(ctx, bg.slice(6));
    else { const img = art(bg); if (img) ctx.drawImage(img, 0, 0, 1920, 1080); else { ctx.fillStyle = '#bfe8ff'; ctx.fillRect(0, 0, PIC_W, PIC_H); } }
    for (const it of this.items) { const b = this.box(it); const lifted = this.drag?.item === it ? 1.06 : 1; drawArt(ctx, it.id, it.x, it.y, b.w * lifted, b.h * lifted, { anchor: 'bottom' }); }
  }
  render(ctx) {
    fillScreen(ctx, '#d9f0e4');
    if (this.mode === 'pick') { this.renderPicker(ctx); return; }
    ctx.fillStyle = '#9cc9b0'; ctx.beginPath(); ctx.roundRect(PAGE.x - 10, PAGE.y - 4, PAGE.w + 20, PAGE.h + 20, 26); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(PAGE.x, PAGE.y, PAGE.w, PAGE.h); ctx.clip(); ctx.translate(PAGE.x, PAGE.y); ctx.scale(K, K); this.drawPicture(ctx); ctx.restore();
    if (this.selected && !this.drag) {
      const b = this.box(this.selected); ctx.save(); ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 6; ctx.setLineDash?.([14, 10]); ctx.beginPath(); ctx.roundRect(PAGE.x + b.x * K, PAGE.y + b.y * K, b.w * K, b.h * K, 18); ctx.stroke(); ctx.restore();
      for (const s of this.sizeSpots()) { ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = s.dir > 0 ? '#66bd62' : '#4d8ee8'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 24, s.y - 6, 48, 12); if (s.dir > 0) ctx.fillRect(s.x - 6, s.y - 24, 12, 48); }
    }
    this.renderTray(ctx);
    this.renderButtons(ctx);
    if (this.drag?.fromTray && this.drag.moved) drawArt(ctx, this.drag.id, this.drag.x, this.drag.y, BOX * K, BOX * K);
  }
  roundButton(ctx, c, pressed, colour = '#ffd56f') { const r = c.r * (pressed ? 0.92 : 1); ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(c.x, c.y, r + 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill(); }
  renderButtons(ctx) {
    const h = HOME(); ctx.save(); ctx.translate(h.x - HOME_BUTTON.x, h.y - HOME_BUTTON.y); drawHomeButton(ctx, this.pressed === 'home'); ctx.restore();
    const s = SAVE(); this.roundButton(ctx, s, this.pressed === 'save', '#66bd62'); ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(s.x - 26, s.y + 2); ctx.lineTo(s.x - 6, s.y + 22); ctx.lineTo(s.x + 28, s.y - 20); ctx.stroke(); ctx.restore();
    if (this.saved > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, this.saved); ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.arc(s.x + 50, s.y - 50, 18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    const n = NEWBG(); this.roundButton(ctx, n, this.pressed === 'newbg'); // a little landscape: pick another background
    ctx.save(); ctx.fillStyle = '#7fd0f5'; ctx.beginPath(); ctx.roundRect(n.x - 34, n.y - 26, 68, 52, 10); ctx.fill(); ctx.fillStyle = '#66bd62'; ctx.beginPath(); ctx.moveTo(n.x - 34, n.y + 26); ctx.lineTo(n.x - 8, n.y - 4); ctx.lineTo(n.x + 10, n.y + 12); ctx.lineTo(n.x + 22, n.y + 2); ctx.lineTo(n.x + 34, n.y + 26); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.arc(n.x + 18, n.y - 12, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const b = BIN(), over = this.drag && !this.drag.fromTray && inCircle(this.drag, b, 20); this.roundButton(ctx, b, over, over ? '#f39a45' : '#e5dff0');
    ctx.save(); ctx.fillStyle = '#7a6a8c'; ctx.beginPath(); ctx.roundRect(b.x - 26, b.y - 18, 52, 50, 8); ctx.fill(); ctx.fillRect(b.x - 34, b.y - 32, 68, 10); ctx.fillRect(b.x - 10, b.y - 40, 20, 8); ctx.restore();
  }
  renderTray(ctx) {
    const x = trayX();
    ctx.fillStyle = '#fffdf0e8'; ctx.beginPath(); ctx.roundRect(x, 40, 420, 880, 44); ctx.fill();
    TRAY_GROUPS.forEach(([, prefixes, skip], i) => {
      const c = tabSpot(i), on = this.group === i;
      ctx.fillStyle = on ? '#fff2a8' : '#f1eaf8'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); if (on) { ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 6; ctx.stroke(); }
      const first = [...(this.game.assets?.artUrls?.keys?.() ?? [])].find(id => prefixes.some(p => id.startsWith(p)) && !skip.some(s => id.includes(s)));
      drawArt(ctx, first, c.x, c.y, c.r * 1.5, c.r * 1.5);
    });
    const items = this.trayItems(), pages = Math.max(1, Math.ceil(items.length / PER_PAGE)); this.page = Math.min(this.page, pages - 1);
    items.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((id, i) => { const c = cellSpot(i); ctx.fillStyle = this.pressed === `tray:${id}` ? '#fff2a8' : '#ffffff'; ctx.beginPath(); ctx.roundRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, 26); ctx.fill(); drawArt(ctx, id, c.x, c.y, c.r * 1.7, c.r * 1.7); });
    if (pages > 1) for (const d of [-1, 1]) { const a = arrowSpot(d), on = d < 0 ? this.page > 0 : this.page < pages - 1; ctx.globalAlpha = on ? 1 : 0.35; this.roundButton(ctx, a, this.pressed === `arrow:${d}`); ctx.fillStyle = '#6b3f2b'; ctx.beginPath(); ctx.moveTo(a.x + d * 22, a.y); ctx.lineTo(a.x - d * 14, a.y - 22); ctx.lineTo(a.x - d * 14, a.y + 22); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  }
  renderPicker(ctx) {
    const h = HOME(); ctx.save(); ctx.translate(h.x - HOME_BUTTON.x, h.y - HOME_BUTTON.y); drawHomeButton(ctx, this.pressed === 'home'); ctx.restore();
    ctx.fillStyle = '#3f7a5c'; ctx.textAlign = 'center'; ctx.font = '900 62px ui-rounded, system-ui, sans-serif'; ctx.fillText('Make a scene', 960, 130);
    const list = this.backgrounds(), count = Math.max(1, Math.ceil(list.length / GRID_PER)); this.gridPage = Math.min(this.gridPage, count - 1);
    list.slice(this.gridPage * GRID_PER, (this.gridPage + 1) * GRID_PER).forEach((bg, i) => {
      const c = gridCell(i), k = this.pressed === `bg:${bg}` ? 0.95 : 1;
      ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(k, k); ctx.translate(-c.x - c.w / 2, -c.y - c.h / 2);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(c.x - 10, c.y - 10, c.w + 20, c.h + 20, 24); ctx.fill();
      const thumb = this.thumbFor(bg); if (thumb) ctx.drawImage(thumb, c.x, c.y, c.w, c.h); else { ctx.fillStyle = '#e4eef0'; ctx.fillRect(c.x, c.y, c.w, c.h); }
      ctx.restore();
    });
    if (count > 1) for (const d of [-1, 1]) { const a = gridArrow(d), on = d < 0 ? this.gridPage > 0 : this.gridPage < count - 1; ctx.globalAlpha = on ? 1 : 0.35; this.roundButton(ctx, a, false); ctx.fillStyle = '#6b3f2b'; ctx.beginPath(); ctx.moveTo(a.x + d * 22, a.y); ctx.lineTo(a.x - d * 14, a.y - 22); ctx.lineTo(a.x - d * 14, a.y + 22); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  }

  // ---- touch ----
  controlAt(e) {
    if (inCircle(e, HOME(), 24)) return 'home';
    if (this.mode === 'pick') {
      const list = this.backgrounds().slice(this.gridPage * GRID_PER, (this.gridPage + 1) * GRID_PER);
      for (let i = 0; i < list.length; i++) if (inBox(e, gridCell(i))) return `bg:${list[i]}`;
      for (const d of [-1, 1]) if (inCircle(e, gridArrow(d))) return `grid:${d}`;
      return null;
    }
    if (inCircle(e, SAVE())) return 'save';
    if (inCircle(e, NEWBG())) return 'newbg';
    for (const s of this.sizeSpots()) if (inCircle(e, s, 10)) return `size:${s.dir}`;
    for (let i = 0; i < TRAY_GROUPS.length; i++) if (inCircle(e, tabSpot(i), 6)) return `group:${i}`;
    const items = this.trayItems().slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    for (let i = 0; i < items.length; i++) if (inCircle(e, cellSpot(i), 4)) return `tray:${items[i]}`;
    for (const d of [-1, 1]) if (inCircle(e, arrowSpot(d))) return `arrow:${d}`;
    if (inBox(e, PAGE)) { const it = this.itemAt(toPage(e)); if (it) return 'item'; return 'page'; }
    return null;
  }
  handlePointer(e) {
    if (e.type === 'down') {
      const c = this.controlAt(e); this.pressed = c;
      if (c?.startsWith('tray:')) this.drag = { fromTray: true, id: c.slice(5), x: e.x, y: e.y, sx: e.x, sy: e.y, moved: false };
      if (c === 'item') { const p = toPage(e), it = this.itemAt(p); this.drag = { item: it, ox: it.x - p.x, oy: it.y - p.y, x: e.x, y: e.y, sx: e.x, sy: e.y, moved: false }; this.items = [...this.items.filter(x => x !== it), it]; }
      return;
    }
    if (e.type === 'move') {
      const d = this.drag; if (!d) return;
      d.x = e.x; d.y = e.y;
      if (!d.moved && Math.hypot(e.x - d.sx, e.y - d.sy) > 24) { d.moved = true; this.selected = null; this.game.audio?.playCue?.('grab'); }
      if (d.moved && d.item) { const p = toPage(e); d.item.x = clamp(p.x + d.ox, -100, 2020); d.item.y = clamp(p.y + d.oy, 60, 1180); this.dirty = true; }
      return;
    }
    const pressed = this.pressed, d = this.drag; this.pressed = null; this.drag = null;
    if (e.type !== 'up') return;
    if (d?.fromTray) { if (d.moved && inBox(e, PAGE)) this.add(d.id, toPage(e)); else if (!d.moved) this.add(d.id, { x: 960, y: 600 }); else this.game.audio?.playCue?.('drop'); return; } // a tap drops it in the middle
    if (d?.item) {
      if (!d.moved) { this.selected = this.selected === d.item ? null : d.item; this.game.audio?.playCue?.('tap'); return; }
      if (inCircle(e, BIN(), 20) || !inBox(e, { x: PAGE.x - 80, y: PAGE.y - 80, w: PAGE.w + 160, h: PAGE.h + 160 })) { this.remove(d.item); return; }
      d.item.x = clamp(d.item.x, 20, 1900); d.item.y = clamp(d.item.y, 80, 1080); this.game.audio?.playCue?.('drop'); return;
    }
    const now = this.controlAt(e); if (!pressed || now !== pressed) return;
    if (pressed === 'home') { this.game.audio?.playCue?.('back'); this.game.scenes.change('collection', { tab: 'pictures' }); return; }
    if (pressed.startsWith('bg:')) { this.chooseBackground(pressed.slice(3)); return; }
    if (pressed.startsWith('grid:')) { const n = Math.ceil(this.backgrounds().length / GRID_PER); this.gridPage = clamp(this.gridPage + Number(pressed.slice(5)), 0, n - 1); this.game.audio?.playCue?.('page'); return; }
    if (pressed === 'save') { this.savePicture(); this.game.audio?.playCue?.('reward'); return; }
    if (pressed === 'newbg') { this.mode = 'pick'; this.selected = null; this.game.audio?.playCue?.('page'); return; }
    if (pressed.startsWith('size:')) { if (this.selected) this.resize(this.selected, Number(pressed.slice(5))); return; }
    if (pressed.startsWith('group:')) { this.group = Number(pressed.slice(6)); this.page = 0; this.game.audio?.playCue?.('tab'); return; }
    if (pressed.startsWith('arrow:')) { const n = Math.ceil(this.trayItems().length / PER_PAGE); this.page = clamp(this.page + Number(pressed.slice(6)), 0, n - 1); this.game.audio?.playCue?.('page'); return; }
    if (pressed === 'page') this.selected = null;
  }
}
