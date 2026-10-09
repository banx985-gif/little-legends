// Makes game-sized copies of the art (Job 05). Originals live in ../../04_ART/MASTERS_FULL_SIZE (same folder layout);
// this writes lighter copies into assets/, keeping every file name.
//
//   npm install --no-save sharp@0.34.4
//   node scripts/shrink-art.cjs            (only pictures that are new or changed in the masters folder)
//   node scripts/shrink-art.cjs --all      (redo everything)
//   LL_MASTERS=<folder> node scripts/shrink-art.cjs   (read originals from another folder, e.g. _masters_pending)
//
// Rules: longest side ≈ 2× the largest size the game draws it at 1920×1080 (never upscale); background art keeps
// its size. Compression: high-quality palette (like pngquant), except effects (glows) and any picture whose colours
// would change noticeably — those stay lossless. A file is never made bigger than its original.
// After running: bump ART_CACHE and CACHE in sw.js (pictures changed under the same names).
const fs = require('fs'), path = require('path');
let sharp;
try { sharp = require('sharp'); } catch { console.error('Run: npm install --no-save sharp@0.34.4'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const MASTERS = process.env.LL_MASTERS ? path.resolve(process.env.LL_MASTERS) : path.resolve(ROOT, '..', '..', '04_ART', 'MASTERS_FULL_SIZE');
const ERROR_LIMIT = 6; // average change per visible pixel (0–255) above which a picture stays lossless

function targetLongest(rel) {
  if (rel.startsWith('art/')) return Infinity;                      // full-screen background
  if (rel.startsWith('worlds/backgrounds/')) return 1920;           // full-screen 16:9 scene backgrounds
  if (rel.startsWith('ui/')) return 256;
  if (/^objects\/(letters|letters_lower|numbers)\//.test(rel)) return 384;
  if (rel.startsWith('characters/pip/')) return 680;                // Pip ≤ 410 tall × scale 0.8
  if (rel.startsWith('characters/')) return 512;
  if (rel.startsWith('creatures/')) return 680;                     // helper characters ≤ 340 box
  if (rel.startsWith('rewards/hatch/')) return 800;                 // hatch egg ≤ 400 box
  if (rel.startsWith('rewards/')) return 512;
  if (/^fx\/(drops\/|ring_|note_)/.test(rel)) return 600;
  if (rel.startsWith('fx/')) return 1024;                           // bursts / ambient ≤ 640
  if (rel.startsWith('objects/')) return 768;                       // tokens, containers ≤ 380
  if (rel.startsWith('worlds/island_decor/')) return 512;           // island decorations ≤ 250 box (Job 11, low-end budget)
  if (rel.startsWith('worlds/scenes/')) return 1024;
  if (rel.startsWith('worlds/')) return 800;                        // island pieces ≤ 390
  return 1024;
}

async function averageError(reference, candidate) {
  const b = await sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = await sharp(reference).ensureAlpha().raw().toBuffer();
  let sum = 0, n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const alpha = Math.max(a[i + 3], b.data[i + 3]) / 255; if (alpha < 0.05) continue;
    sum += (Math.abs(a[i] - b.data[i]) + Math.abs(a[i + 1] - b.data[i + 1]) + Math.abs(a[i + 2] - b.data[i + 2])) / 3 * alpha + Math.abs(a[i + 3] - b.data[i + 3]);
    n++;
  }
  return sum / Math.max(1, n);
}

(async () => {
  const all = process.argv.includes('--all');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'art_manifest.json'), 'utf8'));
  let before = 0, after = 0, done = 0, lossless = 0, missing = [];
  for (const entry of manifest) {
    const rel = entry.url.replace(/^\.\/assets\//, '');
    const master = path.join(MASTERS, rel), dest = path.join(ROOT, 'assets', rel);
    if (!fs.existsSync(master)) { missing.push(rel); continue; }
    // Skip pictures already processed: the game copy differs from the master and isn't older than it.
    // (A copy identical to its master is still full size — e.g. new art filed straight into assets/.)
    if (!all && fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(master).mtimeMs
      && Buffer.compare(fs.readFileSync(dest), fs.readFileSync(master)) !== 0) continue;
    const meta = await sharp(master).metadata();
    const longest = Math.max(meta.width, meta.height), target = targetLongest(rel);
    const sized = longest > target
      ? await sharp(master).ensureAlpha().resize({ width: meta.width >= meta.height ? target : null, height: meta.height > meta.width ? target : null, kernel: 'lanczos3' }).png().toBuffer()
      : await sharp(master).ensureAlpha().png().toBuffer();
    // Note: in sharp, `effort` switches on palette mode, so the lossless options must not set it.
    const losslessBuf = await sharp(sized).png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
    let buf = losslessBuf, keptLossless = true;
    if (!rel.startsWith('fx/')) {
      const paletteBuf = await sharp(sized).png({ palette: true, quality: 100, effort: 10, compressionLevel: 9, dither: 1.0 }).toBuffer();
      if (paletteBuf.length < losslessBuf.length && await averageError(sized, paletteBuf) <= ERROR_LIMIT) { buf = paletteBuf; keptLossless = false; }
    }
    const original = fs.statSync(master).size;
    if (buf.length >= original && longest <= target) buf = fs.readFileSync(master);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    before += original; after += buf.length; done++; if (keptLossless) lossless++;
  }
  console.log(`${done} pictures written (${lossless} lossless): ${(before / 1048576).toFixed(1)} MB of masters -> ${(after / 1048576).toFixed(1)} MB`);
  if (missing.length) console.log(`Not in the masters folder (left as they are): ${missing.length}`, missing.slice(0, 5));
})();
