"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BRAND, useCanvasTexture } from "./landmarks";
import { WORLD_RADIUS } from "./world";

/**
 * Outdoors com fotos reais da Quartel. Mantenha nomes de arquivo fixos em
 * /public/billboards para trocar a arte sem mexer no código.
 */
export const BILLBOARDS = [
  { id: "sobre", src: "/billboards/quartel-2.jpg", label: "Conheça a Quartel", url: "https://quarteldesign.com/sobre-nos", angle: 1.35 },
  { id: "portfolio", src: "/billboards/quartel-4.jpg", label: "Veja nossos cases", url: "https://quarteldesign.com/portfolio", angle: 1.95 },
  { id: "servicos", src: "/billboards/quartel-3.jpg", label: "Nossos serviços", url: "https://quarteldesign.com/servicos", angle: 2.6 },
  { id: "contato", src: "/billboards/quartel-5.jpg", label: "Bora fazer um projeto?", url: "https://quarteldesign.com/contato", angle: -2.6 },
  { id: "recrutamento", src: "/billboards/quartel-6.jpg", label: "Aliste-se: trabalhe com a gente", url: "https://quarteldesign.com/recrutamento", angle: -2.15 },
  { id: "blog", src: "/billboards/quartel-2.jpg", label: "Leia o blog da Quartel", url: "https://quarteldesign.com/blog", angle: -1.0 },
] as const;

export function billboardHref(url: string, campaign: string) {
  const u = new URL(url);
  u.searchParams.set("utm_source", "quartel-world");
  u.searchParams.set("utm_medium", "portal");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

function Billboard({ b }: { b: (typeof BILLBOARDS)[number] }) {
  const tex = useTexture(b.src, (t) => {
    const tt = Array.isArray(t) ? t[0] : t;
    tt.colorSpace = THREE.SRGBColorSpace;
    tt.anisotropy = 4;
  });
  const [hover, setHover] = useState(false);
  const panel = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = panel.current;
    if (!g) return;
    const target = hover ? 1.04 : 1;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * Math.min(1, dt * 12));
  });

  const r = WORLD_RADIUS - 3.5;
  const x = Math.sin(b.angle) * r;
  const z = Math.cos(b.angle) * r;
  const ry = b.angle + Math.PI; // virado para o centro
  const W = 9;
  const H = (W * 9) / 16;

  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      {[-3, 3].map((lx) => (
        <mesh key={lx} position={[lx, 2.4, -0.3]} castShadow>
          <boxGeometry args={[0.35, 4.8, 0.35]} />
          <meshStandardMaterial color={BRAND.black} />
        </mesh>
      ))}
      <group ref={panel} position={[0, 4.8 + H / 2, 0]} rotation={[-0.08, 0, 0]}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            window.open(billboardHref(b.url, b.id), "_blank", "noopener,noreferrer");
          }}
        >
          <boxGeometry args={[W + 0.7, H + 0.7, 0.3]} />
          <meshStandardMaterial
            color={hover ? BRAND.mint : BRAND.black}
            emissive={hover ? BRAND.mint : "#000"}
            emissiveIntensity={hover ? 0.4 : 0}
          />
        </mesh>
        <mesh position={[0, 0, 0.16]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        {/* faixa com a chamada */}
        <BillboardLabel text={b.label} y={-H / 2 - 0.05} width={W + 0.7} />
        {/* refletores */}
        {[-2.5, 2.5].map((lx) => (
          <group key={lx} position={[lx, H / 2 + 0.6, 0.7]} rotation={[0.9, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.5, 0.25, 0.35]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.4, 0.02, 0.25]} />
              <meshBasicMaterial color="#FFF6D0" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}


function BillboardLabel({ text, y, width }: { text: string; y: number; width: number }) {
  const tex = useCanvasTexture({
    width: 1024,
    height: 112,
    bg: BRAND.mint,
    draw: (g, f) => {
      g.fillStyle = BRAND.black;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const label = `${text.toUpperCase()}  →`;
      let size = 64;
      do {
        g.font = `${size}px ${f.display}`;
        size -= 4;
      } while (g.measureText(label).width > 960 && size > 24);
      g.fillText(label, 512, 60);
    },
  });
  if (!tex) return null;
  return (
    <mesh position={[0, y - 0.45, 0.17]}>
      <planeGeometry args={[width, width * (112 / 1024)]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export function Billboards() {
  return (
    <>
      {BILLBOARDS.map((b) => (
        <Billboard key={b.id} b={b} />
      ))}
    </>
  );
}
