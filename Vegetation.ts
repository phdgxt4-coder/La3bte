import { MeshBuilder, Mesh, Matrix, Quaternion, Vector3, DynamicTexture, PBRMaterial } from "@babylonjs/core";
import { WorldContext } from "./WorldContext";
import { heightAt } from "./Terrain";

/** Trees (instanced, collidable trunks), bushes, rocks and a thin-instanced grass field (single draw call). */
export function buildVegetation(ctx: WorldContext): void {
  const { scene, rng, mats, mobile, shadow } = ctx;
  const free = (x: number, z: number) => Math.abs(x) > 7 && !ctx.keepOut.some(k => Math.hypot(x - k.x, z - k.z) < k.r + 1.5);
  const scatter = (count: number, minR: number, maxR: number, fn: (x: number, z: number, i: number) => void) => {
    for (let t = 0, n = 0; n < count && t < count * 15; t++) {
      const a = rng() * Math.PI * 2, r = minR + rng() * (maxR - minR), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (free(x, z)) fn(x, z, n++);
    }
  };
  const master = (m: Mesh) => { m.isVisible = false; shadow.addShadowCaster(m); m.receiveShadows = true; return m; };

  // Trees
  const trunk = master(MeshBuilder.CreateCylinder("trunk", { height: 2.4, diameterTop: 0.35, diameterBottom: 0.55, tessellation: 8 }, scene)); trunk.material = mats.pbr("#5e4126", 1);
  const round = master(MeshBuilder.CreateSphere("crownR", { diameter: 3.2, segments: 8 }, scene)); round.material = mats.pbr("#2f6d30", 1);
  const cone = master(MeshBuilder.CreateCylinder("crownC", { height: 4.2, diameterTop: 0, diameterBottom: 3, tessellation: 10 }, scene)); cone.material = mats.pbr("#24572a", 1);
  scatter(mobile ? 45 : 85, 30, 84, (x, z, i) => {
    const y = heightAt(x, z), s = 0.8 + rng() * 0.9, pine = rng() > 0.5;
    const t = trunk.createInstance("t" + i); t.position.set(x, y + 1.2 * s, z); t.scaling.setAll(s); ctx.solid(t);
    const c = (pine ? cone : round).createInstance("c" + i); c.position.set(x, y + (pine ? 4.4 : 3.4) * s, z); c.scaling.setAll(s);
    c.metadata = { occluder: true }; c.isPickable = false; c.freezeWorldMatrix();
  });

  // Forest: dense stand of pines
  for (let t = 0, n = 0; n < (mobile ? 35 : 80) && t < 800; t++) {
    const a = rng() * 6.283, r = Math.sqrt(rng()) * 24, x = 46 + Math.cos(a) * r, z = 50 + Math.sin(a) * r;
    if (!free(x, z)) continue; n++;
    const y = heightAt(x, z), s = 0.9 + rng() * 0.9;
    const tr = trunk.createInstance("ft" + n); tr.position.set(x, y + 1.2 * s, z); tr.scaling.setAll(s); ctx.solid(tr);
    const c = cone.createInstance("fc" + n); c.position.set(x, y + 4.4 * s, z); c.scaling.setAll(s); c.metadata = { occluder: true }; c.isPickable = false; c.freezeWorldMatrix();
  }

  // Bushes
  const bush = master(MeshBuilder.CreateIcoSphere("bush", { radius: 0.7, subdivisions: 2 }, scene)); bush.material = mats.pbr("#2b5e2a", 1);
  scatter(mobile ? 30 : 70, 14, 84, (x, z, i) => {
    const b = bush.createInstance("b" + i), s = 0.7 + rng() * 0.8; b.position.set(x, heightAt(x, z) + 0.3 * s, z); b.scaling.set(s * 1.3, s * 0.8, s * 1.3); b.isPickable = false; b.freezeWorldMatrix();
  });

  // Rocks
  const rock = master(MeshBuilder.CreateIcoSphere("rock", { radius: 1, subdivisions: 2, flat: true }, scene)); rock.material = mats.pbr("#7d8087", 0.95);
  scatter(mobile ? 20 : 40, 16, 84, (x, z, i) => {
    const r = rock.createInstance("r" + i), s = 0.6 + rng() * 1.6; r.position.set(x, heightAt(x, z) + s * 0.25, z);
    r.scaling.set(s, s * 0.6, s * (0.8 + rng() * 0.5)); r.rotation.y = rng() * 6; ctx.solid(r);
  });

  // Grass: textured crossed quads as ONE thin-instanced mesh.
  const tex = new DynamicTexture("blade", 64, scene, true), g = tex.getContext(); g.clearRect(0, 0, 64, 64);
  ["#5fae3f", "#78c24c", "#4f9a35"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(8 + i * 20, 64); g.lineTo(14 + i * 20, 6 + i * 6); g.lineTo(22 + i * 20, 64); g.fill(); });
  tex.hasAlpha = true; tex.update();
  const gm = new PBRMaterial("grassMat", scene); gm.albedoTexture = tex; gm.useAlphaFromAlbedoTexture = true; gm.alphaCutOff = 0.45;
  gm.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST; gm.backFaceCulling = false; gm.twoSidedLighting = true; gm.roughness = 1; gm.metallic = 0;
  const a = MeshBuilder.CreatePlane("ga", { size: 1 }, scene), b = MeshBuilder.CreatePlane("gb", { size: 1 }, scene);
  b.rotation.y = Math.PI / 2; b.bakeCurrentTransformIntoVertices();
  const blade = Mesh.MergeMeshes([a, b], true)!; blade.material = gm; blade.isPickable = false; blade.alwaysSelectAsActiveMesh = true;
  const count = mobile ? 2500 : 7000, buf = new Float32Array(count * 16), m4 = new Matrix(), q = new Quaternion();
  let n = 0;
  for (let t = 0; n < count && t < count * 4; t++) {
    const x = (rng() - 0.5) * 150, z = (rng() - 0.5) * 150; if (!free(x, z) || Math.abs(x) < 5) continue;
    const s = 0.6 + rng() * 0.5; Quaternion.RotationYawPitchRollToRef(rng() * 6.28, 0, 0, q);
    Matrix.ComposeToRef(new Vector3(s, s, s), q, new Vector3(x, heightAt(x, z) + s * 0.5, z), m4); m4.copyToArray(buf, n++ * 16);
  }
  blade.thinInstanceSetBuffer("matrix", buf.subarray(0, n * 16), 16, true); blade.thinInstanceRefreshBoundingInfo(true);
}
