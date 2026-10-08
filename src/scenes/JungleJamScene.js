import { drawActivityBackground, drawToken } from '../activities/activityDraw.js';
import { drawCandyButton } from '../utils/draw.js';
import { artMap, drawArt, lookupArt, hatchArtIds, hatchTheme } from '../core/art.js';
import { PipController } from '../characters/PipController.js';

// Music Dragon (rare): earned once the child has got each of the four music games right at least once.
const DRAGON_ID='dragon_music',DRAGON_SKILLS=['FAST_SLOW','LOUD_QUIET','RHYTHM','SOUND_RECOGNITION'];

const PERFORMERS=[
  {id:'tiko',name:'Tiko',role:'percussion',symbol:'DRUM',color:'orange'},
  {id:'bo',name:'Bo',role:'bass',symbol:'BASS',color:'purple'},
  {id:'mimi',name:'Mimi',role:'melody',symbol:'MELODY',color:'blue'},
  {id:'zuzu',name:'Zuzu',role:'effect',symbol:'FX',color:'green'},
  {id:'kiki',name:'Kiki',role:'voice',symbol:'VOICE',color:'pink'}
];
const MODES=[['free','FREE JAM'],['rhythm','COPY BEAT'],['tempo','FAST / SLOW'],['dynamics','LOUD / QUIET'],['sound','WHO MADE IT?']];
function inRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}

export class JungleJamScene{
  constructor(game){this.game=game;this.t=0;this.pip=null;this.performers=[];this.slots=[];this.drag=null;this.offset={x:0,y:0};this.mode='free';this.tempo='slow';this.loudness=.65;this.beatT=0;this.beat=0;this.goal='fast';this.soundGoal='percussion';this.rhythmTaps=[];this.demoFlash=0;this.modePressed=null;}
  enter(){
    this.t=0;this.pip=new PipController({x:175,y:860,scale:.62});this.performers=PERFORMERS.map((p,i)=>({...p,x:250+i*300,y:890,homeX:250+i*300,homeY:890,placed:false,slot:null,size:126}));
    this.slots=Array.from({length:5},(_,i)=>({id:`slot-${i}`,x:390+i*285,y:555,w:220,h:250,role:null}));this.drag=null;this.mode='free';this.beatT=0;this.beat=0;this.game.audio?.stopWorldMusic?.();
  }
  exit(){this.game.audio?.stopWorldMusic?.();}
  record(skills,outcome='success'){this.game.learning?.recordResponse?.({activityId:`jungle_jam_${this.mode}`,skillIds:skills,outcome});if(this.game.save?.saveLearning&&this.game.learning?.snapshot)this.game.save.saveLearning(this.game.learning.snapshot());if(outcome==='success')this.checkDragon();}
  checkDragon(){
    const rewards=this.game.rewards;if(this.dragonWon||!rewards?.get?.(DRAGON_ID)||rewards.isUnlocked(DRAGON_ID))return;
    const done=DRAGON_SKILLS.every(id=>{const s=this.game.learning?.getSkill?.(id);return (s?.independentSuccesses??0)+(s?.hintAssistedSuccesses??0)>0;});
    if(!done)return;this.dragonWon=DRAGON_ID;rewards.award(DRAGON_ID);this.game.audio?.playCue?.('reward');this.pip?.react('celebrate',{duration:2});
    this.game.assets?.loadArt?.(hatchArtIds(hatchTheme(DRAGON_ID,'jungle'),DRAGON_ID));
  }
  modeRect(i){return{x:210+i*305,y:190,w:270,h:95};}
  performerAt(x,y){return[...this.performers].reverse().find(p=>Math.hypot(x-p.x,y-p.y)<=95)??null;}
  slotAt(x,y){return this.slots.find(s=>inRect(x,y,{x:s.x-s.w/2,y:s.y-s.h/2,w:s.w,h:s.h}))??null;}
  setMode(mode){this.mode=mode;this.rhythmTaps=[];this.goal=this.goal==='fast'?'slow':'fast';this.soundGoal=PERFORMERS[(this.beat+1)%PERFORMERS.length].role;this.pip?.react('wave',{duration:.8});}
  update(dt){
    this.t+=dt;this.pip?.update(dt);this.demoFlash=Math.max(0,this.demoFlash-dt);const interval=this.tempo==='fast'?.36:.72;this.beatT+=dt;
    while(this.beatT>=interval){this.beatT-=interval;this.beat++;this.demoFlash=.11;for(const p of this.performers.filter(p=>p.placed))this.game.audio?.playJamStem?.(p.role,this.beat,this.loudness);}
  }
  beginDrag(p,e){this.drag=p;this.offset.x=p.x-e.x;this.offset.y=p.y-e.y;p.placed=false;if(p.slot!=null)this.slots[p.slot].role=null;p.slot=null;this.game.audio?.playCue?.('grab');}
  finishDrag(p){const slot=this.slotAt(p.x,p.y);if(slot){const index=this.slots.indexOf(slot);const occupant=this.performers.find(q=>q!==p&&q.slot===index);if(occupant){occupant.placed=false;occupant.slot=null;occupant.x=occupant.homeX;occupant.y=occupant.homeY;}p.x=slot.x;p.y=slot.y;p.slot=index;p.placed=true;slot.role=p.role;this.game.audio?.playJamStem?.(p.role,this.beat,this.loudness);this.game.audio?.playCue?.('correct');}else{p.x=p.homeX;p.y=p.homeY;p.placed=false;p.slot=null;}}
  handleLearningTap(e){
    const fast={x:620,y:720,w:280,h:110},slow={x:1020,y:720,w:280,h:110};
    if(this.mode==='tempo'&&(inRect(e.x,e.y,fast)||inRect(e.x,e.y,slow))){const choice=inRect(e.x,e.y,fast)?'fast':'slow';this.tempo=choice;if(choice===this.goal){this.record(['FAST_SLOW']);this.game.audio?.playCue?.('correct');this.goal=this.goal==='fast'?'slow':'fast';}else{this.record(['FAST_SLOW'],'incorrect');this.game.audio?.playCue?.('incorrect');}return true;}
    if(this.mode==='dynamics'&&(inRect(e.x,e.y,fast)||inRect(e.x,e.y,slow))){const choice=inRect(e.x,e.y,fast)?'loud':'quiet';this.loudness=choice==='loud'?1:.28;if(choice===this.goal){this.record(['LOUD_QUIET']);this.game.audio?.playCue?.('correct');this.goal=this.goal==='loud'?'quiet':'loud';}else{this.record(['LOUD_QUIET'],'incorrect');this.game.audio?.playCue?.('incorrect');}return true;}
    if(this.mode==='rhythm'&&Math.hypot(e.x-960,e.y-760)<=145){const stamp=Number.isFinite(e.timeStamp)?e.timeStamp:this.t*1000;this.rhythmTaps.push(stamp);this.game.audio?.playJamStem?.('percussion',this.rhythmTaps.length,1);if(this.rhythmTaps.length===3){const gaps=[this.rhythmTaps[1]-this.rhythmTaps[0],this.rhythmTaps[2]-this.rhythmTaps[1]];const expected=this.tempo==='fast'?360:720;const ok=gaps.every(g=>Math.abs(g-expected)<=expected*.55+120);this.record(['RHYTHM'],ok?'success':'incorrect');this.game.audio?.playCue?.(ok?'correct':'incorrect');this.rhythmTaps=[];}return true;}
    if(this.mode==='sound'){const p=this.performerAt(e.x,e.y);if(p){const ok=p.role===this.soundGoal;this.game.audio?.playJamStem?.(p.role,this.beat,1);this.record(['SOUND_RECOGNITION'],ok?'success':'incorrect');this.game.audio?.playCue?.(ok?'correct':'incorrect');if(ok)this.soundGoal=PERFORMERS[(PERFORMERS.findIndex(x=>x.role===this.soundGoal)+1)%PERFORMERS.length].role;return true;}}
    return false;
  }
  handlePointer(e){
    if(e.type==='down'){
      for(let i=0;i<MODES.length;i++)if(inRect(e.x,e.y,this.modeRect(i))){this.modePressed=MODES[i][0];return;}
      if(e.x>=40&&e.x<=250&&e.y>=40&&e.y<=150){this.modePressed='back';return;}
      if(this.mode!=='free'&&this.handleLearningTap(e))return;
      const p=this.performerAt(e.x,e.y);if(p)this.beginDrag(p,e);return;
    }
    if(e.type==='move'&&this.drag){this.drag.x=e.x+this.offset.x;this.drag.y=e.y+this.offset.y;return;}
    if(e.type==='up'||e.type==='cancel'){
      if(this.drag){const p=this.drag;this.drag=null;if(e.type==='up')this.finishDrag(p);else{p.x=p.homeX;p.y=p.homeY;}return;}
      if(e.type==='up'&&this.modePressed){const chosen=this.modePressed;this.modePressed=null;if(chosen==='back'){if(this.dragonWon)this.game.scenes.change('island',{celebrateReward:this.dragonWon});else this.game.scenes.change('worldSelect');return;}this.setMode(chosen);return;}
      this.modePressed=null;
    }
  }
  render(ctx){
    drawActivityBackground(ctx,'jungle');this.pip?.render(ctx);ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 68px ui-rounded,system-ui';ctx.fillText('Jungle Jam',960,105);ctx.fillStyle='#fff';ctx.font='700 28px system-ui';ctx.fillText('Build your band — every friend adds a sound!',960,150);
    MODES.forEach((m,i)=>{const r=this.modeRect(i);ctx.fillStyle=this.mode===m[0]?'#fff2a8':'#ffffffd8';ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,38);ctx.fill();ctx.fillStyle='#5a3a73';ctx.font='900 22px system-ui';ctx.fillText(m[1],r.x+r.w/2,r.y+58);});
    for(const slot of this.slots){ctx.fillStyle='#ffffff88';ctx.beginPath();ctx.roundRect(slot.x-slot.w/2,slot.y-slot.h/2,slot.w,slot.h,55);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=7;ctx.stroke();}
    for(const p of this.performers)drawToken(ctx,{kind:'instrument',symbol:p.symbol,label:p.name,color:p.color,x:p.x,y:p.y,size:p.size},{highlight:p===this.drag});
    // Friends on stage get a music note that bobs gently with the beat (still when motion is reduced).
    const notes=artMap()?.jam?.notes;this.performers.forEach((p,i)=>{if(!p.placed||!Array.isArray(notes))return;const bob=globalThis.__LL_REDUCED_MOTION?0:Math.sin(this.t*3+i)*10;drawArt(ctx,notes[i%notes.length],p.x+70,p.y-125+bob,56,66,{alpha:.95});});
    if(this.mode==='tempo'||this.mode==='dynamics'){const a=this.mode==='tempo'?['FAST','SLOW']:['LOUD','QUIET'];ctx.fillStyle='#fff';ctx.font='900 31px system-ui';ctx.fillText(`Can you make it ${String(this.goal).toUpperCase()}?`,960,675);drawCandyButton(ctx,620,720,280,110,a[0],false);drawCandyButton(ctx,1020,720,280,110,a[1],false);}
    if(this.mode==='rhythm'){ctx.fillStyle=this.demoFlash?'#ffd85d':'#ec7ea2';ctx.beginPath();ctx.arc(960,760,145,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 80px system-ui';ctx.fillText('DRUM',960,785);ctx.font='700 28px system-ui';ctx.fillText('Tap 3 times with the beat',960,965);}
    if(this.mode==='sound'){ctx.fillStyle='#fff';ctx.font='900 31px system-ui';ctx.fillText(`Which friend makes the ${this.soundGoal.toUpperCase()} sound?`,960,745);}
    if(this.mode==='free'){ctx.fillStyle='#fff';ctx.font='800 27px system-ui';ctx.fillText(this.performers.some(p=>p.placed)?'Move friends around and make your own song!':'Drag a friend onto the stage!',960,745);}
    if(this.dragonWon){ctx.fillStyle='#fffdf0ee';ctx.beginPath();ctx.roundRect(1300,30,580,130,50);ctx.fill();drawArt(ctx,lookupArt('rewards',this.dragonWon),1370,95,110,110);ctx.fillStyle='#5a3a73';ctx.textAlign='left';ctx.font='900 30px system-ui';ctx.fillText('A rare Music Dragon egg!',1435,88);ctx.font='700 22px system-ui';ctx.fillText('Tap BACK to hatch it on the island',1435,125);ctx.textAlign='center';}
    drawCandyButton(ctx,40,40,210,100,'BACK',this.modePressed==='back','back');
  }
}
