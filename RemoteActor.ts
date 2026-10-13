import { Scene, Vector3 } from "@babylonjs/core";
import { Actor } from "./Actor";
import { AnimationBlender } from "./AnimationBlender";
import { createMotion } from "./PlayerMotion";
import { buildSoldier, Soldier } from "./SoldierModel";
import { applyHold } from "./WeaponPose";
import { ShadowCaster } from "./WorldContext";
import { angleDelta, damp } from "./MathUtil";
import { heightAt } from "./Terrain";

/** Network-driven character: interpolates toward the latest received state, animates from speed. */
export class RemoteActor implements Actor {
  readonly kind = "remote"; hp = 100; alive = true; yaw = 0; speed = 0;
  private s: Soldier; private anim: AnimationBlender; private motion = createMotion();
  private tx = 0; private ty = 0; private tz = 0; private tyaw = 0; private tspd = 0; private dieT = 0;
  constructor(readonly id: string, readonly name: string, scene: Scene, hex: string, spawn: Vector3, shadow: ShadowCaster) {
    this.s = buildSoldier(scene, hex, shadow); this.anim = new AnimationBlender(this.s.rig);
    this.s.root.position.set(spawn.x, heightAt(spawn.x, spawn.z), spawn.z); this.tx = spawn.x; this.ty = this.s.root.position.y; this.tz = spawn.z;
  }
  get feet(): Vector3 { return this.s.root.position; }
  setState(x: number, y: number, z: number, yaw: number, spd: number): void { this.tx = x; this.ty = y; this.tz = z; this.tyaw = yaw; this.tspd = spd; }
  setVitals(hp: number, alive: boolean): void { this.hp = hp; if (!alive && this.alive) this.die(); }
  die(): void { this.alive = false; this.hp = 0; this.s.root.rotation.x = -Math.PI / 2; }
  update(dt: number, cam: Vector3): void {
    const p = this.s.root.position;
    if (!this.alive) { this.dieT += dt; if (this.dieT > 6) this.s.root.setEnabled(false); return; }
    p.x = damp(p.x, this.tx, 14, dt); p.y = damp(p.y, this.ty, 14, dt); p.z = damp(p.z, this.tz, 14, dt);
    this.yaw += angleDelta(this.yaw, this.tyaw) * (1 - Math.exp(-14 * dt)); this.s.root.rotation.y = this.yaw;
    this.speed = damp(this.speed, this.tspd, 10, dt);
    if (Vector3.DistanceSquared(p, cam) < 6400) {
      const m = this.motion; m.speed = this.speed; m.speedNorm = Math.min(1, this.speed / 8.2); m.grounded = true; this.anim.update(dt, m);
      applyHold(this.s.rig, { sprint: m.speedNorm > 0.8 ? 1 : 0, aim: 0, reload: 0, kick: 0 });
    }
  }
  dispose(): void { this.s.root.dispose(); }
}
