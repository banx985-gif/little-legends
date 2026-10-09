// Lists every picture in assets/art_manifest.json that the game never draws (Job 10).
//   npm run art:unused            (list them, grouped by folder)
//   npm run art:unused -- --json  (machine-readable)
// A picture counts as used when its id appears in data/*.json or in src/ code, or matches an id pattern in the data
// ("{l}" letters, "{n}" numbers, "{theme}"/"{frame}" hatch frames…). Pictures left unused on purpose are in KEEP_UNUSED.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Delivered but deliberately not in the game yet (see docs/JOB10_REPORT.md).
export const KEEP_UNUSED = [
  [/^characters\.explorer\./, 'Explorer boy: his role in the game is not decided yet'],
  [/^characters\.pip\.pip_part_(amulet|foot|paw|tail)$/, 'Pip rig parts: for a future jointed Pip, the game uses the whole-pose pictures'],
  [/^worlds\.scenes\./, 'Small scene cards: the game uses the full-screen backgrounds instead']
];

function walkFiles(dir, ext, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, ext, out);
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

function collectStrings(value, out) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { out.push(k); collectStrings(v, out); }
  return out;
}

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function findUnusedArt(base = root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'assets/art_manifest.json'), 'utf8'));
  const strings = [];
  for (const file of walkFiles(path.join(base, 'data'), '.json')) collectStrings(JSON.parse(fs.readFileSync(file, 'utf8')), strings);
  for (const file of walkFiles(path.join(base, 'src'), '.js')) strings.push(...(fs.readFileSync(file, 'utf8').match(/[A-Za-z0-9_.{}$]+/g) ?? []));
  const exact = new Set(strings);
  // "objects.numbers.num_{n}" or `objects.x.${name}` -> a pattern that matches the ids it can build.
  const patterns = [...new Set(strings.filter(s => /\{[a-z]+\}|\$\{/.test(s) && s.includes('.')))]
    .map(s => new RegExp('^' + s.split(/\{[a-z]+\}|\$\{[^}]*\}/).map(escape).join('[A-Za-z0-9_]+') + '$'));
  const unused = [], kept = [];
  for (const { id } of manifest) {
    if (exact.has(id) || patterns.some(p => p.test(id))) continue;
    const why = KEEP_UNUSED.find(([p]) => p.test(id))?.[1];
    (why ? kept : unused).push(why ? { id, why } : { id });
  }
  return { total: manifest.length, unused, kept };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = findUnusedArt();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }
  const groups = {};
  for (const { id } of result.unused) (groups[id.split('.').slice(0, -1).join('.')] ??= []).push(id.split('.').at(-1));
  console.log(`${result.total} pictures; ${result.total - result.unused.length - result.kept.length} used, ${result.kept.length} left out on purpose, ${result.unused.length} unused.`);
  for (const [group, names] of Object.entries(groups)) console.log(`  ${group} (${names.length}): ${names.join(', ')}`);
  const why = {};
  for (const k of result.kept) why[k.why] = (why[k.why] ?? 0) + 1;
  for (const [reason, n] of Object.entries(why)) console.log(`  left out (${n}): ${reason}`);
}
