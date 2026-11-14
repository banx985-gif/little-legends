// Job 19 step 4: the Adventure Trail. Each day each child gets a trail of 3 short Little Missions from different worlds,
// with the explorer boy as the guide. A stamp goes on the trail map after each mission; all three stamps open the prize.
// - The day's missions are picked the same way all day (from the date and the child), short ones first (≤ 6 steps),
//   ones the child hasn't finished first. Free version: only the free worlds (a world can then come up twice).
// - Saved per child: state.trail = { day, missions, done, prized, total } (total = trails finished, ever).
export const TRAIL_LENGTH = 3, TRAIL_PRIZE_STARS = 3, SHORT_STEPS = 6;

export function dayKey(t = Date.now()) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
// A small steady random number generator from a text (same text → same numbers).
function seeded(text) { let h = 2166136261; for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }

// Today's 3 missions for a child. list = adventureEngine.list(); open(world) says whether a world can be played.
export function pickTrail(list, { day, profileId, completed = [], open = () => true }) {
  const rnd = seeded(`${day}|${profileId}`), done = new Set(completed);
  const usable = list.filter(a => open(a.world) && a.steps?.some(s => s.kind === 'activity') && (a.steps?.length ?? 99) <= SHORT_STEPS);
  const byWorld = new Map(); for (const a of usable) { if (!byWorld.has(a.world)) byWorld.set(a.world, []); byWorld.get(a.world).push(a); }
  const worlds = [...byWorld.keys()].sort(); for (let i = worlds.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [worlds[i], worlds[j]] = [worlds[j], worlds[i]]; }
  const pickFrom = w => { const pool = byWorld.get(w), fresh = pool.filter(a => !done.has(a.id)); const from = fresh.length ? fresh : pool; return from[Math.floor(rnd() * from.length)]; };
  const out = [];
  for (let i = 0; out.length < TRAIL_LENGTH && worlds.length && i < TRAIL_LENGTH * 4; i++) {
    const w = worlds[i % worlds.length], a = pickFrom(w);
    if (a && !out.includes(a.id)) out.push(a.id);
  }
  return out;
}

export class AdventureTrail {
  constructor(game) { this.game = game; }
  get save() { return this.game.save; }
  state(profileId = this.save?.root?.activeProfileId) { return this.save?.getProfileState?.(profileId)?.trail ?? null; }
  // Today's trail for the child playing now (made on first look each day, then kept).
  async today(now = Date.now()) {
    const day = dayKey(now), st = this.state();
    if (st?.day === day && st.missions?.length) return st;
    await this.game.adventureEngine?.ensureLoaded?.(this.game.assets);
    const pid = this.save.root.activeProfileId, completed = this.save.getProfileState()?.adventure?.completed ?? [];
    const missions = pickTrail(this.game.adventureEngine?.list?.() ?? [], { day, profileId: pid, completed, open: w => this.game.unlock?.worldOpen?.(w) ?? true });
    const next = { day, missions, done: [], prized: false, total: st?.total ?? 0 };
    await this.save.mutateProfileState(s => { s.trail = next; });
    return next;
  }
  // A mission on today's trail was finished: its stamp.
  async stamp(adventureId) {
    const st = this.state(); if (!st?.missions?.includes(adventureId) || st.done.includes(adventureId)) return st;
    await this.save.mutateProfileState(s => { s.trail.done = [...s.trail.done, adventureId]; });
    return this.state();
  }
  complete(st = this.state()) { return Boolean(st?.missions?.length) && st.missions.every(id => st.done.includes(id)); }
  // All three stamps: the prize (Discovery Stars), once a day.
  async openPrize() {
    const st = this.state(); if (!this.complete(st) || st.prized) return false;
    await this.save.mutateProfileState(s => { s.trail.prized = true; s.trail.total = (s.trail.total ?? 0) + 1; });
    await this.save.addDiscoveryStars?.(TRAIL_PRIZE_STARS);
    return true;
  }
  // For the "Daily trail" reminder (shown the next morning): a new trail is ready every day.
  readyToday() { return true; }
}
