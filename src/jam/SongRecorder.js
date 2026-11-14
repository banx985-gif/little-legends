// Job 19 step 7: Jungle Jam song mode. The child records about 20 seconds of putting band friends on and off the stage,
// then plays it back (the band changes exactly when it did), and can keep it in MY PICTURES as a song card.
// A song is tiny: { length, tempo, start: [role per stage slot], events: [{ t, band: [role per slot] }] }.
// Part of the full game (Jungle Jam is a full-game world).
import { drawArt, artMap } from '../core/art.js';
import { pinX } from '../render/screen.js';
import { makeCanvas } from '../colouring/Painting.js';
import { drawToken } from '../activities/activityDraw.js';

export const SONG_SECONDS = 20;
export const SONG_BUTTONS = { rec: () => ({ x: pinX(1830), y: 420, r: 60 }), play: () => ({ x: pinX(1830), y: 570, r: 60 }), save: () => ({ x: pinX(1830), y: 720, r: 56 }) };
const inCircle = (e, c, pad = 14) => (e.x - c.x) ** 2 + (e.y - c.y) ** 2 <= (c.r + pad) ** 2;

export class SongRecorder {
  // jam: the JungleJamScene (arrangement() / applyArrangement() / tempo).
  constructor(jam) { this.jam = jam; this.rec = null; this.playing = null; this.song = null; this.saved = false; this.pressed = null; this.savedT = 0; }
  get busy() { return Boolean(this.playing); }
  start() { this.playing = null; this.rec = { t: 0, start: this.jam.arrangement(), events: [], tempo: this.jam.tempo }; this.saved = false; this.jam.game.audio?.playCue?.('start'); }
  stop() {
    const r = this.rec; if (!r) return; this.rec = null;
    this.song = { length: Math.max(1, Math.min(SONG_SECONDS, r.t)), tempo: r.tempo, start: r.start, events: r.events };
    this.jam.game.audio?.playCue?.('complete');
  }
  // The band changed (a friend went on or off the stage).
  changed() { if (this.rec) this.rec.events.push({ t: Math.round(this.rec.t * 100) / 100, band: this.jam.arrangement() }); }
  play(song = this.song) {
    if (!song) return false; this.rec = null;
    this.playing = { t: 0, song, next: 0 }; this.jam.setTempo?.(song.tempo); this.jam.applyArrangement(song.start); this.jam.game.audio?.playCue?.('start');
    return true;
  }
  update(dt) {
    if (this.savedT > 0) this.savedT -= dt;
    if (this.rec) { this.rec.t += dt; if (this.rec.t >= SONG_SECONDS) this.stop(); }
    const p = this.playing; if (!p) return;
    p.t += dt;
    while (p.next < p.song.events.length && p.song.events[p.next].t <= p.t) this.jam.applyArrangement(p.song.events[p.next++].band);
    if (p.t >= p.song.length) this.playing = null;
  }
  // Saved as a song card in MY PICTURES (the band on stage, music notes), with the song itself.
  async save() {
    if (!this.song || this.saved) return null;
    const id = `song_${Date.now().toString(36)}`;
    let thumb = null; const c = makeCanvas(480, 270);
    if (c?.getContext && typeof c.toDataURL === 'function') {
      try {
        const ctx = c.getContext('2d'); ctx.fillStyle = '#5fbd69'; ctx.fillRect(0, 0, 480, 270); ctx.fillStyle = '#ee9b48'; ctx.fillRect(0, 200, 480, 70);
        const roles = [...new Set([this.song.start, ...this.song.events.map(e => e.band)].flat().filter(Boolean))];
        const people = this.jam.performers.filter(p => roles.includes(p.role));
        people.forEach((p, i) => drawToken(ctx, { kind: 'instrument', symbol: p.symbol, label: p.name, color: p.color, x: 70 + i * 85, y: 175, size: 80 }));
        const notes = artMap()?.jam?.notes; if (Array.isArray(notes)) notes.slice(0, 3).forEach((n, i) => drawArt(ctx, n, 110 + i * 130, 60, 60, 70));
        thumb = c.toDataURL('image/jpeg', 0.8);
      } catch { thumb = null; } finally { c.width = c.height = 0; }
    }
    const ok = await this.jam.game.save?.savePicture?.({ id, kind: 'song' }, { thumb, data: { song: this.song } });
    if (ok) { this.saved = true; this.savedT = 2; this.jam.game.audio?.playCue?.('reward'); }
    return ok ? id : null;
  }
  async load(id) { const d = await this.jam.game.save?.loadPicture?.(id, 'data'); if (d?.song?.start) { this.song = d.song; this.saved = true; return true; } return false; }

  controlAt(e) { for (const [k, f] of Object.entries(SONG_BUTTONS)) if (inCircle(e, f())) return k; return null; }
  // Returns true when the tap was one of the song buttons.
  handlePointer(e) {
    const c = this.controlAt(e);
    if (e.type === 'down') { this.pressed = c; return Boolean(c); }
    if (e.type !== 'up') return Boolean(this.pressed);
    const p = this.pressed; this.pressed = null; if (!p || p !== c) return Boolean(p);
    if (p === 'rec') { if (this.rec) this.stop(); else this.start(); }
    if (p === 'play') { if (this.playing) this.playing = null; else this.play(); }
    if (p === 'save') this.save();
    return true;
  }
  render(ctx) {
    const b = SONG_BUTTONS, rec = b.rec(), play = b.play(), save = b.save();
    const disc = (c, colour, on = true) => { const r = c.r * (this.pressed && b[this.pressed]?.() === c ? 0.92 : 1); ctx.globalAlpha = on ? 1 : 0.4; ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(c.x, c.y, r + 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill(); };
    ctx.save();
    // Record: a red dot (a white square while recording, with the time running round it).
    disc(rec, '#f2e4e4');
    if (this.rec) { ctx.strokeStyle = '#e94d55'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(rec.x, rec.y, rec.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.rec.t / SONG_SECONDS)); ctx.stroke(); ctx.fillStyle = '#e94d55'; ctx.fillRect(rec.x - 18, rec.y - 18, 36, 36); }
    else { ctx.fillStyle = '#e94d55'; ctx.beginPath(); ctx.arc(rec.x, rec.y, 26, 0, Math.PI * 2); ctx.fill(); }
    // Play (or stop while playing).
    disc(play, '#d9f2cf', Boolean(this.song));
    ctx.fillStyle = '#3f8f3a';
    if (this.playing) { ctx.fillRect(play.x - 18, play.y - 18, 36, 36); ctx.strokeStyle = '#66bd62'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(play.x, play.y, play.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.playing.t / this.playing.song.length)); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(play.x - 14, play.y - 24); ctx.lineTo(play.x + 26, play.y); ctx.lineTo(play.x - 14, play.y + 24); ctx.closePath(); ctx.fill(); }
    // Keep it (a tick), once there is an unsaved song.
    disc(save, '#66bd62', Boolean(this.song) && !this.saved);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(save.x - 22, save.y + 2); ctx.lineTo(save.x - 5, save.y + 19); ctx.lineTo(save.x + 24, save.y - 17); ctx.stroke();
    ctx.restore();
    if (this.savedT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, this.savedT); ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.arc(save.x + 46, save.y - 46, 16, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
}
