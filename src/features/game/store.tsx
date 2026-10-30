"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { BRAND, ShopHint, ShopSign } from "./landmarks";
import { LANDMARKS } from "./world";

/**
 * Tech Store: vitrine de produtos Apple. A compra acontece na loja oficial Apple do
 * Mercado Livre, com link de afiliado (ver affiliate-links.ts).
 * Não usamos a marca/logo da Apple nem nos apresentamos como representante oficial.
 */
export interface StoreProduct {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
}

export const PRODUCTS: StoreProduct[] = [
  { id: "iphone", name: "iPhone", blurb: "O celular da Apple, em vários modelos e cores.", emoji: "📱" },
  { id: "macbook-air", name: "MacBook Air", blurb: "Notebook leve para criar em qualquer lugar.", emoji: "💻" },
  { id: "macbook-pro", name: "MacBook Pro", blurb: "Potência para design, vídeo e 3D.", emoji: "💻" },
  { id: "imac", name: "iMac", blurb: "O desktop tudo-em-um, clássico de agência.", emoji: "🖥️" },
  { id: "ipad", name: "iPad", blurb: "Tela para desenhar, apresentar e rascunhar.", emoji: "📲" },
  { id: "watch", name: "Apple Watch", blurb: "Relógio inteligente para o dia a dia.", emoji: "⌚" },
  { id: "airpods", name: "AirPods", blurb: "Fones sem fio para o foco no job.", emoji: "🎧" },
];

const LABEL_Z: [number, number] = [16, 0];
/** vidro, teto e colunas não capturam o clique (o clique vai para o produto) */
const noRaycast = () => null;
const WOOD = "#D8B88C";
const ALU = "#C9CCD1";
const SPACE = "#3A3D42";

function screenColor(id: string) {
  return { iphone: "#5B7CFA", "macbook-air": "#7BD3EA", "macbook-pro": "#A78BFA", imac: "#FF8A5B", ipad: "#00EBA8", watch: "#FF5A8A", airpods: "#FFFFFF" }[id] ?? "#888";
}

function Product({ p, onPick }: { p: StoreProduct; onPick: (p: StoreProduct) => void }) {
  const [hover, setHover] = useState(false);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const target = hover ? 1.12 : 1;
    g.current.scale.setScalar(g.current.scale.x + (target - g.current.scale.x) * Math.min(1, dt * 10));
  });
  const events = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHover(true);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      setHover(false);
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onPick(p);
    },
  };
  const scr = screenColor(p.id);
  const screen = <meshStandardMaterial color={scr} emissive={scr} emissiveIntensity={hover ? 0.9 : 0.45} />;
  return (
    <group ref={g} {...events}>
      {p.id === "iphone" && (
        <group rotation={[-0.35, 0, 0]} position={[0, 0.42, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.78, 0.05]} />
            <meshStandardMaterial color={SPACE} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.027]}>
            <planeGeometry args={[0.34, 0.72]} />
            {screen}
          </mesh>
        </group>
      )}
      {(p.id === "macbook-air" || p.id === "macbook-pro") && (
        <group position={[0, 0.03, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.25, 0.05, 0.85]} />
            <meshStandardMaterial color={p.id === "macbook-pro" ? SPACE : ALU} metalness={0.6} roughness={0.3} />
          </mesh>
          <group position={[0, 0.02, -0.42]} rotation={[-0.25, 0, 0]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[1.25, 0.82, 0.03]} />
              <meshStandardMaterial color={p.id === "macbook-pro" ? SPACE : ALU} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.42, 0.017]}>
              <planeGeometry args={[1.15, 0.72]} />
              {screen}
            </mesh>
          </group>
        </group>
      )}
      {p.id === "imac" && (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.6, 0.03, 0.4]} />
            <meshStandardMaterial color={ALU} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.35, -0.1]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.35, 0.65, 0.04]} />
            <meshStandardMaterial color={ALU} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[1.6, 1.05, 0.06]} />
            <meshStandardMaterial color="#FF8A5B" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.0, 0.031]}>
            <planeGeometry args={[1.5, 0.84]} />
            <meshStandardMaterial color="#1A1A2E" emissive="#3B4BFF" emissiveIntensity={hover ? 0.6 : 0.3} />
          </mesh>
        </group>
      )}
      {p.id === "ipad" && (
        <group rotation={[-0.5, 0, 0]} position={[0, 0.55, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 1.15, 0.04]} />
            <meshStandardMaterial color={ALU} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[0.77, 1.05]} />
            {screen}
          </mesh>
        </group>
      )}
      {p.id === "watch" && (
        <group position={[0, 0.25, 0]} rotation={[-0.3, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.16, 0.5, 0.04]} />
            <meshStandardMaterial color="#FF5A8A" />
          </mesh>
          <mesh position={[0, 0, 0.04]} castShadow>
            <boxGeometry args={[0.24, 0.28, 0.08]} />
            <meshStandardMaterial color={SPACE} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.081]}>
            <planeGeometry args={[0.2, 0.24]} />
            {screen}
          </mesh>
        </group>
      )}
      {p.id === "airpods" && (
        <group position={[0, 0.14, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.32, 0.26, 0.14]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0.071]}>
            <boxGeometry args={[0.3, 0.01, 0.002]} />
            <meshStandardMaterial color="#DDD" />
          </mesh>
        </group>
      )}
      {/* área de clique generosa */}
      <mesh position={[0, 0.5, 0]} visible={false}>
        <boxGeometry args={[1.4, 1.4, 1.2]} />
        <meshBasicMaterial />
      </mesh>
      {hover && (
      <Html position={[0, p.id === "imac" ? 1.85 : 1.25, 0]} center zIndexRange={LABEL_Z} style={{ pointerEvents: "none" }}>
        <div
          className={`whitespace-nowrap rounded-full border-2 border-black px-2 font-game text-[11px] font-bold leading-5 transition-colors ${
            hover ? "bg-[#00EBA8] text-black" : "bg-white text-black"
          }`}
        >
          {p.name} ↗
        </div>
      </Html>
      )}
    </group>
  );
}

export function TechStore({ onPick }: { onPick: (p: StoreProduct) => void }) {
  const L = LANDMARKS.find((l) => l.id === "loja")!;
  const W = 15;
  const D = 10;

  // mesas: 2 longas, produtos em fila
  const tables = [
    { z: -1.6, items: PRODUCTS.slice(0, 4) },
    { z: 1.8, items: PRODUCTS.slice(4) },
  ];
  return (
    <group position={[L.x, 0, L.z]}>
      {/* piso claro */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[W, 0.12, D]} />
        <meshStandardMaterial color="#F1F1EF" />
      </mesh>
      {/* paredes de vidro (frente aberta, virada para o centro do mapa) */}
      {[
        { p: [0, 2.2, -D / 2] as [number, number, number], s: [W, 4.2, 0.08] as [number, number, number] },
        { p: [-W / 2, 2.2, 0] as [number, number, number], s: [0.08, 4.2, D] as [number, number, number] },
        { p: [W / 2, 2.2, 0] as [number, number, number], s: [0.08, 4.2, D] as [number, number, number] },
      ].map((w, k) => (
        <mesh key={k} position={w.p} raycast={noRaycast}>
          <boxGeometry args={w.s} />
          <meshStandardMaterial color="#CFE8F3" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      ))}
      {/* colunas e teto */}
      {[
        [-W / 2, -D / 2],
        [W / 2, -D / 2],
        [-W / 2, D / 2],
        [W / 2, D / 2],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 2.2, z]} castShadow raycast={noRaycast}>
          <boxGeometry args={[0.3, 4.4, 0.3]} />
          <meshStandardMaterial color="#E6E6E6" />
        </mesh>
      ))}
      {/* moldura do teto + claraboia de vidro (a câmera vê os produtos por cima) */}
      {[
        { p: [0, 4.45, -D / 2] as [number, number, number], s: [W + 0.6, 0.3, 0.6] as [number, number, number] },
        { p: [0, 4.45, D / 2] as [number, number, number], s: [W + 0.6, 0.3, 0.6] as [number, number, number] },
        { p: [-W / 2, 4.45, 0] as [number, number, number], s: [0.6, 0.3, D + 0.6] as [number, number, number] },
        { p: [W / 2, 4.45, 0] as [number, number, number], s: [0.6, 0.3, D + 0.6] as [number, number, number] },
      ].map((b, k) => (
        <mesh key={k} position={b.p} castShadow raycast={noRaycast}>
          <boxGeometry args={b.s} />
          <meshStandardMaterial color="#FAFAFA" />
        </mesh>
      ))}
      <mesh position={[0, 4.5, 0]} raycast={noRaycast}>
        <boxGeometry args={[W, 0.05, D]} />
        <meshStandardMaterial color="#DFF3FA" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <ShopSign
        title="TECH STORE"
        subtitle="produtos Apple · via Mercado Livre"
        tag="📱 TECH STORE · PRODUTOS APPLE"
        bg="#FAFAFA"
        fg="#111111"
        accent={BRAND.mint}
        z={-D / 2 - 0.6}
      />
      {/* mesas de madeira com produtos */}
      {tables.map((t) => (
        <group key={t.z} position={[0, 0, t.z]}>
          <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
            <boxGeometry args={[W - 3, 0.1, 1.6]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
          {[-(W - 4) / 2, (W - 4) / 2].map((x) => (
            <mesh key={x} position={[x, 0.47, 0]}>
              <boxGeometry args={[0.15, 0.9, 1.3]} />
              <meshStandardMaterial color={WOOD} />
            </mesh>
          ))}
          {t.items.map((p, k) => (
            <group key={p.id} position={[(k - (t.items.length - 1) / 2) * 2.8, 1.0, 0]}>
              <Product p={p} onPick={onPick} />
            </group>
          ))}
        </group>
      ))}
      <pointLight position={[0, 3.6, 0]} color="#FFFFFF" intensity={14} distance={14} />
      <ShopHint text="Clique num produto para comprar" z={D / 2 + 0.6} y={2.8} />
      <mesh position={[0, 0.13, D / 2 + 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 1.6]} />
        <meshStandardMaterial color={BRAND.graphite} />
      </mesh>
    </group>
  );
}
