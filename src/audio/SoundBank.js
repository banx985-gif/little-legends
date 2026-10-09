// Recorded sounds (Job 13): effects, music, ambience and the Jungle Jam stems, played through AudioManager's channels.
// What plays for what is data/sound_map.json. Everything is optional: with no file, or no decoder (old Safari can't
// do Ogg), AudioManager keeps its built-in tones and synth music.
//
// Cheap 2–3 GB tablets come first:
// - Effects are short and decoded once, in groups: core at the first touch, the rest when a scene or world needs them.
//   In Lite mode the groups for a world you've left are let go again.
// - Music and ambience stream through an <audio> element (never decoded whole: a 3-minute track would be 15–30 MB).
// - The Jam stems (6 × 21 s) are decoded only while the Jam is open, then let go.
// - At most MAX_EFFECTS effects at once, and the same cue is skipped if it played less than REPEAT_GAP_MS ago.

export const MAX_EFFECTS = 4;
// Credits for the sound packs (Parent Area → DATA). data/sound_map.json "credits" says the same.
export const SOUND_CREDITS = 'Credits — sounds: Epic Stock Media (Vibrant Game, Pirate Game), Sonniss GDC 2026 / 344 Audio, TomMusic.';
export const REPEAT_GAP_MS = 60;
const MUSIC_FADE = 1.2;
const AMBIENT_LEVEL = 0.35;

function decodeWith(ctx, data) {
  return new Promise((resolve, reject) => { const p = ctx.decodeAudioData(data, resolve, reject); if (p?.then) p.then(resolve, reject); });
}

export class SoundBank {
  constructor(audio) {
    this.audio = audio;
    this.map = null;
    this.buffers = new Map();      // file id -> AudioBuffer
    this.loading = new Map();      // file id -> Promise
    this.groups = new Set();       // groups loaded (or loading)
    this.playing = new Set();
    this.lastPlayed = new Map();
    this.turn = 0;
    this.music = null;             // { a, b, current, key }
    this.ambient = null;
    this.jam = null;
  }

  setMap(map) { this.map = map && typeof map === 'object' ? map : null; return this.map; }
  async loadMap(url = './data/sound_map.json') {
    if (this.map || typeof fetch !== 'function' || globalThis.location?.protocol === 'file:') return this.map;
    try { const r = await fetch(url); if (r.ok) this.setMap(await r.json()); } catch {}
    return this.map;
  }
  url(id) { return `${this.map?.base ?? './assets/audio/'}${id}.ogg`; }
  canDecode() { return typeof fetch === 'function' && typeof this.audio.ctx?.decodeAudioData === 'function' && globalThis.location?.protocol !== 'file:'; }

  // ---- effects ----
  loadFile(id) {
    if (this.buffers.has(id)) return Promise.resolve(this.buffers.get(id));
    if (this.loading.has(id)) return this.loading.get(id);
    if (!this.canDecode()) return Promise.resolve(null);
    const job = fetch(this.url(id)).then(r => (r.ok ? r.arrayBuffer() : null)).then(data => (data ? decodeWith(this.audio.ctx, data) : null))
      .then(buffer => { if (buffer) this.buffers.set(id, buffer); this.loading.delete(id); return buffer; })
      .catch(() => { this.loading.delete(id); return null; });
    this.loading.set(id, job);
    return job;
  }
  loadGroups(groups) {
    const want = new Set(groups);
    const jobs = [];
    for (const g of want) this.groups.add(g);
    for (const cue of Object.values(this.map?.sfx ?? {})) if (want.has(cue.group)) for (const f of cue.files ?? []) jobs.push(this.loadFile(f));
    return Promise.all(jobs);
  }
  // Lite mode: let go of effect groups the next scene doesn't need (core always stays).
  unloadExcept(keepGroups) {
    const keep = new Set(['core', ...keepGroups]);
    for (const cue of Object.values(this.map?.sfx ?? {})) if (!keep.has(cue.group)) for (const f of cue.files ?? []) this.buffers.delete(f);
    for (const g of [...this.groups]) if (!keep.has(g)) this.groups.delete(g);
  }
  groupsFor(scene, world = null) { return [...new Set([...(this.map?.groupsByScene?.[scene] ?? []), ...(this.map?.groupsByWorld?.[world] ?? [])])]; }

  // Plays a cue's recording; false when it has none ready (the caller then plays the tones).
  play(name, { count = 0, gain = 1 } = {}) {
    const cue = this.map?.sfx?.[name];
    if (!cue || !this.audio.ctx) return false;
    const now = Date.now();
    if (now - (this.lastPlayed.get(name) ?? -1e9) < REPEAT_GAP_MS) return true; // rapid tapping: one is enough
    const ready = (cue.files ?? []).map(f => this.buffers.get(f)).filter(Boolean);
    if (!ready.length) { if (!this.groups.has(cue.group)) this.loadGroups([cue.group]); else for (const f of cue.files ?? []) this.loadFile(f); return false; }
    if (this.playing.size >= MAX_EFFECTS) return true; // already busy: skip rather than pile up
    const buffer = ready.length > 1 ? ready[Math.floor(Math.random() * ready.length)] : ready[0];
    const rate = cue.pitchByCount ? 1 + Math.min(10, Math.max(0, count)) * cue.pitchByCount : 1;
    const played = this.audio.playBuffer(cue.channel ?? 'activity', buffer, { gain: Math.min(0.8, (cue.gain ?? 0.7) * gain), rate });
    if (!played) return false;
    this.lastPlayed.set(name, now);
    this.playing.add(played.source);
    const done = played.source.onended;
    played.source.onended = (...a) => { this.playing.delete(played.source); done?.(...a); };
    return true;
  }
  // The recorded sound for an animal or picture id, or null (data/sound_map.json animalCues).
  animalCue(name) {
    const cues = this.map?.animalCues ?? {};
    const key = String(name ?? '').toLowerCase();
    if (cues[key]) return cues[key];
    const hit = Object.keys(cues).find(k => k !== 'about' && key.includes(k));
    return hit ? cues[hit] : null;
  }

  // ---- music and ambience: streamed <audio> into the channels ----
  mediaSupported() { return typeof document !== 'undefined' && typeof Audio === 'function' && typeof this.audio.ctx?.createMediaElementSource === 'function' && globalThis.location?.protocol !== 'file:'; }
  makeDeck(channel) {
    const el = new Audio(); el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
    const node = this.audio.ctx.createMediaElementSource(el), gain = this.audio.ctx.createGain();
    gain.gain.value = 0; node.connect(gain); gain.connect(this.audio.channelNode(channel));
    return { el, gain, src: null };
  }
  // Crossfades to a track (music/<key>.ogg); false if streaming isn't possible here (synth music stays).
  playMusic(key) {
    const id = this.map?.music?.[key];
    if (!id || !this.mediaSupported() || !this.audio.unlocked) return false;
    this.music ??= { a: this.makeDeck('music'), b: this.makeDeck('music'), current: null, key: null };
    if (this.music.key === key && this.music.current) return true;
    const next = this.music.current === this.music.a ? this.music.b : this.music.a, prev = this.music.current;
    const src = this.url(id);
    if (next.src !== src) { next.el.src = src; next.src = src; }
    next.el.currentTime = 0;
    const started = next.el.play(); started?.catch?.(() => {});
    this.audio.rampParam(next.gain.gain, 1, MUSIC_FADE);
    if (prev) { this.audio.rampParam(prev.gain.gain, 0, MUSIC_FADE); const el = prev.el; setTimeout(() => { if (this.music?.current !== prev) el.pause(); }, MUSIC_FADE * 1000 + 100); }
    this.music.current = next; this.music.key = key;
    return true;
  }
  stopMusic() {
    if (!this.music?.current) return;
    const deck = this.music.current; this.music.current = null; this.music.key = null;
    this.audio.rampParam(deck.gain.gain, 0, MUSIC_FADE);
    setTimeout(() => { if (this.music?.current !== deck) deck.el.pause(); }, MUSIC_FADE * 1000 + 100);
  }
  playAmbient(key) {
    const id = this.map?.ambient?.[key];
    if (globalThis.__LL_QUALITY === 'lite' || !id || !this.mediaSupported() || !this.audio.unlocked) { this.stopAmbient(); return false; } // off in Lite mode
    this.ambient ??= this.makeDeck('ambient');
    const src = this.url(id);
    if (this.ambient.src !== src) { this.ambient.src = src; this.ambient.el.src = src; }
    this.ambient.el.play()?.catch?.(() => {});
    this.audio.rampParam(this.ambient.gain.gain, AMBIENT_LEVEL, MUSIC_FADE);
    return true;
  }
  stopAmbient() {
    if (!this.ambient) return;
    const deck = this.ambient; this.audio.rampParam(deck.gain.gain, 0, MUSIC_FADE);
    setTimeout(() => { if (deck.gain.gain.value < 0.02) deck.el.pause(); }, MUSIC_FADE * 1000 + 100);
  }

  // ---- Jungle Jam stems: decoded while the Jam is open, all started together and looping in step ----
  async startJam() {
    if (this.jam || !this.canDecode() || !this.map?.jam) return false;
    this.jam = { loading: true, roles: {}, until: {}, loudness: 0.7, rate: 1 };
    const entries = Object.entries(this.map.jam).filter(([k]) => k !== 'about');
    const buffers = await Promise.all(entries.map(([, id]) => this.loadFile(id)));
    if (!this.jam) return false; // left the Jam while loading
    if (buffers.some(b => !b)) { this.stopJam(); return false; }
    const ctx = this.audio.ctx, at = ctx.currentTime + 0.08;
    entries.forEach(([role, id], i) => {
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffers[i]; source.loop = true; gain.gain.value = 0;
      source.connect(gain); gain.connect(this.audio.channelNode('music')); source.start(at);
      this.jam.roles[role] = { source, gain, id };
    });
    this.jam.loading = false;
    return true;
  }
  stopJam() {
    if (!this.jam) return;
    for (const { source, gain, id } of Object.values(this.jam.roles)) { try { gain.gain.value = 0; source.stop(); } catch {} this.buffers.delete(id); }
    this.jam = null;
  }
  jamReady() { return Boolean(this.jam && !this.jam.loading); }
  // A band friend plays: its stem is up for the next ~1.2 s (the scene calls this every beat while it's on stage).
  jamPlay(role, loudness = 0.7) { if (!this.jamReady() || !this.jam.roles[role]) return false; this.jam.until[role] = (this.audio.ctx?.currentTime ?? 0) + 1.2; this.jam.loudness = loudness; return true; }
  setJamTempo(fast) { if (!this.jamReady()) return; const rate = fast ? 1.2 : 0.9; for (const { source } of Object.values(this.jam.roles)) source.playbackRate?.setValueAtTime?.(rate, this.audio.ctx.currentTime); }
  update() {
    if (!this.jamReady()) return;
    const now = this.audio.ctx.currentTime, active = Object.keys(this.jam.until).filter(r => this.jam.until[r] > now);
    for (const [role, { gain }] of Object.entries(this.jam.roles)) {
      const on = role === 'full' ? active.length >= 4 : active.includes(role);
      const target = on ? (role === 'full' ? 0.6 : 0.9) * this.jam.loudness : 0;
      gain.gain.value += (target - gain.gain.value) * 0.18;
    }
  }

  // Decoded sound memory in bytes (for the picture stats overlay).
  memoryBytes() { let n = 0; for (const b of this.buffers.values()) n += (b.length ?? 0) * (b.numberOfChannels ?? 1) * 4; return n; }
}
