import { DragToTargetActivity } from './DragToTargetActivity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, drawBin } from './activityDraw.js';

export class BuildObjectActivity extends DragToTargetActivity {
  accepts(target, token) {
    if (token.targetId) return target.id === token.targetId;
    return super.accepts(target, token);
  }

  onValidDrop(token, target) {
    super.onValidDrop(token, target);
    if (token.placed) token.targetScale = target.pieceScale ?? 0.9;
  }

  // Built pieces first, then the faded places still waiting for a piece (a window on the rocket body stays visible),
  // then the loose pieces on top.
  render(ctx) {
    drawActivityBackground(ctx, this.definition.theme);
    const filled = new Set(this.tokens.filter(t => t.placed).map(t => t.targetId));
    const hot = t => (this.active && this.nearestTarget(this.active)?.id === t.id) || (this.hintLevel >= 3 && this.hintContext?.target?.id === t.id);
    for (const t of this.targets) if (filled.has(t.id)) drawBin(ctx, { ...t, label: t.label ?? 'HERE' }, false);
    for (const token of this.tokens) if (token.placed) drawToken(ctx, token, { scale: token.scale });
    for (const t of this.targets) if (!filled.has(t.id)) drawBin(ctx, { ...t, label: t.label ?? 'HERE' }, hot(t));
    for (const token of this.tokens) {
      if (token.placed) continue;
      const hinted = this.hintLevel >= 2 && this.hintContext?.object?.id === token.id;
      drawToken(ctx, token, { scale: token.scale, highlight: token.state === 'dragging' || hinted, wobble: hinted ? Math.sin(this.t * 10) * 0.08 : 0 });
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'Build it!', this.definition.subtitle ?? 'Put each piece in its place');
  }
}
