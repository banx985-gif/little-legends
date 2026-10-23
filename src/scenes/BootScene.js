import { artMap, drawArt } from '../core/art.js';

const STARTER_MAX_WAIT = 3.5;
// Job 16: the Banx Games logo fades in and out on its own dark purple first (a tap skips it); the starter art loads meanwhile.
const LOGO_TIME = 1.5, LOGO_FADE = 0.35, LOGO_BG = '#0e0115'; // LOGO_BG = the logo picture's own background, so no square edge shows

export class BootScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.progress = 0;
    this.loaded = false;
    this.changed = false;
    this.logoT = 0;
    this.logoDone = false;
  }

  enter() {
    // Not awaited: the boot screen keeps animating its progress bar while the starter art loads.
    this.loading = this.loadStarter().catch(error => console.warn('Starter art not loaded', error)).finally(() => { this.progress = 1; this.loaded = true; });
  }

  async loadStarter() {
    const starter = artMap()?.preload?.starter;
    if (starter?.length && this.game.assets.loadArt) {
      await this.game.assets.loadArt(['ui.studio_logo']).catch(() => {}); // first, so the logo is up straight away
      await this.game.assets.loadArt(starter, p => { this.progress = p; });
      return;
    }
    await this.game.assets.loadManifest([
      { id:'meadow-picnic-bg', type:'image', url:'./assets/art/meadow_picnic_clearing.png' }
    ], p => { this.progress = p; });
  }

  update(dt) {
    if (!this.logoDone) {
      this.logoT += dt;
      if (this.logoT >= LOGO_TIME) this.logoDone = true;
      return;
    }
    this.t += dt;
    if (!this.changed && this.t > 0.65 && (this.loaded || this.t > STARTER_MAX_WAIT)) {
      this.changed = true;
      this.game.scenes.change('profile');
    }
  }

  handlePointer(e) {
    if (!this.logoDone && e.type === 'down') this.logoDone = true;
  }

  letterbox() { return this.logoDone ? null : LOGO_BG; }

  renderLogo(ctx) {
    ctx.fillStyle = LOGO_BG;
    ctx.fillRect(0, 0, 1920, 1080);
    const t = this.logoT, alpha = Math.max(0, Math.min(1, t / LOGO_FADE, (LOGO_TIME - t) / LOGO_FADE));
    if (alpha > 0) drawArt(ctx, artMap()?.ui?.studio_logo, 960, 540, 760, 760, { alpha });
  }

  render(ctx) {
    if (!this.logoDone) { this.renderLogo(ctx); return; }
    const w = 1920, h = 1080;
    const pulse = 1 + Math.sin(this.t * 4) * 0.025;
    ctx.fillStyle = '#7edcff';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, 440);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#fff7d0';
    ctx.beginPath();
    ctx.arc(0, 0, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '900 94px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5c3b76';
    ctx.fillText('LITTLE', 0, -34);
    ctx.fillStyle = '#ff6f61';
    ctx.fillText('LEGENDS', 0, 62);
    ctx.restore();
    // Splash: Pip waves hello beside the title (he is in the starter pictures, so he appears as soon as he has loaded).
    drawArt(ctx, artMap()?.pip?.poses?.wave?.id, 1330, 640, 330, 430, { anchor: 'bottom', alpha: Math.min(1, this.t / 0.3) });
    ctx.fillStyle = '#5c3b76';
    ctx.textAlign = 'center';
    ctx.font = '800 44px ui-rounded, system-ui, sans-serif';
    ctx.fillText('Magic World', w / 2, 705);
    ctx.fillStyle = '#ffffffcc';
    ctx.beginPath();
    ctx.roundRect(660, 760, 600, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#63c56b';
    ctx.beginPath();
    ctx.roundRect(660, 760, 600 * this.progress, 34, 17);
    ctx.fill();
  }
}
