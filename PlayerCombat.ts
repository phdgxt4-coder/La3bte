import { Scene, Vector3 } from "@babylonjs/core";
import { PlayerController } from "./PlayerController";
import { ThirdPersonCamera } from "./ThirdPersonCamera";
import { Effects } from "./Effects";
import { AudioManager } from "./AudioManager";
import { InputState } from "./InputManager";
import { WeaponSystem } from "./Weapon";
import { Rifle } from "./Rifle";
import { applyHold, HoldState } from "./WeaponPose";
import { hitscan } from "./Actor";
import { CONFIG } from "./config";
import { damp } from "./MathUtil";

/**
 * Local player's weapon: model + arm pose, aim-down-sights, recoil, spread, effects and sounds.
 * Damage is NOT decided here: shots are handed to `onShoot` (Match resolves them, locally or over the network).
 */
export class PlayerCombat {
  readonly weapon = new WeaponSystem();
  /** Returns true if the shot hit something (hit marker). */
  onShoot?: (origin: Vector3, dir: Vector3) => boolean;
  onHit?: () => void;
  private rifle: Rifle; private hold: HoldState = { sprint: 0, aim: 0, reload: 0, kick: 0 }; private recent = 0;

  constructor(private scene: Scene, private player: PlayerController, private cam: ThirdPersonCamera, private fx: Effects, private audio: AudioManager) {
    this.rifle = new Rifle(scene, player.rig.body, player.casters);
    player.onPostAnim = rig => applyHold(rig, this.hold);
  }

  update(dt: number, input: InputState, alive: boolean, wantReload: boolean): void {
    const h = this.hold, sprinting = input.sprint && this.player.motion.speed > 5.5;
    h.aim = damp(h.aim, alive && input.aim && !sprinting ? 1 : 0, 12, dt); this.cam.aim = h.aim;
    h.sprint = damp(h.sprint, sprinting ? 1 : 0, 10, dt); h.reload = damp(h.reload, this.weapon.reloading ? 1 : 0, 8, dt); h.kick = damp(h.kick, 0, 18, dt);
    this.recent = Math.max(0, this.recent - dt);
    this.player.facingYaw = alive && (input.aim || input.fire || this.recent > 0) ? this.cam.yaw : null;
    const ev = this.weapon.update(dt, alive && input.fire && !sprinting, alive && wantReload);
    if (ev.empty) this.audio.empty();
    if (ev.reloadStart) this.audio.reload();
    if (!ev.fired) return;
    this.recent = 0.8;
    const w = CONFIG.weapon, o = this.cam.camera.position.clone(), d = this.cam.camera.getForwardRay(1).direction.clone();
    const sp = (h.aim > 0.5 ? w.aimSpread : w.spread) * (1 + this.player.motion.speedNorm);
    d.x += (Math.random() - 0.5) * 2 * sp; d.y += (Math.random() - 0.5) * 2 * sp; d.z += (Math.random() - 0.5) * 2 * sp; d.normalize();
    this.cam.kick(w.kick * (1 - 0.4 * h.aim)); h.kick += 0.1;
    this.fx.muzzleFlash(this.rifle.muzzle); this.fx.eject(this.rifle.eject); this.audio.shot();
    const end = hitscan(this.scene, o, d, [], "", w.range).point;
    this.fx.tracer(this.rifle.muzzle.getAbsolutePosition(), end); this.fx.spark(end);
    if (this.onShoot?.(o, d)) { this.onHit?.(); this.audio.hit(); }
  }
}
