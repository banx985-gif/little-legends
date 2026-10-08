import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, tokenHit } from './activityDraw.js';
import { art, tokenArt } from '../core/art.js';

export class MatchPairsActivity extends Activity {
  start(){
    const pairs=this.definition.pairs??[];
    const positions=[{x:520,y:470},{x:820,y:470},{x:1120,y:470},{x:1420,y:470},{x:670,y:760},{x:970,y:760},{x:1270,y:760},{x:1570,y:760}];
    this.tokens=[];
    pairs.forEach((p,i)=>{const pairItems=Array.isArray(p.items)&&p.items.length>=2?p.items.slice(0,2):[p,p];for(let copy=0;copy<2;copy++){const pos=positions[this.tokens.length]??{x:520+(this.tokens.length%4)*300,y:470+Math.floor(this.tokens.length/4)*290};const item=pairItems[copy]??p;this.tokens.push({...p,...item,id:item.id??`${i}-${copy}`,pairId:`pair-${i}`,x:item.x??pos.x,y:item.y??pos.y,size:item.size??p.size??145,matched:false,selected:false,wobble:0});}});
    this.first=null; this.lock=0; super.start();
  }
  update(dt){super.update(dt);this.lock=Math.max(0,this.lock-dt);for(const t of this.tokens)t.wobble=Math.max(0,t.wobble-dt);}
  handlePointer(e){
    if(e.type!=='up'||this.lock>0)return;
    const token=this.tokens.find(t=>!t.matched&&tokenHit(t,e.x,e.y,28)); if(!token)return;
    this.cue('drop');
    if(!this.first){this.first=token;token.selected=true;this.lookAt(token,0.6);return;}
    if(token===this.first)return;
    if(token.pairId===this.first.pairId){const skill=this.skillForPair(token);this.recordResponse([skill,'SAME_DIFFERENT'].filter(Boolean),'success');token.matched=true;this.first.matched=true;token.selected=false;this.first.selected=false;this.first=null;this.cue('correct');this.react('happy',{duration:0.8,target:token});if(this.tokens.every(t=>t.matched))this.complete({detail:this.definition.completeDetail??'All the pairs match!'});}
    else{this.recordResponse(['SAME_DIFFERENT'],'incorrect');token.wobble=0.45;this.first.wobble=0.45;this.first.selected=false;this.first=null;this.lock=0.35;this.cue('incorrect');this.react('encourage',{duration:0.9});}
  }
  getHintContext(){const object=this.tokens.find(t=>!t.matched)??null;if(!object)return null;const target=this.tokens.find(t=>!t.matched&&t!==object&&t.pairId===object.pairId)??null;const skill=this.skillForPair(object);return{object,target,skillIds:[skill,'SAME_DIFFERENT'].filter(Boolean)};}
  skillForPair(token){const kind=String(token.kind??'').toUpperCase(),colour=String(token.color??'').toUpperCase();if(['CIRCLE','SQUARE','TRIANGLE','RECTANGLE'].includes(kind))return kind;if(['RED','BLUE','YELLOW','GREEN','ORANGE','PURPLE'].includes(colour))return colour;return null;}
  // Both halves of a pair use the same style: real pictures only when every item in the pair has one.
  pairHasArt(token){return this.tokens.filter(o=>o.pairId===token.pairId).every(o=>art(tokenArt(o)?.id));}
  render(ctx){drawActivityBackground(ctx,this.definition.theme??'meadow');for(const t of this.tokens){const hintedObject=this.hintLevel>=2&&this.hintContext?.object?.id===t.id;const hintedTarget=this.hintLevel>=3&&this.hintContext?.target?.id===t.id;const wob=t.wobble>0?Math.sin(t.wobble*55)*0.1:hintedObject?Math.sin(this.t*10)*0.08:0;ctx.save();ctx.translate(t.x,t.y);ctx.rotate(wob);ctx.translate(-t.x,-t.y);drawToken(ctx,t,{scale:t.selected?1.13:1,highlight:t.selected||hintedObject||hintedTarget,noArt:!this.pairHasArt(t)});ctx.restore();}drawInstructionPanel(ctx,this.definition.instructionText??'Find the matching pairs',this.definition.subtitle??'Tap two that are the same');}
}
