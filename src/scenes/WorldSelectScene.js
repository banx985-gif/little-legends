import { drawActivityBackground } from '../activities/activityDraw.js';
import { drawCandyButton } from '../utils/draw.js';
import { PipController } from '../characters/PipController.js';
import { drawArt, lookupArt } from '../core/art.js';

const WORLDS=[
  {id:'dino',title:'Dino Valley',icon:'1 2 3',theme:'dino',x:250,y:285},
  {id:'rainbow',title:'Rainbow Village',icon:'● △',theme:'rainbow',x:765,y:285},
  {id:'animal',title:'Animal Forest',icon:'PAWS',theme:'forest',x:1280,y:285},
  {id:'jungle',title:'Jungle Jam',icon:'♫',theme:'jungle',x:250,y:590,special:'jungleJam'},
  {id:'storybook',title:'Luna’s Storybook',icon:'A a',theme:'storybook',x:765,y:590},
  {id:'life',title:'Bella’s Day',icon:'★',theme:'life',x:1280,y:590}
];

export class WorldSelectScene{
  constructor(game){this.game=game;this.t=0;this.pressed=null;this.pip=null;}
  enter(){this.t=0;this.pressed=null;this.pip=new PipController({x:185,y:850,scale:.65});}
  update(dt){this.t+=dt;this.pip?.update(dt);}
  cardAt(x,y){return WORLDS.find(w=>x>=w.x&&x<=w.x+390&&y>=w.y&&y<=w.y+235)??null;}
  handlePointer(e){
    if(e.type==='down'){this.pressed=this.cardAt(e.x,e.y)?.id??(e.x>=40&&e.x<=250&&e.y>=40&&e.y<=150?'back':null);return;}
    if(e.type==='move'&&this.pressed){const now=this.cardAt(e.x,e.y)?.id??(e.x>=40&&e.x<=250&&e.y>=40&&e.y<=150?'back':null);if(now!==this.pressed)this.pressed=null;return;}
    if(e.type==='up'){
      const chosen=this.pressed;this.pressed=null;if(chosen==='back'){this.game.scenes.change('island');return;}
      const world=WORLDS.find(w=>w.id===chosen);if(!world)return;
      if(world.special)this.game.scenes.change(world.special);else this.game.scenes.change('worldHub',{world:world.id});
    }
  }
  render(ctx){
    drawActivityBackground(ctx,'meadow');this.pip?.render(ctx);
    ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 72px ui-rounded,system-ui';ctx.fillText('Explore Magic World',960,120);
    ctx.fillStyle='#fff';ctx.font='700 31px system-ui';ctx.fillText('Pick a place to play and learn!',960,172);
    for(const w of WORLDS){
      ctx.save();ctx.fillStyle=this.pressed===w.id?'#fff2a8':'#ffffffdf';ctx.beginPath();ctx.roundRect(w.x,w.y,390,235,58);ctx.fill();
      const colours={dino:'#67bd68',rainbow:'#8b69db',animal:'#5fae6c',jungle:'#ee9b48',storybook:'#5d8fdd',life:'#ec7ea2'};if(!drawArt(ctx,lookupArt('worlds',w.id),w.x+95,w.y+98,132,132)){ctx.fillStyle=colours[w.id]??'#8b69db';ctx.beginPath();ctx.arc(w.x+95,w.y+95,62,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='900 36px system-ui';ctx.fillText(w.icon,w.x+95,w.y+108);}ctx.fillStyle='#5a3a73';ctx.font='900 31px system-ui';ctx.fillText(w.title,w.x+230,w.y+82);ctx.fillStyle='#756a7f';ctx.font='700 24px system-ui';ctx.fillText(w.id==='jungle'?'Free music + games':'Little Missions',w.x+230,w.y+132);ctx.restore();
    }
    drawCandyButton(ctx,40,40,210,100,'BACK',this.pressed==='back','back');
  }
}
