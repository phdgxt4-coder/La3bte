# ARCHITECTURE (flat repo root)
Composition root `Game.ts`: EngineFactory -> World (async: terrain, village, compounds, spawns, vegetation, mountains, probe) -> PlayerController -> ThirdPersonCamera -> InputManager/Effects/PlayerCombat -> Match -> PostFX -> UI.
Frame: input.update -> player.update -> combat.update -> camera.update -> match.update (bots/remotes/snapshots) -> fx.update -> render.
Modules: core(Game, EngineFactory) | input(InputManager) | camera(ThirdPersonCamera, CameraShake) | player(PlayerController, PlayerMotion, AnimationBlender, PlayerCombat, Weapon, Rifle, WeaponPose) | combat(Actor, Effects, AudioManager) | ai(Bot) | net(Network, RemoteActor, Match) | world(World, WorldContext, Terrain, Materials, Village, Compounds, Spawns, Vegetation, Mountains) | graphics(PostFX) | ui(UI) | math(MathUtil) | config.
Contracts: `Actor` (shootable), `PlayerMotion` (player->camera/animation), `WorldContext` (DI for builders), `heightAt()` (height source), mesh flags `metadata.solid|occluder`.
Network protocol (JSON): client->host `hello{name}`, `s{x,y,z,yaw,spd}`, `shoot{o,d}`; host->client `lobby{n}`, `busy`, `start{list,spawn}`, `snap{a:[id,x,y,z,yaw,spd,hp,alive],n}`, `fx{id,e}`, `kill{by,v}`, `end{w}`, `closed`.
Deployment: push -> GitHub Actions -> `npm install && npm run build` -> Pages.
