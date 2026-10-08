import { Activity } from './Activity.js';
import { drawActivityBackground, drawInstructionPanel, drawToken, tokenHit } from './activityDraw.js';

export class SoundMatchActivity extends Activity {
  start() {
    this.choices = (this.definition.choices ?? []).map((choice, i) => ({
      ...choice,
      id: choice.id ?? `sound-${i}`,
      x: choice.x ?? 650 + i * 330,
      y: choice.y ?? 690,
      size: choice.size ?? 150,
      wobble: 0
    }));
    this.promptPlayed = false;
    super.start();
  }

  playPrompt() {
    this.promptPlayed = true;
    if (this.definition.promptText) this.game.audio?.speak?.(this.definition.promptText);
    else this.cue(this.definition.soundCue ?? 'count', { count: this.definition.soundCount ?? 2 });
  }

  update(dt) {
    super.update(dt);
    if (!this.promptPlayed && this.t >= 0.12) this.playPrompt();
    for (const choice of this.choices) choice.wobble = Math.max(0, choice.wobble - dt);
  }

  correctChoice() {
    return this.choices.find(choice => choice.correct || choice.id === this.definition.correctId) ?? this.choices[0];
  }

  getHintContext() {
    const object = this.correctChoice();
    return object ? { object, target: object, skillIds: this.configuredSkills() } : null;
  }

  handlePointer(e) {
    if (e.type !== 'up') return;
    if (e.x >= 820 && e.x <= 1100 && e.y >= 320 && e.y <= 500) {
      this.playPrompt();
      return;
    }
    const choice = this.choices.find(item => tokenHit(item, e.x, e.y, 35));
    if (!choice) return;
    if (choice === this.correctChoice()) {
      this.recordResponse(this.configuredSkills(), 'success');
      this.cue('correct');
      this.complete({ detail: this.definition.completeDetail ?? 'You found the sound!' });
    } else {
      choice.wobble = 0.4;
      this.recordResponse(this.configuredSkills(), 'incorrect');
      this.cue('incorrect');
    }
  }

  render(ctx) {
    drawActivityBackground(ctx, this.definition.theme ?? 'forest');
    ctx.fillStyle = '#fff7d0';
    ctx.beginPath();
    ctx.roundRect(820, 320, 280, 180, 60);
    ctx.fill();
    ctx.fillStyle = '#5a3a73';
    ctx.textAlign = 'center';
    ctx.font = '900 70px system-ui';
    ctx.fillText('🔊', 960, 405);
    const visual = this.definition.visualPrompt ?? this.definition.promptText ?? '';
    if (visual) { ctx.font='800 28px system-ui'; ctx.fillText(String(visual).slice(0,24),960,468); }
    for (const choice of this.choices) {
      const hinted = this.hintLevel >= 2 && this.hintContext?.object?.id === choice.id;
      drawToken(ctx, choice, { highlight: hinted, wobble: choice.wobble > 0 ? Math.sin(this.t * 18) * 0.1 : 0 });
    }
    drawInstructionPanel(ctx, this.definition.instructionText ?? 'Which one makes that sound?', this.definition.subtitle ?? 'Tap the speaker to hear it again');
  }
}
