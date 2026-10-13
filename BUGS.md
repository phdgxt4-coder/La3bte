# BUGS / RISKS (none confirmed by running; all unverified)
1. Build never run: possible TS/Babylon API mismatches (peerjs import, CascadedShadowGenerator, SSAO2, ReflectionProbe, thin instances).
2. Arm/leg rotation sign assumed: negative rotation.x = arms forward. If arms point backwards when holding the rifle, flip signs in WeaponPose.ts / AnimationBlender.ts.
3. WebRTC without TURN fails on some mobile networks / strict NAT; room join may time out (12 s).
4. Host phone locking screen or switching tab may freeze the room (Wake Lock requested but not guaranteed).
5. PeerJS public broker availability is outside our control.
6. Muzzle flash light does not affect frozen PBR materials (frozen before the light exists).
7. No lag compensation: client hits judged on host positions (15 Hz interpolated).
8. Watch tower stairs: steps are 0.42 m, may need a jump; ground detection uses one ray.
9. Bots ignore each other's cover and cannot climb stairs; they can clip through trees.
10. Quick Match is offline (bots only).
11. Stale PeerJS id: refreshing the host page frees the code; clients need a new link.
