export const PRIVACY_GUARANTEES = Object.freeze([
  { id:'no-ads', title:'No child-mode ads', detail:'Little Legends does not show advertising in child play.' },
  { id:'no-links', title:'No child-mode external links', detail:'Child play contains no links that leave the app.' },
  { id:'no-chat', title:'No chat or public profile', detail:'Children cannot message strangers, publish content or appear in a public directory.' },
  { id:'local-save', title:'Progress stays local', detail:'Profiles, learning progress, rewards and settings are saved on this device.' },
  { id:'minimal-data', title:'Only simple profile information', detail:'V1 uses a first name or nickname, age band 2–5 and local preferences. No account is required.' },
  { id:'no-behavioural-ads', title:'No behavioural advertising', detail:'Learning activity is not used to target advertising.' },
  { id:'no-sensors', title:'No camera or microphone required', detail:'Gameplay does not request camera or microphone access. Spoken instructions use playback/system speech only.' },
  { id:'purchases', title:'Purchases are not enabled', detail:'This build has no child purchase flow. Any future purchase surface must remain behind the Parent Gate.' }
]);

export const PRIVACY_POLICY_VERSION = '1.0';
export function privacySummary(){ return PRIVACY_GUARANTEES.map(item => ({...item})); }
