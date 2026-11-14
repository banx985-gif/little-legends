import { setScreen, CORE_W, CORE_H } from './screen.js';

// Job 20: the canvas fills the whole screen, under the notch and the gesture bar too (no bars on any shape).
// The 1920×1080 core is scaled to fit inside the safe area and centred in it; the rest of the screen is still drawn
// (see src/render/screen.js). Scenes get the whole screen (`visibleRect`) and the safe area (`safeRect`) in design units.
export class CanvasViewport {
  constructor(canvas, designWidth = CORE_W, designHeight = CORE_H) {
    this.canvas = canvas;
    this.designWidth = designWidth;
    this.designHeight = designHeight;
    this.dprCap = 2;
    this.maxPixels = Infinity;
    this.dpr = 1;
    this.cssWidth = 0;
    this.cssHeight = 0;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.rectLeft = 0;
    this.rectTop = 0;
    this.insets = { top: 0, right: 0, bottom: 0, left: 0 };
    this.visibleRect = { x: 0, y: 0, w: designWidth, h: designHeight };
    this.safeRect = { ...this.visibleRect };
    this.probe = null;
    this.resize();
  }

  setDprCap(value = 2) {
    const next = Math.max(1, Math.min(3, Number(value) || 2));
    if (Math.abs(next - this.dprCap) < .01) return false;
    this.dprCap = next;
    this.resize();
    return true;
  }

  // The most real pixels the canvas may have; the DPR drops (never below 1) to fit. A wide phone's bigger canvas still
  // keeps to this cap (Lite mode on cheap tablets).
  setMaxPixels(value = Infinity) {
    const next = Number(value) > 0 ? Number(value) : Infinity;
    if (next === this.maxPixels) return false;
    this.maxPixels = next;
    this.resize();
    return true;
  }

  // The notch / camera cut-out and gesture-bar insets in CSS pixels. Read from CSS env(safe-area-inset-*) through a hidden
  // probe element; Capacitor's Android web view also sets --safe-area-inset-* (used when env() reports 0 on older web
  // views). QA can fake them with ?insets=left,top,right,bottom (globalThis.__LL_FAKE_INSETS).
  readInsets() {
    const fake = globalThis.__LL_FAKE_INSETS;
    if (fake) return { top: +fake.top || 0, right: +fake.right || 0, bottom: +fake.bottom || 0, left: +fake.left || 0 };
    if (typeof document === 'undefined' || !document.body || typeof getComputedStyle !== 'function') return { top: 0, right: 0, bottom: 0, left: 0 };
    if (!this.probe) {
      const p = this.probe = document.createElement('div');
      p.setAttribute('aria-hidden', 'true');
      p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;'
        + 'padding-top:max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px));'
        + 'padding-right:max(env(safe-area-inset-right,0px),var(--safe-area-inset-right,0px));'
        + 'padding-bottom:max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px));'
        + 'padding-left:max(env(safe-area-inset-left,0px),var(--safe-area-inset-left,0px));';
      document.body.appendChild(p);
    }
    const cs = getComputedStyle(this.probe), n = v => Math.max(0, parseFloat(v) || 0);
    return { top: n(cs.paddingTop), right: n(cs.paddingRight), bottom: n(cs.paddingBottom), left: n(cs.paddingLeft) };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.rectLeft = rect.left;
    this.rectTop = rect.top;
    this.cssWidth = Math.max(1, rect.width);
    this.cssHeight = Math.max(1, rect.height);
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, this.dprCap, Math.sqrt(this.maxPixels / (this.cssWidth * this.cssHeight))));
    const pixelW = Math.round(this.cssWidth * this.dpr);
    const pixelH = Math.round(this.cssHeight * this.dpr);
    if (this.canvas.width !== pixelW) this.canvas.width = pixelW;
    if (this.canvas.height !== pixelH) this.canvas.height = pixelH;
    // Insets never take more than a quarter of a side (a bad report must not shrink the game to nothing).
    const raw = this.readInsets();
    const ins = this.insets = {
      top: Math.min(raw.top, this.cssHeight / 4), bottom: Math.min(raw.bottom, this.cssHeight / 4),
      left: Math.min(raw.left, this.cssWidth / 4), right: Math.min(raw.right, this.cssWidth / 4)
    };
    const safeW = this.cssWidth - ins.left - ins.right, safeH = this.cssHeight - ins.top - ins.bottom;
    this.scale = Math.min(safeW / this.designWidth, safeH / this.designHeight);
    this.offsetX = ins.left + (safeW - this.designWidth * this.scale) / 2;
    this.offsetY = ins.top + (safeH - this.designHeight * this.scale) / 2;
    const s = this.scale;
    this.visibleRect = { x: -this.offsetX / s, y: -this.offsetY / s, w: this.cssWidth / s, h: this.cssHeight / s };
    this.safeRect = { x: (ins.left - this.offsetX) / s, y: (ins.top - this.offsetY) / s, w: safeW / s, h: safeH / s };
    setScreen(this.visibleRect, this.safeRect);
    this.onResize?.(this);
  }

  begin(ctx) {
    ctx.setTransform(
      this.scale * this.dpr, 0,
      0, this.scale * this.dpr,
      this.offsetX * this.dpr,
      this.offsetY * this.dpr
    );
  }

  clear(ctx, color = '#75d8ff') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  clientToWorld(clientX, clientY, out = null) {
    const target = out ?? { x:0, y:0 };
    target.x = (clientX - this.rectLeft - this.offsetX) / this.scale;
    target.y = (clientY - this.rectTop - this.offsetY) / this.scale;
    return target;
  }
}
