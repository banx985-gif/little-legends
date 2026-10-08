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
import { CollectionScene } from '../src/scenes/CollectionScene.js';
import { PerformanceManager } from '../src/core/PerformanceManager.js';
import { ChildTestRecorder } from '../src/testing/ChildTestRecorder.js';
import { ReleaseQualification, RELEASE_MANUAL_CHECKS } from '../src/testing/ReleaseQualification.js';
import { PRIVACY_GUARANTEES } from '../src/privacy/PrivacyPolicy.js';
import { FeedbackFX } from '../src/fx/FeedbackFX.js';
import { art, tokenArt, artIdsForScene, countTargetArt, hatchTheme, hatchFrameIds } from '../src/core/art.js';
import { HatchSequence } from '../src/fx/HatchSequence.js';
import { drawToken, drawBin, drawBasket } from '../src/activities/activityDraw.js';
import { drawCandyButton } from '../src/utils/draw.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html','styles.css','manifest.webmanifest','sw.js','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/art/meadow_picnic_clearing.png','assets/art_manifest.json','data/art_map.json','src/core/art.js','docs/ART_WIRING_REPORT.md','data/activities.json','data/adventures.json','data/rewards.json','data/v1-family-coverage.json',
  'src/main.js','src/core/Game.js','src/core/GameLoop.js','src/core/SceneManager.js','src/core/AssetLoader.js','src/core/PerformanceManager.js','src/fx/FeedbackFX.js','src/testing/ChildTestRecorder.js','src/testing/ReleaseQualification.js','src/privacy/PrivacyPolicy.js',
  'src/input/InputManager.js','src/render/CanvasViewport.js',
  'src/audio/AudioManager.js','src/characters/PipController.js','src/learning/LearningProfile.js','src/learning/AdaptiveDifficulty.js','src/learning/ActivityScheduler.js','src/hints/HintController.js','src/save/SaveSystem.js','src/adventures/AdventureEngine.js','src/rewards/RewardSystem.js','src/rewards/EggSystem.js',
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
assert.ok(serviceWorkerSource.includes("little-legends-m29-playable-fix1-art-v37"), 'Service worker cache version should advance with the real-art build');
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
  translate() {} rotate() {} scale() {} setLineDash() {}
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
await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'find_dinos');
for(const token of flow.activity.tokens.filter(t=>t.kind==='dinosaur')) flow.activity.handlePointer({type:'up',x:token.x,y:token.y});
assert.equal(flow.completedStep,true);await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'feed_dinos');for(const token of [...flow.activity.tokens]) drag(flow.activity,token,flow.activity.target);
assert.equal(flow.completedStep,true);await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'sort_fruit');for(const token of [...flow.activity.tokens]){const target=flow.activity.targets.find(t=>flow.activity.accepts(t,token));drag(flow.activity,token,target);}
assert.equal(flow.completedStep,true);await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'big_blanket');await flow.handlePointer({type:'up',x:870,y:500});assert.equal(flow.completedStep,true);await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'pattern');await flow.handlePointer({type:'up',x:800,y:820});assert.equal(flow.completedStep,true);await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'egg_reward');await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'return_island');await flow.handlePointer({type:'up',x:960,y:940});
assert.equal(flow.step.id,'hatch');for(let i=0;i<5;i++)await flow.handlePointer({type:'up',x:960,y:600});assert.equal(flow.completedStep,true);
await flow.handlePointer({type:'up',x:960,y:940});assert.equal(flow.step.id,'place_home');await flow.handlePointer({type:'up',x:960,y:680});assert.equal(flow.completedStep,true);await flow.handlePointer({type:'up',x:960,y:940});
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
assert.equal(rainbowAdventures.length,5,'Rainbow Village should launch with five starter adventures');
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
  await rainbowScene.handlePointer({type:'up',x:960,y:950});
}
assert.equal(rainbowGame.scenes.last?.name,'island','Rainbow adventure should return to Wonder Island');
assert.ok(save.getProfileState().unlocks.buildings.includes('rainbow_arch'),'Completing The Missing Rainbow should persist its Wonder Island reward');
const islandWithRainbow=new WonderIslandScene({save,audio:sceneAudio,rewards:rainbowGame.rewards,scenes:{change(){}}});islandWithRainbow.enter();assert.ok(islandWithRainbow.objects.some(o=>o.id==='rainbow_arch'),'Rainbow reward should appear on Wonder Island using the existing island object system');islandWithRainbow.render(fakeCtx);assert.equal(fakeCtx.depth,0);

// ---- Milestones 16–20: production content worlds ----
const dinoAdventures = adventureData.adventures.filter(a => a.world === 'dino');
assert.equal(dinoAdventures.length, 10, 'Dino Valley full pass should expose ten Little Missions including Rory’s picnic');
for (const group of ['counting','numerals','more_less','same_amount','size','addition','sequence']) {
  assert.ok(activityData.activities.filter(a => a.world === 'dino' && a.contentGroup === group).length >= 4, `Dino Valley needs at least four ${group} variants`);
}
for (let n=1;n<=10;n++) { assert.ok(TRACKED_SKILLS[`COUNT_${n}`]); assert.ok(TRACKED_SKILLS[`NUMERAL_${n}`]); }
for (const id of ['MORE_LESS','SAME_AMOUNT','ADDITION_PREP','SEQUENCE']) assert.ok(TRACKED_SKILLS[id]);
assert.ok(rewardData.rewards.filter(r => r.world === 'dino').length >= 8, 'Dino Valley should have at least eight data-driven rewards');

const animalAdventures = adventureData.adventures.filter(a => a.world === 'animal');
assert.equal(animalAdventures.length, 5, 'Animal Forest should contain the five planned starter adventures');
for (const id of ['ANIMAL_NAMES','ANIMAL_SOUNDS','HABITATS','BABY_PARENT','LAND_WATER_AIR','ANIMAL_FOOD','BODY_FEATURES','CLASSIFICATION']) assert.ok(TRACKED_SKILLS[id], `Animal Forest tracks ${id}`);
for (const adventure of animalAdventures) assert.ok(adventure.steps.every(step => ['story','activity'].includes(step.kind)), `${adventure.id} should reuse generic story/activity flow`);

const storyAdventures = adventureData.adventures.filter(a => a.world === 'storybook');
assert.equal(storyAdventures.length, 5, 'Storybook literacy foundation should contain five starter adventures');
for (const id of ['VOCABULARY','LETTER_RECOGNITION','UPPER_LOWER','FIRST_SOUNDS','NAME_LETTER']) assert.ok(TRACKED_SKILLS[id], `Literacy foundation tracks ${id}`);
for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.ok(TRACKED_SKILLS[`LETTER_${letter}`], `A–Z architecture tracks ${letter}`);
const lettersRepresented = new Set(activityData.activities.filter(a => a.world === 'storybook').flatMap(a => a.skills ?? []).filter(id => /^LETTER_[A-Z]$/.test(id)).map(id => id.slice(-1)));
assert.equal(lettersRepresented.size, 26, 'Storybook content should represent all A–Z letters in data');

const lifeAdventures = adventureData.adventures.filter(a => a.world === 'life');
assert.equal(lifeAdventures.length, 5, 'Bella’s Day should contain five playful life-skill missions');
for (const id of ['HAND_WASHING','TEETH_BRUSHING','WEATHER_CLOTHES','TOY_SORTING','FEELINGS','HELPING','ROUTINES']) assert.ok(TRACKED_SKILLS[id], `Life skills track ${id}`);

// Generic second/third/fourth-world adventures must complete through public activity touch paths.
const contentSave = new SaveSystem({ indexedDBRef:null, storage:null }); await contentSave.init(); await contentSave.createProfile({name:'Sam',age:4,language:'en-AU'});
const contentGame={save:contentSave,learning:new LearningProfile(),audio:sceneAudio,assets:null,scenes:{last:null,change(name,data){this.last={name,data};}}};
contentGame.activityEngine=new ActivityEngine(contentGame); contentGame.activityEngine.setDefinitions(activityData);
contentGame.adventureEngine=new AdventureEngine(contentGame); contentGame.adventureEngine.setDefinitions(adventureData);
contentGame.rewards=new RewardSystem(contentGame); contentGame.rewards.setDefinitions(rewardData); contentGame.eggs=new EggSystem(contentGame); contentGame.scheduler=new ActivityScheduler(contentGame);
async function completeGenericAdventure(id){
  contentGame.scenes.last=null;const scene=new AdventureScene(contentGame);await scene.enter({adventureId:id,step:0});let guard=0;
  while(contentGame.scenes.last?.name!=='island'&&guard++<30){if(scene.activity&&!scene.completedStep)completeThroughPublicInput(scene.activity,scene.activity.definition);await scene.handlePointer({type:'up',x:960,y:950});}
  assert.equal(contentGame.scenes.last?.name,'island',`${id} should return to Wonder Island`);return scene;
}
const genericAdventureIds = adventureData.adventures.filter(a => a.id !== 'rory_dino_picnic' && a.steps.every(step => ['story','activity'].includes(step.kind))).map(a => a.id);
for (const id of genericAdventureIds) await completeGenericAdventure(id);
assert.equal(genericAdventureIds.length, adventureData.adventures.length - 1, 'Every non-Rory Little Mission should use the generic story/activity path');
for (const reward of ['baby_triceratops','forest_treehouse','moon_book_nook','bella_bear_friend']) {
  const def=rewards.get(reward);assert.ok(contentSave.getProfileState().unlocks[def.type].includes(reward),`${reward} should persist after its adventure`);
}

// World select + generic hub navigation.
const navGame={adventureEngine,save:contentSave,audio:sceneAudio,scenes:{last:null,change(name,data){this.last={name,data};}}};
const worldSelect=new WorldSelectScene(navGame);worldSelect.enter();worldSelect.render(fakeCtx);assert.equal(fakeCtx.depth,0);
worldSelect.handlePointer({type:'down',x:1400,y:400});worldSelect.handlePointer({type:'up',x:1400,y:400});assert.equal(navGame.scenes.last.name,'worldHub');assert.equal(navGame.scenes.last.data.world,'animal');
const dinoHub=new WorldHubScene(navGame);await dinoHub.enter({world:'dino'});assert.equal(dinoHub.missions.length,10);dinoHub.render(fakeCtx);assert.equal(fakeCtx.depth,0);dinoHub.handlePointer({type:'down',x:1100,y:970});dinoHub.handlePointer({type:'up',x:1100,y:970});assert.equal(dinoHub.page,1,'Dino Valley hub should page through more than six missions');dinoHub.exit();

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
assert.ok(!serviceWorkerSource.includes('skipWaiting()'),'PWA updates must wait rather than replace the service worker mid-session');assert.ok(!serviceWorkerSource.includes('clients.claim()'),'PWA updates must not claim an active child session');assert.ok(serviceWorkerSource.includes("'./assets/icons/icon-192.png'"));assert.ok(serviceWorkerSource.includes("'./assets/icons/icon-512.png'"));

// ---- Milestone 24: measurable performance pass ----
const qualityEvents=[];const perf=new PerformanceManager({onQualityChange:(q,reason)=>qualityEvents.push({q,reason})});perf.start();
for(let i=0;i<100;i++)perf.record({frameMs:25,updateMs:2,renderMs:16,now:2100+i*25});
perf.lastEvaluationAt=0;perf.evaluateAuto();perf.evaluateAuto();assert.equal(perf.quality.id,'balanced','Auto performance should downgrade from High when sustained 60 FPS budget is missed');
perf.setRequestedMode('lite');assert.equal(perf.quality.targetFps,30);assert.equal(perf.quality.dprCap,1.25);perf.suspend();assert.equal(perf.sampleCount,0);perf.resume();assert.equal(perf.sampleCount,0);
assert.ok(contentSave.getSettings().performanceMode,'Performance preference must have a persisted default');

// ---- Milestone 25: content scale pass ----
assert.ok(expectedActivityTypes.size>=25&&expectedActivityTypes.size<=30,`V1 scale target is 25–30 activity families; got ${expectedActivityTypes.size}`);
const coreSkills=Object.keys(TRACKED_SKILLS).filter(id=>!/^LETTER_[A-Z]$/.test(id));assert.ok(coreSkills.length>=50&&coreSkills.length<=70,`V1 core learning-skill target is 50–70; got ${coreSkills.length}`);
assert.ok(adventureData.adventures.length>=30&&adventureData.adventures.length<=40,`V1 Little Mission target is 30–40; got ${adventureData.adventures.length}`);
const rewardCounts=rewardData.rewards.reduce((m,r)=>(m[r.type]=(m[r.type]??0)+1,m),{});assert.ok((rewardCounts.creatures??0)>=30,'V1 needs 30+ interactive creature definitions');assert.ok((rewardCounts.cosmetics??0)>=40,'V1 needs 40+ Pip cosmetics');assert.ok((rewardCounts.decorations??0)>=60,'V1 needs 60+ decorations');assert.ok((rewardCounts.vehicles??0)>=8&&(rewardCounts.vehicles??0)<=10,'V1 needs 8–10 vehicles');
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

console.log(`Little Legends M0-M29 qualification implementation check passed (M26/M29 human gates still pending): ${required.length} required files, ${jsFiles.length} JS syntax checks, ${activityEngine.list().length} JSON activities across ${expectedActivityTypes.size} reusable families, ${adventureData.adventures.length} Little Missions, privacy/child-test support, launch FX, save recovery, performance instrumentation and offline PWA verified.`);
