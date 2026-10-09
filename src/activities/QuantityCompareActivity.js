import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken } from './activityDraw.js';

function cardContains(card,x,y){return x>=card.x-card.w/2&&x<=card.x+card.w/2&&y>=card.y-card.h/2&&y<=card.y+card.h/2;}

export class QuantityCompareActivity extends Activity {
  start(){
    this.rule=this.definition.rule??'more';
    this.referenceCount=Number(this.definition.referenceCount??0);
    this.choices=(this.definition.choices??[]).map((choice,i)=>({...choice,id:choice.id??`quantity-${i}`,count:Number(choice.count??0),x:choice.x??620+i*430,y:choice.y??690,w:choice.w??340,h:choice.h??330,wobble:0}));
    super.start();
  }
  update(dt){super.update(dt);for(const choice of this.choices)choice.wobble=Math.max(0,choice.wobble-dt);}
  correctChoice(){
    if(this.definition.correctId)return this.choices.find(c=>c.id===this.definition.correctId)??null;
    if(this.rule==='same')return this.choices.find(c=>c.count===this.referenceCount)??null;
    const sorted=[...this.choices].sort((a,b)=>a.count-b.count);return this.rule==='less'?sorted[0]:sorted.at(-1);
  }
  getHintContext(){const object=this.correctChoice();return object?{object,target:object,skillIds:this.configuredSkills()}:null;}
  handlePointer(e){
    if(e.type!=='up')return;const choice=this.choices.find(c=>cardContains(c,e.x,e.y));if(!choice)return;
    if(choice===this.correctChoice()){
      this.recordResponse(this.configuredSkills(),'success');this.cue('correct');this.react('happy',{duration:.8,target:choice});this.complete({detail:this.definition.completeDetail??(this.rule==='same'?'Same amount!':`You found the group with ${this.rule}!`)});
    }else{choice.wobble=.42;this.recordResponse(this.configuredSkills(),'incorrect');this.cue('incorrect');this.react('encourage',{duration:.8});}
  }
  drawGroup(ctx,choice){
    ctx.save();ctx.translate(choice.x,choice.y);if(choice.wobble>0)ctx.rotate(Math.sin(this.t*20)*.07);ctx.translate(-choice.x,-choice.y);
    const hinted=this.hintLevel>=2&&this.hintContext?.object?.id===choice.id;
    ctx.fillStyle=hinted?'#fff3a8':'#ffffffdd';ctx.beginPath();ctx.roundRect(choice.x-choice.w/2,choice.y-choice.h/2,choice.w,choice.h,58);ctx.fill();
    const cols=choice.count<=4?2:choice.count<=6?3:4;const gap=Math.min(80,(choice.w-80)/Math.max(1,cols));const rows=Math.ceil(choice.count/cols);const totalH=(rows-1)*75;const startY=choice.y-totalH/2;
    for(let i=0;i<choice.count;i++){
      const col=i%cols,row=Math.floor(i/cols);const colsThis=Math.min(cols,choice.count-row*cols);const x=choice.x+(col-(colsThis-1)/2)*gap,y=startY+row*75;
      drawToken(ctx,{kind:choice.kind??this.definition.object??'egg',color:choice.color??this.definition.color??'yellow',symbol:choice.symbol??this.definition.symbol,thing:choice.thing??this.definition.thing,animalType:choice.animalType??this.definition.animalType,x,y,size:72},{colour:'uniform',plain:true});
    }
    ctx.restore();
  }
  render(ctx){
    drawActivityBackground(ctx,this.definition.theme??'dino');
    if(this.referenceCount>0){
      ctx.fillStyle='#fff7d0';ctx.beginPath();ctx.roundRect(720,255,480,180,55);ctx.fill();
      for(let i=0;i<this.referenceCount;i++){const cols=Math.min(5,this.referenceCount);const row=Math.floor(i/cols),col=i%cols;drawToken(ctx,{kind:this.definition.object??'egg',color:this.definition.color??'purple',symbol:this.definition.symbol,thing:this.definition.thing,animalType:this.definition.animalType,x:850+(col-(cols-1)/2)*55,y:325+row*62,size:55},{colour:'uniform',plain:true});}
    }
    for(const choice of this.choices)this.drawGroup(ctx,choice);
    drawInstructionPanel(ctx,this.definition.instructionText??(this.rule==='same'?'Which group has the same amount?':`Which group has ${this.rule}?`),this.definition.subtitle??'Look at the groups, then tap your answer');
  }
}
