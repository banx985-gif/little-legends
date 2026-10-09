// Packs the game into an Android app (Capacitor) — everything inside the app, so it plays offline from the first launch.
//   cd app-android && npm install      (once)
//   npm run build                      -> dist/LittleLegends-debug.apk   (install on a test tablet)
//   npm run build:release              -> dist/LittleLegends-release.aab (for Google Play; signed when keystore.properties exists)
// Needs Java 21 and the Android SDK. Both are found automatically in the usual Windows places, or set JAVA_HOME / ANDROID_HOME.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '..');
const www = path.join(here, 'www');
const release = process.argv.includes('--release');
const win = process.platform === 'win32';

// 1. Copy the game (no build step: the same files the web version serves). No service worker: the app has every file already.
const COPY = ['index.html', 'styles.css', 'manifest.webmanifest', 'src', 'data', 'assets'];
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
for (const item of COPY) fs.cpSync(path.join(game, item), path.join(www, item), { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(game, 'package.json'), 'utf8'));
console.log(`Copied the game (${pkg.version}) into www/.`);

// 2. Tools.
function firstExisting(list) { return list.find(p => p && fs.existsSync(p)) ?? null; }
function jdk() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const roots = [path.join(process.env.LOCALAPPDATA ?? '', 'Programs/Java'), 'C:/Program Files/Java', 'C:/Program Files/Eclipse Adoptium', 'C:/Program Files/Android/Android Studio/jbr'];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    if (fs.existsSync(path.join(r, 'bin/java.exe'))) return r;
    const hit = fs.readdirSync(r).filter(d => /^jdk-?2[1-9]/.test(d)).sort().pop();
    if (hit) return path.join(r, hit);
  }
  return null;
}
const javaHome = jdk();
const sdk = firstExisting([process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(process.env.LOCALAPPDATA ?? '', 'Android/Sdk'), path.join(process.env.HOME ?? '', 'Library/Android/sdk')]);
if (!javaHome || !sdk) { console.error(`Need Java 21 (found: ${javaHome}) and the Android SDK (found: ${sdk}). See docs/GOOGLE_PLAY_STEPS.md.`); process.exit(1); }
const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
const run = (cmd, cwd = here) => { console.log(`> ${cmd}`); execSync(cmd, { cwd, env, stdio: 'inherit' }); };

// 3. Native project (made once, then kept in git), then copy the web files into it.
if (!fs.existsSync(path.join(here, 'android'))) run('npx cap add android');
run('npx cap sync android');
fs.writeFileSync(path.join(here, 'android/local.properties'), `sdk.dir=${sdk.replaceAll('\\', '/')}\n`);
run('node ../scripts/make-icons.cjs');

// 4. Build.
const gradle = `"${path.join(here, 'android', win ? 'gradlew.bat' : 'gradlew')}"`;
run(`${gradle} ${release ? 'bundleRelease' : 'assembleDebug'} --no-daemon`, path.join(here, 'android'));
const dist = path.join(here, 'dist');
fs.mkdirSync(dist, { recursive: true });
const out = release
  ? [path.join(here, 'android/app/build/outputs/bundle/release/app-release.aab'), path.join(dist, 'LittleLegends-release.aab')]
  : [path.join(here, 'android/app/build/outputs/apk/debug/app-debug.apk'), path.join(dist, 'LittleLegends-debug.apk')];
fs.copyFileSync(out[0], out[1]);
console.log(`\nDone: ${path.relative(game, out[1])} (${(fs.statSync(out[1]).size / 1048576).toFixed(1)} MB)`);
if (release && !fs.existsSync(path.join(here, 'android/keystore.properties'))) console.log('Note: no keystore.properties, so this bundle is NOT signed. Google Play needs it signed with your upload key (docs/GOOGLE_PLAY_STEPS.md).');
