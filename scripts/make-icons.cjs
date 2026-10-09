// App icons and splash pictures (Job 12), made from Pip's waving picture on the game's sky blue.
// The art itself is not changed: it is only placed on a background and scaled down.
//   node scripts/make-icons.cjs
// Writes assets/icons/ (web/PWA), docs/store/ (Google Play listing icon) and, when the Android wrapper exists,
// its launcher icons and splash screens under app-android/android/app/src/main/res/.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const PIP = path.join(root, 'assets/characters/pip/pip_wave.png');
const SKY = '#75d8ff', CREAM = '#fff7d0';

// A square icon: sky background (rounded corners unless full-bleed), a soft cream disc, Pip fitted inside `fit` of the size.
async function icon(size, { fit = 0.8, rounded = true, disc = true } = {}) {
  const r = Math.round(size * 0.22);
  const bg = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    ${rounded ? `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${SKY}"/>` : `<rect width="${size}" height="${size}" fill="${SKY}"/>`}
    ${disc ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size * fit * 0.5}" fill="${CREAM}"/>` : ''}
  </svg>`);
  const box = Math.round(size * fit * 0.9);
  const pip = await sharp(PIP).resize(box, box, { fit: 'inside' }).toBuffer();
  const m = await sharp(pip).metadata();
  return sharp(bg).composite([{ input: pip, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2 + size * 0.02) }]).png();
}

// Landscape/portrait splash: sky, cream disc, Pip in the middle (Android shows it while the game starts).
async function splash(w, h) {
  const s = Math.min(w, h);
  const bg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="${SKY}"/><circle cx="${w / 2}" cy="${h / 2}" r="${s * 0.3}" fill="${CREAM}"/></svg>`);
  const box = Math.round(s * 0.5);
  const pip = await sharp(PIP).resize(box, box, { fit: 'inside' }).toBuffer();
  const m = await sharp(pip).metadata();
  return sharp(bg).composite([{ input: pip, left: Math.round((w - m.width) / 2), top: Math.round((h - m.height) / 2) }]).png();
}

async function main() {
  const out = (p) => { fs.mkdirSync(path.dirname(p), { recursive: true }); return p; };
  // Web / home-screen install: "any" icons are rounded; "maskable" ones are full-bleed with Pip inside the safe circle.
  await (await icon(192)).toFile(out(path.join(root, 'assets/icons/icon-192.png')));
  await (await icon(512)).toFile(out(path.join(root, 'assets/icons/icon-512.png')));
  await (await icon(192, { rounded: false, fit: 0.72 })).toFile(path.join(root, 'assets/icons/icon-maskable-192.png'));
  await (await icon(512, { rounded: false, fit: 0.72 })).toFile(path.join(root, 'assets/icons/icon-maskable-512.png'));
  await (await icon(180, { rounded: false, fit: 0.8 })).toFile(path.join(root, 'assets/icons/apple-touch-icon.png'));
  // Google Play listing icon: 512×512, full square, no transparency (Play rounds the corners itself).
  await (await icon(512, { rounded: false, fit: 0.86 })).flatten({ background: SKY }).toFile(out(path.join(root, 'docs/store/play-icon-512.png')));

  const res = path.join(root, 'app-android/android/app/src/main/res');
  if (!fs.existsSync(res)) { console.log('Icons written (no Android wrapper yet).'); return; }
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(densities)) {
    const dir = path.join(res, `mipmap-${d}`);
    if (!fs.existsSync(dir)) continue;
    await (await icon(Math.round(48 * k), { rounded: true, fit: 0.86 })).toFile(path.join(dir, 'ic_launcher.png'));
    await (await icon(Math.round(48 * k), { rounded: false, fit: 0.86 })).toFile(path.join(dir, 'ic_launcher_round.png'));
    // Adaptive icon foreground: 108 dp with the picture inside the middle 66 dp; the background colour is set in XML.
    const fg = Math.round(108 * k), inner = Math.round(fg * 0.6);
    const pip = await sharp(PIP).resize(inner, inner, { fit: 'inside' }).toBuffer(), m = await sharp(pip).metadata();
    await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from(`<svg width="${fg}" height="${fg}" xmlns="http://www.w3.org/2000/svg"><circle cx="${fg / 2}" cy="${fg / 2}" r="${fg * 0.33}" fill="${CREAM}"/></svg>`) },
        { input: pip, left: Math.round((fg - m.width) / 2), top: Math.round((fg - m.height) / 2) }]).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  for (const dir of fs.readdirSync(res).filter(d => d.startsWith('drawable'))) {
    const file = path.join(res, dir, 'splash.png');
    if (!fs.existsSync(file)) continue;
    const meta = await sharp(file).metadata();
    await (await splash(meta.width, meta.height)).toFile(file + '.tmp');
    fs.renameSync(file + '.tmp', file);
  }
  console.log('Icons and Android launcher/splash pictures written.');
}

main().catch(error => { console.error(error); process.exit(1); });
