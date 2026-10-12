import { Scene, Camera, DefaultRenderingPipeline, SSAO2RenderingPipeline, ImageProcessingConfiguration } from "@babylonjs/core";

/** HDR post-processing: ACES tone mapping, bloom, vignette, MSAA (desktop) / FXAA (mobile), SSAO2 on desktop WebGL only. */
export function createPostFX(scene: Scene, camera: Camera, backend: string, mobile: boolean): void {
  const p = new DefaultRenderingPipeline("hdr", true, scene, [camera]);
  p.samples = mobile ? 1 : 4; p.fxaaEnabled = mobile;
  p.bloomEnabled = true; p.bloomThreshold = mobile ? 1.0 : 0.85; p.bloomWeight = mobile ? 0.15 : 0.3; p.bloomKernel = mobile ? 32 : 64; p.bloomScale = 0.5;
  p.imageProcessingEnabled = true;
  const ip = p.imageProcessing;
  ip.toneMappingEnabled = true; ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES; ip.exposure = 1.1; ip.contrast = 1.15;
  ip.vignetteEnabled = true; ip.vignetteWeight = 1.8;
  if (!mobile && backend === "WebGL" && SSAO2RenderingPipeline.IsSupported) {
    try {
      const s = new SSAO2RenderingPipeline("ssao", scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera]);
      s.radius = 2; s.totalStrength = 0.8; s.samples = 12; s.expensiveBlur = false; s.maxZ = 100;
    } catch (e) { console.warn("SSAO unavailable", e); }
  }
}
