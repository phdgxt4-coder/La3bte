import { Scene, Vector3, Ray, AbstractMesh } from "@babylonjs/core";
import { heightAt } from "./Terrain";

/** Anything that can be shot: local player, bots, remote players. `feet` is a live reference to the model position. */
export interface Actor { id: string; name: string; kind: "player" | "bot" | "remote"; hp: number; alive: boolean; readonly feet: Vector3; readonly yaw: number; readonly speed: number }

export interface HitResult { actor?: Actor; point: Vector3; head: boolean; dist: number }
const SPHERES: [number, number][] = [[0.5, 0.38], [1.05, 0.4], [1.58, 0.22]]; // [height, radius]; last = head
const blockers = (m: AbstractMesh): boolean => m.metadata?.occluder === true || m.metadata?.solid === true;
const ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);

/**
 * Hitscan: world blockers (props + terrain, sampled every 3 m) shorten the ray, actors are tested analytically
 * with 3 spheres each (no mesh picking on characters = cheap). `d` must be normalised.
 */
export function hitscan(scene: Scene, o: Vector3, d: Vector3, actors: Iterable<Actor>, ignoreId: string, range: number): HitResult {
  ray.origin.copyFrom(o); ray.direction.copyFrom(d); ray.length = range;
  const w = scene.pickWithRay(ray, blockers);
  let best = w?.hit ? w.distance : range;
  for (let t = 3; t < best; t += 3) if (o.y + d.y * t < heightAt(o.x + d.x * t, o.z + d.z * t)) { best = t; break; }
  let actor: Actor | undefined, head = false;
  for (const a of actors) {
    if (!a.alive || a.id === ignoreId) continue;
    for (let i = 0; i < 3; i++) {
      const [cy, r] = SPHERES[i], ox = a.feet.x - o.x, oy = a.feet.y + cy - o.y, oz = a.feet.z - o.z;
      const tca = ox * d.x + oy * d.y + oz * d.z; if (tca < 0) continue;
      const d2 = ox * ox + oy * oy + oz * oz - tca * tca; if (d2 > r * r) continue;
      const t = tca - Math.sqrt(r * r - d2);
      if (t < best) { best = t; actor = a; head = i === 2; }
    }
  }
  return { actor, head, dist: best, point: new Vector3(o.x + d.x * best, o.y + d.y * best, o.z + d.z * best) };
}
