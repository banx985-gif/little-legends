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
  list() { return [...this.definitions.values()]; }
}
