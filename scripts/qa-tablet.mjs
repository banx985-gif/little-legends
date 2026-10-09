// Tablet play-through (Job 08). Plays every world and every mission start to finish in real Chrome at
// tablet and phone sizes with touch input, screenshots every scene into docs/qa_shots/ (git-ignored),
// and flags: console errors, stuck scenes, text off-screen / overlapping / too small, small buttons and
// tap targets, stretched pictures, and placeholders showing where real art exists.
//
//   npm run qa:tablet                      all four sizes
//   npm run qa:tablet -- --only=ipad_1024  one size (id prefix)
//   npm run qa:tablet -- --worlds=space,town
//
// Needs Google Chrome (or Edge) installed. Uses puppeteer-core, which is already in node_modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer, findChrome, sleep } from './qa-common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const OUT = path.join(root, 'docs', 'qa_shots');

export const VIEWPORTS = [
  { id: 'ipad_1024x768', width: 1024, height: 768, dpr: 2 },
  { id: 'ipad_1180x820', width: 1180, height: 820, dpr: 2 },
  { id: 'android_1280x800', width: 1280, height: 800, dpr: 1.5 },
  { id: 'phone_844x390', width: 844, height: 390, dpr: 3 }
];
const WORLD_ORDER = ['dino', 'rainbow', 'space', 'animal', 'jungle', 'storybook', 'life', 'town'];
// Smallest comfortable finger target, in CSS pixels (Apple 44 pt, Android 48 dp). Little fingers: aim for the larger.
const MIN_TAP_CSS = 48;
const MIN_TEXT_CSS = 11;

// ---------- in-page instrumentation (runs before the game) ----------
function instrument() {
  const QA = window.__QA = { capture: false, rec: null, speaks: [], errors: [] };
  const P = CanvasRenderingContext2D.prototype;
  const fillText = P.fillText, drawImage = P.drawImage, roundRect = P.roundRect, fill = P.fill;
  const box = (ctx, x, y, w, h) => {
    const m = ctx.getTransform();
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), scale: Math.hypot(m.a, m.b) };
  };
  P.fillText = function (text, x, y, maxWidth) {
    if (QA.rec && this.globalAlpha > 0.35 && String(text).trim()) {
      const m = this.measureText(String(text));
      let w = m.width; const squeezed = maxWidth !== undefined && w > maxWidth; if (squeezed) w = maxWidth;
      const a = this.textAlign, left = a === 'center' ? x - w / 2 : (a === 'right' || a === 'end') ? x - w : x;
      const asc = m.actualBoundingBoxAscent || 0, desc = m.actualBoundingBoxDescent || 0;
      const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
      const b = box(this, left, y - asc, w, asc + desc);
      QA.rec.texts.push({ text: String(text), font: this.font, px, squeezed, colour: String(this.fillStyle), ...b });
    }
    return fillText.apply(this, arguments);
  };
  P.drawImage = function (img, ...a) {
    if (QA.rec && this.globalAlpha > 0.2 && img && (img.naturalWidth || img.width)) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      let sw = iw, sh = ih, dx, dy, dw, dh;
      if (a.length === 2) { [dx, dy] = a; dw = iw; dh = ih; }
      else if (a.length === 4) { [dx, dy, dw, dh] = a; }
      else { [, , sw, sh, dx, dy, dw, dh] = a; }
      if (img instanceof HTMLImageElement) {
        const ratio = (dw / dh) / (sw / sh);
        QA.rec.images.push({ src: decodeURIComponent((img.currentSrc || img.src || '').split('/').slice(-2).join('/')), stretch: ratio, ...box(this, dx, dy, dw, dh) });
      }
    }
    return drawImage.call(this, img, ...a);
  };
  // drawCandyButton paints a brown shadow (#b65f24) round rect 18 px under the face: that shape marks a button.
  P.roundRect = function (x, y, w, h) { if (QA.rec) this.__lastRR = [x, y, w, h]; return roundRect.apply(this, arguments); };
  P.fill = function () {
    if (QA.rec && this.__lastRR && String(this.fillStyle).toLowerCase() === '#b65f24') {
      const [x, y, w, h] = this.__lastRR; QA.rec.buttons.push(box(this, x, y - 18, w, h));
    }
    return fill.apply(this, arguments);
  };
  QA.frame = () => new Promise(resolve => {
    const game = window.__littleLegends;
    if (!game) return resolve(null);
    if (!game.__qaWrapped) {
      game.__qaWrapped = true;
      const render = game.render.bind(game);
      game.render = alpha => {
        if (!QA.capture) return render(alpha);
        QA.capture = false;
        const misses = new Set();
        const get = game.assets.get.bind(game.assets);
        game.assets.get = id => { const v = get(id); if (!(v && (v.naturalWidth || v.width)) && game.assets.artUrls?.has(id)) misses.add(id); return v; };
        QA.rec = { texts: [], images: [], buttons: [] };
        try { render(alpha); } finally {
          game.assets.get = get;
          const rec = QA.rec; QA.rec = null;
          const vp = game.viewport;
          rec.vp = { scale: vp.scale, offsetX: vp.offsetX, offsetY: vp.offsetY, dpr: vp.dpr, cssW: vp.cssWidth, cssH: vp.cssHeight };
          rec.misses = [...misses];
          QA.resolve?.(rec); QA.resolve = null;
        }
      };
    }
    QA.resolve = resolve; QA.capture = true;
    setTimeout(() => { if (QA.resolve === resolve) { QA.resolve = null; resolve(null); } }, 3000);
  });
}

// Everything the driver needs to read from the running game.
function pageState() {
  const g = window.__littleLegends; if (!g) return { scene: null };
  const s = g.scenes.current, vp = g.viewport;
  const act = s?.activity;
  return {
    scene: g.scenes.currentName, busy: g.scenes.busy, transitionT: g.scenes.transitionT,
    vp: { scale: vp.scale, ox: vp.offsetX + vp.rectLeft, oy: vp.offsetY + vp.rectTop },
    adventureId: s?.definition?.id ?? null, stepIndex: s?.stepIndex ?? null, steps: s?.definition?.steps?.length ?? null,
    kind: s?.step?.kind ?? null, completedStep: s?.completedStep ?? null, completed: s?.completed ?? null,
    activityId: act?.id ?? null, activityType: act?.definition?.type ?? null, activityDone: act?.completeState ?? null,
    hintLevel: s?.hints?.currentLevel ?? null, errors: g.runtimeErrorCount, celebrate: s?.celebrateReward && (s.celebrateT ?? 99) < 4.6 ? s.celebrateReward : null,
    hatchActive: Boolean(s?.hatch?.ready && !s?.hatch?.finished)
  };
}

// The next correct move for the activity on screen, in game (1920×1080) coordinates.
function nextMove() {
  const s = window.__littleLegends.scenes.current, a = s?.activity; if (!a || a.completeState) return { kind: 'none' };
  const type = a.definition.type;
  const pos = o => ({ x: o.x, y: o.y });
  const dragTo = (token, target) => ({ kind: 'drag', from: pos(token), to: { x: target.x, y: target.y + 35 } });
  const free = t => !t.placed && t.state !== 'snapping' && t.state !== 'returning';
  if (type === 'CountAndPlace') { const t = a.tokens.find(free); return t ? dragTo(t, a.target) : { kind: 'wait' }; }
  if (['DragToTarget', 'ShapeMatch', 'BuildObject', 'PicturePuzzle', 'SortObjects', 'Categorise'].includes(type)) {
    const t = a.tokens.find(free); if (!t) return { kind: 'wait' };
    const target = a.targets.find(x => (!t.targetId || x.id === t.targetId) && a.accepts(x, t)) ?? a.targets.find(x => a.accepts(x, t));
    return target ? dragTo(t, target) : { kind: 'stuck', why: `no target accepts ${t.id}` };
  }
  if (type === 'MatchPairs') {
    if (a.lock > 0) return { kind: 'wait' };
    const sel = a.tokens.find(t => t.selected && !t.matched);
    if (sel) { const mate = a.tokens.find(t => t !== sel && !t.matched && t.pairId === sel.pairId); return mate ? { kind: 'tap', ...pos(mate) } : { kind: 'stuck', why: 'no pair' }; }
    const t = a.tokens.find(x => !x.matched); return t ? { kind: 'tap', ...pos(t) } : { kind: 'wait' };
  }
  if (['TapRequestedObject', 'OddOneOut', 'NumberLine'].includes(type)) {
    const target = a.target(); const t = a.tokens.find(x => !x.found && a.matches(x, target));
    return t ? { kind: 'tap', ...pos(t) } : { kind: 'stuck', why: 'requested object missing' };
  }
  if (type === 'SizeCompare') return { kind: 'tap', ...pos(a.correctToken()) };
  if (['PatternComplete', 'QuantityCompare', 'SoundMatch'].includes(type)) { const c = a.correctChoice(); return c ? { kind: 'tap', ...pos(c) } : { kind: 'stuck', why: 'no correct choice' }; }
  if (['SequenceOrder', 'OrderBySize', 'FollowDirections'].includes(type)) { const t = a.nextToken(); return t ? { kind: 'tap', ...pos(t) } : { kind: 'wait' }; }
  if (type === 'MemoryMatch') {
    if (a.hideTimer > 0) return { kind: 'wait' };
    if (a.first) { const mate = a.cards.find(c => c !== a.first && c.pairId === a.first.pairId && !c.faceUp); return mate ? { kind: 'tap', ...pos(mate) } : { kind: 'wait' }; }
    const c = a.cards.find(x => !x.matched && !x.faceUp); return c ? { kind: 'tap', ...pos(c) } : { kind: 'wait' };
  }
  if (['WashSwipe', 'PaintSwipe'].includes(type)) { const spots = a.spots.filter(x => !x.cleared); return spots.length ? { kind: 'path', points: spots.map(pos) } : { kind: 'wait' }; }
  if (type === 'TracePath') return { kind: 'path', points: a.points.map(pos) };
  if (type === 'RhythmRepeat') return { kind: 'rhythm', x: 960, y: 690, gaps: a.pattern.slice(1).map((v, i) => v - a.pattern[i]) };
  if (['StoryChoice', 'SameDifferent'].includes(type)) { const c = a.choices.find(x => x.correct || x.id === a.definition.correctId) ?? a.choices[0]; return { kind: 'tap', ...pos(c) }; }
  return { kind: 'stuck', why: `no solver for ${type}` };
}

// A move that is wrong on purpose (to check gentle feedback and hints after two misses), or null.
function wrongMove() {
  const s = window.__littleLegends.scenes.current, a = s?.activity; if (!a || a.completeState) return null;
  const type = a.definition.type, pos = o => ({ x: o.x, y: o.y });
  if (['TapRequestedObject', 'OddOneOut', 'NumberLine'].includes(type)) { const target = a.target(); const t = a.tokens.find(x => !x.found && !a.matches(x, target)); return t ? { kind: 'tap', ...pos(t) } : null; }
  if (['PatternComplete', 'QuantityCompare', 'SoundMatch'].includes(type)) { const c = a.correctChoice(); const w = a.choices.find(x => x !== c); return w ? { kind: 'tap', ...pos(w) } : null; }
  if (type === 'SizeCompare') { const c = a.correctToken(); const w = a.tokens.find(x => x !== c); return w ? { kind: 'tap', ...pos(w) } : null; }
  if (['StoryChoice', 'SameDifferent'].includes(type)) { const w = a.choices.find(x => !(x.correct || x.id === a.definition.correctId)); return w && a.choices.some(x => x.correct || x.id === a.definition.correctId) ? { kind: 'tap', ...pos(w) } : null; }
  if (['SortObjects', 'Categorise', 'DragToTarget', 'ShapeMatch'].includes(type)) {
    const t = a.tokens.find(x => !x.placed); if (!t) return null; const w = a.targets.find(x => !a.accepts(x, t));
    return w ? { kind: 'drag', from: pos(t), to: { x: w.x, y: w.y + 35 } } : { kind: 'drag', from: pos(t), to: { x: 960, y: 200 } };
  }
  if (['SequenceOrder', 'OrderBySize', 'FollowDirections'].includes(type)) { const n = a.nextToken(); const w = a.tokens.find(x => !x.placed && x !== n); return w ? { kind: 'tap', ...pos(w) } : null; }
  return null;
}

class Driver {
  constructor(page, vp, log) { this.page = page; this.vp = vp; this.log = log; this.shot = 0; this.findings = []; this.results = []; this.checkedTypes = new Set(); this.toddlerChecks = vp.id.startsWith('ipad_1024'); }
  state() { return this.page.evaluate(pageState); }
  async client(x, y) { const s = await this.state(); return { x: s.vp.ox + x * s.vp.scale, y: s.vp.oy + y * s.vp.scale }; }
  async mark() { this.actionAt = await this.page.evaluate(() => performance.now()); }
  async tap(x, y, hold = 60) {
    await this.mark();
    const p = await this.client(x, y);
    await this.page.touchscreen.touchStart(p.x, p.y); await sleep(hold); await this.page.touchscreen.touchEnd(); await sleep(60);
  }
  async drag(from, to, steps = 10) {
    await this.mark();
    const a = await this.client(from.x, from.y), b = await this.client(to.x, to.y);
    await this.page.touchscreen.touchStart(a.x, a.y); await sleep(50);
    for (let i = 1; i <= steps; i++) { await this.page.touchscreen.touchMove(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps); await sleep(20); }
    await sleep(60); await this.page.touchscreen.touchEnd(); await sleep(60);
  }
  async path(points) {
    await this.mark();
    const pts = []; for (const p of points) pts.push(await this.client(p.x, p.y));
    await this.page.touchscreen.touchStart(pts[0].x, pts[0].y); await sleep(40);
    for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 4; k++) { await this.page.touchscreen.touchMove(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 4, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 4); await sleep(16); }
    await this.page.touchscreen.touchEnd(); await sleep(60);
  }
  async perform(move) {
    if (move.kind === 'tap') await this.tap(move.x, move.y);
    else if (move.kind === 'drag') await this.drag(move.from, move.to);
    else if (move.kind === 'path') await this.path(move.points);
    else if (move.kind === 'rhythm') { await this.tap(move.x, move.y, 30); for (const gap of move.gaps) { await sleep(Math.max(0, gap - 90)); await this.tap(move.x, move.y, 30); } }
    else await sleep(250);
  }
  async settle(min = 350, max = 6000) {
    const t0 = Date.now(); await sleep(min);
    while (Date.now() - t0 < max) { const s = await this.state(); if (s.scene && !s.busy && !(s.transitionT > 0)) return s; await sleep(80); }
    return this.state();
  }
  async waitScene(name, max = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < max) { const s = await this.state(); if (s.scene === name && !s.busy) { await this.settle(); return true; } await sleep(100); }
    return false;
  }
  flag(type, detail, where) { this.findings.push({ viewport: this.vp.id, type, where, detail }); }

  // Screenshot + one instrumented frame, analysed for layout problems.
  async snap(name) {
    const file = `${String(++this.shot).padStart(3, '0')}_${name.replace(/[^a-z0-9_.-]+/gi, '_')}.png`;
    await sleep(120);
    let rec = await this.page.evaluate(() => window.__QA.frame());
    if (rec?.misses?.length) { await sleep(1500); rec = await this.page.evaluate(() => window.__QA.frame()) ?? rec; } // give late pictures a moment
    await this.page.screenshot({ path: path.join(OUT, this.vp.id, file) });
    if (rec) this.analyse(rec, `${name} (${file})`);
    return file;
  }

  analyse(rec, where) {
    const { scale, offsetX, offsetY, dpr } = rec.vp;
    const toDesign = b => ({ x: (b.x / dpr - offsetX) / scale, y: (b.y / dpr - offsetY) / scale, w: b.w / dpr / scale, h: b.h / dpr / scale });
    const texts = rec.texts.map(t => ({ ...t, d: toDesign(t), css: t.px * t.scale / dpr }));
    for (const t of texts) {
      const d = t.d;
      if (d.x < -4 || d.y < -4 || d.x + d.w > 1924 || d.y + d.h > 1084) this.flag('text-off-screen', `"${t.text}" at x ${Math.round(d.x)}..${Math.round(d.x + d.w)}, y ${Math.round(d.y)}..${Math.round(d.y + d.h)}`, where);
      if ([...t.text.trim()].length > 1 && t.css < (where.startsWith('parent_') ? MIN_TEXT_CSS - 1 : MIN_TEXT_CSS)) this.flag('text-too-small', `"${t.text.slice(0, 40)}" is ${t.css.toFixed(1)} css px`, where);
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].d, b = texts[j].d; if (texts[i].text === texts[j].text) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 6 && iy > 6 && ix * iy > 0.25 * Math.min(a.w * a.h, b.w * b.h)) this.flag('text-overlap', `"${texts[i].text.slice(0, 30)}" overlaps "${texts[j].text.slice(0, 30)}"`, where);
    }
    for (const im of rec.images) {
      if (Math.abs(im.stretch - 1) > 0.04) this.flag('image-stretched', `${im.src} drawn ${(im.stretch * 100).toFixed(0)}% of its true width/height ratio`, where);
      const d = toDesign(im);
      if (d.w < 1700 && (d.x < -0.25 * d.w || d.y < -0.25 * d.h || d.x + 0.75 * d.w > 1920 || d.y + 0.75 * d.h > 1080)) this.flag('image-off-screen', `${im.src} at ${Math.round(d.x)},${Math.round(d.y)} size ${Math.round(d.w)}×${Math.round(d.h)}`, where);
    }
    for (const b of rec.buttons) { const d = toDesign(b), css = Math.min(b.w, b.h) / dpr; // Parent-area controls (adults) also get 8 px of spare tap room around the drawn button.
      if (css < (where.startsWith('parent_') ? 36 : MIN_TAP_CSS)) this.flag('button-too-small', `button at ${Math.round(d.x)},${Math.round(d.y)} is ${Math.round(b.w / dpr)}×${Math.round(b.h / dpr)} css px`, where); if (d.x < -2 || d.y < -2 || d.x + d.w > 1922 || d.y + d.h > 1082) this.flag('button-off-screen', `button at ${Math.round(d.x)},${Math.round(d.y)}`, where); }
    for (const id of rec.misses) this.flag('placeholder-art', `${id} exists but was not drawn (placeholder shown)`, where);
  }

  async tapTargets(where) {
    const sizes = await this.page.evaluate(() => {
      const a = window.__littleLegends.scenes.current?.activity; if (!a) return [];
      const list = [...(a.tokens ?? []), ...(a.choices ?? []), ...(a.cards ?? [])].filter(t => !t.placed && !t.found && !t.matched);
      return list.map(t => ({ id: t.id, size: t.size ?? Math.min(t.w ?? 999, t.h ?? 999) }));
    });
    const s = await this.state();
    for (const t of sizes) if (t.size * s.vp.scale < MIN_TAP_CSS) this.flag('tap-target-small', `${t.id} is ${Math.round(t.size * s.vp.scale)} css px (${t.size} game px)`, where);
  }

  // Plays the activity on screen to the end with correct moves.
  async solveActivity(where) {
    const t0 = Date.now(); let moves = 0;
    while (Date.now() - t0 < 45000) {
      const s = await this.state();
      if (s.scene === 'adventure' ? s.completedStep || s.activityDone || s.kind !== 'activity' : s.scene === 'activity' ? s.completed : true) return true;
      const move = await this.page.evaluate(nextMove);
      if (move.kind === 'stuck') { this.flag('stuck', `${s.activityId}: ${move.why}`, where); return false; }
      if (move.kind === 'none') { await sleep(200); continue; }
      await this.perform(move); moves++;
      await sleep(move.kind === 'wait' ? 150 : 380);
      if (moves > 60) break;
    }
    const s = await this.state();
    this.flag('stuck', `${s.activityId} (${s.activityType}) did not finish after ${moves} correct moves`, where);
    return false;
  }

  async playMission(id, world) {
    const where = `${world}/${id}`;
    let lastStep = -1, sameStepTries = 0;
    for (let guard = 0; guard < 80; guard++) {
      let s = await this.state();
      if (s.scene !== 'adventure') return s.scene === 'island';
      if (s.stepIndex !== lastStep) {
        lastStep = s.stepIndex; sameStepTries = 0; this.stepStartAt = (this.actionAt ?? 0) - 50;
        await sleep(650);
        await this.snap(`${world}_${id}_s${s.stepIndex + 1}of${s.steps}_${s.activityId ?? s.kind}`);
        if (s.activityId) await this.tapTargets(`${where} step ${s.stepIndex + 1}`);
        await this.checkSpoken(`${where} step ${s.stepIndex + 1} (${s.activityId ?? s.kind})`, this.stepStartAt);
        if (this.toddlerChecks && s.activityId && !this.checkedTypes.has(s.activityType)) { this.checkedTypes.add(s.activityType); await this.toddlerCheck(`${where} step ${s.stepIndex + 1}`, s); }
      }
      if (++sameStepTries > 12) { this.flag('stuck', `step ${s.stepIndex + 1} (${s.kind}) never moved on`, where); await this.page.evaluate(() => window.__littleLegends.scenes.current.advance()); await this.settle(); continue; }
      s = await this.state();
      if (s.kind === 'activity' && s.activityId && !s.completedStep) { await this.solveActivity(`${where} step ${s.stepIndex + 1}`); await sleep(500); s = await this.state(); }
      if (s.kind === 'size' && !s.completedStep) await this.tap(870, 500);
      else if (s.kind === 'pattern' && !s.completedStep) await this.tap(810, 835);
      else if (s.kind === 'hatch' && !s.completedStep) await this.tap(960, 620);
      else if (s.kind === 'place' && !s.completedStep) await this.tap(990, 700);
      else await this.tap(960, 942); // CONTINUE (also advances after a finished step)
      await sleep(450);
    }
    this.flag('stuck', 'mission never finished', where); return false;
  }

  // The step's instruction must have been spoken (speech synthesis call) since the step began.
  async checkSpoken(where, since) {
    let said = [];
    for (let i = 0; i < 12 && !said.length; i++) { said = await this.page.evaluate(t => window.__QA.speaks.filter(x => x.at >= t).map(x => x.text), since ?? 0); if (!said.length) await sleep(250); }
    if (!said.length) this.flag('not-spoken', 'nothing was said out loud when this step started', where);
    else if (said.some(t => /[{}]|undefined|null/.test(t))) this.flag('bad-voice-line', said.join(' / '), where);
  }

  // Once per activity type: no touch for 9 s must repeat the instruction; two wrong answers must bring a hint.
  async toddlerCheck(where, s) {
    const t0 = await this.page.evaluate(() => performance.now());
    await sleep(9300);
    const again = await this.page.evaluate(t => window.__QA.speaks.filter(x => x.at > t).length, t0);
    if (!again) this.flag('no-idle-repeat', `${s.activityType}: instruction not repeated after 9 s without a touch`, where);
    this.results.push({ check: 'idle-repeat', type: s.activityType, ok: Boolean(again) });
    const before = (await this.state()).hintLevel ?? 0;
    let wrong = 0;
    for (let i = 0; i < 2; i++) { const m = await this.page.evaluate(wrongMove); if (!m) break; await this.perform(m); wrong++; await sleep(700); }
    if (wrong === 2) {
      const after = (await this.state()).hintLevel ?? 0;
      if (after < 3) this.flag('no-miss-hint', `${s.activityType}: hint level ${before} -> ${after} after two wrong answers`, where);
      this.results.push({ check: 'two-miss-hint', type: s.activityType, ok: after >= 3 });
      await sleep(300); await this.snap(`hint_after_two_misses_${s.activityType}`);
    }
  }

  async toIslandIdle() {
    // Let the reward celebration play (tap skips a hatch), then the island is free.
    for (let i = 0; i < 30; i++) { const s = await this.state(); if (s.scene !== 'island') return; if (!s.celebrate) return; if (s.hatchActive) await this.tap(960, 600); await sleep(400); }
  }
}

async function runViewport(browser, vp, base, worlds) {
  const t0 = Date.now();
  fs.mkdirSync(path.join(OUT, vp.id), { recursive: true });
  for (const f of fs.readdirSync(path.join(OUT, vp.id))) fs.rmSync(path.join(OUT, vp.id, f));
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, isMobile: true, hasTouch: true, isLandscape: true });
  await page.evaluateOnNewDocument(instrument);
  const log = [];
  const d = new Driver(page, vp, log);
  page.on('console', m => { if (m.type() === 'error') d.flag('console-error', m.text().slice(0, 300), 'console'); });
  page.on('pageerror', e => d.flag('page-error', String(e?.message ?? e).slice(0, 300), 'page'));
  page.on('requestfailed', r => { if (!r.url().includes('favicon')) d.flag('request-failed', `${r.url().replace(base, '')} ${r.failure()?.errorText ?? ''}`, 'network'); });
  page.on('dialog', async dialog => { const m = dialog.message(); await dialog.accept(m.includes('name') ? 'Mia' : m.includes('age') ? '4' : 'en-AU'); });
  page.on('response', r => { if (r.status() >= 400) d.flag('http-error', `${r.status()} ${r.url().replace(base, '')}`, 'network'); });

  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.evaluate(() => { const g = window.__littleLegends; const speak = g.audio.speak.bind(g.audio); window.__QA.speaks = []; g.audio.speak = (text, o) => { window.__QA.speaks.push({ text, at: performance.now(), scene: g.scenes.currentName }); return speak(text, o); }; });
  await d.waitScene('profile', 15000);
  await d.snap('profile_select_empty');
  // New player: + NEW LEGEND (window.prompt answers come from the dialog handler), pick colour, save.
  await d.tap(560, 435); await sleep(600);
  await d.snap('profile_create');
  await d.tap(830, 530); await d.tap(1160, 870);
  if (!await d.waitScene('island')) d.flag('stuck', 'could not reach the island after making a profile', 'profile');
  await d.snap('island_first_visit');

  for (const world of worlds) {
    // Island -> EXPLORE WORLDS -> world card, every time, like a child would.
    await d.tap(1060, 957);
    if (!await d.waitScene('worldSelect')) { d.flag('stuck', 'EXPLORE WORLDS did not open', 'island'); await page.evaluate(() => window.__littleLegends.scenes.change('worldSelect')); await d.settle(); }
    if (world === WORLD_ORDER[0]) await d.snap('world_select');
    const pos = { dino: [0, 0], rainbow: [1, 0], space: [2, 0], animal: [3, 0], jungle: [0, 1], storybook: [1, 1], life: [2, 1], town: [3, 1] }[world];
    await d.tap(60 + pos[0] * 445 + 210, (pos[1] ? 465 : 215) + 105);
    if (!await d.waitScene('worldHub')) { d.flag('stuck', `${world} card did not open the hub`, 'worldSelect'); continue; }
    await d.snap(`${world}_hub`);
    const missions = await page.evaluate(() => window.__littleLegends.scenes.current.missions.map(m => m.id));
    for (let i = 0; i < missions.length; i++) {
      const s = await d.state();
      if (s.scene !== 'worldHub') {
        if (s.scene === 'island') { await d.tap(1060, 957); await d.waitScene('worldSelect'); await d.tap(60 + pos[0] * 445 + 210, (pos[1] ? 465 : 215) + 105); await d.waitScene('worldHub'); }
        else { await page.evaluate(w => window.__littleLegends.scenes.change('worldHub', { world: w }), world); await d.settle(); }
      }
      for (let p = 0; p < Math.floor(i / 6); p++) { await d.tap(1120, 970); await sleep(250); }
      const slot = i % 6, r = { x: 250 + (slot % 2) * 760, y: 280 + Math.floor(slot / 2) * 220 };
      await d.tap(r.x + 330, r.y + 88);
      if (!await d.waitScene('adventure')) { d.flag('stuck', `mission card ${missions[i]} did not open`, `${world}_hub`); continue; }
      if (d.toddlerChecks && i === 0 && world === worlds[0]) await holdToLeaveCheck(d, world);
      const ok = await d.playMission(missions[i], world);
      if (!ok) { await page.evaluate(() => window.__littleLegends.scenes.change('island')); }
      await d.waitScene('island');
      const st = await d.state();
      if (st.celebrate) { await sleep(900); await d.snap(`${world}_${missions[i]}_reward_on_island`); }
      await d.toIslandIdle();
    }
    // Hub with medals after the world is done.
    await d.tap(1060, 957); await d.waitScene('worldSelect'); await d.tap(60 + pos[0] * 445 + 210, (pos[1] ? 465 : 215) + 105);
    if (await d.waitScene('worldHub')) {
      await d.snap(`${world}_hub_all_done`);
      // Jungle (Job 12): the music Jam is a button on its mission hub.
      if (world === 'jungle') { await d.tap(1640, 972); await playJungle(d); }
      await d.tap(145, 90); await d.waitScene('worldSelect'); await d.tap(145, 90); await d.waitScene('island');
    }
  }

  await d.snap('island_after_all_worlds');
  // Move things mode
  await d.tap(1525, 957); await sleep(400); await d.snap('island_move_things'); await d.tap(1525, 957); await sleep(300);
  // Collection: every tab, then Looks.
  await d.tap(1675, 85);
  if (await d.waitScene('collection')) {
    const tabIds = ['creatures', 'cosmetics', 'decorations', 'buildings', 'seasons', 'vehicles', 'dragons'];
    for (const tab of tabIds) {
      await page.evaluate(t => window.__littleLegends.scenes.change('collection', { tab: t }), tab); await d.settle(400);
      await d.snap(`collection_${tab}`);
    }
    await d.tap(145, 90); if (!await d.waitScene('island', 4000)) { d.flag('stuck', 'Collection BACK did not return to the island', 'collection'); await page.evaluate(() => window.__littleLegends.scenes.change('island')); await d.settle(); }
  } else d.flag('stuck', 'COLLECTION button did not open the collection', 'island');

  // Parent area: the gate, then every tab.
  await d.tap(90, 85);
  if (await d.waitScene('parentGate')) {
    await d.snap('parent_gate');
    const c = await d.client(960, 610); await page.touchscreen.touchStart(c.x, c.y); await sleep(2400); await page.touchscreen.touchEnd(); await sleep(400);
    for (const [i, tab] of ['dashboard', 'settings', 'profiles', 'test', 'release', 'data', 'privacy'].entries()) { await d.tap(210 + i * 215 + 100, 146); await sleep(350); await d.snap(`parent_${tab}`); }
    await d.tap(130, 71); if (!await d.waitScene('island', 4000)) d.flag('stuck', 'Parent area BACK did not return to the island', 'parentGate');
  } else d.flag('stuck', 'parent button did not open the parent gate', 'island');

  const speaks = await page.evaluate(() => window.__QA.speaks.length);
  const errors = (await d.state()).errors;
  if (errors) d.flag('runtime-error', `${errors} recovered runtime error(s)`, 'game');
  await context.close();
  console.log(`  ${vp.id}: ${d.shot} screenshots, ${d.findings.length} findings, ${speaks} spoken lines, ${Math.round((Date.now() - t0) / 1000)} s`);
  return { viewport: vp.id, shots: d.shot, findings: d.findings, speaks, checks: d.results };
}

// Quick tap on the home button must not leave; holding it must go back to the world's missions.
async function holdToLeaveCheck(d, world) {
  await sleep(700); await d.tap(1830, 100); await sleep(500);
  let s = await d.state();
  if (s.scene !== 'adventure') d.flag('dead-end', 'a quick tap on the home button left the mission (should need a hold)', world);
  await d.snap('hold_to_leave_tip');
  const c = await d.client(1830, 100); await d.page.touchscreen.touchStart(c.x, c.y); await sleep(1900); await d.page.touchscreen.touchEnd();
  const ok = await d.waitScene('worldHub', 4000);
  if (!ok) d.flag('dead-end', 'holding the home button did not leave the mission', world);
  d.results.push({ check: 'hold-to-leave', ok });
  // Back into the same mission card (it resumes) and carry on.
  await d.tap(250 + 330, 280 + 88); await d.waitScene('adventure');
}

async function playJungle(d) {
  if (!await d.waitScene('jungleJam')) { d.flag('stuck', 'Jungle Jam did not open', 'jungle hub'); return; }
  await d.snap('jungle_free_jam');
  const page = d.page;
  for (const [i, mode] of ['rhythm', 'tempo', 'dynamics', 'sound'].entries()) {
    const r = await page.evaluate(n => window.__littleLegends.scenes.current.modeRect(n), i + 1);
    await d.tap(r.x + r.w / 2, r.y + r.h / 2); await sleep(500);
    await d.snap(`jungle_${mode}`);
    const goal = await page.evaluate(() => { const s = window.__littleLegends.scenes.current; return { goal: s.goal, tempo: s.tempo }; });
    if (mode === 'tempo' || mode === 'dynamics') { await d.tap(goal.goal === 'fast' || goal.goal === 'loud' ? 700 : 1100, 760); }
    if (mode === 'rhythm') { const gap = goal.tempo === 'fast' ? 360 : 720; for (let k = 0; k < 3; k++) { await d.tap(960, 760, 30); if (k < 2) await sleep(gap - 90); } }
    if (mode === 'sound') {
      const p = await page.evaluate(() => { const s = window.__littleLegends.scenes.current; const hit = s.performers?.find(x => x.role === s.soundGoal); return hit ? { x: hit.x, y: hit.y } : null; });
      if (p) await d.tap(p.x, p.y); else d.flag('stuck', 'could not find the asked-for performer', 'jungle sound');
    }
    await sleep(500);
  }
  await d.tap(145, 90);
  const s = await d.settle(500);
  if (s.scene === 'worldHub') return; // back on the Jungle hub
  else if (s.scene === 'island') { await sleep(900); await d.snap('jungle_dragon_on_island'); await d.toIslandIdle(); await d.tap(1060, 957); await d.waitScene('worldSelect'); await d.tap(270, 570); await d.waitScene('worldHub'); }
  else d.flag('stuck', `Jungle Jam BACK went to ${s.scene}`, 'jungleJam');
}

async function main() {
  const worlds = args.worlds ? String(args.worlds).split(',') : WORLD_ORDER;
  const viewports = VIEWPORTS.filter(v => !args.only || v.id.startsWith(String(args.only)));
  const server = await startServer(root);
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  console.log(`Tablet play-through at ${server.base} — ${viewports.map(v => v.id).join(', ')}`);
  try {
    const results = await Promise.all(viewports.map(vp => runViewport(browser, vp, server.base, worlds)));
    const findings = results.flatMap(r => r.findings);
    fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify({ at: new Date().toISOString(), results: results.map(r => ({ viewport: r.viewport, shots: r.shots, speaks: r.speaks, findings: r.findings.length, checks: r.checks })), findings }, null, 2));
    const byType = findings.reduce((m, f) => (m[f.type] = (m[f.type] ?? 0) + 1, m), {});
    console.log('Findings by type:', byType);
    console.log(`Details: docs/qa_shots/findings.json`);
  } finally { await browser.close(); server.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(e => { console.error(e); process.exit(1); });
