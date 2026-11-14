// Job 19 step 4: the Adventure Trail map. The explorer boy (his own pictures) guides the child along today's trail:
// three stops, each a short Little Mission from a different world; a stamp lands on a stop when its mission is done, and
// after the third stamp the treasure chest at the end opens (Discovery Stars). A new trail every day.
// Built to the Job 20 rules: the map background covers the screen; home sits in the safe area's top-left corner.
import { drawArt, lookupArt } from '../core/art.js';
import { drawHomeButton, onHomeButton, drawSpeechBubble, nudgeScale } from '../utils/draw.js';
import { drawCovered, fillScreen } from '../render/screen.js';
import { drawBackgroundOnly } from '../activities/activityDraw.js';
import { TRAIL_PRIZE_STARS } from '../trail/AdventureTrail.js';

export const STOPS = [{ x: 560, y: 760 }, { x: 960, y: 520 }, { x: 1360, y: 760 }];
export const CHEST = { x: 1700, y: 520, r: 120 };
const GUIDE = { x: 250, y: 990 };
const STOP_R = 105;
const WORLD_NAMES = { dino: 'Dino Valley', rainbow: 'Rainbow Village', space: 'Space Station', animal: 'Animal Forest', jungle: 'Jungle Jam', storybook: 'Luna’s Storybook', life: 'Bella’s Day', town: 'Busy Town' };

export class TrailScene {
  constructor(game) { this.game = game; this.t = 0; this.missions = []; this.trail = null; }

  async enter(data = {}) {
    this.game.audio?.startWorldMusic?.('map');
    this.missions = []; this.trail = null; // until today's trail is ready, only the map shows
    this.t = 0; this.pressed = null; this.idleT = 0; this.prizeT = 0; this.stampT = data.stamped ? 0 : 9; this.stamped = data.stamped ?? null;
    this.trail = await this.game.trail.today();
    await this.game.adventureEngine?.ensureLoaded?.(this.game.assets);
    this.missions = this.trail.missions.map(id => this.game.adventureEngine.get(id)).filter(Boolean);
    this.game.assets?.loadArt?.(['characters.explorer.explorer_read_map', 'characters.explorer.explorer_point', 'characters.explorer.explorer_cheer', 'worlds.island_decor.adventure.treasure_chest_gold', 'ui.map_pin_star', ...this.missions.map(m => lookupArt('worlds', m.world))]);
    if (data.stamped) this.game.audio?.playCue?.('sticker');
  }

  done(id) { return this.trail?.done?.includes(id); }
  nextIndex() { return this.missions.findIndex(m => !this.done(m.id)); }
  complete() { return Boolean(this.trail) && this.game.trail.complete(this.trail); }
  line() {
    if (this.trail?.prized) return 'What a trail! See you tomorrow for a new one!';
    if (this.complete()) return 'Three stamps! Open the treasure chest!';
    const i = this.nextIndex(), m = this.missions[i];
    return m ? `${['First', 'Next', 'Last'][i] ?? 'Next'} stop: ${WORLD_NAMES[m.world] ?? 'a new world'}!` : 'Let’s go exploring!';
  }

  update(dt) { this.t += dt; this.idleT += dt; this.stampT += dt; if (this.prizeT > 0) this.prizeT += dt; }

  render(ctx) {
    fillScreen(ctx, '#9fe0f5');
    drawCovered(ctx, c => {
      drawBackgroundOnly(c, 'meadow');
      // The trail: a dotted path from the guide through the three stops to the chest.
      c.save(); c.strokeStyle = '#fff6d8'; c.lineWidth = 34; c.lineCap = 'round'; c.setLineDash?.([2, 52]);
      c.beginPath(); c.moveTo(GUIDE.x + 80, 900); c.quadraticCurveTo(380, 820, STOPS[0].x, STOPS[0].y); c.quadraticCurveTo(700, 520, STOPS[1].x, STOPS[1].y); c.quadraticCurveTo(1200, 520, STOPS[2].x, STOPS[2].y); c.quadraticCurveTo(1560, 800, CHEST.x, CHEST.y + 60); c.stroke(); c.restore();
    });
    ctx.fillStyle = '#5a3a73'; ctx.textAlign = 'center'; ctx.font = '900 66px ui-rounded, system-ui, sans-serif'; ctx.fillText('Adventure Trail', 960, 110);
    const next = this.nextIndex();
    this.missions.forEach((m, i) => {
      const s = STOPS[i], done = this.done(m.id), k = (!done && i === next ? nudgeScale(this.t, this.idleT, 2) : 1) * (this.pressed === `stop:${i}` ? 0.94 : 1);
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(k, k);
      ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(0, STOP_R - 6, STOP_R * 0.8, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = done ? '#fff7d0' : '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, STOP_R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = i === next ? '#f2b632' : '#c99a6b'; ctx.lineWidth = 10; ctx.stroke();
      if (!drawArt(ctx, lookupArt('worlds', m.world), 0, 0, STOP_R * 1.5, STOP_R * 1.5)) { ctx.fillStyle = '#8b69db'; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#5a3a73'; ctx.font = '900 30px ui-rounded, system-ui'; ctx.fillText(String(i + 1), -STOP_R + 18, -STOP_R + 30);
      ctx.restore();
      ctx.font = '800 26px system-ui'; const tw = Math.min(360, ctx.measureText?.(m.title)?.width ?? 300) + 36; ctx.fillStyle = '#fffdf0e6'; ctx.beginPath(); ctx.roundRect(s.x - tw / 2, s.y + STOP_R + 16, tw, 46, 23); ctx.fill();
      ctx.fillStyle = '#5a3a73'; ctx.fillText(m.title, s.x, s.y + STOP_R + 48, 360);
      if (done) { // the stamp: drops in big and settles
        const p = this.stamped === m.id ? Math.min(1, this.stampT / 0.45) : 1, sc = 2.2 - 1.2 * p;
        ctx.save(); ctx.globalAlpha = Math.min(1, p * 1.5); ctx.translate(s.x + 62, s.y - 62); ctx.scale(sc, sc); ctx.rotate(-0.25);
        ctx.fillStyle = '#e94d55'; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
        if (!drawArt(ctx, 'ui.map_pin_star', 0, 0, 62, 62)) { ctx.fillStyle = '#fff'; ctx.font = '900 46px system-ui'; ctx.fillText('★', 0, 16); }
        ctx.restore();
      }
    });
    // The treasure chest at the end.
    const open = this.trail?.prized, ready = this.complete() && !open, k = ready ? nudgeScale(this.t, 99, 0) * 1.04 : 1;
    ctx.save(); ctx.translate(CHEST.x, CHEST.y); ctx.scale(k, k); if (!ready && !open) ctx.globalAlpha = 0.7;
    if (!drawArt(ctx, 'worlds.island_decor.adventure.treasure_chest_gold', 0, 0, 260, 230)) drawArt(ctx, 'rewards.chest_star', 0, 0, 230, 230);
    ctx.restore();
    if (open) this.renderPrize(ctx);
    // The guide.
    const pose = this.trail?.prized || this.prizeT > 0 ? 'explorer_cheer' : this.complete() ? 'explorer_point' : 'explorer_read_map';
    drawArt(ctx, `characters.explorer.${pose}`, GUIDE.x, GUIDE.y, 300, 420, { anchor: 'bottom' });
    drawSpeechBubble(ctx, this.line(), 90, 430, 470, 112);
    drawHomeButton(ctx, this.pressed === 'home');
  }
  renderPrize(ctx) {
    const p = this.prizeT > 0 ? Math.min(1, this.prizeT / 0.6) : 1;
    ctx.save(); ctx.globalAlpha = p;
    for (let i = 0; i < TRAIL_PRIZE_STARS; i++) { const a = -Math.PI / 2 + (i - 1) * 0.7, r = 150 + 40 * p; drawArt(ctx, lookupArt('ui', 'missionStar') ?? 'rewards.medals.star_gold', CHEST.x + Math.cos(a) * r, CHEST.y - 40 + Math.sin(a) * r, 90, 90); }
    ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.roundRect(CHEST.x - 110, CHEST.y + 120, 220, 64, 30); ctx.fill();
    ctx.fillStyle = '#5a3a73'; ctx.font = '900 34px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`+${TRAIL_PRIZE_STARS} ★`, CHEST.x, CHEST.y + 164);
    ctx.restore();
  }

  controlAt(e) {
    if (onHomeButton(e.x, e.y)) return 'home';
    for (let i = 0; i < this.missions.length; i++) if ((e.x - STOPS[i].x) ** 2 + (e.y - STOPS[i].y) ** 2 <= (STOP_R + 20) ** 2) return `stop:${i}`;
    if ((e.x - CHEST.x) ** 2 + (e.y - CHEST.y) ** 2 <= (CHEST.r + 20) ** 2) return 'chest';
    return null;
  }
  async handlePointer(e) {
    if (e.type === 'down') { this.idleT = 0; this.pressed = this.controlAt(e); return; }
    if (e.type !== 'up') { if (e.type === 'cancel') this.pressed = null; return; }
    const pressed = this.pressed; this.pressed = null;
    if (!pressed || this.controlAt(e) !== pressed) return;
    if (pressed === 'home') { this.game.audio?.playCue?.('back'); this.game.scenes.change('island'); return; }
    if (pressed === 'chest') {
      if (await this.game.trail.openPrize()) { this.trail = this.game.trail.state(); this.prizeT = 0.001; this.game.audio?.playCue?.('chest'); this.game.audio?.playCue?.('reward'); }
      else this.game.audio?.playCue?.('tap');
      return;
    }
    const m = this.missions[Number(pressed.slice(5))]; if (!m) return;
    this.game.audio?.playCue?.('start');
    this.game.scenes.change('adventure', { adventureId: m.id, trail: true });
  }
}
