// Bots determinísticos para o modo demo e para teste de carga (?bots=N).
// Rodam só no navegador: não vão a canal nem a banco.
import { ITEMS, type Avatar, type Slot, DEFAULT_AVATAR } from "@/lib/game/catalog";
import { WORLD_RADIUS, clampToWorld } from "./world";

export interface Player {
  id: string;
  name: string;
  role: string;
  avatar: Avatar;
  /** posição no ranking ao vivo */
  rank: number | null;
  score: number;
  team?: boolean;
  bot?: boolean;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Bia", "Caio", "Duda", "Enzo", "Fernanda", "Gui", "Helena", "Igor", "Julia", "Leo", "Malu", "Nico", "Paula", "Rodrigo", "Tati", "Vitor", "Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabi", "Heitor", "Iara", "João", "Kátia", "Lucas", "Marina", "Nando", "Olívia", "Pedro", "Quésia", "Rafa", "Sofia", "Téo", "Ursula", "Vini", "Wanda", "Xande", "Yasmin", "Zeca"];
const LAST = ["Souza", "Lima", "Rocha", "Alves", "Prado", "Costa", "Nunes", "Ramos", "Melo", "Dias"];
const ROLES = ["Designer", "Dev", "Social media", "Redator(a)", "Marketing", "Foto e vídeo", "Diretor(a) de arte", "Estudante", "Empreendedor(a)"];

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function randomAvatar(r: () => number, generous: boolean): Avatar {
  const out = { ...DEFAULT_AVATAR };
  const slots: Slot[] = ["skin", "hair", "hairColor", "top", "bottom", "head", "back", "pet", "effect", "title"];
  for (const slot of slots) {
    const pool = ITEMS.filter((it) => it.slot === slot && (generous || it.free));
    out[slot] = pick(r, pool).id;
  }
  if (r() < 0.6) out.pet = "pet-none";
  if (r() < 0.6) out.effect = "fx-none";
  return out;
}

/** Equipe fictícia do protótipo (vira dados reais quando ligar ao banco). */
export function demoTeam(): Player[] {
  const r = mulberry32(42);
  const team: Player[] = [
    { id: "p-marina", name: "Marina Prado", role: "Diretora de Arte", team: true, rank: 1, score: 243, avatar: { ...randomAvatar(r, true), head: "head-quepe", title: "t-general", effect: "fx-aura", top: "top-gala" } },
    { id: "p-heitor", name: "Heitor Lima", role: "Dev", team: true, rank: 2, score: 171, avatar: { ...randomAvatar(r, true), head: "head-boina", back: "back-jetpack", title: "t-veterano" } },
    { id: "p-iara", name: "Iara Costa", role: "Social Media", rank: 3, score: 144, avatar: { ...randomAvatar(r, true), head: "head-capacete", pet: "pet-pato", title: "t-explorador" } },
    { id: "p-teo", name: "Téo Ramos", role: "Motion", rank: 5, score: 99, avatar: randomAvatar(r, true) },
    { id: "p-sofia", name: "Sofia Melo", role: "Redatora", rank: 6, score: 81, avatar: randomAvatar(r, true) },
    { id: "p-diego", name: "Diego Nunes", role: "UX/UI", rank: 7, score: 72, avatar: randomAvatar(r, true) },
    { id: "p-gabi", name: "Gabi Rocha", role: "Atendimento", rank: 8, score: 54, avatar: randomAvatar(r, true) },
  ];
  return team.map((p) => ({ ...p, bot: true }));
}

export function generateBots(n: number, seed = 7, prefix = "bot"): Player[] {
  const r = mulberry32(seed);
  const out: Player[] = [];
  for (let k = 0; k < Math.min(n, 1000); k++) {
    out.push({
      id: `${prefix}-${k}`,
      name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
      role: pick(r, ROLES),
      rank: null,
      score: Math.floor(r() * 120),
      avatar: randomAvatar(r, r() < 0.4),
      bot: true,
    });
  }
  return out;
}

/** Fonte de posição de jogadores remotos (bots ou rede). */
export interface PosSource {
  get(id: string): { x: number; z: number; ry: number; walking: boolean } | undefined;
}

export interface BotState {
  x: number;
  z: number;
  ry: number;
  walking: boolean;
}

/** Simulação de movimento: anda até um alvo, espera, escolhe outro. */
export class BotSim implements PosSource {
  private s = new Map<string, BotState & { tx: number; tz: number; wait: number; speed: number }>();
  private r: () => number;
  constructor(ids: string[], seed = 99) {
    this.r = mulberry32(seed);
    for (const id of ids) {
      const [x, z] = this.randomPoint();
      this.s.set(id, { x, z, ry: this.r() * Math.PI * 2, walking: false, tx: x, tz: z, wait: this.r() * 4, speed: 2.2 + this.r() * 1.6 });
    }
  }
  private randomPoint(): [number, number] {
    const a = this.r() * Math.PI * 2;
    const d = Math.sqrt(this.r()) * (WORLD_RADIUS - 4);
    return clampToWorld(Math.cos(a) * d, Math.sin(a) * d);
  }
  /** faz um bot caminhar até perto de um ponto (ex.: do jogador) */
  approach(id: string, x: number, z: number) {
    const b = this.s.get(id);
    if (!b) return;
    const a = this.r() * Math.PI * 2;
    [b.tx, b.tz] = clampToWorld(x + Math.cos(a) * 2.2, z + Math.sin(a) * 2.2);
    b.wait = 0;
  }
  tick(dt: number) {
    for (const b of this.s.values()) {
      if (b.wait > 0) {
        b.wait -= dt;
        b.walking = false;
        if (b.wait <= 0) [b.tx, b.tz] = this.randomPoint();
        continue;
      }
      const dx = b.tx - b.x;
      const dz = b.tz - b.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) {
        b.wait = 2 + this.r() * 6;
        b.walking = false;
        continue;
      }
      const step = Math.min(d, b.speed * dt);
      const [nx, nz] = clampToWorld(b.x + (dx / d) * step, b.z + (dz / d) * step);
      if (Math.hypot(nx - b.x, nz - b.z) < step * 0.2) {
        // preso num obstáculo: escolhe outro alvo
        [b.tx, b.tz] = this.randomPoint();
      }
      b.x = nx;
      b.z = nz;
      b.ry = Math.atan2(dx, dz);
      b.walking = true;
    }
  }
  get(id: string): BotState | undefined {
    return this.s.get(id);
  }
}

export const BOT_PHRASES = [
  "Bora que bora! 🚀",
  "Job entregue! ✅",
  "Cliente aprovou de primeira 🎯",
  "Alguém viu a estrela dourada? ⭐",
  "Café no QG? ☕",
  "Do epic shit. 🪖",
  "Esse layout tá lindo 😍",
  "Brief novo na área 📋",
];
