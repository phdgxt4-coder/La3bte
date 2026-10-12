# ARCHITECTURE
Composition root `core/Game.ts` wires: EngineFactory (WebGPU/WebGL) -> World (async build) -> PlayerController -> ThirdPersonCamera -> InputManager -> PostFX -> UI.
Frame: input.update -> player.update(camYaw) -> camera.update(look, zoom) -> scene.render.
Contracts: `PlayerMotion` (player -> camera/animation), `WorldContext` (DI for world builders), `heightAt()` (single height source).
Mesh flags: `metadata.solid` (walkable/collidable), `metadata.occluder` (camera collision).
Folders: core, input, camera, player, world, graphics, ui, math. Tunables only in config.ts.
## Deployment
Push to GitHub -> `.github/workflows/deploy.yml` runs `npm install && npm run build` (Vite, base "./") -> publishes `dist/` to Pages. Pages source must be "GitHub Actions". Local type check: `npm run typecheck` (not part of the deploy build).
