import { Scene, Mesh, MeshBuilder, VertexBuffer, VertexData, DynamicTexture, Texture, PBRMaterial } from "@babylonjs/core";
import { smoothstep, lerp } from "./MathUtil";
import { CONFIG } from "./config";

/**
 * Analytic terrain height. Single source of truth for rendering, placement, player ground and camera clamp.
 * Flat village plateau (r<28) and flat road corridor; rolling hills outside; raised rim hides the world border.
 */
/** Flattened build sites (warehouse, military base). */
export const FLAT_SITES = [{ x: -50, z: 44, r: 20 }, { x: 44, z: -44, r: 22 }];

export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const hills = Math.sin(x * 0.035) * 2.2 + Math.cos(z * 0.03) * 2 + Math.sin((x + z) * 0.08) * 0.8 + Math.sin(x * 0.11) * Math.cos(z * 0.09) * 0.5;
  const outside = smoothstep(28, 60, r), roadFlat = smoothstep(5, 14, Math.abs(x));
  let site = 1;
  for (const s of FLAT_SITES) site = Math.min(site, smoothstep(s.r, s.r + 14, Math.hypot(x - s.x, z - s.z)));
  // Natural border: steep cliff ring (r 86..104) up to a high plateau; player is also radially clamped at playRadius.
  return hills * outside * roadFlat * site + smoothstep(86, 104, r) * 18 * outside;
}

/** Builds the terrain mesh once (vertex-coloured grass/dirt/rock by slope), then freezes it. Not collidable: ground is analytic. */
export function buildTerrain(scene: Scene, mobile: boolean): Mesh {
  const size = CONFIG.world.half * 2;
  const g = MeshBuilder.CreateGround("terrain", { width: size, height: size, subdivisions: mobile ? 100 : 160, updatable: true }, scene);
  const pos = g.getVerticesData(VertexBuffer.PositionKind)!, n = pos.length / 3, col = new Float32Array(n * 4);
  const grass = [0.27, 0.5, 0.2], dirt = [0.42, 0.34, 0.24], rock = [0.46, 0.44, 0.42];
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], z = pos[i * 3 + 2], y = heightAt(x, z); pos[i * 3 + 1] = y;
    const slope = Math.hypot(heightAt(x + 1, z) - y, heightAt(x, z + 1) - y);
    const r = Math.hypot(x, z), v = 0.9 + 0.2 * Math.sin(x * 0.9) * Math.cos(z * 0.7);
    const d = Math.max(1 - smoothstep(4, 7, Math.abs(x)), (1 - smoothstep(12, 26, r)) * 0.45) * (1 - smoothstep(66, 74, Math.abs(z)));
    const k = smoothstep(0.25, 0.6, slope);
    for (let c = 0; c < 3; c++) col[i * 4 + c] = lerp(lerp(grass[c], dirt[c], d), rock[c], k) * v;
    col[i * 4 + 3] = 1;
  }
  const nor: number[] = []; VertexData.ComputeNormals(pos, g.getIndices()!, nor);
  g.setVerticesData(VertexBuffer.PositionKind, pos); g.setVerticesData(VertexBuffer.ColorKind, col); g.setVerticesData(VertexBuffer.NormalKind, nor);
  g.refreshBoundingInfo(); g.isPickable = false; g.receiveShadows = true;

  const tex = new DynamicTexture("terrainDetail", 256, scene, true), ctx = tex.getContext();
  ctx.fillStyle = "#c8c8c8"; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) { const s = 100 + Math.random() * 120; ctx.fillStyle = `rgba(${s},${s},${s},0.35)`; ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  tex.update(); tex.wrapU = tex.wrapV = Texture.WRAP_ADDRESSMODE; tex.uScale = tex.vScale = 48;
  const mat = new PBRMaterial("terrainMat", scene); mat.albedoTexture = tex; mat.roughness = 0.95; mat.metallic = 0; mat.freeze();
  g.material = mat; g.freezeWorldMatrix();
  return g;
}
