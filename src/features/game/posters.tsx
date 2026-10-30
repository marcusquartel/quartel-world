"use client";

import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BRAND } from "./landmarks";
import { WORLD_SCALE as S } from "./world";

/**
 * Avenida dos Cartazes: os cartazes da campanha Quartel em totens iluminados,
 * dos dois lados do caminho entre a praça central e o QG.
 */
const POSTERS = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => `/posters/cartaz-${k}.jpg`);
const W = 2.3;
const H = W * (900 / 642);

function Totem({ src, x, z, ry }: { src: string; x: number; z: number; ry: number }) {
  const tex = useTexture(src, (t) => {
    const tt = Array.isArray(t) ? t[0] : t;
    tt.colorSpace = THREE.SRGBColorSpace;
    tt.anisotropy = 4;
  });
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.6, 0.3, 0.8]} />
        <meshStandardMaterial color={BRAND.black} />
      </mesh>
      <mesh position={[0, 0.3 + H / 2 + 0.25, 0]} castShadow>
        <boxGeometry args={[W + 0.3, H + 0.5, 0.35]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* frente e verso com o cartaz (caixa de luz) */}
      {[0.18, -0.18].map((dz) => (
        <mesh key={dz} position={[0, 0.3 + H / 2 + 0.25, dz]} rotation={[0, dz > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.3 + H + 0.55, 0]}>
        <boxGeometry args={[W + 0.3, 0.08, 0.36]} />
        <meshStandardMaterial color={BRAND.mint} emissive={BRAND.mint} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

export function PosterAvenue() {
  // 4 de cada lado do caminho, virados em diagonal para a câmera de quem vem da praça
  const zs = [-7.4, -8.6, -9.8, -11.0].map((z) => z * S);
  return (
    <>
      {zs.map((z, k) => (
        <group key={z}>
          <Totem src={POSTERS[k * 2]} x={-4.2} z={z} ry={Math.PI / 4} />
          <Totem src={POSTERS[k * 2 + 1]} x={4.2} z={z} ry={-Math.PI / 4} />
        </group>
      ))}
    </>
  );
}
