"use client";

import { Suspense, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BRAND, ShopHint, ShopSign } from "./landmarks";
import { SHOP_SUPPLEMENTS, type Supplement } from "./supplements-data";
import { LANDMARKS } from "./world";

/** Loja de suplementos Maxme Bio: os links levam ao site oficial já com o cupom QUARTEL. */
const LABEL_Z: [number, number] = [16, 0];
const noRaycast = () => null;

function Photo({ src }: { src: string }) {
  const tex = useTexture(src, (t) => {
    const tt = Array.isArray(t) ? t[0] : t;
    tt.colorSpace = THREE.SRGBColorSpace;
    tt.anisotropy = 4;
  });
  return (
    <mesh position={[0, 0.78, 0.051]}>
      <planeGeometry args={[1.18, 1.18]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/** Expositor: foto do produto num totem com a cor da embalagem. */
function Display({ p, onPick }: { p: Supplement; onPick: (p: Supplement) => void }) {
  const [hover, setHover] = useState(false);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const target = hover ? 1.12 : 1;
    g.current.scale.setScalar(g.current.scale.x + (target - g.current.scale.x) * Math.min(1, dt * 10));
  });
  return (
    <group
      ref={g}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onPick(p);
      }}
    >
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[1.32, 1.32, 0.1]} />
        <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={hover ? 0.5 : 0.15} />
      </mesh>
      <Suspense fallback={null}>
        <Photo src={p.image} />
      </Suspense>
      <mesh position={[0, 0.06, -0.15]}>
        <boxGeometry args={[0.5, 0.12, 0.4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {hover && (
      <Html position={[0, 1.7, 0]} center zIndexRange={LABEL_Z} style={{ pointerEvents: "none" }}>
        <div
          className={`whitespace-nowrap rounded-full border-2 border-black px-2 font-game text-[11px] font-bold leading-5 ${
            hover ? "bg-[#00EBA8] text-black" : "bg-white text-black"
          }`}
        >
          {p.short} ↗
        </div>
      </Html>
      )}
    </group>
  );
}

export function SupplementShop({ onPick }: { onPick: (p: Supplement) => void }) {
  const L = LANDMARKS.find((l) => l.id === "suplementos")!;
  const W = 15;
  const D = 8;

  const row1 = SHOP_SUPPLEMENTS.slice(0, Math.ceil(SHOP_SUPPLEMENTS.length / 2));
  const row2 = SHOP_SUPPLEMENTS.slice(row1.length);
  return (
    <group position={[L.x, 0, L.z]}>
      {/* piso */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[W, 0.12, D]} />
        <meshStandardMaterial color="#EDEDEA" />
      </mesh>
      {/* toldo listrado preso na parede do fundo (não cobre os produtos) */}
      {Array.from({ length: 10 }, (_, k) => (
        <mesh key={k} position={[-W / 2 + (k + 0.5) * (W / 10), 5.0, -D / 2 + 0.9]} rotation={[0.45, 0, 0]} raycast={noRaycast} castShadow>
          <boxGeometry args={[W / 10, 0.08, 1.8]} />
          <meshStandardMaterial color={k % 2 ? BRAND.white : BRAND.mint} />
        </mesh>
      ))}
      {/* parede do fundo com prateleiras */}
      <mesh position={[0, 2.4, -D / 2 + 0.2]} raycast={noRaycast} receiveShadow>
        <boxGeometry args={[W, 4.8, 0.3]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>

      {/* balcões com os potes */}
      {[
        { z: -1.4, items: row1 },
        { z: 1.6, items: row2 },
      ].map((r) => (
        <group key={r.z} position={[0, 0, r.z]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[W - 2.5, 0.9, 1.4]} />
            <meshStandardMaterial color={BRAND.graphite} />
          </mesh>
          <mesh position={[0, 0.97, 0.71]}>
            <boxGeometry args={[W - 2.5, 0.06, 0.04]} />
            <meshStandardMaterial color={BRAND.mint} emissive={BRAND.mint} emissiveIntensity={0.7} />
          </mesh>
          {r.items.map((p, k) => (
            <group key={p.id} position={[(k - (r.items.length - 1) / 2) * 2.3, 0.95, 0]}>
              <Display p={p} onPick={onPick} />
            </group>
          ))}
        </group>
      ))}
      <pointLight position={[0, 3.4, 0.5]} color="#FFFFFF" intensity={12} distance={12} />
      <ShopHint text="Clique num produto · 20% OFF com cupom" z={D / 2 + 0.4} y={2.6} />
      <ShopSign
        title="SUPLEMENTOS MAXME BIO"
        subtitle="cupom QUARTEL · 20% OFF no link"
        tag="💪 SUPLEMENTOS MAXME BIO · 20% OFF"
        bg="#111111"
        fg={BRAND.white}
        accent={BRAND.mint}
        z={-D / 2 - 0.6}
      />
    </group>
  );
}
