import { CONFIG } from "./config";

export interface WeaponEvents { fired: boolean; empty: boolean; reloadStart: boolean }

/** Pure weapon state machine: fire rate, magazine, reserve ammo, reload timing. No rendering. */
export class WeaponSystem {
  ammo: number = CONFIG.weapon.mag; reserve: number = CONFIG.weapon.reserve; reloading = false;
  private t = 0; private cd = 0;
  reset(): void { this.ammo = CONFIG.weapon.mag; this.reserve = CONFIG.weapon.reserve; this.reloading = false; this.cd = 0; }

  update(dt: number, fire: boolean, reload: boolean): WeaponEvents {
    const w = CONFIG.weapon, ev: WeaponEvents = { fired: false, empty: false, reloadStart: false };
    this.cd = Math.max(0, this.cd - dt);
    if (this.reloading) {
      this.t -= dt;
      if (this.t <= 0) { const take = Math.min(w.mag - this.ammo, this.reserve); this.ammo += take; this.reserve -= take; this.reloading = false; }
      return ev;
    }
    if ((reload || (fire && this.ammo === 0)) && this.ammo < w.mag && this.reserve > 0) { this.reloading = true; this.t = w.reloadTime; ev.reloadStart = true; return ev; }
    if (fire && this.cd <= 0) {
      if (this.ammo > 0) { this.ammo--; this.cd = 60 / w.rpm; ev.fired = true; } else { this.cd = 0.3; ev.empty = true; }
    }
    return ev;
  }
}
