import { Game } from './core/Game.js';
import { BootScene } from './scenes/BootScene.js';
import { ProfileSelectScene } from './scenes/ProfileSelectScene.js';
import { WonderIslandScene } from './scenes/WonderIslandScene.js';
import { ActivityScene } from './scenes/ActivityScene.js';
import { ParentGateScene } from './scenes/ParentGateScene.js';
import { AdventureScene } from './scenes/AdventureScene.js';
import { RainbowVillageScene } from './scenes/RainbowVillageScene.js';
import { WorldSelectScene } from './scenes/WorldSelectScene.js';
import { WorldHubScene } from './scenes/WorldHubScene.js';
import { JungleJamScene } from './scenes/JungleJamScene.js';
import { CollectionScene } from './scenes/CollectionScene.js';

const canvas = document.querySelector('#game');
const game = new Game(canvas);

game.scenes.register('boot', game => new BootScene(game));
game.scenes.register('profile', game => new ProfileSelectScene(game));
game.scenes.register('island', game => new WonderIslandScene(game));
game.scenes.register('activity', game => new ActivityScene(game));
game.scenes.register('parentGate', game => new ParentGateScene(game));
game.scenes.register('adventure', game => new AdventureScene(game));
game.scenes.register('rainbowVillage', game => new RainbowVillageScene(game));
game.scenes.register('worldSelect', game => new WorldSelectScene(game));
game.scenes.register('worldHub', game => new WorldHubScene(game));
game.scenes.register('jungleJam', game => new JungleJamScene(game));
game.scenes.register('collection', game => new CollectionScene(game));


window.addEventListener('error', event => game.reportRuntimeError?.(event.error ?? new Error(event.message || 'Window error'), 'window:error'));
window.addEventListener('unhandledrejection', event => game.reportRuntimeError?.(event.reason instanceof Error ? event.reason : new Error(String(event.reason ?? 'Unhandled promise rejection')), 'window:unhandledrejection'));

const requestedScene = new URLSearchParams(location.search).get('scene');
const initialScene = ['profile', 'island', 'activity', 'parentGate', 'adventure', 'rainbowVillage', 'worldSelect', 'worldHub', 'jungleJam', 'collection'].includes(requestedScene) ? requestedScene : 'boot';

game.start(initialScene).catch(error => {
  console.error(error);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#492f5d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '24px system-ui';
  ctx.fillText('Little Legends could not start. Reload to try again.', 40, 80);
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  // Once the game has loaded what it needs, let the offline cache fetch the remaining pictures in the background.
  setTimeout(() => navigator.serviceWorker.ready.then(registration => registration.active?.postMessage('cache-art')).catch(() => {}), 8000);
}

window.__littleLegends = game;
