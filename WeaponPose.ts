import { LimbRig } from "./AnimationBlender";
/** Smoothed 0..1 hold amounts driving the rifle-carry arm pose. */
export interface HoldState { sprint: number; aim: number; reload: number; kick: number }
/** Overrides the arm swing with a rifle-hold pose (call after AnimationBlender.update). Negative x = arms forward. */
export function applyHold(rig: LimbRig, h: HoldState): void {
  const base = -1.3 + 0.55 * h.sprint - 0.2 * h.aim + 0.35 * h.reload - h.kick;
  rig.armR.rotation.x = base; rig.armL.rotation.x = base - 0.1;
}
