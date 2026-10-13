import { Scene, MeshBuilder, TransformNode, StandardMaterial, Color3, Mesh } from "@babylonjs/core";

const mat = (scene: Scene, hex: string): StandardMaterial => { const m = new StandardMaterial("rm" + hex, scene); m.diffuseColor = Color3.FromHexString(hex); m.specularColor = new Color3(0.25, 0.25, 0.25); return m; };

/** Procedural assault-rifle model attached to a body node. Exposes muzzle and shell-eject anchors. */
export class Rifle {
  readonly root: TransformNode; readonly muzzle: TransformNode; readonly eject: TransformNode;
  constructor(scene: Scene, parent: TransformNode, casters: Mesh[]) {
    const metal = mat(scene, "#23272c"), wood = mat(scene, "#5a4a32");
    this.root = new TransformNode("rifle", scene); this.root.parent = parent; this.root.position.set(0.06, 0.5, 0.42);
    const part = (n: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial) => {
      const b = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, scene); b.parent = this.root; b.position.set(x, y, z); b.material = m; b.isPickable = false; casters.push(b);
    };
    part("rb", 0.07, 0.1, 0.55, 0, 0, 0.1, metal); part("rs", 0.06, 0.13, 0.24, 0, -0.02, -0.3, wood);
    part("rm", 0.05, 0.2, 0.08, 0, -0.14, 0.12, metal); part("rg", 0.05, 0.1, 0.05, 0, -0.09, -0.05, metal); part("rsi", 0.03, 0.05, 0.12, 0, 0.075, 0.05, metal);
    const bar = MeshBuilder.CreateCylinder("rbar", { height: 0.4, diameter: 0.035, tessellation: 8 }, scene);
    bar.rotation.x = Math.PI / 2; bar.parent = this.root; bar.position.set(0, 0.01, 0.55); bar.material = metal; bar.isPickable = false;
    this.muzzle = new TransformNode("muzzle", scene); this.muzzle.parent = this.root; this.muzzle.position.set(0, 0.01, 0.78);
    this.eject = new TransformNode("eject", scene); this.eject.parent = this.root; this.eject.position.set(0.05, 0.03, 0.15);
  }
}
