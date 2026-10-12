import { Scene, MeshBuilder, Mesh, InstancedMesh, AbstractMesh, Vector3, Color3, Color4, HemisphericLight, DirectionalLight, ShadowGenerator, CascadedShadowGenerator, ReflectionProbe, RenderTargetTexture, Camera } from "@babylonjs/core";
import { SkyMaterial } from "@babylonjs/materials";
import { CONFIG, isMobile } from "./config";
import { Materials } from "./Materials";
import { WorldContext, ShadowCaster } from "./WorldContext";
import { buildTerrain } from "./Terrain";
import { buildVillage } from "./Village";
import { buildVegetation } from "./Vegetation";
import { buildMountains } from "./Mountains";

const tick = (): Promise<void> => new Promise(r => setTimeout(r, 0));
const seeded = (seed: number) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

/** World orchestrator: sky, lights, shadows (CSM on desktop), terrain, village, vegetation, mountains, reflection probe, bounds. Built asynchronously for the loading screen. */
export class World {
  private constructor(readonly shadow: ShadowCaster) {}

  static async create(scene: Scene, onProgress: (p: number, text: string) => void): Promise<World> {
    const mobile = isMobile(), mats = new Materials(scene);
    scene.clearColor = new Color4(0.55, 0.72, 0.95, 1); scene.collisionsEnabled = true;
    scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = 0.0035; scene.fogColor = new Color3(0.72, 0.82, 0.93);

    onProgress(0.05, "Lighting");
    const sunDir = new Vector3(-0.45, -0.55, -0.5).normalize();
    const sun = new DirectionalLight("sun", sunDir, scene); sun.intensity = 3.2; sun.shadowMinZ = 1; sun.shadowMaxZ = 140;
    sun.diffuse = new Color3(1, 0.95, 0.85);
    const hemi = new HemisphericLight("hemi", Vector3.Up(), scene); hemi.intensity = 0.55; hemi.groundColor = new Color3(0.25, 0.3, 0.2);
    let shadow: ShadowCaster;
    if (mobile) {
      const sg = new ShadowGenerator(CONFIG.render.shadowMapMobile, sun); sg.usePercentageCloserFiltering = true; sg.bias = 0.0005; sg.normalBias = 0.02; shadow = sg;
    } else {
      const c = new CascadedShadowGenerator(CONFIG.render.shadowMapDesktop, sun);
      c.numCascades = 3; c.lambda = 0.85; c.stabilizeCascades = true; c.cascadeBlendPercentage = 0.08;
      c.usePercentageCloserFiltering = true; c.bias = 0.003; c.normalBias = 0.02; c.depthClamp = true; shadow = c;
    }
    const sky = new SkyMaterial("sky", scene); sky.backFaceCulling = false; sky.useSunPosition = true; sky.sunPosition = sunDir.scale(-1000);
    sky.turbidity = 3; sky.rayleigh = 2; sky.mieCoefficient = 0.005; sky.mieDirectionalG = 0.8; sky.luminance = 1;
    const skybox = MeshBuilder.CreateBox("skybox", { size: 800 }, scene);
    skybox.material = sky; skybox.infiniteDistance = true; skybox.isPickable = false; skybox.applyFog = false;

    const ctx: WorldContext = {
      scene, shadow, mats, mobile, rng: seeded(1337), keepOut: [],
      solid(m: AbstractMesh) {
        m.checkCollisions = true; m.metadata = { occluder: true, solid: true };
        if (m instanceof InstancedMesh) m.freezeWorldMatrix();
        else if (m instanceof Mesh) { m.receiveShadows = true; shadow.addShadowCaster(m); m.freezeWorldMatrix(); }
      },
    };

    onProgress(0.2, "Terrain"); await tick();
    const terrain = buildTerrain(scene, mobile);
    onProgress(0.4, "Village"); await tick(); buildVillage(ctx);
    onProgress(0.6, "Vegetation"); await tick(); buildVegetation(ctx);
    onProgress(0.8, "Mountains"); await tick(); const far = buildMountains(scene, mats);

    // World bounds: invisible collision walls.
    const e = CONFIG.world.half - 6;
    for (const [x, z, w, d] of [[e, 0, 2, 2 * e], [-e, 0, 2, 2 * e], [0, e, 2 * e, 2], [0, -e, 2 * e, 2]]) {
      const wall = MeshBuilder.CreateBox("bound", { width: w, depth: d, height: 40 }, scene); wall.position.set(x, 10, z); wall.isVisible = false; wall.checkCollisions = true; wall.isPickable = false; wall.freezeWorldMatrix();
    }

    // Reflection probe rendered once from the sky + mountains -> image-based lighting for all PBR materials.
    onProgress(0.9, "Environment"); await tick();
    const probe = new ReflectionProbe("env", mobile ? 128 : 256, scene);
    probe.renderList?.push(skybox, ...far, terrain); probe.position.set(0, 6, 0); probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    scene.environmentTexture = probe.cubeTexture; scene.environmentIntensity = 0.7;
    mats.freezeAll();
    return new World(shadow);
  }

  /** Call once the camera exists: limits cascade range for sharper shadows. */
  bindCamera(camera: Camera): void {
    if (this.shadow instanceof CascadedShadowGenerator) this.shadow.shadowMaxZ = Math.min(110, camera.maxZ);
  }
}
