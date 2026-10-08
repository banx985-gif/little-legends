const MODES = Object.freeze({
  HIGH: Object.freeze({ id:'high', label:'High', targetFps:60, dprCap:2, particleScale:1, effectScale:1, staticCache:true }),
  BALANCED: Object.freeze({ id:'balanced', label:'Balanced', targetFps:60, dprCap:1.5, particleScale:.7, effectScale:.8, staticCache:true }),
  LITE: Object.freeze({ id:'lite', label:'Lite', targetFps:30, dprCap:1.25, particleScale:.4, effectScale:.55, staticCache:true })
});

function quantile(values, q) {
  if (!values.length) return 0;
  const copy = [...values].sort((a,b)=>a-b);
  return copy[Math.min(copy.length-1, Math.max(0, Math.floor((copy.length-1)*q)))] ?? 0;
}

export class PerformanceManager {
  constructor({ onQualityChange = null, mode = 'auto', maxSamples = 180 } = {}) {
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

  start() {
    const initial = this.requestedMode === 'lite' ? MODES.LITE : this.requestedMode === 'balanced' ? MODES.BALANCED : MODES.HIGH;
    this.applyMode(initial, { reason:'start' });
  }

  setRequestedMode(mode = 'auto') {
    this.requestedMode = ['auto','high','balanced','lite'].includes(mode) ? mode : 'auto';
    const next = this.requestedMode === 'lite' ? MODES.LITE : this.requestedMode === 'balanced' ? MODES.BALANCED : MODES.HIGH;
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
      this.onQualityChange?.(this.mode, 'auto-downgrade');
      this.resetSamples();
      return true;
    }
    if (this.mode.id === 'balanced') {
      this.mode = MODES.LITE;
      this.downgradeCount++;
      this.onQualityChange?.(this.mode, 'auto-downgrade');
      this.resetSamples();
      return true;
    }
    return false;
  }

  resetSamples() {
    this.sampleCount = 0;
    this.cursor = 0;
    this.frameMs.fill(0); this.updateMs.fill(0); this.renderMs.fill(0);
  }

  suspend() { this.suspended = true; this.resetSamples(); }
  resume() { this.suspended = false; this.resetSamples(); this.lastEvaluationAt = 0; }
}

export { MODES as PERFORMANCE_MODES };
