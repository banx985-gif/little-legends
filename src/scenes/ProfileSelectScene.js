import { artMap, drawArt, lookupArt } from '../core/art.js';
import { drawCloud, drawCandyButton } from '../utils/draw.js';
import { LearningProfile } from '../learning/LearningProfile.js';

const COLORS={purple:'#8b69db',blue:'#4d8ee8',red:'#e95f6a',yellow:'#f2c94c'};

export class ProfileSelectScene {
  constructor(game){this.game=game;this.t=0;this.pressed=null;this.creation=null;this.returnTo=null;}
  enter(data={}){this.t=0;this.pressed=null;this.creation=null;this.returnTo=data.returnTo??null;}
  update(dt){this.t+=dt;}

  profiles(){return this.game.save?.listProfiles?.()??[];}
  cardRect(i){return{x:260+i%2*720,y:330+Math.floor(i/2)*270,w:600,h:210};}

  render(ctx){
    ctx.fillStyle='#7edcff';ctx.fillRect(0,0,1920,1080);drawCloud(ctx,160,140,1.1,.82);drawCloud(ctx,1500,160,.9,.72);
    ctx.fillStyle='#76c95e';ctx.beginPath();ctx.ellipse(960,1090,1200,330,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 78px ui-rounded,system-ui';ctx.fillText('Who is playing?',960,150);
    ctx.fillStyle='#fff';ctx.font='700 34px system-ui';ctx.fillText('Each Little Legend keeps their own learning and island.',960,205);
    if(this.creation){this.renderCreation(ctx);return;}
    const profiles=this.profiles();
    profiles.forEach((p,i)=>this.drawProfileCard(ctx,p,i));
    if(profiles.length<4){const r=this.cardRect(profiles.length);drawCandyButton(ctx,r.x,r.y,r.w,r.h,'+ NEW LEGEND',this.pressed==='new');}
    if(this.returnTo)drawCandyButton(ctx,55,45,220,90,'BACK',false,'back');
  }

  drawProfileCard(ctx,p,i){
    const r=this.cardRect(i),active=p.id===this.game.save.root.activeProfileId;
    ctx.save();ctx.fillStyle=active?'#fff7cf':'#ffffffdd';ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,58);ctx.fill();
    ctx.fillStyle=COLORS[p.favoriteColor]??'#8b69db';ctx.beginPath();ctx.arc(r.x+105,r.y+105,70,0,Math.PI*2);ctx.fill();
    const faces=artMap()?.pipFaces?.cards??[];if(!drawArt(ctx,faces[i%Math.max(1,faces.length)],r.x+105,r.y+108,150,150)){ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 45px system-ui';ctx.fillText((p.name?.[0]??'L').toUpperCase(),r.x+105,r.y+120);} // a different Pip face per child
    ctx.fillStyle='#5a3a73';ctx.textAlign='left';ctx.font='900 44px system-ui';ctx.fillText(p.name,r.x+205,r.y+92,260);ctx.font='650 28px system-ui';ctx.fillStyle='#746a7e';ctx.fillText(`Age ${p.age} • ${p.language}`,r.x+205,r.y+137,260);ctx.fillText(active?'Current profile':'Tap to play',r.x+205,r.y+178,260);
    drawArt(ctx,lookupArt('ui','playButton'),r.x+r.w-72,r.y+r.h/2,104,104);ctx.restore(); // the round play button: tap a card to play
  }

  async beginCreate(){
    let name='Little Legend',age=3,language='en-AU';
    if(typeof window!=='undefined'&&typeof window.prompt==='function'){
      const entered=window.prompt("Parent: enter your child's first name (stored only on this device).",'');
      if(entered===null)return;name=entered.trim()||'Little Legend';
      const a=Number(window.prompt('Approximate age (2–5):','3'));if(Number.isFinite(a))age=Math.max(2,Math.min(5,Math.round(a)));
      const lang=window.prompt('Language code:','en-AU');if(lang)language=lang.trim();
    }
    this.creation={name,age,language,avatar:'pip-star',favoriteColor:'purple',pipHat:'starter-leaf'};
  }

  renderCreation(ctx){
    const c=this.creation;ctx.fillStyle='#ffffffee';ctx.beginPath();ctx.roundRect(330,280,1260,650,75);ctx.fill();ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 58px system-ui';ctx.fillText(`Make ${c.name}'s Legend`,960,365);
    ctx.font='700 32px system-ui';ctx.fillText('Pick a favourite colour',960,430);
    ['purple','blue','red','yellow'].forEach((color,i)=>{const x=570+i*260,y=530;ctx.fillStyle=COLORS[color];ctx.beginPath();ctx.arc(x,y,74,0,Math.PI*2);ctx.fill();if(c.favoriteColor===color){ctx.strokeStyle='#5a3a73';ctx.lineWidth=14;ctx.stroke();}});
    ctx.fillStyle='#746a7e';ctx.font='700 30px system-ui';ctx.fillText('Pip starter hat',960,655);['starter-leaf','star-cap','dino-cap'].forEach((hat,i)=>{const x=650+i*310;ctx.fillStyle=c.pipHat===hat?'#ffd56f':'#e5dff0';ctx.beginPath();ctx.roundRect(x-120,690,240,90,35);ctx.fill();ctx.fillStyle='#5a3a73';ctx.font='800 24px system-ui';ctx.fillText(hat.replace('-',' '),x,745);});
    drawCandyButton(ctx,590,825,340,90,'CANCEL',this.pressed==='cancel');drawCandyButton(ctx,990,825,340,90,'SAVE',this.pressed==='save');
  }

  hitProfile(e){return this.profiles().findIndex((_,i)=>{const r=this.cardRect(i);return e.x>=r.x&&e.x<=r.x+r.w&&e.y>=r.y&&e.y<=r.y+r.h;});}
  async handlePointer(e){
    if(e.type!=='up')return;
    if(this.creation){
      if(e.y>=455&&e.y<=610){const i=Math.round((e.x-570)/260);const colors=['purple','blue','red','yellow'];if(colors[i]&&Math.abs(e.x-(570+i*260))<=100)this.creation.favoriteColor=colors[i];return;}
      if(e.y>=670&&e.y<=800){const i=Math.round((e.x-650)/310);const hats=['starter-leaf','star-cap','dino-cap'];if(hats[i]&&Math.abs(e.x-(650+i*310))<=135)this.creation.pipHat=hats[i];return;}
      if(e.x>=590&&e.x<=930&&e.y>=825&&e.y<=930){this.creation=null;return;}
      if(e.x>=990&&e.x<=1330&&e.y>=825&&e.y<=930){const p=await this.game.save.createProfile(this.creation);this.game.learning=new LearningProfile();this.creation=null;await this.game.activateProfile(p.id);this.game.scenes.change(this.returnTo??'island',this.returnTo==='parentGate'?{skipGate:true,tab:'profiles',returnTo:'island'}:undefined);return;}
      return;
    }
    if(this.returnTo&&e.x>=55&&e.x<=275&&e.y>=45&&e.y<=135){this.game.scenes.change(this.returnTo,this.returnTo==='parentGate'?{skipGate:true,tab:'profiles',returnTo:'island'}:undefined);return;}
    const i=this.hitProfile(e);if(i>=0){const p=this.profiles()[i];await this.game.activateProfile(p.id);this.game.scenes.change(this.returnTo??'island',this.returnTo==='parentGate'?{skipGate:true,tab:'profiles',returnTo:'island'}:undefined);return;}
    if(this.profiles().length<4){const r=this.cardRect(this.profiles().length);if(e.x>=r.x&&e.x<=r.x+r.w&&e.y>=r.y&&e.y<=r.y+r.h)this.beginCreate();}
  }
}
