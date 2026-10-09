const DB_NAME = 'little-legends';
const DB_VERSION = 1;
const STORE = 'kv';
const ROOT_KEY = 'app-state';
const BACKUP_KEY = 'app-state-backup';
const SAVE_VERSION = 2;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function blankRoot() {
  return {
    version: SAVE_VERSION,
    activeProfileId: null,
    profiles: [],
    profileStates: {},
    settings: { master: 0.9, music: 0.55, voice: 1, character: 0.9, ui: 0.85, ambient: 0.55, activity: 0.9, quietMode: false, reducedMotion: false, uiScale: 1, colorSymbols: true, sessionReminder: 20, performanceMode: 'auto' },
    childTestSessions: [],
    releaseQualification: { version:1, manual:{}, snapshots:[], automated:null, updatedAt:null }
  };
}

function blankProfileState() {
  return {
    version: SAVE_VERSION,
    learning: null,
    discoveryStars: 0,
    eggs: {},
    unlocks: { creatures: [], decorations: [], cosmetics: [], vehicles: [], toys: [], buildings: [] },
    island: { placements: {} },
    pip: { outfit: { hat: 'starter-leaf' } },
    adventure: { currentId: null, step: 0, completed: [] },
    settings: {}
  };
}

export class SaveSystem {
  constructor({ indexedDBRef = globalThis.indexedDB, storage = globalThis.localStorage } = {}) {
    this.indexedDBRef = indexedDBRef;
    this.storage = storage;
    this.db = null;
    this.root = blankRoot();
    this.ready = false;
    this.memoryOnly = !indexedDBRef && !storage;
    this.writeChain = Promise.resolve();
    this.lastPersisted = clone(this.root);
    this.recoveryInfo = { recovered:false, source:null, lastError:null, quotaLimited:false };
  }

  async init() {
    if (this.ready) return this.root;
    if (this.indexedDBRef) {
      try {
        this.db = await this.openDB();
        const saved = await this.idbGet(ROOT_KEY);
        if (saved) {
          try { this.root = this.migrate(saved); }
          catch (error) {
            const backup = await this.idbGet(BACKUP_KEY);
            if (!backup) throw error;
            this.root = this.migrate(backup);
            this.recoveryInfo = { ...this.recoveryInfo, recovered:true, source:'indexeddb-backup', lastError:String(error?.message??error) };
          }
        }
      } catch (error) {
        console.warn('IndexedDB unavailable; falling back to local storage/memory.', error);
      }
    }
    if (!this.db && this.storage) {
      try {
        const raw = this.storage.getItem(DB_NAME);
        if (raw) {
          try { this.root = this.migrate(JSON.parse(raw)); }
          catch (error) {
            const backupRaw = this.storage.getItem(`${DB_NAME}-backup`);
            if (!backupRaw) throw error;
            this.root = this.migrate(JSON.parse(backupRaw));
            this.recoveryInfo = { ...this.recoveryInfo, recovered:true, source:'localstorage-backup', lastError:String(error?.message??error) };
          }
        }
      } catch (error) {
        console.warn('Local save unavailable; using memory-only progress.', error);
      }
    }
    this.root = this.migrate(this.root);
    this.lastPersisted = clone(this.root);
    this.ready = true;
    return this.root;
  }

  migrate(saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid Little Legends save root.');
    const root = { ...blankRoot(), ...(saved ?? {}) };
    root.version = SAVE_VERSION;
    root.profiles = Array.isArray(root.profiles) ? root.profiles : [];
    root.profileStates = root.profileStates && typeof root.profileStates === 'object' ? root.profileStates : {};
    root.settings = { ...blankRoot().settings, ...(root.settings ?? {}) };
    root.childTestSessions = Array.isArray(root.childTestSessions) ? root.childTestSessions.slice(-20) : [];
    root.releaseQualification = root.releaseQualification && typeof root.releaseQualification === 'object' ? root.releaseQualification : blankRoot().releaseQualification;
    root.releaseQualification.manual = root.releaseQualification.manual && typeof root.releaseQualification.manual === 'object' ? root.releaseQualification.manual : {};
    root.releaseQualification.snapshots = Array.isArray(root.releaseQualification.snapshots) ? root.releaseQualification.snapshots.slice(-12) : [];
    for (const profile of root.profiles) {
      const defaults = blankProfileState();
      const savedState = root.profileStates[profile.id] ?? {};
      const state = { ...defaults, ...savedState };
      state.discoveryStars = Math.max(0, Number(state.discoveryStars) || 0);
      state.eggs = state.eggs && typeof state.eggs === 'object' && !Array.isArray(state.eggs) ? state.eggs : {};
      state.unlocks = { ...defaults.unlocks, ...(state.unlocks ?? {}) };
      for (const key of Object.keys(defaults.unlocks)) state.unlocks[key] = Array.isArray(state.unlocks[key]) ? [...new Set(state.unlocks[key].filter(Boolean))] : [];
      state.island = { ...defaults.island, ...(state.island ?? {}) };
      state.island.placements = state.island.placements && typeof state.island.placements === 'object' && !Array.isArray(state.island.placements) ? state.island.placements : {};
      state.pip = { ...defaults.pip, ...(state.pip ?? {}) };
      state.pip.outfit = { ...defaults.pip.outfit, ...(state.pip.outfit ?? {}) };
      // Job 09: looks worn one per slot ({ head, eyes, body, back, extra } -> reward id). Older saves only have cosmeticId.
      if (state.pip.outfit.worn !== undefined) {
        const worn = state.pip.outfit.worn && typeof state.pip.outfit.worn === 'object' && !Array.isArray(state.pip.outfit.worn) ? state.pip.outfit.worn : {};
        state.pip.outfit.worn = Object.fromEntries(Object.entries(worn).filter(([slot, id]) => ['head', 'eyes', 'body', 'back', 'extra'].includes(slot) && typeof id === 'string' && id));
      }
      state.adventure = { ...defaults.adventure, ...(state.adventure ?? {}) };
      state.adventure.currentId = typeof state.adventure.currentId === 'string' && state.adventure.currentId ? state.adventure.currentId : null;
      state.adventure.step = Math.max(0, Number(state.adventure.step) || 0);
      state.adventure.completed = Array.isArray(state.adventure.completed) ? [...new Set(state.adventure.completed.filter(Boolean))] : [];
      state.settings = state.settings && typeof state.settings === 'object' && !Array.isArray(state.settings) ? state.settings : {};
      root.profileStates[profile.id] = state;
    }
    if (root.activeProfileId && !root.profiles.some(profile => profile.id === root.activeProfileId)) root.activeProfileId = null;
    return root;
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = this.indexedDBRef.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'));
      request.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
  }

  idbGet(key) {
    return new Promise((resolve, reject) => {
      const request = this.db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  idbPut(key, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Save write aborted'));
    });
  }

  async persist() {
    if (!this.ready) await this.init();
    const snapshot = clone(this.root);
    const previous = clone(this.lastPersisted);
    this.writeChain = this.writeChain.then(async () => {
      if (this.db) {
        if (previous) await this.idbPut(BACKUP_KEY, previous);
        await this.idbPut(ROOT_KEY, snapshot);
        this.lastPersisted = clone(snapshot);
        return true;
      }
      if (this.storage) {
        if (previous) this.storage.setItem(`${DB_NAME}-backup`, JSON.stringify(previous));
        this.storage.setItem(DB_NAME, JSON.stringify(snapshot));
        this.lastPersisted = clone(snapshot);
        return true;
      }
      this.lastPersisted = clone(snapshot);
      return true;
    }).catch(error => {
      const quota = error?.name === 'QuotaExceededError' || /quota/i.test(String(error?.message??''));
      this.recoveryInfo = { ...this.recoveryInfo, lastError:String(error?.message??error), quotaLimited:quota || this.recoveryInfo.quotaLimited };
      console.warn('Little Legends save failed.', error);
      return false;
    });
    return this.writeChain;
  }

  listProfiles() { return this.root.profiles.map(clone); }
  getActiveProfile() { return clone(this.root.profiles.find(profile => profile.id === this.root.activeProfileId) ?? null); }

  getProfileState(profileId = this.root.activeProfileId) {
    if (!profileId) return null;
    const state = this.root.profileStates[profileId];
    return state ? clone(state) : null;
  }

  async ensureGuestProfile() {
    if (!this.ready) await this.init();
    if (this.root.profiles.length) {
      if (!this.root.activeProfileId) this.root.activeProfileId = this.root.profiles[0].id;
      return this.getActiveProfile();
    }
    return this.createProfile({ name: 'Little Legend', age: 3, language: 'en-AU', avatar: 'pip-star', favoriteColor: 'purple', pipHat: 'starter-leaf', guest: true });
  }

  async createProfile({ name = 'Little Legend', age = 3, language = 'en-AU', avatar = 'pip-star', favoriteColor = 'purple', pipHat = 'starter-leaf', guest = false } = {}) {
    if (!this.ready) await this.init();
    if (this.root.profiles.length >= 4) throw new Error('Little Legends supports up to four child profiles in V1.');
    const id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const profile = { id, name: String(name).slice(0, 24) || 'Little Legend', age: Math.max(2, Math.min(5, Number(age) || 3)), language, avatar, favoriteColor, pipHat, guest: Boolean(guest), createdAt: Date.now() };
    this.root.profiles.push(profile);
    this.root.profileStates[id] = blankProfileState();
    this.root.profileStates[id].pip.outfit.hat = pipHat;
    this.root.activeProfileId = id;
    await this.persist();
    return clone(profile);
  }

  async selectProfile(id) {
    if (!this.root.profiles.some(profile => profile.id === id)) return false;
    this.root.activeProfileId = id;
    await this.persist();
    return true;
  }

  async updateProfile(id, patch = {}) {
    const profile = this.root.profiles.find(item => item.id === id);
    if (!profile) return null;
    Object.assign(profile, patch, { id: profile.id, createdAt: profile.createdAt });
    await this.persist();
    return clone(profile);
  }

  async patchProfileState(patch, profileId = this.root.activeProfileId) {
    if (!profileId) await this.ensureGuestProfile();
    const id = profileId ?? this.root.activeProfileId;
    const current = this.root.profileStates[id] ?? blankProfileState();
    this.root.profileStates[id] = { ...current, ...clone(patch) };
    await this.persist();
    return this.getProfileState(id);
  }

  async mutateProfileState(mutator, profileId = this.root.activeProfileId) {
    if (!profileId) await this.ensureGuestProfile();
    const id = profileId ?? this.root.activeProfileId;
    const draft = clone(this.root.profileStates[id] ?? blankProfileState());
    await mutator(draft);
    this.root.profileStates[id] = draft;
    await this.persist();
    return clone(draft);
  }

  async saveLearning(snapshot) {
    return this.mutateProfileState(state => { state.learning = clone(snapshot); });
  }

  async award(kind, id) {
    return this.mutateProfileState(state => {
      const list = state.unlocks[kind] ?? (state.unlocks[kind] = []);
      if (!list.includes(id)) list.push(id);
    });
  }


  async addDiscoveryStars(amount = 1) {
    return this.mutateProfileState(state => { state.discoveryStars = Math.max(0, (Number(state.discoveryStars) || 0) + Math.max(0, Number(amount) || 0)); });
  }

  async spendDiscoveryStars(amount = 1) {
    let spent = false;
    await this.mutateProfileState(state => { const cost = Math.max(0, Number(amount) || 0); if ((state.discoveryStars || 0) >= cost) { state.discoveryStars -= cost; spent = true; } });
    return spent;
  }

  async saveEgg(id, egg) {
    return this.mutateProfileState(state => { state.eggs ??= {}; state.eggs[id] = clone(egg); });
  }

  async saveAdventure(currentId, step, { completed = false } = {}) {
    return this.mutateProfileState(state => {
      state.adventure = { ...blankProfileState().adventure, ...(state.adventure ?? {}) };
      state.adventure.completed = Array.isArray(state.adventure.completed) ? state.adventure.completed : [];
      state.adventure.currentId = completed ? null : currentId;
      state.adventure.step = completed ? 0 : Math.max(0, Number(step) || 0);
      if (completed && currentId && !state.adventure.completed.includes(currentId)) state.adventure.completed.push(currentId);
    });
  }

  async saveIslandPlacement(id, placement) {
    return this.mutateProfileState(state => { state.island.placements[id] = clone(placement); });
  }

  async setPipOutfit(patch = {}) {
    return this.mutateProfileState(state => { state.pip ??= { outfit: { hat:'starter-leaf' } }; state.pip.outfit = { ...(state.pip.outfit ?? {}), ...clone(patch) }; });
  }

  getSettings() { return clone(this.root.settings); }
  async setSettings(settings) { this.root.settings = { ...this.root.settings, ...clone(settings) }; await this.persist(); return this.getSettings(); }

  listChildTestSessions() { return clone(this.root.childTestSessions ?? []); }
  async addChildTestSession(session) { this.root.childTestSessions ??= []; this.root.childTestSessions.push(clone(session)); this.root.childTestSessions = this.root.childTestSessions.slice(-20); await this.persist(); return this.listChildTestSessions().at(-1); }
  async clearChildTestSessions() { this.root.childTestSessions = []; await this.persist(); return true; }
  getReleaseQualification() { return clone(this.root.releaseQualification ?? blankRoot().releaseQualification); }
  async setReleaseQualification(value = {}) {
    const base = blankRoot().releaseQualification;
    this.root.releaseQualification = { ...base, ...clone(value), manual:{ ...(value?.manual ?? {}) }, snapshots:Array.isArray(value?.snapshots) ? clone(value.snapshots).slice(-12) : [] };
    await this.persist();
    return this.getReleaseQualification();
  }
  getSaveHealth() { return { ...this.recoveryInfo, memoryOnly:this.memoryOnly || (!this.db && !this.storage), ready:this.ready, saveVersion:SAVE_VERSION }; }

  exportData() { return clone(this.root); }

  async resetAll() {
    this.root = blankRoot();
    await this.persist();
  }
}

export { SAVE_VERSION };
