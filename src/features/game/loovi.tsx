"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ShopSign, useCanvasTexture } from "./landmarks";
import { LANDMARKS } from "./world";

/** Stand da Loovi (cliente Quartel): seguro auto, cotação no site oficial. */
export const LOOVI_BLUE = "#5968FA";
/** Link de indicação do Marcus (página "presente" da Loovi, código IJIQ). */
export const LOOVI_PROMO_CODE = "IJIQ";
export const LOOVI_QUOTE_URL = "https://loovi.com.br/presente?nome=Marcus&promocode=IJIQ";

const noRaycast = () => null;

function Wheel({ p }: { p: [number, number, number] }) {
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.35, 16]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.37, 12]} />
        <meshStandardMaterial color="#C9CCD1" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Carrinho de blocos com a cor da Loovi, girando no palco. */
function Car({ hover }: { hover: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * (hover ? 1.2 : 0.4);
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[2, 0.7, 4]} />
        <meshStandardMaterial color={LOOVI_BLUE} metalness={0.3} roughness={0.35} emissive={LOOVI_BLUE} emissiveIntensity={hover ? 0.25 : 0} />
      </mesh>
      <mesh position={[0, 1.5, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.65, 2.1]} />
        <meshStandardMaterial color={LOOVI_BLUE} metalness={0.3} roughness={0.35} />
      </mesh>
      {/* vidros */}
      <mesh position={[0, 1.52, 0.86]}>
        <boxGeometry args={[1.7, 0.5, 0.04]} />
        <meshStandardMaterial color="#BFD3FF" metalness={0.5} roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.52, -1.26]}>
        <boxGeometry args={[1.7, 0.5, 0.04]} />
        <meshStandardMaterial color="#BFD3FF" metalness={0.5} roughness={0.1} />
      </mesh>
      {[-0.91, 0.91].map((x) => (
        <mesh key={x} position={[x, 1.52, -0.2]}>
          <boxGeometry args={[0.04, 0.45, 1.9]} />
          <meshStandardMaterial color="#BFD3FF" metalness={0.5} roughness={0.1} />
        </mesh>
      ))}
      {/* faróis */}
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.9, 2.01]}>
          <boxGeometry args={[0.4, 0.18, 0.04]} />
          <meshBasicMaterial color="#FFF6C8" />
        </mesh>
      ))}
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.9, -2.01]}>
          <boxGeometry args={[0.4, 0.18, 0.04]} />
          <meshBasicMaterial color="#FF4D4D" />
        </mesh>
      ))}
      <Wheel p={[-1, 0.45, 1.25]} />
      <Wheel p={[1, 0.45, 1.25]} />
      <Wheel p={[-1, 0.45, -1.25]} />
      <Wheel p={[1, 0.45, -1.25]} />
      {/* escudo "segurado" no teto */}
      <mesh position={[0, 2.05, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 24]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

export function LooviStand({ onOpen }: { onOpen: () => void }) {
  const L = LANDMARKS.find((l) => l.id === "loovi")!;
  const [hover, setHover] = useState(false);
  const kiosk = useCanvasTexture({
    width: 512,
    height: 640,
    bg: LOOVI_BLUE,
    images: ["/loovi/logo-branca.svg"],
    draw: (g, f, [logo]) => {
      if (logo) g.drawImage(logo, 76, 60, 360, 55);
      g.fillStyle = "#FFFFFF";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `64px ${f.display}`;
      g.fillText("SEGURO", 256, 220);
      g.fillText("AUTO", 256, 290);
      g.font = `700 30px ${f.body}`;
      g.fillText("a partir de", 256, 370);
      g.font = `72px ${f.display}`;
      g.fillText("R$ 99,90", 256, 430);
      g.font = `700 30px ${f.body}`;
      g.fillText("por mês*", 256, 480);
      g.fillStyle = "#FFFFFF";
      g.fillRect(96, 530, 320, 70);
      g.fillStyle = LOOVI_BLUE;
      g.font = `40px ${f.display}`;
      g.fillText("COTAR AGORA ↗", 256, 567);
    },
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
      onOpen();
    },
  };
  const W = 13;
  const D = 10;
  return (
    <group position={[L.x, 0, L.z]}>
      {/* palco azul */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[W, 0.2, D]} />
        <meshStandardMaterial color="#EEF0FF" />
      </mesh>
      <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <ringGeometry args={[3.2, 3.5, 48]} />
        <meshBasicMaterial color={LOOVI_BLUE} />
      </mesh>
      {/* plataforma giratória com o carro */}
      <group position={[-1.8, 0.2, 0.4]} {...events}>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <cylinderGeometry args={[3, 3, 0.2, 48]} />
          <meshStandardMaterial color="#DDE1FF" />
        </mesh>
        <group position={[0, 0.2, 0]}>
          <Car hover={hover} />
        </group>
      </group>
      {/* quiosque "Cotar agora" */}
      <group position={[4.2, 0.2, 0.6]} rotation={[0, -0.35, 0]} {...events}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <boxGeometry args={[2.1, 3.2, 0.5]} />
          <meshStandardMaterial color="#20235C" />
        </mesh>
        {kiosk && (
          <mesh position={[0, 1.65, 0.26]}>
            <planeGeometry args={[1.9, 2.37]} />
            <meshBasicMaterial map={kiosk} toneMapped={false} />
          </mesh>
        )}
        <mesh position={[0, 3.25, 0.1]}>
          <boxGeometry args={[2.1, 0.1, 0.7]} />
          <meshStandardMaterial color={LOOVI_BLUE} emissive={LOOVI_BLUE} emissiveIntensity={hover ? 1 : 0.5} />
        </mesh>
      </group>
      {/* bandeirolas */}
      {[-W / 2 + 0.4, W / 2 - 0.4].map((x) => (
        <group key={x} position={[x, 0, D / 2 - 0.5]}>
          <mesh position={[0, 2, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.12, 4, 0.12]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[x < 0 ? 0.45 : -0.45, 3.2, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.8, 1.4, 0.04]} />
            <meshStandardMaterial color={LOOVI_BLUE} />
          </mesh>
        </group>
      ))}
      <ShopSign
        title="LOOVI · SEGURO AUTO"
        subtitle="tá na Loovi, tá seguro!"
        tag="🚗 LOOVI · SEGURO AUTO · COTE AQUI"
        bg={LOOVI_BLUE}
        fg="#FFFFFF"
        accent="#FFFFFF"
        z={-D / 2 - 0.6}
      />
      <pointLight position={[0, 4, 1]} color="#C8CEFF" intensity={14} distance={14} />
    </group>
  );
}
