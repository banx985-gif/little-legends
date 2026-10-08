const DEFAULT_DELAYS = Object.freeze({
  early: 4.5,
  young: 5.5,
  growing: 7.0
});

export class HintController {
  constructor({ host, learning = null, developmentalLevel = 'young', delays = DEFAULT_DELAYS } = {}) {
    this.host = host;
    this.learning = learning;
    this.delays = { ...DEFAULT_DELAYS, ...delays };
    this.developmentalLevel = developmentalLevel in this.delays ? developmentalLevel : 'young';
    this.currentLevel = 0;
    this.elapsed = 0;
    this.active = true;
  }

  get delay() { return this.delays[this.developmentalLevel] ?? this.delays.young; }

  setDevelopmentalLevel(level) {
    if (level in this.delays) this.developmentalLevel = level;
  }

  reset({ clearVisuals = true } = {}) {
    this.currentLevel = 0;
    this.elapsed = 0;
    if (clearVisuals) {
      this.host.activity?.setHint?.(0, null);
      this.host.hideHintDemo?.();
    }
  }

  onInput() {
    this.elapsed = 0;
    this.host.hideHintDemo?.();
  }

  onProgress() { this.reset({ clearVisuals: true }); }

  stop() {
    this.active = false;
    this.host.hideHintDemo?.();
  }

  update(dt) {
    if (!this.active || !this.host.activity || this.host.completed) return;
    this.elapsed += dt;
    if (this.elapsed < this.delay) return;
    this.elapsed = 0;
    if (this.currentLevel >= 5) {
      const context = this.host.activity.getHintContext?.() ?? null;
      if (context?.object) this.host.showHintDemo?.(context);
      return;
    }
    this.advance();
  }

  advance() {
    if (!this.active || this.currentLevel >= 5) return false;
    this.currentLevel++;
    const activity = this.host.activity;
    const context = activity?.getHintContext?.() ?? null;
    activity?.setHint?.(this.currentLevel, context);

    const skillIds = context?.skillIds?.length ? context.skillIds : activity?.configuredSkills?.() ?? [];
    this.learning?.recordHint?.({ activityId: activity?.id ?? null, level: this.currentLevel, skillIds });
    this.host?.game?.childTest?.recordHint?.(this.currentLevel);

    if (this.currentLevel === 1) this.host.repeatInstruction?.();
    if (this.currentLevel === 4) {
      const target = context?.target ?? context?.object;
      if (target) this.host.pip?.react('point', { duration: 1.5, target, tag: 'hint-point', replaceTag: true, priority: 1 });
    }
    if (this.currentLevel === 5 && context?.object) this.host.showHintDemo?.(context);
    return true;
  }
}
