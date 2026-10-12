import { FreeCamera, Scene, Vector3, Ray, AbstractMesh, TransformNode } from "@babylonjs/core";
import { CONFIG } from "./config";
import { clamp, damp } from "./MathUtil";
import { PlayerMotion } from "./PlayerMotion";
import { heightAt } from "./Terrain";
import { CameraShake } from "./CameraShake";

/**
 * Over-the-shoulder camera.
 * Smooth yaw/pitch, follow lag (stronger when sprinting), collision pull-in (throttled ray), terrain clamp,
 * wheel/slider zoom, speed-based distance, sprint FOV, run bob, idle breathing and landing shake.
 */
export class ThirdPersonCamera {
  readonly camera: FreeCamera;
  yaw = 0; sensitivity = 1; baseZoom = 1;
  private pitch = 0.25; private smYaw = 0; private smPitch = 0.25;
  private pivot = new Vector3(); private dist = CONFIG.camera.distance; private hitDist = Infinity;
  private zoomT = 1; private zoom = 1; private fov = CONFIG.camera.fov;
  private bobPhase = 0; private time = 0; private frame = 0;
  private shake = new CameraShake();
  private ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);
  private static occluders = (m: AbstractMesh): boolean => m.metadata?.occluder === true;

  constructor(private scene: Scene, private target: TransformNode, private motion: PlayerMotion) {
    this.camera = new FreeCamera("cam", new Vector3(0, 3, -5), scene);
    this.camera.fov = this.fov; this.camera.minZ = 0.1; this.camera.maxZ = 400;
    this.camera.inputs.clear();
    this.pivot.copyFrom(target.position);
  }

  /** Landing impact 0..1 -> shake. */
  impact(amount: number): void { this.shake.add(amount * CONFIG.camera.landShake); }

  update(dt: number, look: { x: number; y: number }, zoomDelta: number): void {
    const c = CONFIG.camera, m = this.motion, s = c.baseSens * this.sensitivity;
    this.yaw += look.x * s;
    this.pitch = clamp(this.pitch + look.y * s, c.minPitch, c.maxPitch);
    this.smYaw = damp(this.smYaw, this.yaw, 25, dt); this.smPitch = damp(this.smPitch, this.pitch, 25, dt);
    this.zoomT = clamp(this.zoomT + zoomDelta * 0.001, c.zoomMin / this.baseZoom, c.zoomMax / this.baseZoom);
    this.zoom = damp(this.zoom, this.zoomT * this.baseZoom, 10, dt);

    const cy = Math.cos(this.smYaw), sy = Math.sin(this.smYaw), cp = Math.cos(this.smPitch), sp = Math.sin(this.smPitch);
    const dir = new Vector3(sy * cp, -sp, cy * cp), right = new Vector3(cy, 0, -sy);
    const goal = this.target.position;
    // Follow lag: horizontal lags more at sprint, vertical stays tight so jumps feel responsive.
    const rh = c.follow * (1 - 0.4 * m.sprintT);
    this.pivot.x = damp(this.pivot.x, goal.x + right.x * c.shoulder, rh, dt);
    this.pivot.z = damp(this.pivot.z, goal.z + right.z * c.shoulder, rh, dt);
    this.pivot.y = damp(this.pivot.y, goal.y + c.height, 12, dt);

    // Dynamic distance + collision (ray every 2nd frame; result cached).
    const want = c.distance * this.zoom + 0.5 * m.speedNorm + 0.4 * m.sprintT;
    if ((this.frame++ & 1) === 0) {
      this.ray.origin.copyFrom(this.pivot); this.ray.direction.copyFrom(dir).scaleInPlace(-1); this.ray.length = want + c.collisionPad;
      const hit = this.scene.pickWithRay(this.ray, ThirdPersonCamera.occluders);
      this.hitDist = hit?.hit ? Math.max(0.6, hit.distance - c.collisionPad) : Infinity;
    }
    const goalDist = Math.min(want, this.hitDist);
    this.dist = damp(this.dist, goalDist, goalDist < this.dist ? 30 : 5, dt);

    // Feel: run bob, idle breathing, landing shake.
    this.time += dt; this.bobPhase += dt * (6 + m.speed * 0.9) * (m.grounded ? 1 : 0);
    this.shake.update(dt);
    const bob = Math.sin(this.bobPhase * 2) * c.bobAmp * m.speedNorm, sway = Math.sin(this.bobPhase) * c.bobAmp * 0.6 * m.speedNorm;
    const breath = Math.sin(this.time * 1.4) * c.breathAmp * (1 - m.speedNorm);

    const p = this.camera.position;
    p.copyFrom(this.pivot).subtractInPlace(dir.scale(this.dist));
    p.x += right.x * (sway + this.shake.out.x); p.z += right.z * (sway + this.shake.out.x);
    p.y += bob + breath + this.shake.out.y;
    p.y = Math.max(p.y, heightAt(p.x, p.z) + 0.35);

    this.fov = damp(this.fov, c.fov + c.fovSprint * m.sprintT, 6, dt); this.camera.fov = this.fov;
    this.camera.rotation.set(this.smPitch + breath * 0.2 + this.shake.out.y * 0.3, this.smYaw + this.shake.out.x * 0.3, this.shake.out.roll);
  }
}
