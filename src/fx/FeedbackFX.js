import { drawArt, fxArt } from '../core/art.js';
function rand(a,b){return a+Math.random()*(b-a);}
const COLOURS=['#fff2a8','#67d7d0','#ffd56f','#ffffff','#8b69db'];
export class FeedbackFX {
  constructor(){this.particles=[];this.rings=[];this.bursts=[];}
  budget(){const scale=Math.max(.25,Math.min(1,Number(globalThis.__LL_PARTICLE_SCALE)||1));return Math.max(6,Math.round(40*scale));}
  cue(name,{x=960,y=590,count=0}={}){
    if(globalThis.__LL_REDUCED_MOTION&&['correct','drop'].includes(name))return;
    if(name==='incorrect'){this.rings.push({x,y,t:0,d:.32,color:'#ff8f92',r:35,art:'ring_incorrect'});return;}
    if(name==='drop'){this.rings.push({x,y,t:0,d:.3,color:'#7ee2d6',r:28,art:'ring_drop'});return;}
    if(!['correct','reward','complete','count'].includes(name))return;
    const amount=name==='reward'||name==='complete'?14:name==='count'?4:8;
    const room=Math.max(0,this.budget()-this.particles.length);
    for(let i=0;i<Math.min(amount,room);i++){
      const a=rand(-Math.PI*.92,-Math.PI*.08),speed=rand(70,190)*(name==='reward'?1.2:1);
      this.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,t:0,d:rand(.45,.8),size:rand(7,15),rot:rand(0,Math.PI),spin:rand(-5,5),color:COLOURS[i%COLOURS.length]});
    }
    if(name==='correct'||name==='count')this.rings.push({x,y,t:0,d:.45,color:'#fff2a8',r:42+(Number(count)||0)*2,art:'ring_correct'});
    if((Number(globalThis.__LL_EFFECT_SCALE)||1)>=.4){if(name==='correct')this.bursts.push({x,y,t:0,d:.55,art:'correct',size:260});if(name==='reward'||name==='complete')this.bursts.push({x,y,t:0,d:.8,art:'reward',size:420});if(name==='complete')this.bursts.push({x,y:y-60,t:0,d:1,art:'complete',size:520});}
  }
  update(dt){for(const p of this.particles){p.t+=dt;p.vy+=210*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.spin*dt;}this.particles=this.particles.filter(p=>p.t<p.d);for(const r of this.rings)r.t+=dt;this.rings=this.rings.filter(r=>r.t<r.d);for(const b of this.bursts)b.t+=dt;this.bursts=this.bursts.filter(b=>b.t<b.d);}
  render(ctx){ctx.save();for(const b of this.bursts){const p=b.t/b.d,fx=fxArt(b.art),s=b.size*(.6+.5*Math.sin(Math.min(1,p*1.6)*Math.PI/2));drawArt(ctx,fx?.id,b.x,b.y,s,s,{alpha:1-p*p,blend:fx?.blend});}for(const r of this.rings){const p=r.t/r.d,fx=fxArt(r.art),d=(r.r+p*70)*2.3;if(drawArt(ctx,fx?.id,r.x,r.y,d,d,{alpha:(1-p)*.9,blend:fx?.blend}))continue;ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle=r.color;ctx.lineWidth=8*(1-p)+2;ctx.beginPath();ctx.arc(r.x,r.y,r.r+p*70,0,Math.PI*2);ctx.stroke();}for(const p of this.particles){const q=p.t/p.d;ctx.save();ctx.globalAlpha=1-q;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rad=i%2===0?p.size:p.size*.4;const x=Math.cos(a)*rad,y=Math.sin(a)*rad;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();}
  clear(){this.particles.length=0;this.rings.length=0;this.bursts.length=0;}
}
