"use client";

import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "./bots";
import type { Mover } from "./lod";
import { clampToWorld } from "./world";

/**
 * Invasão do Bloqueio Criativo: de tempos em tempos, invasores caem de paraquedas,
 * correm atrás de você e roubam pontos. Clique neles (ou aperte espaço) para abater.
 * O horário é igual para todo mundo (sem servidor): todos vivem a invasão juntos.
 * Cada pessoa enfrenta a própria leva de invasores.
 */
export const WAR_EVERY_MS = 300_000; // a cada 5 minutos
export const WAR_OFFSET_MS = 150_000;
export const WAR_LEN_MS = 20_000;
export const WAR_WARN_MS = 10_000;
export const INVADERS = 8;
export const STEAL = 20; // pontos roubados por invasor que te alcança
export const BOUNTY = 3;

export type WarPhase = { phase: "peace" | "warning" | "war"; slot: number; msLeft: number };

export function warPhase(now: number, every = WAR_EVERY_MS): WarPhase {
  const t = now - WAR_OFFSET_MS;
  const slot = Math.floor(t / every);
  const into = t - slot * every;
  if (into < WAR_LEN_MS) return { phase: "war", slot, msLeft: WAR_LEN_MS - into };
  if (into > every - WAR_WARN_MS) return { phase: "warning", slot: slot + 1, msLeft: every - into };
  return { phase: "peace", slot, msLeft: every - into };
}

type State = "off" | "drop" | "chase" | "flee" | "dead";
interface Invader {
  x: number;
  z: number;
  y: number;
  ry: number;
  speed: number;
  state: State;
  t: number;
}

export type SwarmEvent = { kind: "steal" | "hit"; x: number; z: number };

/** Estado dos invasores fora do React (lido e escrito no loop de frames). */
export class Swarm {
  readonly inv: Invader[] = Array.from({ length: INVADERS }, () => ({ x: 0, z: 0, y: 0, ry: 0, speed: 6, state: "off" as State, t: 0 }));
  slot = -1;

  start(slot: number, px: number, pz: number) {
    if (slot === this.slot) return;
    this.slot = slot;
    const r = mulberry32(slot * 31 + 5);
    this.inv.forEach((v, k) => {
      const a = (k / INVADERS) * Math.PI * 2 + r() * 0.5;
      const d = 14 + r() * 10;
      const [x, z] = clampToWorld(px + Math.cos(a) * d, pz + Math.sin(a) * d);
      // escalonados: um a cada ~1,2s, e mais lentos que o jogador (9 andando, 14 correndo)
      Object.assign(v, { x, z, y: 11 + r() * 4, ry: 0, speed: 3.6 + r() * 1.8, state: "drop" as State, t: -k * 1.2 });
    });
  }

  /** fim da invasão: quem sobrou foge */
  retreat() {
    for (const v of this.inv) if (v.state === "drop" || v.state === "chase") Object.assign(v, { state: "flee" as State, t: 0 });
  }

  alive() {
    return this.inv.filter((v) => v.state === "drop" || v.state === "chase").length;
  }

  hit(i: number): SwarmEvent | null {
    const v = this.inv[i];
    if (!v || (v.state !== "chase" && v.state !== "drop") || v.t < 0) return null;
    v.state = "dead";
    v.t = 0;
    return { kind: "hit", x: v.x, z: v.z };
  }

  /** espaço: golpeia o invasor mais próximo (até `max` de distância) */
  hitNearest(px: number, pz: number, max = 7): SwarmEvent | null {
    let best = -1;
    let bd = max;
    this.inv.forEach((v, k) => {
      if ((v.state !== "chase" && v.state !== "drop") || v.t < 0) return;
      const d = Math.hypot(v.x - px, v.z - pz);
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    return best >= 0 ? this.hit(best) : null;
  }

  tick(dt: number, px: number, pz: number): SwarmEvent[] {
    const out: SwarmEvent[] = [];
    for (const v of this.inv) {
      v.t += dt;
      if (v.state === "drop") {
        if (v.t < 0) continue; // ainda no avião
        v.y = Math.max(0, v.y - 7 * dt);
        if (v.y === 0) v.state = "chase";
      } else if (v.state === "chase") {
        const dx = px - v.x;
        const dz = pz - v.z;
        const d = Math.hypot(dx, dz);
        v.ry = Math.atan2(dx, dz);
        if (d < 1.2) {
          v.state = "flee";
          v.t = 0;
          out.push({ kind: "steal", x: v.x, z: v.z });
        } else {
          const step = Math.min(d, v.speed * dt);
          [v.x, v.z] = clampToWorld(v.x + (dx / d) * step, v.z + (dz / d) * step);
        }
      } else if (v.state === "flee") {
        const dx = v.x - px;
        const dz = v.z - pz;
        const d = Math.hypot(dx, dz) || 1;
        v.ry = Math.atan2(dx, dz);
        v.x += (dx / d) * 13 * dt;
        v.z += (dz / d) * 13 * dt;
        v.y = Math.min(6, v.t * 3);
        if (v.t > 1.8) v.state = "off";
      } else if (v.state === "dead" && v.t > 0.45) {
        v.state = "off";
      }
    }
    return out;
  }
}

const RED = "#E63946";
const BODY = "#2B2D42";

function InvaderModel({ i, swarm, onClick }: { i: number; swarm: Swarm; onClick: (i: number) => boolean }) {
  const g = useRef<THREE.Group>(null);
  const chute = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group>(null);
  const sack = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const v = swarm.inv[i];
    const grp = g.current;
    if (!grp) return;
    grp.visible = v.state !== "off" && !(v.state === "drop" && v.t < 0);
    if (!grp.visible) return;
    grp.position.set(v.x, v.y, v.z);
    grp.rotation.y = v.ry;
    const t = clock.elapsedTime;
    if (v.state === "dead") {
      const s = Math.max(0.01, 1 - v.t * 2.2);
      grp.scale.set(s * 1.4, s, s * 1.4);
      grp.rotation.y += v.t * 20;
    } else {
      grp.scale.setScalar(1);
    }
    if (chute.current) chute.current.visible = v.state === "drop";
    if (legs.current) legs.current.rotation.x = v.state === "chase" || v.state === "flee" ? Math.sin(t * 18 + i) * 0.6 : 0;
    if (sack.current) sack.current.visible = v.state === "flee";
  });
  return (
    <group
      ref={g}
      visible={false}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        // invasor escondido não "rouba" o clique de quem está atrás
        if (onClick(i)) e.stopPropagation();
      }}
      onPointerOver={() => (document.body.style.cursor = "crosshair")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {/* corpo */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.85, 0.85, 0.5]} />
        <meshStandardMaterial color={BODY} />
      </mesh>
      {/* cabeça com máscara de bandido */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.65, 0.6, 0.6]} />
        <meshStandardMaterial color="#8D99AE" />
      </mesh>
      <mesh position={[0, 1.86, 0.31]}>
        <boxGeometry args={[0.67, 0.18, 0.02]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 1.86, 0.33]}>
          <boxGeometry args={[0.09, 0.07, 0.02]} />
          <meshBasicMaterial color={RED} />
        </mesh>
      ))}
      <mesh position={[0, 2.16, 0]}>
        <boxGeometry args={[0.7, 0.12, 0.65]} />
        <meshStandardMaterial color={RED} />
      </mesh>
      {/* pernas */}
      <group ref={legs} position={[0, 0.62, 0]}>
        {[-0.2, 0.2].map((x, k) => (
          <mesh key={x} position={[x, -0.3, 0]} rotation={[k ? 0.3 : -0.3, 0, 0]}>
            <boxGeometry args={[0.28, 0.6, 0.3]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))}
      </group>
      {/* saco de moedas roubadas */}
      <mesh ref={sack} position={[0, 1.4, -0.45]} visible={false}>
        <sphereGeometry args={[0.38, 12, 10]} />
        <meshStandardMaterial color="#C9A27A" />
      </mesh>
      {/* paraquedas */}
      <group ref={chute} position={[0, 3.6, 0]}>
        <mesh>
          <sphereGeometry args={[1.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={RED} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map((x) =>
          [-1, 1].map((z) => (
            <mesh key={`${x}${z}`} position={[x * 0.6, -0.8, z * 0.6]} rotation={[z * 0.5, 0, -x * 0.5]}>
              <boxGeometry args={[0.03, 1.6, 0.03]} />
              <meshBasicMaterial color="#eee" />
            </mesh>
          )),
        )}
      </group>
      {/* área de clique maior que o boneco */}
      <mesh position={[0, 1.3, 0]} visible={false}>
        <boxGeometry args={[1.6, 2.8, 1.6]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export function Invaders({
  swarm,
  mover,
  onEvent,
}: {
  swarm: Swarm;
  mover: Mover;
  onEvent: (e: SwarmEvent) => void;
}) {
  useFrame((_, dt) => {
    for (const e of swarm.tick(Math.min(dt, 0.05), mover.x, mover.z)) onEvent(e);
  });
  const click = (i: number) => {
    const e = swarm.hit(i);
    if (e) onEvent(e);
    return !!e;
  };
  return (
    <>
      {Array.from({ length: INVADERS }, (_, i) => (
        <InvaderModel key={i} i={i} swarm={swarm} onClick={click} />
      ))}
    </>
  );
}
