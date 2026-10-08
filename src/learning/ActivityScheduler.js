const MASTERY_PRIORITY = Object.freeze({ REVIEW: 7, PRACTISING: 5, INTRODUCED: 3, NOT_INTRODUCED: 2, RELIABLE: 1, MASTERED: 0 });

function skillsOf(definition) {
  return [...new Set([...(definition.skills ?? []), ...(definition.skill ? [definition.skill] : []), ...(definition.adaptiveSkill ? [definition.adaptiveSkill] : [])])].filter(Boolean);
}

export class ActivityScheduler {
  constructor(game, { clock = () => Date.now(), maxHistory = 24 } = {}) {
    this.game = game;
    this.clock = clock;
    this.maxHistory = maxHistory;
    this.history = [];
  }

  record(activityOrId) {
    const definition = typeof activityOrId === 'string' ? this.game.activityEngine?.get?.(activityOrId) : activityOrId;
    if (!definition) return false;
    this.history.push({ id: definition.id, type: definition.type, skills: skillsOf(definition), character: definition.character ?? null, theme: definition.theme ?? definition.world ?? null, rewardTheme: definition.rewardTheme ?? null, stimulation: Number(definition.stimulation ?? 1), timestamp: this.clock() });
    if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
    return true;
  }

  score(definition, { world = null, character = null } = {}) {
    const learning = this.game.learning;
    const skills = skillsOf(definition);
    let score = 0;

    // 1–3. Reinforcement, ready new skills and spaced review.
    for (const id of skills) {
      const skill = learning?.getSkill?.(id);
      if (!skill) continue;
      score += MASTERY_PRIORITY[skill.masteryState] ?? 0;
      if (skill.attempts === 0) score += 2.5;
      if (skill.lastPractisedAt) {
        const days = Math.max(0, (this.clock() - skill.lastPractisedAt) / 86400000);
        if (days >= 7) score += Math.min(4, days / 7);
      }
    }

    // 4–5. Interaction variety and adventure/world context.
    const recent = this.history.slice(-6);
    if (world && (definition.world === world || definition.theme === world)) score += 5;
    if (character && definition.character === character) score += 2;
    if (!recent.some(item => item.type === definition.type)) score += 2.5;

    // 6–7. Avoid duplication and overstimulation.
    const last = recent.at(-1);
    const lastTwo = recent.slice(-2);
    if (last?.id === definition.id) score -= 12;
    if (lastTwo.length === 2 && lastTwo.every(item => item.type === definition.type)) score -= 9;
    if (last?.character && last.character === definition.character) score -= 2.5;
    if (last?.rewardTheme && last.rewardTheme === definition.rewardTheme) score -= 2;
    const samePresentation = recent.filter(item => item.type === definition.type && item.skills.join('|') === skills.join('|')).length;
    score -= samePresentation * 1.5;
    const intensity = Number(definition.stimulation ?? 1);
    const recentIntensity = recent.slice(-3).reduce((sum,item)=>sum + (item.stimulation ?? 1),0);
    if (intensity >= 3 && recentIntensity >= 7) score -= 4;

    return score;
  }

  choose({ world = null, character = null, excludeIds = [], candidates = null } = {}) {
    const excluded = new Set(excludeIds);
    const list = (candidates ?? this.game.activityEngine?.list?.() ?? []).filter(def => !excluded.has(def.id));
    if (!list.length) return null;
    return [...list].sort((a,b) => {
      const delta = this.score(b,{world,character}) - this.score(a,{world,character});
      return delta || a.id.localeCompare(b.id);
    })[0] ?? null;
  }

  pickNext(currentId, options = {}) {
    const current = this.game.activityEngine?.get?.(currentId);
    const world = options.world ?? current?.world ?? current?.theme ?? null;
    return this.choose({ ...options, world, excludeIds: [...(options.excludeIds ?? []), currentId] })?.id ?? this.game.activityEngine?.nextId?.(currentId) ?? null;
  }

  previewSession(count = 12, options = {}) {
    const original = [...this.history]; const chosen = [];
    for (let i=0;i<count;i++) { const next=this.choose(options); if(!next) break; chosen.push(next.id); this.record(next); }
    this.history = original; return chosen;
  }
}
