import { SwipeCoverageActivity } from './SwipeCoverageActivity.js';
import { drawInstructionPanel } from './activityDraw.js';
import { artMap, drawArt } from '../core/art.js';
// A washed spot shows a quick bubble, splash or sparkle (data/art_map.json fx.washClean), taking turns.
const CLEAN_SECONDS=.9;
export class WashSwipeActivity extends SwipeCoverageActivity {
  get sweepSound(){return 'splash';}
  start(){this.cleanFx=[];super.start();}
  sweep(x,y){const before=new Set(this.spots.filter(s=>s.cleared).map(s=>s.id));super.sweep(x,y);for(const s of this.spots)if(s.cleared&&!before.has(s.id))this.cleanFx.push({x:s.x,y:s.y,t:CLEAN_SECONDS,n:this.cleanFx.length});}
  update(dt){super.update(dt);for(const f of this.cleanFx??[])f.t-=dt;this.cleanFx=(this.cleanFx??[]).filter(f=>f.t>0);}
  render(ctx){this.renderBase(ctx);this.drawSpots(ctx,'#9a6c52');const pics=artMap()?.fx?.washClean??[];for(const f of this.cleanFx??[])drawArt(ctx,pics[f.n%pics.length],f.x,f.y-(1-f.t/CLEAN_SECONDS)*40,170,170,{alpha:Math.min(1,f.t/.3)});if(this.active){ctx.fillStyle='#72d6ff88';ctx.beginPath();ctx.arc(this.pointer.x,this.pointer.y,92,0,Math.PI*2);ctx.fill();}drawInstructionPanel(ctx,this.definition.instructionText??'Wash it clean!',this.definition.subtitle??'Swipe over every muddy spot');}
}
