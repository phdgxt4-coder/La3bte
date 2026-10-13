import { CONFIG } from "./config";

export interface UICallbacks {
  onQuick(): void; onCreateRoom(): void; onJoin(code: string): void; onStartMatch(): void; onEndRoom(): void; onLeave(): void; onContinue(): void;
  onSensitivity(v: number): void; onRenderScale(v: number): void; onCameraDistance(v: number): void;
}
const PANELS = ["menu", "private", "lobby", "settings", "result"];

/** DOM UI: loading screen, main menu, private-room lobby, settings, HUD (crosshair, health, ammo, status, remaining, room code, feed), result screens. */
export class UI {
  private isHost = false; private code = ""; private hpLast = -1;
  private $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  constructor(private cb: UICallbacks, backend: string, private touch: boolean) {
    const on = (id: string, f: () => void) => (this.$(id).onclick = f);
    this.$("ver").textContent = `BattleVerse v${CONFIG.version}`; this.$("backend").textContent = `Renderer: ${backend}`;
    on("b-quick", () => { this.fullscreen(); cb.onQuick(); });
    on("b-private", () => this.panel("private")); on("b-pback", () => this.panel("menu"));
    on("b-settings", () => this.panel("settings")); on("b-sback", () => this.panel("menu"));
    on("b-create", () => { this.fullscreen(); cb.onCreateRoom(); });
    on("b-join", () => { const c = this.$<HTMLInputElement>("code-in").value.trim().toUpperCase(); if (c.length === 5) { this.fullscreen(); cb.onJoin(c); } else this.toast("Enter the 5-character room code"); });
    on("b-start", () => cb.onStartMatch());
    on("b-end", () => (this.isHost ? cb.onEndRoom() : cb.onLeave()));
    on("b-continue", () => cb.onContinue());
    on("b-copy", () => { navigator.clipboard?.writeText(this.link()).then(() => this.toast("Link copied"), () => this.toast(this.link())); });
    on("b-share", () => { const n = navigator as any; if (n.share) n.share({ title: "BattleVerse", text: "Join my BattleVerse room!", url: this.link() }).catch(() => {}); else this.$("b-copy").click(); });
    const bind = (id: string, f: (v: number) => void) => (this.$<HTMLInputElement>(id).oninput = e => f(+(e.target as HTMLInputElement).value));
    bind("sens", cb.onSensitivity); bind("scale", cb.onRenderScale); bind("dist", cb.onCameraDistance);
    const guard = () => this.$("rotate").classList.toggle("hidden", innerWidth >= innerHeight);
    addEventListener("resize", guard); guard();
  }
  private fullscreen(): void { try { document.documentElement.requestFullscreen?.().then(() => (screen.orientation as any)?.lock?.("landscape")).catch(() => {}); } catch { /* optional */ } }
  private link(): string { return `${location.origin}${location.pathname}?room=${this.code}`; }
  private panel(id: string | null): void { PANELS.forEach(p => this.$(p).classList.toggle("hidden", p !== id)); }

  setLoading(p: number, text: string): void { this.$("load-bar").style.width = Math.round(p * 100) + "%"; this.$("load-text").textContent = text; }
  hideLoading(): void { const l = this.$("loading"); l.classList.add("done"); setTimeout(() => l.remove(), 600); }
  setFps(fps: number): void { this.$("fps").textContent = `${Math.round(fps)} FPS`; }

  showMenu(): void { this.panel("menu"); this.$("hud").classList.add("hidden"); this.$("touch").classList.add("hidden"); document.exitPointerLock?.(); }
  showLobby(names: string[], host: boolean, code: string): void {
    this.isHost = host; this.code = code; this.panel("lobby"); this.$("hud").classList.add("hidden"); this.$("touch").classList.add("hidden");
    this.$("room-code").textContent = code; this.$<HTMLInputElement>("room-link").value = this.link();
    this.$("players").innerHTML = names.map((n, i) => `<div>${i + 1}. ${n.replace(/</g, "&lt;")}</div>`).join("");
    this.$("b-start").classList.toggle("hidden", !host); this.$("b-end").textContent = host ? "END ROOM" : "LEAVE ROOM";
    this.$("lobby-hint").textContent = host ? "Keep this page open. The room stays alive until you press END ROOM." : "Waiting for the host to start…";
  }
  showHUD(roomCode: string): void {
    this.panel(null); this.$("hud").classList.remove("hidden"); this.$("touch").classList.toggle("hidden", !this.touch);
    this.$("roomtag").textContent = roomCode ? `ROOM ${roomCode}` : ""; this.$("elim").classList.add("hidden"); this.hpLast = -1;
  }
  setHealth(hp: number): void { if (hp === this.hpLast) return; this.hpLast = hp; this.$("hp-fill").style.width = Math.max(0, hp) + "%"; this.$("hp-text").textContent = String(Math.max(0, Math.round(hp))); }
  setAmmo(a: number, r: number, reloading: boolean): void { this.$("ammo").textContent = reloading ? "RELOADING" : `${a} / ${r}`; }
  setStatus(t: string): void { this.$("status").textContent = t; }
  setRemaining(n: number): void { this.$("remain").textContent = `ALIVE ${n}`; }
  eliminated(): void { this.$("elim").classList.remove("hidden"); }
  result(win: boolean, sub: string): void {
    this.$("res-title").textContent = win ? "VICTORY" : "DEFEAT"; this.$("res-title").className = win ? "win" : "lose"; this.$("res-sub").textContent = sub;
    this.$("hud").classList.add("hidden"); this.$("touch").classList.add("hidden"); this.panel("result"); document.exitPointerLock?.();
  }
  hitMarker(): void { const h = this.$("hitm"); h.classList.add("on"); setTimeout(() => h.classList.remove("on"), 90); }
  damageFlash(): void { const d = this.$("dmg"); d.classList.add("on"); setTimeout(() => d.classList.remove("on"), 140); }
  feed(t: string): void { const f = this.$("feed"), e = document.createElement("div"); e.textContent = t; f.appendChild(e); setTimeout(() => e.remove(), 4000); while (f.children.length > 4) f.firstChild!.remove(); }
  toast(t: string): void { const e = this.$("toast"); e.textContent = t; e.classList.add("on"); setTimeout(() => e.classList.remove("on"), 2800); }
}
