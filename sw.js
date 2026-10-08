const CACHE = 'little-legends-m29-playable-fix1-art-v37';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/art/meadow_picnic_clearing.png',
  './assets/art_manifest.json',
  './data/art_map.json',
  './data/activities.json',
  './data/adventures.json',
  './data/rewards.json',
  './src/activities/Activity.js',
  './src/activities/ActivityEngine.js',
  './src/activities/BuildObjectActivity.js',
  './src/activities/CategoriseActivity.js',
  './src/activities/CountAndPlaceActivity.js',
  './src/activities/DragBaseActivity.js',
  './src/activities/DragToTargetActivity.js',
  './src/activities/FollowDirectionsActivity.js',
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
  './src/characters/PipController.js',
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
  './src/utils/draw.js',
  './src/utils/easing.js'
];
// Pictures live in their own cache, which survives code updates (they would otherwise re-download every
// release). Bump ART_CACHE only if pictures are redrawn under the same file name.
const ART_CACHE = 'little-legends-art-v3';
const ART_PARALLEL = 3;

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
function isArt(url) { return new URL(url).pathname.includes('/assets/') && url.endsWith('.png'); }

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && key !== ART_CACHE).map(key => caches.delete(key)))));
  // Do not claim active clients: a newly installed version waits until the current play session closes.
});
self.addEventListener('message', event => {
  if (event.data === 'cache-art') event.waitUntil(cacheArt());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (!response || !response.ok) return response;
    const copy = response.clone();
    caches.open(isArt(event.request.url) ? ART_CACHE : CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
