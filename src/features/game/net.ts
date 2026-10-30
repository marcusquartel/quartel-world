// Multiplayer via Supabase Realtime: presence (quem está online) + broadcast (movimento e eventos).
// Os eventos de outras pessoas são só visuais e de contagem local; nada aqui vale dinheiro.
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { Avatar } from "@/lib/game/catalog";

export const NET_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const NET_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const NET_ENABLED = Boolean(NET_URL && NET_KEY && !NET_KEY.startsWith("cole-aqui"));
const BASE_TOPIC = process.env.NEXT_PUBLIC_WORLD_CHANNEL || "quartel-world-v1";

/** Modo teste (?teste, ?bots=N, ?guerra, ?suprema): canal separado, não aparece no mundo de verdade. */
export function isTestMode() {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  return ["teste", "bots", "guerra", "suprema"].some((k) => q.has(k));
}

const topic = () => (isTestMode() ? `${BASE_TOPIC}-teste` : BASE_TOPIC);

export interface PeerProfile {
  id: string;
  nick: string;
  profession: string;
  team: boolean;
  avatar: Avatar;
  score: number;
}

export interface PeerPos {
  x: number;
  z: number;
  ry: number;
  walking: boolean;
}

export type SocialKind = "clap" | "heart" | "salute" | "medal";

export type NetEvent =
  | { t: "emote"; id: string; kind: string }
  | { t: "say"; id: string; text: string }
  | { t: "interact"; from: string; fromNick: string; to: string; kind: SocialKind }
  | { t: "star"; i: number; ttl: number }
  | { t: "legend"; slot: number; by: string; nick: string; kind?: "supreme" }
  | { t: "contact"; from: string; fromNick: string; to: string; instagram?: string; link?: string }
  | { t: "hit"; from: string; fromNick: string; to: string }
  | { t: "dj"; id: string; nick: string; track: string }
  | { t: "dj-off"; id: string }
  | { t: "dj-fx"; id: string; fx: string }
  | { t: "flirt"; from: string; fromNick: string; to: string; kind: FlirtKind };

export type FlirtKind = "wink" | "rose" | "coffee";

export type NetStatus = "connecting" | "online" | "offline";

export interface NetHandlers {
  peers: (p: PeerProfile[]) => void;
  event: (e: NetEvent) => void;
  status: (s: NetStatus) => void;
}

export class Net {
  private ch: RealtimeChannel | null = null;
  private pos = new Map<string, PeerPos>();
  private me: PeerProfile;
  private lastTrack = 0;
  private trackTimer: ReturnType<typeof setTimeout> | null = null;
  private online = 1;
  private listeners = new Set<Partial<NetHandlers>>();
  private lastPeers: PeerProfile[] = [];
  private status: NetStatus = "connecting";

  constructor(me: PeerProfile) {
    this.me = me;
  }

  /** Assina eventos; devolve a função para cancelar. Já entrega o estado atual. */
  listen(h: Partial<NetHandlers>) {
    this.listeners.add(h);
    h.peers?.(this.lastPeers);
    h.status?.(this.status);
    return () => {
      this.listeners.delete(h);
    };
  }

  private emitPeers(p: PeerProfile[]) {
    this.lastPeers = p;
    for (const l of this.listeners) l.peers?.(p);
  }
  private emitEvent(e: NetEvent) {
    for (const l of this.listeners) l.event?.(e);
  }
  private emitStatus(s: NetStatus) {
    this.status = s;
    for (const l of this.listeners) l.status?.(s);
  }

  private client: SupabaseClient | null = null;
  private closing = false;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    this.closing = false;
    this.client = createClient(NET_URL, NET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      // worker: o "batimento" da conexão roda num Web Worker e não para quando a aba vai para o fundo
      realtime: { params: { eventsPerSecond: 20 }, worker: true },
    });
    document.addEventListener("visibilitychange", this.onVisible);
    window.addEventListener("online", this.onVisible);
    this.join();
  }

  /** voltou para a aba ou a internet voltou: se caiu, reconecta na hora */
  private onVisible = () => {
    if (document.visibilityState === "visible" && this.status === "offline") this.rejoin(0);
  };

  private rejoin(delay: number) {
    if (this.closing || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      const old = this.ch;
      this.ch = null;
      if (old) void this.client?.removeChannel(old);
      this.join();
    }, delay);
  }

  private join() {
    const client = this.client;
    if (!client) return;
    const ch = client.channel(topic(), { config: { presence: { key: this.me.id }, broadcast: { self: false } } });
    this.ch = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PeerProfile>();
      const peers: PeerProfile[] = [];
      for (const [key, metas] of Object.entries(state)) {
        if (key === this.me.id || metas.length === 0) continue;
        peers.push(metas[metas.length - 1]);
      }
      this.online = peers.length + 1;
      for (const id of [...this.pos.keys()]) if (!state[id]) this.pos.delete(id);
      this.emitPeers(peers);
    });
    ch.on("broadcast", { event: "move" }, ({ payload }) => {
      const p = payload as { id: string; x: number; z: number; ry: number; w: 0 | 1 };
      this.pos.set(p.id, { x: p.x, z: p.z, ry: p.ry, walking: p.w === 1 });
    });
    ch.on("broadcast", { event: "ev" }, ({ payload }) => this.emitEvent(payload as NetEvent));
    this.emitStatus("connecting");
    ch.subscribe(async (status) => {
      if (ch !== this.ch) return; // canal antigo
      if (status === "SUBSCRIBED") {
        this.retries = 0;
        this.emitStatus("online");
        await ch.track(this.me);
        this.lastTrack = Date.now();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (this.closing) return;
        this.emitStatus("offline");
        // tenta de novo: 1s, 2s, 4s… até 15s
        const delay = Math.min(15000, 1000 * 2 ** this.retries);
        this.retries++;
        this.rejoin(delay);
      }
    });
  }

  /** Atualiza o que os outros veem (avatar, pontuação). Limitado a 1 vez a cada 4s. */
  updateMe(me: PeerProfile) {
    this.me = me;
    const wait = 4000 - (Date.now() - this.lastTrack);
    if (this.trackTimer) return;
    this.trackTimer = setTimeout(
      () => {
        this.trackTimer = null;
        this.lastTrack = Date.now();
        void this.ch?.track(this.me);
      },
      Math.max(0, wait),
    );
  }

  /** Movimento: menos mensagens quando tem muita gente (limite do Realtime). */
  moveRate() {
    return this.online > 40 ? 2 : this.online > 20 ? 3 : 5;
  }

  /** só envia pelo WebSocket com o canal conectado (senão o supabase-js cai para REST, 1 requisição por mensagem) */
  private ready() {
    return this.status === "online" && !!this.ch;
  }

  sendMove(x: number, z: number, ry: number, walking: boolean) {
    if (!this.ready()) return;
    void this.ch?.send({
      type: "broadcast",
      event: "move",
      payload: { id: this.me.id, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, ry: Math.round(ry * 100) / 100, w: walking ? 1 : 0 },
    });
  }

  send(ev: NetEvent) {
    if (!this.ready()) return;
    void this.ch?.send({ type: "broadcast", event: "ev", payload: ev });
  }

  get(id: string): PeerPos | undefined {
    return this.pos.get(id);
  }

  close() {
    this.closing = true;
    if (this.trackTimer) clearTimeout(this.trackTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    document.removeEventListener("visibilitychange", this.onVisible);
    window.removeEventListener("online", this.onVisible);
    const ch = this.ch;
    this.ch = null;
    if (ch) void this.client?.removeChannel(ch);
  }

}
