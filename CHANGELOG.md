# Changelog
## 0.1.0 - Foundation
- Engine factory (WebGPU/WebGL), HDR pipeline (ACES, bloom), PCF shadows, procedural sky
- Shoulder camera: smooth follow/rotation, collision, sensitivity setting
- Player: walk/run/sprint/idle/jump, smooth facing, procedural weight-blended animation
- Map: grass, road, 70 trees, 5 buildings, crates, rocks
- UI: Play, Settings (sensitivity, render scale), FPS, version, landscape guard
- Controls: desktop + mobile touch

## 0.2.0 - Phase 2: AAA player experience
- Player: accel/decel, walk/run/sprint, air control, coyote time, jump buffer, variable jump, landing impact/recovery, slope snapping, anti-slide, turn-in-place
- Camera: zoom, dynamic distance, sprint FOV, lag, throttled collision, terrain clamp, run bob, breathing, landing shake
- Animation: jump rise/fall, land, turn and breathing layers
- World rebuilt: terrain, village, trees, bushes, rocks, grass, mountains, lamps, bounds
- Graphics: PBR, CSM shadows, reflection probe IBL, SSAO2 (desktop WebGL), vignette
- UI: loading screen, camera distance setting
- Docs: TODO.md, BUGS.md added

## 0.2.1 - Deployment
- GitHub Actions workflow builds and publishes to GitHub Pages; Vite base "./"; build no longer blocks on type errors (`npm run typecheck` separate); .gitignore, ARCHITECTURE.md

## 0.3.0 - Phase 3: playable shooter
- Bounded map (cliffs + radial clamp), forest, warehouse, military base, watch tower, 16 spawns
- Rifle: aim, shoot, reload, ammo, recoil, flash, tracers, shells, sounds, hitscan
- Bot soldiers, Quick Match (15 players offline), Private rooms over WebRTC (code + link), free-for-all, victory/defeat
- New menu, lobby, HUD, touch combat buttons
