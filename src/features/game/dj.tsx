"use client";

import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { BRAND, useCanvasTexture } from "./landmarks";
import { DANCE } from "./world";

/** Cabine de DJ no fundo da pista. O DJ fica atrás da mesa, de frente para a câmera. */
export const DJ_SPOT = { x: DANCE.x, z: DANCE.z - 6.5, ry: 0 };
export const DJ_STALE_MS = 12_000;
export const DJ_BEAT_MS = 4_000;

export const DJ_FX = [
  { id: "airhorn", label: "Buzina", icon: "📯" },
  { id: "scratch", label: "Scratch", icon: "💿" },
  { id: "laser", label: "Laser", icon: "⚡" },
  { id: "boom", label: "Explosão", icon: "💥" },
] as const;
export type DjFx = (typeof DJ_FX)[number]["id"];

const LABEL_Z: [number, number] = [16, 0];
const noRaycast = () => null;

function Deck({ x, spin }: { x: number; spin: boolean }) {
  const disc = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (disc.current && spin) disc.current.rotation.y += dt * 4;
  });
  return (
    <group position={[x, 1.36, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 0.1, 1]} />
        <meshStandardMaterial color="#2A2A29" />
      </mesh>
      <group ref={disc} position={[0, 0.08, 0]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.42, 0.04, 28]} />
          <meshStandardMaterial color="#0B0B0B" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.02, 16]} />
          <meshStandardMaterial color={BRAND.mint} emissive={BRAND.mint} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.26, 0.03, 0]}>
          <boxGeometry args={[0.12, 0.01, 0.03]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>
    </group>
  );
}

export function DjBooth({ djName, canClaim, onClick }: { djName: string | null; canClaim: boolean; onClick: () => void }) {
  const led = useRef<THREE.Mesh>(null);
  const active = !!djName;
  useFrame(({ clock }) => {
    if (!led.current) return;
    const m = led.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = active ? 0.7 + Math.abs(Math.sin(clock.elapsedTime * 6)) : 0.35;
  });
  const sign = useCanvasTexture({
    width: 768,
    height: 180,
    bg: BRAND.black,
    draw: (g, f) => {
      g.fillStyle = BRAND.mint;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `110px ${f.display}`;
      g.fillText("QUARTEL DJ", 384, 96);
    },
  });
  return (
    <group
      position={[DANCE.x, 0.22, DANCE.z - 5.2]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {/* mesa */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[5, 1.3, 1.2]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {sign && (
        <mesh position={[0, 0.72, 0.61]} raycast={noRaycast}>
          <planeGeometry args={[3.6, 0.84]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      )}
      <mesh ref={led} position={[0, 0.16, 0.61]} raycast={noRaycast}>
        <boxGeometry args={[5, 0.07, 0.02]} />
        <meshStandardMaterial color={BRAND.mint} emissive={BRAND.mint} />
      </mesh>
      <Deck x={-1.6} spin={active} />
      <Deck x={1.6} spin={active} />
      {/* mixer */}
      <mesh position={[0, 1.38, 0]}>
        <boxGeometry args={[1.2, 0.14, 0.9]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {[-0.35, 0, 0.35].map((x) => (
        <mesh key={x} position={[x, 1.48, 0.1]}>
          <boxGeometry args={[0.12, 0.06, 0.3]} />
          <meshStandardMaterial color={BRAND.orange} emissive={BRAND.orange} emissiveIntensity={active ? 0.8 : 0.2} />
        </mesh>
      ))}
      {canClaim && !active && (
        <Html position={[0, 2.5, 0]} center zIndexRange={LABEL_Z}>
          <button
            onClick={onClick}
            className="animate-bounce whitespace-nowrap rounded-xl border-[3px] border-black bg-[#00EBA8] px-3 py-2 font-display text-base text-black shadow-[3px_3px_0_#0a0a0a] active:translate-y-[2px] active:shadow-none compact:rounded-lg compact:border-2 compact:px-2 compact:py-1 compact:text-xs compact:shadow-none"
          >
            🎧 Assumir as pick-ups
          </button>
        </Html>
      )}
      {active && (
        <Html position={[0, 3.9, -1.3]} center zIndexRange={LABEL_Z} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full border-2 border-black bg-[#00EBA8] px-2 font-display text-sm text-black compact:text-[10px]">🎧 DJ {djName}</div>
        </Html>
      )}
    </group>
  );
}
