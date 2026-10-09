export const RELEASE_MANUAL_CHECKS = Object.freeze([
  { id:'child-age-2', group:'CHILD', label:'Age 2 independent child test' },
  { id:'child-age-3', group:'CHILD', label:'Age 3 independent child test' },
  { id:'child-age-4', group:'CHILD', label:'Age 4 independent child test' },
  { id:'child-age-5', group:'CHILD', label:'Age 5 independent child test' },
  { id:'child-independence', group:'CHILD', label:'Gate 4: core activities understood without coaching' },
  { id:'first-returning-profiles', group:'EXPERIENCE', label:'First + returning + multiple-profile walkthrough' },
  { id:'hint-recovery', group:'EXPERIENCE', label:'Hint recovery walkthrough' },
  { id:'reward-freeplay', group:'EXPERIENCE', label:'Reward use + free play walkthrough' },
  { id:'ipad-performance', group:'DEVICE', label:'Modern iPad sustained performance' },
  { id:'android-performance', group:'DEVICE', label:'Supported Android tablet sustained performance' },
  { id:'lite-performance', group:'DEVICE', label:'Weak-device Lite mode stays playable at 30 FPS' },
  { id:'offline-cold-start', group:'DEVICE', label:'Offline cold-start on installed tablet build' },
  { id:'install-update-reinstall', group:'DEVICE', label:'Install / update / reinstall behaviour' },
  { id:'prior-save-migration', group:'DEVICE', label:'Real prior-build save migration' },
  { id:'low-storage', group:'DEVICE', label:'Low-storage behaviour on device' },
  { id:'suspend-resume', group:'DEVICE', label:'Suspend/resume during drag, voice, reward and save' },
  { id:'parent-walkthrough', group:'PARENT', label:'Profiles / settings / progress / privacy walkthrough' },
  { id:'purchase-gate', group:'PARENT', label:'Purchase gate', defaultStatus:'na', defaultNote:'Commerce is disabled in the current build.' },
  { id:'privacy-legal', group:'PARENT', label:'Store/legal privacy wording reviewed' }
]);

// Checks a computer ran on this build in real Chrome at tablet sizes before release (Job 08: npm run qa:tablet and
// npm run qa:release). They are evidence, not a replacement: the matching device item in the RELEASE list shows
// "COMPUTER ✓" but stays for a person to confirm on the real tablet.
export const BUILD_QA = Object.freeze({
  job: 'Job 08', date: '2026-10-09',
  checks: Object.freeze([
    { id: 'tablet-playthrough', label: 'Every world and mission played start to finish (iPad, Android, phone sizes)', status: 'pass', detail: 'all 8 worlds, 46 missions, island, Collection, Looks, Parent area' },
    { id: 'offline', manualId: 'offline-cold-start', label: 'Offline reload keeps the game and the world just played', status: 'pass', detail: 'also when the tablet goes offline straight after the first visit' },
    { id: 'save-migration', manualId: 'prior-save-migration', label: 'Saves from older builds load with progress and rewards', status: 'pass', detail: 'build history M29 fix 1 and the live build' },
    { id: 'lite-30fps', manualId: 'lite-performance', label: 'Lite mode 30 FPS pacing fixed; frame cost fits on every world', status: 'warn', detail: 'drawing a frame takes 1–26 ms of the 33 ms allowed with the PC slowed 4×, but the PC test browser itself stalls at random — measure on the real tablet' },
    { id: 'toddler-rules', manualId: 'hint-recovery', label: 'Instructions spoken + repeated after 8 s; hint after 2 misses', status: 'pass', detail: 'every activity type' }
  ])
});

export const RELEASE_STATUSES = Object.freeze(['pending','pass','fail','na']);

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function safeString(value, fallback='unknown') { try { return String(value ?? fallback); } catch { return fallback; } }
function finite(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }

function defaultState() {
  const manual = Object.fromEntries(RELEASE_MANUAL_CHECKS.map(item => [item.id, {
    status:item.defaultStatus ?? 'pending',
    note:item.defaultNote ?? '',
    updatedAt:null
  }]));
  return { version:1, manual, snapshots:[], automated:null, updatedAt:null };
}

export class ReleaseQualification {
  constructor({ game=null, save=game?.save ?? null, navigatorRef=globalThis.navigator, screenRef=globalThis.screen, windowRef=globalThis.window, documentRef=globalThis.document, clock=()=>Date.now() } = {}) {
    this.game = game;
    this.save = save;
    this.navigatorRef = navigatorRef;
    this.screenRef = screenRef;
    this.windowRef = windowRef;
    this.documentRef = documentRef;
    this.clock = clock;
    this.state = defaultState();
  }

  async init() {
    const saved = this.save?.getReleaseQualification?.();
    if (saved) this.state = this.normalize(saved);
    else await this.persist();
    return this.getState();
  }

  normalize(saved) {
    const base = defaultState();
    const state = { ...base, ...(saved ?? {}) };
    state.manual = { ...base.manual, ...(saved?.manual ?? {}) };
    for (const check of RELEASE_MANUAL_CHECKS) state.manual[check.id] = { ...base.manual[check.id], ...(state.manual[check.id] ?? {}) };
    state.snapshots = Array.isArray(saved?.snapshots) ? saved.snapshots.slice(-12) : [];
    state.automated = saved?.automated && typeof saved.automated === 'object' ? clone(saved.automated) : null;
    return state;
  }

  getState() { return clone(this.state); }
  getManualChecks() { return RELEASE_MANUAL_CHECKS.map(item => ({ ...item, ...(this.state.manual[item.id] ?? {}), computer: BUILD_QA.checks.find(c => c.manualId === item.id) ?? null })); }

  summary() {
    const checks = this.getManualChecks();
    const counts = checks.reduce((m,item)=>(m[item.status]=(m[item.status]??0)+1,m),{});
    const automated = this.state.automated?.checks ?? [];
    const autoCounts = automated.reduce((m,item)=>(m[item.status]=(m[item.status]??0)+1,m),{});
    return {
      manual: { total:checks.length, pass:counts.pass??0, fail:counts.fail??0, pending:counts.pending??0, na:counts.na??0 },
      automated: { total:automated.length, pass:autoCounts.pass??0, fail:autoCounts.fail??0, warn:autoCounts.warn??0 },
      ready: (counts.fail??0)===0 && (counts.pending??0)===0 && (autoCounts.fail??0)===0 && automated.length>0
    };
  }

  async setManualStatus(id, status='pending', note='') {
    if (!RELEASE_MANUAL_CHECKS.some(item => item.id===id)) return false;
    if (!RELEASE_STATUSES.includes(status)) return false;
    this.state.manual[id] = { status, note:String(note??'').slice(0,240), updatedAt:this.clock() };
    this.state.updatedAt = this.clock();
    await this.persist();
    return true;
  }

  async cycleManualStatus(id) {
    const current = this.state.manual[id]?.status ?? 'pending';
    const next = RELEASE_STATUSES[(RELEASE_STATUSES.indexOf(current)+1) % RELEASE_STATUSES.length];
    await this.setManualStatus(id,next,this.state.manual[id]?.note??'');
    return next;
  }

  async captureDeviceSnapshot() {
    const nav = this.navigatorRef ?? {};
    const win = this.windowRef ?? {};
    const screen = this.screenRef ?? {};
    let storage = null;
    try {
      if (nav.storage?.estimate) storage = await nav.storage.estimate();
    } catch {}
    let persisted = null;
    try {
      if (nav.storage?.persisted) persisted = await nav.storage.persisted();
    } catch {}
    let standalone = Boolean(globalThis.__LL_STANDALONE);
    try { standalone ||= Boolean(win.matchMedia?.('(display-mode: standalone)')?.matches || nav.standalone); } catch {}
    const perf = this.game?.getPerformanceReport?.() ?? null;
    const health = this.game?.save?.getSaveHealth?.() ?? this.save?.getSaveHealth?.() ?? null;
    const snapshot = {
      at:this.clock(),
      build:safeString(globalThis.__LL_BUILD,'development'),
      standalone,
      userAgent:safeString(nav.userAgent,''),
      platform:safeString(nav.userAgentData?.platform ?? nav.platform,''),
      language:safeString(nav.language,''),
      online:nav.onLine !== false,
      viewport:{ width:finite(win.innerWidth), height:finite(win.innerHeight), dpr:finite(win.devicePixelRatio) },
      screen:{ width:finite(screen.width), height:finite(screen.height), availWidth:finite(screen.availWidth), availHeight:finite(screen.availHeight), orientation:safeString(screen.orientation?.type,'') },
      capabilities:{
        serviceWorker:Boolean(nav.serviceWorker), indexedDB:Boolean(globalThis.indexedDB), localStorage:this.canUseLocalStorage(),
        touch:Number(nav.maxTouchPoints)||0, speechSynthesis:Boolean(globalThis.speechSynthesis), fullscreen:Boolean(this.documentRef?.documentElement?.requestFullscreen)
      },
      storage:storage ? { usage:finite(storage.usage), quota:finite(storage.quota), persisted } : { usage:null, quota:null, persisted },
      performance:perf ? clone(perf) : null,
      saveHealth:health ? clone(health) : null,
      runtime:{ errors:Number(this.game?.runtimeErrorCount)||0, suspends:Number(this.game?.suspendCount)||0, resumes:Number(this.game?.resumeCount)||0 }
    };
    this.state.snapshots.push(snapshot);
    this.state.snapshots = this.state.snapshots.slice(-12);
    this.state.updatedAt = this.clock();
    await this.persist();
    return clone(snapshot);
  }

  canUseLocalStorage() {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return false;
      const key='__ll_release_probe__'; storage.setItem(key,'1'); storage.removeItem(key); return true;
    } catch { return false; }
  }

  async runAutomatedChecks() {
    const health = this.game?.save?.getSaveHealth?.() ?? this.save?.getSaveHealth?.() ?? {};
    const perf = this.game?.getPerformanceReport?.() ?? null;
    const assets = this.game?.assets;
    let saveWrite = true;
    try { if (this.save?.persist) saveWrite = (await this.save.persist()) !== false; } catch { saveWrite = false; }
    const check = (id,label,status,detail='') => ({ id,label,status,detail });
    const checks = [
      check('save-ready','Save system initialised',health.ready ? 'pass':'fail',health.memoryOnly?'memory-only fallback':'persistent path available'),
      check('save-write','Save round-trip write',saveWrite ? 'pass':'fail',saveWrite?'write completed':'write failed'),
      check('save-version','Save schema is current',Number(health.saveVersion)>=2 ? 'pass':'fail',`v${health.saveVersion??'?'}`),
      check('asset-load','No asset loader failures',!assets?.failures?.size ? 'pass':'fail',`${assets?.failures?.size??0} failed asset(s)`),
      check('runtime-errors','No recovered runtime errors this session',(Number(this.game?.runtimeErrorCount)||0)===0 ? 'pass':'warn',`${Number(this.game?.runtimeErrorCount)||0} error(s)`),
      check('performance-samples','Performance instrumentation active',perf?.sampleCount>0 ? 'pass':'warn',perf?.sampleCount>0?`${perf.averageFps.toFixed(1)} FPS / ${perf.quality}`:'play for a few seconds to sample'),
      check('privacy-mode','Child build has no commerce enabled',!globalThis.__LL_COMMERCE_ENABLED ? 'pass':'warn',globalThis.__LL_COMMERCE_ENABLED?'commerce enabled — verify parent gate':'commerce disabled'),
      ...BUILD_QA.checks.map(c => check(`build-${c.id}`, `${BUILD_QA.job} computer check: ${c.label}`, c.status, `${c.detail} (${BUILD_QA.date})`)),
      check('standalone-offline','Standalone package is self-contained',globalThis.__LL_STANDALONE ? 'pass':'warn',globalThis.__LL_STANDALONE?'embedded-data build':'installed PWA must be tested offline on device')
    ];
    this.state.automated = { at:this.clock(), build:safeString(globalThis.__LL_BUILD,'development'), checks };
    this.state.updatedAt = this.clock();
    await this.persist();
    return clone(this.state.automated);
  }

  async persist() {
    if (this.save?.setReleaseQualification) await this.save.setReleaseQualification(this.state);
    return true;
  }

  report() {
    return {
      product:'Little Legends: Magic World',
      build:safeString(globalThis.__LL_BUILD,'development'),
      generatedAt:this.clock(),
      summary:this.summary(),
      automated:clone(this.state.automated),
      manual:this.getManualChecks(),
      deviceSnapshots:clone(this.state.snapshots),
      childTestSessions:this.save?.listChildTestSessions?.() ?? [],
      saveHealth:this.save?.getSaveHealth?.() ?? null
    };
  }
}
