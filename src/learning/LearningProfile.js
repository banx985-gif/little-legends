export const MASTERY_STATES = Object.freeze({
  NOT_INTRODUCED: 'NOT_INTRODUCED',
  INTRODUCED: 'INTRODUCED',
  PRACTISING: 'PRACTISING',
  RELIABLE: 'RELIABLE',
  MASTERED: 'MASTERED',
  REVIEW: 'REVIEW'
});

export const TRACKED_SKILLS = Object.freeze({
  COUNT_1: 'Count 1',
  COUNT_2: 'Count 2',
  COUNT_3: 'Count 3',
  COUNT_4: 'Count 4',
  COUNT_5: 'Count 5',
  COUNT_6: 'Count 6',
  COUNT_7: 'Count 7',
  COUNT_8: 'Count 8',
  COUNT_9: 'Count 9',
  COUNT_10: 'Count 10',
  NUMERAL_1: 'Numeral 1',
  NUMERAL_2: 'Numeral 2',
  NUMERAL_3: 'Numeral 3',
  NUMERAL_4: 'Numeral 4',
  NUMERAL_5: 'Numeral 5',
  NUMERAL_6: 'Numeral 6',
  NUMERAL_7: 'Numeral 7',
  NUMERAL_8: 'Numeral 8',
  NUMERAL_9: 'Numeral 9',
  NUMERAL_10: 'Numeral 10',
  MORE_LESS: 'More / less',
  SAME_AMOUNT: 'Same amount',
  ADDITION_PREP: 'Addition preparation',
  SEQUENCE: 'Sequences',
  RED: 'Red',
  BLUE: 'Blue',
  YELLOW: 'Yellow',
  GREEN: 'Green',
  ORANGE: 'Orange',
  PURPLE: 'Purple',
  CIRCLE: 'Circle',
  SQUARE: 'Square',
  TRIANGLE: 'Triangle',
  RECTANGLE: 'Rectangle',
  PATTERN: 'Patterns',
  BIG_SMALL: 'Big / small',
  SAME_DIFFERENT: 'Same / different',
  ANIMAL_NAMES: 'Animal names',
  ANIMAL_SOUNDS: 'Animal sounds',
  HABITATS: 'Habitats',
  BABY_PARENT: 'Baby / parent',
  LAND_WATER_AIR: 'Land / water / air',
  ANIMAL_FOOD: 'Animal food',
  BODY_FEATURES: 'Body features',
  CLASSIFICATION: 'Classification',
  RHYTHM: 'Rhythm',
  FAST_SLOW: 'Fast / slow',
  LOUD_QUIET: 'Loud / quiet',
  SOUND_RECOGNITION: 'Sound recognition',
  VOCABULARY: 'Vocabulary',
  LETTER_RECOGNITION: 'Letter recognition',
  UPPER_LOWER: 'Upper / lowercase',
  FIRST_SOUNDS: 'First sounds',
  NAME_LETTER: 'Name letter',
  HAND_WASHING: 'Hand washing',
  TEETH_BRUSHING: 'Teeth brushing',
  WEATHER_CLOTHES: 'Weather clothes',
  TOY_SORTING: 'Toy sorting',
  FEELINGS: 'Feelings',
  HELPING: 'Helping',
  ROUTINES: 'Simple routines',
  COMMUNITY_HELPERS: 'Community helpers and their vehicles',
  ROAD_SAFETY: 'Road safety (stop and go)',
  LETTER_A: 'Letter A',
  LETTER_B: 'Letter B',
  LETTER_C: 'Letter C',
  LETTER_D: 'Letter D',
  LETTER_E: 'Letter E',
  LETTER_F: 'Letter F',
  LETTER_G: 'Letter G',
  LETTER_H: 'Letter H',
  LETTER_I: 'Letter I',
  LETTER_J: 'Letter J',
  LETTER_K: 'Letter K',
  LETTER_L: 'Letter L',
  LETTER_M: 'Letter M',
  LETTER_N: 'Letter N',
  LETTER_O: 'Letter O',
  LETTER_P: 'Letter P',
  LETTER_Q: 'Letter Q',
  LETTER_R: 'Letter R',
  LETTER_S: 'Letter S',
  LETTER_T: 'Letter T',
  LETTER_U: 'Letter U',
  LETTER_V: 'Letter V',
  LETTER_W: 'Letter W',
  LETTER_X: 'Letter X',
  LETTER_Y: 'Letter Y',
  LETTER_Z: 'Letter Z',
});

const OUTCOMES = new Set(['success', 'incorrect']);
const RECENT_WINDOW = 8;

function makeSkill(id) {
  return {
    id,
    label: TRACKED_SKILLS[id],
    attempts: 0,
    independentSuccesses: 0,
    hintAssistedSuccesses: 0,
    incorrectAttempts: 0,
    recentAccuracy: 0,
    lastPractisedAt: null,
    masteryState: MASTERY_STATES.NOT_INTRODUCED,
    _recent: []
  };
}

function publicSkill(record) {
  const { _recent, ...value } = record;
  return { ...value };
}

export class LearningProfile {
  constructor({ clock = () => Date.now(), maxEvents = 250 } = {}) {
    this.clock = clock;
    this.maxEvents = maxEvents;
    this.skills = new Map(Object.keys(TRACKED_SKILLS).map(id => [id, makeSkill(id)]));
    this.events = [];
    this.hintEvents = [];
    this.sessionStartedAt = this.clock();
    this.eventSequence = 0;
  }

  isTrackedSkill(id) { return this.skills.has(id); }

  recordResponse({ activityId = null, skillIds = [], outcome, assisted = false, hintLevel = 0, responseTimeMs = null, correction = false, timestamp = this.clock() } = {}) {
    if (!OUTCOMES.has(outcome)) throw new Error(`Unsupported learning outcome: ${outcome}`);
    const uniqueSkills = [...new Set(skillIds)].filter(id => this.skills.has(id));
    if (!uniqueSkills.length) return null;

    const event = Object.freeze({
      id: `attempt-${++this.eventSequence}`,
      timestamp,
      activityId,
      skillIds: Object.freeze(uniqueSkills),
      outcome,
      assisted: Boolean(assisted),
      hintLevel: Math.max(0, Number(hintLevel) || 0),
      responseTimeMs: Number.isFinite(responseTimeMs) ? Math.max(0, responseTimeMs) : null,
      correction: Boolean(correction)
    });

    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
    for (const skillId of uniqueSkills) this.applyEvent(this.skills.get(skillId), event);
    return event;
  }

  recordHint({ activityId = null, level = 1, skillIds = [], timestamp = this.clock() } = {}) {
    const event = Object.freeze({
      id: `hint-${++this.eventSequence}`,
      timestamp,
      activityId,
      skillIds: Object.freeze([...new Set(skillIds)].filter(id => this.skills.has(id))),
      level: Math.max(1, Math.min(5, Number(level) || 1))
    });
    this.hintEvents.push(event);
    if (this.hintEvents.length > this.maxEvents) this.hintEvents.splice(0, this.hintEvents.length - this.maxEvents);
    return event;
  }

  getHintEvents() { return this.hintEvents.map(event => ({ ...event, skillIds: [...event.skillIds] })); }

  applyEvent(skill, event) {
    const previousState = skill.masteryState;
    skill.attempts++;
    skill.lastPractisedAt = event.timestamp;
    if (event.outcome === 'success') {
      if (event.assisted) skill.hintAssistedSuccesses++;
      else skill.independentSuccesses++;
      skill._recent.push(1);
    } else {
      skill.incorrectAttempts++;
      skill._recent.push(0);
    }
    if (skill._recent.length > RECENT_WINDOW) skill._recent.shift();
    skill.recentAccuracy = skill._recent.reduce((sum, value) => sum + value, 0) / skill._recent.length;
    skill.masteryState = this.calculateMastery(skill, previousState);
  }

  calculateMastery(skill, previousState) {
    if (skill.attempts === 0) return MASTERY_STATES.NOT_INTRODUCED;

    // The milestone defines the states but not transition thresholds. These are
    // deliberately conservative V1 implementation thresholds and can be tuned
    // after child playtesting without changing the stored skill schema.
    if ((previousState === MASTERY_STATES.MASTERED || previousState === MASTERY_STATES.RELIABLE)
        && skill._recent.length >= 4 && skill.recentAccuracy < 0.5) return MASTERY_STATES.REVIEW;
    if (skill.independentSuccesses >= 5 && skill.recentAccuracy >= 0.9) return MASTERY_STATES.MASTERED;
    if ((skill.independentSuccesses + skill.hintAssistedSuccesses) >= 3 && skill.recentAccuracy >= 0.75) return MASTERY_STATES.RELIABLE;
    if (skill.attempts >= 3) return MASTERY_STATES.PRACTISING;
    return MASTERY_STATES.INTRODUCED;
  }

  getSkill(id) {
    const skill = this.skills.get(id);
    return skill ? publicSkill(skill) : null;
  }

  getAllSkills() { return [...this.skills.values()].map(publicSkill); }

  getAttemptEvents() { return this.events.map(event => ({ ...event, skillIds: [...event.skillIds] })); }

  getSessionReport() {
    const attempted = [...this.skills.values()].filter(skill => skill.attempts > 0).map(publicSkill);
    const assistedEvents = this.events.filter(event => event.assisted);
    return {
      sessionStartedAt: this.sessionStartedAt,
      eventCount: this.events.length,
      attemptedSkills: attempted,
      attemptedSkillIds: attempted.map(skill => skill.id),
      assistanceUsed: assistedEvents.length > 0,
      assistedEventCount: assistedEvents.length,
      hintCount: this.hintEvents.length,
      maxHintLevel: this.hintEvents.reduce((max, event) => Math.max(max, event.level), 0)
    };
  }


  snapshot() {
    return {
      version: 1,
      skills: Object.fromEntries([...this.skills.entries()].map(([id, skill]) => [id, { ...skill, _recent: [...skill._recent] }])),
      events: this.getAttemptEvents(),
      hintEvents: this.getHintEvents(),
      eventSequence: this.eventSequence
    };
  }

  restore(snapshot) {
    if (!snapshot?.skills) return false;
    for (const id of this.skills.keys()) {
      const saved = snapshot.skills[id];
      if (!saved) continue;
      this.skills.set(id, { ...makeSkill(id), ...saved, _recent: Array.isArray(saved._recent) ? saved._recent.slice(-RECENT_WINDOW) : [] });
    }
    this.events = Array.isArray(snapshot.events) ? snapshot.events.slice(-this.maxEvents).map(event => Object.freeze({ ...event, skillIds: Object.freeze([...(event.skillIds ?? [])]) })) : [];
    this.hintEvents = Array.isArray(snapshot.hintEvents) ? snapshot.hintEvents.slice(-this.maxEvents).map(event => Object.freeze({ ...event, skillIds: Object.freeze([...(event.skillIds ?? [])]) })) : [];
    this.eventSequence = Number(snapshot.eventSequence) || this.events.length + this.hintEvents.length;
    return true;
  }

  resetSession() {
    this.events.length = 0;
    this.hintEvents.length = 0;
    this.sessionStartedAt = this.clock();
  }
}
