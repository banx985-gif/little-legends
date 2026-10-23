// Job 17: colouring pages and the studio's own pictures.
// - Pages are data/colouring.json; each is assets/colouring/<id>.png (black lines on white, 1920×1080) once Aaron's
//   picture is filed there. Until then a page with a `test` drawing uses that simple code-drawn page; others are hidden.
//   Nothing needs listing: the game looks for each file once per visit and swaps the real picture in by itself.
// - Tool pictures (assets/colouring/tools/: tool_*, colour_dot_*, size_*, stamp_*) work the same way: drawn
//   placeholders until the file is there.

export const PAGE_W = 1920, PAGE_H = 1080;
export const PAGE_DIR = './assets/colouring/';
export const TOOL_DIR = './assets/colouring/tools/';

// The 12 colours (names match colour_dot_<name>).
export const COLOURS = [
  ['red', '#e8323c'], ['orange', '#ff8c1a'], ['yellow', '#ffd51f'], ['light_green', '#7fd14b'], ['dark_green', '#1f9a4b'], ['light_blue', '#5cc8f5'],
  ['dark_blue', '#2457d6'], ['purple', '#8e4fd6'], ['pink', '#ff7eb9'], ['brown', '#8b5a2b'], ['black', '#222222'], ['white', '#ffffff']
];
export const STAMPS = ['star', 'heart', 'paw', 'dino_foot', 'flower', 'circle'];

// ---- pictures loaded from files (pages, tool art) ----
// url -> { img, state: 'loading' | 'ok' | 'missing' }. Missing files are remembered for the session (no repeat requests).
const files = new Map();
export function fileImage(url) {
  let f = files.get(url);
  if (!f) {
    f = { img: null, state: 'loading' };
    files.set(url, f);
    if (typeof Image !== 'function') f.state = 'missing';
    else {
      const img = new Image();
      img.onload = () => { f.img = img; f.state = 'ok'; };
      img.onerror = () => { f.state = 'missing'; };
      img.src = url;
    }
  }
  return f.state === 'ok' ? f.img : null;
}
export function fileState(url) { return files.get(url)?.state ?? null; }
// Lets go of the decoded pictures (leaving the studio); "missing" answers are kept.
export function releaseFiles() { for (const [url, f] of files) if (f.state !== 'missing') files.delete(url); }
export function toolImage(name) { return fileImage(`${TOOL_DIR}${name}.png`); }
export function pageUrl(id) { return `${PAGE_DIR}${id}.png`; }

// Is the real page picture there? Checked once per session with a plain request (no picture decoded).
const pageFound = new Map();
export function probePage(id) {
  if (pageFound.has(id)) return pageFound.get(id);
  const job = (typeof fetch !== 'function' || globalThis.location?.protocol === 'file:')
    ? Promise.resolve(false)
    : fetch(pageUrl(id)).then(r => { r.body?.cancel?.(); return r.ok; }).catch(() => false);
  pageFound.set(id, job);
  return job;
}

// ---- code-drawn test pages (thick, closed black lines on white; no faces) ----
function L(ctx) { ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.stroke(); }
function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.stroke(); }
function rect(ctx, x, y, w, h, r = 0) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke(); }
function ground(ctx, y = 940) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(1880, y); ctx.stroke(); }

export const TEST_PAGES = {
  flower(ctx) {
    L(ctx); ground(ctx);
    ctx.beginPath(); ctx.moveTo(950, 610); ctx.lineTo(950, 940); ctx.moveTo(970, 610); ctx.lineTo(970, 940); ctx.stroke();
    ellipse(ctx, 870, 800, 90, 40, -0.5); ellipse(ctx, 1050, 760, 90, 40, 0.5);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ellipse(ctx, 960 + Math.cos(a) * 190, 400 + Math.sin(a) * 190, 115, 70, a); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(960, 400, 135, 0, Math.PI * 2); ctx.fill(); circle(ctx, 960, 400, 135);
  },
  sun_cloud(ctx) {
    L(ctx); circle(ctx, 720, 420, 200);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); poly(ctx, [[720 + c * 240 - s * 40, 420 + s * 240 + c * 40], [720 + c * 340, 420 + s * 340], [720 + c * 240 + s * 40, 420 + s * 240 - c * 40]]); }
    // Cloud: the outline of overlapping puffs (each stroked, then the inside painted white over the inner lines).
    const puffs = [[1180, 740, 130], [1350, 630, 170], [1530, 700, 150], [1660, 790, 110], [1420, 800, 140]];
    for (const [x, y, r] of puffs) circle(ctx, x, y, r);
    ctx.fillStyle = '#fff'; for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(x, y, r - 5, 0, Math.PI * 2); ctx.fill(); }
  },
  apple(ctx) {
    L(ctx); ground(ctx, 960);
    ctx.beginPath(); ctx.moveTo(960, 330); ctx.bezierCurveTo(820, 220, 520, 260, 530, 560); ctx.bezierCurveTo(540, 820, 760, 960, 960, 890);
    ctx.bezierCurveTo(1160, 960, 1380, 820, 1390, 560); ctx.bezierCurveTo(1400, 260, 1100, 220, 960, 330); ctx.closePath(); ctx.stroke();
    rect(ctx, 945, 170, 30, 160, 12);
    ctx.beginPath(); ctx.moveTo(985, 250); ctx.bezierCurveTo(1060, 150, 1200, 150, 1250, 200); ctx.bezierCurveTo(1190, 290, 1060, 300, 985, 250); ctx.closePath(); ctx.stroke();
    ellipse(ctx, 680, 560, 60, 120, 0.2);
  },
  butterfly(ctx) {
    L(ctx);
    ellipse(ctx, 700, 380, 260, 220, -0.4); ellipse(ctx, 1220, 380, 260, 220, 0.4); ellipse(ctx, 730, 740, 200, 170, 0.4); ellipse(ctx, 1190, 740, 200, 170, -0.4);
    for (const [x, y, r] of [[660, 360, 80], [1260, 360, 80], [740, 760, 60], [1180, 760, 60]]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); circle(ctx, x, y, r); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(960, 580, 60, 330, 0, 0, Math.PI * 2); ctx.fill(); ellipse(ctx, 960, 580, 60, 330);
    ctx.beginPath(); ctx.moveTo(940, 270); ctx.quadraticCurveTo(880, 140, 800, 130); ctx.moveTo(980, 270); ctx.quadraticCurveTo(1040, 140, 1120, 130); ctx.stroke();
    circle(ctx, 800, 130, 22); circle(ctx, 1120, 130, 22);
  },
  car(ctx) {
    L(ctx); ground(ctx, 900);
    ctx.beginPath(); ctx.moveTo(420, 780); ctx.lineTo(420, 600); ctx.quadraticCurveTo(430, 540, 520, 530); ctx.lineTo(700, 520); ctx.lineTo(820, 340);
    ctx.quadraticCurveTo(840, 310, 900, 310); ctx.lineTo(1180, 310); ctx.quadraticCurveTo(1240, 310, 1270, 350); ctx.lineTo(1400, 520);
    ctx.lineTo(1460, 530); ctx.quadraticCurveTo(1520, 545, 1520, 610); ctx.lineTo(1520, 780); ctx.closePath(); ctx.stroke();
    poly(ctx, [[760, 520], [860, 370], [945, 370], [945, 520]]); poly(ctx, [[1005, 520], [1005, 370], [1170, 370], [1290, 520]]);
    for (const x of [640, 1300]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, 790, 110, 0, Math.PI * 2); ctx.fill(); circle(ctx, x, 790, 110); circle(ctx, x, 790, 45); }
    ellipse(ctx, 1480, 600, 30, 40);
  },
  rainbow_house(ctx) {
    L(ctx); ground(ctx, 950);
    for (const r of [760, 660, 560, 460]) { ctx.beginPath(); ctx.arc(960, 950, r, Math.PI, 0); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(700, 560, 520, 385);
    rect(ctx, 720, 640, 480, 305); poly(ctx, [[680, 650], [960, 430], [1240, 650]]);
    rect(ctx, 905, 770, 110, 175, 20); rect(ctx, 760, 700, 110, 100, 10); rect(ctx, 1050, 700, 110, 100, 10);
  }
};
export function drawTestPage(ctx, name) {
  ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PAGE_W, PAGE_H); TEST_PAGES[name]?.(ctx); ctx.restore();
}

// ---- drawn placeholders for the tool pictures ----
export function drawStampShape(ctx, shape, x, y, s) {
  ctx.beginPath();
  if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.22 : s * 0.5; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  else if (shape === 'heart') { ctx.moveTo(x, y + s * 0.42); ctx.bezierCurveTo(x - s * 0.62, y, x - s * 0.42, y - s * 0.52, x, y - s * 0.22); ctx.bezierCurveTo(x + s * 0.42, y - s * 0.52, x + s * 0.62, y, x, y + s * 0.42); }
  else if (shape === 'paw') { ctx.ellipse(x, y + s * 0.14, s * 0.26, s * 0.22, 0, 0, Math.PI * 2); for (const [dx, dy] of [[-0.3, -0.12], [-0.11, -0.32], [0.11, -0.32], [0.3, -0.12]]) { ctx.moveTo(x + dx * s + s * 0.1, y + dy * s); ctx.ellipse(x + dx * s, y + dy * s, s * 0.1, s * 0.13, 0, 0, Math.PI * 2); } }
  else if (shape === 'dino_foot') { ctx.ellipse(x, y + s * 0.15, s * 0.25, s * 0.27, 0, 0, Math.PI * 2); for (const a of [-0.55, 0, 0.55]) { const tx = x + Math.sin(a) * s * 0.36, ty = y - Math.cos(a) * s * 0.3; ctx.moveTo(tx, ty - s * 0.2); ctx.lineTo(tx + s * 0.1, ty + s * 0.06); ctx.lineTo(tx - s * 0.1, ty + s * 0.06); ctx.closePath(); } }
  else if (shape === 'flower') { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, px = x + Math.cos(a) * s * 0.27, py = y + Math.sin(a) * s * 0.27; ctx.moveTo(px + s * 0.18, py); ctx.arc(px, py, s * 0.18, 0, Math.PI * 2); } }
  else { ctx.arc(x, y, s * 0.45, 0, Math.PI * 2); }
  ctx.fill('nonzero');
}
