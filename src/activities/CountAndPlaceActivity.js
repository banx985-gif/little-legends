import { DragBaseActivity } from './DragBaseActivity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, drawBasket, drawCharacter } from './activityDraw.js';
import { countTargetArt } from '../core/art.js';

// Food/eggs already in the container are drawn smaller so each one sits apart and can be counted.
const PLACED_ART_SCALE = 0.62;

const DEFAULT_STARTS = [
  {x:330,y:560},{x:525,y:720},{x:715,y:535},{x:900,y:735},{x:1080,y:555},
  {x:365,y:835},{x:610,y:865},{x:850,y:875},{x:1070,y:820},{x:1190,y:690}
];

function countSkill(value) {
  const n = Math.max(1, Math.min(10, Math.round(Number(value) || 1)));
  return `COUNT_${n}`;
}

export class CountAndPlaceActivity extends DragBaseActivity {
  start(){
    const count=Math.max(1,Math.min(10,Number(this.definition.targetCount??3)));
    this.startingCount=Math.max(0,Math.min(count-1,Number(this.definition.startingCount??0)));
    const starts=this.definition.positions?.length?this.definition.positions:DEFAULT_STARTS;
    this.tokens=Array.from({length:count},(_,i)=>{
      const pos=starts[Math.max(0,i-this.startingCount)%starts.length];
      const token=this.makeToken({kind:this.definition.object??'apple',color:this.definition.color??'red',thing:this.definition.thing,symbol:this.definition.symbol,x:pos.x,y:pos.y,size:this.definition.objectSize??145},i);
      if(i<this.startingCount){token.state='placed';token.placed=true;token.scale=.82;}
      return token;
    });
    this.target={id:'basket',x:this.definition.targetX??1480,y:this.definition.targetY??720,w:360,h:270,releaseRadius:300};
    this.count=this.startingCount;
    for(let i=0;i<this.startingCount;i++) this.placeInBasket(this.tokens[i],i);
    super.start();
    if(this.count>=count)this.complete({detail:this.countDetail()});
  }
  validTargets(){return[this.target];}
  nearestTarget(){return this.target;}
  accepts(){return true;}
  skillsForToken(){return [countSkill(this.count+1),...(this.definition.startingCount?['ADDITION_PREP']:[])];}
  placeInBasket(token,index){
    const cols=5; const row=Math.floor(index/cols),col=index%cols;
    const x=this.target.x-118+col*58+(row%2?25:0),y=this.target.y-48+row*82;
    this.snapToken(token,x,y); token.scale=.76;
  }
  countDetail(){return Array.from({length:this.count},(_,i)=>i+1).join(' • ');}
  onValidDrop(token){
    this.placeInBasket(token,this.count);
    this.count++;
    const skills=[countSkill(this.count),...(this.definition.startingCount?['ADDITION_PREP']:[]),...(this.definition.skills??[])];
    this.recordResponse([...new Set(skills)],'success');
    this.cue('count',{count:this.count}); this.cue('correct');
    this.host.pip?.clearQueue({keepActive:false});
    this.host.pip?.say(`${this.id}_count_${this.count}`,{text:String(this.count),bubbleText:`${this.count}!`,duration:0.65,reaction:'bounce',target:token});
    if(this.count>=this.definition.targetCount) this.complete({detail:this.definition.completeDetail??this.countDetail()});
  }
  getHintContext(){
    const object=this.tokens.find(token=>token.state!=='placed'&&!token.placed)??null;
    return object?{object,target:this.target,skillIds:this.skillsForToken()}:null;
  }
  render(ctx){
    drawActivityBackground(ctx,this.definition.theme??'meadow');
    if(this.definition.character!=='none') drawCharacter(ctx,this.definition.character??'bunny',1580,430,this.completeState);
    drawBasket(ctx,this.target,this.count,this.hintLevel>=3&&this.hintContext?.target?.id===this.target.id,countTargetArt(this.definition));
    for(const token of this.tokens){const hinted=this.hintLevel>=2&&this.hintContext?.object?.id===token.id;drawToken(ctx,token,{scale:token.scale*(token.placed?PLACED_ART_SCALE:1),highlight:token.state==='dragging'||hinted,wobble:hinted?Math.sin(this.t*10)*0.08:0,colour:'uniform'});}
    drawInstructionPanel(ctx,this.definition.instructionText??`Put ${this.definition.targetCount} in the basket`,this.definition.subtitle??(this.startingCount?`There are ${this.startingCount}. Add more and count.`:'Drag and count'));
  }
}
