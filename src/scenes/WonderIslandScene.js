import { drawCloud, drawCandyButton } from '../utils/draw.js';
import { PipController } from '../characters/PipController.js';
import { drawArt, lookupArt, hatchTheme, worldOfReward } from '../core/art.js';
import { HatchSequence } from '../fx/HatchSequence.js';

const CELEBRATE_SECONDS=4.5, HATCH_ART_WAIT=6;

const BASE_OBJECTS=[
  {id:'tree',type:'tree',x:450,y:585,w:180,h:260,zone:'nature'},
  {id:'pond',type:'pond',x:650,y:800,w:360,h:170,zone:'nature'},
  {id:'bunny_home',type:'bunny_home',x:1180,y:655,w:250,h:210,zone:'creature'},
  {id:'slide',type:'slide',x:890,y:650,w:230,h:210,zone:'toy'},
  {id:'ball',type:'ball',x:1060,y:830,w:110,h:110,zone:'toy'},
  {id:'drum',type:'drum',x:1350,y:820,w:150,h:130,zone:'toy'}
];

function contains(o,x,y,extra=25){return x>=o.x-o.w/2-extra&&x<=o.x+o.w/2+extra&&y>=o.y-o.h/2-extra&&y<=o.y+o.h/2+extra;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

export class WonderIslandScene {
  constructor(game){this.game=game;this.t=0;this.portalPressed=false;this.rainbowPressed=false;this.parentPressed=false;this.modePressed=false;this.collectionPressed=false;this.placementMode=false;this.drag=null;this.dragOffset={x:0,y:0};this.objects=[];this.pip=null;this.interaction=null;this.interactionT=0;this.celebrateReward=null;}
  enter(data={}){
    this.t=0;this.celebrateReward=data.celebrateReward??null;
    const state=this.game.save?.getProfileState?.();const placements=state?.island?.placements??{};const cosmeticId=state?.pip?.outfit?.cosmeticId;const cosmetic=cosmeticId?this.game.rewards?.get?.(cosmeticId):null;this.pip=new PipController({x:300,y:760,scale:.72,cosmetic});
    const buildings=new Set([...(state?.unlocks?.buildings??[])]),decorations=new Set([...(state?.unlocks?.decorations??[])]),creatures=new Set([...(state?.unlocks?.creatures??[])]);
    this.objects=BASE_OBJECTS.map(o=>({...o,...(placements[o.id]??{})}));
    if(buildings.has('dinosaur_home'))this.objects.push({id:'dinosaur_home',type:'dinosaur_home',x:1460,y:650,w:290,h:220,zone:'creature',...(placements.dinosaur_home??{})});
    if(buildings.has('rainbow_arch'))this.objects.push({id:'rainbow_arch',type:'rainbow_arch',x:500,y:430,w:300,h:230,zone:'decoration',...(placements.rainbow_arch??{})});
    if(decorations.has('shape_garden'))this.objects.push({id:'shape_garden',type:'shape_garden',x:760,y:460,w:300,h:190,zone:'decoration',...(placements.shape_garden??{})});
    if(creatures.has('prism_butterfly'))this.objects.push({id:'prism_butterfly',type:'prism_butterfly',x:1230,y:430,w:180,h:150,zone:'creature',...(placements.prism_butterfly??{})});
    if(buildings.has('parade_float'))this.objects.push({id:'parade_float',type:'parade_float',x:1500,y:790,w:320,h:180,zone:'toy',...(placements.parade_float??{})});
    const known=new Set(this.objects.map(o=>o.id));
    for(const reward of this.game.rewards?.list?.()??[]){
      if(known.has(reward.id)||!reward.island)continue;
      const unlocked=(state?.unlocks?.[reward.type]??[]).includes(reward.id);if(!unlocked)continue;
      this.objects.push({id:reward.id,...reward.island,name:reward.name,...(placements[reward.id]??{})});known.add(reward.id);
    }
    // A new creature friend hatches from its world's egg; tap skips. Other rewards keep the banner only.
    const won=this.celebrateReward?this.game.rewards?.get?.(this.celebrateReward):null;
    this.hatch=won?.type==='creatures'?new HatchSequence({theme:hatchTheme(won.id,worldOfReward(this.game,won.id)),rewardId:won.id}).play():null;
    this.celebrateT=0;
    if(this.celebrateReward){this.pip.react('celebrate',{duration:2});this.game.audio?.playCue?.('reward');}
  }
  update(dt){this.t+=dt;this.pip?.update(dt);this.hatch?.update(dt);
    // The celebration clock waits for the egg pictures; if they never arrive, carry on with the banner only.
    if(this.hatch&&!this.hatch.ready&&this.t>HATCH_ART_WAIT)this.hatch=null;if(!this.hatch||this.hatch.ready)this.celebrateT+=dt;if(this.interactionT>0){this.interactionT=Math.max(0,this.interactionT-dt);if(this.interactionT===0)this.interaction=null;}}

  drawIsland(ctx){
    ctx.fillStyle='#78dcff';ctx.fillRect(0,0,1920,1080);drawCloud(ctx,150,120,1.05,.75);drawCloud(ctx,1380,150,.8,.68);
    ctx.fillStyle='#5fc4eb';ctx.fillRect(0,690,1920,390);ctx.fillStyle='#f6dc83';ctx.beginPath();ctx.ellipse(960,850,820,330,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#76cc61';ctx.beginPath();ctx.ellipse(960,770,720,290,0,0,Math.PI*2);ctx.fill();
    // Pip house
    if(!drawArt(ctx,lookupArt('island','pipHouse'),1585,512,370,340)){ctx.fillStyle='#ffd86e';ctx.beginPath();ctx.roundRect(1450,450,270,225,42);ctx.fill();ctx.fillStyle='#f06c6c';ctx.beginPath();ctx.moveTo(1415,490);ctx.lineTo(1585,350);ctx.lineTo(1755,490);ctx.closePath();ctx.fill();ctx.fillStyle='#8c5a3c';ctx.beginPath();ctx.roundRect(1550,565,70,110,24);ctx.fill();}
    // Adventure portal
    const glow=1+Math.sin(this.t*4)*.05;ctx.save();ctx.translate(960,470);ctx.scale(glow,glow);if(drawArt(ctx,lookupArt('island','portal'),0,0,300,390)){ctx.translate(0,-18);ctx.rotate(this.t*.35);drawArt(ctx,lookupArt('island','portalSwirl'),0,0,150,190,{alpha:.5,blend:'screen'});ctx.restore();return;}ctx.strokeStyle='#7e53e8';ctx.lineWidth=30;ctx.beginPath();ctx.ellipse(0,0,125,165,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#f7d6ff';ctx.lineWidth=13;ctx.beginPath();ctx.ellipse(0,0,92,130,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ad80ff88';ctx.beginPath();ctx.ellipse(0,0,76,116,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  render(ctx){
    this.drawIsland(ctx);for(const o of this.objects)this.drawObject(ctx,o);this.pip?.render(ctx);
    ctx.fillStyle='#5b3b72';ctx.textAlign='center';ctx.font='900 64px ui-rounded,system-ui';ctx.fillText('Wonder Island',960,95);ctx.fillStyle='#fff';ctx.font='700 30px system-ui';ctx.fillText(this.placementMode?'Move your things anywhere on the grass.':'Tap the island toys — or start an adventure!',960,140);
    drawCandyButton(ctx,360,900,430,115,'DINO PICNIC',this.portalPressed,'play');
    drawCandyButton(ctx,810,900,500,115,'EXPLORE WORLDS',this.rainbowPressed,'explore');
    drawCandyButton(ctx,1330,910,390,95,this.placementMode?'DONE MOVING':'MOVE THINGS',this.modePressed,'move');
    if(!drawArt(ctx,lookupArt('ui','parent'),90,85,118,118)){ctx.fillStyle='#ffffffdd';ctx.beginPath();ctx.arc(90,85,54,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b3b72';ctx.font='900 46px system-ui';ctx.fillText('⚙',90,101);}drawCandyButton(ctx,1510,42,330,82,'COLLECTION',this.collectionPressed,'collection');
    if(this.placementMode){ctx.strokeStyle='#fff8';ctx.setLineDash?.([18,16]);ctx.lineWidth=8;ctx.beginPath();ctx.roundRect(300,300,1330,565,70);ctx.stroke();ctx.setLineDash?.([]);}
    if(this.hatch?.ready&&this.celebrateT<CELEBRATE_SECONDS){ctx.save();ctx.globalAlpha=Math.min(1,(CELEBRATE_SECONDS-this.celebrateT)/.5)*.7;ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.ellipse(960,620,260,240,0,0,Math.PI*2);ctx.fill();ctx.restore();this.hatch.render(ctx,960,780,340);}
    if(this.celebrateReward&&this.celebrateT<CELEBRATE_SECONDS){const reward=this.game.rewards?.get?.(this.celebrateReward);ctx.fillStyle='#fffdf0ee';ctx.beginPath();ctx.roundRect(500,180,920,140,60);ctx.fill();ctx.fillStyle='#5a3a73';ctx.font='900 41px system-ui';ctx.fillText(reward?`${reward.name} is now yours!`:'New reward unlocked!',960,265);}
  }

  drawObject(ctx,o){
    const active=this.interaction===o.id&&this.interactionT>0;ctx.save();ctx.translate(o.x,o.y);if(active&&o.type!=='ball')ctx.scale(1+Math.sin(this.t*16)*.04,1+Math.sin(this.t*16)*.04);
    if(this.drawObjectArt(ctx,o,active)){/* real picture drawn */}else
    if(o.type==='tree'){ctx.fillStyle='#8a5938';ctx.beginPath();ctx.roundRect(-28,-20,56,150,20);ctx.fill();ctx.fillStyle='#5dbb5b';for(const [x,y,r] of [[0,-100,95],[-65,-50,70],[70,-45,72]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#e94d55';for(const [x,y] of [[-55,-70],[30,-115],[75,-35]]){ctx.beginPath();ctx.arc(x,y,15,0,Math.PI*2);ctx.fill();}}
    else if(o.type==='pond'){ctx.fillStyle='#4fc0ee';ctx.beginPath();ctx.ellipse(0,0,180,78,0,0,Math.PI*2);ctx.fill();if(active){ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,35+(1-this.interactionT)*80,0,Math.PI*2);ctx.stroke();}}
    else if(o.type==='bunny_home'){ctx.fillStyle='#dd9d5a';ctx.beginPath();ctx.roundRect(-110,-70,220,150,50);ctx.fill();ctx.fillStyle='#8b5a3b';ctx.beginPath();ctx.arc(0,20,55,Math.PI,0);ctx.lineTo(55,80);ctx.lineTo(-55,80);ctx.closePath();ctx.fill();ctx.fillStyle='#f5eee8';ctx.beginPath();ctx.arc(active?25*Math.sin(this.t*12):0,75-active*25,38,0,Math.PI*2);ctx.fill();}
    else if(o.type==='dinosaur_home'){ctx.fillStyle='#bd8050';ctx.beginPath();ctx.roundRect(-135,-75,270,160,55);ctx.fill();ctx.fillStyle='#78cc67';ctx.beginPath();ctx.ellipse(0,-70,160,65,0,0,Math.PI*2);ctx.fill();this.drawBabyRaptor(ctx,active?Math.sin(this.t*8)*14:0,55);}
    else if(o.type==='slide'){ctx.strokeStyle='#6b4cc7';ctx.lineWidth=22;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-70,-90);ctx.lineTo(-70,80);ctx.moveTo(-110,-20);ctx.lineTo(-30,-20);ctx.stroke();ctx.strokeStyle='#f4c94c';ctx.lineWidth=42;ctx.beginPath();ctx.moveTo(-60,-90);ctx.quadraticCurveTo(30,0,90,75);ctx.stroke();}
    else if(o.type==='ball'){const jump=active?Math.abs(Math.sin(this.t*9))*55:0;ctx.translate(0,-jump);ctx.fillStyle='#ef6f79';ctx.beginPath();ctx.arc(0,0,52,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.stroke();}
    else if(o.type==='drum'){ctx.fillStyle='#ee9b48';ctx.beginPath();ctx.roundRect(-65,-48,130,95,25);ctx.fill();ctx.fillStyle='#fff0c9';ctx.beginPath();ctx.ellipse(0,-48,65,25,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7b4e36';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-45,-30);ctx.lineTo(45,40);ctx.moveTo(45,-30);ctx.lineTo(-45,40);ctx.stroke();}
    else if(o.type==='rainbow_arch'){const colors=['#e94d55','#f39a45','#f7cf4f','#66bd62','#4d8ee8','#8b69db'];ctx.lineCap='round';colors.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=18;ctx.beginPath();ctx.arc(0,70,130-i*16,Math.PI,Math.PI*2);ctx.stroke();});if(active){ctx.fillStyle='#fff7d0';for(let i=0;i<6;i++){const a=this.t*3+i*Math.PI/3;ctx.beginPath();ctx.arc(Math.cos(a)*150,Math.sin(a)*55-35,8,0,Math.PI*2);ctx.fill();}}}
    else if(o.type==='shape_garden'){const shapes=[[-90,'#e94d55'],[0,'#4d8ee8'],[90,'#f7cf4f']];for(const [x,c] of shapes){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x-42,-25+(active?Math.sin(this.t*10+x)*14:0),84,84,20);ctx.fill();}ctx.fillStyle='#66bd62';ctx.fillRect(-150,65,300,20);}
    else if(o.type==='prism_butterfly'){const flap=active?Math.sin(this.t*16)*.35:Math.sin(this.t*5)*.15;ctx.rotate(Math.sin(this.t*2)*.08);ctx.fillStyle='#8b69db';ctx.beginPath();ctx.ellipse(-42,0,48,70,-.4-flap,0,Math.PI*2);ctx.ellipse(42,0,48,70,.4+flap,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f7cf4f';ctx.beginPath();ctx.ellipse(0,12,16,58,0,0,Math.PI*2);ctx.fill();}
    else if(o.type==='parade_float'){ctx.fillStyle='#f39a45';ctx.beginPath();ctx.roundRect(-145,-45,290,105,35);ctx.fill();ctx.fillStyle='#8b69db';ctx.beginPath();ctx.roundRect(-100,-110,200,70,30);ctx.fill();for(const x of [-95,95]){ctx.fillStyle='#5a3a73';ctx.beginPath();ctx.arc(x,70,30,0,Math.PI*2);ctx.fill();}if(active){ctx.fillStyle='#fff7d0';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(-110+i*55,-135-Math.abs(Math.sin(this.t*8+i))*35,10,0,Math.PI*2);ctx.fill();}}}
    else if(o.type==='creature_dino')this.drawRewardCreature(ctx,o,'dino',active);
    else if(o.type==='creature_animal')this.drawRewardCreature(ctx,o,'animal',active);
    else if(o.type==='reward_vehicle')this.drawRewardVehicle(ctx,o,active);
    else if(o.type==='reward_badge')this.drawRewardBadge(ctx,o,active);
    if(this.placementMode){ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.setLineDash?.([12,10]);ctx.beginPath();ctx.roundRect(-o.w/2,-o.h/2,o.w,o.h,30);ctx.stroke();ctx.setLineDash?.([]);}ctx.restore();
  }

  // Real picture fitted in the object's own tap box; reward friends keep their name tag.
  drawObjectArt(ctx,o,active){
    const id=lookupArt('island',o.type)??lookupArt('rewards',o.id);if(!id)return false;
    if(o.type==='pond'){ctx.fillStyle='#4fc0ee';ctx.beginPath();ctx.ellipse(0,0,180,78,0,0,Math.PI*2);ctx.fill();} // lily pads sit on the drawn water
    const jump=o.type==='ball'&&active?Math.abs(Math.sin(this.t*9))*55:0;
    if(!drawArt(ctx,id,0,-jump,o.w,o.h))return false;
    if(['creature_dino','creature_animal','reward_badge','reward_vehicle'].includes(o.type)){ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.roundRect(-82,o.h/2-14,164,38,18);ctx.fill();ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='800 18px system-ui';ctx.fillText(String(o.label??o.name??'Friend').replace('Baby ','').slice(0,17),0,o.h/2+12);}
    return true;
  }

  drawBabyRaptor(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#68c66c';ctx.beginPath();ctx.ellipse(0,0,62,40,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(52,-40,38,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(64,-49,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#333';ctx.beginPath();ctx.arc(67,-48,4,0,Math.PI*2);ctx.fill();ctx.restore();}

  rewardColor(value){const map={red:'#e94d55',blue:'#4d8ee8',yellow:'#f7cf4f',green:'#66bd62',orange:'#f39a45',purple:'#8b69db',pink:'#ec7ea2',cream:'#fff3dc'};return map[value]??value??'#8b69db';}
  drawRewardCreature(ctx,o,family,active){const c=this.rewardColor(o.color);const bob=active?Math.abs(Math.sin(this.t*10))*26:Math.sin(this.t*3)*5;ctx.translate(0,-bob);ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,15,72,48,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(family==='dino'?58:0,-38,46,0,Math.PI*2);ctx.fill();if(family==='dino'){ctx.beginPath();ctx.moveTo(-62,12);ctx.lineTo(-125,-20);ctx.lineTo(-60,42);ctx.closePath();ctx.fill();}else{ctx.beginPath();ctx.arc(-34,-73,18,0,Math.PI*2);ctx.arc(34,-73,18,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff';const ex=family==='dino'?72:18;ctx.beginPath();ctx.arc(ex,-46,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3d3348';ctx.beginPath();ctx.arc(ex+2,-45,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.roundRect(-82,70,164,38,18);ctx.fill();ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='800 18px system-ui';ctx.fillText(String(o.label??o.name??'Friend').replace('Baby ',''),0,96);}
  drawRewardBadge(ctx,o,active){const c=this.rewardColor(o.color);ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.roundRect(-82,-65,164,130,38);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=12;ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-10,30+(active?Math.sin(this.t*14)*5:0),0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 17px system-ui';ctx.fillText(String(o.label??o.name??'Reward').slice(0,17),0,48);}
  drawRewardVehicle(ctx,o,active){const c=this.rewardColor(o.color);ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(-85,-38,170,78,25);ctx.fill();ctx.fillStyle='#fff3dc';ctx.beginPath();ctx.roundRect(-35,-85,85,52,18);ctx.fill();ctx.fillStyle='#5a3a73';for(const x of [-55,55]){ctx.beginPath();ctx.arc(x,48+(active?Math.sin(this.t*12+x)*4:0),22,0,Math.PI*2);ctx.fill();}}

  objectAt(x,y){return[...this.objects].reverse().find(o=>contains(o,x,y));}
  async finishDrag(o){o.x=clamp(o.x,350,1580);o.y=clamp(o.y,410,820);this.game.fx?.cue?.('place',{x:o.x,y:o.y});await this.game.save?.saveIslandPlacement?.(o.id,{x:o.x,y:o.y,zone:o.zone});}
  interact(o){this.interaction=o.id;this.interactionT=1.2;if(o.type==='drum')this.game.audio?.playCue?.('count',{count:2});else this.game.audio?.playCue?.('correct');if(o.type==='slide')this.pip?.react('bounce',{duration:1.2});if(o.type==='ball')this.pip?.lookAt(o,.8);}

  handlePointer(e){
    if(this.hatch?.ready&&!this.hatch.finished&&this.celebrateT<CELEBRATE_SECONDS){if(e.type==='up')this.hatch.skip();return;}
    const portal=e.x>=340&&e.x<=800&&e.y>=875&&e.y<=1045;const rainbow=e.x>=790&&e.x<=1330&&e.y>=875&&e.y<=1045;const parent=(e.x-90)**2+(e.y-85)**2<=75**2;const mode=e.x>=1320&&e.x<=1740&&e.y>=885&&e.y<=1045;const collection=e.x>=1490&&e.x<=1860&&e.y>=30&&e.y<=140;
    if(e.type==='down'){
      this.portalPressed=portal;this.rainbowPressed=rainbow;this.parentPressed=parent;this.modePressed=mode;this.collectionPressed=collection;
      if(this.placementMode&&!portal&&!rainbow&&!parent&&!mode&&!collection){const o=this.objectAt(e.x,e.y);if(o){this.drag=o;this.dragOffset.x=e.x-o.x;this.dragOffset.y=e.y-o.y;}}
      return;
    }
    if(e.type==='move'&&this.drag){this.drag.x=e.x-this.dragOffset.x;this.drag.y=e.y-this.dragOffset.y;return;}
    if(e.type==='up'||e.type==='cancel'){
      if(this.drag){const o=this.drag;this.drag=null;if(e.type==='up')this.finishDrag(o);return;}
      const go=e.type==='up'&&this.portalPressed&&portal,goRainbow=e.type==='up'&&this.rainbowPressed&&rainbow,pg=e.type==='up'&&this.parentPressed&&parent,toggle=e.type==='up'&&this.modePressed&&mode,goCollection=e.type==='up'&&this.collectionPressed&&collection;this.portalPressed=this.rainbowPressed=this.parentPressed=this.modePressed=this.collectionPressed=false;
      if(go){this.game.scenes.change('adventure',{adventureId:'rory_dino_picnic'});return;}if(goRainbow){this.game.scenes.change('worldSelect');return;}if(goCollection){this.game.scenes.change('collection');return;}if(pg){this.game.scenes.change('parentGate',{returnTo:'island'});return;}if(toggle){this.placementMode=!this.placementMode;return;}
      if(e.type==='up'&&!this.placementMode){const o=this.objectAt(e.x,e.y);if(o)this.interact(o);}
    }
  }
}
