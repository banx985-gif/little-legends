// Job 20: little reminders for the grown-up, made and shown ON this device. Nothing is sent anywhere.
// - Kinds (one switch each, per child): egg ready, a surprise waiting, today's Adventure Trail (off until Job 19 builds it).
// - At most 2 a day across all kinds, never 22:00–08:00 (device time): one that would land in quiet hours moves to 08:00–09:00.
//   One pending per kind. Scheduled from the save when the game goes to the background; cleared when it comes back.
// - Never asks at first launch: after the child's first mission win Pip asks the grown-up (YES → 3-second grown-up hold →
//   the system's own question; NOT NOW is remembered and never asked again). Parent Area → Settings has the switches.
// - Android app: @capacitor/local-notifications. Web: the browser's notifications only while the game is open in the
//   background (a closed browser tab can't schedule); otherwise nothing. The one-file test build: nothing. Never throws.
export const KINDS = ['egg', 'reward', 'trail'];
export const NOTIFY_TEXT = {
  egg: { title: 'Little Legends', body: 'Pip’s egg is wiggling! Come and hatch it 🥚' },
  reward: { title: 'Little Legends', body: 'A surprise is waiting on Wonder Island! 🎁' },
  trail: { title: 'Little Legends', body: 'Today’s Adventure Trail is ready! 🗺️' }
};
export const NOTIFY_IDS = { egg: 2001, reward: 2002, trail: 2003 }; // fixed ids: scheduling a kind again replaces it
export const DAILY_CAP = 2, QUIET_FROM = 22, QUIET_TO = 8;
const HOUR = 3600e3, DAY = 24 * HOUR;
const DELAY = { egg: 3 * HOUR, reward: 4 * HOUR }; // how long after leaving the game

const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const at = (t, h, m = 0) => { const d = new Date(t); d.setHours(h, m, 0, 0); return d.getTime(); };
export function inQuietHours(t) { const h = new Date(t).getHours(); return h >= QUIET_FROM || h < QUIET_TO; }
// A time in quiet hours moves to the next 08:00–09:00 (spread by `slot` so two don't land on the same minute).
export function outOfQuietHours(t, slot = 0) {
  if (!inQuietHours(t)) return t;
  const h = new Date(t).getHours(), morning = h >= QUIET_FROM ? at(t + DAY, QUIET_TO) : at(t, QUIET_TO);
  return morning + Math.min(55, 10 + slot * 20) * 60e3;
}

// What a save wants now: [{ kind, profileId }] (one per kind; the first child that qualifies), honouring every switch.
export function wanted(save, { trailReady = null } = {}) {
  const root = save?.root; if (!root || root.notify?.permission !== 'granted') return [];
  const out = new Map();
  for (const p of root.profiles ?? []) {
    const st = root.profileStates?.[p.id], n = st?.notify; if (!n?.on) continue;
    if (n.egg && !out.has('egg') && Object.values(st.eggs ?? {}).some(e => e?.state === 'READY')) out.set('egg', p.id);
    if (n.reward && !out.has('reward') && (st.rewardsWaiting ?? []).length) out.set('reward', p.id);
    if (n.trail && !out.has('trail') && trailReady?.(p.id, st)) out.set('trail', p.id);
  }
  return [...out].map(([kind, profileId]) => ({ kind, profileId }));
}

// When each wanted one shows: its delay, out of quiet hours, and no more than DAILY_CAP on a day (counting `sent`, the
// times already scheduled/shown). Pure, so the rules are tested in npm run check.
export function plan(now, want, sent = []) {
  const perDay = new Map(); for (const t of sent) perDay.set(dayKey(t), (perDay.get(dayKey(t)) ?? 0) + 1);
  const out = [];
  want.forEach((w, slot) => {
    let t = w.kind === 'trail' ? at(now + DAY, 9, 30) : now + (DELAY[w.kind] ?? 3 * HOUR);
    t = outOfQuietHours(t, slot);
    for (let guard = 0; (perDay.get(dayKey(t)) ?? 0) >= DAILY_CAP && guard < 14; guard++) t = at(t + DAY, QUIET_TO) + (10 + slot * 20) * 60e3;
    perDay.set(dayKey(t), (perDay.get(dayKey(t)) ?? 0) + 1);
    out.push({ ...w, id: NOTIFY_IDS[w.kind], at: t, ...NOTIFY_TEXT[w.kind] });
  });
  return out;
}

// Where a tap goes: Egg → that child's mission with the egg (or the island); Reward → Wonder Island with the prize;
// Trail → the trail. Unknown child (or more than one could be meant) → "Who is playing?" first, then the screen.
export function route(save, { kind, profileId } = {}) {
  const root = save?.root ?? {}, kids = root.profiles ?? [];
  if (!kids.some(p => p.id === profileId) && kids.length === 1) profileId = kids[0].id; // only one child: no doubt who
  const known = kids.some(p => p.id === profileId);
  const screen = (() => {
    const st = known ? root.profileStates?.[profileId] : null;
    if (kind === 'egg' && st?.adventure?.currentId) return { scene: 'adventure', data: { adventureId: st.adventure.currentId, step: st.adventure.step ?? 0 } };
    if (kind === 'trail') return { scene: 'trail', data: {} };
    return { scene: 'island', data: {} };
  })();
  if (!known) return { scene: 'profile', data: { then: screen } };
  return { ...screen, profileId };
}

// ---- where notifications actually go ----
class NoNotifier { get name() { return 'none'; } async permission() { return 'denied'; } async request() { return 'denied'; } async schedule() {} async cancel() {} async clearAll() {} onTap() {} }

class NativeNotifier {
  constructor(plugin) { this.p = plugin; }
  get name() { return 'android'; }
  async permission() { try { return (await this.p.checkPermissions())?.display === 'granted' ? 'granted' : 'denied'; } catch { return 'denied'; } }
  async request() { try { return (await this.p.requestPermissions())?.display === 'granted' ? 'granted' : 'denied'; } catch { return 'denied'; } }
  async schedule(list) {
    if (!list.length) return;
    await this.p.schedule({ notifications: list.map(n => ({ id: n.id, title: n.title, body: n.body, smallIcon: 'ic_stat_notify', schedule: { at: new Date(n.at), allowWhileIdle: false }, extra: { kind: n.kind, profileId: n.profileId } })) });
  }
  async cancel(ids) { if (ids.length) await this.p.cancel({ notifications: ids.map(id => ({ id })) }); }
  async clearAll() { const pending = await this.p.getPending().catch(() => null); await this.cancel((pending?.notifications ?? []).map(n => n.id)); await this.p.removeAllDeliveredNotifications?.(); }
  onTap(fn) { this.p.addListener?.('localNotificationActionPerformed', e => fn(e?.notification?.extra ?? {})); }
}

// Web: timers while the page lives (a tab in the background). Shown through the service worker when there is one, so a
// tap focuses the game; the service worker tells the page which kind was tapped.
class WebNotifier {
  constructor(win) { this.w = win; this.timers = new Map(); this.tapFns = []; }
  get name() { return 'web'; }
  async permission() { return this.w.Notification?.permission === 'granted' ? 'granted' : 'denied'; }
  async request() { try { return (await this.w.Notification.requestPermission()) === 'granted' ? 'granted' : 'denied'; } catch { return 'denied'; } }
  async schedule(list) {
    for (const n of list) {
      clearTimeout(this.timers.get(n.id));
      const wait = Math.max(0, n.at - Date.now()); if (wait > 2 ** 31 - 1) continue;
      this.timers.set(n.id, setTimeout(() => this.show(n), wait));
    }
  }
  async show(n) {
    try {
      if (this.w.Notification?.permission !== 'granted') return;
      const data = { kind: n.kind, profileId: n.profileId };
      const reg = await this.w.navigator?.serviceWorker?.getRegistration?.().catch(() => null);
      if (reg?.showNotification) { await reg.showNotification(n.title, { body: n.body, tag: `ll-${n.kind}`, icon: './assets/icons/icon-192.png', data }); return; }
      const note = new this.w.Notification(n.title, { body: n.body, tag: `ll-${n.kind}`, icon: './assets/icons/icon-192.png' });
      note.onclick = () => { try { this.w.focus?.(); } catch {} this.tapFns.forEach(f => f(data)); note.close(); };
    } catch {}
  }
  async cancel(ids) { for (const id of ids) { clearTimeout(this.timers.get(id)); this.timers.delete(id); } }
  async clearAll() {
    await this.cancel([...this.timers.keys()]);
    try { const reg = await this.w.navigator?.serviceWorker?.getRegistration?.(); for (const n of (await reg?.getNotifications?.()) ?? []) if (String(n.tag).startsWith('ll-')) n.close(); } catch {}
  }
  onTap(fn) {
    this.tapFns.push(fn);
    try { this.w.navigator?.serviceWorker?.addEventListener?.('message', e => { if (e.data?.type === 'notify-tap') fn(e.data); }); } catch {}
  }
}

export function pickNotifier(win = globalThis) {
  try {
    if (win.__LL_STANDALONE) return new NoNotifier(); // the one-file test build
    const cap = win.Capacitor;
    if (cap?.isNativePlatform?.()) { const plugin = cap.Plugins?.LocalNotifications; return plugin ? new NativeNotifier(plugin) : new NoNotifier(); }
    if (typeof win.Notification === 'function' && win.location?.protocol !== 'file:') return new WebNotifier(win);
  } catch {}
  return new NoNotifier();
}

export class Notifications {
  constructor(game, notifier = pickNotifier()) {
    this.game = game; this.n = notifier; this.pendingTap = null;
    this.n.onTap(data => this.tapped(data));
    // Web: a tap on a notification that opened a new tab arrives in the address (?notify=egg&child=…).
    try { const q = new URLSearchParams(globalThis.location?.search ?? ''); if (q.get('notify')) this.pendingTap = { kind: q.get('notify'), profileId: q.get('child') }; } catch {}
  }
  get save() { return this.game.save; }
  device() { return this.save?.getNotifyDevice?.() ?? { permission: 'unknown', asked: false, askDue: false, sent: [] }; }
  // The trail kind is used only once an Adventure Trail exists (Job 19).
  trailReady(profileId, state) { return this.game.trail?.readyToday?.(profileId, state) ?? false; }

  // Game opened / back in front: clear what is shown and pending; re-read the system permission.
  async opened() {
    try {
      await this.n.clearAll();
      const dev = this.device();
      if (dev.permission === 'granted' && (await this.n.permission()) !== 'granted') await this.save.setNotifyDevice({ permission: 'denied' });
    } catch {}
  }
  // Game going to the background or closing: schedule from the save (at most one per kind, at most 2 a day).
  async leaving(now = Date.now()) {
    try {
      const dev = this.device(); if (dev.permission !== 'granted') return [];
      const list = plan(now, wanted(this.save, { trailReady: (id, st) => this.trailReady(id, st) }), dev.sent.filter(t => t > now - 2 * DAY));
      await this.n.cancel(Object.values(NOTIFY_IDS));
      await this.n.schedule(list);
      if (list.length) await this.save.setNotifyDevice({ sent: [...dev.sent.filter(t => t > now - 2 * DAY), ...list.map(n => n.at)] });
      return list;
    } catch { return []; }
  }
  // A switch changed (Parent Area): turning the main switch or a kind off cancels any already scheduled.
  async setSwitch(key, value, profileId) {
    const next = await this.save.setNotify({ [key]: Boolean(value) }, profileId);
    if (!value) { try { await this.n.cancel(key === 'on' ? Object.values(NOTIFY_IDS) : [NOTIFY_IDS[key]]); } catch {} }
    return next;
  }
  // The main switch turned on from Settings: needs the system's permission (asked here, behind the Parent Area's gate).
  async turnOn(profileId) {
    let perm = await this.n.permission().catch(() => 'denied');
    if (perm !== 'granted') perm = await this.n.request().catch(() => 'denied');
    await this.save.setNotifyDevice({ permission: perm, asked: true, askDue: false });
    if (perm === 'granted') await this.save.setNotify({ on: true }, profileId);
    return perm;
  }

  // ---- asking (after the first win) ----
  firstWin() { const d = this.device(); if (!d.asked && !d.askDue && this.n.name !== 'none') return this.save?.setNotifyDevice?.({ askDue: true }); }
  shouldAsk() { const d = this.device(); return d.askDue && !d.asked && this.n.name !== 'none'; }
  async notNow() { await this.save.setNotifyDevice({ asked: true, askDue: false }); }
  async yes(profileId) { return this.turnOn(profileId); }

  // ---- a tap on a notification ----
  tapped(data) { this.pendingTap = { kind: data?.kind, profileId: data?.profileId }; this.followTap(); }
  // Called once the game is ready (and from tapped): goes to the right screen.
  async followTap() {
    const tap = this.pendingTap; if (!tap || !this.game.scenes?.change || !this.save?.ready) return null;
    this.pendingTap = null;
    const r = route(this.save, tap);
    if (r.profileId && r.profileId !== this.save.root?.activeProfileId) await this.game.activateProfile?.(r.profileId);
    if (!this.game.scenes.registry?.has?.(r.scene) && this.game.scenes.registry) { this.game.scenes.change('island'); return r; }
    this.game.scenes.change(r.scene, r.data);
    return r;
  }
}
