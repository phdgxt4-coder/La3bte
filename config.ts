/** Central tunables. No magic numbers elsewhere. */
export const CONFIG = {
  version: "0.2.0",
  player: {
    walk: 2.4, run: 5.2, sprint: 8.2, jump: 7.8, gravity: -22, height: 1.8, radius: 0.4,
    accel: 11, decel: 16, airControl: 0.35, airDrag: 0.6, turnRate: 12,
    coyote: 0.1, jumpBuffer: 0.12, fallMul: 1.5, cutMul: 2.2, terminal: -35, snap: 0.35, landSlow: 0.55,
  },
  camera: {
    distance: 4.2, shoulder: 0.8, height: 1.6, baseSens: 0.0022, follow: 14, minPitch: -0.35, maxPitch: 1.1,
    fov: 0.95, fovSprint: 0.14, collisionPad: 0.3, zoomMin: 0.6, zoomMax: 1.6,
    bobAmp: 0.035, breathAmp: 0.012, landShake: 0.9,
  },
  render: { shadowMapMobile: 1024, shadowMapDesktop: 2048, mobileMaxDpr: 1.5, desktopMaxDpr: 2 },
  world: { half: 120 },
};
export const isMobile = (): boolean => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
