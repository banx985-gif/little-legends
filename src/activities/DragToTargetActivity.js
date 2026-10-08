import { DragBaseActivity } from './DragBaseActivity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, drawBin } from './activityDraw.js';

export class DragToTargetActivity extends DragBaseActivity {
  start() {
    this.tokens = (this.definition.objects ?? []).map((o,i)=>this.makeToken(o,i));
    this.targets = this.definition.targets ?? [];
    super.start();
  }
  validTargets(token){ return this.targets.filter(t=>!token.targetId||t.id===token.targetId); }
  nearestTarget(token){ return this.validTargets(token)[0] ?? null; }
  accepts(target, token){ return !target.accepts || target.accepts.includes(token.kind) || target.accepts.includes(token.category); }
  onValidDrop(token,target){
    this.recordResponse(this.skillsForToken(token,target),'success');
    this.snapToken(token,target.x,target.y);
    this.cue('correct');
    this.react('happy',{duration:0.8,target:token});
    if(this.tokens.every(t=>t.placed)) this.complete({detail:this.definition.completeDetail ?? 'Perfect match!'});
  }
  render(ctx){
    drawActivityBackground(ctx,this.definition.theme);
    for(const t of this.targets) drawBin(ctx,{...t,label:t.label??'HERE'},(this.active&&this.nearestTarget(this.active)?.id===t.id)||(this.hintLevel>=3&&this.hintContext?.target?.id===t.id));
    for(const token of this.tokens){const hinted=this.hintLevel>=2&&this.hintContext?.object?.id===token.id;drawToken(ctx,token,{scale:token.scale,highlight:token.state==='dragging'||hinted,wobble:hinted?Math.sin(this.t*10)*0.08:0});}
    drawInstructionPanel(ctx,this.definition.instructionText??'Drag it to the matching place',this.definition.subtitle??'Move the object to its home');
  }
}
