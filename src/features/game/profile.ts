// Quem é a pessoa: perguntado antes de entrar no mundo.
import { DEFAULT_AVATAR, EMPTY_STATS, type Avatar, type GameStats } from "@/lib/game/catalog";

export const GENDERS = [
  { id: "f", label: "Mulher" },
  { id: "m", label: "Homem" },
  { id: "nb", label: "Não-binário" },
  { id: "x", label: "Prefiro não dizer" },
] as const;
export type Gender = (typeof GENDERS)[number]["id"];

export const PROFESSIONS = [
  "Designer",
  "Diretor(a) de arte",
  "Dev",
  "Marketing",
  "Social media",
  "Redator(a)",
  "Foto e vídeo",
  "Empreendedor(a)",
  "Estudante",
] as const;

export interface Profile {
  id: string;
  nick: string;
  gender: Gender;
  profession: string;
  team: boolean;
}

/** Cartão de contato que a pessoa escolhe passar na Área VIP. */
export interface Card {
  instagram: string;
  link: string;
}

export interface Contact {
  id: string;
  nick: string;
  instagram?: string;
  link?: string;
  at: number;
}

/** "@fulano" ou "instagram.com/fulano" -> "fulano" (ou "" se inválido). */
export function cleanInstagram(v: unknown): string {
  if (typeof v !== "string") return "";
  const h = v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : "";
}

/** Só aceita links http(s) curtos. */
export function cleanLink(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return "";
  let raw = v.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const out = u.toString();
    return out.length <= 120 ? out : "";
  } catch {
    return "";
  }
}

/** Tudo que fica salvo no navegador da pessoa. */
export interface Saved {
  profile: Profile | null;
  avatar: Avatar;
  seen: string[];
  stats: GameStats;
  /** marcos já visitados */
  visited: string[];
  /** pessoas com quem já interagiu (ids) */
  friends: string[];
  /** a quem já deu medalha hoje: { [id]: "AAAA-MM-DD" } */
  medalsGiven: Record<string, string>;
  card: Card;
  contacts: Contact[];
}

const STORAGE_KEY = "quartel-world:v2";

export function newId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `p-${Math.floor(Math.random() * 1e12).toString(36)}-${performance.now().toString(36)}`;
}

export function loadSaved(): Saved {
  const fallback: Saved = { profile: null, avatar: DEFAULT_AVATAR, seen: [], stats: EMPTY_STATS, visited: [], friends: [], medalsGiven: {}, card: { instagram: "", link: "" }, contacts: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<Saved>;
    return {
      profile: s.profile?.id && s.profile.nick ? s.profile : null,
      avatar: { ...DEFAULT_AVATAR, ...s.avatar },
      seen: Array.isArray(s.seen) ? s.seen : [],
      stats: { ...EMPTY_STATS, ...s.stats, rank: null },
      visited: Array.isArray(s.visited) ? s.visited : [],
      friends: Array.isArray(s.friends) ? s.friends : [],
      medalsGiven: s.medalsGiven && typeof s.medalsGiven === "object" ? s.medalsGiven : {},
      card: { instagram: cleanInstagram(s.card?.instagram), link: cleanLink(s.card?.link) },
      contacts: Array.isArray(s.contacts) ? s.contacts.slice(0, 200) : [],
    };
  } catch {
    return fallback;
  }
}

export function storeSaved(s: Saved) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* armazenamento indisponível: segue sem salvar */
  }
}

export function welcome(g: Gender) {
  return g === "f" ? "Bem-vinda" : g === "m" ? "Bem-vindo" : g === "nb" ? "Bem-vinde" : "Boas-vindas";
}

/** Cabelo inicial sugerido (a pessoa troca no editor). */
export function starterHair(g: Gender) {
  return g === "f" ? "hair-longo" : g === "m" ? "hair-curto" : "hair-coque";
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
