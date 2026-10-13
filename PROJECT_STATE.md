# PROJECT_STATE - BattleVerse
Source of truth. Never rely on chat history. Only improve/extend; never recreate completed systems.

## Current Version
0.3.0 (Phase 3: first playable shooter). Stack: Babylon.js 7, TypeScript, Vite, PeerJS (WebRTC rooms). Deployed to GitHub Pages by `.github/workflows/deploy.yml` (Source = GitHub Actions). FLAT LAYOUT: all .ts files in repo root (owner uploads from a phone; web upload drops folders). Entry `main.ts`; the workflow file must exist at `.github/workflows/deploy.yml`.

## VERIFICATION STATUS (IMPORTANT)
Phases 1-3 were written offline: never compiled with Babylon types, never run. First task: `npm install && npm run build`, fix errors, test desktop + phone + two devices for rooms. Log results in BUGS.md.

## Completed Features
Phase 1-2 (kept): WebGPU/WebGL, HDR/ACES/bloom/SSAO, CSM shadows, procedural sky, probe IBL, shoulder camera (zoom, lag, collision, shake, FOV), player controller (accel/decel, air control, coyote, jump buffer, landing), layered procedural animation, terrain/village/forest/rocks/grass/mountains, loading screen, settings.
Phase 3:
- Map: bounded by cliff ring (Terrain.heightAt rim r 86..104 up to 18 m) + radial clamp at `CONFIG.world.playRadius` (98) + mountain ring; invisible box walls remain only as a backup. Areas: village (6 houses, road, lamps), forest (46,50), warehouse (-50,44), military base with fence/barracks/bunkers/sandbags + watch tower with stairs (44,-44), open fields. 16 safe spawns (Spawns.ts).
- Weapon: assault rifle model in hands (Rifle.ts, WeaponPose.ts), hold/sprint/aim/reload poses, ADS (camera FOV/distance/sensitivity), recoil, spread, 30/120 ammo, reload 2.1 s, muzzle flash+light, tracers, impact sparks, shell ejection (Effects.ts, pooled), procedural WebAudio sounds (AudioManager.ts), hitscan with headshots x2 (Actor.ts).
- Enemies: Bot.ts (patrol/chase/search, LOS scan 3x/s, inaccurate shooting, dies, respawns next match), SoldierModel.ts.
- Match flow (Match.ts): Quick Match = offline, you + 14 bots (no public matchmaking server yet). Private Match = host creates room (code + link), friends join via code or `?room=CODE` link, host presses START MATCH any time, free-for-all, last alive wins, Victory/Defeat screen, returns to the same lobby; room persists until host presses END ROOM. If host is alone, 4 bots are added.
- Networking (Network.ts): PeerJS WebRTC, host authoritative (bots, hits, damage, win); clients send state/shots at 15 Hz, host broadcasts snapshots at 15 Hz. Host uses Screen Wake Lock.
- UI (UI.ts, index.html): main menu, private panel, lobby (code, link, copy, share, player list, START/END ROOM), HUD (crosshair, hit marker, health, ammo, status, alive count, room code, kill feed, damage flash), result screen, touch buttons (fire, aim, reload, jump, sprint, joystick).

## Modified Files (Phase 3)
config.ts, Terrain.ts, Vegetation.ts, World.ts, InputManager.ts, PlayerController.ts, ThirdPersonCamera.ts, Game.ts, UI.ts, index.html, package.json.
New: Actor, Rifle, WeaponPose, Weapon, SoldierModel, Effects, AudioManager, PlayerCombat, Bot, RemoteActor, Network, Match, Compounds, Spawns (.ts).

## Architecture Decisions
- Authority = offline or host. Clients never decide damage. Shots: client sends origin/dir, host hitscans against its actor positions (no lag compensation).
- Hit detection is analytic (3 spheres per actor); world blocking via pickWithRay on `metadata.solid|occluder` plus terrain sampling.
- Actor interface (id, hp, alive, feet, yaw, speed) unifies player/bots/remotes. Bots exist only on the authority; clients see them as RemoteActors from snapshots.
- Terrain is not collidable (analytic `heightAt`); props are.
- Room id = PeerJS id `bv-CODE`. Link = `<page url>?room=CODE`. No own server.

## Known Issues
See BUGS.md. Key: unverified build; WebRTC may fail on strict mobile NAT (no TURN); host must keep the page open/unlocked; public Quick Match is offline vs bots; arm pose signs unverified; flash light ignored by frozen PBR materials.

## Performance Notes
Single thin-instance grass draw call, instanced vegetation, frozen static meshes/materials, CSM only on desktop, bots animate only within 80 m of camera, bot perception 3 Hz, tracer/spark/shell pools, camera collision ray every 2nd frame, soldiers cast shadows with torso+head only. Untested on devices.

## Remaining Tasks
TODO.md.

## Exact Next Phase Objectives
1. Build/fix/run; verify two-device private room end-to-end. 2. Real public matchmaking (small signalling/relay server or serverless trick). 3. glTF soldier + rifle with real animations behind AnimationBlender. 4. Client-side prediction/lag compensation, TURN server config. 5. Perf pass on phones. Do NOT add inventory/vehicles/more weapons until asked.

## Phase workflow (never change)
Every phase deliver: source package (flat, includes docs), GitHub Pages build (produced by the Actions workflow from the source), updated handover docs.
