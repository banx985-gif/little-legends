import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PipController } from '../src/characters/PipController.js';
import { AudioManager, AUDIO_CHANNELS } from '../src/audio/AudioManager.js';
import { ActivityEngine } from '../src/activities/ActivityEngine.js';
import { LearningProfile, MASTERY_STATES, TRACKED_SKILLS } from '../src/learning/LearningProfile.js';
import { HintController } from '../src/hints/HintController.js';
import { ActivityScene } from '../src/scenes/ActivityScene.js';
import { ParentGateScene } from '../src/scenes/ParentGateScene.js';
import { SaveSystem } from '../src/save/SaveSystem.js';
import { AdventureEngine } from '../src/adventures/AdventureEngine.js';
import { AdventureScene } from '../src/scenes/AdventureScene.js';
import { WonderIslandScene } from '../src/scenes/WonderIslandScene.js';
import { RewardSystem } from '../src/rewards/RewardSystem.js';
import { EggSystem, EGG_STATES } from '../src/rewards/EggSystem.js';
import { AdaptiveDifficulty } from '../src/learning/AdaptiveDifficulty.js';
import { ActivityScheduler } from '../src/learning/ActivityScheduler.js';
import { RainbowVillageScene } from '../src/scenes/RainbowVillageScene.js';
import { WorldSelectScene } from '../src/scenes/WorldSelectScene.js';
import { WorldHubScene } from '../src/scenes/WorldHubScene.js';
import { JungleJamScene } from '../src/scenes/JungleJamScene.js';
import { CollectionScene, DECOR_TABS, decorTab } from '../src/scenes/CollectionScene.js';
import { PerformanceManager, PERFORMANCE_MODES, autoStartMode } from '../src/core/PerformanceManager.js';
import { ChildTestRecorder } from '../src/testing/ChildTestRecorder.js';
import { ReleaseQualification, RELEASE_MANUAL_CHECKS } from '../src/testing/ReleaseQualification.js';
import { PRIVACY_GUARANTEES, STORED_DATA } from '../src/privacy/PrivacyPolicy.js';
import { FeedbackFX } from '../src/fx/FeedbackFX.js';
import { art, drawArt, tokenArt, artIdsForScene, settleSceneArt, countTargetArt, hatchTheme, hatchFrameIds, dragonForWorld } from '../src/core/art.js';
import { AssetLoader, drawnSize } from '../src/core/AssetLoader.js';
import { findUnusedArt } from './art-unused.mjs';
import { HatchSequence } from '../src/fx/HatchSequence.js';
import { drawToken, drawBin, drawBasket } from '../src/activities/activityDraw.js';
import { drawCandyButton, drawSpeechBubble, wrapLines } from '../src/utils/draw.js';
import { HoldToLeave } from '../src/ui/HoldToLeave.js';
import { GameLoop } from '../src/core/GameLoop.js';
import { VOICE_REPEAT_SECONDS } from '../src/hints/HintController.js';
import { LOOK_TABS, SLOTS, lookTab, slotOf, wornLooks, toggleLook } from '../src/characters/Wardrobe.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html','styles.css','manifest.webmanifest','sw.js','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/art/meadow_picnic_clearing.png','assets/art_manifest.json','data/art_map.json','src/core/art.js','docs/ART_WIRING_REPORT.md','data/activities.json','data/adventures.json','data/rewards.json','data/v1-family-coverage.json',
  'src/main.js','src/core/Game.js','src/core/GameLoop.js','src/core/SceneManager.js','src/core/AssetLoader.js','src/core/PerformanceManager.js','src/fx/FeedbackFX.js','src/testing/ChildTestRecorder.js','src/testing/ReleaseQualification.js','src/privacy/PrivacyPolicy.js',
  'src/input/InputManager.js','src/render/CanvasViewport.js',
  'src/audio/AudioManager.js','src/characters/PipController.js','src/characters/Wardrobe.js','src/learning/LearningProfile.js','src/learning/AdaptiveDifficulty.js','src/learning/ActivityScheduler.js','src/hints/HintController.js','src/save/SaveSystem.js','src/adventures/AdventureEngine.js','src/rewards/RewardSystem.js','src/rewards/EggSystem.js',
  'src/activities/Activity.js','src/activities/DragBaseActivity.js','src/activities/activityDraw.js',
  'src/activities/ActivityEngine.js','src/activities/DragToTargetActivity.js','src/activities/CountAndPlaceActivity.js',
  'src/activities/MatchPairsActivity.js','src/activities/SortObjectsActivity.js','src/activities/TapRequestedObjectActivity.js',
  'src/activities/QuantityCompareActivity.js','src/activities/OddOneOutActivity.js','src/activities/NumberLineActivity.js','src/activities/SameDifferentActivity.js','src/activities/OrderBySizeActivity.js','src/activities/PicturePuzzleActivity.js','src/activities/FollowDirectionsActivity.js','src/activities/ShapeMatchActivity.js','src/activities/SizeCompareActivity.js','src/activities/PatternCompleteActivity.js','src/activities/SequenceOrderActivity.js','src/activities/BuildObjectActivity.js','src/activities/MemoryMatchActivity.js','src/activities/CategoriseActivity.js','src/activities/SwipeCoverageActivity.js','src/activities/WashSwipeActivity.js','src/activities/PaintSwipeActivity.js','src/activities/TracePathActivity.js','src/activities/SoundMatchActivity.js','src/activities/RhythmRepeatActivity.js','src/activities/StoryChoiceActivity.js',
  'src/scenes/BootScene.js','src/scenes/ProfileSelectScene.js','src/scenes/WonderIslandScene.js','src/scenes/ActivityScene.js','src/scenes/AdventureScene.js','src/scenes/RainbowVillageScene.js','src/scenes/WorldSelectScene.js','src/scenes/WorldHubScene.js','src/scenes/JungleJamScene.js','src/scenes/CollectionScene.js','src/scenes/ParentGateScene.js'
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const jsFiles = walk(path.join(root, 'src')).filter(file => file.endsWith('.js'));
jsFiles.push(path.join(root, 'sw.js'));
for (const file of jsFiles) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });

// The installable/offline build must cache every eagerly imported source module.
const serviceWorkerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(serviceWorkerSource.includes("little-legends-m29-playable-fix1-art-v47"), 'Service worker cache version should advance with the real-art build');
for (const file of walk(path.join(root, 'src')).filter(file => file.endsWith('.js'))) {
  const rel = `./${path.relative(root, file).split(path.sep).join('/')}`;
  assert.ok(serviceWorkerSource.includes(`'${rel}'`), `Offline cache must include ${rel}`);
}
for (const rel of ['./data/activities.json','./data/adventures.json','./data/rewards.json']) assert.ok(serviceWorkerSource.includes(`'${rel}'`), `Offline cache must include ${rel}`);

// ---- Pip controller ----
const states = ['look','point','happy','laugh','celebrate','confused','encourage','sleepy','bounce','fall','wave'];
const voiceEvents = [];
const pip = new PipController({ rng: () => 0.5, onVoiceEvent: event => voiceEvents.push(event) });
for (const state of states) assert.equal(pip.react(state), true, `Pip should accept state ${state}`);
assert.equal(pip.react('not-a-state'), false);
pip.clearQueue({ keepActive: false });
assert.equal(pip.lookAt({ x: 500, y: 300 }, 0.4), true);
pip.update(0.01);
assert.equal(pip.state, 'look');
pip.update(0.5);
assert.equal(pip.state, 'idle');
assert.equal(pip.say('three_apples', { text: 'Put three apples in the basket.', bubbleText: 'Three apples!', duration: 0.4, reaction: 'wave' }), true);
pip.update(0.01);
assert.equal(pip.state, 'wave');
assert.equal(voiceEvents.at(-1)?.type, 'start');
assert.equal(voiceEvents.at(-1)?.lineId, 'three_apples');
assert.equal(voiceEvents.at(-1)?.text, 'Put three apples in the basket.');
assert.equal(voiceEvents.at(-1)?.bubbleText, 'Three apples!');
pip.update(0.5);
assert.equal(pip.state, 'idle');
assert.equal(voiceEvents.at(-1)?.type, 'end');

// ---- Audio manager ----
class FakeParam {
  constructor(value = 1) { this.value = value; }
  setValueAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
  cancelScheduledValues() {}
}
class FakeNode {
  constructor() { this.gain = new FakeParam(1); this.onended = null; this.stopped = false; }
  connect() { return this; }
  start() {}
  stop() { this.stopped = true; this.onended?.(); }
}
class FakeOscillator extends FakeNode {
  constructor() { super(); this.frequency = new FakeParam(440); this.type = 'sine'; }
}
class FakeBufferSource extends FakeNode {
  constructor() { super(); this.buffer = null; this.loop = false; this.playbackRate = { value: 1 }; }
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = new FakeNode(); }
  createGain() { return new FakeNode(); }
  createOscillator() { return new FakeOscillator(); }
  createBufferSource() { return new FakeBufferSource(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

const audio = new AudioManager({ contextFactory: () => new FakeAudioContext() });
assert.equal(audio.unlock(), true);
assert.equal(audio.channelGains.size, 6);
audio.setMasterVolume(0.6, { ramp: 0 });
assert.equal(audio.getMasterVolume(), 0.6);
audio.setChannelVolume(AUDIO_CHANNELS.MUSIC, 0.7, { ramp: 0 });
assert.equal(audio.getChannelVolume(AUDIO_CHANNELS.MUSIC), 0.7);
audio.voiceWindow({ type: 'start', duration: 0 });
assert.equal(audio.musicDuck, 0.34);
audio.voiceWindow({ type: 'end' });
assert.equal(audio.musicDuck, 1);
assert.equal(audio.playCue('grab'), true);
assert.equal(audio.playCue('incorrect'), true);
assert.equal(audio.playCue('count', { count: 3 }), true);
assert.equal(audio.playCue('complete'), true);
assert.equal(audio.playCue('missing'), false);
const voice1 = audio.playVoiceBuffer({ fake: true });
assert.ok(voice1);
const voice2 = audio.playVoiceBuffer({ fake: true });
assert.ok(voice2);
assert.equal(voice1.source.stopped, true, 'New voice should stop previous voice');
audio.suspend();
assert.equal(audio.suspendedByApp, true);
audio.resume();
assert.equal(audio.suspendedByApp, false);

// ---- Canvas + Activity Engine V1 ----
class FakeCanvasContext {
  constructor() { this.depth = 0; }
  save() { this.depth++; }
  restore() { this.depth--; assert.ok(this.depth >= 0, 'Canvas restore without matching save'); }
  beginPath() {} closePath() {} moveTo() {} lineTo() {} quadraticCurveTo() {} bezierCurveTo() {}
  arc() {} ellipse() {} roundRect() {} fill() {} stroke() {} fillRect() {} clearRect() {} fillText() {}
  translate() {} rotate() {} scale() {} setLineDash() {} rect() {} clip() {}
}

const cueLog = [];
const sceneAudio = {
  playCue(name, options) { cueLog.push({ name, options }); return true; },
  voiceWindow() {}, stopVoice() {}, speak() { return false; },
  getSettings() { return { master: 0.9, music: 0.55, voice: 1, character: 0.9, ui: 0.85, ambient: 0.55, activity: 0.9 }; },
  getMasterVolume() { return 0.9; }, getChannelVolume() { return 0.9; },
  setMasterVolume() {}, setChannelVolume() {},
  startWorldMusic() {}, stopWorldMusic() {}, playJamStem() { return true; }
};
const learningClock = { now: 1700000000000 };
const learning = new LearningProfile({ clock: () => learningClock.now++ });
const dummyGame = { scenes: { change() {} }, audio: sceneAudio, learning };
const activityEngine = new ActivityEngine(dummyGame);
const activityData = JSON.parse(fs.readFileSync(path.join(root, 'data/activities.json'), 'utf8'));
assert.ok(activityEngine.setDefinitions(activityData) >= 10, 'Milestone 4 requires at least ten JSON-defined activities');
assert.ok(activityEngine.list().length >= 10);
const expectedActivityTypes = new Set(['DragToTarget','CountAndPlace','MatchPairs','SortObjects','TapRequestedObject','ShapeMatch','SizeCompare','PatternComplete','SequenceOrder','BuildObject','MemoryMatch','Categorise','WashSwipe','PaintSwipe','TracePath','SoundMatch','RhythmRepeat','StoryChoice','QuantityCompare','OddOneOut','NumberLine','SameDifferent','OrderBySize','PicturePuzzle','FollowDirections']);
assert.deepEqual(new Set(activityEngine.list().map(a => a.type)), expectedActivityTypes, 'Activity Engine V2 should expose the complete reusable V1 grammar');
const coverageData = JSON.parse(fs.readFileSync(path.join(root, 'data/v1-family-coverage.json'), 'utf8'));
const coveredItems = coverageData.items.filter(item => (item.families ?? []).length > 0);
const coverageRatio = coveredItems.length / coverageData.items.length;
assert.ok(coverageRatio >= 0.8, `Reusable activity families must cover at least 80% of explicit planned V1 learning items; got ${Math.round(coverageRatio * 100)}%`);
for (const item of coveredItems) for (const family of item.families) assert.ok(expectedActivityTypes.has(family), `Coverage mapping for ${item.item} references registered family ${family}`);
assert.equal(activityEngine.nextId('feed_bunny_3'), 'feed_bunny_2_carrots');
assert.equal(activityEngine.nextId(activityEngine.ids().at(-1)), activityEngine.ids()[0], 'Next should wrap to first activity');

const fakeCtx = new FakeCanvasContext();
const completedIds = [];

function makeHost(id) {
  return {
    pip: new PipController({ rng: () => 0.5 }),
    completeActivity(result) { completedIds.push(id); this.result = result; }
  };
}

function drag(activity, token, target) {
  activity.handlePointer({ type: 'down', x: token.x, y: token.y });
  activity.handlePointer({ type: 'move', x: target.x, y: target.y + 35 });
  activity.handlePointer({ type: 'up', x: target.x, y: target.y + 35 });
  activity.update(0.4);
}

function completeThroughPublicInput(activity, definition) {
  if (definition.type === 'CountAndPlace') {
    for (const token of [...activity.tokens]) drag(activity, token, activity.target);
  } else if (['DragToTarget','ShapeMatch','BuildObject','PicturePuzzle'].includes(definition.type)) {
    for (const token of [...activity.tokens]) {
      const target = activity.targets.find(t => (!token.targetId || t.id === token.targetId) && activity.accepts(t, token));
      assert.ok(target, `${definition.id} should have a valid drag target for ${token.id}`);
      drag(activity, token, target);
    }
  } else if (['SortObjects','Categorise'].includes(definition.type)) {
    for (const token of [...activity.tokens]) {
      const target = activity.targets.find(t => activity.accepts(t, token));
      assert.ok(target, `${definition.id} should have a valid target for ${token.id}`);
      drag(activity, token, target);
    }
  } else if (definition.type === 'MatchPairs') {
    const pairIds = [...new Set(activity.tokens.map(t => t.pairId))];
    for (const pairId of pairIds) {
      const pair = activity.tokens.filter(t => t.pairId === pairId);
      activity.handlePointer({ type: 'up', x: pair[0].x, y: pair[0].y });
      activity.handlePointer({ type: 'up', x: pair[1].x, y: pair[1].y });
    }
  } else if (['TapRequestedObject','OddOneOut','NumberLine'].includes(definition.type)) {
    while (!activity.completeState) {
      const target = activity.target();
      const token = activity.tokens.find(t => !t.found && activity.matches(t, target));
      assert.ok(token, `${definition.id} should expose the requested object`);
      activity.handlePointer({ type: 'up', x: token.x, y: token.y });
    }
  } else if (definition.type === 'SizeCompare') {
    const token = activity.correctToken(); activity.handlePointer({ type:'up', x:token.x, y:token.y });
  } else if (definition.type === 'PatternComplete') {
    const token = activity.correctChoice(); activity.handlePointer({ type:'up', x:token.x, y:token.y });
  } else if (['SequenceOrder','OrderBySize','FollowDirections'].includes(definition.type)) {
    while (!activity.completeState) { const token=activity.nextToken(); assert.ok(token); activity.handlePointer({type:'up',x:token.x,y:token.y}); }
  } else if (definition.type === 'MemoryMatch') {
    const pairIds=[...new Set(activity.cards.map(c=>c.pairId))];
    for(const pairId of pairIds){const pair=activity.cards.filter(c=>c.pairId===pairId);activity.handlePointer({type:'up',x:pair[0].x,y:pair[0].y});activity.handlePointer({type:'up',x:pair[1].x,y:pair[1].y});}
  } else if (['WashSwipe','PaintSwipe'].includes(definition.type)) {
    const spots=[...activity.spots]; if(spots.length){activity.handlePointer({type:'down',x:spots[0].x,y:spots[0].y});for(const spot of spots.slice(1))activity.handlePointer({type:'move',x:spot.x,y:spot.y});activity.handlePointer({type:'up',x:spots.at(-1).x,y:spots.at(-1).y});}
  } else if (definition.type === 'TracePath') {
    const points=activity.points;activity.handlePointer({type:'down',x:points[0].x,y:points[0].y});for(const point of points.slice(1))activity.handlePointer({type:'move',x:point.x,y:point.y});activity.handlePointer({type:'up',x:points.at(-1).x,y:points.at(-1).y});
  } else if (definition.type === 'SoundMatch') {
    const choice=activity.correctChoice();activity.handlePointer({type:'up',x:choice.x,y:choice.y});
  } else if (definition.type === 'RhythmRepeat') {
    const base=1000;for(const offset of activity.pattern)activity.handlePointer({type:'up',x:960,y:690,timeStamp:base+offset});
  } else if (definition.type === 'QuantityCompare') {
    const choice=activity.correctChoice(); assert.ok(choice, `${definition.id} should expose a correct quantity choice`); activity.handlePointer({type:'up',x:choice.x,y:choice.y});
  } else if (['StoryChoice','SameDifferent'].includes(definition.type)) {
    const choice=activity.choices.find(c=>c.correct||c.id===definition.correctId)??activity.choices[0];activity.handlePointer({type:'up',x:choice.x,y:choice.y});
  }
}

for (const definition of activityEngine.list()) {
  const host = makeHost(definition.id);
  const activity = activityEngine.create(definition.id, host);
  activity.start();
  activity.render(fakeCtx);
  assert.equal(fakeCtx.depth, 0, `${definition.id} initial render must balance Canvas state`);
  completeThroughPublicInput(activity, definition);
  assert.equal(activity.completeState, true, `${definition.id} should be completable through its public input path`);
  activity.render(fakeCtx);
  assert.equal(fakeCtx.depth, 0, `${definition.id} completion render must balance Canvas state`);
  activity.cleanup();
}
assert.equal(completedIds.length, activityEngine.list().length, 'Every JSON activity should report completion to its host');
assert.ok(cueLog.some(item => item.name === 'grab'));
assert.ok(cueLog.some(item => item.name === 'count'));
assert.ok(cueLog.some(item => item.name === 'correct'));

// ---- Learning Profile V1 ----
assert.ok(Object.keys(TRACKED_SKILLS).length >= 13, 'The original Milestone 5 skill roster must remain intact');
for (const id of ['GREEN','ORANGE','PURPLE','RECTANGLE','PATTERN']) assert.ok(TRACKED_SKILLS[id], `Rainbow Village skill ${id} must be tracked`);
const sessionReport = learning.getSessionReport();
assert.ok(sessionReport.eventCount > 0, 'Playable activities should generate structured attempt events');
assert.ok(sessionReport.attemptedSkillIds.includes('COUNT_1'));
assert.ok(sessionReport.attemptedSkillIds.includes('COUNT_2'));
assert.ok(sessionReport.attemptedSkillIds.includes('COUNT_3'));
assert.ok(sessionReport.attemptedSkillIds.includes('RED'));
assert.ok(sessionReport.attemptedSkillIds.includes('BLUE'));
assert.ok(sessionReport.attemptedSkillIds.includes('YELLOW'));
assert.ok(sessionReport.attemptedSkillIds.includes('CIRCLE'));
assert.ok(sessionReport.attemptedSkillIds.includes('SQUARE'));
assert.ok(sessionReport.attemptedSkillIds.includes('TRIANGLE'));
assert.ok(sessionReport.attemptedSkillIds.includes('SAME_DIFFERENT'));
assert.equal(sessionReport.assistanceUsed, false, 'M5 activities are independent until the M6 hint system exists');
const redBefore = learning.getSkill('RED');
assert.ok(redBefore.attempts > 0 && redBefore.independentSuccesses > 0);
const assisted = learning.recordResponse({ activityId: 'test-assisted', skillIds: ['RED'], outcome: 'success', assisted: true, hintLevel: 3 });
assert.equal(assisted.assisted, true);
assert.equal(assisted.hintLevel, 3);
const redAfter = learning.getSkill('RED');
assert.equal(redAfter.hintAssistedSuccesses, redBefore.hintAssistedSuccesses + 1);
assert.ok(Object.values(MASTERY_STATES).includes(redAfter.masteryState));
assert.equal(learning.getAttemptEvents().at(-1).skillIds[0], 'RED');

// ---- Hint System V1 ----
const hintLearning = new LearningProfile({ clock: (() => { let t = 1800000000000; return () => t++; })() });
const hintActions = { repeats: 0, demos: 0, hidden: 0, points: 0 };
const hintActivity = {
  id: 'hint-test', hintLevel: 0, hintContext: null,
  configuredSkills() { return ['COUNT_1']; },
  getHintContext() { return { object: { id: 'apple', x: 400, y: 650 }, target: { id: 'basket', x: 1400, y: 700 }, skillIds: ['COUNT_1'] }; },
  setHint(level, context) { this.hintLevel = level; this.hintContext = context; }
};
const hintHost = {
  activity: hintActivity, completed: false,
  pip: { react(name, options) { if (name === 'point' && options?.target) hintActions.points++; return true; } },
  repeatInstruction() { hintActions.repeats++; },
  showHintDemo() { hintActions.demos++; },
  hideHintDemo() { hintActions.hidden++; }
};
const hints = new HintController({ host: hintHost, learning: hintLearning, delays: { young: 0.1 } });
for (let level = 1; level <= 5; level++) hints.update(0.11);
assert.equal(hints.currentLevel, 5);
assert.equal(hintActivity.hintLevel, 5);
assert.equal(hintActions.repeats, 1, 'Hint level 1 repeats the instruction');
assert.equal(hintActions.points, 1, 'Hint level 4 asks Pip to point');
assert.equal(hintActions.demos, 1, 'Hint level 5 demonstrates the first step');
assert.equal(hintLearning.getHintEvents().length, 5, 'Every escalated hint is logged');
assert.equal(hintLearning.getSessionReport().maxHintLevel, 5);
hints.onInput();
assert.equal(hints.elapsed, 0, 'Any child input resets hint escalation timing');
hints.update(0.11);
assert.equal(hintActions.demos, 2, 'At max hint level, inactivity can replay the demonstration');
hints.onProgress();
assert.equal(hints.currentLevel, 0, 'Successful progress resets the hint ladder');
assert.equal(hintActivity.hintLevel, 0);

// ---- ActivityScene + assisted-learning integration ----
const assistedLearning = new LearningProfile({ clock: (() => { let t = 1900000000000; return () => t++; })() });
const assistedGame = { scenes: { change() {} }, audio: sceneAudio, learning: assistedLearning, assets: null };
assistedGame.activityEngine = new ActivityEngine(assistedGame);
assistedGame.activityEngine.setDefinitions(activityData);
const assistedScene = new ActivityScene(assistedGame);
await assistedScene.enter({ activityId: 'feed_bunny_3' });
assistedScene.update(5.6);
assert.equal(assistedScene.hints.currentLevel, 1, 'Inactivity should reach the first hint');
const assistedApple = assistedScene.activity.tokens[0];
const assistedBasket = assistedScene.activity.target;
assistedScene.handlePointer({ type: 'down', x: assistedApple.x, y: assistedApple.y });
assistedScene.handlePointer({ type: 'move', x: assistedBasket.x, y: assistedBasket.y + 35 });
assistedScene.handlePointer({ type: 'up', x: assistedBasket.x, y: assistedBasket.y + 35 });
assistedScene.update(0.4);
const assistedReport = assistedLearning.getSessionReport();
assert.equal(assistedReport.assistanceUsed, true, 'A success after a hint must report assistance');
assert.equal(assistedReport.assistedEventCount, 1);
assert.equal(assistedLearning.getSkill('COUNT_1').hintAssistedSuccesses, 1);
assert.equal(assistedScene.hints.currentLevel, 0, 'Progress should reset the hint ladder for the next response');
assistedScene.render(fakeCtx);
assert.equal(fakeCtx.depth, 0, 'Hint-assisted ActivityScene render must balance Canvas state');
await assistedScene.exit();

// ---- Parent gate settings unlock smoke ----
const parent = new ParentGateScene(dummyGame);
parent.enter();
parent.handlePointer({ type: 'down', x: 960, y: 610 });
parent.update(2.05);
assert.equal(parent.unlocked, true, 'Two-second hold should unlock parent audio settings');
parent.render(fakeCtx);
assert.equal(fakeCtx.depth, 0, 'Parent settings render must balance canvas save/restore');



// ---- Milestone 7: Rory adventure definitions + full flow ----
const adventureData = JSON.parse(fs.readFileSync(path.join(root, 'data/adventures.json'), 'utf8'));
const adventureEngine = new AdventureEngine(dummyGame);
assert.ok(adventureEngine.setDefinitions(adventureData) >= 6);
const roryAdventure = adventureEngine.get('rory_dino_picnic');
assert.equal(roryAdventure.steps.length, 10, 'Rory Dino Picnic should be the ten-scene first complete experience');
assert.deepEqual(roryAdventure.steps.map(step => step.kind), ['story','activity','activity','activity','size','pattern','egg','story','hatch','place']);
for (const id of ['dino_find_3','dino_feed_5','dino_sort_fruit']) assert.ok(activityEngine.get(id), `${id} should be data-driven through Activity Engine V1`);

// ---- Milestone 8: save system + child-profile isolation ----
// Regression: profiles created by early standalone builds may have shallow/incomplete nested state.
// Opening a world hub must migrate these safely instead of killing the game loop.
const legacySave = new SaveSystem({ indexedDBRef: null, storage: null });
legacySave.root = legacySave.migrate({
  version: 1,
  activeProfileId: 'legacy-profile',
  profiles: [{ id:'legacy-profile', name:'Legacy', age:3, createdAt:1 }],
  profileStates: {
    'legacy-profile': {
      adventure: { currentId:null, step:0 },
      island: {},
      unlocks: { creatures:['baby_raptor'] },
      pip: {}
    }
  },
  settings: {}
});
legacySave.ready = true;
assert.deepEqual(legacySave.getProfileState().adventure.completed, [], 'Legacy saves must gain adventure.completed during migration');
assert.deepEqual(legacySave.getProfileState().island.placements, {}, 'Legacy saves must gain island placements during migration');
assert.ok(Array.isArray(legacySave.getProfileState().unlocks.decorations), 'Legacy saves must gain all unlock arrays during migration');
const legacyHubGame={ adventureEngine, save:legacySave, audio:sceneAudio, scenes:{change(){}} };
const legacyHub=new WorldHubScene(legacyHubGame);await legacyHub.enter({world:'dino'});legacyHub.render(fakeCtx);legacyHub.exit();
await legacySave.saveAdventure('dino_nest_number_hunt',0,{completed:true});
assert.ok(legacySave.getProfileState().adventure.completed.includes('dino_nest_number_hunt'), 'Completing an adventure must remain safe after legacy migration');

const save = new SaveSystem({ indexedDBRef: null, storage: null });
await save.init();
const profileA = await save.createProfile({ name: 'A', age: 2, language: 'en-AU', favoriteColor: 'blue' });
await save.award('creatures', 'baby_raptor');
await save.saveIslandPlacement('dinosaur_home', { x: 1400, y: 680, zone: 'creature' });
const learningSnapshot = learning.snapshot();
await save.saveLearning(learningSnapshot);
const profileB = await save.createProfile({ name: 'B', age: 5, language: 'en-AU', favoriteColor: 'yellow' });
assert.equal(save.listProfiles().length, 2);
assert.deepEqual(save.getProfileState(profileB.id).unlocks.creatures, [], 'New child profile must not inherit another child’s rewards');
await save.selectProfile(profileA.id);
assert.ok(save.getProfileState().unlocks.creatures.includes('baby_raptor'));
assert.equal(save.getProfileState().island.placements.dinosaur_home.x, 1400);
const restoredLearning = new LearningProfile();
assert.equal(restoredLearning.restore(save.getProfileState().learning), true);
assert.equal(restoredLearning.getSkill('RED').attempts, learning.getSkill('RED').attempts);

// Adventure resume/reward persistence smoke.
const adventureGame = {
  activityEngine: new ActivityEngine(null), adventureEngine: new AdventureEngine(null), save, learning: new LearningProfile(), audio: sceneAudio, assets: null, scenes: { last: null, change(name, data) { this.last = { name, data }; } }
};
adventureGame.activityEngine.game = adventureGame; adventureGame.adventureEngine.game = adventureGame;
adventureGame.activityEngine.setDefinitions(activityData); adventureGame.adventureEngine.setDefinitions(adventureData);
await save.saveAdventure('rory_dino_picnic', 4);
const resumedAdventure = new AdventureScene(adventureGame);
await resumedAdventure.enter({ adventureId: 'rory_dino_picnic' });
assert.equal(resumedAdventure.stepIndex, 4, 'Adventure should resume from saved step');
resumedAdventure.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
resumedAdventure.handlePointer({ type: 'up', x: 870, y: 500 });
assert.equal(resumedAdventure.completedStep, true, 'Biggest blanket choice should complete size step');
await resumedAdventure.advance();
resumedAdventure.handlePointer({ type: 'up', x: 800, y: 820 });
assert.equal(resumedAdventure.completedStep, true, 'Blue choice should finish red-blue-red AB pattern');

// ---- Milestone 9: persistent Wonder Island placement + interaction ----
await save.award('buildings', 'dinosaur_home');
const islandGame = { save, audio: sceneAudio, scenes: { change() {} } };
const island = new WonderIslandScene(islandGame);
island.enter();
assert.ok(island.objects.some(object => object.id === 'dinosaur_home'), 'Unlocked dinosaur home should appear on Wonder Island');
island.placementMode = true;
const tree = island.objects.find(object => object.id === 'tree');
island.handlePointer({ type: 'down', x: tree.x, y: tree.y });
island.handlePointer({ type: 'move', x: 520, y: 540 });
island.handlePointer({ type: 'up', x: 520, y: 540 });
await save.writeChain;
assert.equal(save.getProfileState().island.placements.tree.x, 520, 'Moved island objects should autosave their placement');
island.placementMode = false;
island.handlePointer({ type: 'up', x: island.objects.find(object => object.id === 'drum').x, y: island.objects.find(object => object.id === 'drum').y });
assert.equal(island.interaction, 'drum');
island.render(fakeCtx); assert.equal(fakeCtx.depth, 0, 'Wonder Island render must balance canvas state');




// ---- Milestone 10: rewards + Discovery Stars ----
const rewardData = JSON.parse(fs.readFileSync(path.join(root, 'data/rewards.json'), 'utf8'));
const rewardGame = { save };
const rewards = new RewardSystem(rewardGame); rewardGame.rewards = rewards;
assert.ok(rewards.setDefinitions(rewardData) >= 8);
const starsBefore = save.getProfileState().discoveryStars;
await rewards.award('baby_raptor');
const starsAfterFirst = save.getProfileState().discoveryStars;
await rewards.award('baby_raptor');
assert.equal(starsAfterFirst, starsBefore, 'Already-unlocked reward should not repeatedly grant Discovery Stars');
await save.selectProfile(profileB.id);
const bStars = save.getProfileState().discoveryStars;
await rewards.award('baby_raptor');
assert.equal(save.getProfileState().discoveryStars, bStars + 1, 'First major reward should grant its lightweight Discovery Star');
assert.equal(rewards.beginReveal('baby_raptor'), true);
for (let i=0;i<8;i++) rewards.update(.6);
assert.equal(rewards.getRevealState().phase, 'use');
assert.equal(rewards.getRevealState().finished, true);
assert.ok(rewards.get('baby_raptor').interaction, 'Major rewards should define an immediate meaningful use');

// ---- Milestone 11: no-wait egg/hatching state machine ----
const eggGame = { save, rewards };
const eggs = new EggSystem(eggGame);
await eggs.receive('test-egg','baby_raptor');
assert.equal(eggs.get('test-egg').state, EGG_STATES.RECEIVED);
await eggs.setReady('test-egg');
assert.equal(eggs.get('test-egg').state, EGG_STATES.READY);
for (let i=0;i<5;i++) await eggs.interact('test-egg');
assert.equal(eggs.get('test-egg').state, EGG_STATES.CREATURE_UNLOCKED);
assert.equal(eggs.progress('test-egg'), 1);

// ---- Milestone 12: adaptive difficulty upshift/downshift ----
const adaptive = new AdaptiveDifficulty({ clock: () => 2000000000000 });
const strong = new LearningProfile({ clock: (() => { let t=1999999990000; return () => t+=100; })() });
for(let i=0;i<6;i++) strong.recordResponse({activityId:'adaptive',skillIds:['COUNT_3'],outcome:'success',assisted:false,responseTimeMs:1800});
const struggling = new LearningProfile({ clock: (() => { let t=1999999990000; return () => t+=100; })() });
for(let i=0;i<5;i++){struggling.recordHint({activityId:'adaptive',level:3,skillIds:['COUNT_3']});struggling.recordResponse({activityId:'adaptive',skillIds:['COUNT_3'],outcome:'incorrect',assisted:true,hintLevel:3,responseTimeMs:12000,correction:i>0});}
const adaptiveDef=activityData.activities.find(a=>a.id==='feed_bunny_3');
const hard=adaptive.apply(adaptiveDef,strong), easy=adaptive.apply(adaptiveDef,struggling);
assert.equal(hard.adaptiveResolved,'CHALLENGE');
assert.equal(easy.adaptiveResolved,'EASIER');
assert.ok(hard.targetCount>easy.targetCount,'Strong evidence should increase counting quantity while struggle downshifts it');
assert.ok(easy.hintDelayMultiplier<hard.hintDelayMultiplier,'Struggling child should receive earlier hints');




// Full Rory adventure can be completed end-to-end and returns the reward home.
const flowSave = new SaveSystem({ indexedDBRef: null, storage: null }); await flowSave.init(); await flowSave.createProfile({ name:'Flow', age:3 });
const flowGame={learning:new LearningProfile(),audio:sceneAudio,save:flowSave,assets:null,scenes:{last:null,change(name,data){this.last={name,data};}}};
flowGame.activityEngine=new ActivityEngine(flowGame);flowGame.activityEngine.setDefinitions(activityData);
flowGame.adventureEngine=new AdventureEngine(flowGame);flowGame.adventureEngine.setDefinitions(adventureData);
flowGame.rewards=new RewardSystem(flowGame);flowGame.rewards.setDefinitions(rewardData);flowGame.eggs=new EggSystem(flowGame);
const flow=new AdventureScene(flowGame);await flow.enter({adventureId:'rory_dino_picnic',step:0});
await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'find_dinos');
for(const token of flow.activity.tokens.filter(t=>t.kind==='dinosaur')) flow.activity.handlePointer({type:'up',x:token.x,y:token.y});
assert.equal(flow.completedStep,true);await flow.handlePointer({type:'up',x:960,y:940});assert.equal(flow.step.id,'find_dinos','The finger lifting at the end of an activity must not skip the well-done moment');await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'feed_dinos');for(const token of [...flow.activity.tokens]) drag(flow.activity,token,flow.activity.target);
assert.equal(flow.completedStep,true);await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'sort_fruit');for(const token of [...flow.activity.tokens]){const target=flow.activity.targets.find(t=>flow.activity.accepts(t,token));drag(flow.activity,token,target);}
assert.equal(flow.completedStep,true);await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'big_blanket');await flow.handlePointer({type:'up',x:870,y:500});assert.equal(flow.completedStep,true);await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'pattern');await flow.handlePointer({type:'up',x:800,y:820});assert.equal(flow.completedStep,true);await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'egg_reward');await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'return_island');await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'hatch');for(let i=0;i<5;i++)await flow.handlePointer({type:'up',x:960,y:600});assert.equal(flow.completedStep,true);
await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});assert.equal(flow.step.id,'place_home');await flow.handlePointer({type:'up',x:960,y:680});assert.equal(flow.completedStep,true);await flow.handlePointer({type:'down',x:960,y:940});await flow.handlePointer({type:'up',x:960,y:940});
await flowSave.writeChain;assert.equal(flowGame.scenes.last.name,'island');assert.ok(flowSave.getProfileState().unlocks.creatures.includes('baby_raptor'));assert.ok(flowSave.getProfileState().unlocks.buildings.includes('dinosaur_home'));assert.ok(flowSave.getProfileState().adventure.completed.includes('rory_dino_picnic'));



// ---- Milestone 13: Activity Engine V2 reusable grammar ----
for (const type of expectedActivityTypes) assert.ok(activityEngine.list().some(def=>def.type===type), `V2 family ${type} needs at least one data-driven definition`);
const m13Families=['ShapeMatch','SizeCompare','PatternComplete','SequenceOrder','BuildObject','MemoryMatch','Categorise','WashSwipe','PaintSwipe','TracePath','SoundMatch','RhythmRepeat','StoryChoice'];
assert.equal(m13Families.filter(type=>activityEngine.list().some(def=>def.type===type)).length,13,'All thirteen Activity Engine V2 families should be executable');

// ---- Milestone 14: activity scheduler ----
const schedulerLearning={getSkill(id){return {id,attempts:id==='GREEN'?6:6,masteryState:id==='GREEN'?'REVIEW':'MASTERED',lastPractisedAt:1690000000000};}};
const schedulerGame={activityEngine,learning:schedulerLearning};
const scheduler=new ActivityScheduler(schedulerGame,{clock:()=>1700000000000});
const greenDef=activityEngine.get('rainbow_find_green'), masteredDef=activityEngine.get('rainbow_find_red');
assert.equal(scheduler.choose({candidates:[masteredDef,greenDef]}).id,'rainbow_find_green','Scheduler should prioritise a skill needing review over a mastered one');
scheduler.record(activityEngine.get('rainbow_colour_sort'));scheduler.record(activityEngine.get('rainbow_balloon_sort'));
const varied=scheduler.choose({candidates:[activityEngine.get('m13_categorise'),activityEngine.get('m13_shape_match')]});
assert.equal(varied.type,'ShapeMatch','After two categorise activities, scheduler should switch interaction family');
const preview=scheduler.previewSession(20,{world:'rainbow',candidates:activityEngine.list().filter(def=>def.world==='rainbow'||def.theme==='rainbow')});
assert.equal(preview.length,20);
for(let i=2;i<preview.length;i++){const a=activityEngine.get(preview[i-2])?.type,b=activityEngine.get(preview[i-1])?.type,c=activityEngine.get(preview[i])?.type;assert.ok(!(a===b&&b===c),'Scheduler must not repeat the same activity template more than twice in succession');}

// ---- Milestone 15: Rainbow Village + Gate 3 system reuse ----
const rainbowAdventures=adventureData.adventures.filter(a=>a.world==='rainbow');
assert.ok(rainbowAdventures.length>=8,'Rainbow Village has a full set of Little Missions (Job 12: 8+)');
for(const adventure of rainbowAdventures){
  assert.ok(adventure.steps.every(step=>['story','activity'].includes(step.kind)),`${adventure.id} should use reusable story/activity flow rather than custom world-specific step code`);
  for(const step of adventure.steps.filter(step=>step.kind==='activity'))assert.ok(activityEngine.get(step.activityId),`${adventure.id} references reusable activity ${step.activityId}`);
}
const rainbowSkillIds=['RED','BLUE','YELLOW','GREEN','ORANGE','PURPLE','CIRCLE','SQUARE','TRIANGLE','RECTANGLE','BIG_SMALL','PATTERN'];
for(const id of rainbowSkillIds)assert.ok(TRACKED_SKILLS[id],`Rainbow Village tracks ${id}`);
for(const id of ['rainbow_arch','octo_party_hat','shape_garden','prism_butterfly','parade_float'])assert.ok(rewards.get(id),`Rainbow reward ${id} should be data-driven`);

const rainbowNavGame={adventureEngine,scenes:{last:null,change(name,data){this.last={name,data};}}};
const rainbowHub=new RainbowVillageScene(rainbowNavGame);await rainbowHub.enter();rainbowHub.render(fakeCtx);assert.equal(fakeCtx.depth,0,'Rainbow Village render must balance Canvas state');
rainbowHub.handlePointer({type:'down',x:400,y:390});rainbowHub.handlePointer({type:'up',x:400,y:390});assert.equal(rainbowNavGame.scenes.last?.name,'adventure');assert.equal(rainbowNavGame.scenes.last?.data?.adventureId,'rainbow_missing_rainbow');

await save.selectProfile(profileA.id);
const rainbowGame={save,learning:new LearningProfile(),audio:sceneAudio,assets:null,scenes:{last:null,change(name,data){this.last={name,data};}}};
rainbowGame.activityEngine=new ActivityEngine(rainbowGame);rainbowGame.activityEngine.setDefinitions(activityData);
rainbowGame.adventureEngine=new AdventureEngine(rainbowGame);rainbowGame.adventureEngine.setDefinitions(adventureData);
rainbowGame.rewards=new RewardSystem(rainbowGame);rainbowGame.rewards.setDefinitions(rewardData);
rainbowGame.scheduler=new ActivityScheduler(rainbowGame);
const rainbowScene=new AdventureScene(rainbowGame);await rainbowScene.enter({adventureId:'rainbow_missing_rainbow',step:0});
let guard=0;
while(rainbowGame.scenes.last?.name!=='island'&&guard++<20){
  if(rainbowScene.activity&&!rainbowScene.completedStep){completeThroughPublicInput(rainbowScene.activity,rainbowScene.activity.definition);}
  await rainbowScene.handlePointer({type:'down',x:960,y:950});await rainbowScene.handlePointer({type:'up',x:960,y:950});
}
assert.equal(rainbowGame.scenes.last?.name,'island','Rainbow adventure should return to Wonder Island');
assert.ok(save.getProfileState().unlocks.buildings.includes('rainbow_arch'),'Completing The Missing Rainbow should persist its Wonder Island reward');
const islandWithRainbow=new WonderIslandScene({save,audio:sceneAudio,rewards:rainbowGame.rewards,scenes:{change(){}}});islandWithRainbow.enter();assert.ok(islandWithRainbow.objects.some(o=>o.id==='rainbow_arch'),'Rainbow reward should appear on Wonder Island using the existing island object system');islandWithRainbow.render(fakeCtx);assert.equal(fakeCtx.depth,0);

// ---- Milestones 16–20: production content worlds ----
const dinoAdventures = adventureData.adventures.filter(a => a.world === 'dino');
assert.ok(dinoAdventures.length >= 10, 'Dino Valley full pass should expose ten or more Little Missions including Rory’s picnic');
for (const group of ['counting','numerals','more_less','same_amount','size','addition','sequence']) {
  assert.ok(activityData.activities.filter(a => a.world === 'dino' && a.contentGroup === group).length >= 4, `Dino Valley needs at least four ${group} variants`);
}
for (let n=1;n<=10;n++) { assert.ok(TRACKED_SKILLS[`COUNT_${n}`]); assert.ok(TRACKED_SKILLS[`NUMERAL_${n}`]); }
for (const id of ['MORE_LESS','SAME_AMOUNT','ADDITION_PREP','SEQUENCE']) assert.ok(TRACKED_SKILLS[id]);
assert.ok(rewardData.rewards.filter(r => r.world === 'dino').length >= 8, 'Dino Valley should have at least eight data-driven rewards');

const animalAdventures = adventureData.adventures.filter(a => a.world === 'animal');
assert.ok(animalAdventures.length >= 8, 'Animal Forest has a full set of Little Missions (Job 12: 8+)');
for (const id of ['ANIMAL_NAMES','ANIMAL_SOUNDS','HABITATS','BABY_PARENT','LAND_WATER_AIR','ANIMAL_FOOD','BODY_FEATURES','CLASSIFICATION']) assert.ok(TRACKED_SKILLS[id], `Animal Forest tracks ${id}`);
for (const adventure of animalAdventures) assert.ok(adventure.steps.every(step => ['story','activity'].includes(step.kind)), `${adventure.id} should reuse generic story/activity flow`);

const storyAdventures = adventureData.adventures.filter(a => a.world === 'storybook');
assert.ok(storyAdventures.length >= 8, 'Storybook has a full set of Little Missions (Job 12: 8+)');
for (const id of ['VOCABULARY','LETTER_RECOGNITION','UPPER_LOWER','FIRST_SOUNDS','NAME_LETTER']) assert.ok(TRACKED_SKILLS[id], `Literacy foundation tracks ${id}`);
for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.ok(TRACKED_SKILLS[`LETTER_${letter}`], `A–Z architecture tracks ${letter}`);
const lettersRepresented = new Set(activityData.activities.filter(a => a.world === 'storybook').flatMap(a => a.skills ?? []).filter(id => /^LETTER_[A-Z]$/.test(id)).map(id => id.slice(-1)));
assert.equal(lettersRepresented.size, 26, 'Storybook content should represent all A–Z letters in data');

const lifeAdventures = adventureData.adventures.filter(a => a.world === 'life');
assert.ok(lifeAdventures.length >= 8, 'Bella’s Day has a full set of Little Missions (Job 12: 8+)');
for (const id of ['HAND_WASHING','TEETH_BRUSHING','WEATHER_CLOTHES','TOY_SORTING','FEELINGS','HELPING','ROUTINES']) assert.ok(TRACKED_SKILLS[id], `Life skills track ${id}`);

// Generic second/third/fourth-world adventures must complete through public activity touch paths.
const contentSave = new SaveSystem({ indexedDBRef:null, storage:null }); await contentSave.init(); await contentSave.createProfile({name:'Sam',age:4,language:'en-AU'});
const contentGame={save:contentSave,learning:new LearningProfile(),audio:sceneAudio,assets:null,scenes:{last:null,change(name,data){this.last={name,data};}}};
contentGame.activityEngine=new ActivityEngine(contentGame); contentGame.activityEngine.setDefinitions(activityData);
contentGame.adventureEngine=new AdventureEngine(contentGame); contentGame.adventureEngine.setDefinitions(adventureData);
contentGame.rewards=new RewardSystem(contentGame); contentGame.rewards.setDefinitions(rewardData); contentGame.eggs=new EggSystem(contentGame); contentGame.scheduler=new ActivityScheduler(contentGame);
async function completeGenericAdventure(id){
  contentGame.scenes.last=null;const scene=new AdventureScene(contentGame);await scene.enter({adventureId:id,step:0});let guard=0;
  while(contentGame.scenes.last?.name!=='island'&&guard++<30){if(scene.activity&&!scene.completedStep)completeThroughPublicInput(scene.activity,scene.activity.definition);await scene.handlePointer({type:'down',x:960,y:950});await scene.handlePointer({type:'up',x:960,y:950});}
  assert.equal(contentGame.scenes.last?.name,'island',`${id} should return to Wonder Island`);return scene;
}
const genericAdventureIds = adventureData.adventures.filter(a => a.id !== 'rory_dino_picnic' && a.steps.every(step => ['story','activity'].includes(step.kind))).map(a => a.id);
for (const id of genericAdventureIds) await completeGenericAdventure(id);
assert.equal(genericAdventureIds.length, adventureData.adventures.length - 1, 'Every non-Rory Little Mission should use the generic story/activity path');
for (const reward of ['baby_triceratops','forest_treehouse','moon_book_nook','bella_bear_friend']) {
  const def=rewards.get(reward);assert.ok(contentSave.getProfileState().unlocks[def.type].includes(reward),`${reward} should persist after its adventure`);
}

// ---- Job 06: Space Station + Busy Town worlds, rare dragons ----
for (const world of ['space','town']) {
  const missions = adventureData.adventures.filter(a => a.world === world);
  assert.ok(missions.length >= 8, `${world} needs at least 8 Little Missions`);
  for (const m of missions) { assert.equal(m.guide, 'pip', `${m.id} is guided by Pip (no Zig Robot art yet)`); assert.ok(rewards.get(m.reward.id), `${m.id} reward ${m.reward.id} must be data-driven`); }
}
for (const id of ['dragon_space','dragon_puzzle','dragon_rainbow','dragon_nature','dragon_story']) assert.ok(contentSave.getProfileState().unlocks.creatures.includes(id), `Finishing every mission in a world hatches its rare dragon: ${id}`);
assert.ok(contentSave.getProfileState().unlocks.creatures.includes('dragon_music'), 'Job 12: finishing every Jungle mission also hatches the Music Dragon (the Jam games still do too)');
assert.ok(contentSave.getProfileState().unlocks.decorations.includes('life_golden_star'), 'Job 12: Bella’s Day has no dragon; finishing it gives Bella’s Golden Star');
assert.equal(rewardData.rewards.filter(r => r.rare).length, 7, 'Seven rare dragons, one per learning theme');
for (const r of rewardData.rewards.filter(r => r.rare)) assert.equal(r.type, 'creatures', 'Dragons are creature friends (no new save fields needed)');
{ const dragonScene = new AdventureScene(contentGame); await dragonScene.enter({ adventureId: 'space_lunch', step: 0 }); contentGame.scenes.last = null; await dragonScene.finishAdventure(); assert.deepEqual(contentGame.scenes.last.data.celebrateNext, [], 'Replaying a finished world does not hatch its dragon again'); }
{ const dragonSave = new SaveSystem({ indexedDBRef:null, storage:null }); await dragonSave.init(); await dragonSave.createProfile({ name:'Dee', age:4 });
  const g = { save:dragonSave, learning:new LearningProfile(), audio:sceneAudio, assets:null, scenes:{ last:null, change(name,data){ this.last={name,data}; } } };
  g.activityEngine = new ActivityEngine(g); g.activityEngine.setDefinitions(activityData); g.adventureEngine = new AdventureEngine(g); g.adventureEngine.setDefinitions(adventureData); g.rewards = new RewardSystem(g); g.rewards.setDefinitions(rewardData);
  const townAll = adventureData.adventures.filter(a => a.world === 'town'), finale = townAll.findLast(a => a.bonusLook);
  const town = [...townAll.filter(a => a !== finale), finale]; // played last: a mission that also gives a look
  for (const a of town.slice(0, -1)) await dragonSave.saveAdventure(a.id, 0, { completed:true });
  const last = new AdventureScene(g); await last.enter({ adventureId: town.at(-1).id, step: town.at(-1).steps.length - 1 }); await last.handlePointer({type:'down',x:960,y:950});await last.handlePointer({type:'up',x:960,y:950});
  assert.equal(g.scenes.last.name, 'island'); assert.deepEqual(g.scenes.last.data.celebrateNext, [town.at(-1).bonusLook, 'dragon_puzzle'], 'The last Busy Town mission celebrates its reward and its new look, then hatches the Puzzle Dragon');
  const isl = new WonderIslandScene(g); isl.enter(g.scenes.last.data); assert.equal(isl.celebrateReward, town.at(-1).reward.id); isl.update(5); assert.equal(isl.celebrateReward, town.at(-1).bonusLook, 'Island celebrates the new look after the mission reward'); isl.update(5); assert.equal(isl.celebrateReward, 'dragon_puzzle', 'Island celebrates the dragon after the mission reward'); isl.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
  const col = new CollectionScene(g); col.enter({ tab:'dragons' }); assert.equal(col.items().length, 7); col.render(fakeCtx); assert.equal(fakeCtx.depth, 0, 'Dragons tab render must balance Canvas state');
  await col.action('item:dragon_space'); assert.ok(!dragonSave.getProfileState().unlocks.creatures.includes('dragon_space'), 'Dragons cannot be bought with stars'); }
{ const jamSave = new SaveSystem({ indexedDBRef:null, storage:null }); await jamSave.init(); await jamSave.createProfile({ name:'Jo', age:3 });
  const jl = new LearningProfile(); const jg = { save:jamSave, learning:jl, audio:sceneAudio, scenes:{ last:null, change(name,data){ this.last={name,data}; } } }; jg.rewards = new RewardSystem(jg); jg.rewards.setDefinitions(rewardData);
  for (const id of ['FAST_SLOW','LOUD_QUIET','RHYTHM','SOUND_RECOGNITION']) jl.recordResponse({ activityId:'jam', skillIds:[id], outcome:'success' });
  const j = new JungleJamScene(jg); j.enter(); j.record(['RHYTHM']); await jamSave.writeChain; assert.ok(jamSave.getProfileState().unlocks.creatures.includes('dragon_music'), 'All four Jungle Jam games earn the Music Dragon');
  j.render(fakeCtx); assert.equal(fakeCtx.depth, 0); j.handlePointer({ type:'down', x:100, y:90 }); j.handlePointer({ type:'up', x:100, y:90 }); assert.equal(jg.scenes.last.name, 'island'); assert.equal(jg.scenes.last.data.celebrateReward, 'dragon_music'); j.exit(); }
const job06Map = JSON.parse(fs.readFileSync(path.join(root,'data/art_map.json'),'utf8')), job06Ids = new Set(JSON.parse(fs.readFileSync(path.join(root,'assets/art_manifest.json'),'utf8')).map(e => e.id));
for (const [theme, id] of Object.entries(job06Map.backgrounds).filter(([k]) => k !== 'about')) assert.ok(job06Ids.has(id), `Background for ${theme} must exist`);
for (const a of activityData.activities.filter(a => a.world === 'space' || a.world === 'town')) assert.ok(String(a.theme).startsWith(a.world), `${a.id} uses a ${a.world} scene`);
for (const a of activityData.activities.filter(a => a.world === 'space' || a.world === 'town')) for (const o of [...(a.objects ?? []), ...(a.choices ?? []), ...(a.targets ?? []), ...(a.pairs ?? []).flatMap(p => p.items ?? [p]), ...(a.sequence ?? [])]) if (o.thing) assert.ok(job06Map.things.art[o.thing], `${a.id}: picture name '${o.thing}' is in art_map things`);

// Job 06 Part 4: more of the art in use — catalogue friends/decor/houses/seasons/looks, bought things on the island.
{ const shopSave = new SaveSystem({ indexedDBRef:null, storage:null }); await shopSave.init(); await shopSave.createProfile({ name:'Shop', age:4 }); await shopSave.addDiscoveryStars(20);
  const sg = { save:shopSave, audio:sceneAudio, scenes:{ last:null, change(name,data){ this.last={name,data}; } } }; sg.rewards = new RewardSystem(sg); sg.rewards.setDefinitions(rewardData);
  const col = new CollectionScene(sg);
  for (const tab of ['creatures','cosmetics','decorations','buildings','seasons','vehicles','dragons']) { col.enter({ tab }); assert.ok(col.items().length > 0, `Collection tab ${tab} has things`); col.render(fakeCtx); assert.equal(fakeCtx.depth, 0); }
  col.enter({ tab:'seasons' }); assert.ok(col.items().every(r => r.season), 'Seasons tab only shows seasonal decorations');
  const snowman = 'catalog_winter_snowman'; assert.equal((await sg.rewards.unlockWithStars(snowman)).ok, true);
  const shopIsland = new WonderIslandScene(sg); shopIsland.enter(); assert.ok(shopIsland.objects.some(o => o.id === snowman), 'Bought decorations appear on Wonder Island'); shopIsland.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
  shopIsland.placementMode = true; shopIsland.render(fakeCtx); assert.equal(fakeCtx.depth, 0); }
for (const id of ['m17_meet_new_animals','m17_whose_footprints','m20_name_the_feeling','m20_bathroom_things','m20_weather_snow','m20_hot_or_cold','m16_number_stones','rainbow_colour_friends','rainbow_shape_friends']) assert.ok(adventureData.adventures.some(a => a.steps.some(st => st.activityId === id)), `${id} is played inside a Little Mission`);

// Job 06 Part 5: lazy-load new worlds, tablet-friendly layouts.
{ const starter = JSON.parse(fs.readFileSync(path.join(root,'data/art_map.json'),'utf8')).preload.starter;
  assert.ok(!starter.some(id => /backgrounds|space|worlds.town|town_helpers|vehicles|dragon/.test(id)), 'New worlds and dragons are never loaded at boot (starter set)');
  for (const a of activityData.activities.filter(a => ['space','town'].includes(a.world))) {
    for (const o of [...(a.objects ?? []), ...(a.choices ?? []), ...(a.pairs ?? []).flatMap(p => p.items ?? [p])]) {
      if (o.x == null) continue; const r = (o.size ?? 150) / 2;
      assert.ok(o.x - r >= 60 && o.x + r <= 1860 && o.y - r >= 230 && o.y + r <= 1030, `${a.id}: ${o.id ?? o.thing ?? o.kind} keeps clear of the screen edges and title`);
      if (!['CountAndPlace','QuantityCompare','PatternComplete'].includes(a.type)) assert.ok((o.size ?? 150) >= 100, `${a.id}: tap targets are at least as big as the existing smallest (100)`);
    }
    for (const t of a.targets ?? []) if (t.x != null) assert.ok(t.x - (t.w ?? 300) / 2 >= 60 && t.x + (t.w ?? 300) / 2 <= 1860, `${a.id}: target ${t.id} keeps clear of the screen edges`);
  } }

// World select + generic hub navigation.
const navGame={adventureEngine,save:contentSave,audio:sceneAudio,scenes:{last:null,change(name,data){this.last={name,data};}}};
const worldSelect=new WorldSelectScene(navGame);worldSelect.enter();worldSelect.render(fakeCtx);assert.equal(fakeCtx.depth,0);
worldSelect.handlePointer({type:'down',x:1400,y:400});worldSelect.handlePointer({type:'up',x:1400,y:400});assert.equal(navGame.scenes.last,null,'Job 12: Pip walks into the portal first');worldSelect.render(fakeCtx);assert.equal(fakeCtx.depth,0);worldSelect.update(.6);assert.equal(navGame.scenes.last.name,'worldHub');assert.equal(navGame.scenes.last.data.world,'animal');
const dinoHub=new WorldHubScene(navGame);await dinoHub.enter({world:'dino'});assert.equal(dinoHub.missions.length,adventureData.adventures.filter(a=>a.world==='dino').length);dinoHub.render(fakeCtx);assert.equal(fakeCtx.depth,0);dinoHub.handlePointer({type:'down',x:1100,y:970});dinoHub.handlePointer({type:'up',x:1100,y:970});assert.equal(dinoHub.page,1,'Dino Valley hub should page through more than six missions');dinoHub.exit();

// Jungle Jam: free placement plus tempo/dynamics/rhythm/sound learning modes.
const jamLearning=new LearningProfile();const jamGame={learning:jamLearning,audio:sceneAudio,save:contentSave,scenes:{last:null,change(name,data){this.last={name,data};}}};
const jam=new JungleJamScene(jamGame);jam.enter();const firstPerformer=jam.performers[0],firstSlot=jam.slots[0];jam.handlePointer({type:'down',x:firstPerformer.x,y:firstPerformer.y});jam.handlePointer({type:'move',x:firstSlot.x,y:firstSlot.y});jam.handlePointer({type:'up',x:firstSlot.x,y:firstSlot.y});assert.equal(firstPerformer.placed,true,'Free Jam should allow performers to be dragged onto stage slots');
jam.setMode('tempo');const tempoX=jam.goal==='fast'?700:1100;jam.handlePointer({type:'down',x:tempoX,y:760});assert.ok(jamLearning.getSkill('FAST_SLOW').attempts>0,'Tempo mode should record fast/slow learning');
jam.setMode('dynamics');const dynX=jam.goal==='loud'?700:1100;jam.handlePointer({type:'down',x:dynX,y:760});assert.ok(jamLearning.getSkill('LOUD_QUIET').attempts>0,'Dynamics mode should record loud/quiet learning');
jam.setMode('rhythm');const baseTap=1000,expectedGap=jam.tempo==='fast'?360:720;for(let i=0;i<3;i++)jam.handlePointer({type:'down',x:960,y:760,timeStamp:baseTap+i*expectedGap});assert.ok(jamLearning.getSkill('RHYTHM').attempts>0,'Rhythm mode should record repeated beat attempts');
jam.setMode('sound');const soundPerformer=jam.performers.find(p=>p.role===jam.soundGoal);jam.handlePointer({type:'down',x:soundPerformer.x,y:soundPerformer.y});assert.ok(jamLearning.getSkill('SOUND_RECOGNITION').attempts>0,'Sound mode should record sound recognition');jam.render(fakeCtx);assert.equal(fakeCtx.depth,0);jam.exit();

// Dynamic name-letter activity resolves against the active child profile.
const nameDef=contentGame.activityEngine.create('m19_name_initial',makeHost('m19_name_initial')).definition;
assert.equal(nameDef.request.value,'S');assert.ok(nameDef.skills.includes('LETTER_S'));assert.ok(nameDef.instructionText.includes('Sam'));

// ---- Milestone 21: parent area ----
contentGame.learning.recordResponse({activityId:'parent-demo',skillIds:['COUNT_3'],outcome:'success'});
const parentGame={...contentGame,applyFamilySettings(settings){this.applied=settings;this.audio?.setQuietMode?.(Boolean(settings.quietMode));}};
const parentArea=new ParentGateScene(parentGame);parentArea.enter();parentArea.handlePointer({type:'down',x:960,y:610});parentArea.update(2.05);assert.equal(parentArea.unlocked,true);parentArea.render(fakeCtx);assert.equal(fakeCtx.depth,0,'Parent dashboard render should balance Canvas state');assert.ok(parentArea.learningBuckets().recent.some(s=>s.id==='COUNT_3'));
await parentArea.action('quiet');await contentSave.writeChain;assert.equal(contentSave.getSettings().quietMode,true,'Parent quiet-mode setting should persist');assert.equal(parentArea.exportData(),true,'Parent area should expose a local data export path');

// ---- Milestone 22: accessibility pass ----
assert.ok('reducedMotion' in contentSave.getSettings());assert.ok('uiScale' in contentSave.getSettings());assert.ok('colorSymbols' in contentSave.getSettings());
await parentArea.action('motion');await parentArea.action('uiScale');await parentArea.action('colorSymbols');await contentSave.writeChain;
assert.equal(contentSave.getSettings().reducedMotion,true);assert.ok(contentSave.getSettings().uiScale>1);assert.equal(contentSave.getSettings().colorSymbols,false);
const soundVisual=activityData.activities.find(a=>a.id==='m17_sound_cow');assert.ok(soundVisual.promptText,'Sound tasks must retain a visual/text prompt alternative');

// ---- Milestone 23: offline PWA pass ----
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'landscape-primary');assert.ok((manifest.icons??[]).some(i=>i.sizes==='192x192'));assert.ok((manifest.icons??[]).some(i=>i.sizes==='512x512'));
assert.ok(!serviceWorkerSource.includes('skipWaiting()'),'PWA updates must wait rather than replace the service worker mid-session');// Claiming is only allowed on the very first install (no earlier version running), never on an update.
assert.ok((serviceWorkerSource.match(/clients.claim()/g)??[]).length<=1&&!/[^?]s*self.clients.claim()/.test(serviceWorkerSource.replace('firstInstall ? self.clients.claim()','')),'PWA updates must not claim an active child session');assert.ok(serviceWorkerSource.includes('firstInstall = !self.registration.active'),'Only a first install may look after the open page');assert.ok(serviceWorkerSource.includes("'./assets/icons/icon-192.png'"));assert.ok(serviceWorkerSource.includes("'./assets/icons/icon-512.png'"));

// ---- Milestone 24: measurable performance pass ----
const qualityEvents=[];const perf=new PerformanceManager({onQualityChange:(q,reason)=>qualityEvents.push({q,reason})});perf.start();
for(let i=0;i<100;i++)perf.record({frameMs:25,updateMs:2,renderMs:16,now:2100+i*25});
perf.lastEvaluationAt=0;perf.evaluateAuto();perf.evaluateAuto();assert.equal(perf.quality.id,'balanced','Auto performance should downgrade from High when sustained 60 FPS budget is missed');
perf.setRequestedMode('lite');assert.equal(perf.quality.targetFps,30);assert.equal(perf.quality.dprCap,1.25);perf.suspend();assert.equal(perf.sampleCount,0);perf.resume();assert.equal(perf.sampleCount,0);
assert.ok(contentSave.getSettings().performanceMode,'Performance preference must have a persisted default');

// ---- Milestone 25: content scale pass ----
assert.ok(expectedActivityTypes.size>=25&&expectedActivityTypes.size<=30,`V1 scale target is 25–30 activity families; got ${expectedActivityTypes.size}`);
const coreSkills=Object.keys(TRACKED_SKILLS).filter(id=>!/^LETTER_[A-Z]$/.test(id));assert.ok(coreSkills.length>=50&&coreSkills.length<=70,`V1 core learning-skill target is 50–70; got ${coreSkills.length}`);
assert.ok(adventureData.adventures.length>=64&&adventureData.adventures.length<=90,`Little Mission target is 8+ in each of the 8 worlds (Job 12); got ${adventureData.adventures.length}`);
const rewardCounts=rewardData.rewards.reduce((m,r)=>(m[r.type]=(m[r.type]??0)+1,m),{});assert.ok((rewardCounts.creatures??0)>=30,'V1 needs 30+ interactive creature definitions');assert.ok((rewardCounts.cosmetics??0)>=40,'V1 needs 40+ Pip cosmetics');assert.ok((rewardCounts.decorations??0)>=60,'V1 needs 60+ decorations');assert.ok((rewardCounts.vehicles??0)>=8,'V1 needs 8+ vehicles (Job 10 added the 60 vehicle pictures as rides)');
const catalogSave=new SaveSystem({indexedDBRef:null,storage:null});await catalogSave.init();await catalogSave.createProfile({name:'Kit',age:4});await catalogSave.addDiscoveryStars(10);
const catalogGame={save:catalogSave,audio:sceneAudio,scenes:{last:null,change(name,data){this.last={name,data};}}};catalogGame.rewards=new RewardSystem(catalogGame);catalogGame.rewards.setDefinitions(rewardData);
const firstCatalog=catalogGame.rewards.listCatalog('cosmetics')[0];assert.ok(firstCatalog);const unlocked=await catalogGame.rewards.unlockWithStars(firstCatalog.id);assert.equal(unlocked.ok,true);assert.ok(catalogSave.getProfileState().unlocks.cosmetics.includes(firstCatalog.id));await catalogSave.setPipOutfit({cosmeticId:firstCatalog.id});assert.equal(catalogSave.getProfileState().pip.outfit.cosmeticId,firstCatalog.id);
const collection=new CollectionScene(catalogGame);collection.enter({tab:'cosmetics'});collection.render(fakeCtx);assert.equal(fakeCtx.depth,0,'Collection render should balance Canvas state');collection.handlePointer({type:'down',x:45,y:50});collection.handlePointer({type:'up',x:45,y:50});assert.equal(catalogGame.scenes.last?.name,'island');

// ---- Milestone 26 support: local child observation recorder (human gate remains pending) ----
const childTestSave=new SaveSystem({indexedDBRef:null,storage:null});await childTestSave.init();
const childTest=new ChildTestRecorder({save:childTestSave,clock:(()=>{let t=1000;return()=>t+=500;})()});childTest.start({age:3});childTest.recordPointer({type:'down'});childTest.recordActivityStart('feed_bunny_3');childTest.recordResponse({outcome:'incorrect'});childTest.recordLostDrag();childTest.recordHint(3);childTest.mark('asked-replay');childTest.recordActivityComplete();const childReport=await childTest.stop();
assert.equal(childReport.age,3);assert.equal(childReport.incorrectAttempts,1);assert.equal(childReport.lostDrags,1);assert.equal(childReport.hintCount,1);assert.equal(childReport.maxHintLevel,3);assert.equal(childReport.activitiesCompleted,1);assert.equal(childTestSave.listChildTestSessions().length,1,'Child observations should persist locally without a child account');

// ---- Milestone 27: parent trust / privacy pass ----
assert.ok(PRIVACY_GUARANTEES.length>=8,'Privacy contract should explicitly cover the V1 trust guarantees');
const runtimeText=[fs.readFileSync(path.join(root,'index.html'),'utf8'),...walk(path.join(root,'src')).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(f,'utf8'))].join('\n');
for(const forbidden of ['getUserMedia','navigator.mediaDevices','WebSocket(','EventSource(','RTCPeerConnection','window.open(','target="_blank"','doubleclick.net','googlesyndication','facebook.com/tr']) assert.ok(!runtimeText.includes(forbidden),`Runtime must not include ${forbidden}`);
assert.ok(!/https?:\/\//.test(fs.readFileSync(path.join(root,'index.html'),'utf8')),'Child shell must not contain external URLs');
const privacyParent=new ParentGateScene({...parentGame,childTest});privacyParent.enter({skipGate:true,tab:'privacy'});privacyParent.render(fakeCtx);assert.equal(fakeCtx.depth,0,'Privacy screen render must balance Canvas state');

// ---- Milestone 28: launch polish systems ----
const fx=new FeedbackFX();fx.cue('correct',{x:900,y:600});fx.cue('reward',{x:960,y:500});assert.ok(fx.particles.length>0);fx.update(.1);fx.render(fakeCtx);assert.equal(fakeCtx.depth,0,'Feedback FX rendering must balance Canvas state');
assert.ok(serviceWorkerSource.includes("'./assets/art/meadow_picnic_clearing.png'"),'Approved meadow artwork should be available offline');
assert.ok(serviceWorkerSource.includes("'./src/fx/FeedbackFX.js'"),'Launch feedback FX should be cached offline');

// Save recovery / low-storage foundation.
class TinyStorage{constructor(values={}){this.map=new Map(Object.entries(values));}getItem(k){return this.map.get(k)??null;}setItem(k,v){this.map.set(k,String(v));}}
const backupRoot={version:1,activeProfileId:null,profiles:[],profileStates:{},settings:{}};const recoveryStorage=new TinyStorage({'little-legends':'{bad json','little-legends-backup':JSON.stringify(backupRoot)});const recoverySave=new SaveSystem({indexedDBRef:null,storage:recoveryStorage});await recoverySave.init();assert.equal(recoverySave.getSaveHealth().recovered,true,'Corrupt primary local save should recover from backup');assert.equal(recoverySave.getSaveHealth().saveVersion,2,'Save migration should advance to v2');



// ---- Milestone 29: release qualification evidence tooling (human/device pass still external) ----
const qaSave=new SaveSystem({indexedDBRef:null,storage:null});await qaSave.init();
const qaGame={save:qaSave,assets:{failures:new Map()},runtimeErrorCount:0,suspendCount:2,resumeCount:2,getPerformanceReport(){return{sampleCount:120,averageFps:59.4,quality:'high',targetFps:60,averageFrameMs:16.8,p95FrameMs:18.2,averageRenderMs:4.1,dprCap:2,effectScale:1,downgradeCount:0};}};
const fakeNav={userAgent:'LittleLegendsTest/1',platform:'TestTablet',language:'en-AU',onLine:true,maxTouchPoints:10,storage:{async estimate(){return{usage:1024,quota:1024*1024};},async persisted(){return true;}}};
const releaseQA=new ReleaseQualification({game:qaGame,save:qaSave,navigatorRef:fakeNav,screenRef:{width:2048,height:1536,availWidth:2048,availHeight:1536,orientation:{type:'landscape-primary'}},windowRef:{innerWidth:1024,innerHeight:768,devicePixelRatio:2,matchMedia(){return{matches:false};}},documentRef:{documentElement:{}},clock:(()=>{let t=2000;return()=>++t;})()});
await releaseQA.init();assert.equal(RELEASE_MANUAL_CHECKS.length>=18,true,'M29 checklist should cover child, device, experience and parent gates');
const autoQA=await releaseQA.runAutomatedChecks();assert.ok(autoQA.checks.some(c=>c.id==='save-write'&&c.status==='pass'));assert.ok(autoQA.checks.some(c=>c.id==='performance-samples'&&c.status==='pass'));
const snap=await releaseQA.captureDeviceSnapshot();assert.equal(snap.platform,'TestTablet');assert.equal(snap.viewport.dpr,2);assert.equal(snap.storage.persisted,true);
await releaseQA.setManualStatus('ipad-performance','pass','tested on target iPad');assert.equal(qaSave.getReleaseQualification().manual['ipad-performance'].status,'pass','Manual release evidence should persist locally');
assert.equal(releaseQA.summary().ready,false,'Release must remain not-ready while human/device checks are pending');
const releaseParent=new ParentGateScene({...parentGame,releaseQA});releaseParent.enter({skipGate:true,tab:'release'});releaseParent.render(fakeCtx);assert.equal(fakeCtx.depth,0,'Release qualification screen must balance Canvas state');assert.equal(releaseParent.exportReleaseReport(),true,'Parent area should expose release qualification export');
assert.ok(serviceWorkerSource.includes("'./src/testing/ReleaseQualification.js'"),'Release qualification tooling should be cached offline');

// ---- Job 01: real art wired in, every picture falls back to its drawn placeholder ----
const artManifest=JSON.parse(fs.readFileSync(path.join(root,'assets/art_manifest.json'),'utf8'));
const artIds=new Set(artManifest.map(e=>e.id));
for(const e of artManifest)assert.ok(fs.existsSync(path.join(root,e.url)),`Art manifest file missing: ${e.url}`);
const artMapData=JSON.parse(fs.readFileSync(path.join(root,'data/art_map.json'),'utf8'));
(function checkIds(o,where){if(typeof o==='string'){if(/^(art|characters|creatures|fx|objects|rewards|ui|worlds)\.[a-z0-9_.]+$/.test(o))assert.ok(artIds.has(o),'art_map '+where+' names unknown art id '+o);}else if(o&&typeof o==='object')for(const [k,v] of Object.entries(o))checkIds(v,where+'.'+k);})(artMapData,'');
for(let n=0;n<=20;n++)assert.ok(artIds.has(artMapData.numerals.id.replace('{n}',n)),'Number art '+n+' should exist');
for(const l of 'abcdefghijklmnopqrstuvwxyz'){assert.ok(artIds.has(artMapData.letters.upper.replace('{l}',l)));assert.ok(artIds.has(artMapData.letters.lower.replace('{l}',l)));}
assert.equal(art('characters.pip.pip_front'),null,'With no art index loaded, art() must return null');
class ArtCanvasContext extends FakeCanvasContext{constructor(){super();this.images=[];}drawImage(img,x,y,w,h){this.images.push({img,w,h});}set globalCompositeOperation(v){this.blend=v;}get globalCompositeOperation(){return this.blend??'source-over';}}
const noArtCtx=new FakeCanvasContext();drawToken(noArtCtx,{kind:'apple',color:'red',x:500,y:500});drawToken(noArtCtx,{kind:'letter',value:'B',x:500,y:500},{highlight:true});assert.equal(noArtCtx.depth,0,'Placeholder token drawing must still balance Canvas state');
const fakePicture={naturalWidth:200,naturalHeight:100,width:200,height:100};const loadedArt=new Map();const requested=[];
globalThis.__LL_ASSETS={artMap:artMapData,get:id=>loadedArt.get(id),requestArt:id=>requested.push(id)};
assert.equal(tokenArt({kind:'apple',color:'red'}).id,'objects.food.apple_red');
assert.equal(tokenArt({kind:'circle',color:'blue'}),null,'Shapes only use a picture of the same colour');
assert.equal(tokenArt({kind:'egg',color:'purple'}),null,'Strict colour: no purple egg picture');
assert.equal(tokenArt({kind:'egg',color:'purple'},{colour:'uniform'}).id,'objects.dino_egg','Size/count tasks use one egg picture');
assert.equal(tokenArt({kind:'dinosaur',color:'green'},{colour:'uniform'}).id,tokenArt({kind:'dinosaur',color:'orange'},{colour:'uniform'}).id,'Uniform mode keeps size comparisons like-for-like');
assert.equal(tokenArt({kind:'letter',value:'b',case:'lower'}).id,'objects.letters_lower.lower_b');assert.equal(tokenArt({kind:'letter',value:'Q'}).id,'objects.letters.letter_q');
assert.equal(tokenArt({kind:'numeral',value:20}).id,'objects.numbers.num_20');assert.equal(tokenArt({kind:'numeral',value:21}),null);
assert.equal(tokenArt({kind:'word',symbol:'SOCK'}),null,'Unmapped words keep their placeholder');
const artCtx=new ArtCanvasContext();drawToken(artCtx,{kind:'apple',color:'red',x:500,y:500,size:150});assert.equal(artCtx.images.length,0,'Unloaded art falls back to the placeholder');assert.ok(requested.includes('objects.food.apple_red'),'Unloaded art is requested in the background');
loadedArt.set('objects.food.apple_red',fakePicture);drawToken(artCtx,{kind:'apple',color:'red',x:500,y:500,size:150});assert.equal(artCtx.images.length,1,'Loaded art is drawn');
const drawnApple=artCtx.images[0];assert.ok(Math.abs(drawnApple.w/drawnApple.h-2)<1e-9,'Art keeps its shape (no stretching)');assert.ok(drawnApple.w<=150,'Art stays inside the token box');assert.equal(artCtx.depth,0);
loadedArt.set('fx.fx_glow_gold',fakePicture);drawToken(artCtx,{kind:'apple',color:'red',x:500,y:500,size:150},{highlight:true});assert.equal(artCtx.depth,0);
loadedArt.set('objects.letters.letter_a',fakePicture);drawBin(artCtx,{x:500,y:500,w:210,h:210,label:'A'});assert.equal(artCtx.depth,0);
const artPip=new PipController({rng:()=>0.5});artPip.update(0.016);const pipCtx=new ArtCanvasContext();artPip.render(pipCtx);assert.equal(pipCtx.images.length,0,'Pip stays drawn while his pictures are not loaded');
for(const pose of Object.values(artMapData.pip.poses))loadedArt.set(pose.id,fakePicture);artPip.render(pipCtx);assert.equal(pipCtx.images.length,1,'Pip uses his real picture when loaded');assert.equal(pipCtx.depth,0);
for(const state of states){const p=new PipController({rng:()=>0.5});p.react(state);p.update(0.05);const c=new ArtCanvasContext();p.render(c);const keep=artMapData.pip.states[state]===null;assert.equal(c.depth,0,'Pip '+state+' render must balance Canvas state');assert.equal(c.images.length,keep?0:1,'Pip '+state+(keep?' should keep the placeholder':' should use art'));}
const fxArtCtx=new ArtCanvasContext();loadedArt.set('fx.fx_sparkles_gold',fakePicture);loadedArt.set('fx.ring_yellow',fakePicture);const artFx=new FeedbackFX();artFx.cue('correct',{x:900,y:600});artFx.update(.05);artFx.render(fxArtCtx);assert.ok(fxArtCtx.images.length>=2);assert.equal(fxArtCtx.blend,'screen','Glow effects use a light blend');assert.equal(fxArtCtx.depth,0);
const artGame={assets:null,save:null};artGame.activityEngine=new ActivityEngine(artGame);artGame.activityEngine.setDefinitions(activityData);artGame.adventureEngine=new AdventureEngine(artGame);artGame.adventureEngine.setDefinitions(adventureData);
const picnicArt=await artIdsForScene(artGame,'adventure',{adventureId:'rory_dino_picnic'});for(const id of ['characters.pip.pip_front','creatures.rory.rory_idle','objects.food.apple_red','objects.food.strawberry','objects.food.blueberry','objects.food.banana','objects.dino_egg'])assert.ok(picnicArt.includes(id),'Dino Picnic should preload '+id);
for(const id of picnicArt)assert.ok(artIds.has(id),'Preload names unknown art '+id);
// Job 02 found: starting world music while audio is unlocked used to recurse until the stack overflowed (world hubs bounced to the island).
const musicAudio=new AudioManager({contextFactory:()=>new FakeAudioContext()});musicAudio.unlock();musicAudio.startWorldMusic('dino');assert.ok(musicAudio.worldMusicTimer,'World music should start without recursing');musicAudio.stopWorldMusic?.();clearInterval(musicAudio.worldMusicTimer);
// Job 02: empty containers as counting targets, bone picture, arrow buttons.
const countDefs=activityData.activities.filter(a=>a.type==='CountAndPlace');
for(const def of countDefs){const box=countTargetArt(def);assert.ok(box&&artIds.has(box),'Counting target art missing for '+def.id);assert.notEqual(box,'objects.dino.food_bowl_dino','Counting targets must be empty containers');}
assert.equal(countTargetArt({object:'egg',character:'none'}),'objects.nest');assert.equal(countTargetArt({object:'apple',character:'bunny'}),'worlds.rainbow_build.basket_rainbow');assert.equal(countTargetArt({object:'strawberry',character:'rory'}),'objects.daily_life.plate');
const basketCtx=new ArtCanvasContext();loadedArt.set('objects.nest',fakePicture);drawBasket(basketCtx,{x:1480,y:720,w:360,h:270},3,true,'objects.nest');assert.equal(basketCtx.images.length,1,'Counting target uses its picture');assert.equal(basketCtx.depth,0);
const bones=activityData.activities.find(a=>a.id==='m16_less_bones');assert.equal(bones.symbol,'BONE');assert.equal(tokenArt({kind:bones.object,symbol:bones.symbol}).id,'objects.dino.bone','Less-bones uses the bone picture');
const btnCtx=new ArtCanvasContext();loadedArt.set('objects.town.sign_arrow',fakePicture);drawCandyButton(btnCtx,40,40,210,100,'BACK',false,'back');assert.equal(btnCtx.images.length,1,'BACK button shows the arrow');assert.equal(btnCtx.depth,0);
for(const id of await artIdsForScene(artGame,'adventure',{adventureId:'rory_dino_picnic'}))assert.ok(artIds.has(id));
assert.ok((await artIdsForScene(artGame,'adventure',{adventureId:'rory_dino_picnic'})).includes('objects.daily_life.plate'),"Dino Picnic preloads Rory's plate");
// Job 04: egg hatching — 6 frames per theme, gentle, skippable; the theme's baby only shows when it IS the reward.
for(const theme of new Set([...Object.values(artMapData.hatch.worlds),...Object.values(artMapData.hatch.rewards).map(r=>r.theme)])){const frames=hatchFrameIds(theme);assert.equal(frames.length,6);for(const id of frames)assert.ok(artIds.has(id),'Hatch frame missing '+id);assert.ok(artIds.has(artMapData.hatch.bursts[theme]),'Hatch burst missing for '+theme);}
assert.equal(hatchTheme('baby_raptor','dino'),'dino');assert.equal(hatchTheme('fox_cub','animal'),'forest');assert.equal(hatchTheme('catalog_mossy_turtle',null),'ocean');
for(const r of rewardData.rewards.filter(r=>r.type==='creatures'&&r.catalog))assert.ok(artMapData.hatch.rewards[r.id],'Catalogue creature needs an egg theme: '+r.id);
for(const id of hatchFrameIds('dino'))loadedArt.set(id,{...fakePicture,id});loadedArt.set('fx.hatch.burst_dino',fakePicture);loadedArt.set('fx.magic.pedestal_glow',fakePicture);
const hatchRun=new HatchSequence({theme:'dino',rewardId:'baby_raptor'}).play();const seen=[];for(let i=0;i<40;i++){hatchRun.update(.08);seen.push(hatchRun.frameIndex());const c=new ArtCanvasContext();assert.equal(hatchRun.render(c,960,780,400),true);assert.equal(c.depth,0);}
assert.deepEqual([...new Set(seen)],[0,1,2,3,4,5],'Hatch plays idle → wobble → small crack → big crack → peek → hatched in order');assert.ok(hatchRun.finished,'Hatch finishes in about 3 seconds');
const skipped=new HatchSequence({theme:'dino',rewardId:'baby_raptor'}).play();skipped.update(.1);skipped.skip();assert.ok(skipped.finished,'Tap skips the hatch');
const notBaby=new HatchSequence({theme:'dino',rewardId:'baby_triceratops'}).play();notBaby.update(2.6);const nbCtx=new ArtCanvasContext();notBaby.render(nbCtx,960,780,400);assert.ok(!nbCtx.images.some(im=>[4,5].map(i=>hatchFrameIds('dino')[i]).includes(im.img.id)),'Another reward never shows the theme baby (peek/hatched)');assert.equal(notBaby.showBaby,false,'Another reward must not show the theme baby');
const hatchBurstCtx=new ArtCanvasContext();const burstRun=new HatchSequence({theme:'dino',rewardId:'baby_raptor'}).reveal();burstRun.update(.4);burstRun.render(hatchBurstCtx,960,780,400);assert.equal(hatchBurstCtx.blend,'screen','Hatch burst uses the light blend');
const manual=new HatchSequence({theme:'dino',rewardId:'baby_raptor'}).showStage(3);manual.update(5);assert.equal(manual.frameIndex(),3,'Tap-to-hatch holds the frame for the current egg state');assert.equal(manual.finished,false);
const islandHatch=await artIdsForScene(artGame,'island',{celebrateReward:'fox_cub'});assert.ok(islandHatch.includes('rewards.hatch.forest.egg_forest_1_idle'),'Island preloads the forest egg for Fox Cub');
assert.ok((await artIdsForScene(artGame,'adventure',{adventureId:'rory_dino_picnic'})).includes('rewards.hatch.dino.egg_dino_6_hatched'),'Dino Picnic preloads its hatch');
assert.ok(serviceWorkerSource.includes("'./src/fx/HatchSequence.js'"));
const plainIsland=await artIdsForScene(artGame,'island',{});assert.ok(!plainIsland.includes('creatures.forest.bear'),'Island only preloads rewards the child owns');
assert.equal(islandHatch[0],'rewards.hatch.forest.egg_forest_1_idle','Celebration egg loads first');
assert.ok((await artIdsForScene(artGame,'adventure',{adventureId:'animal_baby_rescue'})).includes('rewards.hatch.farm.egg_farm_6_hatched'),'A mission that wins a creature preloads its egg for the island hatch');
assert.ok(/ART_PARALLEL = [1-4];/.test(serviceWorkerSource)&&serviceWorkerSource.includes("'cache-art'"),'Offline art caching must be gentle (a few at a time, after the game loads)');
assert.ok(!serviceWorkerSource.includes('cache.addAll(CORE).then(() => cacheArt'),'Install must not download every picture at once');
delete globalThis.__LL_ASSETS;
assert.ok(serviceWorkerSource.includes("'./assets/art_manifest.json'")&&serviceWorkerSource.includes('cacheArt('),'Offline cache should include every picture in the art manifest');

// ---- Job 08: toddler rules (spoken + repeated instructions, hints after two misses, a grown-up way out) ----
{
  const said = [];
  const sayHost = { activity: null, completed: false, pip: { react() {}, say(id, o) { said.push(o.text); return true; } }, repeatInstruction() { said.push('repeat'); }, hideHintDemo() {}, showHintDemo() {} };
  sayHost.activity = { setHint() {}, getHintContext: () => null, configuredSkills: () => [] };
  const idle = new HintController({ host: sayHost, delays: { young: 99 } });
  idle.update(VOICE_REPEAT_SECONDS - 0.1); assert.equal(said.length, 0);
  idle.update(0.2); assert.equal(said.length, 1, 'With no touch for ~8 s Pip says the instruction again');
  idle.onInput(); idle.update(VOICE_REPEAT_SECONDS - 0.5); assert.equal(said.length, 1, 'A touch restarts the 8 s wait');
  for (let i = 0; i < 10; i++) idle.update(VOICE_REPEAT_SECONDS); assert.ok(said.length <= 5, 'Repeats stop after a few until the child touches again');
  const misses = new HintController({ host: sayHost, delays: { young: 99 } });
  misses.onMiss(); assert.equal(misses.currentLevel, 0, 'One miss: no hint yet');
  misses.onMiss(); assert.ok(misses.currentLevel >= 3, 'Two misses in a row: the picture hint shows');
  misses.onProgress(); misses.onMiss(); assert.equal(misses.currentLevel, 0, 'A right answer resets the miss count');
  // Every activity used in a mission has a spoken instruction, with real words (never "{target}").
  const missionActivityIds = new Set(adventureData.adventures.flatMap(a => a.steps.map(s => s.activityId)).filter(Boolean));
  for (const id of missionActivityIds) {
    const host = makeHost(id), activity = activityEngine.create(id, host); activity.start();
    const text = activity.spokenInstruction();
    assert.ok(text && !/[{}]|undefined/.test(text), `${id} must say its instruction out loud (got "${text}")`);
  }
  // Hold to leave: a tap does nothing, a 1.5 s hold leaves.
  let left = 0; const leave = new HoldToLeave({ onLeave: () => left++ });
  assert.equal(leave.handlePointer({ type: 'down', x: 1830, y: 100 }), true); leave.update(0.3); leave.handlePointer({ type: 'up', x: 1830, y: 100 }); leave.update(2);
  assert.equal(left, 0, 'A quick tap on the home button must not leave the mission');
  leave.handlePointer({ type: 'down', x: 1830, y: 100 }); leave.update(0.8); leave.update(0.8); assert.equal(left, 1, 'Holding the home button leaves');
  assert.equal(leave.handlePointer({ type: 'down', x: 960, y: 600 }), false, 'Taps elsewhere still reach the activity');
  leave.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
  drawSpeechBubble(fakeCtx, 'A very long thing for Pip to say that would not fit in the bubble', 30, 240); assert.equal(fakeCtx.depth, 0);
}

// ---- Job 08: 30 FPS (Lite) pacing holds on real screens, whose refreshes wobble by a millisecond or so ----
{
  globalThis.requestAnimationFrame ??= () => 0; globalThis.cancelAnimationFrame ??= () => {};
  const paced = (screenHz, targetFps, seconds = 10) => {
    let renders = 0; const loop = new GameLoop({ update() {}, render() { renders++; }, targetFps });
    loop.running = true; loop.last = 0; const period = 1000 / screenHz;
    for (let i = 1; i <= screenHz * seconds; i++) loop.tick(i * period + Math.sin(i * 12.9898) * 0.8);
    return renders / seconds;
  };
  for (const hz of [60, 120]) assert.ok(paced(hz, 30) >= 29.5 && paced(hz, 30) <= 30.5, `Lite mode should draw 30 FPS on a ${hz} Hz screen (got ${paced(hz, 30).toFixed(1)})`);
  assert.ok(paced(60, 60) >= 59, 'High mode should draw every refresh on a 60 Hz screen');
}

// ---- Job 09: Pip's wardrobe (60 looks, worn one per slot, placed on pip_front from data) ----
{
  const map = JSON.parse(fs.readFileSync(path.join(root, 'data/art_map.json'), 'utf8'));
  const manifestIds = new Set(JSON.parse(fs.readFileSync(path.join(root, 'assets/art_manifest.json'), 'utf8')).map(e => e.id));
  const cosmetics = rewardData.rewards.filter(r => r.type === 'cosmetics');
  const wardrobeIds = Object.keys(map.wardrobe.items);
  assert.equal(wardrobeIds.length, 60, 'All 60 wardrobe pictures are placed on Pip');
  for (const id of wardrobeIds) {
    assert.ok(manifestIds.has(id) && fs.existsSync(path.join(root, 'assets', ...id.split('.').slice(0, -1), `${id.split('.').at(-1)}.png`)), `Wardrobe picture ${id} exists`);
    const item = map.wardrobe.items[id];
    assert.ok(SLOTS.includes(item.slot) && item.parts.length, `${id} has a slot and parts`);
    for (const p of item.parts) assert.ok([p.x, p.y, p.w].every(Number.isFinite) && p.w > 0, `${id} part has x, y, w`);
    const reward = cosmetics.find(r => map.cosmetics[r.id] === id);
    assert.ok(reward, `${id} is a LOOKS reward`); assert.equal(map.rewards[reward.id], id, `${reward.id} card shows its picture`);
    assert.equal(slotOf(reward), item.slot, `${reward.id} sits in its own tab's slot`);
  }
  assert.equal(map.cosmetics.catalog_explorer_hat, 'objects.wardrobe.hats.hat_pith_explorer', 'Explorer Hat uses the pith helmet');
  for (const [id, pic] of [['catalog_bunny_ears','hats.ears_bunny'],['catalog_frog_hat','hats.headband_frog'],['catalog_heart_glasses','glasses.glasses_heart'],['catalog_dino_backpack','backpacks.backpack_dino_tail']]) assert.equal(map.cosmetics[id], `objects.wardrobe.${pic}`, `${id} placeholder now has its picture`);
  for (const r of cosmetics) assert.ok(LOOK_TABS.some(([t]) => t === r.look), `${r.id} is in a LOOKS tab`);
  for (const [tab] of LOOK_TABS) assert.ok(cosmetics.filter(r => r.look === tab).length >= 6, `LOOKS tab ${tab} has looks`);
  const bonus = adventureData.adventures.filter(a => a.bonusLook);
  for (const a of bonus) assert.equal(rewardData.rewards.find(r => r.id === a.bonusLook)?.type, 'cosmetics', `${a.id} bonus look is a look`);
  for (const w of ['town', 'space', 'animal', 'rainbow']) assert.ok(bonus.some(a => a.world === w), `${w} missions give new looks`);
  assert.equal(new Set(bonus.map(a => a.bonusLook)).size, bonus.length, 'Each bonus look is given by one mission');

  globalThis.__LL_ASSETS = { artMap: map, get: () => undefined, requestArt: () => {} };
  const rs = new RewardSystem({}); rs.setDefinitions(rewardData);
  assert.deepEqual(wornLooks({ hat: 'starter-leaf', cosmeticId: 'catalog_star_glasses' }, rs), { eyes: 'catalog_star_glasses' }, 'A pre-Job 09 save keeps its one look');
  assert.deepEqual(wornLooks({ hat: 'starter-leaf', cosmeticId: 'dino_cap' }, rs), { head: 'dino_cap' });
  let outfit = { hat: 'starter-leaf', cosmeticId: 'dino_cap' };
  let change = toggleLook(outfit, rs, 'catalog_heart_glasses'); assert.deepEqual(change.worn, { head: 'dino_cap', eyes: 'catalog_heart_glasses' }, 'Glasses go on with the old hat');
  outfit = { ...outfit, ...change }; change = toggleLook(outfit, rs, 'look_onesie_frog');
  assert.equal(change.worn.body, 'look_onesie_frog'); assert.equal(change.worn.head, undefined, 'A onesie hood replaces the hat'); assert.equal(change.worn.eyes, 'catalog_heart_glasses');
  outfit = { ...outfit, ...change }; change = toggleLook(outfit, rs, 'catalog_explorer_hat');
  assert.equal(change.worn.head, 'catalog_explorer_hat'); assert.equal(change.worn.body, undefined, 'A hat takes the onesie off'); assert.equal(change.cosmeticId, 'catalog_explorer_hat', 'Older builds still see the newest look');
  outfit = { ...outfit, ...change }; change = toggleLook(outfit, rs, 'catalog_explorer_hat');
  assert.equal(change.wearing, false); assert.equal(change.worn.head, undefined, 'Tapping a worn look takes it off'); assert.equal(change.cosmeticId, 'catalog_heart_glasses');
  change = toggleLook({}, rs, 'look_outfit_police'); assert.deepEqual(change.worn, { body: 'look_outfit_police' }); assert.deepEqual(toggleLook({ worn: change.worn }, rs, 'catalog_bunny_ears').worn, { head: 'catalog_bunny_ears' }, "A hat replaces an outfit's own cap");

  const migrated = new SaveSystem({ indexedDBRef: null, storage: null }).migrate({ version: 3, activeProfileId: 'p', profiles: [{ id: 'p', name: 'Old', age: 3, createdAt: 1 }],
    profileStates: { p: { pip: { outfit: { hat: 'starter-leaf', cosmeticId: 'catalog_rainbow_cap' } }, unlocks: { cosmetics: ['catalog_rainbow_cap'] } } } });
  assert.equal(migrated.profileStates.p.pip.outfit.cosmeticId, 'catalog_rainbow_cap', 'Older saves keep their Pip look');
  assert.deepEqual(wornLooks(migrated.profileStates.p.pip.outfit, rs), { head: 'catalog_rainbow_cap' });
  const junk = new SaveSystem({ indexedDBRef: null, storage: null }).migrate({ activeProfileId: 'p', profiles: [{ id: 'p', name: 'J', age: 3, createdAt: 1 }], profileStates: { p: { pip: { outfit: { worn: { head: 'dino_cap', tail: 'x', eyes: 7 } } } } } });
  assert.deepEqual(junk.profileStates.p.pip.outfit.worn, { head: 'dino_cap' }, 'Unknown worn slots are dropped');

  const wardSave = new SaveSystem({ indexedDBRef: null, storage: null }); await wardSave.init(); await wardSave.createProfile({ name: 'Wren', age: 4 });
  await wardSave.setPipOutfit({ cosmeticId: 'dino_cap' }); await wardSave.award('cosmetics', 'dino_cap'); await wardSave.award('cosmetics', 'look_outfit_police'); await wardSave.award('cosmetics', 'catalog_heart_glasses');
  const wg = { save: wardSave, audio: sceneAudio, scenes: { last: null, change(name, data) { this.last = { name, data }; } } }; wg.rewards = new RewardSystem(wg); wg.rewards.setDefinitions(rewardData);
  const col = new CollectionScene(wg); col.enter({ tab: 'cosmetics' });
  for (const [tab] of LOOK_TABS) { await col.action(`look:${tab}`); assert.ok(col.items().length > 0 && col.items().every(r => lookTab(r) === tab), `LOOKS ${tab} tab lists its looks`); col.render(fakeCtx); assert.equal(fakeCtx.depth, 0); }
  assert.equal(col.controlAt({ x: 100, y: 232 + 2 * 100 + 40 }), 'look:outfits', 'LOOKS sub-tabs are tappable');
  await col.action('item:look_outfit_police'); await col.action('item:catalog_heart_glasses');
  const worn = wardSave.getProfileState().pip.outfit.worn;
  assert.equal(worn.body, 'look_outfit_police'); assert.equal(worn.eyes, 'catalog_heart_glasses');
  assert.equal(worn.head, undefined, "The police outfit's cap replaced the dino cap");
  assert.equal(col.pip.looks.length, 2, 'Pip wears every worn look');
  const isl = new WonderIslandScene(wg); isl.enter({}); assert.equal(isl.pip.looks.length, 2, 'Pip wears his looks on the island'); isl.render(fakeCtx); assert.equal(fakeCtx.depth, 0);

  // Drawn on Pip: behind him (back), over him (the rest); outfits keep him front-on; the wave pose keeps hats.
  const pic = { naturalWidth: 300, naturalHeight: 300, width: 300, height: 300 }, loaded = new Map();
  globalThis.__LL_ASSETS = { artMap: map, get: id => loaded.get(id), requestArt: () => {} };
  for (const pose of Object.values(map.pip.poses)) loaded.set(pose.id, { ...pic, id: pose.id });
  for (const id of wardrobeIds) loaded.set(id, { ...pic, id });
  class WardCtx extends FakeCanvasContext { constructor() { super(); this.drawn = []; } drawImage(img) { this.drawn.push(img.id); } }
  const dressed = new PipController({ rng: () => 0.5, looks: ['look_outfit_police', 'catalog_heart_glasses', 'look_wings_fairy'].map(id => rs.get(id)) });
  const c1 = new WardCtx(); dressed.render(c1); assert.equal(c1.depth, 0, 'Wardrobe drawing balances Canvas state');
  assert.equal(c1.drawn[0], 'objects.wardrobe.backpacks.wings_fairy', 'Wings go behind Pip'); assert.equal(c1.drawn[1], 'characters.pip.pip_front');
  assert.ok(c1.drawn.includes('objects.wardrobe.outfits.outfit_police') && c1.drawn.includes('objects.wardrobe.glasses.glasses_heart'), 'Outfit and glasses are drawn on Pip');
  dressed.react('celebrate'); dressed.update(0.05); const c2 = new WardCtx(); dressed.render(c2); assert.ok(c2.drawn.includes('characters.pip.pip_front') && c2.drawn.includes('objects.wardrobe.outfits.outfit_police'), 'A dressed Pip celebrates front-on, still dressed');
  const hatted = new PipController({ rng: () => 0.5, looks: [rs.get('catalog_explorer_hat')] }); hatted.react('wave'); hatted.update(0.05); const c3 = new WardCtx(); hatted.render(c3);
  assert.ok(c3.drawn.includes('characters.pip.pip_wave') && c3.drawn.includes('objects.wardrobe.hats.hat_pith_explorer'), 'Hats stay on when Pip waves');
  loaded.set('objects.hats.hood_dino', { ...pic, id: 'objects.hats.hood_dino' }); const old = new PipController({ rng: () => 0.5, cosmetic: rs.get('dino_cap') }); const c4 = new WardCtx(); old.render(c4); assert.ok(c4.drawn.includes('objects.hats.hood_dino'), 'Older looks still draw on Pip');
  assert.ok((await artIdsForScene({ save: wardSave, rewards: wg.rewards }, 'collection', {})).includes('objects.wardrobe.outfits.outfit_police'), 'Worn looks are preloaded');
  delete globalThis.__LL_ASSETS;
  assert.ok(serviceWorkerSource.includes("'./src/characters/Wardrobe.js'"), 'Wardrobe code works offline');
}

// ---- Job 10: low-end tablets (decode at drawn size, release only between scenes, auto Lite) + all the art ----
{
  // Picture memory: counted per picture, freed (ImageBitmap.close) on release, and only let go after a scene change when over budget.
  const loader = new AssetLoader(); loader.artUrls = new Map([['a.one', 'a1.png'], ['a.two', 'a2.png'], ['a.three', 'a3.png']]);
  let closed = 0; const bmp = (w, h) => ({ width: w, height: h, close() { closed++; } });
  for (const [id, w] of [['a.one', 1000], ['a.two', 500], ['a.three', 400]]) { loader.cache.set(id, bmp(w, 500)); loader.bytes.set(id, w * 500 * 4); }
  assert.equal(loader.artMemoryBytes(), (1000 + 500 + 400) * 500 * 4, 'Image memory is counted per picture');
  assert.equal(drawnSize('worlds.backgrounds.town.bg_town_bakery'), 1920); assert.ok(drawnSize('objects.vehicles.boats.tugboat') < 768, 'Objects decode smaller than their file on a small screen');
  const prevQuality = globalThis.__LL_QUALITY; globalThis.__LL_QUALITY = 'lite';
  const settleGame = { assets: loader };
  globalThis.__LL_ASSETS = { artMap: { preload: { starter: [] } }, get: () => undefined };
  loader.sceneKey = 'island:'; loader.drawnNow = new Set(['a.one', 'a.two']);
  assert.equal(settleSceneArt(settleGame, 'collection', { tab: 'vehicles' }, ['a.three']), 0, 'Nothing is let go while picture memory is under budget');
  assert.deepEqual(loader.sceneDrawn.get('island:'), ['a.one', 'a.two'], 'What a scene drew is remembered for its next visit');
  assert.ok(loader.drawnNow.has('a.three'), 'The new scene starts with what it preloaded');
  loader.bytes.set('a.one', 200 * 1048576);
  assert.equal(settleSceneArt(settleGame, 'island', {}, ['a.one']), 2, 'Over budget: pictures the next scene does not use are let go');
  assert.ok(loader.cache.has('a.one') && !loader.cache.has('a.two') && closed === 2 && loader.bytes.size === 1, 'Released pictures free their memory at once');
  // Lite mode: no light blends (slow / glitchy on some Android GPUs).
  globalThis.__LL_ASSETS = { artMap: {}, get: id => id === 'fx.glow' ? { width: 10, height: 10 } : undefined, requestArt() {} };
  const blendCtx = new ArtCanvasContext(); assert.ok(drawArt(blendCtx, 'fx.glow', 0, 0, 10, 10, { blend: 'screen' })); assert.equal(blendCtx.blend, undefined, 'Lite mode draws glows with plain alpha');
  globalThis.__LL_QUALITY = 'high'; const blendHigh = new ArtCanvasContext(); drawArt(blendHigh, 'fx.glow', 0, 0, 10, 10, { blend: 'screen' }); assert.equal(blendHigh.blend, 'screen');
  globalThis.__LL_QUALITY = prevQuality; delete globalThis.__LL_ASSETS;

  // Auto Lite: low-memory devices start in Lite; a slow first second drops straight down; the result is remembered.
  const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
  assert.equal(autoStartMode({ deviceMemory: 4, store: memStore() }), 'lite', 'A 4 GB tablet starts in Lite');
  assert.equal(autoStartMode({ deviceMemory: 8, store: memStore() }), 'high');
  const remembered = memStore(); remembered.setItem('littleLegends.autoQuality', 'balanced'); assert.equal(autoStartMode({ deviceMemory: 8, store: remembered }), 'balanced', 'A device remembers the mode it needed');
  const slowStore = memStore(), slow = new PerformanceManager({ store: slowStore, deviceMemory: 8 }); slow.start(); assert.equal(slow.quality.id, 'high');
  for (let i = 0; i < 70; i++) slow.record({ frameMs: 60, renderMs: 30, now: i * 60 }); assert.equal(slow.quality.id, 'high', 'Loading frames are not judged before the first scene opens');
  slow.armFirstTest(); for (let i = 0; i < 61; i++) slow.record({ frameMs: 60, renderMs: 30, now: 5000 + i * 60 });
  assert.equal(slow.quality.id, 'lite', 'A slow first second switches to Lite'); assert.equal(slowStore.getItem('littleLegends.autoQuality'), 'lite', 'and remembers it for next time');
  assert.equal(new PerformanceManager({ store: slowStore, deviceMemory: 8 }).modeFor('auto').id, 'lite'); assert.equal(new PerformanceManager({ store: slowStore }).modeFor('high').id, 'high', 'A parent can still choose High');
  assert.ok(PERFORMANCE_MODES.LITE.dprCap <= 1.5 && PERFORMANCE_MODES.LITE.maxPixels <= 1.6e6, 'Lite caps the canvas size');

  // All the art: vehicles, island build pieces and markers are drawn; what is left over is listed with a reason.
  const unusedArt = findUnusedArt(root);
  for (const prefix of ['objects.vehicles.', 'worlds.tiles.', 'worlds.house_parts.', 'ui.build.', 'objects.wardrobe.']) assert.ok(!unusedArt.unused.some(u => u.id.startsWith(prefix)), `Every ${prefix} picture is used`);
  assert.ok(unusedArt.unused.length <= 45, `Unused pictures stay few (${unusedArt.unused.length}); see docs/JOB10_REPORT.md`);
  const map10 = JSON.parse(fs.readFileSync(path.join(root, 'data/art_map.json'), 'utf8'));
  for (const [r, pic] of [['parade_float', 'special.parade_float'], ['catalog_bubble_boat', 'boats.sailboat'], ['catalog_cloud_glider', 'air.hot_air_balloon'], ['catalog_jungle_jeep', 'emergency.rescue_4x4_mountain'], ['catalog_forest_cart', 'farm.farm_buggy']]) assert.equal(map10.rewards[r], `objects.vehicles.${pic}`, `${r} has its vehicle picture`);
  for (const id of ['town_vehicle_parade', 'town_big_helpers']) { const a = adventureData.adventures.find(x => x.id === id); assert.ok(a && rewardData.rewards.some(r => r.id === a.reward.id) && map10.missionIcons[id], `${id} is a Busy Town mission`); for (const s of a.steps.filter(s => s.activityId)) assert.ok(activityData.activities.some(x => x.id === s.activityId), `${s.activityId} exists`); }
  const rides = rewardData.rewards.filter(r => r.id.startsWith('ride_')); assert.ok(rides.length >= 50 && rides.every(r => r.catalog && r.type === 'vehicles' && map10.rewards[r.id]), 'Every other vehicle is a ride in the Collection');

  // Island build mode: tray pieces go on the grass, drag one back onto the tray to take it away; old saves get an empty list.
  const oldIsland = new SaveSystem({ indexedDBRef: null, storage: null }).migrate({ activeProfileId: 'p', profiles: [{ id: 'p', name: 'O', age: 3, createdAt: 1 }], profileStates: { p: { island: { placements: { tree: { x: 500, y: 600 } } } } } });
  assert.deepEqual(oldIsland.profileStates.p.island.built, [], 'Older saves start with nothing built'); assert.deepEqual(oldIsland.profileStates.p.island.placements.tree, { x: 500, y: 600 });
  const buildSave = new SaveSystem({ indexedDBRef: null, storage: null }); await buildSave.init(); await buildSave.createProfile({ name: 'Bo', age: 4 });
  const bg = { save: buildSave, audio: sceneAudio, scenes: { last: null, change(name, data) { this.last = { name, data }; } } }; bg.rewards = new RewardSystem(bg); bg.rewards.setDefinitions(rewardData);
  globalThis.__LL_ASSETS = { artMap: map10, get: () => undefined, requestArt() {} };
  const build = new WonderIslandScene(bg); build.enter({});
  await build.handlePointer({ type: 'down', x: 1500, y: 960 }); await build.handlePointer({ type: 'up', x: 1500, y: 960 }); assert.equal(build.placementMode, true, 'MOVE THINGS opens build mode');
  build.render(fakeCtx); assert.equal(fakeCtx.depth, 0, 'Build tray render balances Canvas state');
  await build.handlePointer({ type: 'down', x: 78, y: 330 }); await build.handlePointer({ type: 'up', x: 78, y: 330 }); await new Promise(r => setTimeout(r, 0));
  const built = buildSave.getProfileState().island.built; assert.equal(built.length, 1, 'Tapping a tray piece builds it'); assert.equal(built[0].piece, Object.keys(map10.islandBuild.pieces)[0]);
  const piece = build.objects.find(o => o.id === built[0].id); assert.ok(piece && build.objects.indexOf(piece) < build.objects.findIndex(o => o.id === 'tree'), 'Ground tiles lie under the island things');
  const again = new WonderIslandScene(bg); again.enter({}); assert.ok(again.objects.some(o => o.id === built[0].id), 'Built pieces stay on the island');
  await build.handlePointer({ type: 'down', x: piece.x, y: piece.y }); assert.equal(build.drag, piece); await build.handlePointer({ type: 'move', x: 130, y: 600 }); build.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
  await build.handlePointer({ type: 'up', x: 130, y: 600 }); await new Promise(r => setTimeout(r, 0));
  assert.equal(buildSave.getProfileState().island.built.length, 0, 'Dragging a piece onto the tray takes it away'); assert.ok(!build.objects.includes(piece));
  delete globalThis.__LL_ASSETS;

  // Pip's bubble splits on spaces (it was splitting on the letter s: "Three bu e !").
  assert.deepEqual(wrapLines({ measureText: t => ({ width: t.length * 10 }) }, "Three buses! So many seats", 1000), ["Three buses! So many seats"], "Speech bubbles keep every letter");
  // Picture stats overlay: Parent Area → DATA.
  const statsGame = { save: buildSave, debugOverlay: false, setDebugOverlay(on) { this.debugOverlay = on; return on; } };
  const statsGate = new ParentGateScene(statsGame); statsGate.enter({ skipGate: true, tab: 'data' }); statsGate.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
  assert.equal(statsGate.controlAt({ x: 960, y: 865 }), 'debugOverlay'); await statsGate.action('debugOverlay'); assert.equal(statsGame.debugOverlay, true, 'Parent Area turns the picture stats on');
}

// ---- Job 11: 60 island decorations, DECOR groups, mission trophies ----
{
  const map11 = JSON.parse(fs.readFileSync(path.join(root, 'data/art_map.json'), 'utf8'));
  const unused11 = findUnusedArt(root);
  for (const prefix of ['worlds.island_decor.', 'rewards.trophies.']) assert.ok(!unused11.unused.some(u => u.id.startsWith(prefix)), `Every ${prefix} picture is used`);
  for (const [r, pic] of [['catalog_moon_lamp', 'lights.lamp_moon'], ['catalog_firefly_jar', 'lights.jar_firefly'], ['catalog_star_gazebo', 'houses.gazebo_crystal'], ['catalog_colour_windmill', 'magic.windmill_rainbow'], ['catalog_star_path', 'paths.stepping_stones_star'], ['catalog_music_flowers', 'magic.flower_music'], ['moon_book_nook', 'houses.tower_wizard'], ['story_tree', 'trees.tree_lanterns'], ['luna_star', 'lights.lamp_star'], ['catalog_shape_stones', 'paths.stepping_stones_grey'], ['kindness_garden', 'plants.flowers_star']])
    assert.equal(map11.rewards[r], `worlds.island_decor.${pic}`, `${r} has its decoration picture`);
  for (const pic of ['worlds.decor.moon_crystal_sleepy', 'worlds.decor.star_trophy_happy', 'worlds.decor.signpost_three', 'worlds.flowers.pink_flowers']) assert.ok(Object.values(map11.rewards).includes(pic), `${pic} stays in the game as its own decoration`);
  const decor = rewardData.rewards.filter(r => r.type === 'decorations' && r.catalog && !r.season && !r.hidden); // Job 12: hidden ones wait for a picture
  for (const [id] of DECOR_TABS) assert.ok(decor.filter(r => decorTab(r) === id).length >= 5, `DECOR ${id} group has decorations`);
  const decorSave = new SaveSystem({ indexedDBRef: null, storage: null }); await decorSave.init(); await decorSave.createProfile({ name: 'Dot', age: 4 });
  const dg = { save: decorSave, audio: sceneAudio, scenes: { last: null, change(name, data) { this.last = { name, data }; } } }; dg.rewards = new RewardSystem(dg); dg.rewards.setDefinitions(rewardData);
  const dcol = new CollectionScene(dg); dcol.enter({ tab: 'decorations' });
  let seen = 0;
  for (const [id] of DECOR_TABS) { await dcol.action(`decor:${id}`); const items = dcol.items(); seen += items.length; assert.ok(items.length && items.every(r => decorTab(r) === id), `DECOR ${id} tab lists its group`); dcol.render(fakeCtx); assert.equal(fakeCtx.depth, 0); }
  assert.equal(seen, decor.length, 'Every decoration is in exactly one DECOR group');
  assert.equal(dcol.controlAt({ x: 100, y: 228 + 3 * 84 + 30 }), 'decor:crystals', 'DECOR groups are tappable');
  for (const id of ['story_tree', 'duckling', 'town_post_office']) { const r = rewardData.rewards.find(x => x.id === id); await decorSave.award(r.type, id); }
  const portalIsland = new WonderIslandScene(dg); portalIsland.enter({});
  for (const id of ['story_tree', 'duckling', 'town_post_office']) { const o = portalIsland.objects.find(x => x.id === id); assert.ok(o && !(Math.abs(o.x - 960) < 150 && Math.abs(o.y - 470) < 195), `${id} is moved off the portal`); }
  // Mission finish: a trophy by world progress; the world's last mission gets gold on the crystal pedestal under the arch.
  const trophyCtx = new ArtCanvasContext(); const pics = new Map(Object.values(map11.trophies).filter(v => v.startsWith('rewards.')).map(id => [id, { width: 100, height: 100, id }]));
  globalThis.__LL_ASSETS = { artMap: map11, get: id => pics.get(id), requestArt() {} };
  const tg = { save: decorSave, learning: new LearningProfile(), audio: sceneAudio, assets: null, scenes: { last: null, change(name, data) { this.last = { name, data }; } } };
  tg.activityEngine = new ActivityEngine(tg); tg.activityEngine.setDefinitions(activityData); tg.adventureEngine = new AdventureEngine(tg); tg.adventureEngine.setDefinitions(adventureData); tg.rewards = new RewardSystem(tg); tg.rewards.setDefinitions(rewardData);
  const townMissions = adventureData.adventures.filter(a => a.world === 'town');
  const first = new AdventureScene(tg); await first.enter({ adventureId: townMissions[0].id, step: townMissions[0].steps.length - 1 }); first.render(trophyCtx);
  assert.ok(trophyCtx.images.some(i => i.img.id === map11.trophies.bronze) && trophyCtx.images.some(i => i.img.id === map11.trophies.podium), 'First mission in a world: bronze trophy on the star podium');
  for (const a of townMissions.slice(1)) await decorSave.saveAdventure(a.id, 0, { completed: true });
  const lastCtx = new ArtCanvasContext(); first.render(lastCtx); assert.equal(lastCtx.depth, 0);
  assert.ok(['arch', 'pedestal', 'gold'].every(k => lastCtx.images.some(i => i.img.id === map11.trophies[k])), 'World complete: gold trophy on the crystal pedestal under the rainbow arch');
  const midCtx = new ArtCanvasContext(); const mid = new AdventureScene(tg); await mid.enter({ adventureId: townMissions[0].id, step: 1 }); mid.render(midCtx); assert.ok(!midCtx.images.some(i => i.img.id === map11.trophies.podium), 'No trophy before the last step');
  delete globalThis.__LL_ASSETS;
}

// ---- Job 12: finish line — every picture used, no grey placeholders, 8+ missions per world, release-ready ----
{
  const map12 = JSON.parse(fs.readFileSync(path.join(root, 'data/art_map.json'), 'utf8'));
  const manifest12 = new Set(JSON.parse(fs.readFileSync(path.join(root, 'assets/art_manifest.json'), 'utf8')).map(e => e.id));
  const unused12 = findUnusedArt(root);
  assert.equal(unused12.unused.length, 0, `Every delivered picture is used (art:unused): ${unused12.unused.map(u => u.id).join(', ')}`);
  assert.equal(new Set(unused12.kept.map(k => k.why)).size, 3, 'Only the explorer boy, Pip rig parts and small scene cards are left out');
  // Every world: 8+ Little Missions, a world prize (its dragon, or Bella's Golden Star), a picture on every mission card.
  const g12 = { rewards: new RewardSystem({}) }; g12.rewards.setDefinitions(rewardData);
  for (const world of ['dino', 'rainbow', 'space', 'animal', 'jungle', 'storybook', 'life', 'town']) {
    const missions = adventureData.adventures.filter(a => a.world === world);
    assert.ok(missions.length >= 8, `${world} has 8+ Little Missions (got ${missions.length})`);
    const prize = dragonForWorld(g12, world); assert.ok(prize && map12.rewards[prize.id], `${world} has a world prize with a picture`);
    for (const m of missions) {
      assert.ok(manifest12.has(map12.missionIcons[m.id]), `${m.id} has a picture on its mission card`);
      const r = rewardData.rewards.find(x => x.id === m.reward.id); assert.ok(r && !r.hidden, `${m.id} gives a reward that is shown (${m.reward.id})`);
      for (const step of m.steps) if (step.art) assert.ok(manifest12.has(step.art), `${m.id}: story picture ${step.art} exists`);
    }
  }
  assert.equal(dragonForWorld(g12, 'life').id, 'life_golden_star', 'Bella’s Day (no dragon) gives the Golden Star');
  // No grey placeholders: every shown reward has a picture; hidden ones are never offered or drawn.
  const stillToDraw = fs.readFileSync(path.join(root, 'docs/STILL_TO_DRAW.md'), 'utf8');
  for (const r of rewardData.rewards) {
    const pic = map12.rewards[r.id] ?? (r.type === 'cosmetics' ? map12.cosmetics[r.id] : null);
    if (r.hidden) { assert.ok(!pic, `${r.id} is hidden only while it has no picture`); assert.ok(stillToDraw.includes(r.name), `${r.name} is listed in docs/STILL_TO_DRAW.md`); continue; }
    assert.ok(pic && manifest12.has(pic), `${r.id} has a picture`);
  }
  const hidden = rewardData.rewards.filter(r => r.hidden);
  for (const a of adventureData.adventures) assert.ok(!hidden.some(r => r.id === a.reward?.id || r.id === a.bonusLook), `${a.id} never gives a hidden reward`);
  assert.ok(!g12.rewards.listCatalog().some(r => r.hidden), 'Hidden rewards are not offered in the Collection');
  // Mission activities show pictures, not word cards (drawn coloured shapes are fine: they are the real shape).
  globalThis.__LL_ASSETS = { artMap: map12, get: () => undefined, requestArt() {} };
  const DRAWN = new Set(['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'egg', 'dinosaur']);
  const inMissions = new Set(adventureData.adventures.flatMap(a => a.steps.map(s => s.activityId).filter(Boolean)));
  for (const def of activityData.activities.filter(a => inMissions.has(a.id))) {
    for (const t of [...(def.objects ?? []), ...(def.choices ?? []), ...(def.cards ?? []), ...(def.sequence ?? []), ...(def.pairs ?? []).flatMap(p => p.items ?? [p])]) {
      if (!t?.kind || DRAWN.has(t.kind)) continue;
      assert.ok(tokenArt(t, { colour: 'loose' }), `${def.id}: '${t.symbol ?? t.thing ?? t.animalType ?? t.value ?? t.kind}' has a picture (no word card)`);
    }
  }
  // Island: an owned hidden reward is not drawn; friends say hello; Baby T-Rex grins while tapped.
  const s12 = new SaveSystem({ indexedDBRef: null, storage: null }); await s12.init(); await s12.createProfile({ name: 'Ivy', age: 4 });
  await s12.award('creatures', 'baby_pterosaur'); await s12.award('creatures', 'baby_trex');
  const ig = { save: s12, audio: sceneAudio, scenes: { change() {} } }; ig.rewards = new RewardSystem(ig); ig.rewards.setDefinitions(rewardData);
  const isl12 = new WonderIslandScene(ig); isl12.enter({});
  assert.ok(!isl12.objects.some(o => o.id === 'baby_pterosaur'), 'A hidden reward a child already owns stays in the save but is not drawn');
  const trex = isl12.objects.find(o => o.id === 'baby_trex'); assert.ok(trex); isl12.interact(trex); assert.equal(isl12.hello?.text, 'Roar!', 'A tapped friend says hello');
  const grin = map12.rewardTapped.baby_trex, shown = new Map([[grin, { width: 100, height: 100, id: grin }], [map12.ui.speechBubble, { width: 100, height: 60, id: map12.ui.speechBubble }]]);
  globalThis.__LL_ASSETS = { artMap: map12, get: id => shown.get(id), requestArt() {} };
  const islCtx = new ArtCanvasContext(); isl12.render(islCtx); assert.equal(islCtx.depth, 0);
  assert.ok(islCtx.images.some(i => i.img.id === grin) && islCtx.images.some(i => i.img.id === map12.ui.speechBubble), 'Baby T-Rex grins in a speech bubble while tapped');
  // Jungle: a mission hub like every world, with the Jam one tap away; the Jam's BACK returns to the hub.
  const ng = { adventureEngine, save: s12, audio: sceneAudio, scenes: { last: null, change(name, data) { this.last = { name, data }; } } };
  const ws12 = new WorldSelectScene(ng); ws12.enter(); ws12.handlePointer({ type: 'down', x: 270, y: 570 }); ws12.handlePointer({ type: 'up', x: 270, y: 570 }); ws12.update(1);
  assert.deepEqual([ng.scenes.last?.name, ng.scenes.last?.data?.world], ['worldHub', 'jungle'], 'The Jungle card opens its mission hub');
  const jh = new WorldHubScene(ng); await jh.enter({ world: 'jungle' }); assert.ok(jh.missions.length >= 8); jh.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
  jh.handlePointer({ type: 'down', x: 1640, y: 970 }); jh.handlePointer({ type: 'up', x: 1640, y: 970 }); assert.equal(ng.scenes.last.name, 'jungleJam', 'JUNGLE JAM button opens the Jam');
  const jj = new JungleJamScene({ ...ng, learning: new LearningProfile() }); jj.enter(); jj.handlePointer({ type: 'down', x: 100, y: 90 }); jj.handlePointer({ type: 'up', x: 100, y: 90 });
  assert.deepEqual([ng.scenes.last.name, ng.scenes.last.data?.world], ['worldHub', 'jungle'], 'Jam BACK returns to the Jungle hub');
  // A finished world shows its certificate on the hub and a badge on its card.
  for (const m of jh.missions) await s12.saveAdventure(m.id, 0, { completed: true });
  const certPics = new Map([map12.certificate.scroll, map12.certificate.frame, map12.ui.worldBadge].map(id => [id, { width: 100, height: 100, id }]));
  globalThis.__LL_ASSETS = { artMap: map12, get: id => certPics.get(id), requestArt() {} };
  const certCtx = new ArtCanvasContext(); jh.render(certCtx); assert.equal(certCtx.depth, 0); assert.ok(certCtx.images.some(i => i.img.id === map12.certificate.scroll), 'A finished world shows its certificate');
  const badgeCtx = new ArtCanvasContext(); ws12.render(badgeCtx); assert.ok(badgeCtx.images.some(i => i.img.id === map12.ui.worldBadge), 'A finished world gets a badge on its card');
  delete globalThis.__LL_ASSETS;
  // A mission that hands out a Collection thing still gives its stars the first time.
  const starSave = new SaveSystem({ indexedDBRef: null, storage: null }); await starSave.init(); await starSave.createProfile({ name: 'Sol', age: 5 });
  const sg12 = { save: starSave, learning: new LearningProfile(), audio: sceneAudio, assets: null, scenes: { last: null, change(name, data) { this.last = { name, data }; } } };
  sg12.activityEngine = new ActivityEngine(sg12); sg12.activityEngine.setDefinitions(activityData); sg12.adventureEngine = new AdventureEngine(sg12); sg12.adventureEngine.setDefinitions(adventureData); sg12.rewards = new RewardSystem(sg12); sg12.rewards.setDefinitions(rewardData);
  const concert = adventureData.adventures.find(a => a.id === 'jungle_grand_concert'); const fin = new AdventureScene(sg12); await fin.enter({ adventureId: concert.id, step: concert.steps.length - 1 }); await fin.finishAdventure();
  assert.equal(starSave.getProfileState().discoveryStars, concert.reward.stars, 'Mission stars are given for a Collection reward');
  // Release-ready: privacy says exactly what is kept; icons; the Android wrapper has no permissions and no cloud backup.
  assert.ok(STORED_DATA.length >= 6 && PRIVACY_GUARANTEES.some(p => p.id === 'nothing-leaves'), 'Privacy lists what is stored and that nothing leaves the device');
  const privacyPage = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8'); for (const item of STORED_DATA) assert.ok(privacyPage.includes(item.title), `privacy.html lists ${item.title}`);
  const pg12 = new ParentGateScene({ ...parentGame }); pg12.enter({ skipGate: true, tab: 'privacy' }); pg12.render(fakeCtx); assert.equal(fakeCtx.depth, 0);
  const webManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const icon of webManifest.icons) assert.ok(fs.existsSync(path.join(root, icon.src)), `${icon.src} exists`);
  assert.ok(webManifest.icons.some(i => i.purpose === 'maskable') && webManifest.icons.some(i => i.purpose === 'any'), 'Install icons: normal and maskable');
  const androidManifest = fs.readFileSync(path.join(root, 'app-android/android/app/src/main/AndroidManifest.xml'), 'utf8');
  assert.deepEqual(androidManifest.match(/android:name="android.permission.[A-Z_]+"/g), ['android:name="android.permission.INTERNET"'], 'The Android app asks for nothing beyond INTERNET for the web view (no camera, mic, location, storage)');
  assert.ok(androidManifest.includes('android:allowBackup="false"') && androidManifest.includes('sensorLandscape'), 'Android app: no cloud backup, landscape');
  assert.ok(fs.readFileSync(path.join(root, 'src/main.js'), 'utf8').startsWith("import './utils/compat.js';"), 'Older-tablet fallbacks load first');
  for (const doc of ['docs/GOOGLE_PLAY_STEPS.md', 'docs/STILL_TO_DRAW.md', 'docs/JOB12_REPORT.md']) assert.ok(fs.existsSync(path.join(root, doc)), `${doc} exists`);
}

console.log(`Little Legends M0-M29 qualification implementation check passed (M26/M29 human gates still pending): ${required.length} required files, ${jsFiles.length} JS syntax checks, ${activityEngine.list().length} JSON activities across ${expectedActivityTypes.size} reusable families, ${adventureData.adventures.length} Little Missions, privacy/child-test support, launch FX, save recovery, performance instrumentation and offline PWA verified.`);
