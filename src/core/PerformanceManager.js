const MODES = Object.freeze({
  // maxPixels: the most real pixels the game canvas may have (a weak GPU struggles with a huge canvas whatever the DPR).
  HIGH: Object.freeze({ id:'high', label:'High', targetFps:60, dprCap:2, maxPixels:4.2e6, particleScale:1, effectScale:1, staticCache:true }),
  BALANCED: Object.freeze({ id:'balanced', label:'Balanced', targetFps:60, dprCap:1.5, maxPixels:2.4e6, particleScale:.7, effectScale:.8, staticCache:true }),
  LITE: Object.freeze({ id:'lite', label:'Lite', targetFps:30, dprCap:1.25, maxPixels:1.5e6, particleScale:.4, effectScale:.55, staticCache:true })
});

const RANK = { high:0, balanced:1, lite:2 };
const REMEMBER_KEY = 'littleLegends.autoQuality';
function storage() { try { return globalThis.localStorage ?? null; } catch { return null; } }

// Where 'auto' starts on this device: the slowest mode it needed before (remembered), or Lite on a low-memory
// device (navigator.deviceMemory ≤ 4 GB, e.g. budget Android tablets).
export function autoStartMode({ deviceMemory = globalThis.navigator?.deviceMemory, store = storage() } = {}) {
  let remembered = null;
  try { remembered = store?.getItem?.(REMEMBER_KEY) ?? null; } catch {}
  const lowMemory = Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 4;
  const picks = [remembered, lowMemory ? 'lite' : null].filter(m => m in RANK);
  return picks.sort((a, b) => RANK[b] - RANK[a])[0] ?? 'high';
}

function quantile(values, q) {
  if (!values.length) return 0;
  const copy = [...values].sort((a,b)=>a-b);
  return copy[Math.min(copy.length-1, Math.max(0, Math.floor((copy.length-1)*q)))] ?? 0;
}

export class PerformanceManager {
  constructor({ onQualityChange = null, mode = 'auto', maxSamples = 180, store = storage(), deviceMemory = globalThis.navigator?.deviceMemory } = {}) {
    this.store = store;
    this.deviceMemory = deviceMemory;
    this.firstTestDone = false;
    this.firstTestArmed = false;
    this.onQualityChange = onQualityChange;
    this.requestedMode = mode;
    this.mode = MODES.HIGH;
    this.maxSamples = Math.max(60, Number(maxSamples) || 180);
    this.frameMs = new Float32Array(this.maxSamples);
    this.updateMs = new Float32Array(this.maxSamples);
    this.renderMs = new Float32Array(this.maxSamples);
    this.sampleCount = 0;
    this.cursor = 0;
    this.badWindows = 0;
    this.lastEvaluationAt = 0;
    this.downgradeCount = 0;
    this.suspended = false;
  }

  get quality() { return this.mode; }

  modeFor(requested) {
    const id = requested === 'auto' ? autoStartMode({ deviceMemory: this.deviceMemory, store: this.store }) : requested;
    return id === 'lite' ? MODES.LITE : id === 'balanced' ? MODES.BALANCED : MODES.HIGH;
  }

  // Remember the slowest mode 'auto' needed, so the next launch starts there instead of glitching first.
  remember(mode) {
    try { const was = this.store?.getItem?.(REMEMBER_KEY); if (!(was in RANK) || RANK[mode.id] > RANK[was]) this.store?.setItem?.(REMEMBER_KEY, mode.id); } catch {}
  }

  start() {
    this.applyMode(this.modeFor(this.requestedMode), { reason:'start' });
  }

  setRequestedMode(mode = 'auto') {
    this.requestedMode = ['auto','high','balanced','lite'].includes(mode) ? mode : 'auto';
    const next = this.modeFor(this.requestedMode);
    this.badWindows = 0;
    this.resetSamples();
    this.applyMode(next, { reason:'manual' });
    return this.mode.id;
  }

  applyMode(mode, { reason='auto' } = {}) {
    if (!mode || this.mode.id === mode.id) {
      this.onQualityChange?.(this.mode, reason);
      return false;
    }
    this.mode = mode;
    this.onQualityChange?.(mode, reason);
    return true;
  }

  record({ frameMs = 0, updateMs = 0, renderMs = 0, now = 0 } = {}) {
    if (this.suspended || !Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 500) return;
    const i = this.cursor;
    this.frameMs[i] = frameMs;
    this.updateMs[i] = Math.max(0, Number(updateMs) || 0);
    this.renderMs[i] = Math.max(0, Number(renderMs) || 0);
    this.cursor = (i + 1) % this.maxSamples;
    this.sampleCount = Math.min(this.maxSamples, this.sampleCount + 1);
    // First-frames test: one second of play is enough to tell a struggling device. Straight to the mode it needs.
    if (this.requestedMode === 'auto' && this.firstTestArmed && !this.firstTestDone && this.sampleCount >= 60) {
      this.firstTestDone = true;
      const fps = this.report().averageFps, want = fps > 0 && fps < 24 ? MODES.LITE : fps > 0 && fps < 42 && this.mode.id === 'high' ? MODES.BALANCED : null;
      if (want && RANK[want.id] > RANK[this.mode.id]) { this.mode = want; this.downgradeCount++; this.remember(want); this.onQualityChange?.(want, 'auto-first-frames'); this.resetSamples(); return; }
    }
    if (this.requestedMode === 'auto' && this.sampleCount >= 90 && now - this.lastEvaluationAt >= 2000) {
      this.lastEvaluationAt = now;
      this.evaluateAuto();
    }
  }

  recent(array) {
    const count = this.sampleCount;
    if (!count) return [];
    const out = new Array(count);
    const start = this.sampleCount < this.maxSamples ? 0 : this.cursor;
    for (let j=0;j<count;j++) out[j] = array[(start+j)%this.maxSamples];
    return out;
  }

  report() {
    const frames = this.recent(this.frameMs);
    const updates = this.recent(this.updateMs);
    const renders = this.recent(this.renderMs);
    const avg = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0;
    const averageFrameMs = avg(frames);
    return {
      requestedMode: this.requestedMode,
      quality: this.mode.id,
      targetFps: this.mode.targetFps,
      sampleCount: frames.length,
      averageFps: averageFrameMs > 0 ? 1000/averageFrameMs : 0,
      averageFrameMs,
      p95FrameMs: quantile(frames,.95),
      averageUpdateMs: avg(updates),
      averageRenderMs: avg(renders),
      p95RenderMs: quantile(renders,.95),
      dprCap: this.mode.dprCap,
      maxPixels: this.mode.maxPixels,
      deviceMemory: Number.isFinite(this.deviceMemory) ? this.deviceMemory : null,
      particleScale: this.mode.particleScale,
      effectScale: this.mode.effectScale,
      downgradeCount: this.downgradeCount
    };
  }

  evaluateAuto() {
    const r = this.report();
    const threshold = this.mode.targetFps === 60 ? 50 : 25;
    const slow = r.averageFps > 0 && r.averageFps < threshold;
    const heavyRender = this.mode.targetFps === 60 && r.p95RenderMs > 13.5;
    if (slow || heavyRender) this.badWindows++;
    else this.badWindows = Math.max(0, this.badWindows - 1);
    if (this.badWindows < 2) return false;
    this.badWindows = 0;
    if (this.mode.id === 'high') {
      this.mode = MODES.BALANCED;
      this.downgradeCount++;
      this.remember(this.mode);
      this.onQualityChange?.(this.mode, 'auto-downgrade');
      this.resetSamples();
      return true;
    }
    if (this.mode.id === 'balanced') {
      this.mode = MODES.LITE;
      this.downgradeCount++;
      this.remember(this.mode);
      this.onQualityChange?.(this.mode, 'auto-downgrade');
      this.resetSamples();
      return true;
    }
    return false;
  }

  // Start the first-frames test now (after loading, so loading hiccups don't count).
  armFirstTest() { if (this.firstTestArmed) return; this.firstTestArmed = true; this.resetSamples(); }

  resetSamples() {
    this.sampleCount = 0;
    this.cursor = 0;
    this.frameMs.fill(0); this.updateMs.fill(0); this.renderMs.fill(0);
  }

  suspend() { this.suspended = true; this.resetSamples(); }
  resume() { this.suspended = false; this.resetSamples(); this.lastEvaluationAt = 0; }
}

export { MODES as PERFORMANCE_MODES };
