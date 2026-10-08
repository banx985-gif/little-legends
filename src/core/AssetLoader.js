export class AssetLoader {
  constructor() {
    this.cache = new Map();
    this.failures = new Map();
    this.progress = { loaded: 0, total: 0 };
  }

  async loadManifest(items = [], onProgress = () => {}) {
    this.progress = { loaded: 0, total: items.length };
    const results = await Promise.allSettled(items.map(async item => {
      const value = await this.load(item);
      this.progress.loaded++;
      onProgress(this.progress.loaded / Math.max(1, this.progress.total), item);
      return value;
    }));
    return results;
  }

  async load(item, retries = 1) {
    const key = item.id ?? item.url;
    if (this.cache.has(key)) return this.cache.get(key);
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const value = await this._loadOnce(item);
        this.cache.set(key, value);
        this.failures.delete(key);
        return value;
      } catch (error) {
        lastError = error;
      }
    }
    this.failures.set(key, lastError);
    const fallback = this._fallback(item.type);
    this.cache.set(key, fallback);
    return fallback;
  }

  async _loadOnce(item) {
    switch (item.type) {
      case 'image': {
        const img = new Image();
        img.decoding = 'async';
        img.src = globalThis.__LL_EMBEDDED_ASSETS?.[item.url] ?? item.url;
        await img.decode();
        return img;
      }
      case 'json': {
        const r = await fetch(item.url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }
      case 'audio': {
        const r = await fetch(item.url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      }
      case 'font': {
        const face = new FontFace(item.family, `url(${item.url})`);
        await face.load();
        document.fonts.add(face);
        return face;
      }
      default: throw new Error(`Unsupported asset type: ${item.type}`);
    }
  }

  // Real art: assets/art_manifest.json lists every picture (id -> url); data/art_map.json says which game thing uses which.
  async loadArtIndex({ manifestUrl = './assets/art_manifest.json', mapUrl = './data/art_map.json' } = {}) {
    const [manifest, map] = await Promise.all([
      this.load({ id: 'art-manifest', type: 'json', url: manifestUrl }),
      this.load({ id: 'art-map', type: 'json', url: mapUrl })
    ]);
    this.artUrls = new Map((Array.isArray(manifest) ? manifest : []).filter(e => e?.id && e?.url).map(e => [e.id, e.url]));
    this.artMap = map?.version ? map : null;
    this.artPending = new Set();
    return this.artUrls.size;
  }

  // Loads pictures by art id. Unknown ids, and (in the one-file build) pictures that were not embedded, are skipped.
  async loadArt(ids = [], onProgress = () => {}) {
    const items = [...new Set(ids)].filter(id => this.artUrls?.has(id) && !this.cache.has(id) && !this.artPending?.has(id))
      .filter(id => !globalThis.__LL_STANDALONE || globalThis.__LL_EMBEDDED_ASSETS?.[this.artUrls.get(id)])
      .map(id => ({ id, type: 'image', url: this.artUrls.get(id) }));
    if (!items.length) return [];
    for (const item of items) this.artPending?.add(item.id);
    let done = 0;
    const results = await Promise.allSettled(items.map(async item => {
      try { return await this.load(item); }
      finally { this.artPending?.delete(item.id); onProgress(++done / items.length, item); }
    }));
    return results;
  }

  requestArt(id) { if (this.artUrls?.has(id) && !this.cache.has(id) && !this.artPending?.has(id)) this.loadArt([id]); }
  loadedArtCount() { let n = 0; for (const id of this.cache.keys()) if (this.artUrls?.has(id)) n++; return n; }
  releaseArt(keep = new Set()) { for (const id of [...this.cache.keys()]) if (this.artUrls?.has(id) && !keep.has(id)) this.release(id); }

  get(id) { return this.cache.get(id); }
  release(id) { this.cache.delete(id); this.failures.delete(id); }
  clear() { this.cache.clear(); this.failures.clear(); }

  _fallback(type) {
    if (type === 'json') return {};
    if (type === 'audio') return new ArrayBuffer(0);
    return null;
  }
}
