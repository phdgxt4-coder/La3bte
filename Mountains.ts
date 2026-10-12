import { Scene, Mesh, MeshBuilder, Vector3, VertexBuffer } from "@babylonjs/core";
import { Materials } from "./Materials";
import { lerp, clamp } from "./MathUtil";

/** Distant mountain ring (ribbon, vertex-coloured rock -> snow) plus a far ground plane so the world edge is never visible. Fog tints them for depth. */
export function buildMountains(scene: Scene, mats: Materials): Mesh[] {
  const radii = [150, 170, 195, 225, 260], heights = [-4, 18, 46, 34, 6], segs = 72, paths: Vector3[][] = [];
  for (let ri = 0; ri < radii.length; ri++) {
    const path: Vector3[] = [];
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2, ridge = Math.max(0.35, 0.65 + 0.35 * Math.sin(a * 5 + 1.3) + 0.2 * Math.sin(a * 11 + ri));
      path.push(new Vector3(Math.cos(a) * radii[ri], heights[ri] * ridge, Math.sin(a) * radii[ri]));
    }
    paths.push(path);
  }
  const m = MeshBuilder.CreateRibbon("mountains", { pathArray: paths, closePath: true, sideOrientation: Mesh.DOUBLESIDE }, scene);
  const pos = m.getVerticesData(VertexBuffer.PositionKind)!, col = new Float32Array((pos.length / 3) * 4);
  for (let i = 0; i < pos.length / 3; i++) {
    const t = clamp((pos[i * 3 + 1] - 28) / 14, 0, 1);
    col[i * 4] = lerp(0.36, 0.95, t); col[i * 4 + 1] = lerp(0.39, 0.96, t); col[i * 4 + 2] = lerp(0.44, 0.98, t); col[i * 4 + 3] = 1;
  }
  m.setVerticesData(VertexBuffer.ColorKind, col); m.material = mats.pbr("#ffffff", 1); m.isPickable = false; m.freezeWorldMatrix();
  const far = MeshBuilder.CreateGround("farGround", { width: 900, height: 900 }, scene);
  far.position.y = -0.3; far.material = mats.pbr("#44783a", 1); far.isPickable = false; far.freezeWorldMatrix();
  return [m, far];
}
