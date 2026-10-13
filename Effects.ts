import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3, PointLight, TransformNode } from "@babylonjs/core";
import { heightAt } from "./Terrain";

interface Timed { m: Mesh; t: number; v?: Vector3 }

/** Pooled combat effects: muzzle flash (+light), tracers, impact sparks, ejected shells. No per-shot allocations of meshes. */
export class Effects {
  private light: PointLight; private flash: Mesh; private flashT = 0;
  private tracers: Timed[] = []; private sparks: Timed[] = []; private shells: Timed[] = []; private ti = 0; private si = 0; private hi = 0;

  constructor(scene: Scene) {
    const em = (hex: string): StandardMaterial => { const m = new StandardMaterial("fx" + hex, scene); m.emissiveColor = Color3.FromHexString(hex); m.disableLighting = true; return m; };
    this.light = new PointLight("flash", Vector3.Zero(), scene); this.light.diffuse = new Color3(1, 0.7, 0.3); this.light.intensity = 0; this.light.range = 14;
    this.flash = MeshBuilder.CreateSphere("flashM", { diameter: 0.28, segments: 4 }, scene); this.flash.material = em("#ffb347"); this.flash.isPickable = false; this.flash.isVisible = false;
    const tm = em("#ffe9a8"), sm = em("#ffcc66"), brass = em("#b08d3c");
    for (let i = 0; i < 10; i++) {
      const t = MeshBuilder.CreateBox("tr" + i, { width: 0.025, height: 0.025, depth: 1 }, scene); t.material = tm; t.isPickable = false; t.isVisible = false; this.tracers.push({ m: t, t: 0 });
      const h = MeshBuilder.CreateBox("sh" + i, { width: 0.03, height: 0.03, depth: 0.08 }, scene); h.material = brass; h.isPickable = false; h.isVisible = false; this.shells.push({ m: h, t: 0, v: new Vector3() });
    }
    for (let i = 0; i < 8; i++) { const s = MeshBuilder.CreateSphere("sp" + i, { diameter: 0.18, segments: 4 }, scene); s.material = sm; s.isPickable = false; s.isVisible = false; this.sparks.push({ m: s, t: 0 }); }
  }

  flashAt(p: Vector3): void { this.flash.position.copyFrom(p); this.light.position.copyFrom(p); this.flash.isVisible = true; this.light.intensity = 6; this.flashT = 0.05; }
  muzzleFlash(n: TransformNode): void { this.flashAt(n.getAbsolutePosition()); }

  tracer(from: Vector3, to: Vector3): void {
    const o = this.tracers[this.ti++ % this.tracers.length], len = Vector3.Distance(from, to);
    o.m.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2); o.m.lookAt(to); o.m.scaling.z = len; o.m.isVisible = true; o.t = 0.07;
  }
  spark(p: Vector3): void { const o = this.sparks[this.si++ % this.sparks.length]; o.m.position.copyFrom(p); o.m.isVisible = true; o.t = 0.12; }
  eject(n: TransformNode): void {
    const o = this.shells[this.hi++ % this.shells.length], r = n.getDirection(Vector3.Right());
    o.m.position.copyFrom(n.getAbsolutePosition()); o.v!.copyFrom(r).scaleInPlace(2 + Math.random()).addInPlace(new Vector3(0, 2.5, 0)); o.m.isVisible = true; o.t = 1.2;
  }

  update(dt: number): void {
    if (this.flashT > 0 && (this.flashT -= dt) <= 0) { this.flash.isVisible = false; this.light.intensity = 0; }
    for (const o of this.tracers) if (o.t > 0 && (o.t -= dt) <= 0) o.m.isVisible = false;
    for (const o of this.sparks) if (o.t > 0 && (o.t -= dt) <= 0) o.m.isVisible = false;
    for (const o of this.shells) {
      if (o.t <= 0) continue;
      if ((o.t -= dt) <= 0) { o.m.isVisible = false; continue; }
      const p = o.m.position, v = o.v!; v.y -= 9 * dt;
      p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt; o.m.rotation.x += 12 * dt;
      const g = heightAt(p.x, p.z) + 0.02; if (p.y < g) { p.y = g; v.setAll(0); }
    }
  }
}
