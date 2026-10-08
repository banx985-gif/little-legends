export class Activity {
  constructor({ game, host, definition }) {
    this.game = game;
    this.host = host;
    this.definition = definition;
    this.id = definition.id;
    this.completeState = false;
    this.t = 0;
    this.hintLevel = 0;
    this.hintContext = null;
    this.hadIncorrect = false;
  }

  async load() {}

  start() {
    this.game.childTest?.recordActivityStart?.(this.id);
    const voice = this.definition.voiceText ?? this.definition.instructionText ?? '';
    const bubble = this.definition.pipBubble ?? voice;
    if (voice) {
      const duration = Math.max(0.9, Math.min(3.2, 0.45 + voice.split(/\s+/).length * 0.32));
      this.host.pip?.say(this.definition.instruction ?? this.id, {
        text: voice,
        bubbleText: bubble,
        duration,
        reaction: 'wave'
      });
    }
  }

  update(dt) { this.t += dt; }
  render() {}
  handlePointer() {}
  checkProgress() { return false; }
  cleanup() {}

  cue(name, options = {}) { this.game.audio?.playCue(name, options); this.game.fx?.cue?.(name, options); }
  react(name, options) { this.host.pip?.react(name, options); }
  lookAt(target, duration, options) { this.host.pip?.lookAt(target, duration, options); }

  recordResponse(skillIds, outcome, options = {}) {
    const ids = Array.isArray(skillIds) ? skillIds : [skillIds];
    const assistance = this.host.getLearningAssistance?.() ?? { assisted: false, hintLevel: 0 };
    const event = this.game.learning?.recordResponse({
      activityId: this.id,
      skillIds: ids.filter(Boolean),
      outcome,
      assisted: options.assisted ?? assistance.assisted ?? false,
      hintLevel: options.hintLevel ?? assistance.hintLevel ?? 0,
      responseTimeMs: options.responseTimeMs ?? Math.round(this.t * 1000),
      correction: options.correction ?? (outcome === 'success' && this.hadIncorrect)
    }) ?? null;
    this.game.childTest?.recordResponse?.(event);
    if (outcome === 'incorrect') this.hadIncorrect = true;
    if (outcome === 'success') { this.host.hints?.onProgress?.(); this.hadIncorrect = false; }
    if (event && this.game.save?.saveLearning) this.game.save.saveLearning(this.game.learning.snapshot());
    return event;
  }

  setHint(level, context = null) {
    this.hintLevel = Math.max(0, Math.min(5, Number(level) || 0));
    this.hintContext = context;
  }

  getHintContext() { return null; }

  configuredSkills() {
    const skills = this.definition.skills ?? (this.definition.skill ? [this.definition.skill] : []);
    return skills.filter(Boolean);
  }

  complete(result = {}) {
    if (this.completeState) return;
    this.completeState = true;
    this.game.childTest?.recordActivityComplete?.(this.id);
    this.game.fx?.cue?.('complete',{x:960,y:570});
    this.host.completeActivity({
      title: result.title ?? this.definition.completeTitle ?? 'YOU DID IT!',
      detail: result.detail ?? this.definition.completeDetail ?? 'Great job!',
      reaction: result.reaction ?? this.definition.successReaction ?? 'celebrate'
    });
  }
}
