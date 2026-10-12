export class InputManager {
  constructor(canvas, viewport) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.activePointerId = null;
    this.pointer = { x: 0, y: 0, down: false };
    this.worldPoint = { x: 0, y: 0 };
    this.handlers = new Set();
    // Job 15: one extra finger (pinch on Wonder Island), sent only to listeners that ask for it.
    this.secondPointerId = null;
    this.secondHandlers = new Set();
    this._bind();
  }

  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onSecond(handler) {
    this.secondHandlers.add(handler);
    return () => this.secondHandlers.delete(handler);
  }

  emitSecond(type, raw) {
    const p = this.viewport.clientToWorld(raw.clientX, raw.clientY, { x: 0, y: 0 });
    const event = { type, x: p.x, y: p.y, pointerId: raw.pointerId, pointerType: raw.pointerType, originalEvent: raw };
    for (const handler of this.secondHandlers) handler(event);
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
      if (this.activePointerId !== null && this.activePointerId !== e.pointerId) {
        // A new *first* finger means the old one has gone, even if its lift was never reported (system gesture,
        // dropped event): let go of it instead of ignoring every touch from now on. A genuine second finger never reaches the
        // normal handlers; it goes to the second-finger listeners only (Job 15: pinch on Wonder Island).
        if (!e.isPrimary) {
          if (this.secondPointerId === null) {
            this.secondPointerId = e.pointerId;
            try { this.canvas.setPointerCapture(e.pointerId); } catch {}
            this.emitSecond('down', e);
          }
          return;
        }
        this.cancelActive();
      }
      this.activePointerId = e.pointerId;
      this.pointer.down = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      this.emit('down', e);
    }, { passive: false });

    this.canvas.addEventListener('pointermove', e => {
      if (e.pointerId === this.secondPointerId) { e.preventDefault(); this.emitSecond('move', e); return; }
      if (this.activePointerId !== e.pointerId) return;
      e.preventDefault();
      this.emit('move', e);
    }, { passive: false });

    const finish = (type, e) => {
      if (e.pointerId === this.secondPointerId) {
        this.secondPointerId = null;
        try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
        this.emitSecond(type, e);
        return;
      }
      if (this.activePointerId !== e.pointerId) return;
      e.preventDefault();
      this.emit(type, e);
      this.pointer.down = false;
      this.activePointerId = null; // before releasing, so the lostpointercapture that follows is ignored
      try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
    };

    this.canvas.addEventListener('pointerup', e => finish('up', e), { passive: false });
    this.canvas.addEventListener('pointercancel', e => finish('cancel', e), { passive: false });
    this.canvas.addEventListener('lostpointercapture', e => { if (this.activePointerId === e.pointerId) finish('cancel', e); });
  }
}
