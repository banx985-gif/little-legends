// Largest size (design pixels at 1920×1080) each kind of picture is drawn at; scripts/shrink-art.cjs keeps files ≈ 2× this.
// Pictures are decoded at this size × the screen's real pixels per design pixel, so a small tablet never holds full-size art.
export function drawnSize(id = '') {
  if (id.startsWith('art.') || id.startsWith('worlds.backgrounds.')) return 1920;
  if (id.startsWith('ui.')) return 160;
  if (/^objects.(letters|letters_lower|numbers)./.test(id)) return 220;
  if (id.startsWith('characters.')) return 420;
  if (id.startsWith('creatures.') || id.startsWith('rewards.hatch.')) return 420;
  if (id.startsWith('fx.')) return 640;
  if (id.startsWith('worlds.scenes.')) return 560;
  return 420;
}

export class AssetLoader {
  constructor() {
    this.cache = new Map();
    this.bytes = new Map();      // art id -> decoded size in bytes (width × height × 4)
    this.pixelScale = 0;         // real screen pixels per design pixel (0 = decode at full size)
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
        if (value && this.artUrls?.has(key)) this.bytes.set(key, (value.naturalWidth || value.width || 0) * (value.naturalHeight || value.height || 0) * 4);
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
        return this._sized(img, item.id);
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

  // Decoded at the size it is drawn (Job 10). An ImageBitmap keeps its decoded pixels, so Chrome on Android
  // never throws them away and re-decodes mid-frame (flicker), and close() frees the memory at once.
  async _sized(img, id) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!this.artUrls?.has(id) || typeof createImageBitmap !== 'function' || !w || !h) return img;
    const cap = this.pixelScale > 0 ? Math.ceil(drawnSize(id) * this.pixelScale * 1.15) : Infinity;
    const k = Math.min(1, cap / Math.max(w, h));
    try {
      return k < 0.95 ? await createImageBitmap(img, { resizeWidth: Math.max(1, Math.round(w * k)), resizeHeight: Math.max(1, Math.round(h * k)), resizeQuality: 'high' })
        : await createImageBitmap(img);
    } catch { return img; }
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
  loadedArtUrls() { const urls = []; for (const [id, img] of this.cache) if (img && this.artUrls?.has(id)) urls.push(this.artUrls.get(id)); return urls; }
  loadedArtCount() { let n = 0; for (const id of this.cache.keys()) if (this.artUrls?.has(id)) n++; return n; }
  releaseArt(keep = new Set()) { let n = 0; for (const id of [...this.cache.keys()]) if (this.artUrls?.has(id) && !keep.has(id)) { this.release(id); n++; } return n; }
  artMemoryBytes() { let n = 0; for (const b of this.bytes.values()) n += b; return n; }

  get(id) { return this.cache.get(id); }
  release(id) { const v = this.cache.get(id); try { v?.close?.(); } catch {} this.cache.delete(id); this.failures.delete(id); this.bytes.delete(id); }
  clear() { for (const id of [...this.cache.keys()]) this.release(id); }

  _fallback(type) {
    if (type === 'json') return {};
    if (type === 'audio') return new ArrayBuffer(0);
    return null;
  }
}
