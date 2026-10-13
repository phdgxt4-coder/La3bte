import { Scene, Vector3 } from "@babylonjs/core";
import { createEngine } from "./EngineFactory";
import { InputManager, InputState } from "./InputManager";
import { ThirdPersonCamera } from "./ThirdPersonCamera";
import { PlayerController } from "./PlayerController";
import { PlayerCombat } from "./PlayerCombat";
import { World } from "./World";
import { UI } from "./UI";
import { Match } from "./Match";
import { Effects } from "./Effects";
import { AudioManager } from "./AudioManager";
import { createPostFX } from "./PostFX";
import { isMobile } from "./config";

const tick = (): Promise<void> => new Promise(r => setTimeout(r, 0));
const IDLE: InputState = { moveX: 0, moveY: 0, sprint: false, jump: false, walk: false, fire: false, aim: false };

/** Composition root: loading, systems wiring, menu/match flow, main loop. */
export class Game {
  private cam?: ThirdPersonCamera;

  async start(canvas: HTMLCanvasElement): Promise<void> {
    const { engine, backend } = await createEngine(canvas), base = engine.getHardwareScalingLevel(), mobile = isMobile(), audio = new AudioManager();
    let match: Match | undefined;
    const ui: UI = new UI({
      onQuick: () => { audio.unlock(); match!.startQuick(); },
      onCreateRoom: async () => { audio.unlock(); try { await match!.createRoom(); } catch (e) { console.error(e); ui.toast("Could not create room (network)"); ui.showMenu(); } },
      onJoin: async code => { audio.unlock(); try { await match!.joinRoom(code); } catch (e) { console.error(e); match!.leave(); ui.toast("Could not join room - check the code"); ui.showMenu(); } },
      onStartMatch: () => match!.hostStart(),
      onEndRoom: () => { match!.endRoom(); ui.showMenu(); },
      onLeave: () => { match!.leave(); ui.showMenu(); },
      onContinue: () => { if (match!.role === "offline") { match!.leave(); ui.showMenu(); } else match!.backToLobby(); },
      onSensitivity: v => { if (this.cam) this.cam.sensitivity = v; },
      onRenderScale: v => engine.setHardwareScalingLevel(base / v),
      onCameraDistance: v => { if (this.cam) this.cam.baseZoom = v; },
    }, backend, mobile);

    ui.setLoading(0.02, "Creating scene"); await tick();
    const scene = new Scene(engine); scene.skipPointerMovePicking = true;
    const world = await World.create(scene, (p, t) => ui.setLoading(0.05 + p * 0.8, t));
    const player = new PlayerController(scene, new Vector3(0, 0, 4));
    player.casters.forEach(m => world.shadow.addShadowCaster(m));
    const cam = this.cam = new ThirdPersonCamera(scene, player.root, player.motion);
    player.onLand = i => cam.impact(i);
    scene.activeCamera = cam.camera; world.bindCamera(cam.camera);
    const input = new InputManager(canvas), fx = new Effects(scene), combat = new PlayerCombat(scene, player, cam, fx, audio);
    match = new Match({ scene, player, combat, fx, audio, ui, spawns: world.spawns, camPos: cam.camera.position, shadow: world.shadow, onSpawn: yaw => (cam.yaw = yaw) });
    ui.setLoading(0.92, "Post-processing"); await tick();
    createPostFX(scene, cam.camera, backend, mobile);
    ui.setLoading(0.97, "Compiling shaders"); await scene.whenReadyAsync();
    ui.setLoading(1, "Ready"); ui.hideLoading(); ui.showMenu();

    const room = new URLSearchParams(location.search).get("room");
    if (room) { ui.toast("Joining room " + room.toUpperCase() + "…"); void match.joinRoom(room).catch(e => { console.error(e); ui.toast("Could not join - room closed or wrong code"); match!.leave(); ui.showMenu(); }); }

    addEventListener("resize", () => engine.resize());
    let acc = 0, hudT = 0;
    engine.runRenderLoop(() => {
      const dt = Math.min(engine.getDeltaTime() / 1000, 0.05), playing = match!.state === "playing", alive = playing && match!.me.alive;
      input.enabled = playing; input.update();
      const st = alive ? input.state : IDLE;
      player.update(dt, st, cam.yaw);
      combat.update(dt, st, alive, input.consumeReload());
      if (!playing) cam.yaw += dt * 0.08;
      cam.update(dt, input.consumeLook(), input.consumeZoom());
      match!.update(dt); fx.update(dt);
      if ((hudT += dt) > 0.1) { hudT = 0; ui.setHealth(match!.me.hp); ui.setAmmo(combat.weapon.ammo, combat.weapon.reserve, combat.weapon.reloading); }
      scene.render();
      if ((acc += dt) > 0.5) { acc = 0; ui.setFps(engine.getFps()); }
    });
  }
}
