import { Mesh, MeshBuilder, TransformNode, VertexData } from "@babylonjs/core";
import { WorldContext } from "./WorldContext";
import { heightAt } from "./Terrain";

function roofTemplate(ctx: WorldContext): Mesh {
  const m = new Mesh("roofT", ctx.scene), vd = new VertexData();
  vd.positions = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, -0.5, 0, 1, 0.5];
  vd.indices = [0, 3, 5, 0, 5, 4, 1, 4, 5, 1, 5, 2, 0, 4, 1, 3, 2, 5];
  const n: number[] = []; VertexData.ComputeNormals(vd.positions, vd.indices, n); vd.normals = n; vd.applyToMesh(m);
  const mat = ctx.mats.pbr("#8a3b2c", 0.8); mat.backFaceCulling = false; mat.twoSidedLighting = true;
  m.material = mat; m.isVisible = false; ctx.shadow.addShadowCaster(m); return m;
}

/** Village: houses facing the road, road + dashes, street lamps (emissive, feeds bloom), crate stacks. */
export function buildVillage(ctx: WorldContext): void {
  const { scene, mats } = ctx, roof = roofTemplate(ctx);
  const road = MeshBuilder.CreateGround("road", { width: 8, height: 140 }, scene);
  road.position.y = 0.04; road.material = mats.pbr("#34373c", 0.85); road.receiveShadows = true; road.isPickable = false; road.freezeWorldMatrix();
  const dash = MeshBuilder.CreateGround("dash", { width: 0.25, height: 3 }, scene); dash.material = mats.pbr("#e8e2b0", 0.8); dash.isVisible = false;
  for (let z = -64; z <= 64; z += 8) { const d = dash.createInstance("d" + z); d.position.set(0, 0.06, z); d.isPickable = false; d.freezeWorldMatrix(); }

  const walls = ["#cdb99a", "#a9b6c4", "#bb8f7b", "#d9d2bf"], door = mats.pbr("#3a2a20", 0.9), glass = mats.emissive("#ffd9a0", 0.6);
  const spots: [number, number, number, number, number][] = [[-15, -16, 8, 7, 4], [-17, 8, 7, 9, 3.6], [-16, 26, 9, 7, 4.2], [15, -12, 9, 8, 3.8], [16, 14, 8, 8, 4], [15, 32, 7, 7, 3.6]];
  spots.forEach(([x, z, w, d, h], i) => {
    const root = new TransformNode("house" + i, scene);
    root.position.set(x, heightAt(x, z), z); root.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; root.computeWorldMatrix(true);
    const body = MeshBuilder.CreateBox("wall" + i, { width: w, height: h, depth: d }, scene);
    body.parent = root; body.position.y = h / 2; body.material = mats.pbr(walls[i % 4], 0.9); body.computeWorldMatrix(true); ctx.solid(body);
    const r = roof.createInstance("roof" + i); r.parent = root; r.position.y = h; r.scaling.set(w + 0.8, 2, d + 0.8); r.metadata = { occluder: true }; r.freezeWorldMatrix();
    const dr = MeshBuilder.CreateBox("door" + i, { width: 1.1, height: 2.1, depth: 0.1 }, scene);
    dr.parent = root; dr.position.set(0, 1.05, d / 2 + 0.03); dr.material = door; dr.isPickable = false; dr.freezeWorldMatrix();
    for (const s of [-1, 1]) {
      const wn = MeshBuilder.CreateBox("win" + i, { width: 1, height: 1, depth: 0.1 }, scene);
      wn.parent = root; wn.position.set(s * (w / 2 - 1.3), 2.2, d / 2 + 0.03); wn.material = glass; wn.isPickable = false; wn.freezeWorldMatrix();
    }
    ctx.keepOut.push({ x, z, r: Math.max(w, d) * 0.9 });
  });

  const pole = MeshBuilder.CreateCylinder("pole", { height: 4, diameter: 0.14, tessellation: 6 }, scene); pole.material = mats.pbr("#2a2d33", 0.6, 0.4); pole.isVisible = false;
  const bulb = MeshBuilder.CreateSphere("bulb", { diameter: 0.4, segments: 6 }, scene); bulb.material = mats.emissive("#ffd58a", 4); bulb.isVisible = false;
  ctx.shadow.addShadowCaster(pole);
  for (let z = -54; z <= 54; z += 18) for (const sx of [-5.5, 5.5]) {
    const p = pole.createInstance("p"), b = bulb.createInstance("b"), h = heightAt(sx, z);
    p.position.set(sx, h + 2, z); b.position.set(sx, h + 4.1, z); p.isPickable = b.isPickable = false; p.freezeWorldMatrix(); b.freezeWorldMatrix();
  }

  const crate = MeshBuilder.CreateBox("crate", { size: 1.2 }, scene); crate.material = mats.pbr("#8a6a3b", 0.9);
  for (let i = 0; i < 6; i++) { const c = crate.clone("crate" + i); c.position.set(11 + (i % 3) * 1.4, 0.6 + (i > 2 ? 1.2 : 0), 6); ctx.solid(c); }
  crate.dispose();
  ctx.keepOut.push({ x: 12, z: 6, r: 4 });
}
