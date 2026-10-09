import { clamp, easeOutBack } from '../utils/easing.js';
import { drawCandyButton, drawSpeechBubble } from '../utils/draw.js';
import { drawActivityAmbient } from '../activities/activityDraw.js';
import { PipController } from '../characters/PipController.js';
import { HintController } from '../hints/HintController.js';
import { HoldToLeave } from '../ui/HoldToLeave.js';

export class ActivityScene {
  constructor(game) {
    this.game = game;
    this.pip = null;
    this.activity = null;
    this.activityId = null;
    this.completed = false;
    this.completeT = 0;
    this.completeTitle = 'YOU DID IT!';
    this.completeDetail = 'Great job!';
    this.pipSpeech = '';
    this.pipSpeechT = 0;
    this.pipVoiceUsesSpeech = false;
    this.pressed = null;
    this.error = null;
    this.t = 0;
    this.hints = null;
    this.hintDemo = null;
    this.hintDemoT = 0;
  }

  async enter(data = {}) {
    this.completed = false;
    this.completeT = 0;
    this.pressed = null;
    this.error = null;
    this.t = 0;
    this.hints = null;
    this.hintDemo = null;
    this.hintDemoT = 0;
    this.pipSpeech = '';
    this.pipSpeechT = 0;
    this.pipVoiceUsesSpeech = false;
    this.leave = new HoldToLeave({ onLeave: () => this.game.scenes.change('island') });

    this.pip = new PipController({
      x: 225,
      y: 525,
      scale: 0.80,
      onVoiceEvent: event => this.handlePipVoiceEvent(event)
    });

    try {
      await this.game.activityEngine.ensureLoaded(this.game.assets);
      this.activityId = this.resolveActivityId(data.activityId);
      this.activity = this.game.activityEngine.create(this.activityId, this);
      await this.activity.load();
      this.activity.start();
      const age = this.game.save?.getActiveProfile?.()?.age ?? 3;
      const developmentalLevel = age <= 2 ? 'early' : age >= 5 ? 'growing' : 'young';
      const multiplier = this.activity.definition.hintDelayMultiplier ?? 1;
      this.hints = new HintController({ host: this, learning: this.game.learning, developmentalLevel, delays: { early: 4.5 * multiplier, young: 5.5 * multiplier, growing: 7 * multiplier } });
    } catch (error) {
      console.error(error);
      this.error = error;
    }
  }

  resolveActivityId(requested) {
    let id = requested;
    if (!id && typeof location !== 'undefined') id = new URLSearchParams(location.search).get('activity');
    if (id && this.game.activityEngine.get(id)) return id;
    if (this.game.activityEngine.get('feed_bunny_3')) return 'feed_bunny_3';
    return this.game.activityEngine.ids()[0];
  }

  async exit() {
    this.hints?.stop?.();
    this.activity?.cleanup?.();
    this.game.audio?.stopVoice?.();
  }

  handlePipVoiceEvent(event) {
    const fallback = {
      three_apples: { bubble: 'Three apples for Bunny!', voice: "Put three apples in Bunny's basket!" },
      try_basket: { bubble: 'Nearly! Try the basket.', voice: 'Nearly! Try the basket.' },
      great_counting: { bubble: 'We did it!', voice: 'We did it! Great counting!' }
    }[event.lineId] ?? { bubble: '', voice: '' };

    if (event.type === 'start') {
      const bubble = event.bubbleText ?? fallback.bubble ?? '';
      const voice = event.text ?? fallback.voice ?? bubble;
      this.pipSpeech = bubble;
      this.pipSpeechT = event.duration ?? 1;
      this.pipVoiceUsesSpeech = Boolean(voice && this.game.audio?.speak?.(voice));
      if (!this.pipVoiceUsesSpeech) this.game.audio?.voiceWindow(event);
    } else if (event.type === 'end') {
      this.pipSpeechT = 0;
      if (!this.pipVoiceUsesSpeech) this.game.audio?.voiceWindow(event);
      this.pipVoiceUsesSpeech = false;
    }
  }


  getLearningAssistance() {
    const level = this.hints?.currentLevel ?? 0;
    return { assisted: level > 0, hintLevel: level };
  }

  repeatInstruction() {
    if (!this.activity) return;
    const voice = this.activity.spokenInstruction?.() ?? this.activity.definition.voiceText ?? '';
    const bubble = this.activity.definition.pipBubble ?? voice;
    if (!voice) return;
    this.pip?.say(`${this.activityId}_hint_repeat`, {
      text: voice,
      bubbleText: bubble,
      duration: Math.max(0.9, Math.min(3.2, 0.45 + voice.split(/\s+/).length * 0.32)),
      reaction: 'encourage',
      priority: 1
    });
  }

  showHintDemo(context) {
    this.hintDemo = context;
    this.hintDemoT = 0;
  }

  hideHintDemo() {
    this.hintDemo = null;
    this.hintDemoT = 0;
  }

  completeActivity({ title = 'YOU DID IT!', detail = 'Great job!', reaction = 'celebrate' } = {}) {
    if (this.completed) return;
    this.completed = true;
    this.hints?.stop?.();
    this.hideHintDemo();
    this.completeT = 0;
    this.completeTitle = title;
    this.completeDetail = detail;
    this.game.scheduler?.record?.(this.activity?.definition ?? this.activityId);
    this.pip?.clearQueue({ keepActive: false });
    this.pip.x = 400;
    this.pip.y = 760;
    this.pip.scale = 1.0;
    this.pip?.react(reaction, { duration: 2.0 });
    this.pip?.say(`${this.activityId}_complete`, {
      text: 'We did it! Great job!',
      bubbleText: 'We did it!',
      duration: 1.15,
      reaction: 'laugh'
    });
    setTimeout(() => this.game.audio?.playCue('complete'), 180);
  }

  update(dt) {
    this.t += dt;
    this.leave?.update(dt);
    this.pip?.update(dt);
    if (this.pipSpeechT > 0) this.pipSpeechT = Math.max(0, this.pipSpeechT - dt);
    if (!this.completed) {
      this.activity?.update?.(dt);
      this.hints?.update?.(dt);
      if (this.hintDemo) this.hintDemoT += dt;
    } else this.completeT += dt;
  }

  handlePointer(e) {
    if (this.error) {
      if (e.type === 'up') this.game.scenes.change('island');
      return;
    }

    if (!this.completed) {
      if (this.leave?.handlePointer(e)) return;
      this.hints?.onInput?.();
      this.activity?.handlePointer?.(e);
      return;
    }

    const control = this.completionControlAt(e);
    if (e.type === 'down') this.pressed = control;
    else if (e.type === 'move' && this.pressed && control !== this.pressed) this.pressed = null;
    else if (e.type === 'up' || e.type === 'cancel') {
      const chosen = e.type === 'up' && control === this.pressed ? this.pressed : null;
      this.pressed = null;
      if (chosen === 'island') this.game.scenes.change('island');
      if (chosen === 'next') {
        const nextId = this.game.scheduler?.pickNext?.(this.activityId) ?? this.game.activityEngine.nextId(this.activityId);
        this.game.scenes.change('activity', { activityId: nextId });
      }
    }
  }

  completionControlAt(e) {
    if (e.x >= 500 && e.x <= 910 && e.y >= 840 && e.y <= 1010) return 'island';
    if (e.x >= 1010 && e.x <= 1420 && e.y >= 840 && e.y <= 1010) return 'next';
    return null;
  }

  drawPipSpeech(ctx) {
    if (!this.pipSpeech || this.pipSpeechT <= 0) return;
    // Left of the instruction panel (which starts at x 400) while playing; above Pip on the celebration screen.
    drawSpeechBubble(ctx, this.pipSpeech, this.completed ? 170 : 20, this.completed ? 285 : 75, this.completed ? 420 : 370, 112, clamp(this.pipSpeechT / 0.18, 0, 1));
  }

  drawHintDemonstration(ctx) {
    const object = this.hintDemo?.object;
    const target = this.hintDemo?.target ?? object;
    if (!object || !target) return;
    const phase = (Math.sin(this.hintDemoT * 2.5 - Math.PI / 2) + 1) / 2;
    const eased = phase * phase * (3 - 2 * phase);
    const x = object.x + (target.x - object.x) * eased;
    const y = object.y + (target.y - object.y) * eased;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = '#fff7d0';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(object.x, object.y); ctx.lineTo(target.x, target.y); ctx.stroke();
    ctx.fillStyle = '#fff7d0';
    ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b69db';
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  render(ctx) {
    if (this.error) {
      ctx.fillStyle = '#49385d'; ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '900 62px system-ui'; ctx.fillText('Activity could not load', 960, 470);
      ctx.font = '600 32px system-ui'; ctx.fillText('Tap anywhere to go back to Wonder Island.', 960, 540);
      return;
    }

    this.activity?.render?.(ctx);
    if (this.activity) drawActivityAmbient(ctx, this.activity.definition, this.t);

    if (!this.completed) {
      this.drawHintDemonstration(ctx);
      this.pip?.render(ctx);
      this.drawPipSpeech(ctx);
      this.leave?.render(ctx);
      return;
    }

    const p = clamp(this.completeT / 0.55, 0, 1);
    ctx.save();
    ctx.globalAlpha = p;
    ctx.fillStyle = '#593f6acc'; ctx.fillRect(0, 0, 1920, 1080);
    const s = 0.5 + easeOutBack(p) * 0.5;
    ctx.translate(960, 475); ctx.scale(s, s);
    ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc3d';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.t * 0.5;
      ctx.save(); ctx.rotate(a); ctx.translate(0, -320); ctx.rotate(-a);
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? 20 : 46, aa = -Math.PI / 2 + k * Math.PI / 5;
        const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();

    this.pip?.render(ctx);
    this.drawPipSpeech(ctx);

    ctx.save(); ctx.translate(960, 475);
    ctx.fillStyle = '#5a3a73'; ctx.textAlign = 'center';
    ctx.font = '900 66px system-ui'; ctx.fillText(this.completeTitle, 0, -18);
    ctx.font = '800 36px system-ui'; ctx.fillText(this.completeDetail, 0, 50);
    ctx.restore();

    if (this.completeT > 0.32) {
      drawCandyButton(ctx, 500, 850, 410, 135, 'ISLAND', this.pressed === 'island', 'home');
      drawCandyButton(ctx, 1010, 850, 410, 135, 'NEXT', this.pressed === 'next', 'next');
    }
  }
}
