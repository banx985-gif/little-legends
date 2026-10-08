import { SwipeCoverageActivity } from './SwipeCoverageActivity.js';
import { drawInstructionPanel, resolveColor } from './activityDraw.js';

export class PaintSwipeActivity extends SwipeCoverageActivity {
  start() {
    this.paintMarks = [];
    super.start();
  }

  sweep(x, y) {
    if (this.active) {
      const last = this.paintMarks.at(-1);
      if (!last || Math.hypot(x - last.x, y - last.y) >= 28) {
        this.paintMarks.push({ x, y, r: 64 + ((this.paintMarks.length * 17) % 18) });
        if (this.paintMarks.length > 120) this.paintMarks.shift();
      }
    }
    super.sweep(x, y);
  }

  render(ctx) {
    this.renderBase(ctx);
    const paint = resolveColor(this.definition.paintColor ?? 'purple');
    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = paint;
    for (const mark of this.paintMarks) {
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, mark.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    this.drawSpots(ctx, '#ffffffcc');
    if (this.active) {
      ctx.fillStyle = paint;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, 80, 0, Math.PI * 2);
      ctx.fill();
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'Paint every spot!', this.definition.subtitle ?? 'Swipe to add colour');
  }
}
