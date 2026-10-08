import { drawCloud } from '../utils/draw.js';
import { art, artMap, drawArt, tokenArt, characterArt, fxArt, ambientArt, backgroundArt, thingArt } from '../core/art.js';

export const PALETTE = Object.freeze({
  red: '#e94d55',
  blue: '#4d8ee8',
  yellow: '#f7cf4f',
  green: '#66bd62',
  orange: '#f39a45',
  purple: '#8b69db',
  teal: '#54c7bf',
  pink: '#ec7ea2',
  cream: '#fff3dc'
});

export function resolveColor(value, fallback = '#8b69db') {
  return PALETTE[value] ?? value ?? fallback;
}

export function drawActivityBackground(ctx, theme = 'meadow') {
  const meadowArt = art('art.meadow_picnic_clearing') ?? globalThis.__LL_ASSETS?.get?.('meadow-picnic-bg');
  if (theme === 'meadow' && meadowArt?.width) { ctx.drawImage(meadowArt, 0, 0, 1920, 1080); return; }
  const scene = art(backgroundArt(theme));
  if (scene && typeof ctx.drawImage === 'function') { ctx.drawImage(scene, 0, 0, 1920, 1080); return; }
  if (String(theme).startsWith('space')) { drawSpaceBackdrop(ctx); return; }
  if (String(theme).startsWith('town')) { drawTownBackdrop(ctx); return; }
  const skyByTheme = { dino:'#8dddf4', forest:'#9ee4cf', rainbow:'#91dcff', storybook:'#a8d8ff', life:'#9fe3df', jungle:'#89d9c5', music:'#89d9c5' };
  const grassByTheme = { dino:'#88c764', forest:'#6ac070', rainbow:'#8fd06b', storybook:'#78c878', life:'#83cc70', jungle:'#5fbd69', music:'#5fbd69' };
  const sky = skyByTheme[theme] ?? '#82ddff';
  const grass = grassByTheme[theme] ?? '#87ce63';
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1920, 1080);
  drawCloud(ctx, 110, 115, 0.82, 0.72);
  drawCloud(ctx, 1480, 115, 0.7, 0.62);
  ctx.fillStyle = grass;
  ctx.beginPath(); ctx.ellipse(960, 1030, 1260, 360, 0, 0, Math.PI * 2); ctx.fill();
  if (theme === 'rainbow') {
    const colors = ['#e94d55','#f39a45','#f7cf4f','#66bd62','#4d8ee8','#8b69db'];
    ctx.save(); ctx.lineCap = 'round';
    colors.forEach((color,i)=>{ ctx.strokeStyle=color; ctx.lineWidth=22; ctx.beginPath(); ctx.arc(1660,330,170-i*20,Math.PI,Math.PI*2); ctx.stroke(); });
    ctx.restore();
  }
}

// Space Station placeholder until the scene picture arrives: deep blue sky, a few fixed stars, a grey moon floor.
function drawSpaceBackdrop(ctx) {
  ctx.fillStyle = '#25316e'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = '#ffffffaa';
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc((i * 431) % 1920, (i * 197) % 620, 3 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#c9cfe6'; ctx.beginPath(); ctx.ellipse(960, 1060, 1300, 400, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b3bad8'; ctx.beginPath(); ctx.ellipse(960, 820, 420, 90, 0, 0, Math.PI * 2); ctx.fill();
}

// Busy Town (no town scene picture yet): drawn sky and pavement, the real building pictures along the street
// (data/art_map.json "townStreet"), and a road. No characters are drawn.
function drawTownBackdrop(ctx) {
  ctx.fillStyle = '#8fdcff'; ctx.fillRect(0, 0, 1920, 1080);
  drawCloud(ctx, 160, 120, 0.75, 0.7); drawCloud(ctx, 1520, 150, 0.65, 0.6);
  ctx.fillStyle = '#86cf6c'; ctx.fillRect(0, 430, 1920, 120);
  for (const b of artMap()?.townStreet ?? []) drawArt(ctx, b.id, b.x, 520, b.w, b.h ?? b.w, { anchor: 'bottom' });
  ctx.fillStyle = '#e9e1d2'; ctx.fillRect(0, 510, 1920, 70);
  ctx.fillStyle = '#6d7480'; ctx.fillRect(0, 580, 1920, 500);
  ctx.fillStyle = '#f4f1e8';
  for (let x = 40; x < 1920; x += 220) ctx.fillRect(x, 815, 120, 16);
}

// Soft weather/nature magic over an activity (data/art_map.json "ambient"): light blend, slow drift, no flashing.
export function drawActivityAmbient(ctx, definition, t = 0) {
  const id = ambientArt(definition);
  if (!id) return false;
  const calm = Boolean(globalThis.__LL_REDUCED_MOTION), alpha = 0.5 + (calm ? 0 : Math.sin(t * 0.8) * 0.12);
  if (id.endsWith('sun_rays')) return drawArt(ctx, id, 300, 330, 640, 640, { alpha, blend: 'screen' });
  const x = calm ? 1350 : 200 + ((t * 40) % 1520);
  return drawArt(ctx, id, x, 360, 560, 560, { alpha, blend: 'screen' });
}

export function drawInstructionPanel(ctx, title, subtitle = '') {
  ctx.fillStyle = '#ffffffee';
  ctx.beginPath(); ctx.roundRect(400, 55, 1120, 155, 64); ctx.fill();
  ctx.fillStyle = '#5a3a73';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const uiScale=Math.max(1,Math.min(1.3,Number(globalThis.__LL_UI_SCALE)||1));
  ctx.font = `900 ${Math.round(54*uiScale)}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(title, 960, 126);
  if (subtitle) {
    ctx.fillStyle = '#71657e';
    ctx.font = `700 ${Math.round(30*uiScale)}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(subtitle, 960, 174);
  }
}

// colour: see tokenArt() in core/art.js. Activities where colour is never the answer pass 'loose' or 'uniform'.
// plain: picture only (no word card), for small counting groups.
export function drawToken(ctx, token, { scale = 1, alpha = 1, highlight = false, wobble = 0, colour = 'strict', noArt = false, plain = false } = {}) {
  const kind = token.kind ?? 'circle';
  const color = resolveColor(token.color, '#e94d55');
  const size = (token.size ?? 150) * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(token.x, token.y);
  if (wobble) ctx.rotate(wobble * (globalThis.__LL_REDUCED_MOTION ? 0.18 : 1));

  if (highlight) {
    const glow = fxArt('hintGlow');
    if (!drawArt(ctx, glow?.id, 0, 0, size * 1.55, size * 1.55, { alpha: 0.85, blend: glow?.blend })) {
      ctx.globalAlpha = alpha * 0.38;
      ctx.fillStyle = '#fff36b';
      ctx.beginPath(); ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha;
    }
  }

  const picture = noArt ? null : tokenArt(token, { colour });
  if (picture && art(picture.id)) {
    // Props on busy scene pictures sit on a soft light pool so they stand out.
    if (kind === 'thing' && !plain) { ctx.fillStyle = '#ffffff5c'; ctx.beginPath(); ctx.ellipse(0, size * 0.04, size * 0.5, size * 0.47, 0, 0, Math.PI * 2); ctx.fill(); }
    drawTokenArt(ctx, token, plain ? { ...picture, card: false, fit: 0.9 } : picture, size, color);
    if (globalThis.__LL_COLOR_SYMBOLS && PALETTE[token.color] && picture.colour === token.color) drawColorAccessibilityMark(ctx, token.color, size);
    ctx.restore();
    return;
  }

  if (kind === 'dinosaur') drawDinosaur(ctx, size, color);
  else if (kind === 'egg') drawEgg(ctx, size, color);
  else if (kind === 'apple') drawApple(ctx, size, color);
  else if (kind === 'carrot') drawCarrot(ctx, size, color);
  else if (kind === 'berry') drawBerry(ctx, size, color);
  else if (kind === 'banana') drawBanana(ctx, size, color);
  else if (kind === 'strawberry') drawStrawberry(ctx, size, color);
  else if (kind === 'orange') drawOrange(ctx, size, color);
  else if (kind === 'numeral') drawSymbolToken(ctx, String(token.value ?? token.label ?? '?'), size, color, { fontScale: 0.62 });
  else if (kind === 'letter') drawSymbolToken(ctx, String(token.value ?? token.label ?? '?'), size, color, { fontScale: 0.58 });
  else if (kind === 'animal') drawAnimalToken(ctx, token, size, color);
  else if (kind === 'thing') drawSymbolToken(ctx, String(token.label ?? token.thing ?? '★'), size, color, { fontScale: 0.16 });
  else if (['clothing','toy','feeling','routine','instrument','word','object'].includes(kind)) drawSymbolToken(ctx, String(token.symbol ?? token.label ?? token.value ?? '★'), size, color, { fontScale: 0.38, sublabel: token.symbol ? token.label : '' });
  else { drawShape(ctx, kind, size, color); if (token.label) drawTokenLabel(ctx, token.label, size); }
  if (globalThis.__LL_COLOR_SYMBOLS && PALETTE[token.color]) drawColorAccessibilityMark(ctx, token.color, size);
  ctx.restore();
}


// Real picture centred where the placeholder was, never stretched. Labels and card frames stay as before.
function drawTokenArt(ctx, token, picture, size, color) {
  const box = size * picture.fit;
  if (picture.card) {
    const r = size * 0.43;
    ctx.fillStyle = '#fffdf1';
    ctx.beginPath(); ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.28); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(7, size * 0.055); ctx.stroke();
    drawArt(ctx, picture.id, 0, -size * 0.07, box, box * 0.86);
    const label = token.label ?? token.symbol;
    if (label) { ctx.fillStyle = '#5a3a73'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 ${Math.max(18, Math.round(size * 0.13))}px ui-rounded, system-ui, sans-serif`; ctx.fillText(String(label).slice(0, 12), 0, size * 0.32); }
    return;
  }
  if (picture.labelled) { drawArt(ctx, picture.id, 0, -size * 0.06, box, box); if (token.label) drawTokenLabel(ctx, token.label, size); return; }
  drawArt(ctx, picture.id, 0, 0, box, box);
  if (token.label && !['letter','numeral'].includes(token.kind) && !picture.card) drawTokenLabel(ctx, token.label, size);
}

function drawColorAccessibilityMark(ctx, colour, size) {
  const marks={red:'●',blue:'■',yellow:'▲',green:'★',orange:'◆',purple:'✚'};const mark=marks[colour];if(!mark)return;
  ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.arc(size*.31,size*.30,Math.max(12,size*.10),0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${Math.max(16,Math.round(size*.105))}px system-ui`;ctx.fillText(mark,size*.31,size*.305);
}

function drawDinosaur(ctx, size, color) {
  const s=size;
  ctx.fillStyle=color || '#74c96c';
  ctx.beginPath(); ctx.ellipse(-s*0.04,s*0.04,s*0.34,s*0.23,-0.08,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.24,-s*0.18,s*0.19,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s*0.28,s*0.04); ctx.lineTo(-s*0.54,-s*0.02); ctx.lineTo(-s*0.30,s*0.16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=color || '#74c96c'; ctx.lineWidth=s*0.12; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-s*0.16,s*0.18); ctx.lineTo(-s*0.20,s*0.42); ctx.moveTo(s*0.10,s*0.18); ctx.lineTo(s*0.12,s*0.42); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*0.29,-s*0.22,s*0.055,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#342e40'; ctx.beginPath(); ctx.arc(s*0.31,-s*0.215,s*0.025,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#4e4056'; ctx.lineWidth=Math.max(4,s*0.035); ctx.beginPath(); ctx.arc(s*0.29,-s*0.12,s*0.08,0.10*Math.PI,0.88*Math.PI); ctx.stroke();
  ctx.fillStyle='#fff4a8';
  for (const x of [-0.14,0.02,0.18]) { ctx.beginPath(); ctx.moveTo(s*x,-s*0.16); ctx.lineTo(s*(x+0.08),-s*0.38); ctx.lineTo(s*(x+0.14),-s*0.14); ctx.closePath(); ctx.fill(); }
}

function drawEgg(ctx, size, color) {
  ctx.fillStyle=color || '#fff2c7';
  ctx.beginPath(); ctx.ellipse(0,0,size*0.30,size*0.40,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8b69db';
  for (const [x,y,r] of [[-0.11,-0.08,0.06],[0.10,0.05,0.05],[-0.03,0.19,0.045]]) { ctx.beginPath(); ctx.arc(size*x,size*y,size*r,0,Math.PI*2); ctx.fill(); }
}

function drawApple(ctx, size, color) {
  const r = size * 0.31;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(-r * 0.48, 0, r, 0, Math.PI * 2); ctx.arc(r * 0.48, 0, r, 0, Math.PI * 2); ctx.arc(0, r * 0.52, r * 1.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff8a86'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.22, r * 0.22, r * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#70432b'; ctx.lineWidth = Math.max(6, size * 0.08); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.09, -r * 1.48); ctx.stroke();
  ctx.fillStyle = '#5db85a'; ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 1.1, r * 0.43, r * 0.22, -0.35, 0, Math.PI * 2); ctx.fill();
}

function drawCarrot(ctx, size, color) {
  ctx.fillStyle = color === '#e94d55' ? '#f08a3f' : color;
  ctx.beginPath(); ctx.moveTo(0, size * 0.42); ctx.quadraticCurveTo(-size * 0.3, -size * 0.06, -size * 0.18, -size * 0.32); ctx.quadraticCurveTo(0, -size * 0.45, size * 0.18, -size * 0.32); ctx.quadraticCurveTo(size * 0.3, -size * 0.06, 0, size * 0.42); ctx.fill();
  ctx.fillStyle = '#62b45d';
  for (const a of [-0.42, 0, 0.42]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -size * 0.47, size * 0.08, size * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}

function drawBerry(ctx, size, color) {
  ctx.fillStyle = color;
  const r = size * 0.22;
  for (const [x,y] of [[-r,-r*0.2],[r,-r*0.2],[0,r*0.6]]) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
  ctx.fillStyle='#5fb35d'; ctx.beginPath(); ctx.ellipse(0,-r*1.35,r*0.7,r*0.25,0,0,Math.PI*2); ctx.fill();
}

function drawBanana(ctx, size, color) {
  ctx.strokeStyle = color === '#e94d55' ? '#f4cf45' : color;
  ctx.lineWidth = size * 0.22; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(-size*0.06,-size*0.02,size*0.34,-0.1*Math.PI,0.72*Math.PI); ctx.stroke();
}

function drawStrawberry(ctx, size, color) {
  ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,size*0.42); ctx.bezierCurveTo(-size*0.42,size*0.08,-size*0.34,-size*0.3,0,-size*0.27); ctx.bezierCurveTo(size*0.34,-size*0.3,size*0.42,size*0.08,0,size*0.42); ctx.fill();
  ctx.fillStyle='#5fb35d'; ctx.beginPath(); ctx.moveTo(-size*0.22,-size*0.25); ctx.lineTo(0,-size*0.46); ctx.lineTo(size*0.22,-size*0.25); ctx.closePath(); ctx.fill();
}

function drawOrange(ctx, size, color) {
  ctx.fillStyle = color === '#e94d55' ? '#f39a45' : color;
  ctx.beginPath(); ctx.arc(0,0,size*0.36,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#5fb35d'; ctx.beginPath(); ctx.ellipse(size*0.12,-size*0.36,size*0.18,size*0.08,-0.4,0,Math.PI*2); ctx.fill();
}

function drawShape(ctx, kind, size, color) {
  const r = size * 0.38;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (kind === 'square') ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.2);
  else if (kind === 'rectangle') ctx.roundRect(-r * 1.2, -r * 0.72, r * 2.4, r * 1.44, r * 0.2);
  else if (kind === 'triangle') { ctx.moveTo(0,-r*1.05); ctx.lineTo(r,r*0.8); ctx.lineTo(-r,r*0.8); ctx.closePath(); }
  else if (kind === 'star') drawStarPath(ctx, 0, 0, r, r * 0.48);
  else if (kind === 'heart') { ctx.moveTo(0,r); ctx.bezierCurveTo(-r*1.25,r*0.2,-r*0.95,-r*0.8,-r*0.35,-r*0.7); ctx.bezierCurveTo(0,-r*0.62,0,-r*0.25,0,-r*0.18); ctx.bezierCurveTo(0,-r*0.25,0,-r*0.62,r*0.35,-r*0.7); ctx.bezierCurveTo(r*0.95,-r*0.8,r*1.25,r*0.2,0,r); }
  else ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();
}

function drawSymbolToken(ctx, text, size, color, { fontScale = 0.55, sublabel = '' } = {}) {
  const r = size * 0.43;
  ctx.fillStyle = '#fffdf1';
  ctx.beginPath(); ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.28); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(7, size * 0.055); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(34, Math.round(size * fontScale))}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(text, 0, sublabel ? -size * 0.05 : 0);
  if (sublabel) {
    ctx.fillStyle = '#5a3a73'; ctx.font = `800 ${Math.max(18, Math.round(size * 0.16))}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(String(sublabel).slice(0, 12), 0, size * 0.29);
  }
}

function drawAnimalToken(ctx, token, size, color) {
  const r = size * 0.34;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, -size * 0.03, r, 0, Math.PI * 2); ctx.fill();
  const type = String(token.animalType ?? token.value ?? token.label ?? '').toLowerCase();
  if (['rabbit','bunny','cat','fox'].includes(type)) {
    ctx.beginPath(); ctx.ellipse(-r * 0.55, -r * 0.95, r * 0.25, r * 0.55, -0.12, 0, Math.PI * 2); ctx.ellipse(r * 0.55, -r * 0.95, r * 0.25, r * 0.55, 0.12, 0, Math.PI * 2); ctx.fill();
  } else if (['bear','cow','dog','lion'].includes(type)) {
    ctx.beginPath(); ctx.arc(-r * 0.73, -r * 0.6, r * 0.28, 0, Math.PI * 2); ctx.arc(r * 0.73, -r * 0.6, r * 0.28, 0, Math.PI * 2); ctx.fill();
  } else if (['bird','owl','duck','eagle'].includes(type)) {
    ctx.fillStyle = '#f7cf4f'; ctx.beginPath(); ctx.moveTo(r * .78, -r * .05); ctx.lineTo(r * 1.15, r * .1); ctx.lineTo(r * .78, r * .27); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * .34, -r * .18, r * .16, 0, Math.PI * 2); ctx.arc(r * .34, -r * .18, r * .16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3d3348'; ctx.beginPath(); ctx.arc(-r * .31, -r * .16, r * .065, 0, Math.PI * 2); ctx.arc(r * .37, -r * .16, r * .065, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a3a73'; ctx.lineWidth = Math.max(4, size * .035); ctx.beginPath(); ctx.arc(0, r * .08, r * .28, .12 * Math.PI, .88 * Math.PI); ctx.stroke();
  if (token.label) drawTokenLabel(ctx, token.label, size);
}

function drawTokenLabel(ctx, label, size) {
  ctx.fillStyle = '#5a3a73'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.max(18, Math.round(size * .15))}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(String(label).slice(0, 14), 0, size * .47);
}

function drawStarPath(ctx, x, y, outer, inner) {
  for (let i=0;i<10;i++) {
    const rr=i%2===0?outer:inner, a=-Math.PI/2+i*Math.PI/5;
    const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath();
}

// artId: optional empty container picture (basket, nest, plate); the drawn basket otherwise.
export function drawBasket(ctx, target, count = 0, active = false, artId = null) {
  const x=target.x, y=target.y, w=target.w??360, h=target.h??260;
  ctx.save();
  if(active){ctx.fillStyle='#fff36b55';ctx.beginPath();ctx.ellipse(x,y,w*0.68,h*0.68,0,0,Math.PI*2);ctx.fill();}
  const lift=artMap()?.countTargets?.lift?.[artId]??0; // flat plates sit higher so food lands on them
  if(!drawArt(ctx,artId,x,y+h*0.05-lift,w*1.05,h*1.05)){
  ctx.strokeStyle='#9b5c28'; ctx.lineWidth=24;
  ctx.beginPath(); ctx.arc(x, y-h*0.24, w*0.34, Math.PI,0); ctx.stroke();
  ctx.fillStyle='#c98035'; ctx.beginPath(); ctx.roundRect(x-w/2,y-h*0.2,w,h*0.72,60); ctx.fill();
  ctx.strokeStyle='#9b5c28'; ctx.lineWidth=10;
  for(let yy=y-h*0.03;yy<y+h*0.42;yy+=48){ctx.beginPath();ctx.moveTo(x-w*0.42,yy);ctx.lineTo(x+w*0.42,yy);ctx.stroke();}
  }
  if(count>0){ctx.fillStyle='#fff7d0';ctx.beginPath();ctx.arc(x+w*0.42,y-h*0.38,48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='900 34px system-ui';ctx.fillText(String(count),x+w*0.42,y-h*0.28);}
  ctx.restore();
}

export function drawBin(ctx, target, active = false) {
  const w=target.w??300,h=target.h??250;
  ctx.save();
  // Ghost target (building activities): just the part's own picture, faded, where it belongs. No frame.
  const ghost=target.ghost&&target.thing?thingArt(target.thing):null;
  if(ghost&&art(ghost.id)){
    // A soft light pool under the faded part keeps it easy to see on busy scene pictures.
    ctx.fillStyle=active?'#fff36b88':'#ffffff66';ctx.beginPath();ctx.ellipse(target.x,target.y,w*0.58,h*0.58,0,0,Math.PI*2);ctx.fill();
    drawArt(ctx,ghost.id,target.x,target.y,w,h,{alpha:0.5});
    ctx.restore();return;
  }
  ctx.fillStyle=active?'#fff36b66':'#ffffff55';
  ctx.beginPath();ctx.roundRect(target.x-w/2,target.y-h/2,w,h,48);ctx.fill();
  ctx.strokeStyle=resolveColor(target.color,'#8062d1');ctx.lineWidth=active?20:14;
  ctx.beginPath();ctx.roundRect(target.x-w/2,target.y-h/2,w,h,48);ctx.stroke();
  // A target can show a picture (target.thing): solid for a place (locker, bin, building), faded for where a part goes (ghost).
  const thing=target.thing?thingArt(target.thing):null;
  if(thing&&drawArt(ctx,thing.id,target.x,target.y-(target.label?h*0.07:0),w*0.8,h*(target.label?0.66:0.8))){
    if(target.label){ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='800 30px system-ui';ctx.fillText(target.label,target.x,target.y+h*0.42);}
    ctx.restore();return;
  }
  const letter=/^[A-Za-z]$/.test(String(target.label??''))?tokenArt({kind:'letter',value:target.label}):null;
  if(!letter||!drawArt(ctx,letter.id,target.x,target.y,w*0.62,h*0.62)){ctx.fillStyle='#5a3a73';ctx.textAlign='center';ctx.font='800 34px system-ui';ctx.fillText(target.label??'',target.x,target.y+h*0.34);}
  ctx.restore();
}

// Named helper characters (bunny, rory, octo): real picture standing where the drawn one stood; drawn Bunny otherwise.
export function drawCharacter(ctx, name='bunny', x=1580, y=430, happy=false) {
  const bob=happy&&!globalThis.__LL_REDUCED_MOTION?Math.abs(Math.sin(performance.now()/160))*14:0;
  if(drawArt(ctx,characterArt(name),x,y+112-bob,300,340,{anchor:'bottom'}))return;
  drawBunny(ctx,x,y,happy);
}

export function drawBunny(ctx, x=1580, y=430, happy=false) {
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#f8efe7';
  ctx.beginPath();ctx.ellipse(-52,-118,40,105,-0.12,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(52,-118,40,105,0.12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffc4c9';
  ctx.beginPath();ctx.ellipse(-52,-118,17,73,-0.12,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(52,-118,17,73,0.12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f8efe7';ctx.beginPath();ctx.arc(0,0,112,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3c3342';ctx.beginPath();ctx.arc(-39,-16,13,0,Math.PI*2);ctx.arc(39,-16,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f18f9b';ctx.beginPath();ctx.arc(0,18,15,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#6b4c55';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();
  if(happy)ctx.arc(0,35,34,0.1*Math.PI,0.9*Math.PI);else{ctx.moveTo(-22,46);ctx.quadraticCurveTo(0,60,22,46);}ctx.stroke();
  ctx.restore();
}

export function tokenHit(token, x, y, extra = 36) {
  const r=(token.size??150)*0.5+extra*Math.max(1,Number(globalThis.__LL_UI_SCALE)||1);
  return (x-token.x)**2+(y-token.y)**2<=r*r;
}

export function rectOverlapRatio(a,b){
  const left=Math.max(a.x,b.x),right=Math.min(a.x+a.w,b.x+b.w),top=Math.max(a.y,b.y),bottom=Math.min(a.y+a.h,b.y+b.h);
  if(right<=left||bottom<=top)return 0;
  return((right-left)*(bottom-top))/(a.w*a.h);
}

export function tokenRect(token){
  const size=token.size??150;
  return{x:token.x-size/2,y:token.y-size/2,w:size,h:size};
}
