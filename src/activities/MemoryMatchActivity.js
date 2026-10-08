import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken } from './activityDraw.js';

export class MemoryMatchActivity extends Activity {
  start() {
    const cards = this.definition.cards ?? [];
    const positions = [{x:650,y:460},{x:960,y:460},{x:1270,y:460},{x:650,y:760},{x:960,y:760},{x:1270,y:760},{x:480,y:610},{x:1440,y:610}];
    this.cards = cards.map((card, i) => ({ ...card, id: card.id ?? `memory-${i}`, x: card.x ?? positions[i]?.x ?? 540 + (i%4)*300, y: card.y ?? positions[i]?.y ?? 500 + Math.floor(i/4)*280, size: card.size ?? 140, faceUp: false, matched: false, wobble: 0 }));
    this.first = null; this.second = null; this.hideTimer = 0; super.start();
  }
  update(dt) {
    super.update(dt); for (const c of this.cards) c.wobble = Math.max(0, c.wobble - dt);
    if (this.hideTimer > 0) { this.hideTimer -= dt; if (this.hideTimer <= 0 && this.first && this.second) { this.first.faceUp = false; this.second.faceUp = false; this.first = this.second = null; } }
  }
  cardAt(x,y) { return this.cards.find(c => !c.matched && Math.abs(x-c.x) <= 95 && Math.abs(y-c.y) <= 95); }
  getHintContext() { const object = this.cards.find(c => !c.matched) ?? null; const target = object ? this.cards.find(c => !c.matched && c !== object && c.pairId === object.pairId) : null; return object ? { object, target, skillIds: this.configuredSkills() } : null; }
  handlePointer(e) {
    if (e.type !== 'up' || this.hideTimer > 0) return; const card = this.cardAt(e.x,e.y); if (!card || card.faceUp) return;
    card.faceUp = true; this.cue('drop');
    if (!this.first) { this.first = card; return; }
    this.second = card;
    if (this.first.pairId === this.second.pairId) {
      this.first.matched = this.second.matched = true; this.recordResponse(this.configuredSkills(), 'success'); this.cue('correct'); this.react('happy', { duration: 0.7 }); this.first = this.second = null;
      if (this.cards.every(c => c.matched)) this.complete({ detail: this.definition.completeDetail ?? 'You remembered them all!' });
    } else {
      this.first.wobble = this.second.wobble = 0.45; this.recordResponse(this.configuredSkills(), 'incorrect'); this.cue('incorrect'); this.hideTimer = 0.55;
    }
  }
  render(ctx) {
    drawActivityBackground(ctx, this.definition.theme ?? 'meadow');
    for (const card of this.cards) {
      ctx.save(); ctx.translate(card.x,card.y); if (card.wobble>0) ctx.rotate(Math.sin(this.t*20)*0.08); ctx.translate(-card.x,-card.y);
      if (card.faceUp || card.matched) drawToken(ctx, card, { highlight: card.matched });
      else { ctx.fillStyle = '#8b69db'; ctx.beginPath(); ctx.roundRect(card.x-82,card.y-82,164,164,38); ctx.fill(); ctx.fillStyle='#fff7d0';ctx.textAlign='center';ctx.font='900 62px system-ui';ctx.fillText('★',card.x,card.y+21); }
      ctx.restore();
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'Find the matching cards', this.definition.subtitle ?? 'Remember where they are');
  }
}
