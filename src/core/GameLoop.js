export class GameLoop {
  constructor({ update, render, targetFps = 60, onFrame = null }) {
    this.update = update;
    this.render = render;
    this.onFrame = onFrame;
    this.running = false;
    this.last = 0;
    this.accumulator = 0;
    this.raf = 0;
    this.targetFps = 60;
    this.fixedStep = 1 / 60;
    this.minFrameMs = 1000 / 60;
    this.tick = this.tick.bind(this);
    this.setTargetFps(targetFps);
  }

  setTargetFps(fps = 60) {
    const next = Number(fps) <= 30 ? 30 : 60;
    this.targetFps = next;
    this.fixedStep = 1 / next;
    this.minFrameMs = 1000 / next;
    this.accumulator = 0;
    return next;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resetClock(now = performance.now()) {
    this.last = now;
    this.accumulator = 0;
  }

  tick(now) {
    if (!this.running) return;
    const rawFrameMs = now - this.last;
    // A few ms of slack: screen refreshes wobble, and a too-strict check skips a whole extra refresh
    // (30 FPS mode was landing on ~28, with drops to 20, on a 60 Hz screen).
    if (rawFrameMs + 3 < this.minFrameMs) {
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    this.last = now;
    let dt = Math.min(rawFrameMs / 1000, 0.1);
    this.accumulator += dt;

    const t0 = performance.now();
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 4) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps++;
    }
    if (steps === 4) this.accumulator = 0;
    const t1 = performance.now();
    this.render(this.fixedStep > 0 ? this.accumulator / this.fixedStep : 0);
    const t2 = performance.now();

    this.onFrame?.({ frameMs: rawFrameMs, updateMs: t1 - t0, renderMs: t2 - t1, steps, now });
    this.raf = requestAnimationFrame(this.tick);
  }
}
