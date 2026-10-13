import { Vector3 } from "@babylonjs/core";
import { WorldContext } from "./WorldContext";
import { FLAT_SITES, heightAt } from "./Terrain";

/** 16 safe spawn points (rings r=66 and r=40) away from buildings/compounds; registered as keep-out so no trees grow on them. */
export function computeSpawns(ctx: WorldContext): Vector3[] {
  const out: Vector3[] = [];
  const ok = (x: number, z: number) => Math.abs(x) > 8 && !ctx.keepOut.some(k => Math.hypot(x - k.x, z - k.z) < k.r + 4) && !FLAT_SITES.some(s => Math.hypot(x - s.x, z - s.z) < s.r + 6);
  for (const [r, n] of [[66, 16], [40, 8]] as const) for (let i = 0; i < n && out.length < 16; i++) {
    const a = ((i + (r === 40 ? 0.5 : 0)) / n) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ok(x, z)) out.push(new Vector3(x, heightAt(x, z), z));
  }
  out.forEach(p => ctx.keepOut.push({ x: p.x, z: p.z, r: 3 }));
  return out;
}
