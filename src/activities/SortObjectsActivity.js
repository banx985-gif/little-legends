import { DragBaseActivity } from './DragBaseActivity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, drawBin } from './activityDraw.js';

export class SortObjectsActivity extends DragBaseActivity {
  start(){
    this.targets=this.definition.targets??[];
    this.tokens=(this.definition.objects??[]).map((o,i)=>this.makeToken(o,i));
    super.start();
  }
  fallbackInstruction(){const names=this.targets.map(t=>String(t.label??'').toLowerCase()).filter(Boolean);return names.length>1?`Sort them into the right places: ${names.slice(0,-1).join(', ')} or ${names.at(-1)}.`:'Sort them into the right places.';}
  validTargets(token){return this.targets.filter(target=>this.accepts(target,token));}
  nearestTarget(token){
    return this.validTargets(token).reduce((best,t)=>!best||Math.hypot(token.x-t.x,token.y-t.y)<Math.hypot(token.x-best.x,token.y-best.y)?t:best,null);
  }
  accepts(target,token){return (target.accepts??[]).includes(token.category)||(target.accepts??[]).includes(token.color)||(target.accepts??[]).includes(token.kind);}
  skillsForToken(token){
    const ids=[];
    const colour=String(token.color??'').toUpperCase();
    const kind=String(token.kind??'').toUpperCase();
    if(['RED','BLUE','YELLOW','GREEN','ORANGE','PURPLE'].includes(colour)) ids.push(colour);
    if(['CIRCLE','SQUARE','TRIANGLE','RECTANGLE'].includes(kind)) ids.push(kind);
    return ids.length?ids:this.configuredSkills();
  }
  onValidDrop(token,target){
    this.recordResponse(this.skillsForToken(token,target),'success');
    const placed=this.tokens.filter(t=>t.placed&&t.targetId===target.id).length;
    token.targetId=target.id;
    this.snapToken(token,target.x+(placed%2?55:-55),target.y+(placed>1?35:-35));
    this.cue('correct'); this.react('happy',{duration:0.7,target});
    if(this.tokens.every(t=>t.placed)) this.complete({detail:this.definition.completeDetail??'All sorted!'});
  }
  render(ctx){
    drawActivityBackground(ctx,this.definition.theme??'meadow');
    for(const t of this.targets) drawBin(ctx,t,(this.active&&this.nearestTarget(this.active)?.id===t.id)||(this.hintLevel>=3&&this.hintContext?.target?.id===t.id));
    for(const token of this.tokens){const hinted=this.hintLevel>=2&&this.hintContext?.object?.id===token.id;drawToken(ctx,token,{scale:token.scale,highlight:token.state==='dragging'||hinted,wobble:hinted?Math.sin(this.t*10)*0.08:0});}
    drawInstructionPanel(ctx,this.definition.instructionText??'Sort them into the right places',this.definition.subtitle??'Look at what matches');
  }
}
