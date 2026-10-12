/** Trauma-based camera shake (squared trauma gives a natural fall-off). Output is a small positional + roll offset. */
export class CameraShake {
  trauma = 0; private t = 0;
  readonly out = { x: 0, y: 0, roll: 0 };
  add(amount: number): void { this.trauma = Math.min(1, this.trauma + amount); }
  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    if (this.trauma <= 0.001) { this.out.x = this.out.y = this.out.roll = 0; return; }
    const s = this.trauma * this.trauma; this.t += dt * 32;
    this.out.x = (Math.sin(this.t * 1.3) + Math.sin(this.t * 2.7)) * 0.5 * s * 0.07;
    this.out.y = (Math.sin(this.t * 1.9 + 1) + Math.sin(this.t * 3.1)) * 0.5 * s * 0.07;
    this.out.roll = Math.sin(this.t * 1.1 + 2) * s * 0.03;
  }
}
