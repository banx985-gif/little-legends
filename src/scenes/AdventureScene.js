import { PipController } from '../characters/PipController.js';
import { HintController } from '../hints/HintController.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, drawActivityAmbient } from '../activities/activityDraw.js';
import { drawCandyButton, drawSpeechBubble, wrapLines } from '../utils/draw.js';
import { EGG_STATES } from '../rewards/EggSystem.js';
import { drawArt, characterArt, hatchTheme, worldTheme, dragonForWorld, artMap, fxArt, lookupArt } from '../core/art.js';
import { HatchSequence } from '../fx/HatchSequence.js';
import { HoldToLeave } from '../ui/HoldToLeave.js';
import { ActivityScene } from './ActivityScene.js';
import { VOICE_REPEAT_SECONDS, MISSES_FOR_HINT } from '../hints/HintController.js';

// Tap-to-hatch keeps its taps; each egg state shows the next hatch frame.
const EGG_FRAME={RECEIVED:0,READY:0,INTERACTION_1:1,INTERACTION_2:2,CRACK:3,HATCH:4};

function pointInRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}

export class AdventureScene {
  constructor(game) {
    this.game=game; this.definition=null; this.stepIndex=0; this.step=null; this.activity=null; this.hints=null;
    this.pip=null; this.completedStep=false; this.pressed=null; this.t=0; this.speech=''; this.speechT=0; this.bigChoice=null; this.patternChoice=null;
    this.rewardSaved=false; this.finishSaved=false; this.lookAwarded=null;
  }

  async enter(data={}) {
    this.t=0; this.pip=new PipController({x:230,y:760,scale:0.72,onVoiceEvent:e=>this.voiceEvent(e)});
    // Grown-up way out (hold the home button). Progress is saved at every step, so the mission resumes where it stopped.
    this.leave=new HoldToLeave({onLeave:()=>this.game.scenes.change('worldHub',{world:this.definition?.world??'dino'})});
    await this.game.activityEngine.ensureLoaded(this.game.assets);
    await this.game.adventureEngine.ensureLoaded(this.game.assets);
    const id=data.adventureId??'rory_dino_picnic';
    this.definition=this.game.adventureEngine.get(id);
    if(!this.definition) throw new Error(`Unknown adventure: ${id}`);
    this.game.audio?.startWorldMusic?.(this.definition.world??'dino');
    const saved=this.game.save?.getProfileState?.()?.adventure;
    const resume=saved?.currentId===id ? saved.step : 0;
    this.stepIndex=Math.max(0,Math.min(this.definition.steps.length-1,data.step??resume??0));
    await this.startStep();
  }

  async exit(){this.activity?.cleanup?.();this.hints?.stop?.();this.game.audio?.stopVoice?.();this.game.audio?.stopWorldMusic?.();}

  voiceEvent(event){
    if(event.type==='start'){
      this.speech=event.bubbleText??event.text??''; this.speechT=event.duration??1;
      if(event.text) this.game.audio?.speak?.(event.text);
    } else this.speechT=0;
  }

  getLearningAssistance(){const level=this.hints?.currentLevel??0;return{assisted:level>0,hintLevel:level};}
  repeatInstruction(){
    const text=this.activity?.spokenInstruction?.()??this.step?.voice??this.step?.title;
    if(text)this.pip.say(`${this.step.id}-repeat`,{text,bubbleText:this.activity?.definition?.pipBubble??(this.activity?text:this.step?.title),duration:1.6,reaction:'encourage'});
  }
  showHintDemo(context){this.hintDemo=context;this.hintDemoT=0;}
  hideHintDemo(){this.hintDemo=null;this.hintDemoT=0;}

  async startStep(){
    this.activity?.cleanup?.(); this.hints?.stop?.(); this.activity=null; this.hints=null; this.hintDemo=null; this.idleT=0; this.idleRepeats=0; this.stepMisses=0; this.freshTap=false; this.completedStep=false; this.pressed=null; this.bigChoice=null; this.patternChoice=null;
    this.step=this.definition.steps[this.stepIndex];
    this.pip?.clearQueue?.({keepActive:false}); // the new step's words come straight away, not after the last cheer
    const rewardId=this.definition.reward?.id??'baby_raptor';
    this.hatch=['egg','hatch'].includes(this.step.kind)?new HatchSequence({theme:hatchTheme(rewardId,this.definition.world),rewardId}).showStage(0):null;
    await this.game.save?.saveAdventure?.(this.definition.id,this.stepIndex);
    if(this.step.kind==='activity'){
      this.activity=this.game.activityEngine.create(this.step.activityId,this);
      await this.activity.load(); this.activity.start(); this.hints=new HintController({host:this,learning:this.game.learning});
    } else if(this.step.voice){
      this.pip.say(this.step.id,{text:this.step.voice,bubbleText:this.step.title,duration:2.4,reaction:'wave'});
    }
    // Choice, egg and home steps without a voice line: Pip says the step's title (what the panel shows).
    if(this.step.kind!=='activity'&&!this.step.voice&&this.step.title)this.pip.say(this.step.id,{text:this.step.title,bubbleText:this.step.title,duration:2,reaction:'wave'});
    if(this.step.kind==='egg'){
      await this.game.eggs?.receive?.('rory-dino-egg','baby_raptor');
      this.pip.react('celebrate',{duration:1.9}); this.game.audio?.playCue?.('reward');
    } else if(this.step.kind==='hatch'){
      await this.game.eggs?.setReady?.('rory-dino-egg');
    }
  }

  completeActivity(){this.completedStep=true;this.freshTap=false;this.hints?.stop?.();this.game.scheduler?.record?.(this.activity?.definition);this.pip.react('celebrate',{duration:1.3});}

  async advance(){
    if(this.stepIndex>=this.definition.steps.length-1){await this.finishAdventure();return;}
    this.stepIndex++; await this.startStep();
  }

  async finishAdventure(){
    const rewardId=this.definition.reward?.id??null;
    if(!this.finishSaved){
      this.finishSaved=true;
      if(rewardId&&this.game.rewards?.get?.(rewardId)) await this.game.rewards.award(rewardId,{stars:this.definition.reward?.stars??null}); // a mission can give stars for a Collection thing it hands out
      // Some missions also give Pip a new look (data/adventures.json bonusLook), the first time it is won.
      const look=this.definition.bonusLook;
      if(look&&this.game.rewards?.get?.(look)&&!this.game.rewards.isUnlocked(look)){await this.game.rewards.award(look);this.lookAwarded=look;}
      if(this.definition.id==='rory_dino_picnic'){
        await this.game.save?.award?.('buildings','dinosaur_home');
        await this.game.save?.saveIslandPlacement?.('dinosaur_home',{x:1460,y:690,zone:'creature'});
      }
      await this.game.save?.saveLearning?.(this.game.learning.snapshot());
      await this.game.save?.saveAdventure?.(this.definition.id,0,{completed:true});
    }
    // Every mission in this world done: its rare dragon hatches on the island after the mission reward.
    const dragon=this.earnedDragon();
    if(dragon&&!this.game.rewards.isUnlocked(dragon.id)){await this.game.rewards.award(dragon.id);this.dragonAwarded=dragon.id;}
    const celebrate=[rewardId,this.lookAwarded,dragon?.id].filter(Boolean);
    this.game.scenes.change('island',{celebrateReward:celebrate[0]??null,celebrateNext:celebrate.slice(1)});
  }

  earnedDragon(){
    const world=this.definition?.world,dragon=dragonForWorld(this.game,world);if(!dragon)return null;
    const done=this.game.save?.getProfileState?.()?.adventure?.completed??[];
    const all=this.game.adventureEngine.list().filter(a=>a.world===world);
    if(!all.length||!all.every(a=>done.includes(a.id)))return null;
    return this.dragonAwarded===dragon.id||!this.game.rewards.isUnlocked(dragon.id)?dragon:null; // only the first time
  }

  update(dt){
    this.t+=dt;this.crackT=Math.max(0,(this.crackT??0)-dt);this.leave?.update(dt);this.pip?.update(dt);this.hatch?.update(dt);this.game.rewards?.update?.(dt); if(this.speechT>0)this.speechT=Math.max(0,this.speechT-dt);
    // Story, choice and egg steps: say the step again after a while with no touch (activities do this in HintController).
    if(!this.activity&&!this.completedStep){this.idleT+=dt;if(this.idleT>=VOICE_REPEAT_SECONDS&&this.idleRepeats<4){this.idleT=0;this.idleRepeats++;this.repeatInstruction();}}
    if(this.activity&&!this.completedStep){this.activity.update(dt);this.hints?.update(dt);if(this.hintDemo)this.hintDemoT=(this.hintDemoT??0)+dt;}
  }

  async handlePointer(e){
    if(this.leave?.handlePointer(e))return;
    this.idleT=0;this.idleRepeats=0;
    if(this.activity&&!this.completedStep){this.hints?.onInput?.();this.activity.handlePointer(e);return;}
    // A finished step moves on with a fresh tap: the finger lifting at the end of a trace or drag must not skip the "well done".
    if(e.type==='down'){this.freshTap=true;return;}
    if(e.type!=='up')return;
    if(this.completedStep && ['activity','size','pattern','hatch','place'].includes(this.step.kind)){if(!this.freshTap)return;await this.advance();return;}
    if(this.step.kind==='size'){
      const blankets=this.blankets(); const choice=blankets.find(b=>Math.abs(e.x-b.x)<=b.w/2+25&&Math.abs(e.y-b.y)<=b.h/2+25); if(!choice)return;
      this.bigChoice=choice.id;
      if(choice.id==='big'){
        this.game.learning.recordResponse({activityId:'dino_big_blanket',skillIds:['BIG_SMALL'],outcome:'success'});this.game.audio?.playCue?.('correct');this.completedStep=true;this.pip.react('happy',{duration:1});
      }else{this.stepMisses++;this.game.learning.recordResponse({activityId:'dino_big_blanket',skillIds:['BIG_SMALL'],outcome:'incorrect'});this.game.audio?.playCue?.('incorrect');this.pip.react('encourage',{duration:1});}
      return;
    }
    if(this.step.kind==='pattern'){
      const blue={x:690,y:760,w:240,h:150},yellow={x:990,y:760,w:240,h:150}; let choice=null;
      if(pointInRect(e.x,e.y,blue))choice='blue';else if(pointInRect(e.x,e.y,yellow))choice='yellow';if(!choice)return;
      this.patternChoice=choice;
      if(choice==='blue'){
        this.game.learning.recordResponse({activityId:'dino_ab_pattern',skillIds:['SAME_DIFFERENT'],outcome:'success'});this.game.audio?.playCue?.('correct');this.completedStep=true;this.pip.react('happy',{duration:1});
      }else{this.stepMisses++;this.game.learning.recordResponse({activityId:'dino_ab_pattern',skillIds:['SAME_DIFFERENT'],outcome:'incorrect'});this.game.audio?.playCue?.('incorrect');this.pip.react('encourage',{duration:1});}
      return;
    }
    if(this.step.kind==='hatch'){
      const egg=await this.game.eggs?.interact?.('rory-dino-egg');this.crackT=.45; // a little crack of light on every tap
      this.game.audio?.playCue?.(egg?.state===EGG_STATES.CREATURE_UNLOCKED?'reward':'correct');
      if(egg?.state===EGG_STATES.CREATURE_UNLOCKED){this.hatch?.reveal();this.completedStep=true;this.game.rewards?.beginReveal?.('baby_raptor');this.pip.react('celebrate',{duration:1.8});}
      return;
    }
    if(this.step.kind==='place'){
      if(!this.completedStep){this.completedStep=true;this.game.audio?.playCue?.('reward');this.pip.react('celebrate',{duration:1.8});return;}
    }
    if(this.step.kind==='egg')this.rewardSaved=true;
    await this.advance();
  }

  blankets(){return[
    {id:'small',x:520,y:565,w:260,h:150,color:'#ef7f91'},
    {id:'big',x:870,y:500,w:500,h:280,color:'#ffd56f'},
    {id:'medium',x:1450,y:545,w:340,h:200,color:'#6bb9ef'}
  ];}

  drawRory(ctx,x=1510,y=690,scale=1){
    if(drawArt(ctx,characterArt('rory'),x,y+82*scale,340*scale,340*scale,{anchor:'bottom'}))return;
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#66bf68';ctx.beginPath();ctx.ellipse(0,0,125,82,-0.08,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(95,-75,72,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-100,-15);ctx.lineTo(-240,-70);ctx.lineTo(-115,45);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(118,-90,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#383347';ctx.beginPath();ctx.arc(122,-88,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4a4051';ctx.lineWidth=9;ctx.beginPath();ctx.arc(105,-58,32,0.12*Math.PI,0.85*Math.PI);ctx.stroke();ctx.restore();
  }

  drawOcto(ctx,x=1510,y=690,scale=1){
    if(drawArt(ctx,characterArt('octo'),x,y+130*scale,330*scale,300*scale,{anchor:'bottom'}))return;
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#8b69db';ctx.beginPath();ctx.arc(0,-65,96,0,Math.PI*2);ctx.fill();
    for(let i=0;i<6;i++){const a=-Math.PI*.9+i*Math.PI*.36;ctx.strokeStyle='#8b69db';ctx.lineWidth=35;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(Math.cos(a)*40,Math.sin(a)*20);ctx.quadraticCurveTo(Math.cos(a)*105,95+Math.sin(a)*40,Math.cos(a)*125,130);ctx.stroke();}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-32,-78,18,0,Math.PI*2);ctx.arc(32,-78,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#393247';ctx.beginPath();ctx.arc(-28,-76,8,0,Math.PI*2);ctx.arc(36,-76,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#513b67';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,-38,34,.12*Math.PI,.88*Math.PI);ctx.stroke();ctx.restore();
  }

  drawLuna(ctx,x=1510,y=690,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#6f78c9';ctx.beginPath();ctx.ellipse(0,-30,105,125,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-78,-105);ctx.lineTo(-38,-188);ctx.lineTo(-10,-112);ctx.closePath();ctx.moveTo(78,-105);ctx.lineTo(38,-188);ctx.lineTo(10,-112);ctx.closePath();ctx.fill();ctx.fillStyle='#fff3dc';ctx.beginPath();ctx.ellipse(0,-40,72,82,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-31,-63,20,0,Math.PI*2);ctx.arc(31,-63,20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b3651';ctx.beginPath();ctx.arc(-28,-61,8,0,Math.PI*2);ctx.arc(34,-61,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f7cf4f';ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(22,-12);ctx.lineTo(-22,-12);ctx.closePath();ctx.fill();ctx.restore();}

  drawBella(ctx,x=1510,y=690,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#c98b58';ctx.beginPath();ctx.arc(0,-48,112,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-75,-130,42,0,Math.PI*2);ctx.arc(75,-130,42,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2c99d';ctx.beginPath();ctx.ellipse(0,-20,70,58,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-38,-70,18,0,Math.PI*2);ctx.arc(38,-70,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3d3348';ctx.beginPath();ctx.arc(-34,-68,7,0,Math.PI*2);ctx.arc(42,-68,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a3a73';ctx.beginPath();ctx.arc(0,-30,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6b4c55';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,-12,34,.12*Math.PI,.88*Math.PI);ctx.stroke();ctx.restore();}

  drawGuide(ctx){const world=this.definition?.world;if(this.definition?.guide==='pip')return;/* Pip leads (no art yet for Zig Robot) */if(this.definition?.guide==='octo'||world==='rainbow')this.drawOcto(ctx);else if(this.definition?.guide==='luna'||world==='storybook')this.drawLuna(ctx);else if(this.definition?.guide==='bella'||world==='animal'||world==='life')this.drawBella(ctx);else this.drawRory(ctx);}

  // Under the instruction panel (it used to sit behind it and get cut off), pointing at Pip.
  drawSpeech(ctx){if(!this.speech||this.speechT<=0)return;drawSpeechBubble(ctx,this.speech,30,240,440,112,Math.min(1,this.speechT/.18));}

  render(ctx){this.renderStep(ctx);this.leave?.render(ctx);}

  renderStep(ctx){
    if(this.activity){this.activity.render(ctx);drawActivityAmbient(ctx,this.activity.definition,this.t);this.drawHintDemonstration(ctx);this.pip.render(ctx);this.drawSpeech(ctx);if(this.completedStep)this.drawContinue(ctx);return;}
    drawActivityBackground(ctx,this.step.theme??this.definition.theme??worldTheme(this.definition?.world)); this.drawGuide(ctx); this.pip.render(ctx); this.drawSpeech(ctx);
    drawInstructionPanel(ctx,this.step.title,`${this.stepIndex+1} of ${this.definition.steps.length}`);
    if(this.step.kind==='story')this.renderStory(ctx);
    else if(this.step.kind==='size')this.renderSize(ctx);
    else if(this.step.kind==='pattern')this.renderPattern(ctx);
    else if(this.step.kind==='egg')this.renderEgg(ctx,false);
    else if(this.step.kind==='hatch')this.renderEgg(ctx,true);
    else if(this.step.kind==='place')this.renderPlace(ctx);
    if(this.completedStep||['story','egg'].includes(this.step.kind))this.drawContinue(ctx,this.step.kind==='place'&&this.completedStep?'HOME':'CONTINUE');
  }

  renderStory(ctx){ctx.fillStyle='#ffffffcc';ctx.beginPath();ctx.roundRect(560,360,780,250,70);ctx.fill();ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 54px system-ui';ctx.fillText(this.step.title??this.definition.title,950,465);ctx.font='700 32px system-ui';const fallback={space:'Pip is ready for take-off!',town:'Busy Town needs a helper!',rainbow:'Octo needs our help!',animal:'Bella found an animal mystery!',storybook:'Luna has a story for us!',life:'Bella is ready for today!',dino:'Rory needs our help.'}[this.definition.world]??'Let’s help!';const detail=this.step.voice??fallback;const lines=wrapLines(ctx,detail,720,2);lines.forEach((line,i)=>ctx.fillText(line,950,lines.length>1?520+i*42:535,740));if(this.stepIndex>=this.definition.steps.length-1){this.drawTrophy(ctx);this.drawStars(ctx);}else if(this.step.art)drawArt(ctx,this.step.art,950,868,300,250,{anchor:'bottom',alpha:Math.min(1,(this.t??0)/.4)});}
  // First win of a mission: the Discovery Stars it gives, as gold stars beside the trophy.
  drawStars(ctx){const id=this.definition.reward?.id,reward=this.game.rewards?.get?.(id);if(!reward||this.game.rewards.isUnlocked?.(id))return;const n=Math.min(3,Number(this.definition.reward?.stars??reward.stars)||0);const pic=lookupArt('ui','missionStar');
    for(let i=0;i<n;i++)drawArt(ctx,pic,1190+i*78,800-(i%2)*26,84,84,{alpha:Math.min(1,Math.max(0,((this.t??0)-.3-i*.15)/.3))});}
  // Mission finished (Job 11): a bronze, silver or gold trophy on the star podium, by how much of the world is done.
  // The world's last mission: the gold trophy on the crystal pedestal under the rainbow arch.
  drawTrophy(ctx){const t=artMap()?.trophies;if(!t)return;const world=this.definition.world,missions=this.game.adventureEngine?.list?.().filter(a=>a.world===world)??[];if(!missions.length)return;
    const done=new Set([...(this.game.save?.getProfileState?.()?.adventure?.completed??[]),this.definition.id]),n=missions.filter(m=>done.has(m.id)).length,complete=n>=missions.length;
    const tier=complete?'gold':n*3>=missions.length*2?'gold':n*3>=missions.length?'silver':'bronze',rise=Math.min(1,(this.t??0)/.5);
    // The star podium is a little winner's stage: the trophy stands in front of it. The crystal pedestal has a flat top: the trophy sits on it.
    if(complete){const beam=fxArt('worldBeam');drawArt(ctx,beam?.id,950,880,330,470,{anchor:'bottom',alpha:rise*.75,blend:beam?.blend});drawArt(ctx,t.arch,950,875,440,330,{anchor:'bottom',alpha:rise});drawArt(ctx,t.pedestal,950,875,200,170,{anchor:'bottom',alpha:rise});drawArt(ctx,t.gold,950,792,120,135,{anchor:'bottom',alpha:rise});}
    else{drawArt(ctx,t.podium,950,858,290,200,{anchor:'bottom',alpha:rise});drawArt(ctx,t[tier],950,880,125,145,{anchor:'bottom',alpha:rise});}} // whole sentence on up to two lines (it used to be cut off with …)
  drawHintDemonstration(ctx){ActivityScene.prototype.drawHintDemonstration.call(this,ctx);}
  // After two wrong taps the right answer glows softly.
  drawChoiceHint(ctx,x,y,w,h){if(this.stepMisses<MISSES_FOR_HINT||this.completedStep)return;ctx.save();ctx.globalAlpha=.55+Math.sin(this.t*5)*.25;ctx.strokeStyle='#fff7d0';ctx.lineWidth=16;ctx.beginPath();ctx.roundRect(x-14,y-14,w+28,h+28,56);ctx.stroke();ctx.restore();}
  renderSize(ctx){this.drawChoiceHint(ctx,620,360,500,280);for(const b of this.blankets()){ctx.fillStyle=b.color;ctx.beginPath();ctx.roundRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h,45);ctx.fill();ctx.fillStyle='#ffffff55';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(b.x-b.w*.3+i*b.w*.2,b.y,16,0,Math.PI*2);ctx.fill();}}}
  renderPattern(ctx){this.drawChoiceHint(ctx,690,760,240,150);const xs=[520,760,1000,1240];const colors=['red','blue','red',null];for(let i=0;i<4;i++){ctx.fillStyle=colors[i]==='red'?'#e94d55':colors[i]==='blue'?'#4d8ee8':'#ffffffaa';ctx.beginPath();ctx.roundRect(xs[i]-85,470,170,170,45);ctx.fill();if(!colors[i]){ctx.fillStyle='#8b69db';ctx.textAlign='center';ctx.font='900 95px system-ui';ctx.fillText('?',xs[i],585);}}for(const [x,c] of [[690,'#4d8ee8'],[990,'#f7cf4f']]){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,760,240,150,45);ctx.fill();}}
  renderEgg(ctx,hatched){const egg=this.game.eggs?.get?.('rory-dino-egg');
    if(this.hatch?.ready){
      const unlocked=hatched&&egg?.state===EGG_STATES.CREATURE_UNLOCKED;
      if(!unlocked)this.hatch.showStage(hatched?EGG_FRAME[egg?.state]??0:0);else if(this.hatch.manualStage!==null)this.hatch.skip();
      this.hatch.render(ctx,960,780,400);if(this.crackT>0&&hatched&&!unlocked)drawArt(ctx,fxArt('eggCrack'),960,600,300,300,{alpha:this.crackT/.45});
      ctx.fillStyle='#fff';ctx.textAlign='center';
      if(unlocked){ctx.font='900 48px system-ui';ctx.fillText(`${String(this.game.rewards?.get?.(this.definition.reward?.id)?.name??'Baby Raptor').toUpperCase()}!`,960,845);}
      else if(hatched){ctx.font='800 34px system-ui';ctx.fillText('Tap the egg to help it hatch!',960,845);}
      return;
    }if(!hatched||!egg||egg.state!==EGG_STATES.CREATURE_UNLOCKED){const progress=this.game.eggs?.progress?.('rory-dino-egg')??0;drawToken(ctx,{kind:'egg',color:'#fff2c7',x:960,y:600,size:420},{highlight:true});if(hatched){ctx.strokeStyle='#8b69db';ctx.lineWidth=14;for(let i=0;i<Math.floor(progress*6);i++){ctx.beginPath();ctx.moveTo(900+i*22,530+i%2*15);ctx.lineTo(920+i*22,570-i%2*10);ctx.stroke();}ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='800 34px system-ui';ctx.fillText('Tap the egg to help it hatch!',960,840);}}else{this.drawRory(ctx,960,650,0.72);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 48px system-ui';ctx.fillText('BABY RAPTOR!',960,820);}}
  renderPlace(ctx){ctx.fillStyle='#b77d4e';ctx.beginPath();ctx.roundRect(780,570,420,260,80);ctx.fill();ctx.fillStyle='#7ccf6a';ctx.beginPath();ctx.ellipse(990,585,250,80,0,0,Math.PI*2);ctx.fill();this.drawRory(ctx,980,680,0.48);ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='800 34px system-ui';ctx.fillText(this.completedStep?'Perfect home!':'Tap to place Baby Raptor here',990,900);}
  drawContinue(ctx,label='CONTINUE'){drawCandyButton(ctx,720,880,480,125,label,false,label==='HOME'?'home':'play');}
}
