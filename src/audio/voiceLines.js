// Recorded voice lines (Job 14). Every spoken line gets a stable file name from its words:
//   assets/audio/voice/<character>/<line_id>.ogg
// e.g. "Let's go on a Dino Picnic!" -> lets_go_on_a_dino_picnic_1a2b3
// docs/VOICE_LINES.csv lists them all (npm run voice:lines). A line with a file plays the recording; otherwise the device voice.
export function voiceLineId(text) {
  const raw = String(text ?? '').trim();
  const words = raw.normalize('NFKD').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 6).join('_') || 'line';
  let h = 2166136261;
  for (const ch of raw) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return `${words}_${h.toString(16).padStart(8, '0').slice(-5)}`;
}

// Who speaks a line. Pip narrates everything for now; guides can get their own folders later.
export const DEFAULT_SPEAKER = 'pip';
