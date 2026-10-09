export class CanvasViewport {
  constructor(canvas, designWidth = 1920, designHeight = 1080) {
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
    this.resize();
  }

  setDprCap(value = 2) {
    const next = Math.max(1, Math.min(3, Number(value) || 2));
    if (Math.abs(next - this.dprCap) < .01) return false;
    this.dprCap = next;
    this.resize();
    return true;
  }

  // The most real pixels the canvas may have; the DPR drops (never below 1) to fit.
  setMaxPixels(value = Infinity) {
    const next = Number(value) > 0 ? Number(value) : Infinity;
    if (next === this.maxPixels) return false;
    this.maxPixels = next;
    this.resize();
    return true;
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
    this.scale = Math.min(this.cssWidth / this.designWidth, this.cssHeight / this.designHeight);
    this.offsetX = (this.cssWidth - this.designWidth * this.scale) / 2;
    this.offsetY = (this.cssHeight - this.designHeight * this.scale) / 2;
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
