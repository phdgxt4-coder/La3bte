import { MeshBuilder, Mesh } from "@babylonjs/core";
import { WorldContext } from "./WorldContext";

/** Warehouse (west), small military base (east) with fence, barracks, bunkers, sandbags and a watch tower with stairs. Sites are flattened in Terrain.FLAT_SITES. */
export function buildCompounds(ctx: WorldContext): void {
  const { scene, mats } = ctx;
  const box = (n: string, w: number, h: number, d: number, x: number, y: number, z: number, hex: string, rough = 0.9, metal = 0): Mesh => {
    const m = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, scene); m.position.set(x, y, z); m.material = mats.pbr(hex, rough, metal); ctx.solid(m); return m;
  };
  // Warehouse 16x24 at (-50,44), 5 m door facing +x (towards the road).
  const wx = -50, wz = 44, wall = "#8f9aa3";
  box("whW", 0.6, 7, 24, wx - 8, 3.5, wz, wall, 0.6, 0.2); box("whN", 16, 7, 0.6, wx, 3.5, wz + 12, wall, 0.6, 0.2); box("whS", 16, 7, 0.6, wx, 3.5, wz - 12, wall, 0.6, 0.2);
  box("whE1", 0.6, 7, 9.5, wx + 8, 3.5, wz - 7.25, wall, 0.6, 0.2); box("whE2", 0.6, 7, 9.5, wx + 8, 3.5, wz + 7.25, wall, 0.6, 0.2);
  box("whRoof", 16.8, 0.5, 24.8, wx, 7.25, wz, "#6e7780", 0.6, 0.2);
  for (let i = 0; i < 8; i++) box("whC" + i, 1.6, 1.6, 1.6, wx - 4 + (i % 4) * 2.4, 0.8 + (i > 3 ? 1.6 : 0), wz - 5 + Math.floor(i / 4) * 0.1, "#8a6a3b");
  box("whShelf", 10, 2.4, 1.2, wx - 2, 1.2, wz + 8, "#4a5560", 0.5, 0.5);
  ctx.keepOut.push({ x: wx, z: wz, r: 17 });

  // Military base 26x26 at (44,-44), gate on the west side.
  const mx = 44, mz = -44, fence = "#3d4540";
  box("mfE", 0.3, 2.5, 26, mx + 13, 1.25, mz, fence, 0.7, 0.4); box("mfN", 26, 2.5, 0.3, mx, 1.25, mz + 13, fence, 0.7, 0.4); box("mfS", 26, 2.5, 0.3, mx, 1.25, mz - 13, fence, 0.7, 0.4);
  box("mfW1", 0.3, 2.5, 11, mx - 13, 1.25, mz - 7.5, fence, 0.7, 0.4); box("mfW2", 0.3, 2.5, 11, mx - 13, 1.25, mz + 7.5, fence, 0.7, 0.4);
  box("barracks", 9, 3.5, 5, 50, 1.75, -50, "#6b705c"); box("barRoof", 9.6, 0.3, 5.6, 50, 3.65, -50, "#4c5040");
  box("bunk1", 6, 1.8, 4, 38, 0.9, -40, "#8a8466"); box("bunk2", 6, 1.8, 4, 40, 0.9, -52, "#8a8466");
  for (const [x, z] of [[35, -48.5], [38, -48.5], [35, -37.5], [47, -40], [50, -40]] as const) box("sand", 3, 0.8, 0.7, x, 0.4, z, "#a89870");
  // Watch tower with stairs (climb the steps; jump if a step blocks you).
  const tx = 54, tz = -34;
  for (const sx of [-1.8, 1.8]) for (const sz of [-1.8, 1.8]) box("leg", 0.4, 5, 0.4, tx + sx, 2.5, tz + sz, "#4a4f55", 0.6, 0.4);
  box("plat", 4.4, 0.3, 4.4, tx, 5.15, tz, "#5a5f66", 0.6, 0.4);
  box("cabN", 4.4, 1.1, 0.2, tx, 5.85, tz + 2.1, "#6b705c"); box("cabS", 4.4, 1.1, 0.2, tx, 5.85, tz - 2.1, "#6b705c"); box("cabE", 0.2, 1.1, 4.4, tx + 2.1, 5.85, tz, "#6b705c");
  for (const sx of [-2, 2]) for (const sz of [-2, 2]) box("post", 0.2, 2.2, 0.2, tx + sx, 6.3, tz + sz, "#4a4f55");
  box("towerRoof", 5, 0.25, 5, tx, 7.5, tz, "#3d4540");
  for (let i = 1; i <= 12; i++) { const h = 5 - (i - 1) * 0.42; box("step" + i, 1, h, 2, tx - 2.2 - (i - 0.5), h / 2, tz, "#7a7f86"); }
  ctx.keepOut.push({ x: mx, z: mz, r: 22 });
}
