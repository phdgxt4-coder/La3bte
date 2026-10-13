import { Scene, Vector3 } from "@babylonjs/core";
import { Actor, hitscan } from "./Actor";
import { Bot } from "./Bot";
import { RemoteActor } from "./RemoteActor";
import { Network, Msg } from "./Network";
import { PlayerController } from "./PlayerController";
import { PlayerCombat } from "./PlayerCombat";
import { Effects } from "./Effects";
import { AudioManager } from "./AudioManager";
import { UI } from "./UI";
import { ShadowCaster } from "./WorldContext";
import { CONFIG } from "./config";
import { clamp } from "./MathUtil";

export interface MatchDeps { scene: Scene; player: PlayerController; combat: PlayerCombat; fx: Effects; audio: AudioManager; ui: UI; spawns: Vector3[]; camPos: Vector3; shadow: ShadowCaster; onSpawn(yaw: number): void }
type Role = "offline" | "host" | "client";
type Entry = { id: string; name: string; bot: boolean };
const BOTS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "Nova"];
const COLORS = ["#c0392b", "#8e44ad", "#d35400", "#16a085", "#7f8c8d", "#b7950b", "#2c3e50", "#a93226"];
const r2 = (n: number): number => Math.round(n * 100) / 100;
const v3 = (a: number[]): Vector3 => new Vector3(a[0], a[1], a[2]);

/**
 * Match flow + networking glue.
 * Authority (offline or host) simulates bots, resolves shots/damage, detects the winner and broadcasts snapshots (15 Hz).
 * Clients send their own state/shots and render snapshots. Private rooms persist across matches until endRoom().
 */
export class Match {
  state: "idle" | "lobby" | "playing" | "ended" = "idle";
  role: Role = "offline"; code = ""; myId = "me";
  readonly me: Actor;
  private actors = new Map<string, Actor>(); private bots = new Map<string, Bot>(); private remotes = new Map<string, RemoteActor>();
  private net?: Network; private names = new Map<string, string>(); private lobbyNames: string[] = [];
  private snapT = 0; private winT = 0; private myName = "Player" + Math.floor(100 + Math.random() * 900); private wake?: any;

  constructor(private d: MatchDeps) {
    const pl = d.player;
    this.me = { id: "me", name: "You", kind: "player", hp: 100, alive: true, feet: pl.position, get yaw() { return pl.root.rotation.y; }, get speed() { return pl.motion.speed; } };
    d.combat.onShoot = (o, dir) => this.onLocalShot(o, dir);
    d.combat.onHit = () => d.ui.hitMarker();
  }

  // ---------- entry points ----------
  startQuick(): void { this.leave(); this.role = "offline"; this.myId = "me"; this.me.id = "me"; this.beginMatch([{ id: "me", name: "You" }], CONFIG.match.maxPlayers - 1); }

  async createRoom(): Promise<void> {
    this.leave(); const n = this.net = new Network(); this.code = await n.host(); this.role = "host"; this.myId = "host"; this.me.id = "host";
    this.names.set("host", this.myName + " (host)"); this.state = "lobby"; this.wireHost(n); this.keepAwake(); this.broadcastLobby();
  }

  async joinRoom(code: string): Promise<void> {
    this.leave(); const n = this.net = new Network(); await n.join(code);
    this.role = "client"; this.myId = n.myId; this.me.id = n.myId; this.code = code.toUpperCase(); this.state = "lobby";
    n.onMessage = (_f, m) => this.onClientMsg(m);
    n.onClosed = () => { this.leave(); this.d.ui.toast("Room closed by host"); this.d.ui.showMenu(); };
    n.send({ t: "hello", name: this.myName }); this.d.ui.showLobby(["Connecting…"], false, this.code);
  }

  hostStart(): void {
    if (this.role !== "host" || this.state !== "lobby") return;
    const humans = [...this.names].map(([id, name]) => ({ id, name }));
    this.beginMatch(humans, humans.length < 2 ? 4 : 0);
  }

  backToLobby(): void {
    this.clearActors(); this.state = "lobby";
    if (this.role === "host") this.broadcastLobby(); else this.d.ui.showLobby(this.lobbyNames, false, this.code);
  }

  endRoom(): void { this.net?.broadcast({ t: "closed" }); setTimeout(() => this.leave(), 150); }

  leave(): void {
    this.net?.close(); this.net = undefined; this.clearActors(); this.names.clear(); this.state = "idle"; this.role = "offline"; this.code = "";
    try { this.wake?.release?.(); } catch { /* ignore */ } this.wake = undefined;
  }

  private keepAwake(): void { (navigator as any).wakeLock?.request?.("screen").then((w: any) => (this.wake = w)).catch(() => {}); }

  // ---------- host wiring ----------
  private wireHost(n: Network): void {
    n.onPeerJoin = id => { this.names.set(id, "Player" + Math.floor(100 + Math.random() * 900)); if (this.state === "playing") n.sendTo(id, { t: "busy" }); this.broadcastLobby(); };
    n.onPeerLeave = id => {
      this.names.delete(id); const r = this.remotes.get(id); if (r?.alive) { r.die(); this.net?.broadcast({ t: "kill", by: "", v: id }); }
      this.broadcastLobby();
    };
    n.onMessage = (from, m) => {
      const r = this.remotes.get(from);
      if (m.t === "hello") { this.names.set(from, String(m.name).slice(0, 14)); this.broadcastLobby(); }
      else if (m.t === "s" && r?.alive) r.setState(m.x, m.y, m.z, m.yaw, m.spd);
      else if (m.t === "shoot" && r?.alive && this.state === "playing") this.resolveShot(from, v3(m.o), v3(m.d));
    };
  }

  private broadcastLobby(): void {
    this.lobbyNames = [...this.names.values()];
    this.net?.broadcast({ t: "lobby", n: this.lobbyNames });
    if (this.state === "lobby") this.d.ui.showLobby(this.lobbyNames, true, this.code);
  }

  // ---------- client messages ----------
  private onClientMsg(m: Msg): void {
    switch (m.t) {
      case "lobby": this.lobbyNames = m.n; if (this.state === "lobby") this.d.ui.showLobby(m.n, false, this.code); break;
      case "busy": this.d.ui.toast("Match in progress - you will join the next one"); break;
      case "start": if (this.state !== "playing") this.applyStart(m.list, m.spawn); break;
      case "snap": this.applySnap(m); break;
      case "fx": if (m.id !== this.myId) this.showShotFx(m.id, v3(m.e)); break;
      case "kill": this.d.ui.feed(`${this.nameOf(m.by)} ➜ ${this.nameOf(m.v)}`); break;
      case "end": if (this.state === "playing") this.finish(m.w); break;
      case "closed": this.leave(); this.d.ui.toast("Room closed by host"); this.d.ui.showMenu(); break;
    }
  }

  // ---------- match start ----------
  private beginMatch(humans: { id: string; name: string }[], botCount: number): void {
    const list: Entry[] = humans.map(h => ({ ...h, bot: false }));
    for (let i = 0; i < botCount; i++) list.push({ id: "bot" + i, name: BOTS[i % BOTS.length], bot: true });
    const order = this.d.spawns.map((_, i) => i).sort(() => Math.random() - 0.5), spawn: Record<string, number> = {};
    list.forEach((p, i) => (spawn[p.id] = order[i % order.length]));
    this.net?.broadcast({ t: "start", list, spawn });
    this.applyStart(list, spawn);
  }

  private applyStart(list: Entry[], spawn: Record<string, number>): void {
    this.clearActors(); const d = this.d, me = this.me;
    me.hp = 100; me.alive = true; this.actors.set(this.myId, me);
    const sp = d.spawns[spawn[this.myId] ?? 0], yaw = Math.atan2(-sp.x, -sp.z);
    d.player.teleport(sp.x, sp.z, yaw); d.onSpawn(yaw); d.combat.weapon.reset();
    const botCtx = { scene: d.scene, shadow: d.shadow, camPos: d.camPos, actors: () => this.actors.values(), fire: (b: Bot, f: Vector3, t: Vector3, h: Actor | null) => this.botShot(b, f, t, h) };
    list.forEach((p, i) => {
      if (p.id === this.myId) return;
      const s = d.spawns[spawn[p.id] ?? 0], hex = COLORS[i % COLORS.length];
      if (p.bot && this.role !== "client") { const b = new Bot(p.id, p.name, botCtx, s, hex); this.bots.set(p.id, b); this.actors.set(p.id, b); }
      else { const r = new RemoteActor(p.id, p.name, d.scene, hex, s, d.shadow); this.remotes.set(p.id, r); this.actors.set(p.id, r); }
    });
    this.state = "playing"; this.snapT = 0; this.winT = 0;
    d.ui.showHUD(this.role === "offline" ? "" : this.code); d.ui.setRemaining(list.length); d.ui.setStatus("FIGHT!");
    setTimeout(() => this.state === "playing" && d.ui.setStatus("Last one standing wins"), 2500);
  }

  private clearActors(): void {
    this.bots.forEach(b => b.dispose()); this.remotes.forEach(r => r.dispose()); this.bots.clear(); this.remotes.clear(); this.actors.clear();
    this.d.player.root.rotation.x = 0;
  }

  // ---------- per frame ----------
  update(dt: number): void {
    if (this.state !== "playing") return;
    const auth = this.role !== "client";
    if (auth) this.bots.forEach(b => b.update(dt));
    this.remotes.forEach(r => r.update(dt, this.d.camPos));
    this.snapT += dt;
    if (this.snapT < 1 / 15) return;
    this.snapT = 0;
    const p = this.d.player.position;
    if (this.role === "client") { this.net?.send({ t: "s", x: r2(p.x), y: r2(p.y), z: r2(p.z), yaw: r2(this.d.player.root.rotation.y), spd: r2(this.d.player.motion.speed) }); return; }
    const a: any[] = []; let alive = 0, last = "";
    this.actors.forEach(x => { a.push([x.id, r2(x.feet.x), r2(x.feet.y), r2(x.feet.z), r2(x.yaw), r2(x.speed), Math.round(x.hp), x.alive ? 1 : 0]); if (x.alive) { alive++; last = x.id; } });
    this.net?.broadcast({ t: "snap", a, n: alive }); this.d.ui.setRemaining(alive);
    if (alive <= 1) { this.net?.broadcast({ t: "end", w: alive === 1 ? last : "" }); this.finish(alive === 1 ? last : ""); }
  }

  private applySnap(m: Msg): void {
    for (const e of m.a as any[][]) {
      const [id, x, y, z, yaw, spd, hp, al] = e;
      if (id === this.myId) {
        if (hp < this.me.hp) { this.d.audio.hurt(); this.d.ui.damageFlash(); }
        this.me.hp = hp; if (!al && this.me.alive) this.localDeath();
      } else { const r = this.remotes.get(id); if (r) { r.setState(x, y, z, yaw, spd); r.setVitals(hp, !!al); } }
    }
    this.d.ui.setRemaining(m.n);
  }

  private finish(winner: string): void {
    this.state = "ended"; const won = winner === this.myId;
    this.d.ui.result(won, winner ? (won ? "You are the last one standing" : `${this.nameOf(winner)} won the match`) : "Nobody survived");
  }

  // ---------- combat (authority) ----------
  private onLocalShot(o: Vector3, d: Vector3): boolean {
    if (this.state !== "playing") return false;
    if (this.role === "client") { this.net?.send({ t: "shoot", o: [r2(o.x), r2(o.y), r2(o.z)], d: [r2(d.x), r2(d.y), r2(d.z)] }); return false; }
    return this.resolveShot(this.myId, o, d);
  }

  private resolveShot(shooter: string, o: Vector3, d: Vector3): boolean {
    const h = hitscan(this.d.scene, o, d.normalize(), this.actors.values(), shooter, CONFIG.weapon.range);
    this.net?.broadcast({ t: "fx", id: shooter, e: [r2(h.point.x), r2(h.point.y), r2(h.point.z)] });
    if (shooter !== this.myId) this.showShotFx(shooter, h.point);
    if (h.actor) this.damage(h.actor, CONFIG.weapon.damage * (h.head ? 2 : 1), shooter);
    return !!h.actor;
  }

  private botShot(b: Bot, from: Vector3, to: Vector3, hit: Actor | null): void {
    this.net?.broadcast({ t: "fx", id: b.id, e: [r2(to.x), r2(to.y), r2(to.z)] }); this.showShotFx(b.id, to);
    if (hit) this.damage(hit, CONFIG.match.botDamage, b.id);
  }

  private showShotFx(id: string, end: Vector3): void {
    const s = this.actors.get(id); if (!s) return;
    const from = new Vector3(s.feet.x + Math.sin(s.yaw) * 0.7, s.feet.y + 1.3, s.feet.z + Math.cos(s.yaw) * 0.7);
    this.d.fx.flashAt(from); this.d.fx.tracer(from, end); this.d.fx.spark(end);
    this.d.audio.shot(clamp(1 - Vector3.Distance(from, this.d.camPos) / 80, 0.08, 1));
  }

  private damage(v: Actor, dmg: number, by: string): void {
    if (!v.alive || this.state !== "playing") return;
    v.hp -= dmg;
    if (v === this.me) { this.d.audio.hurt(); this.d.ui.damageFlash(); }
    if (v.hp > 0) return;
    v.hp = 0; v.alive = false; this.bots.get(v.id)?.die(); this.remotes.get(v.id)?.die();
    if (v === this.me) this.localDeath();
    this.net?.broadcast({ t: "kill", by, v: v.id }); this.d.ui.feed(`${this.nameOf(by)} ➜ ${v.name}`);
  }

  private localDeath(): void { this.me.alive = false; this.d.player.root.rotation.x = -Math.PI / 2; this.d.ui.eliminated(); }
  private nameOf(id: string): string { return id === this.myId ? "You" : this.actors.get(id)?.name ?? this.names.get(id) ?? "?"; }
}
