// Job 17: the colouring studio. Made for 2–5 year olds: no reading, big targets, nothing lost by accident.
// - Page picker: big thumbnails (a sparkle on pages this child hasn't opened yet; their saved colouring shows on the thumbnail).
// - Painting: tools down the left, 12 colours along the bottom, home / save / undo / redo / clear (hold) / sizes down the right.
//   The bucket is the first tool (instant results for the youngest). Paint goes under the black lines; stickers go on top.
// - Stickers: the game's own small pictures, dragged from a tray; moved, or held for the + and − buttons (as on the island).
// - Saved per child on this tablet (SaveSystem "My Pictures"); home saves by itself before leaving.
// Cheap tablets: see src/colouring/Painting.js. Drawing happens once per frame (finger points are queued), and the big
// canvases are let go when the studio closes.
import { drawHomeButton, HOME_BUTTON } from '../utils/draw.js';
import { drawArt, lookupArt } from '../core/art.js';
import { Painting, makeCanvas } from '../colouring/Painting.js';
import { COLOURS, STAMPS, PAGE_W, PAGE_H, fileImage, fileState, releaseFiles, toolImage, pageUrl, probePage, drawTestPage, drawStampShape } from '../colouring/pages.js';
import { SIZE_MIN, SIZE_MAX, SIZE_STEP, HOLD_SECONDS, SIZE_BUTTONS_SECONDS, DRAG_START } from '../island/islandPlay.js';

const PAGE = { x: 200, y: 24, w: 1520, h: 855 }; // the page on screen (16:9)
const S = PAGE.w / PAGE_W;
const TOOLS = [['bucket', 'tool_bucket'], ['texta', 'tool_texter'], ['brush', 'tool_paintbrush'], ['rainbow', 'tool_rainbow_brush'], ['eraser', 'tool_eraser'], ['stamp', 'tool_stamp'], ['sticker', 'tool_sticker']];
const toolSpot = i => ({ x: 100, y: 82 + i * 134, r: 62 });
const colourSpot = i => ({ x: 268 + i * 125, y: 985, r: 50 });
const RIGHT = { home: { x: 1820, y: 82, r: 66 }, save: { x: 1820, y: 225, r: 62 }, undo: { x: 1820, y: 365, r: 54 }, redo: { x: 1820, y: 490, r: 54 }, clear: { x: 1820, y: 625, r: 56 } };
const sizeSpot = i => ({ x: 1820, y: 765 + i * 100, r: 46 });
const SIZE_DOTS = [12, 22, 34];
const SIZED = new Set(['texta', 'brush', 'rainbow', 'eraser', 'stamp']);
const CLEAR_HOLD = 1.2;
const STAMP_PANEL = { x: 200, y: 24, w: 160, h: 855 }, stampSpot = i => ({ x: 280, y: 100 + i * 140, r: 62 });
const STICKER_BOX = 220; // page units across for a sticker of size 1
// The sticker tray: picture groups from the art manifest (no backgrounds, no rare dragons).
const TRAY = { x: 200, y: 24, w: 800, h: 855 };
const TRAY_GROUPS = [
  ['animals', ['creatures.'], ['creatures.dragons.']],
  ['characters', ['characters.pip.', 'characters.explorer.'], ['_face_']],
  ['food', ['objects.food.', 'objects.picnic.'], []],
  ['things', ['objects.play.', 'objects.vehicles.', 'objects.music.', 'objects.space.', 'objects.weather.', 'objects.dino.', 'objects.hats.', 'objects.town.'], ['.road_works.']],
  ['decor', ['worlds.island_decor.', 'worlds.flowers.', 'worlds.nature.', 'worlds.decor.', 'worlds.seasons.'], []]
];
const trayTab = i => ({ x: 290 + i * 150, y: 95, r: 62 });
const trayCell = i => ({ x: 305 + (i % 4) * 190, y: 265 + Math.floor(i / 4) * 190, r: 85 });
const TRAY_PER = 12, trayArrow = d => ({ x: d < 0 ? 330 : 870, y: 805, r: 52 });
// Page picker grid.
const GRID_PER = 12, gridCell = i => ({ x: 140 + (i % 4) * 420, y: 200 + Math.floor(i / 4) * 270, w: 380, h: 214 });
const gridArrow = d => ({ x: d < 0 ? 66 : 1854, y: 520, r: 56 });
const inCircle = (e, c, pad = 14) => (e.x - c.x) ** 2 + (e.y - c.y) ** 2 <= (c.r + pad) ** 2;
const inRect = (e, r) => e.x >= r.x && e.x <= r.x + r.w && e.y >= r.y && e.y <= r.y + r.h;
const onPage = e => inRect(e, PAGE);
const toPage = e => ({ x: (e.x - PAGE.x) / S, y: (e.y - PAGE.y) / S });

export class ColouringScene {
  constructor(game) { this.game = game; this.pages = []; this.mode = 'picker'; this.t = 0; }

  async enter(data = {}) {
    this.game.audio?.startWorldMusic?.('calm');
    this.t = 0; this.mode = 'picker'; this.pressed = null; this.gridPage = 0; this.thumbs = new Map(); this.thumbQueue = null;
    this.painting = null; this.page = null; this.sparkles = [];
    this.pages = await this.loadPages();
    this.refreshShown();
    this.findRealPages();
    if (data.page && this.pages.some(p => p.id === data.page)) await this.open(this.pages.find(p => p.id === data.page));
  }

  exit() { this.closePainting(); this.thumbs = new Map(); releaseFiles(); }

  async loadPages() {
    let data = null;
    try { data = await this.game.assets?.load?.({ id: 'colouring-pages', type: 'json', url: './data/colouring.json' }); } catch {}
    if (!data?.pages && typeof fetch === 'function' && globalThis.location?.protocol !== 'file:') { try { data = await (await fetch('./data/colouring.json')).json(); } catch {} }
    return (data?.pages ?? []).map(p => ({ ...p, real: false }));
  }
  // Pages to show: Aaron's picture is there, or there is a code-drawn test page for it.
  refreshShown() { this.shown = this.pages.filter(p => p.real || p.test); }
  // Looks for each page's picture once (one at a time, so a cheap tablet isn't swamped); found ones swap in.
  async findRealPages() {
    for (const p of this.pages) {
      if (await probePage(p.id)) { p.real = true; this.refreshShown(); this.thumbs.delete(p.id); }
      if (this.game.scenes?.current && this.game.scenes.current !== this) return;
    }
  }
  savedPictures() { return new Map((this.game.save?.listPictures?.() ?? []).filter(p => p.kind === 'colouring').map(p => [p.page, p])); }
  seen() { return new Set(this.game.save?.getProfileState?.()?.colouring?.seen ?? []); }

  // ---- thumbnails (only the ones on screen; made one per frame) ----
  thumbFor(page) {
    const have = this.thumbs.get(page.id);
    if (have) return have.img ?? have.canvas ?? null;
    if (!this.thumbQueue) this.thumbQueue = page;
    return null;
  }
  makeThumb(page) {
    const saved = this.savedPictures().get(page.id);
    if (saved) {
      const entry = { img: null }; this.thumbs.set(page.id, entry);
      Promise.resolve(this.game.save?.loadPicture?.(saved.id, 'thumb')).then(url => {
        if (!url || typeof Image !== 'function') { this.thumbs.delete(page.id); this.thumbs.set(page.id, this.pageThumb(page) ?? { canvas: null }); return; }
        const img = new Image(); img.onload = () => { entry.img = img; }; img.src = url;
      });
      return true;
    }
    const thumb = this.pageThumb(page);
    if (thumb) this.thumbs.set(page.id, thumb);
    return Boolean(thumb);
  }
  pageThumb(page) {
    if (page.real) {
      const url = pageUrl(page.id), img = fileImage(url);
      if (!img) { if (fileState(url) === 'missing') { page.real = false; this.refreshShown(); } return null; }
      const canvas = makeCanvas(384, 216); canvas?.getContext('2d').drawImage(img, 0, 0, 384, 216);
      return { canvas };
    }
    const canvas = makeCanvas(384, 216); if (!canvas) return { canvas: null };
    const c = canvas.getContext('2d'); c.scale(384 / PAGE_W, 216 / PAGE_H); drawTestPage(c, page.test);
    return { canvas };
  }

  // ---- opening a page ----
  async open(page) {
    this.closePainting();
    this.mode = 'paint'; this.page = page; this.loading = true;
    this.tool = 'bucket'; this.colour = COLOURS[0][1]; this.colourBounce = 0.4; this.size = 1; this.stampShape = 'star';
    this.stampPanel = false; this.trayOpen = false; this.trayGroup = 0; this.trayPage = 0;
    this.pending = []; this.drawing = false; this.markerLeft = 0; this.clearHold = 0; this.sizeButtons = null; this.press = null; this.carry = null;
    const painting = new Painting(this.game.canvasFactory ? { canvas: this.game.canvasFactory } : {}); this.painting = painting; // canvasFactory: tests in Node
    this.game.save?.markColouringSeen?.(page.id);
    const source = page.real ? await this.waitForPage(page) : (c => drawTestPage(c, page.test));
    if (this.painting !== painting) return;
    painting.setPage(source ?? (c => drawTestPage(c, page.test)));
    const saved = this.savedPictures().get(page.id);
    if (saved) {
      const data = await this.game.save?.loadPicture?.(saved.id, 'data');
      if (this.painting !== painting) return;
      if (data?.paint) await new Promise(resolve => this.imageFrom(data.paint, img => { painting.loadPaint(img); resolve(); }));
      if (Array.isArray(data?.stickers)) painting.stickers = data.stickers.filter(s => typeof s?.art === 'string').map(s => ({ art: s.art, x: +s.x || 0, y: +s.y || 0, size: Math.min(SIZE_MAX, Math.max(SIZE_MIN, +s.size || 1)) }));
    }
    // The page's own picture is no longer needed once its lines are read.
    if (page.real) releaseFiles();
    this.loading = false;
  }
  waitForPage(page) {
    const url = pageUrl(page.id);
    return new Promise(resolve => {
      const check = () => { const img = fileImage(url); if (img || fileState(url) === 'missing') resolve(img); else setTimeout(check, 50); };
      check();
    });
  }
  imageFrom(value, done) {
    if (typeof Image !== 'function') { done(null); return; }
    const blob = typeof Blob === 'function' && value instanceof Blob, url = blob ? URL.createObjectURL(value) : value;
    const img = new Image();
    img.onload = () => { done(img); if (blob) URL.revokeObjectURL(url); };
    img.onerror = () => { done(null); if (blob) URL.revokeObjectURL(url); };
    img.src = url;
  }
  closePainting() { this.painting?.dispose(); this.painting = null; this.page = null; }

  // ---- saving ----
  drawSticker(ctx, s) { drawArt(ctx, s.art, s.x, s.y, STICKER_BOX * s.size, STICKER_BOX * s.size); }
  async savePicture({ sparkle = true } = {}) {
    const p = this.painting, page = this.page;
    if (!p || !page || this.saving || this.loading) return false;
    this.saving = true;
    try {
      const thumb = p.thumbnail((c, s) => this.drawSticker(c, s));
      const paint = await p.paintImage();
      const ok = await this.game.save?.savePicture?.({ id: `colour_${page.id}`, kind: 'colouring', page: page.id }, { thumb, data: { paint, stickers: p.stickers.map(s => ({ ...s })) } });
      if (ok) { p.dirty = false; this.thumbs.delete(page.id); }
      if (sparkle) { this.game.audio?.playCue?.('sparkle'); this.burst(RIGHT.save.x, RIGHT.save.y, 14); }
      return Boolean(ok);
    } finally { this.saving = false; }
  }
  async goHome() {
    if (this.mode === 'paint') {
      this.game.audio?.playCue?.('back');
      if (this.painting?.dirty) await this.savePicture({ sparkle: false });
      this.closePainting(); this.mode = 'picker'; return;
    }
    this.game.audio?.playCue?.('back');
    this.game.scenes.change('island');
  }

  burst(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 260; this.sparkles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.8, max: 0.8, size: 10 + Math.random() * 12 }); } }

  // ---- update ----
  update(dt) {
    this.t += dt;
    for (const s of this.sparkles) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; }
    this.sparkles = this.sparkles.filter(s => s.life > 0);
    if (this.mode === 'picker') { if (this.thumbQueue) { const q = this.thumbQueue; this.thumbQueue = null; this.makeThumb(q); } return; }
    this.colourBounce = Math.max(0, this.colourBounce - dt);
    this.flushStroke();
    if (this.clearHolding) { this.clearHold += dt; if (this.clearHold >= CLEAR_HOLD) { this.clearHolding = false; this.clearHold = 0; this.painting?.clear(); this.game.audio?.playCue?.('whoosh'); this.burst(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2, 18); } }
    if (this.press && !this.press.held) { this.press.t += dt; if (this.press.t >= HOLD_SECONDS) { this.press.held = true; this.sizeButtons = { s: this.press.s, t: SIZE_BUTTONS_SECONDS }; this.game.audio?.playCue?.('pop'); } }
    if (this.sizeButtons && !this.press) { this.sizeButtons.t -= dt; if (this.sizeButtons.t <= 0) this.sizeButtons = null; }
  }

  // Finger points queued since the last frame are drawn now (drawing never runs faster than the frame rate).
  flushStroke() {
    if (!this.pending?.length || !this.painting) return;
    let moved = 0, last = this.lastPoint;
    for (const pt of this.pending) { this.painting.strokeTo(pt.x, pt.y); if (last) moved += Math.hypot(pt.x - last.x, pt.y - last.y); last = pt; }
    this.lastPoint = last; this.pending.length = 0;
    this.markerLeft -= moved;
    if (this.markerLeft <= 0) { this.markerLeft = 320; this.game.audio?.playCue?.('whoosh', { gain: 0.22 }); } // a soft marker sound while drawing
  }
  // The tablet is put away mid-picture: keep it.
  onHidden() { if (this.mode === 'paint' && this.painting?.dirty) this.savePicture({ sparkle: false }); }

  // ---- drawing ----
  render(ctx) {
    ctx.fillStyle = '#fde7c4'; ctx.fillRect(0, 0, 1920, 1080);
    if (this.mode === 'picker') this.renderPicker(ctx); else this.renderPaint(ctx);
    if (this.sparkles.length) { ctx.save(); for (const s of this.sparkles) { ctx.globalAlpha = Math.max(0, s.life / s.max); ctx.fillStyle = '#ffe36b'; star(ctx, s.x, s.y, s.size); } ctx.restore(); }
  }

  renderPicker(ctx) {
    drawHomeButton(ctx, this.pressed === 'home');
    ctx.fillStyle = '#7a4a96'; ctx.textAlign = 'center'; ctx.font = '900 64px ui-rounded, system-ui, sans-serif'; ctx.fillText('Colouring', 960, 120);
    const pages = this.shown ?? [], count = Math.max(1, Math.ceil(pages.length / GRID_PER)); this.gridPage = Math.min(this.gridPage, count - 1);
    const saved = this.savedPictures(), seen = this.seen();
    pages.slice(this.gridPage * GRID_PER, (this.gridPage + 1) * GRID_PER).forEach((page, i) => {
      const c = gridCell(i), pressed = this.pressed === `page:${page.id}`, k = pressed ? 0.95 : 1;
      ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(k, k); ctx.translate(-c.x - c.w / 2, -c.y - c.h / 2);
      ctx.fillStyle = '#c99a6b'; ctx.beginPath(); ctx.roundRect(c.x - 6, c.y + 2, c.w + 12, c.h + 12, 26); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(c.x - 10, c.y - 10, c.w + 20, c.h + 20, 26); ctx.fill();
      const thumb = this.thumbFor(page);
      if (thumb) ctx.drawImage(thumb, c.x, c.y, c.w, c.h); else { ctx.fillStyle = '#f2ece4'; ctx.fillRect(c.x, c.y, c.w, c.h); }
      if (saved.has(page.id)) { ctx.fillStyle = '#66bd62'; ctx.beginPath(); ctx.arc(c.x + c.w - 6, c.y + c.h - 6, 30, 0, Math.PI * 2); ctx.fill(); tick(ctx, c.x + c.w - 6, c.y + c.h - 6, 30); }
      if (!seen.has(page.id)) { const p = 1 + Math.sin(this.t * 5 + i) * 0.15; ctx.fillStyle = '#ffd21f'; star(ctx, c.x + c.w - 8, c.y + 8, 34 * p); ctx.fillStyle = '#fff6b0'; star(ctx, c.x + c.w - 40, c.y + 30, 14 * p); }
      ctx.restore();
    });
    if (count > 1) for (const d of [-1, 1]) { const a = gridArrow(d), on = d < 0 ? this.gridPage > 0 : this.gridPage < count - 1; ctx.globalAlpha = on ? 1 : 0.35; roundButton(ctx, a, '#fffdf0'); arrow(ctx, a.x, a.y, a.r * 0.6, d); ctx.globalAlpha = 1; }
  }

  renderPaint(ctx) {
    const p = this.painting;
    ctx.fillStyle = '#c99a6b'; ctx.beginPath(); ctx.roundRect(PAGE.x - 8, PAGE.y + 6, PAGE.w + 16, PAGE.h + 16, 24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(PAGE.x, PAGE.y, PAGE.w, PAGE.h);
    if (p && !this.loading) {
      ctx.drawImage(p.paint, PAGE.x, PAGE.y, PAGE.w, PAGE.h);
      ctx.drawImage(p.lines, PAGE.x, PAGE.y, PAGE.w, PAGE.h);
      ctx.save(); ctx.beginPath(); ctx.rect(PAGE.x, PAGE.y, PAGE.w, PAGE.h); ctx.clip(); ctx.translate(PAGE.x, PAGE.y); ctx.scale(S, S);
      for (const s of p.stickers) { const lift = this.press?.s === s || this.sizeButtons?.s === s ? 1.06 : 1; ctx.save(); ctx.translate(s.x, s.y); ctx.scale(lift, lift); this.drawSticker(ctx, { ...s, x: 0, y: 0 }); ctx.restore(); }
      ctx.restore();
    } else { ctx.fillStyle = '#c9b8d8'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 3 + i)); ctx.beginPath(); ctx.arc(900 + i * 60, 450, 18, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
    // Tools.
    TOOLS.forEach(([id, art], i) => {
      const c = toolSpot(i), on = this.tool === id, k = (this.pressed === `tool:${id}` ? 0.92 : 1) * (on ? 1.08 : 1);
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(k, k);
      ctx.fillStyle = on ? '#fff2a8' : '#fffdf0'; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
      if (on) { ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 8; ctx.stroke(); }
      const img = toolImage(art);
      if (img) ctx.drawImage(img, -c.r * 0.8, -c.r * 0.8, c.r * 1.6, c.r * 1.6);
      else drawToolIcon(ctx, id, c.r * 0.8, this.colour, id === 'stamp' ? this.stampShape : null);
      ctx.restore();
    });
    // Colours.
    COLOURS.forEach(([name, hex], i) => {
      const c = colourSpot(i), on = this.colour === hex, b = on ? 1 + Math.sin((0.4 - this.colourBounce) * 24) * this.colourBounce * 0.6 : 1, k = (on ? 1.15 : 1) * b * (this.pressed === `colour:${i}` ? 0.92 : 1);
      ctx.save(); ctx.translate(c.x, on ? c.y - 8 : c.y); ctx.scale(k, k);
      if (on) { ctx.strokeStyle = '#7a4a96'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, c.r + 12, 0, Math.PI * 2); ctx.stroke(); }
      const img = toolImage(`colour_dot_${name}`);
      if (img) ctx.drawImage(img, -c.r, -c.r, c.r * 2, c.r * 2);
      else { ctx.fillStyle = hex; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = name === 'white' ? '#b7a9c4' : '#00000022'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#ffffff66'; ctx.beginPath(); ctx.arc(-c.r * 0.3, -c.r * 0.3, c.r * 0.28, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    // Right column.
    const homeK = this.pressed === 'home' ? 0.92 : 1;
    ctx.save(); ctx.translate(RIGHT.home.x, RIGHT.home.y); ctx.scale(homeK, homeK); roundButton(ctx, { x: 0, y: 0, r: RIGHT.home.r }, '#fffdf0');
    const homeImg = toolImage('tool_home'); if (homeImg) ctx.drawImage(homeImg, -52, -52, 104, 104); else if (!drawArt(ctx, lookupArt('ui', 'homeButton'), 0, 0, 140, 140) && !drawArt(ctx, lookupArt('ui', 'home'), 0, 0, 90, 90)) house(ctx, 0, 0, 40);
    ctx.restore();
    this.sideButton(ctx, 'save', 'tool_save', (c, r) => { ctx.fillStyle = '#66bd62'; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.8, 0, Math.PI * 2); ctx.fill(); tick(ctx, c.x, c.y, r * 0.8); }, true);
    this.sideButton(ctx, 'undo', 'tool_undo', (c, r) => curlyArrow(ctx, c.x, c.y, r * 0.6, -1), p?.canUndo());
    this.sideButton(ctx, 'redo', 'tool_redo', (c, r) => curlyArrow(ctx, c.x, c.y, r * 0.6, 1), p?.canRedo());
    this.sideButton(ctx, 'clear', 'tool_clear', (c, r) => bin(ctx, c.x, c.y, r * 0.55), true);
    if (this.clearHolding) { const c = RIGHT.clear; ctx.strokeStyle = '#e8323c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.clearHold / CLEAR_HOLD)); ctx.stroke(); }
    const sized = SIZED.has(this.tool);
    SIZE_DOTS.forEach((d, i) => {
      const c = sizeSpot(i), on = sized && this.size === i;
      ctx.globalAlpha = sized ? 1 : 0.35; roundButton(ctx, c, on ? '#fff2a8' : '#fffdf0');
      if (on) { ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke(); }
      const img = toolImage(['size_small', 'size_medium', 'size_large'][i]);
      if (img) ctx.drawImage(img, c.x - c.r * 0.8, c.y - c.r * 0.8, c.r * 1.6, c.r * 1.6); else { ctx.fillStyle = this.tool === 'eraser' ? '#b7a9c4' : this.colour === '#ffffff' ? '#d9d0e2' : this.colour; ctx.beginPath(); ctx.arc(c.x, c.y, d, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    if (this.stampPanel) this.renderStampPanel(ctx);
    if (this.trayOpen) this.renderTray(ctx);
    if (this.sizeButtons) this.renderSizeButtons(ctx);
    if (this.carry) { ctx.save(); ctx.globalAlpha = 0.9; drawArt(ctx, this.carry.art, this.carry.x, this.carry.y, STICKER_BOX * S * 1.05, STICKER_BOX * S * 1.05); ctx.restore(); }
  }
  sideButton(ctx, id, art, drawn, enabled) {
    const c = RIGHT[id], k = this.pressed === id ? 0.92 : 1;
    ctx.save(); ctx.globalAlpha = enabled ? 1 : 0.35; ctx.translate(c.x, c.y); ctx.scale(k, k); ctx.translate(-c.x, -c.y);
    roundButton(ctx, c, '#fffdf0');
    const img = toolImage(art);
    if (img) ctx.drawImage(img, c.x - c.r * 0.8, c.y - c.r * 0.8, c.r * 1.6, c.r * 1.6); else drawn(c, c.r);
    ctx.restore();
  }
  renderStampPanel(ctx) {
    ctx.fillStyle = '#fffdf0ee'; ctx.beginPath(); ctx.roundRect(STAMP_PANEL.x, STAMP_PANEL.y, STAMP_PANEL.w, STAMP_PANEL.h, 30); ctx.fill();
    STAMPS.forEach((shape, i) => {
      const c = stampSpot(i), on = this.stampShape === shape;
      roundButton(ctx, c, on ? '#fff2a8' : '#ffffff');
      if (on) { ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke(); }
      const img = toolImage(`stamp_${shape}`);
      ctx.save();
      if (img) { const t = tinted(img, this.colour, 96); if (t) ctx.drawImage(t, c.x - 48, c.y - 48, 96, 96); }
      else { ctx.fillStyle = this.colour === '#ffffff' ? '#d9d0e2' : this.colour; drawStampShape(ctx, shape, c.x, c.y, 96); }
      ctx.restore();
    });
  }
  trayItems() {
    const [, prefixes, skip] = TRAY_GROUPS[this.trayGroup];
    const ids = [...(this.game.assets?.artUrls?.keys?.() ?? [])];
    return ids.filter(id => prefixes.some(p => id.startsWith(p)) && !skip.some(s => id.includes(s)));
  }
  renderTray(ctx) {
    ctx.fillStyle = '#fffdf0f2'; ctx.beginPath(); ctx.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 34); ctx.fill();
    ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 6; ctx.stroke();
    TRAY_GROUPS.forEach(([, prefixes, skip], i) => {
      const c = trayTab(i), on = this.trayGroup === i;
      roundButton(ctx, c, on ? '#fff2a8' : '#f4eefa');
      if (on) { ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke(); }
      const first = [...(this.game.assets?.artUrls?.keys?.() ?? [])].find(id => prefixes.some(p => id.startsWith(p)) && !skip.some(s => id.includes(s)));
      drawArt(ctx, first, c.x, c.y, c.r * 1.5, c.r * 1.5);
    });
    const items = this.trayItems(), pages = Math.max(1, Math.ceil(items.length / TRAY_PER)); this.trayPage = Math.min(this.trayPage, pages - 1);
    items.slice(this.trayPage * TRAY_PER, (this.trayPage + 1) * TRAY_PER).forEach((id, i) => {
      const c = trayCell(i);
      ctx.fillStyle = this.pressed === `tray:${id}` ? '#fff2a8' : '#ffffff'; ctx.beginPath(); ctx.roundRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, 28); ctx.fill();
      if (!drawArt(ctx, id, c.x, c.y, c.r * 1.7, c.r * 1.7)) { ctx.fillStyle = '#eee6f4'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 0.5, 0, Math.PI * 2); ctx.fill(); }
    });
    if (pages > 1) for (const d of [-1, 1]) { const a = trayArrow(d), on = d < 0 ? this.trayPage > 0 : this.trayPage < pages - 1; ctx.globalAlpha = on ? 1 : 0.35; roundButton(ctx, a, '#fff2a8'); arrow(ctx, a.x, a.y, a.r * 0.6, d); ctx.globalAlpha = 1; }
  }
  // + and − beside a held sticker (Job 15 pattern): big round buttons, no words.
  sizeButtonSpots() {
    const s = this.sizeButtons?.s; if (!s) return [];
    const half = (STICKER_BOX * s.size * S) / 2, cx = PAGE.x + s.x * S, cy = Math.min(Math.max(PAGE.y + s.y * S, 120), 840), R = 58;
    let l = cx - half - R - 14, r = cx + half + R + 14;
    if (l < PAGE.x + R) { l = r; r = l + R * 2 + 20; } if (r > PAGE.x + PAGE.w - R) { r = l; l = r - R * 2 - 20; }
    return [{ dir: -1, x: l, y: cy, r: R }, { dir: 1, x: r, y: cy, r: R }];
  }
  renderSizeButtons(ctx) {
    const s = this.sizeButtons.s;
    for (const c of this.sizeButtonSpots()) {
      const limit = c.dir > 0 ? s.size >= SIZE_MAX - 1e-6 : s.size <= SIZE_MIN + 1e-6, R = c.r * (this.pressed === `size:${c.dir}` ? 0.9 : 1);
      ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(c.x, c.y, R + 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = limit ? '#b9b2c4' : c.dir > 0 ? '#66bd62' : '#4d8ee8'; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(c.x - R * 0.55, c.y - R * 0.13, R * 1.1, R * 0.26, R * 0.13); ctx.fill();
      if (c.dir > 0) { ctx.beginPath(); ctx.roundRect(c.x - R * 0.13, c.y - R * 0.55, R * 0.26, R * 1.1, R * 0.13); ctx.fill(); }
    }
  }

  // ---- input ----
  controlAt(e) {
    if (this.mode === 'picker') {
      if ((e.x - HOME_BUTTON.x) ** 2 + (e.y - HOME_BUTTON.y) ** 2 <= (HOME_BUTTON.r + 30) ** 2) return 'home';
      for (const d of [-1, 1]) if (inCircle(e, gridArrow(d), 20)) return d < 0 ? 'gridPrev' : 'gridNext';
      const list = (this.shown ?? []).slice(this.gridPage * GRID_PER, (this.gridPage + 1) * GRID_PER);
      for (let i = 0; i < list.length; i++) { const c = gridCell(i); if (inRect(e, { x: c.x - 14, y: c.y - 14, w: c.w + 28, h: c.h + 28 })) return `page:${list[i].id}`; }
      return null;
    }
    if (this.sizeButtons) { const b = this.sizeButtonSpots().find(c => inCircle(e, c, 16)); if (b) return `size:${b.dir}`; }
    for (const [id, c] of Object.entries(RIGHT)) if (inCircle(e, c)) return id;
    for (let i = 0; i < 3; i++) if (inCircle(e, sizeSpot(i), 6)) return `brushSize:${i}`;
    for (let i = 0; i < TOOLS.length; i++) if (inCircle(e, toolSpot(i), 4)) return `tool:${TOOLS[i][0]}`;
    for (let i = 0; i < COLOURS.length; i++) if (inCircle(e, colourSpot(i), 10)) return `colour:${i}`;
    if (this.trayOpen && inRect(e, TRAY)) {
      for (let i = 0; i < TRAY_GROUPS.length; i++) if (inCircle(e, trayTab(i), 6)) return `trayGroup:${i}`;
      for (const d of [-1, 1]) if (inCircle(e, trayArrow(d), 10)) return d < 0 ? 'trayPrev' : 'trayNext';
      const items = this.trayItems().slice(this.trayPage * TRAY_PER, (this.trayPage + 1) * TRAY_PER);
      for (let i = 0; i < items.length; i++) { const c = trayCell(i); if (Math.abs(e.x - c.x) <= c.r && Math.abs(e.y - c.y) <= c.r) return `tray:${items[i]}`; }
      return 'tray';
    }
    if (this.stampPanel && inRect(e, STAMP_PANEL)) { for (let i = 0; i < STAMPS.length; i++) if (inCircle(e, stampSpot(i), 4)) return `stamp:${STAMPS[i]}`; return 'stampPanel'; }
    return null;
  }
  stickerAt(e) {
    const p = this.painting, pt = toPage(e);
    for (let i = (p?.stickers.length ?? 0) - 1; i >= 0; i--) { const s = p.stickers[i], half = (STICKER_BOX * s.size) / 2 + 10; if (Math.abs(pt.x - s.x) <= half && Math.abs(pt.y - s.y) <= half) return s; }
    return null;
  }

  handlePointer(e) {
    if (this.mode === 'picker') {
      const control = this.controlAt(e);
      if (e.type === 'down') { this.pressed = control; return; }
      if (e.type === 'move') { if (this.pressed && this.pressed !== control) this.pressed = null; return; }
      const chosen = e.type === 'up' && control && control === this.pressed ? control : null; this.pressed = null;
      if (chosen) this.pickerAction(chosen);
      return;
    }
    if (this.loading) return;
    if (e.type === 'down') this.down(e); else if (e.type === 'move') this.move(e); else this.up(e);
  }
  pickerAction(control) {
    if (control === 'home') { this.goHome(); return; }
    const pages = Math.max(1, Math.ceil((this.shown?.length ?? 0) / GRID_PER));
    if (control === 'gridPrev' || control === 'gridNext') { const next = Math.max(0, Math.min(pages - 1, this.gridPage + (control === 'gridNext' ? 1 : -1))); if (next !== this.gridPage) { this.gridPage = next; this.thumbs = new Map(); this.game.audio?.playCue?.('page'); } return; }
    if (control.startsWith('page:')) { const page = this.pages.find(p => p.id === control.slice(5)); if (page) { this.game.audio?.playCue?.('open'); this.open(page); } }
  }

  down(e) {
    const control = this.controlAt(e);
    if (control?.startsWith('tray:')) { this.carry = { art: control.slice(5), x: e.x, y: e.y, from: { x: e.x, y: e.y }, moved: false }; this.game.audio?.playCue?.('sticker'); return; }
    if (control === 'clear') { this.pressed = 'clear'; this.clearHolding = true; this.clearHold = 0; return; }
    if (control) { this.pressed = control; return; }
    if (this.trayOpen || this.stampPanel) { this.trayOpen = false; this.stampPanel = false; if (!onPage(e)) return; }
    if (!onPage(e) || !this.painting) return;
    const pt = toPage(e);
    this.sizeButtons = null;
    if (this.tool === 'sticker') {
      const s = this.stickerAt(e);
      if (s) { this.press = { s, t: 0, held: false, x: e.x, y: e.y, ox: s.x - pt.x, oy: s.y - pt.y, before: this.painting.stickers.map(v => ({ ...v })), moved: false }; this.game.audio?.playCue?.('grab'); }
      else { this.trayOpen = true; this.game.audio?.playCue?.('open'); }
      return;
    }
    if (this.tool === 'bucket') { if (this.painting.fill(pt.x, pt.y, this.colour) != null) this.game.audio?.playCue?.('pop'); return; }
    if (this.tool === 'stamp') { this.painting.stamp(this.stampShape, this.colour, this.size, pt.x, pt.y, toolImage(`stamp_${this.stampShape}`)); this.game.audio?.playCue?.('drop'); return; }
    this.painting.beginStroke(this.tool, this.colour, this.size, pt.x, pt.y);
    this.drawing = true; this.lastPoint = pt; this.markerLeft = 0; this.pending.length = 0;
  }
  move(e) {
    if (this.carry) { this.carry.x = e.x; this.carry.y = e.y; if (Math.hypot(e.x - this.carry.from.x, e.y - this.carry.from.y) > DRAG_START) { this.carry.moved = true; if (!inRect(e, TRAY)) this.trayOpen = false; } return; }
    if (this.drawing) { const pt = toPage(e), last = this.pending.at(-1) ?? this.lastPoint; if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) >= 2) this.pending.push(pt); return; }
    if (this.press) {
      const pr = this.press;
      if (!pr.moved && Math.hypot(e.x - pr.x, e.y - pr.y) > DRAG_START) { pr.moved = true; pr.held = true; this.sizeButtons = null; }
      if (pr.moved) { const pt = toPage(e); pr.s.x = pt.x + pr.ox; pr.s.y = pt.y + pr.oy; }
      return;
    }
    if (this.pressed === 'clear' && !inCircle(e, RIGHT.clear)) { this.clearHolding = false; this.clearHold = 0; this.pressed = null; return; }
    if (this.pressed && this.pressed !== this.controlAt(e)) this.pressed = null;
  }
  up(e) {
    if (this.carry) {
      const c = this.carry; this.carry = null;
      const place = c.moved ? onPage(e) && !(this.trayOpen && inRect(e, TRAY)) : true;
      if (place && this.painting) {
        const pt = c.moved ? toPage(e) : { x: PAGE_W / 2 + (Math.random() - 0.5) * 300, y: PAGE_H / 2 + (Math.random() - 0.5) * 200 };
        const before = this.painting.stickers.map(v => ({ ...v }));
        this.painting.stickers.push({ art: c.art, x: pt.x, y: pt.y, size: 1 }); this.painting.stickersChanged(before);
        this.trayOpen = false; this.game.audio?.playCue?.('snap');
      }
      return;
    }
    if (this.drawing) { this.drawing = false; this.flushStroke(); this.painting?.endStroke(); return; }
    if (this.press) {
      const pr = this.press; this.press = null;
      if (pr.moved) {
        if (e.type === 'up' && !onPage(e)) { this.painting.stickers = this.painting.stickers.filter(s => s !== pr.s); this.game.audio?.playCue?.('whoosh'); } // dragged off the page: gone (undo brings it back)
        else this.game.audio?.playCue?.('drop');
        this.painting.stickersChanged(pr.before);
      } else if (pr.held) this.sizeButtons = { s: pr.s, t: SIZE_BUTTONS_SECONDS };
      return;
    }
    const pressed = this.pressed, control = this.controlAt(e); this.pressed = null;
    if (pressed === 'clear') { this.clearHolding = false; this.clearHold = 0; return; }
    if (e.type === 'up' && pressed && pressed === control) this.paintAction(pressed);
  }
  paintAction(control) {
    const p = this.painting;
    if (control === 'home') { this.goHome(); return; }
    if (control === 'save') { this.savePicture(); return; }
    if (control === 'undo') { if (p?.undo()) this.game.audio?.playCue?.('tap'); this.sizeButtons = null; return; }
    if (control === 'redo') { if (p?.redo()) this.game.audio?.playCue?.('tap'); this.sizeButtons = null; return; }
    if (control.startsWith('brushSize:')) { if (SIZED.has(this.tool)) { this.size = Number(control.slice(10)); this.game.audio?.playCue?.('tap'); } return; }
    if (control.startsWith('colour:')) { this.colour = COLOURS[Number(control.slice(7))][1]; this.colourBounce = 0.4; this.game.audio?.playCue?.('tap'); if (this.tool === 'eraser' || this.tool === 'sticker') this.tool = 'texta'; this.trayOpen = false; return; }
    if (control.startsWith('tool:')) {
      const tool = control.slice(5), again = this.tool === tool;
      this.tool = tool; this.game.audio?.playCue?.('tab'); this.sizeButtons = null;
      this.stampPanel = tool === 'stamp' && (again ? !this.stampPanel : true);
      this.trayOpen = tool === 'sticker' && (again ? !this.trayOpen : true);
      return;
    }
    if (control.startsWith('stamp:')) { this.stampShape = control.slice(6); this.stampPanel = false; this.game.audio?.playCue?.('tap'); return; }
    if (control.startsWith('trayGroup:')) { this.trayGroup = Number(control.slice(10)); this.trayPage = 0; this.game.audio?.playCue?.('tab'); return; }
    if (control === 'trayPrev' || control === 'trayNext') { this.trayPage = Math.max(0, this.trayPage + (control === 'trayNext' ? 1 : -1)); this.game.audio?.playCue?.('page'); return; }
    if (control.startsWith('size:') && this.sizeButtons) {
      const s = this.sizeButtons.s, dir = Number(control.slice(5)), next = Math.min(SIZE_MAX, Math.max(SIZE_MIN, s.size * (dir > 0 ? SIZE_STEP : 1 / SIZE_STEP)));
      this.sizeButtons.t = SIZE_BUTTONS_SECONDS;
      if (Math.abs(next - s.size) < 1e-6) { this.game.audio?.playCue?.('tap'); return; }
      const before = p.stickers.map(v => ({ ...v })); s.size = Math.abs(next - 1) < 0.02 ? 1 : next; p.stickersChanged(before); this.game.audio?.playCue?.('pop');
    }
  }
}

// ---- drawn placeholders (until the tool pictures arrive) ----
function roundButton(ctx, c, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); }
function star(ctx, x, y, s) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.45 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
function tick(ctx, x, y, r) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.35); ctx.lineTo(x + r * 0.5, y - r * 0.35); ctx.stroke(); ctx.restore(); }
function arrow(ctx, x, y, s, d) { ctx.fillStyle = '#7a4a96'; ctx.beginPath(); ctx.moveTo(x + d * s, y); ctx.lineTo(x - d * s * 0.5, y - s * 0.9); ctx.lineTo(x - d * s * 0.5, y + s * 0.9); ctx.closePath(); ctx.fill(); }
// Undo (d −1): an arc over the top ending on the left with the arrow head pointing down; redo is its mirror.
function curlyArrow(ctx, x, y, s, d) {
  const cy = y + s * 0.25, r = s * 0.7, end = x + d * r;
  ctx.save(); ctx.strokeStyle = '#4d8ee8'; ctx.fillStyle = '#4d8ee8'; ctx.lineWidth = s * 0.3; ctx.lineCap = 'round';
  ctx.beginPath(); if (d < 0) ctx.arc(x, cy, r, Math.PI * 0.15, Math.PI, true); else ctx.arc(x, cy, r, Math.PI * 0.85, 0, false); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(end - s * 0.42, cy - s * 0.05); ctx.lineTo(end + s * 0.42, cy - s * 0.05); ctx.lineTo(end, cy + s * 0.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function bin(ctx, x, y, s) { ctx.save(); ctx.fillStyle = '#8a7aa0'; ctx.beginPath(); ctx.roundRect(x - s * 0.8, y - s * 0.55, s * 1.6, s * 1.5, s * 0.2); ctx.fill(); ctx.beginPath(); ctx.roundRect(x - s, y - s * 0.95, s * 2, s * 0.3, s * 0.12); ctx.fill(); ctx.fillRect(x - s * 0.3, y - s * 1.2, s * 0.6, s * 0.3); ctx.fillStyle = '#fffdf0'; for (const dx of [-0.4, 0, 0.4]) ctx.fillRect(x + dx * s - s * 0.07, y - s * 0.3, s * 0.14, s * 1.0); ctx.restore(); }
function house(ctx, x, y, s) { ctx.save(); ctx.fillStyle = '#e8323c'; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f2b632'; ctx.fillRect(x - s * 0.7, y, s * 1.4, s * 0.9); ctx.restore(); }
const tintCache = new Map();
function tinted(img, colour, size) {
  const key = `${img.src}|${colour}`; if (tintCache.has(key)) return tintCache.get(key);
  const cv = makeCanvas(size, size); if (!cv) return null; const t = cv.getContext('2d');
  t.drawImage(img, 0, 0, size, size); t.globalCompositeOperation = 'source-in'; t.fillStyle = colour; t.fillRect(0, 0, size, size);
  if (tintCache.size > 40) tintCache.clear(); tintCache.set(key, cv); return cv;
}
function drawToolIcon(ctx, id, s, colour, stampShape) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const paint = colour === '#ffffff' ? '#d9d0e2' : colour;
  if (id === 'bucket') {
    ctx.fillStyle = '#9aa7b8'; ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.3); ctx.lineTo(s * 0.55, -s * 0.3); ctx.lineTo(s * 0.42, s * 0.75); ctx.lineTo(-s * 0.42, s * 0.75); ctx.closePath(); ctx.fill();
    ctx.fillStyle = paint; ctx.beginPath(); ctx.ellipse(0, -s * 0.3, s * 0.55, s * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.3); ctx.quadraticCurveTo(s * 0.75, -s * 0.1, s * 0.62, s * 0.35); ctx.quadraticCurveTo(s * 0.5, s * 0.05, s * 0.2, -s * 0.2); ctx.fill();
    ctx.strokeStyle = '#6d7a8c'; ctx.lineWidth = s * 0.1; ctx.beginPath(); ctx.arc(0, -s * 0.35, s * 0.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (id === 'texta' || id === 'brush' || id === 'rainbow') {
    ctx.rotate(-Math.PI / 4);
    if (id === 'texta') { ctx.fillStyle = paint; ctx.beginPath(); ctx.roundRect(-s * 0.22, -s * 0.55, s * 0.44, s * 1.25, s * 0.12); ctx.fill(); ctx.fillStyle = '#fffdf0'; ctx.fillRect(-s * 0.22, -s * 0.2, s * 0.44, s * 0.18); ctx.fillStyle = paint; ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.55); ctx.lineTo(0, -s * 0.85); ctx.lineTo(s * 0.16, -s * 0.55); ctx.fill(); }
    else {
      ctx.fillStyle = '#c98b4c'; ctx.beginPath(); ctx.roundRect(-s * 0.1, -s * 0.15, s * 0.2, s * 0.95, s * 0.08); ctx.fill(); ctx.fillStyle = '#b7c0cc'; ctx.fillRect(-s * 0.15, -s * 0.32, s * 0.3, s * 0.2);
      if (id === 'rainbow') { ['#e8323c', '#ffd51f', '#7fd14b', '#2457d6'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-s * 0.09 + i * s * 0.06, -s * 0.55, s * 0.07, s * 0.26, 0, 0, Math.PI * 2); ctx.fill(); }); }
      else { ctx.fillStyle = paint; ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * 0.32); ctx.quadraticCurveTo(-s * 0.18, -s * 0.7, 0, -s * 0.88); ctx.quadraticCurveTo(s * 0.18, -s * 0.7, s * 0.15, -s * 0.32); ctx.fill(); }
    }
  } else if (id === 'eraser') {
    ctx.rotate(-Math.PI / 6); ctx.fillStyle = '#ff9eb8'; ctx.beginPath(); ctx.roundRect(-s * 0.7, -s * 0.32, s * 1.4, s * 0.64, s * 0.14); ctx.fill(); ctx.fillStyle = '#5cc8f5'; ctx.fillRect(s * 0.1, -s * 0.32, s * 0.3, s * 0.64);
  } else if (id === 'stamp') {
    ctx.fillStyle = '#c98b4c'; ctx.beginPath(); ctx.roundRect(-s * 0.2, -s * 0.8, s * 0.4, s * 0.6, s * 0.15); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -s * 0.85, s * 0.32, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a7aa0'; ctx.fillRect(-s * 0.6, -s * 0.22, s * 1.2, s * 0.3); ctx.fillStyle = paint; drawStampShape(ctx, stampShape ?? 'star', 0, s * 0.45, s * 0.75);
  } else if (id === 'sticker') {
    ctx.fillStyle = '#ffd21f'; star(ctx, 0, 0, s * 0.85); ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.moveTo(s * 0.25, s * 0.55); ctx.lineTo(s * 0.7, s * 0.1); ctx.lineTo(s * 0.68, s * 0.6); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
