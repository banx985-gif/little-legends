import { prepareSceneArt, settleSceneArt } from './art.js';

export class SceneManager {
  constructor(game) {
    this.game = game;
    this.registry = new Map();
    this.current = null;
    this.currentName = null;
    this.busy = false;
    this.transitionT = 0;
    this.transitionDuration = 0.28;
  }

  register(name, factory) { this.registry.set(name, factory); }

  async change(name, data = {}) {
    const factory = this.registry.get(name);
    if (!factory) throw new Error(`Unknown scene: ${name}`);
    if (this.busy) return false;
    this.busy = true;
    this.transitionT = globalThis.__LL_REDUCED_MOTION ? 0.08 : this.transitionDuration;
    const previous = this.current;
    try {
      if (previous?.exit) await previous.exit();
      const next = factory(this.game);
      const artIds = await prepareSceneArt(this.game, name, data);
      this.current = next;
      this.currentName = name;
      if (next?.enter) await next.enter(data);
      settleSceneArt(this.game, name, data, artIds);
      if (name !== 'boot') this.game.performanceManager?.armFirstTest?.();
      this.game.childTest?.recordScene?.(name);
      return true;
    } catch (error) {
      this.game.reportRuntimeError?.(error, `scene:${name}`);
      const hasProfile = Boolean(this.game.save?.getActiveProfile?.());
      const fallbackName = name !== 'island' && hasProfile && this.registry.has('island') ? 'island' : (name !== 'profile' && this.registry.has('profile') ? 'profile' : null);
      if (fallbackName) {
        try {
          const fallback = this.registry.get(fallbackName)(this.game);
          this.current = fallback; this.currentName = fallbackName;
          await fallback.enter?.({ recoveredFromError:true, failedScene:name });
        } catch (fallbackError) { this.game.reportRuntimeError?.(fallbackError, 'scene:fallback'); }
      }
      return false;
    } finally {
      this.busy = false;
    }
  }

  recoverRuntime(error, phase) {
    this.game.reportRuntimeError?.(error, `scene:${this.currentName}:${phase}`);
    if (this.busy || this._recoverQueued) return;
    this._recoverQueued = true;
    queueMicrotask(async () => {
      try {
        const hasProfile = Boolean(this.game.save?.getActiveProfile?.());
        const safe = hasProfile && this.registry.has('island') ? 'island' : (this.registry.has('profile') ? 'profile' : null);
        if (safe && this.currentName !== safe) await this.change(safe, { recoveredFromError:true, failedScene:this.currentName });
      } finally { this._recoverQueued = false; }
    });
  }

  update(dt) {
    if (this.transitionT > 0) this.transitionT = Math.max(0, this.transitionT - dt);
    try { this.current?.update?.(dt); }
    catch (error) { this.recoverRuntime(error, 'update'); }
  }

  render(ctx, alpha) {
    try { this.current?.render?.(ctx, alpha); }
    catch (error) { this.recoverRuntime(error, 'render'); }
    const fade = this.busy ? 0.88 : this.transitionT > 0 ? Math.min(0.72, this.transitionT / Math.max(0.01, this.transitionDuration) * 0.72) : 0;
    if (fade > 0) {
      ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#5a3a73'; ctx.fillRect(0,0,1920,1080); ctx.restore();
    }
  }

  handlePointer(event) {
    if (this.busy || this.transitionT >= 0.1) return;
    try {
      const result = this.current?.handlePointer?.(event);
      if (result && typeof result.then === 'function') result.catch(error => this.recoverRuntime(error, 'input'));
    } catch (error) { this.recoverRuntime(error, 'input'); }
  }
}
