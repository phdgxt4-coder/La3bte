import Peer, { DataConnection } from "peerjs";

export type Msg = { t: string; [k: string]: any };
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Serverless-style networking over WebRTC (PeerJS public broker only for the handshake).
 * Host: owns the room id "bv-CODE". Clients connect to it. The room lives as long as the host page stays open and `close()` is not called.
 */
export class Network {
  isHost = false; code = ""; myId = "";
  onMessage: (from: string, m: Msg) => void = () => {};
  onPeerJoin: (id: string) => void = () => {};
  onPeerLeave: (id: string) => void = () => {};
  onClosed: () => void = () => {};
  private peer?: Peer; private conns = new Map<string, DataConnection>(); private hostConn?: DataConnection; private closing = false;

  host(): Promise<string> {
    this.isHost = true;
    return new Promise((resolve, reject) => {
      const attempt = (n: number): void => {
        const code = Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
        const p = new Peer("bv-" + code);
        p.on("open", () => { this.peer = p; this.code = code; this.myId = "host"; p.on("connection", c => this.accept(c)); resolve(code); });
        p.on("error", (e: any) => { if (e.type === "unavailable-id" && n < 5) { p.destroy(); attempt(n + 1); } else reject(e); });
        p.on("disconnected", () => { if (!p.destroyed && !this.closing) p.reconnect(); }); // keep the room alive if the broker link drops
      };
      attempt(0);
    });
  }

  private accept(c: DataConnection): void {
    c.on("open", () => { this.conns.set(c.peer, c); this.onPeerJoin(c.peer); });
    c.on("data", d => this.onMessage(c.peer, d as Msg));
    c.on("close", () => { if (this.conns.delete(c.peer)) this.onPeerLeave(c.peer); });
  }

  join(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const p = new Peer(), to = setTimeout(() => { p.destroy(); reject(new Error("timeout")); }, 12000);
      p.on("error", e => { clearTimeout(to); reject(e); });
      p.on("open", id => {
        this.peer = p; this.myId = id;
        const c = p.connect("bv-" + code.toUpperCase(), { reliable: true });
        c.on("open", () => { clearTimeout(to); this.hostConn = c; resolve(); });
        c.on("data", d => this.onMessage("host", d as Msg));
        c.on("close", () => { if (!this.closing) this.onClosed(); });
        c.on("error", e => { clearTimeout(to); reject(e); });
      });
    });
  }

  send(m: Msg): void { this.hostConn?.open && this.hostConn.send(m); }
  broadcast(m: Msg): void { this.conns.forEach(c => c.open && c.send(m)); }
  sendTo(id: string, m: Msg): void { const c = this.conns.get(id); if (c?.open) c.send(m); }
  close(): void { this.closing = true; this.conns.forEach(c => c.close()); this.conns.clear(); this.hostConn?.close(); this.peer?.destroy(); }
}
