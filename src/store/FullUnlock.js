// Job 18: free to try + one "Unlock everything" (decided 2026-10-22). No coins, gems, ads or repeat buying.
// - Free: Wonder Island (and its playground), Dino Valley, Rainbow Village, the free colouring pages, the Collection
//   (sticker book) and the dress-up basics. Everything else stays visible with a soft padlock and a sleepy look; a child
//   tapping it hears Pip say "Ask a grown-up!" (never a price, never a buy button).
// - Buying is only in the Parent Area, behind a grown-up check (hold 3 s, then an easy sum in words).
// - Google Play, one-time product `full_unlock` (about A$4.99), through the app's own Billing plugin
//   (app-android/android/app/src/main/java/com/banxgames/littlelegends/BillingPlugin.java). It is the game's only network use.
//   The unlock is kept on the tablet, so it keeps working offline; it is re-checked with Google Play when the app starts.
// - The web build (GitHub Pages) and the one-file test build have no store: everything is unlocked there.
//   Add ?locked=1 to the address to preview the free version.
export const PRODUCT_ID = 'full_unlock';
export const FREE_WORLDS = new Set(['dino', 'rainbow']);
export const PRICE_FALLBACK = 'A$4.99';

export class FullUnlock {
  constructor(game, { native = Boolean(globalThis.Capacitor?.isNativePlatform?.()), preview = /[?&]locked=1\b/.test(globalThis.location?.search ?? '') } = {}) {
    this.game = game;
    this.native = native;   // the Android app (has Google Play)
    this.preview = preview; // web: show the free version
    this.debug = false;     // debug build (the Parent Area shows a test switch)
    this.price = null;      // from Google Play, e.g. "A$4.99"
    this.pending = false;   // paid with a slow method (e.g. cash at a shop): unlocks when Google Play confirms
    this.busy = false;
  }

  get hasStore() { return this.native; }
  billing(method, options = {}) {
    const bridge = globalThis.Capacitor;
    return typeof bridge?.nativePromise === 'function' ? bridge.nativePromise('Billing', method, options) : Promise.reject(new Error('No store in this build'));
  }
  store() { return this.game.save?.getStore?.() ?? {}; }
  isUnlocked() {
    if (!this.native) return !this.preview;
    const s = this.store();
    return Boolean(s.fullUnlock || (this.debug && s.devUnlock));
  }
  worldOpen(id) { return !id || FREE_WORLDS.has(id) || this.isUnlocked(); }
  pageOpen(page) { return Boolean(page?.free) || this.isUnlocked(); }

  // Google Play's answer -> the tablet's copy. Offline or no answer: the copy stays as it was.
  async apply(result) {
    if (!result || typeof result !== 'object') return this.isUnlocked();
    if (typeof result.debug === 'boolean') this.debug = result.debug;
    if (typeof result.price === 'string' && result.price) this.price = result.price;
    this.pending = Boolean(result.pending);
    if (typeof result.owned === 'boolean') await this.game.save?.setStore?.({ fullUnlock: result.owned, checkedAt: Date.now() });
    return this.isUnlocked();
  }
  // At start-up (and RESTORE): ask Google Play what this account owns.
  async refresh() {
    if (!this.native) return this.isUnlocked();
    try { return await this.apply(await this.billing('status')); }
    catch (error) { console.warn('Google Play not reachable; keeping the saved unlock.', error); return this.isUnlocked(); }
  }
  restore() { return this.refresh(); }
  // Parent Area only, after the grown-up check. Resolves { owned } | { cancelled } | { pending } | { error }.
  async buy() {
    if (!this.native) return { error: 'This version has no store.' };
    if (this.busy) return { busy: true };
    this.busy = true;
    try { const result = await this.billing('buy'); await this.apply(result); return result ?? {}; }
    catch (error) { return { error: String(error?.message ?? error) }; }
    finally { this.busy = false; }
  }
  // Debug builds only: switch the unlock on and off for testing.
  async setDevUnlock(on) { if (this.debug) await this.game.save?.setStore?.({ devUnlock: Boolean(on) }); return this.isUnlocked(); }
}

// A grown-up check before any buy screen (Google Play Families): hold a button for 3 s, then an easy sum written in words.
export const HOLD_TO_BUY = 3;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export function makeSum(rng = Math.random) {
  const a = 2 + Math.floor(rng() * 6), b = 2 + Math.floor(rng() * 5), answer = a + b, choices = new Set([answer]);
  while (choices.size < 4) choices.add(Math.max(2, Math.min(12, answer + Math.floor(rng() * 7) - 3)));
  return { text: `What is ${WORDS[a]} plus ${WORDS[b]}?`, answer, choices: [...choices].sort((x, y) => x - y) };
}
