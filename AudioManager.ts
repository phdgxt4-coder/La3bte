/** Procedural WebAudio sound effects (no asset files): gunshot, reload, empty click, hit, hurt. Call unlock() from a user gesture. */
export class AudioManager {
  private ctx?: AudioContext; private noise?: AudioBuffer;
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); const n = this.ctx.sampleRate * 0.4, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    }
    this.ctx.resume?.();
  }
  private tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine"): void {
    const c = this.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur);
  }
  private burst(dur: number, vol: number, cut: number): void {
    const c = this.ctx; if (!c || !this.noise) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.noise; f.type = "lowpass"; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + dur);
  }
  shot(gain = 1): void { this.burst(0.18, 0.5 * gain, 3000); this.tone(140, 40, 0.12, 0.5 * gain); }
  reload(): void { this.tone(900, 500, 0.05, 0.15, "square"); setTimeout(() => this.tone(600, 300, 0.07, 0.15, "square"), 900); setTimeout(() => this.tone(1000, 700, 0.05, 0.2, "square"), 1900); }
  empty(): void { this.tone(1200, 800, 0.04, 0.12, "square"); }
  hit(): void { this.tone(1500, 900, 0.06, 0.15); }
  hurt(): void { this.tone(200, 80, 0.15, 0.3, "sawtooth"); }
}
