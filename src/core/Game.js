import { CanvasViewport } from '../render/CanvasViewport.js';
import { InputManager } from '../input/InputManager.js';
import { GameLoop } from './GameLoop.js';
import { SceneManager } from './SceneManager.js';
import { AssetLoader } from './AssetLoader.js';
import { AudioManager } from '../audio/AudioManager.js';
import { ActivityEngine } from '../activities/ActivityEngine.js';
import { LearningProfile } from '../learning/LearningProfile.js';
import { SaveSystem } from '../save/SaveSystem.js';
import { AdventureEngine } from '../adventures/AdventureEngine.js';
import { RewardSystem } from '../rewards/RewardSystem.js';
import { EggSystem } from '../rewards/EggSystem.js';
import { AdaptiveDifficulty } from '../learning/AdaptiveDifficulty.js';
import { ActivityScheduler } from '../learning/ActivityScheduler.js';
import { PerformanceManager } from './PerformanceManager.js';
import { FeedbackFX } from '../fx/FeedbackFX.js';
import { ChildTestRecorder } from '../testing/ChildTestRecorder.js';
import { ReleaseQualification } from '../testing/ReleaseQualification.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.viewport = new CanvasViewport(canvas, 1920, 1080);
    this.input = new InputManager(canvas, this.viewport);
    this.assets = new AssetLoader();
    globalThis.__LL_ASSETS = this.assets;
    this.audio = new AudioManager();
    this.learning = new LearningProfile();
    this.save = new SaveSystem();
    this.childTest = new ChildTestRecorder({ save:this.save });
    this.releaseQA = new ReleaseQualification({ game:this, save:this.save });
    this.fx = new FeedbackFX();
    this.activityEngine = new ActivityEngine(this);
    this.adventureEngine = new AdventureEngine(this);
    this.rewards = new RewardSystem(this);
    this.eggs = new EggSystem(this);
    this.adaptive = new AdaptiveDifficulty();
    this.scheduler = new ActivityScheduler(this);
    this.scenes = new SceneManager(this);
    this.paused = false;
    this.familySettings = { quietMode:false, reducedMotion:false, uiScale:1, colorSymbols:true, sessionReminder:20, performanceMode:'auto' };
    this.sessionElapsed = 0;
    this.breakReminderVisible = false;
    this.runtimeNotice = null;
    this.runtimeNoticeT = 0;
    this.resumeOverlayT = 0;
    this.runtimeErrorCount = 0;
    this.suspendCount = 0;
    this.resumeCount = 0;

    this.performanceManager = new PerformanceManager({
      mode:'auto',
      onQualityChange:(quality, reason)=>this.applyPerformanceQuality(quality, reason)
    });
    this.loop = new GameLoop({
      update: dt => this.update(dt),
      render: alpha => this.render(alpha),
      onFrame: sample => this.performanceManager.record(sample)
    });
    this.performanceManager.start();

    this.input.on(event => {
      if (event.type === 'down') this.audio.unlock();
      this.childTest?.recordPointer?.(event);
      if (event.type === 'down' && this.breakReminderVisible) { this.breakReminderVisible = false; this.sessionElapsed = 0; return; }
      this.scenes.handlePointer(event);
    });
    window.addEventListener('resize', () => this.viewport.resize(), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(() => this.viewport.resize(), 80), { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (document.hidden) {
        this.suspendCount++;
        this.input?.cancelActive?.();
        this.audio.suspend();
        this.performanceManager.suspend();
      } else {
        this.resumeCount++;
        this.audio.resume();
        this.performanceManager.resume();
        this.viewport.resize();
        this.loop.resetClock();
        this.resumeOverlayT = globalThis.__LL_REDUCED_MOTION ? 0.12 : 0.45;
      }
    });
  }

  async start(initialScene = 'boot', sceneData = {}) {
    await this.save.init();
    await this.releaseQA.init();
    await this.rewards.ensureLoaded(this.assets);
    try { await this.assets.loadArtIndex(); } catch (error) { console.warn('Art index unavailable; using drawn placeholders', error); }
    const savedState = this.save.getProfileState();
    if (savedState?.learning) this.learning.restore(savedState.learning);
    const savedAudio = this.save.getSettings();
    this.applyFamilySettings(savedAudio);
    if (savedAudio?.master != null) this.audio.setMasterVolume(savedAudio.master);
    for (const [channel, value] of Object.entries(savedAudio ?? {})) {
      if (channel !== 'master') this.audio.setChannelVolume(channel, value);
    }
    await this.scenes.change(initialScene, sceneData);
    this.loop.start();
  }

  applyPerformanceQuality(quality) {
    if (!quality) return;
    globalThis.__LL_QUALITY = quality.id;
    globalThis.__LL_PARTICLE_SCALE = quality.particleScale;
    globalThis.__LL_EFFECT_SCALE = quality.effectScale;
    globalThis.__LL_STATIC_CACHE = quality.staticCache !== false;
    this.viewport?.setDprCap?.(quality.dprCap);
    this.loop?.setTargetFps?.(quality.targetFps);
  }

  setPerformanceMode(mode = 'auto') {
    return this.performanceManager?.setRequestedMode?.(mode) ?? 'high';
  }

  getPerformanceReport() {
    return this.performanceManager?.report?.() ?? null;
  }

  applyFamilySettings(settings = {}) {
    this.familySettings = { ...this.familySettings, ...settings };
    globalThis.__LL_REDUCED_MOTION = Boolean(this.familySettings.reducedMotion);
    globalThis.__LL_UI_SCALE = Math.max(1, Math.min(1.3, Number(this.familySettings.uiScale) || 1));
    globalThis.__LL_COLOR_SYMBOLS = this.familySettings.colorSymbols !== false;
    this.audio?.setQuietMode?.(Boolean(this.familySettings.quietMode));
    this.setPerformanceMode(this.familySettings.performanceMode ?? 'auto');
    if (!this.familySettings.sessionReminder) { this.sessionElapsed = 0; this.breakReminderVisible = false; }
    return { ...this.familySettings };
  }

  async activateProfile(id) {
    const selected = await this.save.selectProfile(id);
    if (!selected) return false;
    this.learning = new LearningProfile();
    const state = this.save.getProfileState(id);
    if (state?.learning) this.learning.restore(state.learning);
    return true;
  }

  reportRuntimeError(error, context='runtime') {
    this.runtimeErrorCount++;
    console.error('Little Legends runtime error', context, error);
    this.runtimeNotice = 'Something went wobbly. Little Legends recovered safely.';
    this.runtimeNoticeT = 4;
  }

  update(dt) {
    if (this.paused) return;
    this.audio?.update?.(dt);
    this.fx?.update?.(dt);
    if (this.runtimeNoticeT > 0) this.runtimeNoticeT = Math.max(0, this.runtimeNoticeT-dt);
    if (this.resumeOverlayT > 0) this.resumeOverlayT = Math.max(0, this.resumeOverlayT-dt);
    this.sessionElapsed += dt;
    const reminder = Number(this.familySettings.sessionReminder) || 0;
    if (reminder > 0 && this.sessionElapsed >= reminder * 60) this.breakReminderVisible = true;
    this.scenes.update(dt);
  }

  render(alpha) {
    this.viewport.clear(this.ctx, '#75d8ff');
    this.viewport.begin(this.ctx);
    this.scenes.render(this.ctx, alpha);
    this.fx?.render?.(this.ctx);
    if (this.breakReminderVisible) this.renderBreakReminder(this.ctx);
    if (this.resumeOverlayT>0) { const p=Math.min(1,this.resumeOverlayT/.45); this.ctx.save(); this.ctx.globalAlpha=p*.22; this.ctx.fillStyle='#fff'; this.ctx.fillRect(0,0,1920,1080); this.ctx.restore(); }
    if (this.runtimeNotice && this.runtimeNoticeT>0) this.renderRuntimeNotice(this.ctx);
  }

  renderRuntimeNotice(ctx) {
    ctx.save();ctx.fillStyle='#453857e8';ctx.beginPath();ctx.roundRect(430,880,1060,110,42);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='800 28px system-ui';ctx.fillText(this.runtimeNotice,960,946);ctx.restore();
  }

  renderBreakReminder(ctx) {
    ctx.save();ctx.fillStyle='#453857dd';ctx.beginPath();ctx.roundRect(510,760,900,210,70);ctx.fill();ctx.fillStyle='#fff7d0';ctx.textAlign='center';ctx.font='900 46px system-ui';ctx.fillText('Wiggle break?',960,842);ctx.fillStyle='#fff';ctx.font='700 27px system-ui';ctx.fillText('Stretch, have a drink, or tap to keep playing.',960,900);ctx.restore();
  }
}
