import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, tokenHit } from './activityDraw.js';

const MATCH_KEYS=['kind','color','category','value','animalType','sound','habitat','parent','group','feature','food','firstSound','case'];

export class TapRequestedObjectActivity extends Activity {
  start(){this.tokens=(this.definition.objects??[]).map((o,i)=>({...o,id:o.id??`tap-${i}`,size:o.size??155,wobble:0,found:false}));this.remaining=this.definition.targets??[this.definition.request];this.targetIndex=0;super.start();}
  update(dt){super.update(dt);for(const t of this.tokens)t.wobble=Math.max(0,t.wobble-dt);}
  target(){return this.remaining[this.targetIndex]??null;}
  matches(token,target){
    if(!target)return false;
    if(target.matchKey)return token?.[target.matchKey]===target.matchValue;
    return MATCH_KEYS.every(key=>target[key]==null||String(token?.[key]??'').toLowerCase()===String(target[key]).toLowerCase());
  }
  getHintContext(){const targetSpec=this.target();const object=this.tokens.find(t=>!t.found&&this.matches(t,targetSpec))??null;return object?{object,target:object,skillIds:this.skillsForTarget(targetSpec)}:null;}
  skillsForTarget(target){
    const ids=[...this.configuredSkills()];
    const colour=String(target?.color??'').toUpperCase(),kind=String(target?.kind??'').toUpperCase();
    if(['RED','BLUE','YELLOW','GREEN','ORANGE','PURPLE'].includes(colour))ids.push(colour);
    if(['CIRCLE','SQUARE','TRIANGLE','RECTANGLE'].includes(kind))ids.push(kind);
    if(String(target?.kind??'').toLowerCase()==='numeral'&&Number(target?.value)>=1&&Number(target?.value)<=10)ids.push(`NUMERAL_${Number(target.value)}`);
    const letter=String(target?.value??target?.letter??'').toUpperCase();if(String(target?.kind??'').toLowerCase()==='letter'&&/^[A-Z]$/.test(letter))ids.push(`LETTER_${letter}`,'LETTER_RECOGNITION');
    return [...new Set(ids.filter(Boolean))];
  }
  handlePointer(e){if(e.type!=='up')return;const token=this.tokens.find(t=>!t.found&&tokenHit(t,e.x,e.y,35));if(!token)return;this.cue('drop',{sound:'pop'});if(this.matches(token,this.target())){this.recordResponse(this.skillsForTarget(this.target()),'success');token.found=true;this.cue('correct');this.react('happy',{duration:0.8,target:token});this.targetIndex++;if(this.targetIndex>=this.remaining.length)this.complete({detail:this.definition.completeDetail??'You found it!'});else if(!this.definition.voiceText&&this.panelLabel()!==this.lastSpoken)this.sayRequest();}else{this.recordResponse(this.skillsForTarget(this.target()),'incorrect');token.wobble=0.45;this.cue('incorrect');this.react('encourage',{duration:0.9,target:token});}}
  // The words on the panel (also what Pip says when there is no written instruction).
  panelLabel(){const target=this.target();const value=target?.value??target?.letter??target?.animalType??target?.feature??target?.food??target?.firstSound??target?.habitat??target?.matchValue??target?.color??target?.kind??'object';const fallback=target?.kind==='numeral'?`Tap number ${value}`:target?.kind==='letter'?`Tap letter ${String(value).toUpperCase()}`:target?`Tap the ${value}`:'Great!';const template=this.definition.instructionText??fallback;const label=String(template).replaceAll('{target}',String(value));return label;}
  // A new thing to find: Pip asks for it out loud too.
  sayRequest(){const text=this.lastSpoken=this.panelLabel();this.host.pip?.say(`${this.id}_request_${this.targetIndex}`,{text,bubbleText:text,duration:1.6,reaction:'point'});}
  // Says the panel words with the real letter/number/thing (it used to read out "{target}").
  spokenInstruction(){return this.definition.voiceText??this.panelLabel();}
  render(ctx){drawActivityBackground(ctx,this.definition.theme??'meadow');for(const t of this.tokens){if(t.found)continue;const hinted=this.hintLevel>=2&&this.hintContext?.object?.id===t.id;const targetGlow=this.hintLevel>=3&&this.hintContext?.target?.id===t.id;const wob=t.wobble>0?Math.sin(t.wobble*55)*0.1:hinted?Math.sin(this.t*10)*0.08:0;ctx.save();ctx.translate(t.x,t.y);ctx.rotate(wob);ctx.translate(-t.x,-t.y);this.drawUnder?.(ctx,t);drawToken(ctx,t,{highlight:hinted||targetGlow,colour:this.remaining.some(r=>r?.color)?'strict':'loose'});ctx.restore();}const label=this.panelLabel();drawInstructionPanel(ctx,label,this.definition.subtitle??'Tap the one Pip asks for');}
}
