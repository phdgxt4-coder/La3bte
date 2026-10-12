import { CONFIG } from "./config";

export interface UICallbacks { onPlay(): void; onSensitivity(v: number): void; onRenderScale(v: number): void; onCameraDistance(v: number): void }

/** DOM-based minimal UI: loading screen, menu, settings, FPS counter, version, landscape guard. */
export class UI {
  private $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  constructor(cb: UICallbacks, backend: string, touch: boolean) {
    this.$("ver").textContent = `BattleVerse v${CONFIG.version}`;
    this.$("backend").textContent = `Renderer: ${backend}`;
    this.$("play").onclick = async () => {
      this.$("menu").classList.add("hidden"); this.$("touch").classList.toggle("hidden", !touch);
      cb.onPlay();
      try { await document.documentElement.requestFullscreen?.(); await (screen.orientation as any)?.lock?.("landscape"); } catch { /* optional */ }
    };
    this.$("open-settings").onclick = () => this.$("settings").classList.remove("hidden");
    this.$("close-settings").onclick = () => this.$("settings").classList.add("hidden");
    const bind = (id: string, f: (v: number) => void) => (this.$<HTMLInputElement>(id).oninput = e => f(+(e.target as HTMLInputElement).value));
    bind("sens", cb.onSensitivity); bind("scale", cb.onRenderScale); bind("dist", cb.onCameraDistance);
    const guard = () => this.$("rotate").classList.toggle("hidden", innerWidth >= innerHeight);
    addEventListener("resize", guard); guard();
  }
  setLoading(p: number, text: string): void { this.$("load-bar").style.width = Math.round(p * 100) + "%"; this.$("load-text").textContent = text; }
  hideLoading(): void { const l = this.$("loading"); l.classList.add("done"); setTimeout(() => l.remove(), 600); }
  setFps(fps: number): void { this.$("fps").textContent = `${Math.round(fps)} FPS`; }
}
