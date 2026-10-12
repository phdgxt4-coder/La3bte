# BUGS / RISKS (none confirmed by running; all unverified)
1. Build never run: possible TypeScript/Babylon API mismatches (check CascadedShadowGenerator props, SSAO2 options, ReflectionProbe usage, thinInstance calls).
2. AnimationBlender: body roll sign (lean into vs away from turn) and limb swing direction not visually verified.
3. ReflectionProbe cube used as `scene.environmentTexture` may need prefiltering/mip settings; PBR may look too bright/dark.
4. Roof template (custom prism) uses two-sided lighting; winding/normals unverified.
5. CSM `shadowMaxZ` set in World.bindCamera; cascades may need tuning.
6. SSAO2 skipped on WebGPU and mobile by design.
7. iOS ignores orientation lock/fullscreen; rotate overlay is the fallback.
8. Camera collision ray runs every 2nd frame: at very high speed may clip for 1 frame.
9. Player can stand on tree trunks/rocks (they are `solid`); no slope limit on terrain rim.
