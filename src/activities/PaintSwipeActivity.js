import { SwipeCoverageActivity } from './SwipeCoverageActivity.js';
import { drawInstructionPanel, resolveColor } from './activityDraw.js';
import { artMap, drawArt } from '../core/art.js';

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
    // A paint drop of this colour on the corner of the board, so the colour to use is always in sight.
    drawArt(ctx, artMap()?.fx?.paintDrop?.replace('{colour}', this.definition.paintColor ?? 'purple'), 1430, 395, 120, 120);
    if (this.active) {
      ctx.fillStyle = paint;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, 80, 0, Math.PI * 2);
      ctx.fill();
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'Paint every spot!', this.definition.subtitle ?? 'Swipe to add colour');
  }
}
