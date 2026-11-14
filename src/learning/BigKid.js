// Job 19 step 5: "Bigger challenge" for 4–5 year olds (Parent Area switch, per child; part of the full game).
// The same missions and activities, set harder when the switch is on:
// - Counting: count on to bigger numbers, up to 20 (some are already in the basket: "There are 6. Add more and count to 12").
// - Letters: find the WORD that starts with the letter, instead of the letter itself.
// - Patterns: 3-step patterns (red, blue, yellow, red, blue, …?) instead of 2-step ones.
// - Tap the thing: two more things to choose from.
export const BIG_KID_MIN_AGE = 4, COUNT_MAX = 20;

// Short words with a picture word card, by first letter (the game's own 'word' cards draw the word; no new art).
const WORDS = { A: 'Apple', B: 'Ball', C: 'Cat', D: 'Dog', E: 'Egg', F: 'Fish', G: 'Goat', H: 'Hat', I: 'Ink', J: 'Jam', K: 'Kite', L: 'Leaf', M: 'Moon', N: 'Nest', O: 'Owl', P: 'Pig', Q: 'Queen', R: 'Rain', S: 'Sun', T: 'Tree', U: 'Up', V: 'Van', W: 'Web', X: 'Box', Y: 'Yak', Z: 'Zoo' };
const COLOURS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];
const clone = v => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

// Whether the bigger challenge is on for the child playing now (needs the switch, age 4+, and the full game).
export function bigKidOn(game) {
  const save = game?.save, profile = save?.getActiveProfile?.(), st = save?.getProfileState?.();
  if (!st?.settings?.bigKid || (profile?.age ?? 0) < BIG_KID_MIN_AGE) return false;
  return !game.unlock || game.unlock.isUnlocked?.() !== false;
}

export function harder(definition) {
  if (!definition || definition.bigKid) return definition;
  const d = clone(definition); d.bigKid = true;
  if (d.type === 'CountAndPlace') {
    const base = Math.max(1, Number(d.targetCount) || 3), target = Math.min(COUNT_MAX, Math.max(base + 5, base * 2)), add = Math.min(10, base); // the child still drags as many as before, counting on from a bigger number
    d.targetCount = target; d.startingCount = target - add;
    d.instructionText = `Count to ${target}!`; d.subtitle = `There are ${d.startingCount}. Add more and count.`;
    d.voiceText = `There are ${d.startingCount}. Add more and count all the way to ${target}!`; delete d.completeDetail; delete d.adaptive;
    d.skills = [...new Set([...(d.skills ?? []), 'ADDITION_PREP'])];
    return d;
  }
  if (d.type === 'TapRequestedObject' && Array.isArray(d.objects) && d.objects.every(o => o.kind === 'letter') && Array.isArray(d.targets) && d.targets.every(t => t.kind === 'letter')) {
    d.objects = d.objects.map(o => { const L = String(o.value).toUpperCase(), w = WORDS[L] ?? L; return { ...o, kind: 'word', symbol: w.toUpperCase(), label: w, firstSound: L, value: undefined }; });
    d.targets = d.targets.map(t => ({ firstSound: String(t.value).toUpperCase() }));
    d.instructionText = 'Which word starts with {target}?'; d.subtitle = 'Letters make words!'; delete d.voiceText;
    d.skills = [...new Set([...(d.skills ?? []), 'FIRST_SOUNDS'])];
    return d;
  }
  if (d.type === 'TapRequestedObject' && d.request && Array.isArray(d.objects) && d.objects.length <= 5 && !d.objects.some(o => o.kind === 'letter' || o.kind === 'word')) {
    const matches = o => Object.entries(d.request).every(([k, v]) => v == null || String(o[k] ?? '').toLowerCase() === String(v).toLowerCase());
    const others = d.objects.filter(o => !matches(o));
    const spots = [{ x: 760, y: 880 }, { x: 1160, y: 880 }];
    others.slice(0, 2).forEach((o, i) => d.objects.push({ ...o, id: `${o.id ?? o.kind}-more-${i}`, ...spots[i] }));
    return d;
  }
  if (d.type === 'PatternComplete' && Array.isArray(d.sequence) && d.sequence.length <= 4 && Array.isArray(d.choices)) {
    const [a, b] = d.sequence; if (!a || !b || (a.kind === b.kind && a.color === b.color)) return d;
    const colour = COLOURS.find(c => c !== a.color && c !== b.color) ?? 'green', c = { kind: a.kind, color: colour };
    d.sequence = [a, b, c, a, b]; d.missingIndex = 5;
    d.choices = [{ id: 'first', ...a }, { id: 'third', ...c, correct: true }, { id: 'second', ...b }];
    delete d.correctId; d.subtitle = 'A 3-step pattern!'; delete d.voiceText;
    d.skills = [...new Set([...(d.skills ?? []), 'PATTERN'])];
    return d;
  }
  return d;
}
