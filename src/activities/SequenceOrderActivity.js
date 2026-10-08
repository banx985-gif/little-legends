import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, tokenHit } from './activityDraw.js';

export class SequenceOrderActivity extends Activity {
  start() {
    this.order = this.definition.correctOrder ?? (this.definition.objects ?? []).map(o => o.id);
    this.tokens = (this.definition.objects ?? []).map((item, i) => ({ ...item, id: item.id ?? `seq-${i}`, x: item.x ?? 560 + i * 300, y: item.y ?? 760, size: item.size ?? 140, placed: false, wobble: 0 }));
    this.progress = 0; super.start();
  }
  update(dt) { super.update(dt); for (const t of this.tokens) t.wobble = Math.max(0, t.wobble - dt); }
  nextToken() { return this.tokens.find(t => t.id === this.order[this.progress]) ?? null; }
  getHintContext() { const object = this.nextToken(); return object ? { object, target: { x: 520 + this.progress * 280, y: 470 }, skillIds: this.configuredSkills() } : null; }
  handlePointer(e) {
    if (e.type !== 'up') return;
    const token = this.tokens.find(t => !t.placed && tokenHit(t, e.x, e.y, 30)); if (!token) return;
    if (token.id !== this.order[this.progress]) {
      token.wobble = 0.45; this.recordResponse(this.configuredSkills(), 'incorrect'); this.cue('incorrect'); this.react('encourage', { duration: 0.8 }); return;
    }
    token.placed = true; token.x = 520 + this.progress * 280; token.y = 500; this.progress++;
    this.recordResponse(this.configuredSkills(), 'success'); this.cue('correct'); this.react('happy', { duration: 0.6, target: token });
    if (this.progress >= this.order.length) this.complete({ detail: this.definition.completeDetail ?? 'Perfect order!' });
  }
  render(ctx) {
    drawActivityBackground(ctx, this.definition.theme ?? 'meadow');
    for (let i = 0; i < this.order.length; i++) { ctx.fillStyle = '#ffffff88'; ctx.beginPath(); ctx.roundRect(450 + i * 280, 420, 140, 160, 38); ctx.fill(); }
    for (const token of this.tokens) {
      const hinted = this.hintLevel >= 2 && this.hintContext?.object?.id === token.id;
      drawToken(ctx, token, { colour: 'uniform', highlight: hinted, wobble: token.wobble > 0 ? Math.sin(this.t * 18) * 0.1 : hinted ? Math.sin(this.t * 10) * 0.07 : 0 });
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'Put them in order', this.definition.subtitle ?? 'Tap the next one');
  }
}
