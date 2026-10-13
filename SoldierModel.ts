import { Scene, MeshBuilder, TransformNode, StandardMaterial, Color3, Mesh } from "@babylonjs/core";
import { LimbRig } from "./AnimationBlender";
import { Rifle } from "./Rifle";
import { ShadowCaster } from "./WorldContext";

export interface Soldier { root: TransformNode; rig: LimbRig; rifle: Rifle }
const cache = new Map<string, StandardMaterial>();
const mat = (scene: Scene, hex: string): StandardMaterial => {
  let m = cache.get(hex); if (!m || m.getScene() !== scene) { m = new StandardMaterial("s" + hex, scene); m.diffuseColor = Color3.FromHexString(hex); m.specularColor = Color3.Black(); cache.set(hex, m); } return m;
};

/** Builds an armed soldier (bots and remote players). Only torso+head cast shadows to keep shadow passes cheap. */
export function buildSoldier(scene: Scene, suitHex: string, shadow?: ShadowCaster): Soldier {
  const root = new TransformNode("soldier", scene), body = new TransformNode("sbody", scene);
  body.parent = root; body.position.y = 0.95;
  const suit = mat(scene, suitHex), skin = mat(scene, "#f1c9a5"), dark = mat(scene, "#1b2238"), helmet = mat(scene, "#3b4a3a");
  const box = (n: string, w: number, h: number, d: number, parent: TransformNode, y: number, m: StandardMaterial): Mesh => {
    const b = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, scene); b.parent = parent; b.position.y = y; b.material = m; b.isPickable = false; return b;
  };
  const torso = box("t", 0.55, 0.7, 0.3, body, 0.3, suit);
  const head = MeshBuilder.CreateSphere("h", { diameter: 0.34, segments: 8 }, scene); head.parent = body; head.position.y = 0.85; head.material = skin; head.isPickable = false;
  const cap = box("cap", 0.38, 0.14, 0.38, body, 1.0, helmet);
  const limb = (n: string, x: number, y: number, w: number, h: number, m: StandardMaterial) => {
    const p = new TransformNode(n, scene); p.parent = body; p.position.set(x, y, 0); box(n + "m", w, h, w, p, -h / 2, m); return p;
  };
  const rig: LimbRig = { body, armL: limb("aL", -0.37, 0.62, 0.18, 0.6, suit), armR: limb("aR", 0.37, 0.62, 0.18, 0.6, suit), legL: limb("lL", -0.14, -0.05, 0.22, 0.85, dark), legR: limb("lR", 0.14, -0.05, 0.22, 0.85, dark) };
  const rifle = new Rifle(scene, body, []);
  if (shadow) { shadow.addShadowCaster(torso); shadow.addShadowCaster(head); shadow.addShadowCaster(cap); }
  return { root, rig, rifle };
}
