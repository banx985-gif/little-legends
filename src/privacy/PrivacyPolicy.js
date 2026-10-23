// What Little Legends promises parents, and exactly what it keeps (shown in Parent Area → PRIVACY and in privacy.html).
// Keep these three lists and privacy.html saying the same thing.
export const PRIVACY_GUARANTEES = Object.freeze([
  { id:'nothing-leaves', title:'Nothing about your child leaves this device', detail:'No accounts, servers, analytics or trackers. The only internet use is Google Play checking the one-time unlock (Android app only).' },
  { id:'local-save', title:'Progress stays on this device', detail:'Profiles, progress, rewards, pictures and settings are saved only in this browser or app on this tablet.' },
  { id:'minimal-data', title:'Only a first name or nickname', detail:'A profile is a name or nickname, an age (2–5), a language and a favourite colour. No email, no photos, no birthday.' },
  { id:'no-ads', title:'No ads', detail:'No advertising anywhere, and learning activity is never used to target anything.' },
  { id:'no-links', title:'No links out of the game', detail:'Child play contains no links, web pages or app stores. Grown-up tools are behind the Parent Gate.' },
  { id:'no-chat', title:'No chat or public profile', detail:'Children cannot message anyone, share anything or appear anywhere public.' },
  { id:'no-sensors', title:'No camera, microphone or location', detail:'The game never asks for them. Spoken words use the tablet’s own speech voice.' },
  { id:'purchases', title:'One optional unlock, for grown-ups', detail:'Free to try. One payment through Google Play unlocks everything, only in the Parent Area after a grown-up check. No coins, no ads, no repeat buying; children never see a price.' }
]);

// Everything the game saves, in plain words (Parent Area → PRIVACY lists these; DATA can export or delete them).
export const STORED_DATA = Object.freeze([
  { id:'profiles', title:'Child profiles', detail:'first name or nickname, age 2–5, language, favourite colour' },
  { id:'progress', title:'Play progress', detail:'missions finished and where a mission was left, Discovery Stars, eggs' },
  { id:'rewards', title:'Rewards and island', detail:'friends, Pip’s looks, decorations, rides, where things stand on Wonder Island' },
  { id:'pictures', title:'My Pictures', detail:'the child’s own colouring pages, as pictures on this tablet only' },
  { id:'unlock', title:'Full-game unlock', detail:'whether this tablet has the full game (Google Play keeps the purchase with the grown-up’s Google account)' },
  { id:'learning', title:'Learning record', detail:'which skills were practised, right/try-again counts and hints, used only to pick the next activity' },
  { id:'settings', title:'Family settings', detail:'volumes, quiet mode, motion, text size, colour symbols, break reminder, picture quality' },
  { id:'grown-up', title:'Grown-up tools (only if used)', detail:'test-session notes and the release checklist from the TEST and RELEASE tabs' },
  { id:'files', title:'Game files', detail:'the game’s own pictures and code, kept so it works offline (no personal data)' }
]);

export const NOT_COLLECTED = 'Never collected: email, photos, voice, location, contacts, device IDs, usage analytics.';

export const PRIVACY_POLICY_VERSION = '1.2';
export function privacySummary(){ return PRIVACY_GUARANTEES.map(item => ({...item})); }
