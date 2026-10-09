// Every line the game speaks, for recording (Job 14).
//   npm run voice:lines
// 1. Writes docs/VOICE_LINES.csv: character, line_id, text, where. Record each line as
//    assets/audio/voice/<character>/<line_id>.ogg (mono Ogg, levelled like the other sounds).
// 2. Writes assets/audio/voice/index.json: the recordings that exist, so the game only asks for files that are there.
//    Run it again after adding recordings.
// Lines that contain a child's name are made on the fly and always use the device voice.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = p => import(pathToFileURL(path.join(root, p)).href);
const { voiceLineId, DEFAULT_SPEAKER } = await imp('src/audio/voiceLines.js');
const { ActivityEngine } = await imp('src/activities/ActivityEngine.js');

export async function collectVoiceLines() {
  const lines = new Map();
  const add = (text, where) => { const t = String(text ?? '').trim(); if (!t || /\{|\$\{/.test(t)) return; const id = voiceLineId(t); if (!lines.has(id)) lines.set(id, { character: DEFAULT_SPEAKER, id, text: t, where: new Set() }); lines.get(id).where.add(where); };
  const activities = JSON.parse(fs.readFileSync(path.join(root, 'data/activities.json'), 'utf8'));
  const adventures = JSON.parse(fs.readFileSync(path.join(root, 'data/adventures.json'), 'utf8'));
  // Activities: what Pip says at the start, each thing asked for (tap games), and sounds spoken as words.
  const said = [];
  const host = { pip: { say: (_id, o) => said.push(o?.text), react() {}, lookAt() {}, clearQueue() {} }, completeActivity() {}, getLearningAssistance: () => ({}) };
  const engine = new ActivityEngine({ save: null, learning: { recordResponse() {}, getSkill: () => null } }); engine.setDefinitions(activities);
  for (const def of activities.activities) {
    if (def.dynamic) continue; // uses the child's name
    said.length = 0;
    try {
      const a = engine.create(def.id, host); a.start();
      if (typeof a.sayRequest === 'function') for (let i = 0; i < (a.remaining?.length ?? 0); i++) { a.targetIndex = i; a.sayRequest(); }
      add(a.spokenInstruction?.(), def.id);
    } catch {}
    for (const t of said) add(t, def.id);
    add(def.promptText, def.id);
    add(def.retryVoice, def.id);
  }
  // Little Missions: each story page (its voice line, or its title when it has none).
  for (const a of adventures.adventures) for (const s of a.steps) if (s.kind !== 'activity') add(s.voice ?? s.title, a.id);
  // Fixed lines in the code: counting numbers, "try again", "we did it", the island's first-steps lines.
  for (let n = 1; n <= 20; n++) add(String(n), 'counting');
  for (const file of fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(root, 'src', file), 'utf8');
    for (const m of src.matchAll(/text:\s*(?:[^'"`,}]*\?\s*)?'([^'\\]{3,})'/g)) add(m[1], file.replaceAll('\\', '/'));
    // text: cond ? 'A.' : 'B.' — every sentence-like string inside a text: value.
    for (const m of src.matchAll(/text:([^\n]{0,240}?)(?:,\s*bubbleText|\}\))/g)) for (const q of m[1].matchAll(/'([^'\\]{3,}[.!?])'/g)) add(q[1], file.replaceAll('\\', '/'));
  }
  return [...lines.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const csv = v => `"${String(v).replaceAll('"', '""')}"`;
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lines = await collectVoiceLines();
  fs.writeFileSync(path.join(root, 'docs/VOICE_LINES.csv'), ['character,line_id,text,where', ...lines.map(l => [l.character, l.id, l.text, [...l.where].slice(0, 4).join(' ')].map(csv).join(','))].join('\n') + '\n');
  const dir = path.join(root, 'assets/audio/voice');
  const have = fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map(f => String(f).replaceAll('\\', '/')).filter(f => f.endsWith('.ogg')).map(f => f.slice(0, -4)).sort() : [];
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(have, null, 2) + '\n');
  console.log(`${lines.length} spoken lines -> docs/VOICE_LINES.csv; ${have.length} recordings in assets/audio/voice/index.json`);
}
