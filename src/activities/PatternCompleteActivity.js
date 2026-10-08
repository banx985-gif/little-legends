import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, tokenHit } from './activityDraw.js';

export class PatternCompleteActivity extends Activity {
  start() {
    this.sequence = (this.definition.sequence ?? []).map((item, i) => ({ ...item, id: `pattern-seq-${i}`, x: 540 + i * 240, y: 500, size: item.size ?? 130 }));
    this.choices = (this.definition.choices ?? []).map((item, i) => ({ ...item, id: item.id ?? `pattern-choice-${i}`, x: item.x ?? 720 + i * 360, y: item.y ?? 790, size: item.size ?? 150, wobble: 0 }));
    super.start();
  }
  update(dt) { super.update(dt); for (const choice of this.choices) choice.wobble = Math.max(0, choice.wobble - dt); }
  correctChoice() { return this.choices.find(c => c.id === this.definition.correctId || c.correct) ?? this.choices[0] ?? null; }
  getHintContext() { const object = this.correctChoice(); return object ? { object, target: object, skillIds: this.configuredSkills() } : null; }
  handlePointer(e) {
    if (e.type !== 'up') return;
    const choice = this.choices.find(c => tokenHit(c, e.x, e.y, 32)); if (!choice) return;
    if (choice === this.correctChoice()) {
      this.recordResponse(this.configuredSkills(), 'success'); this.cue('correct'); this.react('happy', { duration: 0.8, target: choice });
      this.complete({ detail: this.definition.completeDetail ?? 'Pattern complete!' });
    } else {
      choice.wobble = 0.45; this.recordResponse(this.configuredSkills(), 'incorrect'); this.cue('incorrect'); this.react('encourage', { duration: 0.8 });
    }
  }
  render(ctx) {
    drawActivityBackground(ctx, this.definition.theme ?? 'rainbow');
    const missing = this.definition.missingIndex ?? this.sequence.length;
    for (let i = 0; i <= this.sequence.length; i++) {
      const x = 520 + i * 220;
      if (i === missing) {
        ctx.fillStyle = '#ffffffcc'; ctx.beginPath(); ctx.roundRect(x - 72, 430, 144, 144, 42); ctx.fill();
        ctx.fillStyle = '#8b69db'; ctx.textAlign = 'center'; ctx.font = '900 84px system-ui'; ctx.fillText('?', x, 535);
      } else {
        const sourceIndex = i > missing ? i - 1 : i; const token = this.sequence[sourceIndex]; if (token) drawToken(ctx, { ...token, x, y: 505 });
      }
    }
    for (const choice of this.choices) {
      const hinted = this.hintLevel >= 2 && this.hintContext?.object?.id === choice.id;
      drawToken(ctx, choice, { highlight: hinted, wobble: choice.wobble > 0 ? Math.sin(this.t * 18) * 0.1 : hinted ? Math.sin(this.t * 10) * 0.07 : 0 });
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'What comes next?', this.definition.subtitle ?? 'Finish the pattern');
  }
}
