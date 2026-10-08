export class InputManager {
  constructor(canvas, viewport) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.activePointerId = null;
    this.pointer = { x: 0, y: 0, down: false };
    this.worldPoint = { x: 0, y: 0 };
    this.handlers = new Set();
    this._bind();
  }

  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(type, raw) {
    const p = this.viewport.clientToWorld(raw.clientX, raw.clientY, this.worldPoint);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    const event = {
      type,
      x: p.x,
      y: p.y,
      pointerId: raw.pointerId,
      pointerType: raw.pointerType,
      originalEvent: raw
    };
    for (const handler of this.handlers) handler(event);
  }


  cancelActive() {
    if (this.activePointerId === null) return false;
    const event = { type:'cancel', x:this.pointer.x, y:this.pointer.y, pointerId:this.activePointerId, pointerType:'touch', originalEvent:null };
    for (const handler of this.handlers) handler(event);
    this.pointer.down = false;
    this.activePointerId = null;
    return true;
  }

  _bind() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (this.activePointerId !== null && this.activePointerId !== e.pointerId) return;
      this.activePointerId = e.pointerId;
      this.pointer.down = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      this.emit('down', e);
    }, { passive: false });

    this.canvas.addEventListener('pointermove', e => {
      if (this.activePointerId !== e.pointerId) return;
      e.preventDefault();
      this.emit('move', e);
    }, { passive: false });

    const finish = (type, e) => {
      if (this.activePointerId !== e.pointerId) return;
      e.preventDefault();
      this.emit(type, e);
      this.pointer.down = false;
      try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
      this.activePointerId = null;
    };

    this.canvas.addEventListener('pointerup', e => finish('up', e), { passive: false });
    this.canvas.addEventListener('pointercancel', e => finish('cancel', e), { passive: false });
  }
}
