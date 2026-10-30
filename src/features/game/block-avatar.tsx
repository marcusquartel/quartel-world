"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { type Avatar, color } from "@/lib/game/catalog";

export type EmoteKind = "wave" | "salute" | "dance" | "clap" | "heart" | "punch";
export interface Emote {
  kind: EmoteKind;
  /** muda a cada novo gesto (para repetir o mesmo) */
  nonce: number;
}

const EMOTE_DURATION = 2.4;

type V3 = [number, number, number];

/** Caixa básica (o "bloco" do avatar). */
function B({ s, p, c, r, shadow = true, emissive }: { s: V3; p: V3; c: string; r?: V3; shadow?: boolean; emissive?: string }) {
  return (
    <mesh position={p} rotation={r} castShadow={shadow}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 0.6 : 0} />
    </mesh>
  );
}

function Star({ p, size = 0.12, c = "#00EBA8", r }: { p: V3; size?: number; c?: string; r?: V3 }) {
  const shape = useMemo(() => {
    const sh = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const rad = k % 2 === 0 ? 1 : 0.45;
      const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (k === 0) sh.moveTo(x, y);
      else sh.lineTo(x, y);
    }
    sh.closePath();
    return sh;
  }, []);
  return (
    <mesh position={p} rotation={r} scale={size}>
      <extrudeGeometry args={[shape, { depth: 0.3, bevelEnabled: false }]} />
      <meshStandardMaterial color={c} metalness={0.4} roughness={0.35} emissive={c} emissiveIntensity={0.25} />
    </mesh>
  );
}

function Hair({ style, c }: { style: string; c: string }) {
  switch (style) {
    case "hair-raspado":
      return <B s={[0.64, 0.05, 0.64]} p={[0, 0.65, 0]} c={c} />;
    case "hair-curto":
      return (
        <>
          <B s={[0.66, 0.14, 0.66]} p={[0, 0.68, 0]} c={c} />
          <B s={[0.66, 0.32, 0.1]} p={[0, 0.5, -0.3]} c={c} />
          <B s={[0.66, 0.08, 0.12]} p={[0, 0.6, 0.29]} c={c} />
        </>
      );
    case "hair-cacheado":
      return (
        <>
          <B s={[0.68, 0.16, 0.68]} p={[0, 0.69, 0]} c={c} />
          {[-0.22, 0, 0.22].map((x) =>
            [-0.2, 0.05, 0.25].map((z) => <B key={`${x}${z}`} s={[0.18, 0.14, 0.18]} p={[x, 0.8, z]} c={c} />),
          )}
          <B s={[0.7, 0.36, 0.12]} p={[0, 0.48, -0.31]} c={c} />
        </>
      );
    case "hair-coque":
      return (
        <>
          <B s={[0.66, 0.14, 0.66]} p={[0, 0.68, 0]} c={c} />
          <B s={[0.66, 0.32, 0.1]} p={[0, 0.5, -0.3]} c={c} />
          <B s={[0.26, 0.24, 0.26]} p={[0, 0.84, -0.18]} c={c} />
        </>
      );
    case "hair-longo":
      return (
        <>
          <B s={[0.68, 0.14, 0.68]} p={[0, 0.68, 0]} c={c} />
          <B s={[0.68, 0.8, 0.12]} p={[0, 0.28, -0.32]} c={c} />
          <B s={[0.1, 0.6, 0.5]} p={[-0.34, 0.36, -0.06]} c={c} />
          <B s={[0.1, 0.6, 0.5]} p={[0.34, 0.36, -0.06]} c={c} />
        </>
      );
    case "hair-moicano":
      return <B s={[0.16, 0.32, 0.66]} p={[0, 0.78, 0]} c={c} />;
    case "hair-black-power":
      return <B s={[0.88, 0.52, 0.82]} p={[0, 0.68, -0.04]} c={c} />;
    default:
      return null;
  }
}

/** Make no rosto (frente da cabeça fica em z≈0.31; olhos em y 0.38, boca em y 0.2). */
function Makeup({ id }: { id: string }) {
  if (id === "mk-none") return null;
  const c0 = color(id, 0);
  const c1 = color(id, 1);
  const c2 = color(id, 2);
  const Z = 0.318;
  const flat = (s: V3, p: V3, c: string, r?: V3, glow = false) => (
    <mesh position={p} rotation={r}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.5} emissive={glow ? c : "#000"} emissiveIntensity={glow ? 0.8 : 0} />
    </mesh>
  );
  const blush = (c: string) => (
    <>
      {flat([0.12, 0.06, 0.01], [-0.2, 0.27, Z], c)}
      {flat([0.12, 0.06, 0.01], [0.2, 0.27, Z], c)}
    </>
  );
  const lips = (c: string) => flat([0.22, 0.065, 0.012], [0, 0.2, Z + 0.002], c);
  const shadow = (c: string) => (
    <>
      {flat([0.14, 0.05, 0.01], [-0.13, 0.46, Z], c)}
      {flat([0.14, 0.05, 0.01], [0.13, 0.46, Z], c)}
    </>
  );
  const liner = (
    <>
      {flat([0.09, 0.025, 0.012], [-0.2, 0.43, Z + 0.002], "#111", [0, 0, -0.5])}
      {flat([0.09, 0.025, 0.012], [0.2, 0.43, Z + 0.002], "#111", [0, 0, 0.5])}
    </>
  );
  switch (id) {
    case "mk-blush":
      return blush(c0);
    case "mk-batom-vermelho":
    case "mk-batom-nude":
    case "mk-batom-roxo":
      return lips(c0);
    case "mk-delineado":
      return liner;
    case "mk-sombra-menta":
    case "mk-sombra-dourada":
      return (
        <>
          {shadow(c0)}
          {lips(c1)}
        </>
      );
    case "mk-glamour":
      return (
        <>
          {shadow(c0)}
          {liner}
          {lips(c1)}
          {blush(c2)}
        </>
      );
    case "mk-glitter":
      return (
        <>
          {[
            [-0.22, 0.47],
            [-0.05, 0.5],
            [0.06, 0.47],
            [0.22, 0.5],
            [-0.25, 0.33],
            [0.25, 0.32],
          ].map(([x, y], k) => (
            <group key={k}>{flat([0.035, 0.035, 0.012], [x, y, Z + 0.002], [c0, c1, c2][k % 3], [0, 0, 0.78], true)}</group>
          ))}
        </>
      );
    case "mk-sardas":
      return (
        <>
          {[
            [-0.22, 0.29],
            [-0.17, 0.25],
            [-0.24, 0.23],
            [0.22, 0.29],
            [0.17, 0.25],
            [0.24, 0.23],
            [-0.04, 0.3],
            [0.04, 0.29],
          ].map(([x, y], k) => (
            <group key={k}>{flat([0.025, 0.025, 0.01], [x, y, Z], c0)}</group>
          ))}
        </>
      );
    case "mk-guerra":
      return (
        <>
          {[-1, 1].map((sx) => (
            <group key={sx}>
              {flat([0.16, 0.035, 0.01], [sx * 0.19, 0.3, Z], c0)}
              {flat([0.16, 0.035, 0.01], [sx * 0.19, 0.25, Z], c1)}
            </group>
          ))}
          {flat([0.04, 0.12, 0.01], [0, 0.33, Z], c0)}
        </>
      );
    case "mk-estrela":
      return <Star p={[0.2, 0.25, Z - 0.006]} size={0.05} c={c0} />;
    default:
      return null;
  }
}

function HeadGear({ id }: { id: string }) {
  const c0 = color(id, 0);
  const c1 = color(id, 1);
  switch (id) {
    case "head-bone":
      return (
        <>
          <B s={[0.68, 0.18, 0.68]} p={[0, 0.72, 0]} c={c0} />
          <B s={[0.6, 0.05, 0.32]} p={[0, 0.66, 0.46]} c={c0} />
          <Star p={[0, 0.72, 0.345]} size={0.07} c={c1} />
        </>
      );
    case "head-fone":
      return (
        <>
          <B s={[0.74, 0.08, 0.12]} p={[0, 0.72, 0]} c={c0} />
          <B s={[0.1, 0.32, 0.12]} p={[-0.37, 0.56, 0]} c={c0} />
          <B s={[0.1, 0.32, 0.12]} p={[0.37, 0.56, 0]} c={c0} />
          <B s={[0.12, 0.24, 0.24]} p={[-0.38, 0.38, 0]} c={c1} />
          <B s={[0.12, 0.24, 0.24]} p={[0.38, 0.38, 0]} c={c1} />
        </>
      );
    case "head-oculos":
      return (
        <>
          <B s={[0.62, 0.04, 0.04]} p={[0, 0.44, 0.33]} c={c1} />
          <B s={[0.22, 0.14, 0.04]} p={[-0.15, 0.38, 0.34]} c={c0} />
          <B s={[0.22, 0.14, 0.04]} p={[0.15, 0.38, 0.34]} c={c0} />
        </>
      );
    case "head-boina":
      return (
        <>
          <B s={[0.74, 0.14, 0.72]} p={[0.04, 0.7, 0]} r={[0, 0, 0.16]} c={c0} />
          <Star p={[-0.16, 0.66, 0.37]} size={0.06} c={c1} />
        </>
      );
    case "head-capacete":
      return (
        <>
          <B s={[0.76, 0.3, 0.76]} p={[0, 0.74, 0]} c={c0} />
          <B s={[0.86, 0.06, 0.86]} p={[0, 0.6, 0]} c={c0} />
          <B s={[0.6, 0.08, 0.6]} p={[0, 0.92, 0]} c={c0} />
          <Star p={[0, 0.74, 0.38]} size={0.09} c={c1} />
        </>
      );
    case "head-quepe":
      return (
        <>
          <B s={[0.68, 0.16, 0.68]} p={[0, 0.7, 0]} c={c0} />
          <B s={[0.8, 0.1, 0.8]} p={[0, 0.82, 0.02]} c={c0} />
          <B s={[0.6, 0.04, 0.26]} p={[0, 0.63, 0.44]} c="#111111" />
          <B s={[0.7, 0.04, 0.04]} p={[0, 0.66, 0.345]} c={c1} />
          <Star p={[0, 0.78, 0.415]} size={0.08} c={c1} />
        </>
      );
    default:
      return null;
  }
}

function TopDetails({ id }: { id: string }) {
  const c1 = color(id, 1);
  switch (id) {
    case "top-moletom-q":
      return (
        <>
          <Star p={[0, 0.06, 0.23]} size={0.12} c={c1} />
          <B s={[0.82, 0.08, 0.47]} p={[0, -0.36, 0]} c="#151515" shadow={false} />
        </>
      );
    case "top-camuflada":
      return (
        <>
          <B s={[0.22, 0.16, 0.02]} p={[-0.2, 0.18, 0.23]} c={c1} shadow={false} />
          <B s={[0.18, 0.2, 0.02]} p={[0.18, -0.12, 0.23]} c={color(id, 2)} shadow={false} />
          <B s={[0.16, 0.12, 0.02]} p={[0.2, 0.24, 0.23]} c={color(id, 2)} shadow={false} />
          <B s={[0.2, 0.14, 0.02]} p={[-0.16, -0.22, 0.23]} c={c1} shadow={false} />
          <B s={[0.82, 0.08, 0.47]} p={[0, -0.36, 0]} c="#2F3315" shadow={false} />
        </>
      );
    case "top-aviador":
      return (
        <>
          <B s={[0.5, 0.14, 0.48]} p={[0, 0.36, 0]} c={c1} shadow={false} />
          <B s={[0.04, 0.7, 0.02]} p={[0, -0.02, 0.235]} c="#3A2414" shadow={false} />
        </>
      );
    case "top-gala":
      return (
        <>
          {[0.22, 0.06, -0.1, -0.26].map((y) => (
            <B key={y} s={[0.06, 0.06, 0.02]} p={[0, y, 0.235]} c={c1} shadow={false} emissive={c1} />
          ))}
          <B s={[0.26, 0.05, 0.3]} p={[-0.4, 0.4, 0]} c={c1} shadow={false} />
          <B s={[0.26, 0.05, 0.3]} p={[0.4, 0.4, 0]} c={c1} shadow={false} />
          <B s={[0.82, 0.08, 0.47]} p={[0, -0.36, 0]} c={c1} shadow={false} />
        </>
      );
    case "top-oficial":
      return (
        <>
          <Star p={[-0.18, 0.18, 0.23]} size={0.09} c={c1} />
          <B s={[0.36, 0.08, 0.02]} p={[0.16, 0.2, 0.235]} c={c1} shadow={false} />
          <B s={[0.36, 0.04, 0.02]} p={[0.16, 0.1, 0.235]} c={c1} shadow={false} />
          <B s={[0.82, 0.1, 0.47]} p={[0, -0.35, 0]} c={c1} shadow={false} />
          <B s={[0.26, 0.05, 0.3]} p={[-0.4, 0.4, 0]} c={c1} shadow={false} />
          <B s={[0.26, 0.05, 0.3]} p={[0.4, 0.4, 0]} c={c1} shadow={false} />
        </>
      );
    case "top-avental":
      return (
        <>
          <B s={[0.6, 0.62, 0.02]} p={[0, -0.08, 0.235]} c={color(id, 0)} shadow={false} />
          <B s={[0.06, 0.2, 0.02]} p={[-0.2, 0.3, 0.235]} c={c1} shadow={false} />
          <B s={[0.06, 0.2, 0.02]} p={[0.2, 0.3, 0.235]} c={c1} shadow={false} />
          <B s={[0.04, 0.22, 0.04]} p={[0.18, -0.05, 0.26]} c="#00EBA8" shadow={false} />
        </>
      );
    default:
      return null;
  }
}

function BackItem({ id }: { id: string }) {
  const flag = useRef<THREE.Mesh>(null);
  const flame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flag.current) flag.current.rotation.y = Math.sin(t * 4) * 0.25;
    if (flame.current) flame.current.scale.y = 0.8 + Math.abs(Math.sin(t * 22)) * 0.5;
  });
  const c0 = color(id, 0);
  const c1 = color(id, 1);
  switch (id) {
    case "back-mochila":
      return (
        <>
          <B s={[0.56, 0.6, 0.24]} p={[0, 1.15, -0.34]} c={c0} />
          <B s={[0.4, 0.2, 0.06]} p={[0, 1.02, -0.48]} c={c1} />
        </>
      );
    case "back-lapis":
      return (
        <group position={[0, 1.2, -0.34]} rotation={[0, 0, 0.7]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 1.4, 6]} />
            <meshStandardMaterial color={c0} />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <coneGeometry args={[0.1, 0.24, 6]} />
            <meshStandardMaterial color={c1} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <coneGeometry args={[0.04, 0.08, 6]} />
            <meshStandardMaterial color={color(id, 2)} />
          </mesh>
          <mesh position={[0, -0.74, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.1, 6]} />
            <meshStandardMaterial color="#E58AA0" />
          </mesh>
        </group>
      );
    case "back-bandeira":
      return (
        <group position={[0.2, 1.2, -0.32]}>
          <B s={[0.05, 1.8, 0.05]} p={[0, 0.5, 0]} c="#3A2414" />
          <group position={[0, 1.2, 0]}>
            <mesh ref={flag} position={[0, 0, 0]}>
              <boxGeometry args={[0.02, 0.4, 0.6]} />
              <meshStandardMaterial color={c0} />
            </mesh>
          </group>
          <Star p={[0.03, 1.2, -0.3]} size={0.1} c={c1} r={[0, Math.PI / 2, 0]} />
        </group>
      );
    case "back-jetpack":
      return (
        <group position={[0, 1.15, -0.36]}>
          {[-0.15, 0.15].map((x) => (
            <mesh key={x} position={[x, 0, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.6, 8]} />
              <meshStandardMaterial color={c0} metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          <group ref={flame} position={[0, -0.36, 0]}>
            {[-0.15, 0.15].map((x) => (
              <mesh key={x} position={[x, -0.1, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.09, 0.26, 6]} />
                <meshBasicMaterial color={c1} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case "back-capa":
      return (
        <group position={[0, 1.5, -0.25]} rotation={[0.12, 0, 0]}>
          <B s={[0.8, 1.15, 0.04]} p={[0, -0.58, 0]} c={c0} emissive={c1} />
          <Star p={[0, -0.5, -0.04]} size={0.14} c={c1} r={[0, Math.PI, 0]} />
        </group>
      );
    default:
      return null;
  }
}

function Pet({ id }: { id: string }) {
  const g = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const rotors = useRef<THREE.Group>(null);
  const flying = id === "pet-drone" || id === "pet-aguia";
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current) g.current.position.y = flying ? 2.5 + Math.sin(t * 2) * 0.15 : Math.abs(Math.sin(t * 6)) * 0.08;
    if (wingL.current && wingR.current) {
      wingL.current.rotation.z = 0.3 + Math.sin(t * 10) * 0.5;
      wingR.current.rotation.z = -0.3 - Math.sin(t * 10) * 0.5;
    }
    if (rotors.current) rotors.current.rotation.y = t * 30;
  });
  const c0 = color(id, 0);
  const c1 = color(id, 1);
  if (id === "pet-none") return null;
  return (
    <group ref={g} position={flying ? [0.7, 2.5, -0.4] : [0.95, 0, -0.5]}>
      {id === "pet-cao" && (
        <>
          <B s={[0.32, 0.26, 0.55]} p={[0, 0.3, 0]} c={c0} />
          <B s={[0.3, 0.28, 0.3]} p={[0, 0.5, 0.3]} c={c0} />
          <B s={[0.14, 0.1, 0.14]} p={[0, 0.44, 0.48]} c="#2A1A10" />
          <B s={[0.32, 0.08, 0.32]} p={[0, 0.68, 0.3]} c={c1} />
          {[-0.1, 0.1].map((x) =>
            [-0.18, 0.18].map((z) => <B key={`${x}${z}`} s={[0.09, 0.18, 0.09]} p={[x, 0.09, z]} c={c0} />),
          )}
          <B s={[0.06, 0.06, 0.22]} p={[0, 0.42, -0.34]} r={[0.6, 0, 0]} c={c0} />
        </>
      )}
      {id === "pet-dalmata" && (
        <>
          {/* corpo e cabeça brancos */}
          <B s={[0.34, 0.28, 0.6]} p={[0, 0.32, 0]} c={c0} />
          <B s={[0.3, 0.3, 0.3]} p={[0, 0.54, 0.32]} c={c0} />
          {/* focinho, nariz e orelhas pretas */}
          <B s={[0.18, 0.12, 0.14]} p={[0, 0.47, 0.5]} c={c0} />
          <B s={[0.08, 0.06, 0.04]} p={[0, 0.51, 0.58]} c={c1} shadow={false} />
          <B s={[0.07, 0.18, 0.12]} p={[-0.17, 0.58, 0.3]} c={c1} />
          <B s={[0.07, 0.18, 0.12]} p={[0.17, 0.58, 0.3]} c={c1} />
          {/* olhos */}
          <B s={[0.04, 0.05, 0.02]} p={[-0.07, 0.6, 0.47]} c={c1} shadow={false} />
          <B s={[0.04, 0.05, 0.02]} p={[0.07, 0.6, 0.47]} c={c1} shadow={false} />
          {/* coleira vermelha */}
          <B s={[0.32, 0.06, 0.08]} p={[0, 0.42, 0.2]} c={color(id, 2)} shadow={false} />
          {/* manchas */}
          {[
            [0.171, 0.36, 0.12, 0.08],
            [-0.171, 0.3, -0.12, 0.1],
            [0.171, 0.26, -0.2, 0.07],
            [-0.171, 0.4, 0.15, 0.06],
            [0, 0.461, -0.05, 0.1],
            [0.09, 0.461, 0.18, 0.06],
            [-0.08, 0.691, 0.34, 0.06],
          ].map(([x, y, z, sz], k) => (
            <B key={k} s={[Math.abs(x) > 0.1 ? 0.01 : sz, Math.abs(x) > 0.1 ? sz : 0.01, sz]} p={[x, y, z]} c={c1} shadow={false} />
          ))}
          {/* patas e rabo */}
          {[-0.1, 0.1].map((x) =>
            [-0.2, 0.2].map((z) => <B key={`${x}${z}`} s={[0.09, 0.2, 0.09]} p={[x, 0.1, z]} c={c0} />),
          )}
          <B s={[0.06, 0.06, 0.24]} p={[0, 0.44, -0.36]} r={[0.7, 0, 0]} c={c0} />
        </>
      )}
      {id === "pet-pato" && (
        <>
          <B s={[0.34, 0.26, 0.42]} p={[0, 0.16, 0]} c={c0} />
          <B s={[0.24, 0.24, 0.24]} p={[0, 0.4, 0.12]} c={c0} />
          <B s={[0.16, 0.06, 0.14]} p={[0, 0.36, 0.3]} c={c1} />
          <B s={[0.04, 0.04, 0.02]} p={[0.07, 0.45, 0.24]} c="#111" shadow={false} />
          <B s={[0.04, 0.04, 0.02]} p={[-0.07, 0.45, 0.24]} c="#111" shadow={false} />
        </>
      )}
      {id === "pet-drone" && (
        <>
          <B s={[0.36, 0.1, 0.36]} p={[0, 0, 0]} c={c0} />
          <B s={[0.12, 0.08, 0.04]} p={[0, -0.02, 0.2]} c={c1} emissive={c1} />
          <group ref={rotors}>
            {[
              [-0.24, -0.24],
              [0.24, -0.24],
              [-0.24, 0.24],
              [0.24, 0.24],
            ].map(([x, z]) => (
              <B key={`${x}${z}`} s={[0.24, 0.02, 0.04]} p={[x, 0.08, z]} c="#bbbbbb" shadow={false} />
            ))}
          </group>
        </>
      )}
      {id === "pet-aguia" && (
        <>
          <B s={[0.26, 0.24, 0.42]} p={[0, 0, 0]} c={c0} />
          <B s={[0.22, 0.22, 0.22]} p={[0, 0.16, 0.24]} c={c1} />
          <B s={[0.08, 0.06, 0.12]} p={[0, 0.12, 0.38]} c="#00EBA8" />
          <mesh ref={wingL} position={[-0.14, 0.04, 0]}>
            <boxGeometry args={[0.5, 0.04, 0.3]} />
            <meshStandardMaterial color={c0} />
          </mesh>
          <mesh ref={wingR} position={[0.14, 0.04, 0]}>
            <boxGeometry args={[0.5, 0.04, 0.3]} />
            <meshStandardMaterial color={c0} />
          </mesh>
        </>
      )}
    </group>
  );
}

const FX_COUNT = 14;
function Effect({ id }: { id: string }) {
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(() => Array.from({ length: FX_COUNT }, (_, k) => ((k * 7919) % 97) / 97), []);
  const colors = useMemo(() => {
    const cs = [color(id, 0), color(id, 1), color(id, 2), color(id, 3)].filter(Boolean);
    return Array.from({ length: FX_COUNT }, (_, k) => cs[k % cs.length]);
  }, [id]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    g.children.forEach((m, k) => {
      const s = seeds[k];
      if (id === "fx-pixels") {
        const a = t * 1.4 + (k / FX_COUNT) * Math.PI * 2;
        m.position.set(Math.cos(a) * 0.85, 0.6 + ((k % 4) * 0.4 + Math.sin(t * 2 + k)) * 0.35, Math.sin(a) * 0.85);
        m.rotation.set(t + k, t * 1.3, 0);
      } else if (id === "fx-faiscas") {
        const life = (t * 0.8 + s) % 1;
        const a = s * 20;
        m.position.set(Math.cos(a) * 0.5, life * 2.6, Math.sin(a) * 0.5);
        m.scale.setScalar(1 - life);
      } else if (id === "fx-confete") {
        const life = (t * 0.35 + s) % 1;
        const a = s * 40 + t * 0.3;
        m.position.set(Math.cos(a) * 0.9, 3 - life * 3, Math.sin(a) * 0.9);
        m.rotation.set(t * 3 + k, t * 2, k);
      } else if (id === "fx-aura") {
        const life = (t * 0.5 + s) % 1;
        const a = s * 30 + t;
        m.position.set(Math.cos(a) * 0.65, life * 2.4, Math.sin(a) * 0.65);
        m.scale.setScalar(1 - life * 0.8);
      }
    });
  });
  if (id === "fx-none") return null;
  const size = id === "fx-confete" ? 0.09 : 0.08;
  return (
    <>
      <group ref={group}>
        {colors.map((c, k) => (
          <mesh key={k}>
            <boxGeometry args={[size, size, id === "fx-confete" ? 0.02 : size]} />
            <meshBasicMaterial color={c} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {id === "fx-aura" && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.95, 32]} />
          <meshBasicMaterial color="#00EBA8" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      )}
    </>
  );
}

export interface BlockAvatarProps {
  avatar: Avatar;
  getWalking?: () => boolean;
  emote?: Emote | null;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  /** pose estática (pódio, prévia) */
  pose?: "idle" | "victory";
}

function BlockAvatarImpl({ avatar, getWalking, emote, onClick, pose = "idle" }: BlockAvatarProps) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const emoteStart = useRef(-1);
  const walkPhase = useRef(0);

  useEffect(() => {
    emoteStart.current = -1;
  }, [emote]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const walking = getWalking?.() ?? false;
    if (walking) walkPhase.current += dt * 11;
    const sw = walking ? Math.sin(walkPhase.current) * 0.75 : 0;

    let aL = { x: -sw, z: -0.05 };
    let aR = { x: sw, z: 0.05 };
    let bodyY = walking ? Math.abs(Math.sin(walkPhase.current)) * 0.06 : Math.sin(t * 2) * 0.015;
    let bodyRy = 0;
    let headX = 0;

    if (pose === "victory") {
      aL = { x: 0, z: -2.7 - Math.sin(t * 3) * 0.15 };
      aR = { x: 0, z: 2.7 + Math.sin(t * 3) * 0.15 };
      bodyY = Math.abs(Math.sin(t * 3)) * 0.1;
    }

    if (emote) {
      if (emoteStart.current < 0) emoteStart.current = t;
      const et = t - emoteStart.current;
      if (et < EMOTE_DURATION) {
        switch (emote.kind) {
          case "punch":
            if (et < 0.4) {
              aR = { x: -1.6, z: -0.1 };
              aL = { x: -0.5, z: -0.05 };
              bodyRy = -0.4;
            }
            break;
          case "wave":
            aR = { x: 0, z: 2.7 + Math.sin(et * 14) * 0.35 };
            break;
          case "salute":
            aR = { x: -2.2, z: -0.5 };
            headX = -0.05;
            break;
          case "dance":
            bodyRy = Math.sin(et * 8) * 0.5;
            bodyY = Math.abs(Math.sin(et * 8)) * 0.18;
            aL = { x: 0, z: -2.4 + Math.sin(et * 8) * 0.5 };
            aR = { x: 0, z: 2.4 + Math.sin(et * 8) * 0.5 };
            break;
          case "clap": {
            const c = Math.sin(et * 18) * 0.35;
            aL = { x: -1.35, z: 0.35 + c };
            aR = { x: -1.35, z: -0.35 - c };
            break;
          }
          case "heart":
            aL = { x: -2.6, z: 0.5 };
            aR = { x: -2.6, z: -0.5 };
            headX = 0.1;
            break;
        }
      }
    }

    const k = 1 - Math.pow(0.0001, dt);
    const lerp = (a: number, b: number) => a + (b - a) * k;
    if (legL.current && legR.current) {
      legL.current.rotation.x = lerp(legL.current.rotation.x, sw);
      legR.current.rotation.x = lerp(legR.current.rotation.x, -sw);
    }
    if (armL.current && armR.current) {
      armL.current.rotation.x = lerp(armL.current.rotation.x, aL.x);
      armL.current.rotation.z = lerp(armL.current.rotation.z, aL.z);
      armR.current.rotation.x = lerp(armR.current.rotation.x, aR.x);
      armR.current.rotation.z = lerp(armR.current.rotation.z, aR.z);
    }
    if (body.current) {
      body.current.position.y = lerp(body.current.position.y, bodyY);
      body.current.rotation.y = lerp(body.current.rotation.y, bodyRy);
    }
    if (head.current) head.current.rotation.x = lerp(head.current.rotation.x, headX);
  });

  const skin = color(avatar.skin);
  const top = color(avatar.top);
  const sleeve = top;
  const bottom = color(avatar.bottom);
  const hair = color(avatar.hairColor);
  const shoe = avatar.bottom === "bot-cargo" ? "#2A2A1A" : "#1A1A1A";

  return (
    <group ref={root} onClick={onClick}>
      <group ref={body}>
        {/* Pernas */}
        {[
          [legL, -0.19],
          [legR, 0.19],
        ].map(([ref, x]) => (
          <group key={x as number} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.78, 0]}>
            <B s={[0.34, 0.66, 0.36]} p={[0, -0.33, 0]} c={bottom} />
            <B s={[0.36, 0.14, 0.42]} p={[0, -0.71, 0.03]} c={shoe} />
            {avatar.bottom === "bot-gala" && <B s={[0.04, 0.62, 0.02]} p={[x as number > 0 ? 0.16 : -0.16, -0.33, 0]} c="#00EBA8" shadow={false} />}
          </group>
        ))}
        {/* Tronco */}
        <group position={[0, 1.18, 0]}>
          <B s={[0.82, 0.8, 0.46]} p={[0, 0, 0]} c={top} />
          <TopDetails id={avatar.top} />
        </group>
        {/* Braços */}
        {[
          [armL, -0.55],
          [armR, 0.55],
        ].map(([ref, x]) => (
          <group key={x as number} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 1.52, 0]}>
            <B s={[0.27, 0.62, 0.3]} p={[0, -0.28, 0]} c={sleeve} />
            <B s={[0.25, 0.18, 0.28]} p={[0, -0.68, 0]} c={skin} />
          </group>
        ))}
        {/* Cabeça */}
        <group ref={head} position={[0, 1.56, 0]}>
          <B s={[0.62, 0.62, 0.62]} p={[0, 0.33, 0]} c={skin} />
          <B s={[0.09, 0.11, 0.02]} p={[-0.13, 0.38, 0.315]} c="#111111" shadow={false} />
          <B s={[0.09, 0.11, 0.02]} p={[0.13, 0.38, 0.315]} c="#111111" shadow={false} />
          <B s={[0.2, 0.05, 0.02]} p={[0, 0.2, 0.315]} c="#5A2A1A" shadow={false} />
          <Makeup id={avatar.makeup} />
          <Hair style={avatar.hair} c={hair} />
          <HeadGear id={avatar.head} />
        </group>
        <BackItem id={avatar.back} />
      </group>
      <Pet id={avatar.pet} />
      <Effect id={avatar.effect} />
    </group>
  );
}

export const BlockAvatar = memo(BlockAvatarImpl);

// ---------- LowAvatar: 4 caixas, geometria e materiais compartilhados ----------
const lowGeo = new THREE.BoxGeometry(1, 1, 1);
const lowMats = new Map<string, THREE.MeshLambertMaterial>();
function lowMat(c: string) {
  let m = lowMats.get(c);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c });
    lowMats.set(c, m);
  }
  return m;
}

function LowAvatarImpl({ avatar, onClick }: { avatar: Avatar; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const skin = lowMat(color(avatar.skin));
  return (
    <group onClick={onClick}>
      <mesh geometry={lowGeo} material={lowMat(color(avatar.bottom))} position={[0, 0.4, 0]} scale={[0.72, 0.8, 0.38]} />
      <mesh geometry={lowGeo} material={lowMat(color(avatar.top))} position={[0, 1.18, 0]} scale={[1.36, 0.8, 0.46]} />
      <mesh geometry={lowGeo} material={skin} position={[0, 1.89, 0]} scale={[0.62, 0.62, 0.62]} />
      <mesh geometry={lowGeo} material={lowMat(color(avatar.hairColor))} position={[0, 2.24, -0.04]} scale={[0.66, 0.14, 0.66]} />
    </group>
  );
}
export const LowAvatar = memo(LowAvatarImpl);
