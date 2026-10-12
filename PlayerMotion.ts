/** Read-only-by-convention snapshot of player motion, shared with camera and animation (decouples them from PlayerController). */
export interface PlayerMotion {
  speed: number;       // horizontal m/s
  speedNorm: number;   // 0..1 relative to sprint speed
  sprintT: number;     // 0..1 smoothed sprint amount
  grounded: boolean;
  vy: number;
  turnRate: number;    // rad/s, signed, smoothed
  landImpact: number;  // 0..1, decays after landing
}
export const createMotion = (): PlayerMotion => ({ speed: 0, speedNorm: 0, sprintT: 0, grounded: true, vy: 0, turnRate: 0, landImpact: 0 });
