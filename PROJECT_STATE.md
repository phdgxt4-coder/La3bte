# PROJECT_STATE - BattleVerse
Source of truth. Never rely on chat history. Only improve/extend; do not recreate completed systems.

## Current Version
0.2.1 (Phase 2 + GitHub Pages deployment). Stack: Babylon.js 7, TypeScript, Vite.

## Verification status (IMPORTANT)
Phases 1 and 2 were written in an offline sandbox. `npm install`, `npm run build` and runtime testing have NEVER been run. First task of any session: `npm install && npm run build`, fix type errors, run on desktop + a real phone, then update BUGS.md.

## Completed Features
Phase 1: WebGPU/WebGL engine factory, HDR pipeline, unified desktop/touch input, shoulder camera with collision, procedural player rig, UI (menu, settings, FPS, version, rotate guard).
Phase 2:
- Player movement: separate accel/decel, walk (Ctrl/Alt or light joystick) / run / sprint speeds, air control, coyote time, jump buffer, variable jump height, heavier fall, landing impact + brief recovery slow, ground snapping on slopes, hard anti-slide stop, smooth facing, turn-in-place.
- Camera: smooth zoom (wheel, settings slider), speed-based distance, sprint FOV, follow lag (horizontal), collision (ray every 2nd frame), terrain clamp, run bob, idle breathing, landing shake (trauma model).
- Animation: layered blender: idle/walk/run/sprint weights + jump (rising/falling) + land crouch + turn roll/in-place stepping + breathing. No snapping (all damped).
- World: analytic-height terrain (vertex-coloured, frozen), village (6 houses with roofs/doors/windows, road, lamps with emissive bloom, crates), 85 trees (2 types), bushes, rocks, thin-instanced grass (1 draw call), mountain ring + far ground, fog, procedural sky, sun, world bound walls.
- Graphics: PBR materials, CSM shadows (desktop, 3 cascades) / PCF (mobile), ReflectionProbe -> `scene.environmentTexture`, ACES, bloom, vignette, SSAO2 (desktop WebGL only).
- UI: loading screen with progress, minimal FPS/version, camera-distance slider.

## Modified Files (Phase 2)
config.ts (extended), core/Game.ts (async loading, no more setupPipeline), input/InputManager.ts (+walk, +wheel zoom), camera/ThirdPersonCamera.ts, player/PlayerController.ts, player/AnimationBlender.ts, world/World.ts (now orchestrator), ui/UI.ts, index.html, tsconfig.json, package.json.
New: math/MathUtil.ts, player/PlayerMotion.ts, camera/CameraShake.ts, graphics/PostFX.ts, world/{Terrain,Materials,WorldContext,Village,Vegetation,Mountains}.ts.

## Architecture Updates
- `heightAt(x,z)` (world/Terrain.ts) is the single source of truth for height: terrain mesh, prop placement, player ground, camera clamp. Terrain is NOT collidable; ground = `max(heightAt, ray vs meshes with metadata.solid)`.
- Mesh flags: `metadata.solid` (walkable/collidable prop), `metadata.occluder` (camera collision). Use `WorldContext.solid(mesh)`.
- `PlayerMotion` (player/PlayerMotion.ts) is the contract between PlayerController, ThirdPersonCamera and AnimationBlender. `PlayerController.onLand` drives camera shake.
- World builders take a `WorldContext` (scene, shadow, materials, rng, keepOut circles). `World.create()` is async to feed the loading screen.
- Data flow per frame: input.update -> player.update(camYaw) -> camera.update(look, zoom) -> render.

## Known Issues
See BUGS.md. Main: unverified build; Babylon API usage unchecked at compile time; roll/lean direction in animation may be inverted; reflection-probe-as-environment unverified; SSAO2 not compatible with WebGPU (skipped).

## Next Phase Goals
1. Build, fix, profile (mobile 60 FPS, desktop 120). 2. glTF character with AnimationGroups behind AnimationBlender. 3. Tree-shaken imports, LOD, adaptive resolution. 4. Pause menu, persisted settings, audio (footsteps). Weapons/bots/multiplayer remain OUT of scope until the user asks.

## Conventions
Tunables only in `config.ts`. One responsibility per file, constructor injection, document every class. Frame-rate independence via `damp`.

## Deployment (v0.2.1)
Workflow in `.github/workflows/deploy.yml`. A prebuilt `dist/` could NOT be produced in the authoring sandbox (no network), so the Pages build happens in GitHub Actions. The deployed build has never been seen running; check the Actions log first if the page is blank.
## Workflow for every phase
Deliver (1) full source zip incl. workflow, (2) updated docs. Pages is built by Actions from the source.

## FLAT LAYOUT NOTE (v0.2.2)
All .ts files live in the repo ROOT (no src/ folders) because the owner uploads from a phone, where GitHub web upload drops folders. Logical modules are unchanged: core(Game, EngineFactory), input(InputManager), camera(ThirdPersonCamera, CameraShake), player(PlayerController, PlayerMotion, AnimationBlender), world(World, WorldContext, Terrain, Materials, Village, Vegetation, Mountains), graphics(PostFX), ui(UI), math(MathUtil). Keep filenames unique. Entry: main.ts. Workflow file must be created on GitHub as `.github/workflows/deploy.yml`.
