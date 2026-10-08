export const AUDIO_CHANNELS = Object.freeze({
  MUSIC: 'music',
  VOICE: 'voice',
  CHARACTER: 'character',
  UI: 'ui',
  AMBIENT: 'ambient',
  ACTIVITY: 'activity'
});

const CHANNEL_KEYS = Object.freeze(Object.values(AUDIO_CHANNELS));

const DEFAULT_VOLUMES = Object.freeze({
  music: 0.55,
  voice: 1,
  character: 0.9,
  ui: 0.85,
  ambient: 0.55,
  activity: 0.9
});

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

/**
 * Central Web Audio system for Little Legends.
 * It stays asset-agnostic: prototype oscillator cues and future decoded audio
 * buffers use the same channels, ducking, fades and parent volume controls.
 */
export class AudioManager {
  constructor({ contextFactory = null } = {}) {
    this.contextFactory = contextFactory;
    this.ctx = null;
    this.masterGain = null;
    this.channelGains = new Map();
    this.masterVolume = 0.9;
    this.channelVolumes = { ...DEFAULT_VOLUMES };
    this.musicDuck = 1;
    this.quietMode = false;
    this.unlocked = false;
    this.suspendedByApp = false;

    this.currentVoice = null;
    this.currentSpeech = null;
    this.pendingSpeech = null;
    this.voiceWindowTimer = null;
    this.currentMusic = null;
    this.worldMusicTheme = null;
    this.worldMusicTimer = null;
    this.worldMusicStep = 0;
    this.worldMusicLevel = 1;
    this.worldMusicTarget = 1;
    this.worldMusicPendingTheme = null;
    this.worldMusicStopping = false;
    this.liveSources = new Set();
  }

  get isSupported() {
    if (this.contextFactory) return true;
    return typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
  }

  createContext() {
    if (this.contextFactory) return this.contextFactory();
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = this.createContext();
      if (!this.ctx) return false;
      this.buildGraph();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume?.().catch?.(() => {});
    this.unlocked = true;
    this.flushPendingSpeech();
    if (this.worldMusicTheme) this.ensureWorldMusicTimer();
    return true;
  }

  buildGraph() {
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    for (const channel of CHANNEL_KEYS) {
      const node = this.ctx.createGain();
      node.gain.setValueAtTime(this.effectiveChannelVolume(channel), this.ctx.currentTime);
      node.connect(this.masterGain);
      this.channelGains.set(channel, node);
    }
  }

  effectiveChannelVolume(channel) {
    const base = this.channelVolumes[channel] ?? 1;
    const quiet = this.quietMode ? ({ music:0.12, ambient:0.1, ui:0.42, activity:0.34, character:0.34, voice:1 }[channel] ?? 1) : 1;
    return clamp01(base * quiet * (channel === AUDIO_CHANNELS.MUSIC ? this.musicDuck : 1));
  }

  setQuietMode(enabled) {
    this.quietMode = Boolean(enabled);
    for (const channel of CHANNEL_KEYS) this.rampParam(this.channelGains.get(channel)?.gain, this.effectiveChannelVolume(channel), 0.12);
    return this.quietMode;
  }

  getMasterVolume() { return this.masterVolume; }
  getChannelVolume(channel) { return this.channelVolumes[channel] ?? 0; }

  getSettings() {
    return { master: this.masterVolume, ...this.channelVolumes };
  }

  setMasterVolume(value, { ramp = 0.08 } = {}) {
    this.masterVolume = clamp01(value);
    this.rampParam(this.masterGain?.gain, this.masterVolume, ramp);
    return this.masterVolume;
  }

  setChannelVolume(channel, value, { ramp = 0.08 } = {}) {
    if (!CHANNEL_KEYS.includes(channel)) return false;
    this.channelVolumes[channel] = clamp01(value);
    this.rampParam(this.channelGains.get(channel)?.gain, this.effectiveChannelVolume(channel), ramp);
    return this.channelVolumes[channel];
  }

  fadeChannel(channel, to, duration = 0.35) {
    if (!CHANNEL_KEYS.includes(channel)) return false;
    this.channelVolumes[channel] = clamp01(to);
    this.rampParam(this.channelGains.get(channel)?.gain, this.effectiveChannelVolume(channel), duration);
    return true;
  }

  rampParam(param, target, duration = 0.08) {
    if (!param || !this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues?.(now);
    const current = Number.isFinite(param.value) ? param.value : target;
    param.setValueAtTime?.(current, now);
    if (duration <= 0) param.setValueAtTime?.(target, now);
    else param.linearRampToValueAtTime?.(target, now + duration);
  }

  setMusicDuck(active, duration = 0.16) {
    this.musicDuck = active ? 0.34 : 1;
    this.rampParam(this.channelGains.get(AUDIO_CHANNELS.MUSIC)?.gain, this.effectiveChannelVolume(AUDIO_CHANNELS.MUSIC), duration);
  }

  voiceWindow(event) {
    if (event?.type === 'start') {
      this.setMusicDuck(true);
      if (this.voiceWindowTimer) clearTimeout(this.voiceWindowTimer);
      const ms = Math.max(0, (event.duration ?? 0) * 1000);
      if (ms > 0) this.voiceWindowTimer = setTimeout(() => this.setMusicDuck(false, 0.22), ms + 40);
    } else if (event?.type === 'end') {
      if (this.voiceWindowTimer) clearTimeout(this.voiceWindowTimer);
      this.voiceWindowTimer = null;
      this.setMusicDuck(false, 0.22);
    }
  }

  channelNode(channel) {
    return this.channelGains.get(channel) ?? this.masterGain;
  }

  trackSource(source) {
    if (!source) return source;
    this.liveSources.add(source);
    const previousEnded = source.onended;
    source.onended = (...args) => {
      this.liveSources.delete(source);
      previousEnded?.(...args);
    };
    return source;
  }

  playBuffer(channel, buffer, { gain = 1, loop = false, rate = 1, offset = 0, duration = null } = {}) {
    if (!buffer || !this.unlock()) return null;
    const source = this.ctx.createBufferSource();
    const localGain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    if (source.playbackRate) source.playbackRate.value = rate;
    localGain.gain.setValueAtTime(clamp01(gain), this.ctx.currentTime);
    source.connect(localGain);
    localGain.connect(this.channelNode(channel));
    this.trackSource(source);
    if (duration == null) source.start(0, offset);
    else source.start(0, offset, duration);
    return { source, gain: localGain };
  }


  canSpeak() {
    return typeof window !== 'undefined' && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  speak(text, { rate = 0.92, pitch = 1.08, volume = 1, onStart = null, onEnd = null } = {}) {
    if (!text || !this.canSpeak()) return false;
    const options = { rate, pitch, volume, onStart, onEnd };
    if (!this.unlocked) {
      this.pendingSpeech = { text, options, queuedAt: Date.now() };
      return true;
    }

    this.pendingSpeech = null;
    if (this.currentVoice) {
      try { this.currentVoice.source.stop(); } catch {}
      this.currentVoice = null;
    }
    this.stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = clamp01(this.masterVolume * this.getChannelVolume(AUDIO_CHANNELS.VOICE) * volume);
    utterance.onstart = () => {
      this.setMusicDuck(true);
      onStart?.();
    };
    const finish = () => {
      if (this.currentSpeech === utterance) this.currentSpeech = null;
      this.setMusicDuck(false, 0.22);
      onEnd?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    this.currentSpeech = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  flushPendingSpeech() {
    if (!this.pendingSpeech || !this.unlocked) return;
    const pending = this.pendingSpeech;
    this.pendingSpeech = null;
    if (Date.now() - pending.queuedAt <= 7000) this.speak(pending.text, pending.options);
  }

  stopSpeech() {
    if (!this.canSpeak()) {
      this.currentSpeech = null;
      this.pendingSpeech = null;
      return;
    }
    if (this.currentSpeech || window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    this.currentSpeech = null;
  }

  playVoiceBuffer(buffer, options = {}) {
    this.stopVoice();
    const handle = this.playBuffer(AUDIO_CHANNELS.VOICE, buffer, options);
    if (!handle) return null;
    this.currentVoice = handle;
    this.setMusicDuck(true);
    const previousEnded = handle.source.onended;
    handle.source.onended = (...args) => {
      previousEnded?.(...args);
      if (this.currentVoice?.source === handle.source) this.currentVoice = null;
      this.setMusicDuck(false, 0.22);
    };
    return handle;
  }

  stopVoice() {
    if (this.currentVoice) {
      try { this.currentVoice.source.stop(); } catch {}
      this.currentVoice = null;
    }
    this.stopSpeech();
    this.setMusicDuck(false, 0.12);
  }

  crossfadeMusic(buffer, { duration = 0.75, loop = true, gain = 1 } = {}) {
    if (!buffer || !this.unlock()) return null;
    const next = this.playBuffer(AUDIO_CHANNELS.MUSIC, buffer, { gain: 0, loop });
    if (!next) return null;
    const now = this.ctx.currentTime;
    next.gain.gain.setValueAtTime(0, now);
    next.gain.gain.linearRampToValueAtTime(clamp01(gain), now + duration);

    const previous = this.currentMusic;
    if (previous) {
      const current = Number.isFinite(previous.gain.gain.value) ? previous.gain.gain.value : 1;
      previous.gain.gain.cancelScheduledValues?.(now);
      previous.gain.gain.setValueAtTime(current, now);
      previous.gain.gain.linearRampToValueAtTime(0, now + duration);
      setTimeout(() => { try { previous.source.stop(); } catch {} }, Math.ceil(duration * 1000) + 30);
    }
    this.currentMusic = next;
    return next;
  }

  playTone(channel, frequency, duration = 0.09, { type = 'sine', gain = 0.05, delay = 0, endFrequency = null } = {}) {
    if (!this.unlock()) return null;
    const start = this.ctx.currentTime + Math.max(0, delay);
    const end = start + Math.max(0.02, duration);
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency != null) oscillator.frequency.linearRampToValueAtTime?.(endFrequency, end);
    envelope.gain.setValueAtTime(Math.max(0.0001, gain), start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.45), start + duration * 0.55);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope);
    envelope.connect(this.channelNode(channel));
    this.trackSource(oscillator);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
    return oscillator;
  }

  worldMusicNotes(theme) {
    const map = {
      dino: [262, 330, 392, 330],
      rainbow: [392, 494, 587, 523],
      animal: [294, 349, 440, 349],
      storybook: [330, 392, 494, 587],
      life: [349, 440, 523, 440],
      jungle: [220, 330, 440, 330]
    };
    return map[theme] ?? map.dino;
  }

  ensureWorldMusicTimer() {
    if (!this.unlocked || !this.worldMusicTheme || this.worldMusicTimer) return false;
    const tick = () => {
      if (!this.worldMusicTheme || !this.unlocked) return;
      const notes = this.worldMusicNotes(this.worldMusicTheme);
      const i = this.worldMusicStep++ % notes.length;
      const level=Math.max(0,Math.min(1,this.worldMusicLevel));
      this.playTone(AUDIO_CHANNELS.MUSIC, notes[i], 0.34, { type:'sine', gain:0.022*level });
      if (i % 2 === 0) this.playTone(AUDIO_CHANNELS.MUSIC, notes[(i + 2) % notes.length] / 2, 0.42, { type:'triangle', gain:0.012*level, delay:0.03 });
    };
    // Set the timer before the first note: playTone() -> unlock() calls back into this method.
    this.worldMusicTimer = setInterval(tick, 720);
    tick();
    return true;
  }

  update(dt) {
    const speed = Math.max(0.001, dt) / 0.35;
    if (this.worldMusicLevel < this.worldMusicTarget) this.worldMusicLevel = Math.min(this.worldMusicTarget, this.worldMusicLevel + speed);
    else if (this.worldMusicLevel > this.worldMusicTarget) this.worldMusicLevel = Math.max(this.worldMusicTarget, this.worldMusicLevel - speed);
    if (this.worldMusicLevel <= 0.02) {
      if (this.worldMusicPendingTheme) {
        if (this.worldMusicTimer) clearInterval(this.worldMusicTimer);
        this.worldMusicTimer = null; this.worldMusicTheme = this.worldMusicPendingTheme; this.worldMusicPendingTheme = null; this.worldMusicStep = 0; this.worldMusicStopping = false; this.worldMusicTarget = 1; this.ensureWorldMusicTimer();
      } else if (this.worldMusicStopping) {
        if (this.worldMusicTimer) clearInterval(this.worldMusicTimer);
        this.worldMusicTimer = null; this.worldMusicTheme = null; this.worldMusicStep = 0; this.worldMusicStopping = false;
      }
    }
  }

  startWorldMusic(theme = 'dino') {
    if (!this.worldMusicTheme || this.worldMusicTheme === theme) {
      this.worldMusicTheme = theme; this.worldMusicPendingTheme = null; this.worldMusicStopping = false; this.worldMusicTarget = 1; this.worldMusicLevel = Math.max(this.worldMusicLevel, .2); this.ensureWorldMusicTimer(); return theme;
    }
    this.worldMusicPendingTheme = theme; this.worldMusicStopping = false; this.worldMusicTarget = 0;
    return theme;
  }

  stopWorldMusic({ immediate = false } = {}) {
    this.worldMusicPendingTheme = null;
    if (!this.worldMusicTheme) return;
    if (!immediate) { this.worldMusicStopping = true; this.worldMusicTarget = 0; return; }
    this.worldMusicTheme = null;
    if (this.worldMusicTimer) clearInterval(this.worldMusicTimer);
    this.worldMusicTimer = null;
    this.worldMusicStep = 0; this.worldMusicLevel = 0; this.worldMusicTarget = 0; this.worldMusicStopping = false;
  }

  playJamStem(role, beat = 0, loudness = 0.7) {
    const gain = 0.018 + clamp01(loudness) * 0.035;
    const step = Math.max(0, Number(beat) || 0);
    if (role === 'percussion') { this.playTone(AUDIO_CHANNELS.ACTIVITY, 115 + (step % 2) * 35, 0.07, { type:'square', gain }); return true; }
    if (role === 'bass') { this.playTone(AUDIO_CHANNELS.MUSIC, [131,147,165,147][step % 4], 0.20, { type:'triangle', gain:gain*.8 }); return true; }
    if (role === 'melody') { this.playTone(AUDIO_CHANNELS.MUSIC, [523,587,659,784][step % 4], 0.15, { type:'sine', gain:gain*.75 }); return true; }
    if (role === 'effect') { this.playTone(AUDIO_CHANNELS.ACTIVITY, 760 + (step % 4) * 85, 0.08, { type:'triangle', gain:gain*.55 }); return true; }
    if (role === 'voice') { this.playTone(AUDIO_CHANNELS.CHARACTER, [392,440,494,440][step % 4], 0.12, { type:'sine', gain:gain*.6 }); return true; }
    return false;
  }

  playCue(name, options = {}) {
    const count = options.count ?? options.index ?? 0;
    switch (name) {
      case 'grab':
        this.playTone(AUDIO_CHANNELS.ACTIVITY, 430, 0.06, { gain: 0.035 });
        break;
      case 'drop':
        this.playTone(AUDIO_CHANNELS.ACTIVITY, 360, 0.055, { type: 'triangle', gain: 0.025, endFrequency: 300 });
        break;
      case 'correct':
        this.playTone(AUDIO_CHANNELS.ACTIVITY, 610, 0.10, { gain: 0.045 });
        this.playTone(AUDIO_CHANNELS.ACTIVITY, 760, 0.13, { gain: 0.04, delay: 0.07 });
        break;
      case 'incorrect':
        this.playTone(AUDIO_CHANNELS.ACTIVITY, 280, 0.09, { type: 'triangle', gain: 0.024, endFrequency: 245 });
        break;
      case 'count':
        this.playTone(AUDIO_CHANNELS.ACTIVITY, 500 + Math.max(1, count) * 78, 0.12, { gain: 0.048 });
        break;
      case 'reward':
        [660, 820, 1040].forEach((f, i) => this.playTone(AUDIO_CHANNELS.UI, f, 0.16, { gain: 0.045, delay: i * 0.09 }));
        break;
      case 'pipLaugh':
        [760, 690, 820].forEach((f, i) => this.playTone(AUDIO_CHANNELS.CHARACTER, f, 0.09, { type: 'triangle', gain: 0.032, delay: i * 0.075 }));
        break;
      case 'complete':
        [660, 820, 990, 1180].forEach((f, i) => this.playTone(AUDIO_CHANNELS.ACTIVITY, f, 0.18, { gain: 0.05, delay: i * 0.10 }));
        break;
      default:
        return false;
    }
    return true;
  }

  suspend() {
    this.suspendedByApp = true;
    if (this.ctx?.state === 'running') this.ctx.suspend?.().catch?.(() => {});
  }

  resume() {
    this.suspendedByApp = false;
    if (this.unlocked && this.ctx?.state === 'suspended') this.ctx.resume?.().catch?.(() => {});
  }

  stopAll() {
    this.stopVoice();
    this.pendingSpeech = null;
    if (this.voiceWindowTimer) clearTimeout(this.voiceWindowTimer);
    this.voiceWindowTimer = null;
    for (const source of [...this.liveSources]) {
      try { source.stop(); } catch {}
    }
    this.liveSources.clear();
    this.currentMusic = null;
    this.stopWorldMusic({ immediate:true });
  }
}
