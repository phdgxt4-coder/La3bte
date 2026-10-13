# BattleVerse
Third-person browser game foundation. Babylon.js (WebGPU → WebGL fallback), TypeScript, Vite. Landscape only.

## Run
```
npm install
npm run dev      # http://localhost:5173 (--host: test on phone via LAN; WebGPU needs HTTPS or localhost)
npm run build
```
## Controls
Desktop: WASD, mouse (click canvas for pointer lock), Shift sprint, Ctrl/Alt walk, Space jump (hold = higher), mouse wheel zoom.
Mobile: left-side joystick, right-side swipe to look, SPRINT / JUMP buttons.

## Architecture
`src/config.ts` tunables · `math/` helpers · `graphics/` post FX · `core/` engine factory + Game composition root · `input/` unified input · `camera/` shoulder camera w/ collision · `player/` controller + animation blender · `world/` environment · `ui/` DOM UI.
Each class has one responsibility; Game wires dependencies. See PROJECT_STATE.md.


Phase 2 (v0.2.0): see PROJECT_STATE.md, TODO.md and BUGS.md. The build has not been verified yet.

## Phase 3 (v0.3.0)
Quick Match = you + 14 bots. Private Match: Create Room -> share code/link -> host presses START MATCH. Room stays alive while the host keeps the page open, until END ROOM.
Controls: WASD, mouse, LMB fire, RMB aim, R reload, Shift sprint, Space jump. Mobile: on-screen buttons.
Deploy: GitHub -> Settings -> Pages -> Source: GitHub Actions (workflow in .github/workflows/deploy.yml).
