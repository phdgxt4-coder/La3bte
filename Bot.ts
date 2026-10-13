import { Scene, Vector3 } from "@babylonjs/core";
import { Actor, hitscan } from "./Actor";
import { AnimationBlender } from "./AnimationBlender";
import { createMotion } from "./PlayerMotion";
import { buildSoldier, Soldier } from "./SoldierModel";
import { applyHold } from "./WeaponPose";
import { ShadowCaster } from "./WorldContext";
import { angleDelta, clamp, damp } from "./MathUtil";
import { heightAt } from "./Terrain";
import { CONFIG } from "./config";

export interface BotContext {
  scene: Scene; shadow: ShadowCaster; camPos: Vector3;
  actors(): Iterable<Actor>;
  /** Bot fired from `from` towards `to`; `hit` is the actor struck (if any). */
  fire(bot: Bot, from: Vector3, to: Vector3, hit: Actor | null): void;
}

/**
 * Simple soldier AI: patrol -> (see enemy) chase/shoot -> (lose sight) search -> patrol.
 * Perception runs ~3x/s, movement is kinematic (analytic terrain + short forward ray for obstacles), animation skipped when far from camera.
 */
export class Bot implements Actor {
  readonly kind = "bot"; hp = 100; alive = true; yaw = 0; speed = 0;
  private s: Soldier; private anim: AnimationBlender; private motion = createMotion();
  private state: "patrol" | "chase" | "search" = "patrol"; private wp = new Vector3(); private target: Actor | null = null; private lastSeen = new Vector3();
  private think = Math.random() * 0.3; private cd = 0; private react = 0; private burst = 0; private pause = 0; private searchT = 0; private blockT = 0; private dieT = 0; private strafe = Math.random() * 6;
  constructor(readonly id: string, readonly name: string, private ctx: BotContext, spawn: Vector3, hex: string) {
    this.s = buildSoldier(ctx.scene, hex, ctx.shadow); this.anim = new AnimationBlender(this.s.rig); this.s.root.position.set(spawn.x, heightAt(spawn.x, spawn.z), spawn.z); this.yaw = Math.random() * 6.28; this.newWaypoint();
  }
  get feet(): Vector3 { return this.s.root.position; }
  private newWaypoint(): void { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 80; this.wp.set(Math.cos(a) * r, 0, Math.sin(a) * r); }
  die(): void { this.alive = false; this.hp = 0; this.s.root.rotation.x = -Math.PI / 2; }
  dispose(): void { this.s.root.dispose(); }

  private scan(): void {
    const p = this.feet; let best: Actor | null = null, bd = CONFIG.match.botView ** 2;
    for (const a of this.ctx.actors()) {
      if (a === this || !a.alive) continue;
      const dx = a.feet.x - p.x, dz = a.feet.z - p.z, d2 = dx * dx + dz * dz; if (d2 >= bd) continue;
      if (d2 > 144 && Math.abs(angleDelta(this.yaw, Math.atan2(dx, dz))) > 1.1) continue;
      const o = new Vector3(p.x, p.y + 1.5, p.z), to = new Vector3(a.feet.x, a.feet.y + 1.1, a.feet.z).subtractInPlace(o), len = to.length();
      if (hitscan(this.ctx.scene, o, to.scaleInPlace(1 / len), [], "", len).dist >= len - 0.6) { best = a; bd = d2; }
    }
    if (best) { if (!this.target) this.react = 0.45 + Math.random() * 0.3; this.target = best; this.state = "chase"; this.lastSeen.copyFrom(best.feet); this.searchT = 4; }
    else if (this.state === "chase") { this.target = null; this.state = "search"; }
  }

  private moveTo(x: number, z: number, speed: number, dt: number): void {
    const p = this.feet, dx = x - p.x, dz = z - p.z, l = Math.hypot(dx, dz) || 1;
    if (speed <= 0) { this.speed = damp(this.speed, 0, 10, dt); return; }
    if ((this.blockT -= dt) <= 0) {
      this.blockT = 0.2; const o = new Vector3(p.x, p.y + 1, p.z), d = new Vector3(dx / l, 0, dz / l);
      if (hitscan(this.ctx.scene, o, d, [], "", 1.6).dist < 1.5) { this.newWaypoint(); this.strafe += 3; return; }
    }
    this.yaw += angleDelta(this.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-8 * dt));
    this.speed = damp(this.speed, speed, 8, dt);
    p.x += (dx / l) * this.speed * dt; p.z += (dz / l) * this.speed * dt;
    const rr = Math.hypot(p.x, p.z); if (rr > 84) { p.x *= 84 / rr; p.z *= 84 / rr; }
    p.y = heightAt(p.x, p.z);
  }

  update(dt: number): void {
    const p = this.feet;
    if (!this.alive) { if ((this.dieT += dt) > 6) this.s.root.setEnabled(false); return; }
    if ((this.think -= dt) <= 0) { this.think = 0.3 + Math.random() * 0.2; this.scan(); }
    this.cd -= dt;
    if (this.state === "chase" && this.target?.alive) {
      const t = this.target, dx = t.feet.x - p.x, dz = t.feet.z - p.z, dist = Math.hypot(dx, dz);
      this.yaw += angleDelta(this.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-10 * dt));
      this.strafe += dt;
      if (dist > 16) this.moveTo(t.feet.x, t.feet.z, 3.8, dt);
      else this.moveTo(p.x + Math.cos(this.yaw) * Math.sin(this.strafe), p.z - Math.sin(this.yaw) * Math.sin(this.strafe), 1.8, dt);
      this.react -= dt; this.pause -= dt;
      if (this.react <= 0 && this.cd <= 0 && this.pause <= 0 && dist < CONFIG.match.botRange) {
        const from = new Vector3(p.x + Math.sin(this.yaw) * 0.7, p.y + 1.3, p.z + Math.cos(this.yaw) * 0.7), to = new Vector3(t.feet.x, t.feet.y + 1.1, t.feet.z);
        const hit = Math.random() < clamp(0.6 - dist * 0.011, 0.1, 0.5);
        if (!hit) to.addInPlace(new Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2.4));
        this.ctx.fire(this, from, to, hit ? t : null);
        this.cd = 0.2 + Math.random() * 0.1; if (++this.burst >= 5) { this.burst = 0; this.pause = 0.7 + Math.random() * 0.6; }
      }
    } else if (this.state === "search") {
      this.moveTo(this.lastSeen.x, this.lastSeen.z, 3.2, dt);
      if ((this.searchT -= dt) <= 0 || Math.hypot(this.lastSeen.x - p.x, this.lastSeen.z - p.z) < 2) { this.state = "patrol"; this.newWaypoint(); }
    } else {
      this.moveTo(this.wp.x, this.wp.z, 2.4, dt);
      if (Math.hypot(this.wp.x - p.x, this.wp.z - p.z) < 2) this.newWaypoint();
    }
    this.s.root.rotation.y = this.yaw;
    if (Vector3.DistanceSquared(p, this.ctx.camPos) < 6400) {
      const m = this.motion; m.speed = this.speed; m.speedNorm = Math.min(1, this.speed / 8.2); m.grounded = true; this.anim.update(dt, m);
      applyHold(this.s.rig, { sprint: 0, aim: this.state === "chase" ? 1 : 0, reload: 0, kick: 0 });
    }
  }
}
