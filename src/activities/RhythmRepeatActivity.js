import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel } from './activityDraw.js';

export class RhythmRepeatActivity extends Activity {
  start() {
    this.pattern = this.definition.patternMs ?? [0, 500, 1000];
    this.taps = [];
    this.flash = 0;
    this.demoLeadMs = Number(this.definition.demoLeadMs ?? 650);
    this.demoElapsedMs = 0;
    this.demoIndex = 0;
    this.demoFlash = 0;
    super.start();
  }

  restartDemo() {
    this.demoElapsedMs = 0;
    this.demoIndex = 0;
    this.demoFlash = 0;
  }

  update(dt) {
    super.update(dt);
    this.flash = Math.max(0, this.flash - dt);
    this.demoFlash = Math.max(0, this.demoFlash - dt);
    this.demoElapsedMs += dt * 1000;
    while (this.demoIndex < this.pattern.length && this.demoElapsedMs >= this.demoLeadMs + this.pattern[this.demoIndex]) {
      this.cue('count', { count: (this.demoIndex % 5) + 1 });
      this.demoFlash = 0.14;
      this.demoIndex++;
    }
  }

  handlePointer(e) {
    if (e.type !== 'up') return;
    if (Math.hypot(e.x - 960, e.y - 405) <= 115) {
      this.restartDemo();
      return;
    }
    if (Math.hypot(e.x - 960, e.y - 690) > 190) return;

    const stamp = Number.isFinite(e.timeStamp) ? e.timeStamp : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.taps.push(stamp);
    this.flash = 0.12;
    this.cue('count', { count: (this.taps.length % 5) + 1 });
    if (this.taps.length < this.pattern.length) return;

    const expected = this.pattern.slice(1).map((value, i) => value - this.pattern[i]);
    const actual = this.taps.slice(1).map((value, i) => value - this.taps[i]);
    const tolerance = this.definition.tolerance ?? 0.58;
    const ok = expected.every((gap, i) => Math.abs(actual[i] - gap) <= Math.max(220, gap * tolerance));
    if (ok) {
      this.recordResponse(this.configuredSkills(), 'success');
      this.cue('correct');
      this.complete({ detail: this.definition.completeDetail ?? 'Great rhythm!' });
    } else {
      this.recordResponse(this.configuredSkills(), 'incorrect');
      this.cue('incorrect');
      this.react('encourage', { duration: 0.8 });
      this.taps = [];
      this.restartDemo();
    }
  }

  getHintContext() {
    return { object: { x: 960, y: 690 }, target: { x: 960, y: 690 }, skillIds: this.configuredSkills() };
  }

  render(ctx) {
    drawActivityBackground(ctx, this.definition.theme ?? 'forest');

    ctx.fillStyle = this.demoFlash > 0 ? '#ffd85d' : '#fff7d0';
    ctx.beginPath();
    ctx.arc(960, 405, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3a73';
    ctx.textAlign = 'center';
    ctx.font = '900 58px system-ui';
    ctx.fillText('🔊', 960, 425);

    ctx.fillStyle = this.flash > 0 ? '#ffd85d' : '#ec7ea2';
    ctx.beginPath();
    ctx.arc(960, 690, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '900 110px system-ui';
    ctx.fillText('♫', 960, 735);

    const startX = 960 - ((this.pattern.length - 1) * 100);
    for (let i = 0; i < this.pattern.length; i++) {
      ctx.fillStyle = i < this.taps.length ? '#66bd62' : '#ffffffcc';
      ctx.beginPath();
      ctx.arc(startX + i * 200, 515, 38, 0, Math.PI * 2);
      ctx.fill();
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'Copy the beat', this.definition.subtitle ?? `Listen, then tap the drum ${this.pattern.length} times with the same rhythm`);
  }
}
