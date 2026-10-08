import { drawActivityBackground } from '../activities/activityDraw.js';
import { drawCandyButton } from '../utils/draw.js';
import { PipController } from '../characters/PipController.js';
import { drawArt, characterArt, lookupArt } from '../core/art.js';

const MISSIONS = [
  { id:'rainbow_missing_rainbow', title:'THE MISSING RAINBOW', icon:'🌈', x:270, y:300, w:620, h:190 },
  { id:'rainbow_octo_paint_party', title:"OCTO'S PAINT PARTY", icon:'🎨', x:1030, y:300, w:620, h:190 },
  { id:'rainbow_shape_house_rescue', title:'SHAPE HOUSE RESCUE', icon:'△', x:270, y:545, w:620, h:190 },
  { id:'rainbow_balloon_sort_mission', title:'BALLOON SORT', icon:'●', x:1030, y:545, w:620, h:190 },
  { id:'rainbow_build_parade_float', title:'BUILD THE PARADE FLOAT', icon:'★', x:650, y:790, w:620, h:180 }
];

export class RainbowVillageScene {
  constructor(game){this.game=game;this.t=0;this.pressed=null;this.pip=null;}
  async enter(){this.t=0;this.pressed=null;this.pip=new PipController({x:190,y:850,scale:.66});await this.game.adventureEngine.ensureLoaded(this.game.assets);}
  update(dt){this.t+=dt;this.pip?.update(dt);}
  missionAt(x,y){return MISSIONS.find(m=>x>=m.x&&x<=m.x+m.w&&y>=m.y&&y<=m.y+m.h)??null;}
  handlePointer(e){
    if(e.type==='down'){this.pressed=this.missionAt(e.x,e.y)?.id??(e.x>=40&&e.x<=250&&e.y>=40&&e.y<=150?'back':null);return;}
    if(e.type==='move'&&this.pressed){const now=this.missionAt(e.x,e.y)?.id??(e.x>=40&&e.x<=250&&e.y>=40&&e.y<=150?'back':null);if(now!==this.pressed)this.pressed=null;return;}
    if(e.type==='up'){const chosen=this.pressed;this.pressed=null;if(chosen==='back'){this.game.scenes.change('island');return;}if(chosen){this.game.scenes.change('adventure',{adventureId:chosen});}}
  }
  drawOcto(ctx){if(drawArt(ctx,characterArt('octo'),1685,150,240,230))return;ctx.save();ctx.translate(1685,150);ctx.fillStyle='#8b69db';ctx.beginPath();ctx.arc(0,0,74,0,Math.PI*2);ctx.fill();for(let i=0;i<5;i++){const a=-.9+i*.45;ctx.strokeStyle='#8b69db';ctx.lineWidth=25;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(Math.cos(a)*30,40);ctx.lineTo(Math.cos(a)*80,110);ctx.stroke();}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-25,-12,13,0,Math.PI*2);ctx.arc(25,-12,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3d3348';ctx.beginPath();ctx.arc(-23,-10,6,0,Math.PI*2);ctx.arc(27,-10,6,0,Math.PI*2);ctx.fill();ctx.restore();}
  render(ctx){
    drawActivityBackground(ctx,'rainbow');this.drawOcto(ctx);this.pip?.render(ctx);
    ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 72px ui-rounded,system-ui';ctx.fillText('Rainbow Village',960,115);ctx.font='700 31px system-ui';ctx.fillStyle='#fff';ctx.fillText('Pick a Little Mission with Octo!',960,165);
    for(const m of MISSIONS){ctx.save();ctx.fillStyle=this.pressed===m.id?'#fff4b8':'#ffffffdd';ctx.beginPath();ctx.roundRect(m.x,m.y,m.w,m.h,55);ctx.fill();if(!drawArt(ctx,lookupArt('rainbowMissions',m.id),m.x+92,m.y+m.h/2,135,135)){ctx.fillStyle='#8b69db';ctx.beginPath();ctx.arc(m.x+92,m.y+m.h/2,58,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 48px system-ui';ctx.fillText(m.icon,m.x+92,m.y+m.h/2+16);}ctx.fillStyle='#5a3a73';ctx.textAlign='left';ctx.font='900 31px system-ui';ctx.fillText(m.title,m.x+175,m.y+82);ctx.fillStyle='#786983';ctx.font='700 25px system-ui';ctx.fillText('Tap to play',m.x+175,m.y+127);ctx.restore();}
    drawCandyButton(ctx,40,40,210,100,'BACK',this.pressed==='back','back');
  }
}
