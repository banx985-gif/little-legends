import { DragToTargetActivity } from './DragToTargetActivity.js';
import { CountAndPlaceActivity } from './CountAndPlaceActivity.js';
import { MatchPairsActivity } from './MatchPairsActivity.js';
import { SortObjectsActivity } from './SortObjectsActivity.js';
import { TapRequestedObjectActivity } from './TapRequestedObjectActivity.js';
import { ShapeMatchActivity } from './ShapeMatchActivity.js';
import { SizeCompareActivity } from './SizeCompareActivity.js';
import { PatternCompleteActivity } from './PatternCompleteActivity.js';
import { SequenceOrderActivity } from './SequenceOrderActivity.js';
import { BuildObjectActivity } from './BuildObjectActivity.js';
import { MemoryMatchActivity } from './MemoryMatchActivity.js';
import { CategoriseActivity } from './CategoriseActivity.js';
import { WashSwipeActivity } from './WashSwipeActivity.js';
import { PaintSwipeActivity } from './PaintSwipeActivity.js';
import { TracePathActivity } from './TracePathActivity.js';
import { SoundMatchActivity } from './SoundMatchActivity.js';
import { RhythmRepeatActivity } from './RhythmRepeatActivity.js';
import { StoryChoiceActivity } from './StoryChoiceActivity.js';
import { QuantityCompareActivity } from './QuantityCompareActivity.js';
import { OddOneOutActivity } from './OddOneOutActivity.js';
import { NumberLineActivity } from './NumberLineActivity.js';
import { SameDifferentActivity } from './SameDifferentActivity.js';
import { OrderBySizeActivity } from './OrderBySizeActivity.js';
import { PicturePuzzleActivity } from './PicturePuzzleActivity.js';
import { FollowDirectionsActivity } from './FollowDirectionsActivity.js';

const BUILTIN_TYPES = Object.freeze({
  DragToTarget: DragToTargetActivity,
  CountAndPlace: CountAndPlaceActivity,
  MatchPairs: MatchPairsActivity,
  SortObjects: SortObjectsActivity,
  TapRequestedObject: TapRequestedObjectActivity,
  ShapeMatch: ShapeMatchActivity,
  SizeCompare: SizeCompareActivity,
  PatternComplete: PatternCompleteActivity,
  SequenceOrder: SequenceOrderActivity,
  BuildObject: BuildObjectActivity,
  MemoryMatch: MemoryMatchActivity,
  Categorise: CategoriseActivity,
  WashSwipe: WashSwipeActivity,
  PaintSwipe: PaintSwipeActivity,
  TracePath: TracePathActivity,
  SoundMatch: SoundMatchActivity,
  RhythmRepeat: RhythmRepeatActivity,
  StoryChoice: StoryChoiceActivity,
  QuantityCompare: QuantityCompareActivity,
  OddOneOut: OddOneOutActivity,
  NumberLine: NumberLineActivity,
  SameDifferent: SameDifferentActivity,
  OrderBySize: OrderBySizeActivity,
  PicturePuzzle: PicturePuzzleActivity,
  FollowDirections: FollowDirectionsActivity
});

export class ActivityEngine {
  constructor(game) {
    this.game = game;
    this.types = new Map(Object.entries(BUILTIN_TYPES));
    this.definitions = new Map();
    this.loaded = false;
  }

  registerType(name, ActivityClass) {
    this.types.set(name, ActivityClass);
  }

  setDefinitions(data) {
    const list = Array.isArray(data) ? data : data?.activities ?? [];
    this.definitions.clear();
    for (const definition of list) {
      if (!definition?.id || !definition?.type) continue;
      this.definitions.set(definition.id, definition);
    }
    this.loaded = true;
    return this.definitions.size;
  }

  async ensureLoaded(assetLoader, url = './data/activities.json') {
    if (this.loaded) return this.definitions.size;
    if (!assetLoader) throw new Error('ActivityEngine requires an AssetLoader before definitions are loaded.');
    const data = await assetLoader.load({ id: 'activity-definitions', type: 'json', url });
    const count = this.setDefinitions(data);
    if (!count) throw new Error('No activity definitions were loaded.');
    return count;
  }

  resolveDynamic(definition) {
    if (definition?.dynamic !== 'profileInitial') return definition;
    const profile = this.game?.save?.getActiveProfile?.();
    const initial = String(profile?.name ?? 'Little Legend').trim().charAt(0).toUpperCase() || 'L';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const index = Math.max(0, alphabet.indexOf(initial));
    const distractors = [alphabet[(index + 5) % 26], alphabet[(index + 11) % 26], alphabet[(index + 18) % 26]];
    const letters = [initial, ...distractors];
    return {
      ...definition,
      request: { kind: 'letter', value: initial },
      instructionText: `${profile?.name ?? 'Your name'} starts with which letter?`,
      voiceText: `${profile?.name ?? 'Your name'} starts with the letter ${initial}. Can you find ${initial}?`,
      objects: letters.map((value, i) => ({ kind:'letter', value, label:value, color:['purple','blue','orange','green'][i], x:540+i*300, y:i%2?730:580, size:170 })),
      skills: [...new Set([...(definition.skills ?? []), 'NAME_LETTER', 'LETTER_RECOGNITION', `LETTER_${initial}`])]
    };
  }

  create(id, host) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown activity: ${id}`);
    const dynamic = this.resolveDynamic(definition);
    const resolved = this.game?.adaptive?.apply ? this.game.adaptive.apply(dynamic, this.game.learning) : dynamic;
    const ActivityClass = this.types.get(resolved.type);
    if (!ActivityClass) throw new Error(`Unknown activity type: ${definition.type}`);
    return new ActivityClass({ game: this.game, host, definition: resolved });
  }

  get(id) { return this.definitions.get(id) ?? null; }
  list() { return [...this.definitions.values()]; }
  ids() { return [...this.definitions.keys()]; }
  nextId(id) {
    const ids = this.ids();
    if (!ids.length) return null;
    const i = Math.max(0, ids.indexOf(id));
    return ids[(i + 1) % ids.length];
  }
}
