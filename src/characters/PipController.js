import { clamp, lerp, easeOutBack, easeOutCubic } from '../utils/easing.js';
import { art, artMap, drawArt } from '../core/art.js';
import { drawLooks, placementFor, poseForLooks, slotOf } from './Wardrobe.js';

const DURATIONS = {
  idle: 0,
  look: 1.05,
  point: 1.25,
  happy: 1.0,
  laugh: 1.35,
  celebrate: 1.85,
  confused: 1.15,
  encourage: 1.5,
  sleepy: 1.8,
  bounce: 0.9,
  fall: 1.45,
  wave: 1.45
};

const STATES = new Set(Object.keys(DURATIONS));
const IDLE_ACTIONS = ['blink', 'lookAround', 'tailWiggle', 'tinyHop', 'inspect'];

export class PipController {
  constructor({ x = 260, y = 650, scale = 1, facing = 1, rng = Math.random, onVoiceEvent = null, cosmetic = null, looks = null } = {}) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.facing = facing >= 0 ? 1 : -1;
    this.rng = rng;
    this.onVoiceEvent = onVoiceEvent;
    // Looks Pip is wearing (cosmetic reward definitions, one per slot). `cosmetic` is the older single look.
    this.looks = (looks ?? (cosmetic ? [cosmetic] : [])).filter(Boolean);

    this.state = 'idle';
    this.stateT = 0;
    this.stateDuration = 0;
    this.active = null;
    this.queue = [];
    this.lookTarget = null;
    this.voiceLine = null;

    this.idleClock = 0;
    this.nextIdleAt = this.randomIdleDelay();
    this.idleAction = null;
    this.idleActionT = 0;
    this.idleActionDuration = 0;
    this.blink = 0;
    this.t = 0;
  }

  randomIdleDelay() { return 2.7 + this.rng() * 3.1; }

  react(name, options = {}) {
    const state = String(name || '').toLowerCase();
    if (!STATES.has(state) || state === 'idle') return false;
    const request = {
      type: 'reaction',
      state,
      duration: Math.max(0.2, options.duration ?? DURATIONS[state]),
      target: options.target ?? null,
      priority: options.priority ?? 0,
      tag: options.tag ?? null
    };
    if (options.replaceTag && request.tag) this.queue = this.queue.filter(item => item.tag !== request.tag);
    if (request.priority > 0) this.queue.unshift(request); else this.queue.push(request);
    return true;
  }

  lookAt(target, duration = 1.05, options = {}) {
    if (!target) return false;
    return this.react('look', {
      duration,
      target,
      tag: options.tag ?? 'look',
      replaceTag: options.replaceTag ?? true,
      priority: options.priority ?? 0
    });
  }

  say(lineId, options = {}) {
    if (!lineId) return false;
    const duration = Math.max(0.35, options.duration ?? 1.8);
    const state = STATES.has(options.reaction) ? options.reaction : 'encourage';
    const request = {
      type: 'speech',
      state,
      duration,
      target: options.target ?? null,
      lineId,
      text: options.text ?? null,
      bubbleText: options.bubbleText ?? null,
      priority: options.priority ?? 0,
      tag: options.tag ?? 'speech'
    };
    this.queue = this.queue.filter(item => item.type !== 'speech' || item.priority > request.priority);
    if (request.priority > 0) this.queue.unshift(request); else this.queue.push(request);
    return true;
  }

  clearQueue({ keepActive = true } = {}) {
    this.queue.length = 0;
    if (!keepActive) this.finishActive();
  }

  startRequest(request) {
    this.active = request;
    this.state = request.state;
    this.stateT = 0;
    this.stateDuration = request.duration;
    if (request.target) this.lookTarget = request.target;
    this.idleAction = null;
    this.idleActionT = 0;
    if (request.type === 'speech') {
      this.voiceLine = request.lineId;
      this.onVoiceEvent?.({ type: 'start', lineId: request.lineId, text: request.text, bubbleText: request.bubbleText, duration: request.duration, reaction: request.state });
    }
  }

  finishActive() {
    if (this.active?.type === 'speech' && this.voiceLine) this.onVoiceEvent?.({ type: 'end', lineId: this.voiceLine });
    this.active = null;
    this.voiceLine = null;
    this.state = 'idle';
    this.stateT = 0;
    this.stateDuration = 0;
    this.idleClock = 0;
    this.nextIdleAt = this.randomIdleDelay();
  }

  startIdleAction() {
    const action = IDLE_ACTIONS[Math.floor(this.rng() * IDLE_ACTIONS.length) % IDLE_ACTIONS.length];
    this.idleAction = action;
    this.idleActionT = 0;
    this.idleActionDuration = { blink: 0.24, lookAround: 1.0, tailWiggle: 0.75, tinyHop: 0.65, inspect: 1.25 }[action];
    if (action === 'lookAround') this.lookTarget = { x: this.x + this.facing * 220, y: this.y - 160 };
    if (action === 'inspect') this.lookTarget = { x: this.x + this.facing * 120, y: this.y + 45 };
  }

  update(dt) {
    this.t += dt;
    if (!this.active && this.queue.length) this.startRequest(this.queue.shift());

    if (this.active) {
      this.stateT += dt;
      if (this.stateT >= this.stateDuration) this.finishActive();
    } else {
      this.idleClock += dt;
      if (!this.idleAction && this.idleClock >= this.nextIdleAt) {
        this.startIdleAction();
        this.idleClock = 0;
        this.nextIdleAt = this.randomIdleDelay();
      }
    }

    if (this.idleAction) {
      this.idleActionT += dt;
      if (this.idleActionT >= this.idleActionDuration) {
        this.idleAction = null;
        this.idleActionT = 0;
      }
    }

    this.blink = Math.max(0, this.blink - dt);
    if (!this.active && !this.idleAction && this.rng() < dt * 0.16) this.blink = 0.16;
  }

  get progress() {
    if (!this.active || this.stateDuration <= 0) return 0;
    return clamp(this.stateT / this.stateDuration, 0, 1);
  }

  getLookVector() {
    if (!this.lookTarget) return { x: this.facing, y: 0 };
    const dx = this.lookTarget.x - this.x;
    const dy = this.lookTarget.y - (this.y - 150 * this.scale);
    const length = Math.max(1, Math.hypot(dx, dy));
    return { x: dx / length, y: dy / length };
  }

  render(ctx) {
    const motion = this.computeMotion();
    const pose = this.artPose(motion.look);
    if (pose && this.renderArt(ctx, motion, pose)) return;
    this.renderPrototype(ctx, motion);
  }

  // Closest real picture for the current state (data/art_map.json "pip"). null keeps the drawn Pip.
  artPose(look) {
    const map = artMap()?.pip;
    if (!map) return null;
    let key = map.states?.idle;
    if (this.active) {
      key = map.states?.[this.state];
      if (key === null || key === undefined) return null;
      if (this.state === 'look' && look.y < -0.75 && map.lookUpWhenTargetAbove) key = map.lookUpWhenTargetAbove;
    } else if (this.idleAction && map.idleActions?.[this.idleAction]) key = map.idleActions[this.idleAction];
    if (this.looks.length) key = poseForLooks(this.looks, key);
    const pose = map.poses?.[key];
    if (pose && art(pose.id)) return { ...pose, key };
    const front = map.poses?.[map.states?.idle];
    return front && art(front.id) ? { ...front, key: map.states?.idle } : null;
  }

  renderArt(ctx, m, pose) {
    ctx.save();
    ctx.translate(this.x, this.y + m.bob);
    ctx.scale(this.facing * this.scale, this.scale);
    ctx.rotate(m.rotation * this.facing);
    ctx.scale(m.squashX, m.squashY);
    ctx.save();
    ctx.scale(this.facing, 1);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#493a61';
    ctx.beginPath(); ctx.ellipse(0, 28 - m.bob * 0.08, 102, 29, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const flipX = pose.faces === 'left';
    if (this.looks.length && art(pose.id)) drawLooks(ctx, this.looks, pose, pose.key, 'behind');
    const drawn = drawArt(ctx, pose.id, 0, 30 - (pose.lift ?? 0), pose.h * 2, pose.h, { anchor: 'bottom', flipX });
    if (drawn && this.looks.length) drawLooks(ctx, this.looks, pose, pose.key, 'front');
    if (drawn && pose.head) {
      ctx.save();
      ctx.translate(flipX ? -pose.head[0] : pose.head[0], pose.head[1]);
      ctx.scale(pose.head[2], pose.head[2]);
      for (const look of this.looks) if (!placementFor(look.id)) this.drawCosmetic(ctx, true, look);
      ctx.restore();
    }
    ctx.restore();
    return drawn;
  }

  computeMotion() {
    const p = this.progress;
    const state = this.state;
    const idleP = this.idleActionDuration > 0 ? clamp(this.idleActionT / this.idleActionDuration, 0, 1) : 0;
    const look = this.getLookVector();

    let bob = Math.sin(this.t * 3.2) * 4;
    let squashX = 1, squashY = 1, rotation = 0;
    let armL = 0, armR = 0, mouth = 'smile', eyeScaleY = 1;
    let tail = Math.sin(this.t * 2.3) * 0.10, earL = 0, earR = 0;

    if (this.blink > 0 || this.idleAction === 'blink') eyeScaleY = 0.12;
    if (this.idleAction === 'tailWiggle') tail += Math.sin(idleP * Math.PI * 8) * 0.42;
    if (this.idleAction === 'tinyHop') bob -= Math.sin(idleP * Math.PI) * 34;
    if (this.idleAction === 'inspect') rotation = Math.sin(idleP * Math.PI) * 0.05 * this.facing;

    if (state === 'look') {
      rotation = clamp(look.x * 0.08, -0.08, 0.08); earL = -0.08; earR = 0.08;
    } else if (state === 'point') {
      const dir = look.x >= 0 ? 1 : -1; this.facing = dir;
      if (dir > 0) armR = -1.04; else armL = 1.04;
      bob -= Math.sin(p * Math.PI) * 8;
    } else if (state === 'happy') {
      bob -= Math.sin(p * Math.PI * 2) * 12; mouth = 'happy'; earL = -0.12; earR = 0.12;
    } else if (state === 'laugh') {
      bob -= Math.abs(Math.sin(p * Math.PI * 4)) * 10; mouth = 'laugh'; eyeScaleY = 0.24; armL = 0.25; armR = -0.25;
    } else if (state === 'celebrate') {
      bob -= Math.sin(easeOutCubic(Math.min(1, p * 1.6)) * Math.PI) * 52;
      squashX = 1 + Math.sin(p * Math.PI * 4) * 0.045; squashY = 2 - squashX;
      armL = 0.95; armR = -0.95; mouth = 'laugh'; tail += Math.sin(p * Math.PI * 10) * 0.35;
    } else if (state === 'confused') {
      rotation = Math.sin(p * Math.PI) * -0.11 * this.facing; mouth = 'o'; earL = 0.15; earR = -0.05;
    } else if (state === 'encourage') {
      bob -= Math.sin(p * Math.PI * 2) * 7; armR = -0.55; mouth = 'happy'; tail += Math.sin(p * Math.PI * 5) * 0.20;
    } else if (state === 'sleepy') {
      eyeScaleY = 0.16; rotation = Math.sin(p * Math.PI) * 0.05; mouth = 'o'; earL = 0.15; earR = -0.15;
    } else if (state === 'bounce') {
      const jump = Math.abs(Math.sin(p * Math.PI * 2)); bob -= jump * 44;
      squashX = 1 + (1 - jump) * 0.06; squashY = 1 - (1 - jump) * 0.05; mouth = 'happy';
    } else if (state === 'fall') {
      const first = clamp(p / 0.58, 0, 1); const recover = clamp((p - 0.58) / 0.42, 0, 1);
      rotation = first < 1 ? easeOutCubic(first) * 0.80 * this.facing : lerp(0.80 * this.facing, 0, easeOutBack(recover));
      bob += first < 1 ? easeOutCubic(first) * 42 : lerp(42, 0, easeOutBack(recover)); mouth = p < 0.65 ? 'o' : 'smile';
    } else if (state === 'wave') {
      armR = -0.78 + Math.sin(p * Math.PI * 8) * 0.25; mouth = 'happy';
    }
    return { look, bob, squashX, squashY, rotation, armL, armR, mouth, eyeScaleY, tail, earL, earR };
  }

  renderPrototype(ctx, m = this.computeMotion()) {
    const { look, bob, squashX, squashY, rotation, armL, armR, mouth, eyeScaleY, tail, earL, earR } = m;

    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.scale(this.facing * this.scale, this.scale);
    ctx.rotate(rotation * this.facing);
    ctx.scale(squashX, squashY);

    ctx.save();
    ctx.scale(this.facing, 1);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#493a61';
    ctx.beginPath(); ctx.ellipse(0, 28 - bob * 0.08, 102, 29, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-74, -92); ctx.rotate(-0.55 + tail);
    ctx.fillStyle = '#7758c9';
    ctx.beginPath(); ctx.moveTo(5, 6); ctx.bezierCurveTo(-74, -18, -116, 42, -70, 80); ctx.bezierCurveTo(-41, 102, -8, 68, 4, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd66e'; ctx.beginPath(); ctx.ellipse(-72, 62, 27, 38, -0.55, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#6247ad';
    ctx.beginPath(); ctx.ellipse(-47, 6, 47, 29, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(47, 6, 47, 29, 0.05, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#8b6ce0'; ctx.beginPath(); ctx.ellipse(0, -94, 100, 127, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b5a1ee'; ctx.beginPath(); ctx.ellipse(0, -69, 61, 78, 0, 0, Math.PI * 2); ctx.fill();

    this.drawArm(ctx, -75, -105, armL, -1);
    this.drawArm(ctx, 75, -105, armR, 1);

    ctx.save();
    ctx.translate(0, -224); ctx.rotate(clamp(look.x * 0.025, -0.025, 0.025));
    ctx.fillStyle = '#7758c9';
    ctx.save(); ctx.translate(-63, -54); ctx.rotate(-0.20 + earL); ctx.beginPath(); ctx.ellipse(0, 0, 33, 72, -0.20, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(63, -54); ctx.rotate(0.20 + earR); ctx.beginPath(); ctx.ellipse(0, 0, 33, 72, 0.20, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.fillStyle = '#9a7bea'; ctx.beginPath(); ctx.ellipse(0, 0, 116, 102, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b9a7ef'; ctx.beginPath(); ctx.ellipse(0, 28, 77, 58, 0, 0, Math.PI * 2); ctx.fill();

    const eyeX = clamp(look.x * 8, -8, 8), eyeY = clamp(look.y * 6, -6, 6);
    ctx.fillStyle = '#fffdf9';
    ctx.beginPath(); ctx.ellipse(-40, -11, 29, 38 * eyeScaleY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(40, -11, 29, 38 * eyeScaleY, 0, 0, Math.PI * 2); ctx.fill();
    if (eyeScaleY > 0.25) {
      ctx.fillStyle = '#3d315a';
      ctx.beginPath(); ctx.arc(-40 + eyeX, -8 + eyeY, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(40 + eyeX, -8 + eyeY, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-35 + eyeX, -13 + eyeY, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(45 + eyeX, -13 + eyeY, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#ef87a3'; ctx.beginPath(); ctx.ellipse(0, 18, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    this.drawMouth(ctx, mouth);
    ctx.fillStyle = '#ffd65a'; ctx.save(); ctx.translate(0, 75); ctx.rotate(this.t * 0.15); this.drawStar(ctx, 0, 0, 18, 9); ctx.fill(); ctx.restore();
    for (const look of this.looks) this.drawCosmetic(ctx, false, look);

    ctx.restore();
    ctx.restore();
  }

  // Older looks: a picture on Pip's head or eyes, or (no picture yet) the drawn placeholder shape for head looks.
  drawCosmetic(ctx, onArt = false, item = this.looks[0]) {
    if(!item)return;
    if(onArt){const id=artMap()?.cosmetics?.[item.id];const slot=id?(artMap()?.cosmeticSlots?.[id]??'head'):null;
      if(slot==='head'&&drawArt(ctx,id,0,-62,220,170,{anchor:'bottom'}))return;
      if(slot==='eyes'&&drawArt(ctx,id,0,12,210,90))return;
      if(slot==='none')return;}
    if(slotOf(item)!=='head')return; // no picture yet: placeholder shapes are hats, so only head looks get one // outfits, scarves, boots: shown beside Pip in the Collection, not drawn on him
    const map={red:'#e94d55',blue:'#4d8ee8',yellow:'#f7cf4f',green:'#66bd62',orange:'#f39a45',purple:'#8b69db',pink:'#ec7ea2',cream:'#fff3dc'};
    const color=map[item.color]??item.color??'#ffd56f';const style=Number(item.style)||0;
    ctx.save();ctx.fillStyle=color;ctx.strokeStyle='#4d365f';ctx.lineWidth=6;
    if(style===0){ctx.beginPath();ctx.ellipse(0,-96,74,30,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(-58,-122,116,42,18);ctx.fill();}
    else if(style===1){ctx.beginPath();ctx.moveTo(-62,-86);ctx.lineTo(-35,-145);ctx.lineTo(0,-104);ctx.lineTo(35,-145);ctx.lineTo(62,-86);ctx.closePath();ctx.fill();}
    else if(style===2){ctx.beginPath();ctx.arc(-84,-20,18,0,Math.PI*2);ctx.arc(84,-20,18,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=10;ctx.beginPath();ctx.arc(0,-18,96,Math.PI*.08,Math.PI*.92,true);ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(-76,-50);ctx.lineTo(-20,-75);ctx.lineTo(-20,-28);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(76,-50);ctx.lineTo(20,-75);ctx.lineTo(20,-28);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(0,-50,16,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  drawArm(ctx, x, y, angle, side) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#8062d1'; ctx.beginPath(); ctx.roundRect(side < 0 ? -54 : -5, -19, 59, 38, 19); ctx.fill();
    ctx.fillStyle = '#9d83e6'; ctx.beginPath(); ctx.arc(side < 0 ? -53 : 53, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  drawMouth(ctx, mouth) {
    ctx.strokeStyle = '#4d365f'; ctx.fillStyle = '#4d365f'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath();
    if (mouth === 'laugh') {
      ctx.ellipse(0, 44, 28, 23, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9eb0'; ctx.beginPath(); ctx.ellipse(0, 54, 16, 8, 0, 0, Math.PI); ctx.fill();
    } else if (mouth === 'o') {
      ctx.ellipse(0, 45, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
    } else if (mouth === 'happy') {
      ctx.arc(0, 34, 31, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
    } else {
      ctx.moveTo(-24, 40); ctx.quadraticCurveTo(0, 55, 24, 40); ctx.stroke();
    }
  }

  drawStar(ctx, x, y, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}
