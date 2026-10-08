import { SwipeCoverageActivity } from './SwipeCoverageActivity.js';
import { drawInstructionPanel } from './activityDraw.js';
export class WashSwipeActivity extends SwipeCoverageActivity {
  render(ctx){this.renderBase(ctx);this.drawSpots(ctx,'#9a6c52');if(this.active){ctx.fillStyle='#72d6ff88';ctx.beginPath();ctx.arc(this.pointer.x,this.pointer.y,92,0,Math.PI*2);ctx.fill();}drawInstructionPanel(ctx,this.definition.instructionText??'Wash it clean!',this.definition.subtitle??'Swipe over every muddy spot');}
}
