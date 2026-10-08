import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, tokenHit } from './activityDraw.js';

export class SizeCompareActivity extends Activity {
  start() {
    this.tokens = (this.definition.objects ?? []).map((item, i) => ({
      ...item,
      id: item.id ?? `size-${i}`,
      x: item.x ?? 560 + i * 380,
      y: item.y ?? 650,
      size: item.size ?? 150,
      wobble: 0,
      selected: false
    }));
    this.rule = this.definition.rule ?? 'largest';
    super.start();
  }

  update(dt) { super.update(dt); for (const token of this.tokens) token.wobble = Math.max(0, token.wobble - dt); }
  correctToken() {
    if (this.definition.correctId) return this.tokens.find(t => t.id === this.definition.correctId) ?? null;
    const sorted = [...this.tokens].sort((a, b) => (a.compareValue ?? a.size) - (b.compareValue ?? b.size));
    return this.rule === 'smallest' ? sorted[0] : sorted.at(-1);
  }
  getHintContext() { const object = this.correctToken(); return object ? { object, target: object, skillIds: this.configuredSkills() } : null; }
  handlePointer(e) {
    if (e.type !== 'up') return;
    const token = this.tokens.find(t => tokenHit(t, e.x, e.y, 34));
    if (!token) return;
    if (token === this.correctToken()) {
      token.selected = true;
      this.recordResponse(this.configuredSkills(), 'success');
      this.cue('correct'); this.react('happy', { duration: 0.8, target: token });
      this.complete({ detail: this.definition.completeDetail ?? `You found the ${this.rule}!` });
    } else {
      token.wobble = 0.45;
      this.recordResponse(this.configuredSkills(), 'incorrect');
      this.cue('incorrect'); this.react('encourage', { duration: 0.8 });
    }
  }
  render(ctx) {
    drawActivityBackground(ctx, this.definition.theme ?? 'meadow');
    for (const token of this.tokens) {
      const hinted = this.hintLevel >= 2 && this.hintContext?.object?.id === token.id;
      drawToken(ctx, token, { colour: 'uniform', scale: token.selected ? 1.12 : 1, highlight: hinted || token.selected, wobble: token.wobble > 0 ? Math.sin(this.t * 18) * 0.1 : hinted ? Math.sin(this.t * 10) * 0.07 : 0 });
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? `Which one is ${this.rule}?`, this.definition.subtitle ?? 'Tap your answer');
  }
}
