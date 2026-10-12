import { Engine, WebGPUEngine, AbstractEngine } from "@babylonjs/core";
import { CONFIG, isMobile } from "./config";

export interface EngineHandle { engine: AbstractEngine; backend: "WebGPU" | "WebGL" }

/** Creates a WebGPU engine when supported, otherwise WebGL. Caps DPR for mobile performance. */
export async function createEngine(canvas: HTMLCanvasElement): Promise<EngineHandle> {
  let handle: EngineHandle;
  try {
    if (await WebGPUEngine.IsSupportedAsync) {
      const e = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: false });
      await e.initAsync();
      handle = { engine: e, backend: "WebGPU" };
    } else throw new Error("no webgpu");
  } catch {
    handle = { engine: new Engine(canvas, true, { powerPreference: "high-performance", stencil: true }, false), backend: "WebGL" };
  }
  const cap = isMobile() ? CONFIG.render.mobileMaxDpr : CONFIG.render.desktopMaxDpr;
  handle.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, cap));
  return handle;
}
