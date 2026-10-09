import { Activity } from './Activity.js';
import { tokenHit, tokenRect, rectOverlapRatio } from './activityDraw.js';
import { clamp, lerp, easeOutBack, easeOutCubic } from '../utils/easing.js';

export class DragBaseActivity extends Activity {
  constructor(args) {
    super(args);
    this.tokens = [];
    this.active = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  makeToken(source, index) {
    return {
      ...source,
      id: source.id ?? `${this.id}-token-${index}`,
      kind: source.kind ?? 'circle',
      color: source.color ?? 'red',
      category: source.category ?? source.kind ?? 'default',
      targetId: source.targetId ?? null,
      x: source.x ?? 430 + index * 220,
      y: source.y ?? 700,
      originX: source.x ?? 430 + index * 220,
      originY: source.y ?? 700,
      size: source.size ?? 150,
      scale: 1,
      targetScale: 1,
      state: 'idle',
      animT: 0,
      fromX: source.x ?? 430 + index * 220,
      fromY: source.y ?? 700,
      toX: source.x ?? 430 + index * 220,
      toY: source.y ?? 700,
      placed: false,
      wobble: 0,
      pipPointed: false
    };
  }

  update(dt) {
    super.update(dt);
    for (const token of this.tokens) {
      token.scale = lerp(token.scale, token.targetScale, 1 - Math.pow(0.001, dt));
      token.wobble = Math.max(0, token.wobble - dt);
      if (token.state === 'returning') {
        token.animT = Math.min(1, token.animT + dt / 0.34);
        const e = easeOutCubic(token.animT);
        token.x = lerp(token.fromX, token.toX, e);
        token.y = lerp(token.fromY, token.toY, e);
        if (token.animT >= 1) token.state = 'idle';
      } else if (token.state === 'snapping') {
        token.animT = Math.min(1, token.animT + dt / 0.28);
        const e = easeOutBack(token.animT);
        token.x = lerp(token.fromX, token.toX, e);
        token.y = lerp(token.fromY, token.toY, e);
        if (token.animT >= 1) { token.state = 'placed'; token.targetScale = 0.88; }
      }
    }
  }

  beginDrag(token, e) {
    this.active = token;
    token.state = 'dragging';
    token.targetScale = 1.16;
    this.dragOffset.x = token.x - e.x;
    this.dragOffset.y = token.y - e.y;
    this.cue('grab');
    this.lookAt(token, 0.8, { tag: 'drag-look', replaceTag: true });
  }

  moveDrag(e) {
    if (!this.active) return;
    this.active.x = clamp(e.x + this.dragOffset.x, 95, 1825);
    this.active.y = clamp(e.y + this.dragOffset.y - 35, 160, 970);
    const target = this.nearestTarget(this.active);
    if (target) {
      const d = Math.hypot(this.active.x - target.x, this.active.y - target.y);
      const magnetRadius = target.magnetRadius ?? 270;
      if (d < magnetRadius) {
        const strength = clamp(1 - d / magnetRadius, 0, 1) * 0.18;
        this.active.x = lerp(this.active.x, target.x, strength);
        this.active.y = lerp(this.active.y, target.y, strength);
      }
      if (d < magnetRadius + 90 && !this.active.pipPointed) {
        this.active.pipPointed = true;
        this.react('point', { duration: 1.0, target, tag: 'target-point', replaceTag: true });
      }
    }
  }

  releaseDrag(e) {
    const token = this.active;
    if (!token) return;
    this.active = null;
    token.targetScale = 1;
    if (e.type === 'cancel') {
      this.game.childTest?.recordLostDrag?.();
      this.returnToken(token);
      return;
    }
    this.cue('drop', { sound: this.dropSound ?? 'drop' });
    const target = this.bestDropTarget(token);
    if (target && this.accepts(target, token)) this.onValidDrop(token, target);
    else this.onInvalidDrop(token, target);
  }

  handlePointer(e) {
    if (e.type === 'down') {
      const token = [...this.tokens].reverse().find(item => !item.placed && item.state !== 'snapping' && tokenHit(item, e.x, e.y));
      if (token) this.beginDrag(token, e);
    } else if (e.type === 'move' && this.active) this.moveDrag(e);
    else if ((e.type === 'up' || e.type === 'cancel') && this.active) this.releaseDrag(e);
  }

  nearestTarget() { return null; }
  validTargets() { return []; }
  accepts() { return false; }
  skillsForToken() { return this.configuredSkills(); }
  getHintContext() {
    const object = this.tokens.find(token => !token.placed) ?? null;
    if (!object) return null;
    const target = this.nearestTarget(object);
    return { object, target, skillIds: this.skillsForToken(object, target) };
  }

  targetRect(target) {
    const w = target.w ?? 320, h = target.h ?? 250;
    return { x: target.x - w / 2, y: target.y - h / 2, w, h };
  }

  bestDropTarget(token) {
    let best = null, bestScore = 0;
    for (const target of this.validTargets(token)) {
      const overlap = rectOverlapRatio(tokenRect(token), this.targetRect(target));
      const dx = token.x - target.x, dy = token.y - target.y;
      const near = Math.hypot(dx, dy) <= (target.releaseRadius ?? Math.max(target.w ?? 320, target.h ?? 250) * 0.72);
      const score = overlap >= 0.25 ? 2 + overlap : near ? 1 : 0;
      if (score > bestScore) { best = target; bestScore = score; }
    }
    return best;
  }

  returnToken(token) {
    token.state = 'returning'; token.animT = 0;
    token.fromX = token.x; token.fromY = token.y;
    token.toX = token.originX; token.toY = token.originY;
    token.pipPointed = false;
  }

  snapToken(token, x, y) {
    token.placed = true;
    token.state = 'snapping'; token.animT = 0;
    token.fromX = token.x; token.fromY = token.y;
    token.toX = x; token.toY = y;
  }

  onInvalidDrop(token, target) {
    this.game.childTest?.recordLostDrag?.();
    this.recordResponse(this.skillsForToken(token, target), 'incorrect');
    token.wobble = 0.45;
    this.cue('incorrect');
    this.host.pip?.clearQueue({ keepActive: false });
    this.host.pip?.say(`${this.id}_retry`, {
      text: this.definition.retryVoice ?? 'Nearly! Try again.',
      bubbleText: this.definition.retryBubble ?? 'Try again!',
      duration: 1.2,
      reaction: 'encourage'
    });
    this.returnToken(token);
  }
}
