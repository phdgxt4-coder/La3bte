import { Scene, Mesh, MeshBuilder, TransformNode, Vector3, Ray, StandardMaterial, Color3, AbstractMesh } from "@babylonjs/core";
import { CONFIG } from "./config";
import { InputState } from "./InputManager";
import { AnimationBlender, LimbRig } from "./AnimationBlender";
import { PlayerMotion, createMotion } from "./PlayerMotion";
import { angleDelta, clamp, damp } from "./MathUtil";
import { heightAt } from "./Terrain";

/**
 * Player: capsule collider (solids) + analytic terrain ground (no triangle collision, no slope sliding).
 * Features: separate accel/decel, air control, coyote time, jump buffering, variable jump height, fall gravity,
 * landing impact + recovery, ground snapping, anti-slide, smooth facing towards movement.
 */
export class PlayerController {
  readonly root: TransformNode;
  readonly casters: Mesh[] = [];
  readonly motion: PlayerMotion = createMotion();
  /** Fired once per landing with impact 0..1 (used by camera shake). */
  onLand?: (impact: number) => void;
  private collider: Mesh;
  private vel = new Vector3(); private vy = 0; private grounded = true; private yaw = 0;
  private coyote = 0; private jumpBuf = 0; private prevJump = false; private recover = 0;
  private ray = new Ray(Vector3.Zero(), Vector3.Down(), 1);
  private anim: AnimationBlender;
  private static solidOnly = (m: AbstractMesh): boolean => m.metadata?.solid === true;

  constructor(private scene: Scene, spawn: Vector3) {
    const p = CONFIG.player;
    this.collider = MeshBuilder.CreateCapsule("collider", { height: p.height, radius: p.radius }, scene);
    this.collider.isVisible = false; this.collider.isPickable = false; this.collider.checkCollisions = true;
    this.collider.ellipsoid = new Vector3(p.radius, p.height / 2, p.radius);
    this.collider.position.set(spawn.x, heightAt(spawn.x, spawn.z) + p.height / 2, spawn.z);
    this.root = new TransformNode("player", scene);
    this.anim = new AnimationBlender(this.buildRig());
    this.syncVisual();
  }

  get position(): Vector3 { return this.root.position; }

  private mat(c: string): StandardMaterial { const m = new StandardMaterial("m" + c, this.scene); m.diffuseColor = Color3.FromHexString(c); m.specularColor = Color3.Black(); return m; }

  private box(name: string, w: number, h: number, d: number, parent: TransformNode, y: number, mat: StandardMaterial): Mesh {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
    m.material = mat; m.parent = parent; m.position.y = y; m.isPickable = false;
    this.casters.push(m); return m;
  }

  private buildRig(): LimbRig {
    const suit = this.mat("#2f6bff"), skin = this.mat("#f1c9a5"), dark = this.mat("#1b2238");
    const body = new TransformNode("body", this.scene); body.parent = this.root; body.position.y = 0.95;
    this.box("torso", 0.55, 0.7, 0.3, body, 0.3, suit);
    const head = MeshBuilder.CreateSphere("head", { diameter: 0.34, segments: 12 }, this.scene);
    head.material = skin; head.parent = body; head.position.y = 0.85; head.isPickable = false; this.casters.push(head);
    const limb = (n: string, x: number, y: number, w: number, h: number, mat: StandardMaterial) => {
      const piv = new TransformNode(n, this.scene); piv.parent = body; piv.position.set(x, y, 0);
      this.box(n + "m", w, h, w, piv, -h / 2, mat); return piv;
    };
    return {
      body,
      armL: limb("armL", -0.37, 0.62, 0.18, 0.6, suit), armR: limb("armR", 0.37, 0.62, 0.18, 0.6, suit),
      legL: limb("legL", -0.14, -0.05, 0.22, 0.85, dark), legR: limb("legR", 0.14, -0.05, 0.22, 0.85, dark),
    };
  }

  /** Highest walkable surface under (x,z): analytic terrain vs. a single ray against solid props. */
  private groundY(x: number, z: number, fromY: number): number {
    let y = heightAt(x, z);
    this.ray.origin.set(x, fromY, z); this.ray.length = CONFIG.player.height / 2 + 0.7;
    const hit = this.scene.pickWithRay(this.ray, PlayerController.solidOnly);
    if (hit?.hit && hit.pickedPoint) y = Math.max(y, hit.pickedPoint.y);
    return y;
  }

  /** Per-frame update. `camYaw` makes input camera-relative. */
  update(dt: number, input: InputState, camYaw: number): void {
    const p = CONFIG.player, m = this.motion, pos = this.collider.position;
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    let top = mag < 0.05 ? 0 : input.sprint ? p.sprint : input.walk || mag < 0.5 ? p.walk : p.run;
    if (this.recover > 0) { top *= p.landSlow; this.recover -= dt; }
    const wx = sy * input.moveY + cy * input.moveX, wz = cy * input.moveY - sy * input.moveX, wl = Math.hypot(wx, wz) || 1;
    const tx = (wx / wl) * top, tz = (wz / wl) * top;

    // Horizontal: separate accel / decel on ground, reduced control in air, hard stop to prevent sliding.
    const hs0 = Math.hypot(this.vel.x, this.vel.z);
    const rate = this.grounded ? (top > hs0 ? p.accel : p.decel) : top > 0 ? p.accel * p.airControl : p.airDrag;
    const k = 1 - Math.exp(-rate * dt);
    this.vel.x += (tx - this.vel.x) * k; this.vel.z += (tz - this.vel.z) * k;
    if (this.grounded && top === 0 && Math.hypot(this.vel.x, this.vel.z) < 0.2) this.vel.x = this.vel.z = 0;
    const hs = Math.hypot(this.vel.x, this.vel.z);

    // Facing: velocity direction when moving, otherwise the intended direction (turn-in-place).
    const fx = hs > 0.5 ? this.vel.x : tx, fz = hs > 0.5 ? this.vel.z : tz;
    let turn = 0;
    if (Math.hypot(fx, fz) > 0.1) {
      const step = angleDelta(this.yaw, Math.atan2(fx, fz)) * (1 - Math.exp(-(this.grounded ? p.turnRate : p.turnRate * 0.35) * dt));
      this.yaw += step; turn = step / Math.max(dt, 1e-4);
    }
    m.turnRate = damp(m.turnRate, turn, 12, dt);

    // Vertical: coyote time, jump buffer, variable height, heavier fall.
    this.jumpBuf = input.jump && !this.prevJump ? p.jumpBuffer : this.jumpBuf - dt; this.prevJump = input.jump;
    this.coyote = this.grounded ? p.coyote : this.coyote - dt;
    if (this.jumpBuf > 0 && this.coyote > 0) { this.vy = p.jump; this.grounded = false; this.coyote = 0; this.jumpBuf = 0; }
    if (!(this.grounded && this.vy <= 0)) {
      const g = this.vy < 0 ? p.gravity * p.fallMul : input.jump ? p.gravity : p.gravity * p.cutMul;
      this.vy = Math.max(p.terminal, this.vy + g * dt);
    }
    this.collider.moveWithCollisions(new Vector3(this.vel.x * dt, this.vy * dt, this.vel.z * dt));

    // Ground resolve: snap down slopes while grounded, land when falling through the surface.
    const was = this.grounded, fall = this.vy, gy = this.groundY(pos.x, pos.z, pos.y);
    if (this.vy <= 0 && pos.y - p.height / 2 <= gy + (was ? p.snap : 0.03)) {
      pos.y = gy + p.height / 2; this.vy = 0; this.grounded = true;
      if (!was && fall < -4) {
        const impact = clamp((-fall - 2) / 16, 0.1, 1);
        m.landImpact = impact; this.recover = 0.12 + 0.25 * impact; this.onLand?.(impact);
      }
    } else this.grounded = false;

    m.speed = hs; m.speedNorm = clamp(hs / p.sprint, 0, 1); m.grounded = this.grounded; m.vy = this.vy;
    m.sprintT = damp(m.sprintT, input.sprint && hs > p.run * 0.9 ? 1 : 0, 6, dt);
    m.landImpact *= Math.exp(-7 * dt);
    this.anim.update(dt, m);
    this.syncVisual();
  }

  private syncVisual(): void {
    const c = this.collider.position;
    this.root.position.set(c.x, c.y - CONFIG.player.height / 2, c.z);
    this.root.rotation.y = this.yaw;
  }
}
