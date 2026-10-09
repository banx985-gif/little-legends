import { drawActivityBackground } from '../activities/activityDraw.js';
import { drawCandyButton, drawHomeButton, nudgeScale } from '../utils/draw.js';
import { PipController } from '../characters/PipController.js';
import { drawArt, lookupArt, artMap, fxArt } from '../core/art.js';

// Four cards per row; Pip stands below them.
const CARD_W=420,CARD_H=210;
const col=i=>60+i*445;
export const WORLDS=[
  {id:'dino',title:'Dino Valley',icon:'1 2 3',theme:'dino',x:col(0),y:215},
  {id:'rainbow',title:'Rainbow Village',icon:'● △',theme:'rainbow',x:col(1),y:215},
  {id:'space',title:'Space Station',icon:'☾',theme:'space',x:col(2),y:215},
  {id:'animal',title:'Animal Forest',icon:'PAWS',theme:'forest',x:col(3),y:215},
  {id:'jungle',title:'Jungle Jam',icon:'♫',theme:'jungle',x:col(0),y:465},
  {id:'storybook',title:'Luna’s Storybook',icon:'A a',theme:'storybook',x:col(1),y:465},
  {id:'life',title:'Bella’s Day',icon:'★',theme:'life',x:col(2),y:465},
  {id:'town',title:'Busy Town',icon:'BUS',theme:'town',x:col(3),y:465}
];

export class WorldSelectScene{
  constructor(game){this.game=game;this.t=0;this.pressed=null;this.pip=null;this.leaving=null;}
  enter(){this.t=0;this.pressed=null;this.leaving=null;this.pip=new PipController({x:960,y:1010,scale:.6});}
  // Choosing a world: Pip turns and steps into a portal, then the world opens (half a second; quicker with reduced motion).
  // The world a child should tap next (where its next mission is); it bounces after 5 s with no touch and Pip points.
  nextWorld(){const done=this.game.save?.getProfileState?.()?.adventure?.completed??[];return this.game.adventureEngine?.next?.(done)?.world??null;}
  update(dt){this.t+=dt;this.pip?.update(dt);this.idleT=(this.idleT??0)+dt;if(this.idleT>=5&&!this.pointed&&!this.leaving){this.pointed=true;const w=WORLDS.find(x=>x.id===this.nextWorld());if(w)this.pip?.react('point',{duration:1.4,target:{x:w.x+CARD_W/2,y:w.y+CARD_H/2}});}if(this.leaving){this.leaving.t+=dt;if(this.leaving.t>=(globalThis.__LL_REDUCED_MOTION?.15:.5)){const w=this.leaving.world;this.leaving=null;if(w.special)this.game.scenes.change(w.special);else this.game.scenes.change('worldHub',{world:w.id});}}}
  // Every Little Mission in this world finished (the badge on its card).
  worldDone(id){const done=this.game.save?.getProfileState?.()?.adventure?.completed;const list=this.game.adventureEngine?.list?.()?.filter(a=>a.world===id)??[];return Array.isArray(done)&&list.length>0&&list.every(a=>done.includes(a.id));}
  cardAt(x,y){return WORLDS.find(w=>x>=w.x&&x<=w.x+CARD_W&&y>=w.y&&y<=w.y+CARD_H)??null;}
  handlePointer(e){
    if(this.leaving)return;
    if(e.type==='down'){this.idleT=0;this.pointed=false;}
    if(e.type==='down'){this.pressed=this.cardAt(e.x,e.y)?.id??(e.x>=40&&e.x<=250&&e.y>=40&&e.y<=150?'back':null);return;}
    if(e.type==='move'&&this.pressed){const now=this.cardAt(e.x,e.y)?.id??(e.x>=40&&e.x<=250&&e.y>=40&&e.y<=150?'back':null);if(now!==this.pressed)this.pressed=null;return;}
    if(e.type==='up'){
      const chosen=this.pressed;this.pressed=null;if(chosen==='back'){this.game.scenes.change('island');return;}
      const world=WORLDS.find(w=>w.id===chosen);if(!world)return;
      this.leaving={world,t:0};this.game.audio?.playCue?.('correct');
    }
  }
  render(ctx){
    drawActivityBackground(ctx,'meadow');this.renderPip(ctx);
    ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 72px ui-rounded,system-ui';ctx.fillText('Explore Magic World',960,120);
    ctx.fillStyle='#fff';ctx.font='700 31px system-ui';ctx.fillText('Pick a place to play and learn!',960,172);
    const nextWorld=this.nextWorld();
    for(const w of WORLDS){
      ctx.save();if(w.id===nextWorld){const k=nudgeScale(this.t,this.idleT??0);ctx.translate(w.x+CARD_W/2,w.y+CARD_H/2);ctx.scale(k,k);ctx.translate(-w.x-CARD_W/2,-w.y-CARD_H/2);}ctx.fillStyle=this.pressed===w.id?'#fff2a8':'#ffffffdf';ctx.beginPath();ctx.roundRect(w.x,w.y,CARD_W,CARD_H,58);ctx.fill();
      const colours={dino:'#67bd68',rainbow:'#8b69db',animal:'#5fae6c',jungle:'#ee9b48',storybook:'#5d8fdd',life:'#ec7ea2',space:'#4b5bb8',town:'#e9874a'};if(!drawArt(ctx,lookupArt('worlds',w.id),w.x+90,w.y+CARD_H/2,128,128)){ctx.fillStyle=colours[w.id]??'#8b69db';ctx.beginPath();ctx.arc(w.x+90,w.y+CARD_H/2,60,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='900 34px system-ui';ctx.fillText(w.icon,w.x+90,w.y+CARD_H/2+12);}ctx.fillStyle='#5a3a73';ctx.font='900 29px system-ui';ctx.fillText(w.title,w.x+290,w.y+92,250);ctx.fillStyle='#756a7f';ctx.font='700 23px system-ui';ctx.fillText(w.id==='jungle'?'Missions + music jam':'Little Missions',w.x+290,w.y+140,250);if(this.worldDone(w.id))drawArt(ctx,lookupArt('ui','worldBadge'),w.x+CARD_W-34,w.y+30,82,82);ctx.restore();
    }
    drawHomeButton(ctx,this.pressed==='back');
  }
  // While leaving: the portal opens under Pip and he is seen from behind, walking in.
  renderPip(ctx){
    if(!this.leaving){this.pip?.render(ctx);return;}
    const p=Math.min(1,this.leaving.t/.5),portal=fxArt('portalOpen');
    drawArt(ctx,portal?.id,960,1000,360*(.5+p*.5),150*(.5+p*.5),{alpha:.9,blend:portal?.blend});
    if(!drawArt(ctx,artMap()?.pip?.poses?.back?.id,960,1028-p*30,240,240*(1-p*.25),{anchor:'bottom',alpha:1-p*.6}))this.pip?.render(ctx);
  }
}
