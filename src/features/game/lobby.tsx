"use client";

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Stats } from "@react-three/drei";
import * as THREE from "three";
import { ITEM_BY_ID } from "@/lib/game/catalog";
import { BlockAvatar, LowAvatar, type Emote, type EmoteKind } from "./block-avatar";
import { Billboards } from "./billboards";
import { BotSim, BOT_PHRASES, mulberry32, type Player, type PosSource } from "./bots";
import { BRAND, Ground, Landmarks, starShape, useCanvasTexture } from "./landmarks";
import { InputState, Lod, Mover, StarField } from "./lod";
import { isTestMode, type FlirtKind, type Net, type NetEvent, type NetStatus, type SocialKind } from "./net";
import { DJ_BEAT_MS, DJ_FX, DJ_SPOT, DJ_STALE_MS, DjBooth, type DjFx } from "./dj";
import { DJ_TRACKS, music, type DjTrack } from "./music";
import { PosterAvenue } from "./posters";
import { buyUrl, hasAffiliate } from "./affiliate-links";
import { TechStore, type StoreProduct } from "./store";
import { SupplementShop } from "./supplements";
import { COFFEE_BROWN, COFFEE_SECONDS, COFFEES, CoffeeShop, type Coffee } from "./coffee";
import { LOOVI_BLUE, LOOVI_PROMO_CODE, LOOVI_QUOTE_URL, LooviStand } from "./loovi";
import { BOUNTY, Invaders, STEAL, Swarm, WAR_EVERY_MS, warPhase, type SwarmEvent, type WarPhase } from "./war";
import { couponUrl, MAXME_COUPON, type Supplement } from "./supplements-data";
import { cleanInstagram, cleanLink, today, type Card, type Contact } from "./profile";
import { sfx, isMuted, setMuted } from "./sfx";
import { clampToWorld, inVip, LANDMARKS, OBSTACLES, SPAWN, VIP, VISIT_MARGIN, WORLD_RADIUS, WORLD_SCALE as S, zoneAt } from "./world";

export type GameEvent =
  | { t: "star"; value: number; gold?: boolean; legendary?: boolean; supreme?: boolean }
  | { t: "received"; kind: SocialKind; from: string }
  | { t: "given"; kind: SocialKind; to: string }
  | { t: "visit"; id: string }
  | { t: "party" }
  | { t: "contact-given"; to: string }
  | { t: "contact-received"; contact: Contact }
  | { t: "defend" }
  | { t: "stolen"; amount: number }
  | { t: "coffee"; cost: number };

const FLIRT: Record<FlirtKind, { label: string; icon: string; sent: string; got: string }> = {
  wink: { label: "Piscadinha", icon: "😉", sent: "deu uma piscadinha para", got: "te deu uma piscadinha" },
  rose: { label: "Rosa", icon: "🌹", sent: "mandou uma rosa para", got: "te mandou uma rosa" },
  coffee: { label: "Café?", icon: "☕", sent: "convidou para um café", got: "te convidou pra um café" },
};

const SOCIAL: Record<SocialKind, { label: string; icon: string; verb: string; got: string; emote: EmoteKind }> = {
  clap: { label: "Aplaudir", icon: "👏", verb: "aplaudiu", got: "te aplaudiu", emote: "clap" },
  salute: { label: "Continência", icon: "🫡", verb: "bateu continência para", got: "bateu continência pra você", emote: "salute" },
  heart: { label: "Coração", icon: "❤️", verb: "mandou um coração para", got: "te mandou um coração", emote: "heart" },
  medal: { label: "Medalha", icon: "🎖️", verb: "condecorou", got: "te deu uma MEDALHA", emote: "salute" },
};

const EMOTES: { kind: EmoteKind; icon: string; label: string }[] = [
  { kind: "wave", icon: "👋", label: "Acenar" },
  { kind: "salute", icon: "🫡", label: "Continência" },
  { kind: "dance", icon: "🕺", label: "Dançar" },
  { kind: "clap", icon: "👏", label: "Aplaudir" },
  { kind: "heart", icon: "❤️", label: "Coração" },
];

const MY_PHRASES = [
  "Oi, tropa! 👋",
  "Bora pra pista de dança? 🕺",
  "Achei uma estrela dourada! ⭐",
  "Corre que a lendária apareceu! ⚡",
  "Que mundo incrível 😍",
  "Me segue! 🏃",
  "Do epic shit. 🪖",
  "Valeu! 🙌",
];

/** Constante estável: array inline causa remount das etiquetas. */
const LABEL_Z: [number, number] = [16, 0];
const SPEED = 9;
const RUN = 14;
const LEGEND_MS = 180_000;
const LEGEND_VISIBLE_MS = 150_000;
/** Estrela Suprema: a cada 12 min, fica 90s, deslocada 100s para não coincidir com a lendária */
const SUPREME_MS = 720_000;
const SUPREME_VISIBLE_MS = 90_000;
const SUPREME_OFFSET_MS = 100_000;
const SUPREME_VALUE = 50;
const RAINBOW = ["#FF5A00", "#B26BFF", "#0050FF", "#00EBA8"];

const nowS = () => performance.now() / 1000;

/** Golpe entre avatares: alcance, intervalo entre golpes e pontos perdidos por pancada. */
const HIT_RANGE = 3.2;
const HIT_COOLDOWN_MS = 600;
const HIT_LOSS = 1;

/** Todo link externo abre em nova aba (nunca troca a página do jogo). */
function openExternal(e: React.MouseEvent, url: string) {
  e.preventDefault();
  window.open(url, "_blank", "noopener,noreferrer");
}

function omit<T>(rec: Record<string, T>, key: string): Record<string, T> {
  const out = { ...rec };
  delete out[key];
  return out;
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function nearestLandmark(x: number, z: number) {
  let best: (typeof LANDMARKS)[number] = LANDMARKS[0];
  let bd = Infinity;
  for (const l of LANDMARKS) {
    const d = Math.hypot(l.x - x, l.z - z);
    if (d < bd) {
      bd = d;
      best = l;
    }
  }
  return best;
}

// ---------------------------------------------------------------- estado fora do React
/** Estrela especial (lendária / suprema): aparece no mesmo lugar e hora para todo mundo (sem servidor). */
class Legend {
  private taken = new Set<number>();
  constructor(
    private period = LEGEND_MS,
    private visibleMs = LEGEND_VISIBLE_MS,
    private salt = 13,
    private offset = 0,
  ) {}
  slot(now = Date.now()) {
    return Math.floor((now - this.offset) / this.period);
  }
  visible(now = Date.now()) {
    const s = this.slot(now);
    return now - this.offset - s * this.period < this.visibleMs && !this.taken.has(s);
  }
  take(slot: number) {
    this.taken.add(slot);
  }
  position(slot: number) {
    const r = mulberry32(slot * 977 + this.salt);
    for (let k = 0; k < 20; k++) {
      const a = r() * Math.PI * 2;
      const d = 12 + r() * (WORLD_RADIUS - 18);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (OBSTACLES.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + 3) && Math.hypot(VIP.x - x, VIP.z - z) > VIP.r + 3) return { x, z };
    }
    return { x: 0, z: 0 };
  }
}

/** Quem dançou quando (para a "Festa no QG"). */
class DanceLog {
  private at = new Map<string, number>();
  private lastParty = -999;
  mark(id: string) {
    this.at.set(id, nowS());
  }
  /** pessoas dançando perto de (x,z) nos últimos 4s */
  countNear(x: number, z: number, src: PosSource, meId: string) {
    const t = nowS();
    let n = 0;
    for (const [id, when] of this.at) {
      if (id === meId || t - when > 4) continue;
      const p = src.get(id);
      if (p && Math.hypot(p.x - x, p.z - z) < 9) n++;
    }
    return n;
  }
  tryParty() {
    const t = nowS();
    if (t - this.lastParty < 60) return false;
    this.lastParty = t;
    return true;
  }
}

class VisitTracker {
  private done: Set<string>;
  constructor(initial: string[]) {
    this.done = new Set(initial);
  }
  check(x: number, z: number): string | null {
    for (const l of LANDMARKS) {
      if (this.done.has(l.id)) continue;
      if (Math.hypot(l.x - x, l.z - z) < l.r + (l.id === "vip" ? -0.5 : VISIT_MARGIN)) {
        this.done.add(l.id);
        return l.id;
      }
    }
    return null;
  }
}

/** Quem pode passar pela corda de veludo da Área VIP. */
class VipGate {
  allowed = false;
  set(v: boolean) {
    this.allowed = v;
  }
}

class Zoom {
  private v = 1;
  get() {
    return this.v;
  }
  add(d: number) {
    this.v = Math.min(2.4, Math.max(0.55, this.v + d));
  }
}

// ---------------------------------------------------------------- etiquetas
function NameTag({ name, titleId, me, rank, team }: { name: string; titleId: string; me?: boolean; rank?: number | null; team?: boolean }) {
  const title = ITEM_BY_ID[titleId]?.name;
  const legendary = ITEM_BY_ID[titleId]?.rarity === "lendario";
  return (
    <Html position={[0, 3.05, 0]} center zIndexRange={LABEL_Z} style={{ pointerEvents: "none" }}>
      <div className="flex -translate-y-1/2 select-none flex-col items-center whitespace-nowrap font-game compact:opacity-90">
        {team && (
          <span className="mb-0.5 rounded-md border-2 border-[#00EBA8] bg-black px-1.5 text-[9px] font-bold leading-4 tracking-wider text-[#00EBA8] compact:hidden">★ EQUIPE QUARTEL</span>
        )}
        {title && (
          <span className={`rounded-md px-1.5 text-[10px] font-bold leading-4 compact:hidden ${legendary ? "bg-[#00EBA8] text-black" : "bg-black/70 text-[#00EBA8]"}`}>{title}</span>
        )}
        <span
          className={`mt-0.5 rounded-md border-2 px-1.5 text-[12px] font-bold leading-5 compact:border compact:px-1 compact:text-[9px] compact:leading-[14px] ${
            me ? "border-black bg-[#00EBA8] text-black" : team ? "border-[#00EBA8] bg-black text-white" : "border-black bg-white text-black"
          }`}
        >
          {rank && rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] + " " : ""}
          {team ? <span className="hidden compact:inline">★ </span> : null}
          {name}
        </span>
      </div>
    </Html>
  );
}

function Bubble({ text }: { text: string }) {
  return (
    <Html position={[0, 3.9, 0]} center zIndexRange={LABEL_Z} style={{ pointerEvents: "none" }}>
      <div className="relative max-w-[180px] animate-[pop_.25s_ease-out] rounded-xl border-[3px] border-black bg-white px-2.5 py-1 text-center font-game text-[13px] font-bold text-black shadow-[3px_3px_0_#0a0a0a]">
        {text}
        <div className="absolute -bottom-[9px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-black bg-white" />
      </div>
    </Html>
  );
}

// ---------------------------------------------------------------- jogador local
const LocalPlayer = memo(function LocalPlayer({ me, input, mover, gate, emote, bubble }: { me: Player; input: InputState; mover: Mover; gate: VipGate; emote: Emote | null; bubble?: string }) {
  const g = useRef<THREE.Group>(null);
  const getWalking = useCallback(() => mover.walking, [mover]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const i = input.read();
    const moving = Math.hypot(i.x, i.z) > 0.05;
    let { x, z, ry } = mover;
    if (moving) {
      const sp = (input.running() ? RUN : SPEED) * mover.speedFactor();
      [x, z] = clampToWorld(x + i.x * sp * dt, z + i.z * sp * dt, gate.allowed);
      ry = lerpAngle(ry, Math.atan2(i.x, i.z), 1 - Math.pow(0.0005, dt));
    }
    mover.set(x, z, ry, moving);
    if (g.current) {
      g.current.position.set(x, 0, z);
      g.current.rotation.y = ry;
    }
  });
  return (
    <group ref={g} position={[mover.x, 0, mover.z]}>
      <BlockAvatar avatar={me.avatar} getWalking={getWalking} emote={emote} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshBasicMaterial color={BRAND.mint} transparent opacity={0.85} />
      </mesh>
      <NameTag name={me.name} titleId={me.avatar.title} me rank={me.rank} team={me.team} />
      {bubble && <Bubble text={bubble} />}
    </group>
  );
});

/** Envia a posição do jogador local pela rede. */
function NetSync({ net, mover }: { net: Net; mover: Mover }) {
  const acc = useRef(0);
  const beat = useRef(0);
  const was = useRef(false);
  useFrame((_, dt) => {
    acc.current += dt;
    beat.current += dt;
    const rate = net.moveRate();
    if (mover.walking) {
      if (acc.current >= 1 / rate) {
        acc.current = 0;
        beat.current = 0;
        net.sendMove(mover.x, mover.z, mover.ry, true);
      }
    } else if (was.current || beat.current > 3) {
      beat.current = 0;
      net.sendMove(mover.x, mover.z, mover.ry, false);
    }
    was.current = mover.walking;
  });
  return null;
}

// ---------------------------------------------------------------- jogadores remotos
const RemotePlayer = memo(function RemotePlayer({
  player,
  source,
  lod,
  emote,
  bubble,
  selected,
  onSelect,
}: {
  player: Player;
  source: PosSource;
  lod: Lod;
  emote: Emote | null;
  bubble?: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const g = useRef<THREE.Group>(null);
  const cur = useRef<{ x: number; z: number; ry: number } | null>(null);
  const walking = useRef(false);
  const [near, setNear] = useState(true);
  const getWalking = useCallback(() => walking.current, []);

  useEffect(() => {
    lod.register(player.id, () => cur.current ?? { x: 9999, z: 9999 });
    return () => lod.unregister(player.id);
  }, [lod, player.id]);

  useFrame(() => {
    const s = source.get(player.id);
    if (!g.current) return;
    if (!s) {
      g.current.visible = false;
      return;
    }
    g.current.visible = true;
    if (!cur.current) cur.current = { x: s.x, z: s.z, ry: s.ry };
    const c = cur.current;
    c.x += (s.x - c.x) * 0.2;
    c.z += (s.z - c.z) * 0.2;
    c.ry = lerpAngle(c.ry, s.ry, 0.2);
    walking.current = s.walking || Math.hypot(s.x - c.x, s.z - c.z) > 0.15;
    g.current.position.set(c.x, 0, c.z);
    g.current.rotation.y = c.ry;
    const n = lod.isNear(player.id);
    if (n !== near) setNear(n);
  });

  const click = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(player.id);
    },
    [onSelect, player.id],
  );

  return (
    <group ref={g} visible={false}>
      {near ? (
        <>
          <BlockAvatar avatar={player.avatar} getWalking={getWalking} emote={emote} onClick={click} />
          <NameTag name={player.name} titleId={player.avatar.title} rank={player.rank} team={player.team} />
          {bubble && <Bubble text={bubble} />}
        </>
      ) : (
        <LowAvatar avatar={player.avatar} onClick={click} />
      )}
      {(selected || player.team) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.8, selected ? 1.05 : 0.92, 32]} />
          <meshBasicMaterial color={selected ? "#ffffff" : BRAND.mint} />
        </mesh>
      )}
    </group>
  );
});

// ---------------------------------------------------------------- pódio ao vivo
function Podium({ top3 }: { top3: Player[] }) {
  const sign = useCanvasTexture({
    width: 1024,
    height: 160,
    bg: BRAND.black,
    draw: (g, f) => {
      g.fillStyle = BRAND.mint;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `92px ${f.display}`;
      g.fillText("TOP 3 AO VIVO", 512, 86);
    },
  });
  const steps = [
    { place: 2, x: -2.5, h: 1.4, c: "#C9CED6" },
    { place: 1, x: 0, h: 2.2, c: BRAND.gold },
    { place: 3, x: 2.5, h: 0.9, c: "#C9834B" },
  ];
  const noop = useCallback(() => false, []);
  return (
    <group position={[0, 0, 9 * S]}>
      {steps.map((st) => {
        const p = top3[st.place - 1];
        return (
          <group key={st.place} position={[st.x, 0, 0]}>
            <mesh position={[0, st.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.5, st.h, 2.5]} />
              <meshStandardMaterial color={st.c} metalness={0.3} roughness={0.5} />
            </mesh>
            <PlaceNumber n={st.place} y={st.h / 2} />
            {p && (
              <group position={[0, st.h, 0.1]}>
                <BlockAvatar avatar={p.avatar} getWalking={noop} pose="victory" />
                <NameTag name={p.name} titleId={p.avatar.title} rank={st.place} team={p.team} />
              </group>
            )}
          </group>
        );
      })}
      <mesh position={[0, 0.5, -1.7]}>
        <boxGeometry args={[8, 1, 0.3]} />
        <meshStandardMaterial color={BRAND.black} />
      </mesh>
      {sign && (
        <mesh position={[0, 0.5, -1.54]}>
          <planeGeometry args={[7.6, 0.9]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function PlaceNumber({ n, y }: { n: number; y: number }) {
  const tex = useCanvasTexture({
    width: 128,
    height: 128,
    bg: BRAND.black,
    draw: (g, f) => {
      g.fillStyle = BRAND.mint;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `100px ${f.display}`;
      g.fillText(String(n), 64, 70);
    },
  });
  if (!tex) return null;
  return (
    <mesh position={[0, y, 1.27]}>
      <planeGeometry args={[0.85, 0.85]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------- estrelas (compartilhadas)
interface StarSpot {
  x: number;
  z: number;
  value: 1 | 2 | 5;
  respawn: number;
}

function makeStarSpots(): StarSpot[] {
  const r = mulberry32(2026);
  const values: (1 | 2 | 5)[] = [...Array(40).fill(1), ...Array(12).fill(2), 5, 5, 5, 5, 5, 5];
  for (let k = values.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1));
    [values[k], values[j]] = [values[j], values[k]];
  }
  return values.map((value, k) => {
    const a = (k / values.length) * Math.PI * 2 * 3 + r() * 0.4;
    const d = 8 + r() * (WORLD_RADIUS - 13);
    // estrelas ficam fora da Área VIP para todo mundo poder pegar
    const [x, z] = clampToWorld(Math.cos(a) * d, Math.sin(a) * d, false);
    return { x, z, value, respawn: value === 1 ? 25 : value === 2 ? 40 : 75 };
  });
}
const STAR_SPOTS = makeStarSpots();
const STAR_COLOR = { 1: "#D9822B", 2: "#E8EDF2", 5: BRAND.gold } as const;
const STAR_SHAPE = starShape();

function Collectibles({ field, mover, onCollect }: { field: StarField; mover: Mover; onCollect: (i: number) => void }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const now = nowS();
    STAR_SPOTS.forEach((s, i) => {
      const g = groups.current[i];
      if (!g) return;
      const taken = field.isTaken(i, now);
      g.visible = !taken;
      if (taken) return;
      const star = g.children[0];
      star.rotation.y = t * 2 + i;
      star.position.y = 1.1 + Math.sin(t * 2.5 + i) * 0.15;
      if (s.value === 5) star.scale.setScalar(0.55 + Math.sin(t * 6) * 0.06);
      if (Math.hypot(mover.x - s.x, mover.z - s.z) < 1.4) {
        field.take(i, now + s.respawn);
        onCollect(i);
      }
    });
  });
  return (
    <>
      {STAR_SPOTS.map((s, i) => {
        const c = STAR_COLOR[s.value];
        return (
          <group
            key={i}
            position={[s.x, 0, s.z]}
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            <mesh scale={s.value === 1 ? 0.4 : 0.5} castShadow>
              <extrudeGeometry args={[STAR_SHAPE, { depth: 0.35, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 }]} />
              <meshStandardMaterial color={c} metalness={0.6} roughness={0.25} emissive={c} emissiveIntensity={s.value === 5 ? 0.6 : 0.25} />
            </mesh>
            {s.value >= 2 && (
              <>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                  <ringGeometry args={[0.7, 0.9, 32]} />
                  <meshBasicMaterial color={c} transparent opacity={0.7} toneMapped={false} />
                </mesh>
                <mesh position={[0, s.value === 5 ? 4 : 1.6, 0]}>
                  <cylinderGeometry args={[0.18, 0.35, s.value === 5 ? 8 : 3.2, 12, 1, true]} />
                  <meshBasicMaterial color={c} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
                </mesh>
              </>
            )}
            {s.value === 5 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[1.1, 1.25, 32]} />
                <meshBasicMaterial color={c} transparent opacity={0.5} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function LegendStar({ legend, mover, onTake }: { legend: Legend; mover: Mover; onTake: (slot: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const star = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    const now = Date.now();
    const vis = legend.visible(now);
    grp.visible = vis;
    if (!vis) return;
    const slot = legend.slot(now);
    const p = legend.position(slot);
    grp.position.set(p.x, 0, p.z);
    const t = clock.elapsedTime;
    if (star.current) {
      star.current.rotation.y = t * 3;
      star.current.position.y = 1.6 + Math.sin(t * 3) * 0.25;
    }
    if (ring.current) ring.current.scale.setScalar(1 + (t % 1.2) * 1.5);
    if (Math.hypot(mover.x - p.x, mover.z - p.z) < 1.8) {
      legend.take(slot);
      onTake(slot);
    }
  });
  return (
    <group ref={g} visible={false}>
      <mesh ref={star} scale={0.9}>
        <extrudeGeometry args={[STAR_SHAPE, { depth: 0.4, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 1 }]} />
        <meshStandardMaterial color="#B26BFF" emissive="#B26BFF" emissiveIntensity={0.9} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 15, 0]}>
        <cylinderGeometry args={[0.4, 0.8, 30, 16, 1, true]} />
        <meshBasicMaterial color="#B26BFF" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.2, 1.4, 40]} />
        <meshBasicMaterial color="#B26BFF" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2, 0]} color="#B26BFF" intensity={15} distance={10} />
    </group>
  );
}

/** Estrela Suprema: prisma com o gradiente da marca, feixe tricolor gigante. */
function SupremeStar({ legend, mover, onTake }: { legend: Legend; mover: Mover; onTake: (slot: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const star = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const rings = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Color(), []);
  const cols = useMemo(() => RAINBOW.map((c) => new THREE.Color(c)), []);
  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    const now = Date.now();
    const vis = legend.visible(now);
    grp.visible = vis;
    if (!vis) return;
    const slot = legend.slot(now);
    const p = legend.position(slot);
    grp.position.set(p.x, 0, p.z);
    const t = clock.elapsedTime;
    // cor passeando pelo gradiente da marca
    const f = (t * 0.6) % cols.length;
    tmp.copy(cols[Math.floor(f)]).lerp(cols[(Math.floor(f) + 1) % cols.length], f % 1);
    if (star.current) {
      star.current.rotation.y = t * 4;
      star.current.position.y = 2 + Math.sin(t * 3) * 0.3;
      const m = star.current.material as THREE.MeshStandardMaterial;
      m.color.copy(tmp);
      m.emissive.copy(tmp);
    }
    if (halo.current) {
      halo.current.position.y = 2 + Math.sin(t * 3) * 0.3;
      halo.current.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
      (halo.current.material as THREE.MeshBasicMaterial).color.copy(tmp);
    }
    rings.current?.children.forEach((r, k) => {
      const e = (t * 0.9 + k / 3) % 1;
      r.scale.setScalar(1 + e * 3);
      ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - e);
    });
    if (Math.hypot(mover.x - p.x, mover.z - p.z) < 2) {
      legend.take(slot);
      onTake(slot);
    }
  });
  return (
    <group ref={g} visible={false}>
      <mesh ref={star} scale={1.25}>
        <extrudeGeometry args={[STAR_SHAPE, { depth: 0.5, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }]} />
        <meshStandardMaterial color="#00EBA8" emissive="#00EBA8" emissiveIntensity={1.1} metalness={0.7} roughness={0.15} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[1.9, 24, 16]} />
        <meshBasicMaterial color="#00EBA8" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>
      {RAINBOW.slice(0, 3).map((c, k) => (
        <mesh key={c} position={[0, 20 + k * 0.01, 0]}>
          <cylinderGeometry args={[0.5 + k * 0.35, 1 + k * 0.5, 40, 20, 1, true]} />
          <meshBasicMaterial color={c} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <group ref={rings}>
        {RAINBOW.slice(0, 3).map((c) => (
          <mesh key={c} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
            <ringGeometry args={[1.3, 1.55, 48]} />
            <meshBasicMaterial color={c} transparent opacity={0.7} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 2.5, 0]} color="#FFFFFF" intensity={25} distance={14} />
    </group>
  );
}

// ---------------------------------------------------------------- efeitos de coleta
interface Burst {
  id: number;
  x: number;
  z: number;
  label: string;
}
const CONFETTI = [BRAND.mint, BRAND.orange, BRAND.cream, BRAND.olive, BRAND.black];

function BurstFx({ b, onDone }: { b: Burst; onDone: (id: number) => void }) {
  const start = useRef(-1);
  const done = useRef(false);
  const cubes = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const label = useRef<THREE.Group>(null);
  const vel = useMemo(() => {
    const r = mulberry32(b.id * 31 + 7);
    return Array.from({ length: 18 }, () => ({ vx: (r() - 0.5) * 6, vy: 4 + r() * 5, vz: (r() - 0.5) * 6, c: CONFETTI[Math.floor(r() * CONFETTI.length)] }));
  }, [b.id]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (start.current < 0) start.current = t;
    const et = t - start.current;
    cubes.current?.children.forEach((m, k) => {
      const v = vel[k];
      m.position.set(v.vx * et, 1 + v.vy * et - 9 * et * et, v.vz * et);
      m.rotation.set(et * 8 + k, et * 6, 0);
    });
    if (ring.current) {
      ring.current.scale.setScalar(1 + et * 4);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - et * 1.2);
    }
    if (label.current) label.current.position.y = 2 + et * 1.6;
    if (et > 1.3 && !done.current) {
      done.current = true;
      onDone(b.id);
    }
  });
  return (
    <group position={[b.x, 0, b.z]}>
      <group ref={cubes}>
        {vel.map((v, k) => (
          <mesh key={k}>
            <boxGeometry args={[0.16, 0.16, 0.16]} />
            <meshBasicMaterial color={v.c} />
          </mesh>
        ))}
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial color={BRAND.mint} transparent opacity={0.9} />
      </mesh>
      <group ref={label}>
        <Html center zIndexRange={LABEL_Z} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap font-display text-3xl text-[#00EBA8] [text-shadow:3px_3px_0_#0a0a0a]">{b.label}</div>
        </Html>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- câmera, LOD, check-in
function CameraRig({ mover, lod, zoom }: { mover: Mover; lod: Lod; zoom: Zoom }) {
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }, dt) => {
    const z = zoom.get();
    const k = 1 - Math.pow(0.002, dt);
    camera.position.x += (mover.x - camera.position.x) * k;
    camera.position.y += (11 * z - camera.position.y) * k;
    camera.position.z += (mover.z + 10.5 * z - camera.position.z) * k;
    look.set(mover.x, 1.4, mover.z);
    camera.lookAt(look);
    lod.tick(dt, mover.x, mover.z);
  });
  return null;
}

function VisitWatcher({ visits, mover, onVisit }: { visits: VisitTracker; mover: Mover; onVisit: (id: string) => void }) {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.4) return;
    acc.current = 0;
    const id = visits.check(mover.x, mover.z);
    if (id) onVisit(id);
  });
  return null;
}

function ZoneWatcher({ mover, gate, onZone, onDenied }: { mover: Mover; gate: VipGate; onZone: (z: "world" | "dance" | "vip") => void; onDenied: () => void }) {
  const acc = useRef(0);
  const last = useRef<string>("world");
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.3) return;
    acc.current = 0;
    const z = zoneAt(mover.x, mover.z);
    if (z !== last.current) {
      last.current = z;
      onZone(z);
    }
    if (!gate.allowed && Math.hypot(mover.x - VIP.x, mover.z - VIP.z) < VIP.r + 1.2) onDenied();
  });
  return null;
}

function SimTicker({ sim }: { sim: BotSim }) {
  useFrame((_, dt) => sim.tick(Math.min(dt, 0.05)));
  return null;
}

// ---------------------------------------------------------------- compartilhar
const SHARE_TEXT = "🎮 O QG da Quartel virou um game! Entra no Quartel World, cria seu soldado, pega estrelas e defende o QG das invasões:";

function ShareMenu({ onCopied }: { onCopied: () => void }) {
  const [open, setOpen] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "https://quartel-world.vercel.app";
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const whats = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${url}`)}`;
  return (
    <div className="pointer-events-auto absolute right-[8.4rem] top-3 compact:right-[5.6rem] compact:top-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border-[3px] border-black bg-[#00EBA8] px-3 py-1 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:border-2 compact:px-2 compact:py-0 compact:shadow-none"
      >
        📤<span className="compact:hidden"> Compartilhar</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-64 rounded-2xl border-[3px] border-black bg-white p-2 shadow-[4px_4px_0_#0a0a0a]">
          <div className="px-2 pb-1 pt-1 text-xs font-bold text-black/50">Chame a tropa pro Quartel World</div>
          <a
            href={whats}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.open(whats, "_blank", "noopener,noreferrer");
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold hover:bg-[#25D366]/15"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-lg text-white">✆</span>
            Enviar no WhatsApp
          </a>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
              } catch {
                window.prompt("Copie o link do Quartel World:", url);
              }
              sfx.pop();
              onCopied();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-bold hover:bg-[#00EBA8]/20"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">🔗</span>
            Copiar link do jogo
          </button>
          {canNative && (
            <button
              onClick={() => {
                void navigator.share({ title: "Quartel World", text: SHARE_TEXT, url }).catch(() => {});
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-bold hover:bg-black/5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0050FF] text-white">↗</span>
              Mais opções…
            </button>
          )}
          <div className="truncate px-2 pt-1 text-[11px] font-semibold text-black/40">{url.replace(/^https?:\/\//, "")}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- joystick
function Joystick({ input }: { input: InputState }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setKnob({ x: dx, y: dy });
    input.setJoystick(dx, dy);
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    input.setJoystick(0, 0);
  };
  return (
    <div
      ref={base}
      className="pointer-events-auto absolute bottom-24 left-5 z-20 h-32 w-32 touch-none rounded-full border-4 border-black bg-white/40 shadow-[4px_4px_0_#0a0a0a] backdrop-blur-sm pointer-fine:hidden compact:bottom-4 compact:left-4 compact:h-24 compact:w-24 compact:border-[3px] compact:shadow-none"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.buttons && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-4 border-black bg-[#00EBA8]"
        style={{ transform: `translate(calc(-50% + ${knob.x * 36}px), calc(-50% + ${knob.y * 36}px))` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Lobby
export interface LobbyProps {
  me: Player;
  others: Player[];
  source: PosSource;
  net: Net | null;
  sim: BotSim | null;
  ranking: Player[];
  visited: string[];
  medalsGiven: Record<string, string>;
  vipAllowed: boolean;
  card: Card;
  contacts: Contact[];
  onCard: (c: Card) => void;
  status: NetStatus | "demo";
  active: boolean;
  /** modal aberto: o mundo continua desenhando, mas sem controle */
  paused?: boolean;
  showStats: boolean;
  onGame: (e: GameEvent) => void;
}

interface FeedItem {
  id: number;
  text: string;
  tone?: "gold" | "purple" | "rainbow";
}

export default function Lobby({ me, others, source, net, sim, ranking, visited, medalsGiven, vipAllowed, card, contacts, onCard, status, active, paused = false, showStats, onGame }: LobbyProps) {
  const [input] = useState(() => new InputState());
  const [mover] = useState(() => new Mover(SPAWN.x, SPAWN.z, SPAWN.ry));
  const [lod] = useState(() => new Lod(30));
  const [field] = useState(() => new StarField(STAR_SPOTS.length));
  const [zoom] = useState(() => new Zoom());
  const [legend] = useState(() => new Legend());
  // ?suprema na URL: Estrela Suprema a cada 1 minuto (para testar)
  const [supreme] = useState(() =>
    new URLSearchParams(window.location.search).has("suprema")
      ? new Legend(60_000, 50_000, 7919, 0)
      : new Legend(SUPREME_MS, SUPREME_VISIBLE_MS, 7919, SUPREME_OFFSET_MS),
  );
  const [dances] = useState(() => new DanceLog());
  const [visits] = useState(() => new VisitTracker(visited));
  const [gate] = useState(() => new VipGate());
  const [zone, setZone] = useState<"world" | "dance" | "vip">("world");
  const [musicOff, setMusicOff] = useState(music.isMuted());
  const [contactsOpen, setContactsOpen] = useState(false);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [supplement, setSupplement] = useState<Supplement | null>(null);
  const [looviOpen, setLooviOpen] = useState(false);
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const [swarm] = useState(() => new Swarm());
  // ?guerra na URL: invasão a cada 1 minuto (para testar)
  const [warEvery] = useState(() => (new URLSearchParams(window.location.search).has("guerra") ? 60_000 : WAR_EVERY_MS));
  const [war, setWar] = useState<WarPhase>(() => warPhase(Date.now(), warEvery));
  const [wave, setWave] = useState({ hit: 0, lost: 0 });
  const waveRef = useRef({ hit: 0, lost: 0 });
  const deniedAt = useRef(0);

  useEffect(() => {
    gate.set(vipAllowed);
  }, [gate, vipAllowed]);

  const [emotes, setEmotes] = useState<Record<string, Emote>>({});
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(() => !window.matchMedia("(max-width: 767px), (max-height: 520px)").matches);
  const [zoomUi, setZoomUi] = useState(1);
  const pinch = useRef<number | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const nonce = useRef(0);
  const hitGate = useRef(new Map<string, number>());
  const [dj, setDj] = useState<{ id: string; nick: string; track: DjTrack } | null>(null);
  const djSeen = useRef(0);
  const djFxAt = useRef(0);
  const zoneRef = useRef<"world" | "dance" | "vip">("world");
  const lastStrike = useRef(0);
  const lastMiss = useRef(0);

  // Cards abrem um instante depois do clique no 3D: senão o mesmo clique
  // "atravessa" e aperta o botão do card que acabou de aparecer sob o cursor.
  const selectLater = useCallback((id: string) => {
    setTimeout(() => {
      setProduct(null);
      setSupplement(null);
      setLooviOpen(false);
      setCoffeeOpen(false);
      setSelected(id);
    }, 120);
  }, []);

  const byId = useMemo(() => Object.fromEntries(others.map((p) => [p.id, p])), [others]);

  const pushFeed = useCallback((text: string, tone?: FeedItem["tone"]) => {
    const id = ++nonce.current;
    setFeed((f) => [...f.slice(-4), { id, text, tone }]);
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 6500);
  }, []);

  const showEmote = useCallback((who: string, kind: EmoteKind) => {
    const n = ++nonce.current;
    setEmotes((e) => ({ ...e, [who]: { kind, nonce: n } }));
    setTimeout(() => setEmotes((e) => (e[who]?.nonce === n ? omit(e, who) : e)), 2600);
  }, []);

  const showBubble = useCallback((who: string, text: string, ms = 4000) => {
    setBubbles((b) => ({ ...b, [who]: text }));
    setTimeout(() => setBubbles((b) => (b[who] === text ? omit(b, who) : b)), ms);
  }, []);

  const burst = useCallback((x: number, z: number, label: string) => {
    const id = ++nonce.current;
    setBursts((b) => [...b, { id, x, z, label }]);
  }, []);

  // ---------- eventos que chegam (rede ou bots)
  const handleEvent = useCallback(
    (e: NetEvent) => {
      switch (e.t) {
        case "emote":
          if (e.kind === "dance") dances.mark(e.id);
          showEmote(e.id, e.kind as EmoteKind);
          break;
        case "say":
          showBubble(e.id, String(e.text).slice(0, 60));
          break;
        case "interact": {
          const s = SOCIAL[e.kind];
          if (!s) break;
          showEmote(e.from, s.emote);
          showBubble(e.to, s.icon, 2200);
          if (e.to === me.id) {
            (e.kind === "clap" ? sfx.clap : e.kind === "heart" ? sfx.heart : sfx.salute)();
            pushFeed(`${String(e.fromNick).slice(0, 20)} ${s.got} ${s.icon}`, e.kind === "medal" ? "gold" : undefined);
            // bots animam o mundo, mas não dão pontos
            if (!byId[e.from]?.bot) onGame({ t: "received", kind: e.kind, from: e.from });
          }
          break;
        }
        case "star":
          if (STAR_SPOTS[e.i]) field.take(e.i, nowS() + Math.min(75, e.ttl));
          break;
        case "legend":
          if (e.kind === "supreme") {
            supreme.take(e.slot);
            pushFeed(`🌈 ${String(e.nick).slice(0, 20)} pegou a ESTRELA SUPREMA!`, "rainbow");
          } else {
            legend.take(e.slot);
            pushFeed(`⚡ ${String(e.nick).slice(0, 20)} pegou a estrela lendária!`, "purple");
          }
          break;
        case "dj": {
          const track = DJ_TRACKS.find((x) => x.id === e.track)?.id;
          if (!track) break;
          setDj((cur) => {
            // cabine ocupada: fica quem já está; empate simultâneo resolve pelo id (igual para todos)
            const free = !cur || cur.id === e.id || Date.now() - djSeen.current > DJ_STALE_MS || e.id < cur.id;
            if (!free) return cur;
            djSeen.current = Date.now();
            return { id: e.id, nick: String(e.nick).slice(0, 16), track };
          });
          break;
        }
        case "dj-off":
          setDj((cur) => (cur?.id === e.id ? null : cur));
          break;
        case "dj-fx": {
          const t = Date.now();
          if (t - djFxAt.current < 200 || !DJ_FX.some((x) => x.id === e.fx)) break;
          djFxAt.current = t;
          if (zoneRef.current === "dance") sfx[e.fx as DjFx]();
          break;
        }
        case "hit": {
          showEmote(e.from, "punch");
          if (e.to !== me.id) {
            const p = source.get(e.to);
            if (p) burst(p.x, p.z, `-${HIT_LOSS}`);
            showBubble(e.to, "💥", 900);
            break;
          }
          // só vale se quem bateu existe e está mesmo perto (e no ritmo permitido)
          const attacker = source.get(e.from);
          if (!byId[e.from] || !attacker) break;
          if (zoneAt(mover.x, mover.z) !== "world" || zoneAt(attacker.x, attacker.z) !== "world") break;
          const dx = mover.x - attacker.x;
          const dz = mover.z - attacker.z;
          const d = Math.hypot(dx, dz) || 1;
          const t = Date.now();
          if (d > HIT_RANGE * 2.5 || t - (hitGate.current.get(e.from) ?? 0) < HIT_COOLDOWN_MS * 0.8) break;
          hitGate.current.set(e.from, t);
          sfx.punch();
          burst(mover.x, mover.z, `-${HIT_LOSS}`);
          showBubble(me.id, "💥", 900);
          pushFeed(`👊 ${String(e.fromNick).slice(0, 20)} te deu um golpe! -${HIT_LOSS}`);
          // empurrãozinho, visível para todo mundo
          const [nx, nz] = clampToWorld(mover.x + (dx / d) * 1.1, mover.z + (dz / d) * 1.1, gate.allowed);
          mover.set(nx, nz, mover.ry, false);
          net?.sendMove(nx, nz, mover.ry, false);
          onGame({ t: "stolen", amount: HIT_LOSS });
          break;
        }
        case "flirt": {
          const f = FLIRT[e.kind];
          if (!f) break;
          showBubble(e.to, f.icon, 2500);
          if (e.to === me.id) {
            sfx.heart();
            pushFeed(`${String(e.fromNick).slice(0, 20)} ${f.got} ${f.icon}`, "purple");
          }
          break;
        }
        case "contact": {
          if (e.to !== me.id) {
            showBubble(e.to, "📇", 2000);
            break;
          }
          const instagram = cleanInstagram(e.instagram);
          const link = cleanLink(e.link);
          if (!instagram && !link) break;
          sfx.collect2();
          const nick = String(e.fromNick).slice(0, 20);
          pushFeed(`📇 ${nick} te passou o contato! Veja em Contatos`, "gold");
          onGame({ t: "contact-received", contact: { id: e.from, nick, instagram: instagram || undefined, link: link || undefined, at: Date.now() } });
          break;
        }
      }
    },
    [burst, byId, dances, field, gate, hitGate, legend, supreme, me.id, mover, net, onGame, pushFeed, showBubble, showEmote, source],
  );

  useEffect(() => {
    if (!net) return;
    return net.listen({ event: handleEvent });
  }, [net, handleEvent]);

  // ---------- ações do jogador
  const doEmote = useCallback(
    (kind: EmoteKind) => {
      showEmote(me.id, kind);
      net?.send({ t: "emote", id: me.id, kind });
      sfx.pop();
      if (kind === "dance") {
        dances.mark(me.id);
        // dá um tempinho para os outros dançarem junto
        setTimeout(() => {
          if (dances.countNear(mover.x, mover.z, source, me.id) >= 2 && dances.tryParty()) {
            sfx.unlock();
            burst(mover.x, mover.z, "FESTA! +10");
            pushFeed("🎉 Festa no QG! +10", "gold");
            onGame({ t: "party" });
          }
        }, 1500);
      }
    },
    [burst, dances, me.id, mover, net, onGame, pushFeed, showEmote, source],
  );

  const buyCoffee = (c: Coffee) => {
    if (me.score < c.cost) return;
    onGame({ t: "coffee", cost: c.cost });
    mover.boost(COFFEE_SECONDS * 1000, c.speed);
    sfx.collect2();
    doSay(`${c.icon} ${c.name}!`);
    pushFeed(`${c.icon} ${c.name} por ${c.cost} pontos: ${Math.round((c.speed - 1) * 100)}% mais rápido por ${COFFEE_SECONDS}s`);
    setCoffeeOpen(false);
    setTimeout(() => {
      if (!mover.boosted()) pushFeed("☕ O efeito do café acabou");
    }, COFFEE_SECONDS * 1000 + 50);
  };

  const doSay = (text: string) => {
    showBubble(me.id, text);
    net?.send({ t: "say", id: me.id, text });
    sfx.click();
  };

  const interact = (kind: SocialKind) => {
    if (!selected) return;
    const target = byId[selected];
    if (!target) return;
    if (kind === "medal" && medalsGiven[target.id] === today()) return;
    const s = SOCIAL[kind];
    showEmote(me.id, s.emote);
    showBubble(target.id, s.icon, 2200);
    (kind === "clap" ? sfx.clap : kind === "heart" ? sfx.heart : sfx.salute)();
    pushFeed(`Você ${s.verb} ${target.name} ${s.icon}`);
    net?.send({ t: "interact", from: me.id, fromNick: me.name, to: target.id, kind });
    onGame({ t: "given", kind, to: target.id });
    if (target.bot) {
      setTimeout(() => {
        showEmote(target.id, kind === "salute" ? "salute" : "wave");
        showBubble(target.id, ["Valeu! 🙌", "Tamo junto! 🫡", "Bora! 🚀", "❤️"][Math.floor(Math.random() * 4)]);
      }, 900);
    }
  };

  const collect = useCallback(
    (i: number) => {
      const s = STAR_SPOTS[i];
      (s.value === 1 ? sfx.collect1 : s.value === 2 ? sfx.collect2 : sfx.collect5)();
      burst(s.x, s.z, `+${s.value}`);
      if (s.value === 5) pushFeed("⭐ Estrela DOURADA! +5", "gold");
      net?.send({ t: "star", i, ttl: s.respawn });
      onGame({ t: "star", value: s.value, gold: s.value === 5 });
    },
    [burst, net, onGame, pushFeed],
  );

  const takeLegend = useCallback(
    (slot: number) => {
      sfx.collect5();
      setTimeout(sfx.unlock, 350);
      const p = legend.position(slot);
      burst(p.x, p.z, "LENDÁRIA +10");
      pushFeed("⚡ Você pegou a ESTRELA LENDÁRIA! +10", "purple");
      net?.send({ t: "legend", slot, by: me.id, nick: me.name });
      onGame({ t: "star", value: 10, legendary: true });
    },
    [burst, legend, me.id, me.name, net, onGame, pushFeed],
  );

  const takeSupreme = useCallback(
    (slot: number) => {
      sfx.collect5();
      setTimeout(sfx.unlock, 300);
      setTimeout(sfx.collect5, 900);
      const p = supreme.position(slot);
      burst(p.x, p.z, `SUPREMA +${SUPREME_VALUE}`);
      burst(p.x + 1, p.z - 1, "★★★");
      pushFeed(`🌈 Você pegou a ESTRELA SUPREMA! +${SUPREME_VALUE}`, "rainbow");
      net?.send({ t: "legend", slot, by: me.id, nick: me.name, kind: "supreme" });
      onGame({ t: "star", value: SUPREME_VALUE, supreme: true });
    },
    [burst, supreme, me.id, me.name, net, onGame, pushFeed],
  );

  const visit = useCallback(
    (id: string) => {
      const l = LANDMARKS.find((x) => x.id === id);
      sfx.collect2();
      pushFeed(`📍 Você descobriu: ${l?.name ?? id} (+5)`);
      onGame({ t: "visit", id });
    },
    [onGame, pushFeed],
  );

  const onZone = useCallback((z: "world" | "dance" | "vip") => {
    setZone(z);
    zoneRef.current = z;
    music.setZone(z);
    // saiu da pista: libera a cabine (se não era o DJ, o aviso não afeta ninguém)
    if (z !== "dance") {
      setDj((cur) => (cur?.id === me.id ? null : cur));
      net?.send({ t: "dj-off", id: me.id });
    }
    if (z === "dance") pushFeed("🕺 Pista de dança! Dance com a galera ou assuma as pick-ups no fundo");
    if (z === "vip") pushFeed("🍸 Bem-vindo(a) à Área VIP · troque contatos e mande um flerte", "gold");
  }, [me.id, net, pushFeed]);

  // ---------- DJ
  const iAmDj = dj?.id === me.id;
  const claimDj = () => {
    if (dj && !iAmDj) return pushFeed(`🎧 ${dj.nick} está nas pick-ups. Espere a vez!`);
    if (zoneRef.current !== "dance") return pushFeed("🎧 Vá até a pista de dança para assumir as pick-ups");
    mover.set(DJ_SPOT.x, DJ_SPOT.z, DJ_SPOT.ry, false);
    net?.sendMove(DJ_SPOT.x, DJ_SPOT.z, DJ_SPOT.ry, false);
    const track = dj?.track ?? "house";
    djSeen.current = Date.now();
    setDj({ id: me.id, nick: me.name, track });
    net?.send({ t: "dj", id: me.id, nick: me.name, track });
    sfx.collect2();
  };
  const leaveDj = useCallback(() => {
    setDj((cur) => (cur?.id === me.id ? null : cur));
    net?.send({ t: "dj-off", id: me.id });
  }, [me.id, net]);
  const pickTrack = (track: DjTrack) => {
    setDj((cur) => (cur ? { ...cur, track } : cur));
    net?.send({ t: "dj", id: me.id, nick: me.name, track });
    showBubble(me.id, `🎵 ${DJ_TRACKS.find((x) => x.id === track)?.label}`, 2000);
    net?.send({ t: "say", id: me.id, text: `🎵 ${DJ_TRACKS.find((x) => x.id === track)?.label}` });
  };
  const playFx = useCallback(
    (fx: DjFx) => {
      const t = Date.now();
      if (t - djFxAt.current < 200) return;
      djFxAt.current = t;
      sfx[fx]();
      net?.send({ t: "dj-fx", id: me.id, fx });
    },
    [me.id, net],
  );

  // faixa da pista segue o DJ
  useEffect(() => {
    music.setDanceTrack(dj?.track ?? "house");
  }, [dj?.track]);

  // DJ avisa que continua na cabine; quem sumiu libera a cabine sozinho
  useEffect(() => {
    if (!dj) return;
    const iv = setInterval(() => {
      if (dj.id === me.id) {
        djSeen.current = Date.now();
        net?.send({ t: "dj", id: me.id, nick: me.name, track: dj.track });
      } else if (Date.now() - djSeen.current > DJ_STALE_MS) {
        setDj(null);
      }
    }, DJ_BEAT_MS);
    return () => clearInterval(iv);
  }, [dj, me.id, me.name, net]);

  const onDenied = useCallback(() => {
    const t = Date.now();
    if (t - deniedAt.current < 6000) return;
    deniedAt.current = t;
    sfx.click();
    pushFeed("🔒 Área VIP: só Tenente+ ou Equipe Quartel. Suba de patente!");
  }, [pushFeed]);

  const targetInVip = (id: string) => {
    const p = source.get(id);
    return !!p && inVip(p.x, p.z);
  };

  const flirt = (kind: FlirtKind) => {
    if (!selected) return;
    const target = byId[selected];
    if (!target) return;
    if (!targetInVip(target.id)) return pushFeed(`${target.name} precisa estar na Área VIP`);
    const f = FLIRT[kind];
    showBubble(target.id, f.icon, 2500);
    showEmote(me.id, kind === "rose" ? "heart" : "wave");
    sfx.heart();
    pushFeed(`Você ${f.sent} ${target.name} ${f.icon}`);
    net?.send({ t: "flirt", from: me.id, fromNick: me.name, to: target.id, kind });
  };

  const shareContact = () => {
    if (!selected) return;
    const target = byId[selected];
    if (!target) return;
    if (!card.instagram && !card.link) return pushFeed("Preencha seu cartão VIP (Instagram ou link) primeiro");
    if (!targetInVip(target.id)) return pushFeed(`${target.name} precisa estar na Área VIP`);
    showBubble(target.id, "📇", 2000);
    sfx.collect2();
    pushFeed(`📇 Você passou seu contato para ${target.name}`);
    net?.send({ t: "contact", from: me.id, fromNick: me.name, to: target.id, instagram: card.instagram || undefined, link: card.link || undefined });
    onGame({ t: "contact-given", to: target.id });
  };

  const onSwarm = useCallback(
    (e: SwarmEvent) => {
      if (e.kind === "hit") {
        sfx.poof();
        burst(e.x, e.z, `+${BOUNTY}`);
        waveRef.current.hit++;
        onGame({ t: "defend" });
      } else {
        sfx.steal();
        burst(e.x, e.z, `-${STEAL} 💰`);
        waveRef.current.lost += STEAL;
        onGame({ t: "stolen", amount: STEAL });
      }
      setWave({ ...waveRef.current });
    },
    [burst, onGame],
  );

  /** 👊 / F / espaço: acerta o invasor mais próximo; sem invasor, a pessoa mais próxima. */
  const strike = useCallback(() => {
    const t = Date.now();
    if (t - lastStrike.current < HIT_COOLDOWN_MS) return;
    lastStrike.current = t;
    const punch = () => {
      showEmote(me.id, "punch");
      sfx.punch();
    };
    const inv = swarm.hitNearest(mover.x, mover.z);
    if (inv) {
      punch();
      net?.send({ t: "emote", id: me.id, kind: "punch" });
      onSwarm(inv);
      return;
    }
    // Área VIP e pista de dança são zonas de paz (invasores continuam valendo)
    if (zoneAt(mover.x, mover.z) !== "world") {
      if (t - lastMiss.current > 4000) {
        lastMiss.current = t;
        pushFeed("🕊️ Zona de paz: aqui não vale golpe");
      }
      return;
    }
    let target: Player | null = null;
    let best = HIT_RANGE;
    for (const o of others) {
      const p = source.get(o.id);
      if (!p || zoneAt(p.x, p.z) !== "world") continue;
      const d = Math.hypot(p.x - mover.x, p.z - mover.z);
      if (d < best) {
        best = d;
        target = o;
      }
    }
    if (!target) {
      if (t - lastMiss.current > 4000) {
        lastMiss.current = t;
        pushFeed("👊 Chegue mais perto de alguém para dar um golpe");
      }
      return;
    }
    const p = source.get(target.id)!;
    mover.set(mover.x, mover.z, Math.atan2(p.x - mover.x, p.z - mover.z), false);
    punch();
    burst(p.x, p.z, `-${HIT_LOSS}`);
    showBubble(target.id, "💥", 900);
    net?.send({ t: "hit", from: me.id, fromNick: me.name, to: target.id });
    if (target.bot) {
      const id = target.id;
      setTimeout(() => showBubble(id, ["Ei! 😠", "Ai! 😵", "Para com isso! 😤"][Math.floor(Math.random() * 3)], 1500), 350);
    }
  }, [burst, me.id, me.name, mover, net, onSwarm, others, pushFeed, showBubble, showEmote, source, swarm]);

  // relógio da invasão (mesmo horário para todo mundo)
  useEffect(() => {
    if (!active) return;
    let last = warPhase(Date.now(), warEvery).phase;
    if (last === "war") {
      const p = warPhase(Date.now(), warEvery);
      swarm.start(p.slot, mover.x, mover.z);
      music.setOverride("war");
    }
    const iv = setInterval(() => {
      const p = warPhase(Date.now(), warEvery);
      setWar((w) => (w.phase === p.phase && Math.ceil(w.msLeft / 1000) === Math.ceil(p.msLeft / 1000) ? w : p));
      if (p.phase === last) return;
      if (p.phase === "warning") {
        sfx.siren();
        pushFeed("⚠️ INVASÃO em 10s! Clique nos invasores ou aperte ESPAÇO", "purple");
      } else if (p.phase === "war") {
        waveRef.current = { hit: 0, lost: 0 };
        setWave({ hit: 0, lost: 0 });
        swarm.start(p.slot, mover.x, mover.z);
        music.setOverride("war");
        sfx.siren();
      } else if (last === "war") {
        swarm.retreat();
        music.setOverride(null);
        const w = waveRef.current;
        sfx.unlock();
        pushFeed(`🎖️ Invasão repelida! Você abateu ${w.hit} e perdeu ${w.lost} pts`, "gold");
      }
      last = p.phase;
    }, 250);
    return () => {
      clearInterval(iv);
      music.setOverride(null);
    };
  }, [active, warEvery, swarm, mover, pushFeed]);

  const burstDone = useCallback((id: number) => setBursts((b) => b.filter((x) => x.id !== id)), []);

  // ---------- aviso da estrela lendária
  useEffect(() => {
    if (!active) return;
    let last = -1;
    const check = () => {
      const now = Date.now();
      const slot = legend.slot(now);
      if (slot !== last && legend.visible(now)) {
        if (last !== -1) {
          const p = legend.position(slot);
          pushFeed(`⚡ Estrela LENDÁRIA perto de: ${nearestLandmark(p.x, p.z).name}!`, "purple");
          sfx.collect2();
        }
        last = slot;
      } else if (last === -1) last = slot;
    };
    let lastS = -1;
    const checkSupreme = () => {
      const now = Date.now();
      const slot = supreme.slot(now);
      if (slot !== lastS && supreme.visible(now)) {
        const p = supreme.position(slot);
        pushFeed(`🌈 ESTRELA SUPREMA (+${SUPREME_VALUE}) perto de: ${nearestLandmark(p.x, p.z).name}! Corre!`, "rainbow");
        sfx.siren();
        lastS = slot;
      } else if (lastS === -1) lastS = slot;
    };
    check();
    checkSupreme();
    const iv = setInterval(() => {
      check();
      checkSupreme();
    }, 3000);
    return () => clearInterval(iv);
  }, [active, legend, supreme, pushFeed]);

  // ---------- teclado
  useEffect(() => {
    if (!active || paused) return;
    const isTyping = (t: EventTarget | null) => t instanceof Element && !!t.closest("input, textarea, select");
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"].includes(e.code)) {
        e.preventDefault();
        input.setKey(e.code, true);
      }
      const n = Number(e.key);
      if (!e.repeat && n >= 1 && n <= EMOTES.length) doEmote(EMOTES[n - 1].kind);
      if (e.code === "Escape") setSelected(null);
      if ((e.code === "Space" || e.code === "KeyF") && !e.repeat) {
        e.preventDefault();
        strike();
      }
    };
    const up = (e: KeyboardEvent) => input.setKey(e.code, false);
    const blur = () => input.clearKeys();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      input.clearKeys();
    };
  }, [active, paused, input, doEmote, strike]);

  // ---------- vida dos bots (modo demo / ?bots=N)
  useEffect(() => {
    if (!sim || !active || paused) return;
    const bots = others.filter((p) => p.bot);
    if (bots.length === 0) return;
    const iv = setInterval(() => {
      const p = bots[Math.floor(Math.random() * Math.min(bots.length, 60))];
      const r = Math.random();
      if (r < 0.4) handleEvent({ t: "say", id: p.id, text: BOT_PHRASES[Math.floor(Math.random() * BOT_PHRASES.length)] });
      else if (r < 0.75) handleEvent({ t: "emote", id: p.id, kind: (["wave", "dance", "salute", "clap"] as const)[Math.floor(Math.random() * 4)] });
      else {
        sim.approach(p.id, mover.x, mover.z);
        setTimeout(() => {
          const kinds: SocialKind[] = ["clap", "heart", "salute", "clap", "heart"];
          handleEvent({ t: "interact", from: p.id, fromNick: p.name.split(" ")[0], to: me.id, kind: kinds[Math.floor(Math.random() * kinds.length)] });
        }, 3500);
      }
    }, 2600);
    return () => clearInterval(iv);
  }, [sim, active, paused, others, mover, me.id, handleEvent]);

  const sel = selected ? byId[selected] : null;
  const top3 = useMemo(() => ranking.slice(0, 3), [ranking]);
  const myPos = ranking.findIndex((p) => p.id === me.id);
  const medalDone = sel ? medalsGiven[sel.id] === today() : false;

  return (
    <div
      className="relative h-full w-full touch-none select-none"
      onWheel={(e) => {
        zoom.add(e.deltaY * 0.0012);
        setZoomUi(zoom.get());
      }}
      onTouchStart={(e) => {
        if (e.touches.length === 2) pinch.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 2 || pinch.current === null) return;
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        // afastar os dedos = aproximar
        zoom.add((pinch.current - d) * 0.006);
        pinch.current = d;
        setZoomUi(zoom.get());
      }}
      onTouchEnd={(e) => {
        if (e.touches.length < 2) pinch.current = null;
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={active ? "always" : "never"}
        camera={{ fov: 50, near: 0.1, far: 500, position: [SPAWN.x, 11, SPAWN.z + 10.5] }}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={[war.phase === "war" ? "#F4C2C2" : "#CDE7F5"]} />
        <fog attach="fog" args={[war.phase === "war" ? "#F4C2C2" : "#CDE7F5", WORLD_RADIUS * 0.8, WORLD_RADIUS * 2.4]} />
        <hemisphereLight args={["#ffffff", "#C9C9C3", 1.3]} />
        <directionalLight
          castShadow
          position={[30, 50, 25]}
          intensity={2.2}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-85}
          shadow-camera-right={85}
          shadow-camera-top={85}
          shadow-camera-bottom={-85}
          shadow-camera-far={200}
          shadow-bias={-0.0005}
        />
        <Ground />
        <Landmarks />
        <Suspense fallback={null}>
          <Billboards />
          <PosterAvenue />
        </Suspense>
        <Podium top3={top3} />
        <DjBooth djName={dj?.nick ?? null} canClaim={zone === "dance"} onClick={claimDj} />
        <TechStore
          onPick={(p) => {
            sfx.pop();
            setTimeout(() => {
              setSelected(null);
              setSupplement(null);
              setLooviOpen(false);
              setCoffeeOpen(false);
              setProduct(p);
            }, 120);
          }}
        />
        <SupplementShop
          onPick={(p) => {
            sfx.pop();
            setTimeout(() => {
              setSelected(null);
              setProduct(null);
              setLooviOpen(false);
              setCoffeeOpen(false);
              setSupplement(p);
            }, 120);
          }}
        />
        <LooviStand
          onOpen={() => {
            sfx.pop();
            setTimeout(() => {
              setSelected(null);
              setProduct(null);
              setSupplement(null);
              setCoffeeOpen(false);
              setLooviOpen(true);
            }, 120);
          }}
        />
        <CoffeeShop
          onOpen={() => {
            sfx.pop();
            setTimeout(() => {
              setSelected(null);
              setProduct(null);
              setSupplement(null);
              setLooviOpen(false);
              setCoffeeOpen(true);
            }, 120);
          }}
        />
        <Collectibles field={field} mover={mover} onCollect={collect} />
        <LegendStar legend={legend} mover={mover} onTake={takeLegend} />
        <SupremeStar legend={supreme} mover={mover} onTake={takeSupreme} />
        <LocalPlayer me={me} input={input} mover={mover} gate={gate} emote={emotes[me.id] ?? null} bubble={bubbles[me.id]} />
        {others.map((p) => (
          <RemotePlayer
            key={p.id}
            player={p}
            source={source}
            lod={lod}
            emote={emotes[p.id] ?? null}
            bubble={bubbles[p.id]}
            selected={selected === p.id}
            onSelect={selectLater}
          />
        ))}
        {bursts.map((b) => (
          <BurstFx key={b.id} b={b} onDone={burstDone} />
        ))}
        <Invaders swarm={swarm} mover={mover} onEvent={onSwarm} />
        <CameraRig mover={mover} lod={lod} zoom={zoom} />
        <VisitWatcher visits={visits} mover={mover} onVisit={visit} />
        <ZoneWatcher mover={mover} gate={gate} onZone={onZone} onDenied={onDenied} />
        {net && <NetSync net={net} mover={mover} />}
        {sim && <SimTicker sim={sim} />}
        {showStats && <Stats className="!left-auto !right-2 !top-2" />}
      </Canvas>

      {/* ---------- HUD do mundo (z-20: acima das etiquetas 3D) ---------- */}
      <div className="pointer-events-none absolute inset-0 z-20 font-game">
        {war.phase === "war" && <div className="absolute inset-0 animate-pulse shadow-[inset_0_0_120px_30px_rgba(230,57,70,0.55)]" />}
        {war.phase !== "peace" && (
          <div
            className={`absolute left-1/2 top-14 -translate-x-1/2 rounded-2xl border-[3px] border-black px-4 py-2 text-center shadow-[4px_4px_0_#0a0a0a] compact:top-2 compact:px-2 compact:py-0.5 ${
              war.phase === "war" ? "bg-[#E63946] text-white" : "bg-[#FFD166] text-black"
            }`}
          >
            <div className="font-display text-xl leading-tight compact:text-sm">
              {war.phase === "war" ? `⚔️ INVASÃO! ${Math.ceil(war.msLeft / 1000)}s` : `⚠️ INVASÃO EM ${Math.ceil(war.msLeft / 1000)}s`}
            </div>
            <div className="text-xs font-bold compact:hidden">
              {war.phase === "war"
                ? `Clique nos invasores ou ESPAÇO · 🎯 ${wave.hit} abatidos · 💰 -${wave.lost}`
                : "Bandidos do Bloqueio Criativo vão roubar seus pontos!"}
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-2 compact:left-2 compact:top-2">
          <span className="rounded-full border-[3px] border-black bg-white px-3 py-1 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] compact:border-2 compact:px-2 compact:py-0 compact:text-[11px] compact:shadow-none">
            {status === "online" && <>🟢 {others.length + 1} no Quartel</>}
            {status === "connecting" && <>🟡 Conectando…</>}
            {status === "offline" && <>🔴 Sem conexão (modo solo)</>}
            {status === "demo" && <>🧪 Demo · {others.length + 1} no Quartel</>}
            {isTestMode() && status !== "demo" && <> · 🧪 modo teste</>}
          </span>
          <span className="hidden rounded-full border-[3px] border-black bg-black/80 px-3 py-1 text-xs font-bold text-white lg:inline">
            WASD/setas: andar · Shift: correr · 1–5: gestos · F/espaço: golpe · roda: zoom · clique numa pessoa para interagir
          </span>
        </div>

        {/* ranking ao vivo */}
        <div className="pointer-events-auto absolute left-3 top-14 w-56 rounded-2xl border-[3px] border-black bg-[#F9F9F9] shadow-[4px_4px_0_#0a0a0a] compact:left-2 compact:top-9 compact:w-40 compact:rounded-xl compact:border-2 compact:shadow-none">
          <button className="flex w-full items-center justify-between px-3 py-1.5 font-display text-sm compact:px-2 compact:py-0.5 compact:text-[11px]" onClick={() => setBoardOpen((v) => !v)}>
            <span>🏆 RANKING{boardOpen ? " AO VIVO" : ""}</span>
            <span>{boardOpen ? "−" : "+"}</span>
          </button>
          {boardOpen && (
            <ol className="px-2 pb-2 text-sm font-bold compact:px-1 compact:pb-1 compact:text-[10px]">
              {ranking.slice(0, 5).map((p, k) => (
                <li key={p.id} className={`flex items-center justify-between gap-2 rounded-lg px-1.5 py-0.5 ${p.id === me.id ? "bg-[#00EBA8]" : ""}`}>
                  <span className="truncate">
                    {k + 1}. {p.team ? "★ " : ""}
                    {p.id === me.id ? "Você" : p.name}
                  </span>
                  <span className="shrink-0 tabular-nums">{p.score}</span>
                </li>
              ))}
              {myPos >= 5 && (
                <li className="mt-1 flex items-center justify-between rounded-lg bg-[#00EBA8] px-1.5 py-0.5">
                  <span>{myPos + 1}. Você</span>
                  <span className="tabular-nums">{me.score}</span>
                </li>
              )}
            </ol>
          )}
        </div>

        <button
          className="pointer-events-auto absolute right-3 top-3 rounded-full border-[3px] border-black bg-white px-3 py-1 text-lg shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:right-2 compact:top-2 compact:border-2 compact:px-2 compact:py-0 compact:text-sm compact:shadow-none"
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
          aria-label={muted ? "Ligar som" : "Desligar som"}
          style={showStats ? { top: 64 } : undefined}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <ShareMenu onCopied={() => pushFeed("🔗 Link copiado! Cola no grupo da galera")} />
        <button
          className="pointer-events-auto absolute right-[4.5rem] top-3 rounded-full border-[3px] border-black bg-white px-3 py-1 text-lg shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:right-12 compact:top-2 compact:border-2 compact:px-2 compact:py-0 compact:text-sm compact:shadow-none"
          onClick={() => {
            music.start();
            music.setMuted(!musicOff);
            setMusicOff(!musicOff);
          }}
          aria-label={musicOff ? "Ligar música" : "Desligar música"}
          title={musicOff ? "Ligar música" : "Desligar música"}
          style={showStats ? { top: 64 } : undefined}
        >
          {musicOff ? "🎵✕" : "🎵"}
        </button>

        {/* Área VIP: cartão e contatos */}
        {(zone === "vip" || contacts.length > 0) && (
          <div className="pointer-events-auto absolute bottom-20 right-3 flex w-64 flex-col gap-2 compact:bottom-[5.5rem] compact:right-2 compact:w-44 compact:gap-1">
            {zone === "vip" && (
              <div className="rounded-2xl border-[3px] border-[#00EBA8] bg-black p-3 text-white shadow-[4px_4px_0_#00EBA866] compact:rounded-lg compact:border-2 compact:p-1.5 compact:shadow-none">
                <div className="font-display text-sm text-[#00EBA8]">🍸 MEU CARTÃO VIP</div>
                <p className="mb-2 text-[11px] font-semibold text-white/60 compact:hidden">Só vai para quem você escolher (botão “Passar contato”).</p>
                <input
                  defaultValue={card.instagram ? `@${card.instagram}` : ""}
                  placeholder="@seu.instagram"
                  maxLength={40}
                  onBlur={(e) => onCard({ ...card, instagram: cleanInstagram(e.target.value) })}
                  className="mb-1.5 w-full rounded-lg border-2 border-[#00EBA8] bg-white/10 px-2 py-1 text-sm font-bold outline-none placeholder:text-white/40 compact:py-0 compact:text-[11px]"
                />
                <input
                  defaultValue={card.link}
                  placeholder="portfólio, LinkedIn ou site"
                  maxLength={120}
                  onBlur={(e) => onCard({ ...card, link: cleanLink(e.target.value) })}
                  className="w-full rounded-lg border-2 border-[#00EBA8] bg-white/10 px-2 py-1 text-sm font-bold outline-none placeholder:text-white/40 compact:py-0 compact:text-[11px]"
                />
              </div>
            )}
            {contacts.length > 0 && (
              <button
                onClick={() => setContactsOpen((v) => !v)}
                className="rounded-xl border-[3px] border-black bg-[#00EBA8] px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_#0a0a0a]"
              >
                📇 Contatos recebidos ({contacts.length})
              </button>
            )}
          </div>
        )}
        {contactsOpen && (
          <div className="pointer-events-auto absolute bottom-20 right-[17.5rem] z-30 max-h-[50vh] w-72 touch-auto overflow-y-auto compact:bottom-2 compact:right-[11.5rem] compact:max-h-[calc(100%-1rem)] compact:w-56 compact:border-2 compact:p-1.5 rounded-2xl border-4 border-black bg-[#F9F9F9] p-3 shadow-[5px_5px_0_#0a0a0a]">
            <div className="mb-2 flex items-center justify-between font-display text-sm">
              📇 CONTATOS <button onClick={() => setContactsOpen(false)} className="text-xl">×</button>
            </div>
            <ul className="flex flex-col gap-2">
              {contacts.map((c) => (
                <li key={`${c.id}-${c.at}`} className="rounded-xl border-2 border-black bg-white px-2.5 py-1.5 text-sm font-bold">
                  <div>{c.nick}</div>
                  {c.instagram && (
                    <a className="block text-[#FF5A00] underline" href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener noreferrer" onClick={(e) => openExternal(e, `https://instagram.com/${c.instagram}`)}>
                      @{c.instagram}
                    </a>
                  )}
                  {c.link && (
                    <a className="block truncate text-[#FF5A00] underline" href={c.link} target="_blank" rel="noopener noreferrer" onClick={(e) => openExternal(e, c.link!)}>
                      {c.link.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* feed */}
        <div className="absolute right-3 top-16 flex w-72 max-w-[60vw] flex-col items-end gap-1.5 compact:right-2 compact:top-10 compact:w-52 compact:gap-1">
          {feed.map((f) => (
            <div
              key={f.id}
              className={`animate-[slidein_.25s_ease-out] rounded-xl border-[3px] border-black px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] compact:border-2 compact:px-2 compact:py-0.5 compact:text-[10px] compact:shadow-none ${
                f.tone === "gold" ? "bg-[#00EBA8]" : f.tone === "purple" ? "bg-[#B26BFF] text-white" : f.tone === "rainbow" ? "bg-gradient-to-r from-[#FF5A00] via-[#0050FF] to-[#00EBA8] text-white" : "bg-white"
              }`}
            >
              {f.text}
            </div>
          ))}
        </div>

        {/* card da pessoa selecionada */}
        {sel && (
          <div className="pointer-events-auto absolute left-1/2 top-16 z-30 max-h-[calc(100%-5rem)] w-[320px] max-w-[92vw] -translate-x-1/2 touch-auto overflow-y-auto compact:top-1 compact:max-h-[calc(100%-0.5rem)] compact:w-[440px] compact:rounded-xl compact:border-2 compact:shadow-none rounded-2xl border-4 border-black bg-[#F9F9F9] p-4 shadow-[5px_5px_0_#0a0a0a] compact:p-2">
            <button className="absolute right-3 top-1 text-2xl font-bold" onClick={() => setSelected(null)} aria-label="Fechar">
              ×
            </button>
            {sel.team && <div className="mb-1 inline-block rounded-md bg-black px-2 text-[11px] font-bold tracking-wider text-[#00EBA8]">★ EQUIPE QUARTEL</div>}
            <div className="font-display text-xl leading-tight compact:pr-6 compact:text-base">{sel.name}</div>
            <div className="text-sm font-semibold text-black/70 compact:text-[11px]">
              {sel.role} · {ITEM_BY_ID[sel.avatar.title]?.name}
            </div>
            <div className="mt-1 text-sm font-bold compact:mt-0 compact:text-[11px]">
              {sel.rank ? `#${sel.rank} no ranking · ` : ""}
              {sel.score} pontos
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 compact:mt-1 compact:gap-1">
              {(["clap", "salute", "heart"] as SocialKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => interact(k)}
                  className="rounded-xl border-[3px] border-black bg-white py-2 text-xs font-bold shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:rounded-lg compact:border-2 compact:py-0.5 compact:text-[10px] compact:shadow-none"
                >
                  <div className="text-xl compact:text-sm">{SOCIAL[k].icon}</div>
                  {SOCIAL[k].label}
                </button>
              ))}
            </div>
            <button
              onClick={() => interact("medal")}
              disabled={medalDone}
              className="mt-2 w-full rounded-xl border-[3px] border-black bg-[#00EBA8] py-2 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-neutral-300 disabled:text-black/50 disabled:shadow-none compact:mt-1 compact:rounded-lg compact:border-2 compact:py-1 compact:text-[11px] compact:shadow-none"
            >
              {medalDone ? "🎖️ Medalha já entregue hoje" : "🎖️ Dar medalha (1 por pessoa/dia, +10 pra ela)"}
            </button>
            {zone === "vip" && (
              <div className="mt-3 rounded-xl border-[3px] border-[#00EBA8] bg-black p-2 compact:mt-1 compact:border-2 compact:p-1">
                <div className="mb-1.5 font-display text-xs text-[#00EBA8]">🍸 SÓ NA ÁREA VIP</div>
                <button
                  onClick={shareContact}
                  className="mb-2 w-full rounded-lg border-2 border-black bg-[#00EBA8] py-1.5 text-sm font-bold"
                >
                  📇 Passar meu contato
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(FLIRT) as FlirtKind[]).map((k) => (
                    <button key={k} onClick={() => flirt(k)} className="rounded-lg border-2 border-black bg-white py-1 text-xs font-bold">
                      <div className="text-lg">{FLIRT[k].icon}</div>
                      {FLIRT[k].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* produto da Tech Store */}
        {product && (
          <div className="pointer-events-auto absolute left-1/2 top-16 z-30 max-h-[calc(100%-5rem)] w-[320px] max-w-[92vw] -translate-x-1/2 touch-auto overflow-y-auto compact:top-1 compact:max-h-[calc(100%-0.5rem)] compact:w-[440px] compact:rounded-xl compact:border-2 compact:shadow-none rounded-2xl border-4 border-black bg-white p-4 shadow-[5px_5px_0_#0a0a0a] compact:p-2">
            <button className="absolute right-3 top-1 text-2xl font-bold" onClick={() => setProduct(null)} aria-label="Fechar">
              ×
            </button>
            <div className="text-xs font-bold tracking-widest text-black/50">TECH STORE</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-4xl compact:text-2xl">{product.emoji}</span>
              <div>
                <div className="font-display text-2xl leading-tight compact:text-base">{product.name}</div>
                <div className="text-sm font-semibold text-black/60 compact:text-[11px]">{product.blurb}</div>
              </div>
            </div>
            <a
              href={buyUrl(product.id)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={(e) => {
                sfx.collect2();
                openExternal(e, buyUrl(product.id));
              }}
              className="mt-4 block rounded-xl border-[3px] border-black bg-[#FFE600] py-2.5 compact:mt-1.5 compact:py-1.5 text-center text-sm font-bold text-black shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Comprar no Mercado Livre ↗
            </a>
            <p className="mt-2 text-center text-[11px] font-semibold text-black/50 compact:mt-1 compact:text-[9px]">
              Loja oficial Apple no Mercado Livre (distribuidor autorizado).
              {hasAffiliate(product.id) && (
                <>
                  <br />
                  <b>#publi</b> · Link de afiliado: a Quartel pode receber comissão se você comprar.
                </>
              )}
            </p>
          </div>
        )}

        {/* produto da loja Maxme Bio */}
        {supplement && (
          <div className="pointer-events-auto absolute left-1/2 top-16 z-30 max-h-[calc(100%-5rem)] w-[340px] max-w-[92vw] -translate-x-1/2 touch-auto overflow-y-auto compact:top-1 compact:max-h-[calc(100%-0.5rem)] compact:w-[440px] compact:rounded-xl compact:border-2 compact:shadow-none rounded-2xl border-4 border-black bg-white p-4 shadow-[5px_5px_0_#0a0a0a] compact:p-2">
            <button className="absolute right-3 top-1 text-2xl font-bold" onClick={() => setSupplement(null)} aria-label="Fechar">
              ×
            </button>
            <div className="text-xs font-bold tracking-widest text-black/50">SUPLEMENTOS · MAXME BIO</div>
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={supplement.image} alt="" className="h-20 w-20 rounded-xl border-2 border-black object-cover compact:h-12 compact:w-12" />
              <div>
                <div className="font-display text-xl leading-tight compact:pr-5 compact:text-sm">{supplement.name}</div>
                <div className="text-sm font-semibold text-black/60 compact:text-[11px]">{supplement.blurb}</div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border-2 border-dashed border-black bg-[#00EBA8]/20 px-3 py-1.5 text-center text-sm font-bold compact:mt-1 compact:py-0.5 compact:text-[11px]">
              🎟️ Cupom <span className="font-display tracking-wider">{MAXME_COUPON}</span> já vai aplicado: 20% OFF
            </div>
            <a
              href={couponUrl(supplement.path)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                sfx.collect2();
                openExternal(e, couponUrl(supplement.path));
              }}
              className="mt-3 block rounded-xl border-[3px] border-black bg-black py-2.5 compact:mt-1 compact:py-1.5 text-center text-sm font-bold text-white shadow-[3px_3px_0_#00EBA8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Comprar com desconto no site da Maxme Bio ↗
            </a>
          </div>
        )}

        {/* stand Loovi */}
        {looviOpen && (
          <div className="pointer-events-auto absolute left-1/2 top-16 z-30 max-h-[calc(100%-5rem)] w-[340px] max-w-[92vw] -translate-x-1/2 touch-auto overflow-y-auto compact:top-1 compact:max-h-[calc(100%-0.5rem)] compact:w-[440px] compact:rounded-xl compact:border-2 compact:shadow-none rounded-2xl border-4 border-black bg-white shadow-[5px_5px_0_#0a0a0a]">
            <div className="relative px-4 pb-3 pt-4 text-white compact:px-3 compact:py-1.5" style={{ background: LOOVI_BLUE }}>
              <button className="absolute right-3 top-1 text-2xl font-bold compact:text-xl" onClick={() => setLooviOpen(false)} aria-label="Fechar">
                ×
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/loovi/logo-branca.svg" alt="Loovi" className="h-5 w-auto compact:h-3.5" />
              <div className="font-display mt-2 text-2xl leading-tight compact:mt-1 compact:text-base">Seguro auto a partir de R$ 99,90/mês*</div>
            </div>
            <div className="p-4 compact:p-2">
              <div className="mb-3 text-center text-sm font-bold compact:mb-1 compact:text-[11px]">
                🎁 Indicação com presente · código <span className="font-display tracking-wider">{LOOVI_PROMO_CODE}</span>
              </div>
              <a
                href={LOOVI_QUOTE_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={(e) => {
                  sfx.collect2();
                  openExternal(e, LOOVI_QUOTE_URL);
                }}
                className="block rounded-xl border-[3px] border-black py-2.5 text-center text-sm font-bold text-white shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:rounded-lg compact:border-2 compact:py-1.5 compact:shadow-none"
                style={{ background: LOOVI_BLUE }}
              >
                Fazer minha cotação ↗
              </a>
              <p className="mt-2 text-center text-[11px] font-semibold text-black/50 compact:mt-1 compact:text-[9px]">
                <b>#publi</b> · Quem indica pode ser recompensado. *Condições no site da Loovi.
              </p>
            </div>
          </div>
        )}

        {/* cafeteria */}
        {coffeeOpen && (
          <div className="pointer-events-auto absolute left-1/2 top-16 z-30 max-h-[calc(100%-5rem)] w-[340px] max-w-[92vw] -translate-x-1/2 touch-auto overflow-y-auto compact:top-1 compact:max-h-[calc(100%-0.5rem)] compact:w-[440px] compact:rounded-xl compact:border-2 compact:shadow-none rounded-2xl border-4 border-black bg-white shadow-[5px_5px_0_#0a0a0a]">
            <div className="relative px-4 pb-3 pt-4 text-white compact:px-3 compact:py-1.5" style={{ background: COFFEE_BROWN }}>
              <button className="absolute right-3 top-1 text-2xl font-bold compact:text-xl" onClick={() => setCoffeeOpen(false)} aria-label="Fechar">
                ×
              </button>
              <div className="font-display text-2xl leading-tight compact:text-base">☕ Café do Quartel</div>
              <div className="mt-1 text-sm font-semibold compact:mt-0 compact:text-[11px]">Troque pontos por café e fique acelerado por {COFFEE_SECONDS}s. Você tem {me.score} pontos.</div>
            </div>
            <div className="space-y-2 p-4 compact:grid compact:grid-cols-3 compact:gap-1.5 compact:space-y-0 compact:p-2">
              {COFFEES.map((c) => {
                const short = me.score < c.cost;
                return (
                  <button
                    key={c.id}
                    disabled={short}
                    onClick={() => buyCoffee(c)}
                    className="flex w-full items-center gap-3 rounded-xl border-[3px] border-black bg-[#F6E7D2] px-3 py-2 text-left shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-45 disabled:shadow-none compact:flex-col compact:gap-0 compact:rounded-lg compact:border-2 compact:p-1 compact:text-center compact:shadow-none"
                  >
                    <span className="text-2xl compact:text-base">{c.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-tight compact:text-[11px]">{c.name}</span>
                      <span className="block text-xs font-semibold text-black/60 compact:text-[9px]">{short ? `faltam ${c.cost - me.score} pontos` : `+${Math.round((c.speed - 1) * 100)}% de velocidade`}</span>
                    </span>
                    <span className="font-display shrink-0 text-lg compact:text-xs">{c.cost} pts</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* gestos e frases */}
        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-2 compact:bottom-2 compact:gap-1">
          {EMOTES.map((e, k) => (
            <button
              key={e.kind}
              title={`${e.label} (${k + 1})`}
              onClick={() => doEmote(e.kind)}
              className="h-12 w-12 rounded-xl border-[3px] border-black bg-white text-2xl shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:h-8 compact:w-8 compact:rounded-lg compact:border-2 compact:text-base compact:shadow-none"
            >
              {e.icon}
            </button>
          ))}
          <button
            title="Dar um golpe em quem estiver perto (F ou espaço). Cada pancada tira 1 ponto."
            aria-label="Dar um golpe"
            onClick={strike}
            className="h-12 w-12 rounded-xl border-[3px] border-black bg-[#E63946] text-2xl shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:h-8 compact:w-10 compact:rounded-lg compact:border-2 compact:text-base compact:shadow-none"
          >
            👊
          </button>
          <div className="relative">
            {phrasesOpen && (
              <div className="absolute bottom-14 right-0 flex max-h-[60vh] w-60 touch-auto flex-col gap-1 overflow-y-auto rounded-xl border-[3px] border-black bg-white p-2 shadow-[4px_4px_0_#0a0a0a] compact:bottom-9 compact:w-48 compact:gap-0 compact:border-2 compact:p-1 compact:shadow-none compact:[&_button]:py-0.5 compact:[&_button]:text-[11px]">
                {MY_PHRASES.map((p) => (
                  <button
                    key={p}
                    className="rounded-lg px-2 py-1 text-left text-sm font-bold hover:bg-[#00EBA8]"
                    onClick={() => {
                      doSay(p);
                      setPhrasesOpen(false);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setPhrasesOpen((v) => !v)}
              className="h-12 rounded-xl border-[3px] border-black bg-[#00EBA8] px-3 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:h-8 compact:rounded-lg compact:border-2 compact:px-2 compact:text-[11px] compact:shadow-none"
            >
              💬 Falar
            </button>
          </div>
        </div>

        {/* painel do DJ (o botão de assumir fica em cima da mesa, no mapa) */}
        {iAmDj && dj && (
          <div className="pointer-events-auto absolute bottom-20 right-16 z-30 w-64 touch-auto rounded-2xl border-[3px] border-black bg-black p-2 text-white shadow-[4px_4px_0_#00EBA8] compact:bottom-2 compact:right-12 compact:w-48 compact:rounded-lg compact:border-2 compact:p-1 compact:shadow-none">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-sm text-[#00EBA8] compact:text-[10px]">🎧 VOCÊ É O DJ</span>
              <button onClick={leaveDj} className="rounded-md bg-white px-2 text-xs font-bold text-black compact:px-1 compact:text-[9px]">
                Sair
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {DJ_TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTrack(t.id)}
                  className={`rounded-lg py-1 text-[11px] font-bold text-black compact:py-0 compact:text-[9px] ${dj.track === t.id ? "bg-[#00EBA8]" : "bg-white"}`}
                >
                  <div className="text-base compact:text-xs">{t.icon}</div>
                  {t.label}
                </button>
              ))}
              {DJ_FX.map((f) => (
                <button key={f.id} onClick={() => playFx(f.id)} className="rounded-lg bg-[#FF5A00] py-1 text-[11px] font-bold text-black active:bg-white compact:py-0 compact:text-[9px]">
                  <div className="text-base compact:text-xs">{f.icon}</div>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* zoom: + / − e indicador (pinça no celular, roda do mouse no PC) */}
        <div className="pointer-events-auto absolute bottom-4 right-3 flex flex-col items-center overflow-hidden rounded-xl border-[3px] border-black bg-white text-black shadow-[3px_3px_0_#0a0a0a] compact:bottom-2 compact:right-2 compact:border-2 compact:shadow-none">
          <button
            aria-label="Aproximar"
            className="h-8 w-9 text-lg font-bold hover:bg-[#00EBA8] compact:h-7 compact:w-8"
            onClick={() => {
              zoom.add(-0.2);
              setZoomUi(zoom.get());
            }}
          >
            ＋
          </button>
          <div className="w-full border-y-2 border-black bg-[#F9F9F9] py-0.5 text-center text-[10px] font-bold tabular-nums" title="Zoom · roda do mouse no PC, pinça no celular">
            🔍{Math.round(100 / zoomUi)}%
          </div>
          <button
            aria-label="Afastar"
            className="h-8 w-9 text-lg font-bold hover:bg-[#00EBA8] compact:h-7 compact:w-8"
            onClick={() => {
              zoom.add(0.2);
              setZoomUi(zoom.get());
            }}
          >
            −
          </button>
        </div>

        <Joystick input={input} />
      </div>
    </div>
  );
}
