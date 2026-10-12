import { Scene, Vector3 } from "@babylonjs/core";
import { createEngine } from "./EngineFactory";
import { InputManager } from "./InputManager";
import { ThirdPersonCamera } from "./ThirdPersonCamera";
import { PlayerController } from "./PlayerController";
import { World } from "./World";
import { UI } from "./UI";
import { createPostFX } from "./PostFX";
import { isMobile } from "./config";

const tick = (): Promise<void> => new Promise(r => setTimeout(r, 0));

/** Composition root: loading sequence, system wiring, main loop. */
export class Game {
  private cam?: ThirdPersonCamera;

  async start(canvas: HTMLCanvasElement): Promise<void> {
    const { engine, backend } = await createEngine(canvas), base = engine.getHardwareScalingLevel(), mobile = isMobile();
    let input: InputManager | undefined;
    const ui = new UI({
      onPlay: () => { if (input) input.enabled = true; },
      onSensitivity: v => { if (this.cam) this.cam.sensitivity = v; },
      onRenderScale: v => engine.setHardwareScalingLevel(base / v),
      onCameraDistance: v => { if (this.cam) this.cam.baseZoom = v; },
    }, backend, mobile);

    ui.setLoading(0.02, "Creating scene"); await tick();
    const scene = new Scene(engine); scene.skipPointerMovePicking = true;
    const world = await World.create(scene, (p, t) => ui.setLoading(0.05 + p * 0.85, t));
    const player = new PlayerController(scene, new Vector3(0, 0, 0));
    player.casters.forEach(m => world.shadow.addShadowCaster(m));
    const cam = this.cam = new ThirdPersonCamera(scene, player.root, player.motion);
    player.onLand = i => cam.impact(i);
    scene.activeCamera = cam.camera; world.bindCamera(cam.camera);
    input = new InputManager(canvas);
    ui.setLoading(0.92, "Post-processing"); await tick();
    createPostFX(scene, cam.camera, backend, mobile);
    ui.setLoading(0.97, "Compiling shaders"); await scene.whenReadyAsync();
    ui.setLoading(1, "Ready"); ui.hideLoading();

    addEventListener("resize", () => engine.resize());
    let acc = 0;
    engine.runRenderLoop(() => {
      const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
      input!.update();
      player.update(dt, input!.state, cam.yaw);
      cam.update(dt, input!.consumeLook(), input!.consumeZoom());
      scene.render();
      if ((acc += dt) > 0.5) { acc = 0; ui.setFps(engine.getFps()); }
    });
  }
}
