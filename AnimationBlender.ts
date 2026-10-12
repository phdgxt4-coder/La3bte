import { TransformNode } from "@babylonjs/core";
import { clamp, damp } from "./MathUtil";
import { PlayerMotion } from "./PlayerMotion";

export interface LimbRig { body: TransformNode; armL: TransformNode; armR: TransformNode; legL: TransformNode; legR: TransformNode }
type Gait = "idle" | "walk" | "run" | "sprint";
const GAITS: Record<Gait, { speed: number; freq: number; amp: number }> = {
  idle: { speed: 0, freq: 2, amp: 0.04 }, walk: { speed: 2.4, freq: 7, amp: 0.55 },
  run: { speed: 5.2, freq: 10, amp: 0.95 }, sprint: { speed: 8.2, freq: 13, amp: 1.25 },
};

/**
 * Procedural layered animation blender. Base layer: idle/walk/run/sprint (weights smoothed, never snap).
 * Overlay layers: jump (rising vs falling pose), land (crouch, decays), turn (body roll + in-place stepping), idle breathing.
 * Consumes PlayerMotion only, so a glTF AnimationGroup implementation can replace it without touching the controller.
 */
export class AnimationBlender {
  private w: Record<Gait, number> = { idle: 1, walk: 0, run: 0, sprint: 0 };
  private air = 0; private rise = 0; private land = 0; private roll = 0;
  private phase = 0; private t = 0;
  constructor(private rig: LimbRig) {}

  update(dt: number, m: PlayerMotion): void {
    const names = Object.keys(this.w) as Gait[];
    const k = 1 - Math.exp(-14 * dt); let sum = 0;
    names.forEach(n => {
      const tg = Math.max(0, 1 - Math.abs(m.speed - GAITS[n].speed) / (n === "idle" ? 1.2 : n === "walk" ? 2.4 : 3));
      this.w[n] += (tg - this.w[n]) * k; sum += this.w[n];
    });
    this.air = damp(this.air, m.grounded ? 0 : 1, 16, dt);
    this.rise = damp(this.rise, m.vy > 0 ? 1 : 0, 12, dt);
    this.land = damp(this.land, m.landImpact, 20, dt);

    let freq = 0, amp = 0;
    names.forEach(n => { const nw = this.w[n] / (sum || 1); freq += GAITS[n].freq * nw; amp += GAITS[n].amp * nw; });
    const turnStep = clamp(Math.abs(m.turnRate) / 5, 0, 1) * (m.speed < 0.8 ? 1 : 0); // turn-in-place stepping
    amp = Math.max(amp, 0.35 * turnStep); freq = Math.max(freq, 6 * turnStep);
    this.t += dt; this.phase += freq * dt;

    const r = this.rig, g = 1 - this.air, swing = Math.sin(this.phase) * amp * g;
    const legAir = this.rise * -0.9 + (1 - this.rise) * -0.3, armAir = -(1.0 + 1.3 * this.rise);
    r.legL.rotation.x = swing + this.air * legAir - 0.6 * this.land;
    r.legR.rotation.x = -swing + this.air * 0.3 - 0.6 * this.land;
    r.armL.rotation.x = -swing + this.air * armAir - 0.3 * this.land;
    r.armR.rotation.x = swing + this.air * armAir - 0.3 * this.land;

    const sprintW = this.w.sprint / (sum || 1), idleW = this.w.idle / (sum || 1) * g;
    this.roll = damp(this.roll, clamp(-m.turnRate * 0.05, -0.3, 0.3) * (m.speed > 1 ? 1 : 0.3), 10, dt);
    r.body.rotation.x = 0.04 + Math.min(0.25, amp * 0.1) + 0.2 * sprintW + 0.35 * this.land;
    r.body.rotation.z = this.roll;
    r.body.position.y = 0.95 + Math.abs(Math.cos(this.phase)) * 0.05 * (amp > 0.3 ? g : 0) - 0.3 * this.land + Math.sin(this.t * 1.6) * 0.008 * idleW;
  }
}
