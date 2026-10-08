import { artMap } from '../core/art.js';

const STARTER_MAX_WAIT = 3.5;

export class BootScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.progress = 0;
    this.loaded = false;
    this.changed = false;
  }

  enter() {
    // Not awaited: the boot screen keeps animating its progress bar while the starter art loads.
    this.loading = this.loadStarter().catch(error => console.warn('Starter art not loaded', error)).finally(() => { this.progress = 1; this.loaded = true; });
  }

  async loadStarter() {
    const starter = artMap()?.preload?.starter;
    if (starter?.length && this.game.assets.loadArt) {
      await this.game.assets.loadArt(starter, p => { this.progress = p; });
      return;
    }
    await this.game.assets.loadManifest([
      { id:'meadow-picnic-bg', type:'image', url:'./assets/art/meadow_picnic_clearing.png' }
    ], p => { this.progress = p; });
  }

  update(dt) {
    this.t += dt;
    if (!this.changed && this.t > 0.65 && (this.loaded || this.t > STARTER_MAX_WAIT)) {
      this.changed = true;
      this.game.scenes.change('profile');
    }
  }

  render(ctx) {
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
