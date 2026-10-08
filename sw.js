const CACHE = 'little-legends-m29-playable-fix1-art-v34';
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
// Every picture listed in the art manifest is cached too. A missing picture never blocks the install;
// the game shows its drawn placeholder for it.
function cacheArt(cache) {
  return fetch('./assets/art_manifest.json')
    .then(response => response.json())
    .then(list => Promise.allSettled((Array.isArray(list) ? list : []).map(entry => cache.add(entry.url))))
    .catch(() => null);
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE).then(() => cacheArt(cache))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  // Do not claim active clients: a newly installed version waits until the current play session closes.
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (!response || !response.ok) return response;
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
