const CACHE = 'little-legends-m29-playable-fix1-art-v50';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/art/meadow_picnic_clearing.png',
  './assets/art_manifest.json',
  './data/art_map.json',
  './data/activities.json',
  './data/adventures.json',
  './data/rewards.json',
  './data/sound_map.json',
  './assets/audio/voice/index.json',
  './assets/audio/activity/correct.ogg',
  './assets/audio/activity/correct_2.ogg',
  './assets/audio/activity/correct_3.ogg',
  './assets/audio/activity/count.ogg',
  './assets/audio/activity/drop.ogg',
  './assets/audio/activity/grab.ogg',
  './assets/audio/activity/magic.ogg',
  './assets/audio/activity/pop.ogg',
  './assets/audio/activity/pop_2.ogg',
  './assets/audio/activity/retry.ogg',
  './assets/audio/activity/retry_2.ogg',
  './assets/audio/activity/snap.ogg',
  './assets/audio/activity/sparkle.ogg',
  './assets/audio/activity/whoosh.ogg',
  './assets/audio/activity/whoosh_2.ogg',
  './assets/audio/character/pip_laugh.ogg',
  './assets/audio/reward/complete.ogg',
  './assets/audio/reward/reward.ogg',
  './assets/audio/reward/reward_2.ogg',
  './assets/audio/ui/back.ogg',
  './assets/audio/ui/button.ogg',
  './assets/audio/ui/open.ogg',
  './assets/audio/ui/page.ogg',
  './assets/audio/ui/start.ogg',
  './assets/audio/ui/tab.ogg',
  './assets/audio/ui/tap.ogg',
  './src/activities/Activity.js',
  './src/activities/ActivityEngine.js',
  './src/activities/BuildObjectActivity.js',
  './src/activities/CategoriseActivity.js',
  './src/activities/CountAndPlaceActivity.js',
  './src/activities/DragBaseActivity.js',
  './src/activities/DragToTargetActivity.js',
  './src/activities/FollowDirectionsActivity.js',
  './src/activities/layout.js',
  './src/activities/MatchPairsActivity.js',
  './src/activities/MemoryMatchActivity.js',
  './src/activities/NumberLineActivity.js',
  './src/activities/OddOneOutActivity.js',
  './src/activities/OrderBySizeActivity.js',
  './src/activities/PaintSwipeActivity.js',
  './src/activities/PatternCompleteActivity.js',
  './src/activities/PicturePuzzleActivity.js',
  './src/activities/QuantityCompareActivity.js',
  './src/activities/RhythmRepeatActivity.js',
  './src/activities/SameDifferentActivity.js',
  './src/activities/SequenceOrderActivity.js',
  './src/activities/ShapeMatchActivity.js',
  './src/activities/SizeCompareActivity.js',
  './src/activities/SortObjectsActivity.js',
  './src/activities/SoundMatchActivity.js',
  './src/activities/StoryChoiceActivity.js',
  './src/activities/SwipeCoverageActivity.js',
  './src/activities/TapRequestedObjectActivity.js',
  './src/activities/TracePathActivity.js',
  './src/activities/WashSwipeActivity.js',
  './src/activities/activityDraw.js',
  './src/adventures/AdventureEngine.js',
  './src/audio/AudioManager.js',
  './src/audio/SoundBank.js',
  './src/audio/voiceLines.js',
  './src/characters/PipController.js',
  './src/characters/Wardrobe.js',
  './src/core/AssetLoader.js',
  './src/core/art.js',
  './src/core/Game.js',
  './src/core/GameLoop.js',
  './src/core/PerformanceManager.js',
  './src/core/SceneManager.js',
  './src/fx/FeedbackFX.js',
  './src/fx/HatchSequence.js',
  './src/hints/HintController.js',
  './src/input/InputManager.js',
  './src/learning/ActivityScheduler.js',
  './src/learning/AdaptiveDifficulty.js',
  './src/learning/LearningProfile.js',
  './src/main.js',
  './src/privacy/PrivacyPolicy.js',
  './src/render/CanvasViewport.js',
  './src/rewards/EggSystem.js',
  './src/rewards/RewardSystem.js',
  './src/save/SaveSystem.js',
  './src/scenes/ActivityScene.js',
  './src/scenes/AdventureScene.js',
  './src/scenes/BootScene.js',
  './src/scenes/CollectionScene.js',
  './src/scenes/JungleJamScene.js',
  './src/scenes/ParentGateScene.js',
  './src/scenes/ProfileSelectScene.js',
  './src/scenes/RainbowVillageScene.js',
  './src/scenes/WonderIslandScene.js',
  './src/scenes/WorldHubScene.js',
  './src/scenes/WorldSelectScene.js',
  './src/testing/ChildTestRecorder.js',
  './src/testing/ReleaseQualification.js',
  './src/utils/compat.js',
  './src/utils/draw.js',
  './src/ui/HoldToLeave.js',
  './src/utils/easing.js'
];
// Pictures live in their own cache, which survives code updates (they would otherwise re-download every
// release). Bump ART_CACHE only if pictures are redrawn under the same file name.
const ART_CACHE = 'little-legends-art-v3';
const ART_PARALLEL = 3;
// Sounds (Job 13): core effects are in CORE; music, ambience and the rest are cached the first time they play, in a
// cache that survives updates like the pictures. Audio players ask for byte ranges, so ranges are cut from the cached file.
const SOUND_CACHE = 'little-legends-sounds-v1';
function isSound(url) { return new URL(url).pathname.includes('/assets/audio/') && url.endsWith('.ogg'); }
async function soundResponse(request) {
  const url = request.url.split('#')[0];
  let full = await caches.match(url);
  if (!full) {
    const fresh = await fetch(url);
    if (!fresh.ok) return fresh;
    const cache = await caches.open(SOUND_CACHE);
    await cache.put(url, fresh.clone());
    full = fresh;
  }
  const range = request.headers.get('range');
  if (!range) return full;
  const buf = await full.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range);
  const start = Number(m?.[1] || 0), end = Math.min(m?.[2] ? Number(m[2]) : buf.byteLength - 1, buf.byteLength - 1);
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': 'audio/ogg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

// Gently caches every picture in the art manifest that isn't cached yet: a few at a time, so the game's own
// loading is never starved. The page asks for this a few seconds after it starts; it resumes on each visit.
// A missing picture is skipped (the game shows its drawn placeholder).
function cacheArt() {
  return Promise.all([caches.open(ART_CACHE), fetch('./assets/art_manifest.json').then(response => response.json())])
    .then(([cache, list]) => {
      const queue = (Array.isArray(list) ? list : []).map(entry => entry.url);
      const worker = () => {
        const url = queue.shift();
        if (!url) return null;
        return caches.match(url).then(hit => hit || cache.add(url)).catch(() => null).then(worker);
      };
      return Promise.all(Array.from({ length: ART_PARALLEL }, worker));
    })
    .catch(() => null);
}
// Pictures the page already loaded before this worker took over (first visit): cache them straight away,
// so the world the child just played still has its pictures if the tablet goes offline soon after.
function cacheUrls(urls) {
  const list = (Array.isArray(urls) ? urls : []).filter(url => typeof url === 'string' && isArt(new URL(url, self.location.href).href));
  return caches.open(ART_CACHE).then(cache => Promise.all(list.map(url => caches.match(url).then(hit => hit || cache.add(url)).catch(() => null)))).catch(() => null);
}
function isArt(url) { return new URL(url).pathname.includes('/assets/') && url.endsWith('.png'); }

let firstInstall = false;
self.addEventListener('install', event => {
  firstInstall = !self.registration.active;
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && key !== ART_CACHE && key !== SOUND_CACHE).map(key => caches.delete(key))))
    // First install only: look after the page that is already open, so what it loads next is cached for offline play.
    // An update never claims: a newly installed version waits until the current play session closes.
    .then(() => firstInstall ? self.clients.claim() : null));
});
self.addEventListener('message', event => {
  if (event.data === 'cache-art') event.waitUntil(cacheArt());
  if (event.data?.type === 'cache-urls') event.waitUntil(cacheUrls(event.data.urls));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;
  if (isSound(event.request.url)) { event.respondWith(soundResponse(event.request).catch(() => Response.error())); return; }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (!response || !response.ok) return response;
    const copy = response.clone();
    caches.open(isArt(event.request.url) ? ART_CACHE : CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
