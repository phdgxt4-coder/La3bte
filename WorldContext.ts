import { Scene, AbstractMesh, ShadowGenerator, CascadedShadowGenerator } from "@babylonjs/core";
import { Materials } from "./Materials";

export type ShadowCaster = ShadowGenerator | CascadedShadowGenerator;

/** Shared services handed to world builders (dependency injection instead of globals). */
export interface WorldContext {
  scene: Scene; shadow: ShadowCaster; mats: Materials; rng: () => number; mobile: boolean;
  /** Circles (x,z,r) that vegetation must avoid. Filled by Village. */
  keepOut: { x: number; z: number; r: number }[];
  /** Registers a static prop: collider + camera occluder + ground-walkable + (source meshes only) shadow caster. */
  solid(m: AbstractMesh): void;
}
