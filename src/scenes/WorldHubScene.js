import { drawActivityBackground } from '../activities/activityDraw.js';
import { drawCandyButton } from '../utils/draw.js';
import { PipController } from '../characters/PipController.js';

const META={
  dino:{title:'Dino Valley',subtitle:'Count, compare and explore with friendly dinosaurs!',theme:'dino',accent:'#66bd62'},
  rainbow:{title:'Rainbow Village',subtitle:'Colours, shapes and patterns with Octo!',theme:'rainbow',accent:'#8b69db'},
  animal:{title:'Animal Forest',subtitle:'Meet animals and discover how they live!',theme:'forest',accent:'#5ca86c'},
  storybook:{title:"Luna’s Storybook",subtitle:'Listen, learn words and meet the letters!',theme:'storybook',accent:'#5d8fdd'},
  life:{title:"Bella’s Day",subtitle:'Play through helpful everyday routines!',theme:'life',accent:'#ec7ea2'}
};

export class WorldHubScene{
  constructor(game){this.game=game;this.world='dino';this.meta=META.dino;this.missions=[];this.page=0;this.pressed=null;this.pip=null;this.t=0;}
  async enter(data={}){this.world=data.world??'dino';this.meta=META[this.world]??META.dino;this.page=0;this.pressed=null;this.t=0;this.pip=new PipController({x:185,y:850,scale:.64});await this.game.adventureEngine.ensureLoaded(this.game.assets);this.missions=this.game.adventureEngine.list().filter(a=>a.world===this.world);this.game.audio?.startWorldMusic?.(this.world);}
  exit(){this.game.audio?.stopWorldMusic?.();}
  update(dt){this.t+=dt;this.pip?.update(dt);}
  visible(){return this.missions.slice(this.page*6,this.page*6+6);}
  rect(i){return{x:250+(i%2)*760,y:280+Math.floor(i/2)*220,w:660,h:175};}
  hit(x,y){return this.visible().find((m,i)=>{const r=this.rect(i);return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;})??null;}
  controlAt(x,y){if(x>=40&&x<=250&&y>=40&&y<=150)return'back';if(x>=690&&x<=910&&y>=920&&y<=1035&&this.page>0)return'prev';if(x>=1010&&x<=1230&&y>=920&&y<=1035&&(this.page+1)*6<this.missions.length)return'next';return null;}
  handlePointer(e){
    if(e.type==='down'){this.pressed=this.hit(e.x,e.y)?.id??this.controlAt(e.x,e.y);return;}
    if(e.type==='move'&&this.pressed){const now=this.hit(e.x,e.y)?.id??this.controlAt(e.x,e.y);if(now!==this.pressed)this.pressed=null;return;}
    if(e.type==='up'){const chosen=this.pressed;this.pressed=null;if(chosen==='back'){this.game.scenes.change('worldSelect');return;}if(chosen==='prev'){this.page--;return;}if(chosen==='next'){this.page++;return;}if(chosen)this.game.scenes.change('adventure',{adventureId:chosen});}
  }
  render(ctx){
    drawActivityBackground(ctx,this.meta.theme);this.pip?.render(ctx);ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 70px ui-rounded,system-ui';ctx.fillText(this.meta.title,960,112);ctx.fillStyle='#fff';ctx.font='700 29px system-ui';ctx.fillText(this.meta.subtitle,960,162);
    this.visible().forEach((m,i)=>{const r=this.rect(i);const completedList=this.game.save?.getProfileState?.()?.adventure?.completed;const completed=Array.isArray(completedList)&&completedList.includes(m.id);ctx.fillStyle=this.pressed===m.id?'#fff2a8':'#ffffffdf';ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,52);ctx.fill();ctx.fillStyle=this.meta.accent;ctx.beginPath();ctx.arc(r.x+78,r.y+r.h/2,48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 34px system-ui';ctx.fillText(completed?'✓':String(this.page*6+i+1),r.x+78,r.y+r.h/2+12);ctx.fillStyle='#5a3a73';ctx.textAlign='left';ctx.font='900 30px system-ui';ctx.fillText(m.title,r.x+150,r.y+76);ctx.fillStyle='#746a7e';ctx.font='700 23px system-ui';ctx.fillText(completed?'Play again':'Tap to start',r.x+150,r.y+118);ctx.textAlign='center';});
    drawCandyButton(ctx,40,40,210,100,'BACK',this.pressed==='back','back');
    if(this.page>0)drawCandyButton(ctx,690,920,220,95,'PREV',this.pressed==='prev','prev');if((this.page+1)*6<this.missions.length)drawCandyButton(ctx,1010,920,220,95,'NEXT',this.pressed==='next','next');
    if(!this.missions.length){ctx.fillStyle='#fff';ctx.font='800 38px system-ui';ctx.fillText('More Little Missions are coming!',960,560);}
  }
}
