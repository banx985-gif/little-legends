import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel } from './activityDraw.js';

export class SwipeCoverageActivity extends Activity {
  start() {
    this.spots = (this.definition.spots ?? []).map((spot,i)=>({ id:spot.id??`spot-${i}`, x:spot.x??600+(i%4)*250, y:spot.y??520+Math.floor(i/4)*220, r:spot.r??70, cleared:false }));
    this.active = false; this.pointer = {x:0,y:0}; super.start();
  }
  getHintContext(){const object=this.spots.find(s=>!s.cleared)??null;return object?{object,target:object,skillIds:this.configuredSkills()}:null;}
  sweep(x,y){this.pointer={x,y};let changed=false;for(const spot of this.spots){if(!spot.cleared&&Math.hypot(x-spot.x,y-spot.y)<=spot.r+72){spot.cleared=true;changed=true;}}
    if(changed){this.recordResponse(this.configuredSkills(),'success');this.cue('drop');if(this.spots.every(s=>s.cleared)){this.cue('correct');this.react('happy',{duration:.8});this.complete({detail:this.definition.completeDetail??'All done!'});}}
  }
  handlePointer(e){if(e.type==='down'){this.active=true;this.sweep(e.x,e.y);}else if(e.type==='move'&&this.active)this.sweep(e.x,e.y);else if(e.type==='up'||e.type==='cancel')this.active=false;}
  drawSpots(ctx, color){for(const spot of this.spots){if(spot.cleared)continue;ctx.fillStyle=color;ctx.globalAlpha=.76;ctx.beginPath();ctx.arc(spot.x,spot.y,spot.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}}
  renderBase(ctx){drawActivityBackground(ctx,this.definition.theme??'meadow');ctx.fillStyle=this.definition.surfaceColor??'#fff7d0';ctx.beginPath();ctx.roundRect(430,330,1060,570,90);ctx.fill();}
}
