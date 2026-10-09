// The order a child meets the worlds in (the world map's card order).
export const WORLD_ORDER = ['dino', 'rainbow', 'space', 'animal', 'jungle', 'storybook', 'life', 'town'];

export class AdventureEngine {
  constructor(game) {
    this.game = game;
    this.definitions = new Map();
    this.loaded = false;
  }

  setDefinitions(data) {
    const list = Array.isArray(data) ? data : data?.adventures ?? [];
    this.definitions.clear();
    for (const definition of list) if (definition?.id) this.definitions.set(definition.id, definition);
    this.loaded = true;
    return this.definitions.size;
  }

  async ensureLoaded(assetLoader, url = './data/adventures.json') {
    if (this.loaded) return this.definitions.size;
    const data = await assetLoader.load({ id: 'adventure-definitions', type: 'json', url });
    const count = this.setDefinitions(data);
    if (!count) throw new Error('No adventure definitions were loaded.');
    return count;
  }

  get(id) { return this.definitions.get(id) ?? null; }

  // The mission a child plays next (Job 14: one big PLAY, missions move on by themselves).
  // After `afterId`: the next unfinished one in the same world, then the first unfinished in the following worlds;
  // with everything finished, simply the next mission (so play never stops). No `afterId`: the first unfinished one.
  next(completed = [], afterId = null) {
    const done = new Set(completed);
    const all = WORLD_ORDER.flatMap(w => this.list().filter(a => a.world === w));
    if (!all.length) return null;
    const at = Math.max(-1, all.findIndex(a => a.id === afterId));
    const ordered = [...all.slice(at + 1), ...all.slice(0, at + 1)];
    return ordered.find(a => !done.has(a.id) && a.id !== afterId) ?? ordered[0] ?? null;
  }
  list() { return [...this.definitions.values()]; }
}
