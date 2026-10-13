/** Normalised per-frame input, identical for keyboard/mouse and touch. */
export interface InputState { moveX: number; moveY: number; sprint: boolean; jump: boolean; walk: boolean; fire: boolean; aim: boolean }

/**
 * Desktop: WASD, Shift, Space, pointer-lock mouse look.
 * Mobile: virtual joystick (left), swipe-look (right), sprint/jump buttons.
 */
export class InputManager {
  readonly state: InputState = { moveX: 0, moveY: 0, sprint: false, jump: false, walk: false, fire: false, aim: false };
  private zoom = 0; private mouseFire = false; private mouseAim = false; private touchFire = false; private touchAim = false; private reloadEdge = false;
  private keys = new Set<string>();
  private lookX = 0; private lookY = 0;
  private joyId = -1; private lookId = -1; private joy = { x: 0, y: 0, vx: 0, vy: 0 };
  private lastX = 0; private lastY = 0;
  private touchSprint = false; private touchJump = false;
  enabled = false;

  constructor(private canvas: HTMLCanvasElement) {
    addEventListener("keydown", e => { this.keys.add(e.code); if (e.code === "KeyR") this.reloadEdge = true; if (e.code === "Space") e.preventDefault(); });
    addEventListener("keyup", e => this.keys.delete(e.code));
    addEventListener("blur", () => this.keys.clear());
    addEventListener("mousemove", e => { if (this.enabled && document.pointerLockElement === canvas) { this.lookX += e.movementX; this.lookY += e.movementY; } });
    canvas.addEventListener("click", () => { if (this.enabled && !("ontouchstart" in window)) canvas.requestPointerLock?.(); });
    canvas.addEventListener("wheel", e => { this.zoom += e.deltaY; }, { passive: true });
    addEventListener("mousedown", e => { if (document.pointerLockElement !== canvas) return; if (e.button === 0) this.mouseFire = true; if (e.button === 2) this.mouseAim = true; });
    addEventListener("mouseup", e => { if (e.button === 0) this.mouseFire = false; if (e.button === 2) this.mouseAim = false; });
    canvas.addEventListener("contextmenu", e => e.preventDefault());
    this.bindTouch();
  }

  private bindTouch(): void {
    const knob = document.getElementById("knob")!, joyEl = document.getElementById("joy")!;
    const hold = (id: string, set: (v: boolean) => void) => {
      const b = document.getElementById(id)!;
      b.addEventListener("pointerdown", e => { e.stopPropagation(); set(true); });
      for (const t of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(t, () => set(false));
    };
    hold("btn-sprint", v => (this.touchSprint = v)); hold("btn-jump", v => (this.touchJump = v));
    hold("btn-fire", v => (this.touchFire = v)); hold("btn-aim", v => (this.touchAim = v));
    document.getElementById("btn-reload")!.addEventListener("pointerdown", e => { e.stopPropagation(); this.reloadEdge = true; });
    const R = 50;
    this.canvas.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" || !this.enabled) return;
      if (e.clientX < innerWidth * 0.45 && this.joyId < 0) {
        this.joyId = e.pointerId; this.joy = { x: e.clientX, y: e.clientY, vx: 0, vy: 0 };
        joyEl.style.left = e.clientX - 65 + "px"; joyEl.style.top = e.clientY - 65 + "px"; joyEl.style.bottom = "auto";
      } else if (this.lookId < 0) { this.lookId = e.pointerId; this.lastX = e.clientX; this.lastY = e.clientY; }
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", e => {
      if (e.pointerId === this.joyId) {
        let dx = e.clientX - this.joy.x, dy = e.clientY - this.joy.y; const l = Math.hypot(dx, dy) || 1;
        if (l > R) { dx = dx / l * R; dy = dy / l * R; }
        this.joy.vx = dx / R; this.joy.vy = -dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`;
      } else if (e.pointerId === this.lookId) {
        this.lookX += (e.clientX - this.lastX) * 1.4; this.lookY += (e.clientY - this.lastY) * 1.4;
        this.lastX = e.clientX; this.lastY = e.clientY;
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.joyId) { this.joyId = -1; this.joy.vx = this.joy.vy = 0; knob.style.transform = ""; }
      if (e.pointerId === this.lookId) this.lookId = -1;
    };
    this.canvas.addEventListener("pointerup", end); this.canvas.addEventListener("pointercancel", end);
  }

  /** Samples devices into `state`. Call once per frame. */
  update(): void {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    let x = k("KeyD") - k("KeyA"), y = k("KeyW") - k("KeyS");
    if (this.joyId >= 0) { x = this.joy.vx; y = this.joy.vy; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    this.state.moveX = this.enabled ? x : 0; this.state.moveY = this.enabled ? y : 0;
    this.state.sprint = this.enabled && (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.touchSprint);
    this.state.walk = this.enabled && (this.keys.has("ControlLeft") || this.keys.has("AltLeft"));
    this.state.fire = this.enabled && (this.mouseFire || this.touchFire); this.state.aim = this.enabled && (this.mouseAim || this.touchAim);
    this.state.jump = this.enabled && (this.keys.has("Space") || this.touchJump);
  }

  /** True once per reload key/button press. */
  consumeReload(): boolean { const r = this.reloadEdge; this.reloadEdge = false; return r; }

  /** Returns accumulated mouse-wheel delta since the last call (camera zoom). */
  consumeZoom(): number { const z = this.zoom; this.zoom = 0; return z; }

  /** Returns accumulated look delta (pixels) since the last call. */
  consumeLook(): { x: number; y: number } {
    const r = { x: this.lookX, y: this.lookY }; this.lookX = this.lookY = 0; return r;
  }
}
