import { Scene, PBRMaterial, Color3 } from "@babylonjs/core";

/** Cached PBR material factory (shared materials = fewer draw-state changes). Call freezeAll() when the world is built. */
export class Materials {
  private cache = new Map<string, PBRMaterial>();
  constructor(private scene: Scene) {}
  pbr(hex: string, roughness = 0.9, metallic = 0): PBRMaterial {
    const key = `${hex}|${roughness}|${metallic}`; let m = this.cache.get(key);
    if (!m) { m = new PBRMaterial("pbr" + key, this.scene); m.albedoColor = Color3.FromHexString(hex); m.roughness = roughness; m.metallic = metallic; this.cache.set(key, m); }
    return m;
  }
  emissive(hex: string, intensity: number): PBRMaterial {
    const key = `e|${hex}|${intensity}`; let m = this.cache.get(key);
    if (!m) { m = new PBRMaterial("pbr" + key, this.scene); m.albedoColor = Color3.Black(); m.emissiveColor = Color3.FromHexString(hex); m.emissiveIntensity = intensity; this.cache.set(key, m); }
    return m;
  }
  freezeAll(): void { this.cache.forEach(m => m.freeze()); }
}
