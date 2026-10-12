/** Small frame-rate independent math helpers shared by all systems. */
export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Exponential smoothing: identical feel at any frame rate. */
export const damp = (a: number, b: number, rate: number, dt: number): number => a + (b - a) * (1 - Math.exp(-rate * dt));
export const smoothstep = (a: number, b: number, x: number): number => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** Shortest signed angle from a to b. */
export const angleDelta = (a: number, b: number): number => Math.atan2(Math.sin(b - a), Math.cos(b - a));
