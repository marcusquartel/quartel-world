"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ShopHint, ShopSign, useCanvasTexture } from "./landmarks";
import { LANDMARKS } from "./world";

/** Cafeteria: troca pontos do ranking por café, que deixa o avatar mais rápido por um tempo. */
export const COFFEE_BROWN = "#6B3F24";
const CREAM = "#F6E7D2";

export const COFFEES = [
  { id: "espresso", name: "Espresso", icon: "☕", cost: 10, speed: 1.35 },
  { id: "cappuccino", name: "Cappuccino", icon: "🥛", cost: 25, speed: 1.6 },
  { id: "mocha", name: "Mocha do Quartel", icon: "🍫", cost: 50, speed: 2 },
] as const;
export type Coffee = (typeof COFFEES)[number];
/** quanto tempo o café acelera o avatar */
export const COFFEE_SECONDS = 10;

const noRaycast = () => null;

function Steam({ y }: { y: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.children.forEach((c, k) => {
      const p = (clock.elapsedTime * 0.35 + k / 3) % 1;
      c.position.y = p * 2.4;
      c.position.x = Math.sin(p * 6 + k * 2) * 0.25;
      c.scale.setScalar(0.5 + p);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - p);
    });
  });
  return (
    <group ref={g} position={[0, y, 0]}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} raycast={noRaycast}>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Xícara gigante em cima do balcão. */
function BigCup({ hover }: { hover: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[1.25, 1.05, 0.12, 28]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.85, 0.62, 1.2, 28]} />
        <meshStandardMaterial color="#FFFFFF" emissive={CREAM} emissiveIntensity={hover ? 0.5 : 0} />
      </mesh>
      <mesh position={[0, 1.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 28]} />
        <meshStandardMaterial color={COFFEE_BROWN} />
      </mesh>
      <mesh position={[0.86, 0.75, 0]} castShadow>
        <torusGeometry args={[0.32, 0.09, 10, 20]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <Steam y={1.5} />
    </group>
  );
}

function Machine() {
  return (
    <group>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.5, 1.3, 0.9]} />
        <meshStandardMaterial color="#B9BEC4" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0.46]}>
        <boxGeometry args={[1.1, 0.5, 0.04]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.95, 0.46]}>
          <boxGeometry args={[0.16, 0.16, 0.04]} />
          <meshBasicMaterial color="#FF9F43" />
        </mesh>
      ))}
    </group>
  );
}

function Table({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 1, 10]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.08, 20]} />
        <meshStandardMaterial color={COFFEE_BROWN} />
      </mesh>
      <mesh position={[0.2, 1.14, 0.1]}>
        <cylinderGeometry args={[0.11, 0.08, 0.16, 12]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {[0, Math.PI].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 1.2, 0.3, Math.sin(a) * 1.2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.6, 14]} />
          <meshStandardMaterial color={CREAM} />
        </mesh>
      ))}
    </group>
  );
}

export function CoffeeShop({ onOpen }: { onOpen: () => void }) {
  const L = LANDMARKS.find((l) => l.id === "cafeteria")!;
  const [hover, setHover] = useState(false);
  const menu = useCanvasTexture({
    width: 512,
    height: 400,
    bg: "#23150D",
    draw: (g, f) => {
      g.fillStyle = CREAM;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `52px ${f.display}`;
      g.fillText("CARDÁPIO", 256, 56);
      g.font = `700 30px ${f.body}`;
      COFFEES.forEach((c, k) => {
        const y = 150 + k * 82;
        g.textAlign = "left";
        g.fillText(c.name, 36, y);
        g.textAlign = "right";
        g.fillText(`${c.cost} pts`, 476, y);
      });
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
  const W = 14;
  const D = 11;
  return (
    <group position={[L.x, 0, L.z]}>
      {/* piso */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[W, 0.2, D]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      {/* balcão */}
      <group position={[0, 0.2, -2.6]} {...events}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[10, 1.3, 1.6]} />
          <meshStandardMaterial color={COFFEE_BROWN} emissive={COFFEE_BROWN} emissiveIntensity={hover ? 0.35 : 0} />
        </mesh>
        <mesh position={[0, 1.34, 0]} castShadow>
          <boxGeometry args={[10.4, 0.08, 1.9]} />
          <meshStandardMaterial color={CREAM} />
        </mesh>
        <group position={[-3, 1.38, 0]}>
          <Machine />
        </group>
        <group position={[2.6, 1.38, 0]}>
          <BigCup hover={hover} />
        </group>
      </group>
      {/* cardápio no alto, atrás do balcão */}
      <group position={[-0.2, 0, -3.9]} {...events}>
        {menu && (
          <mesh position={[0, 3.6, 0]}>
            <planeGeometry args={[3.2, 2.5]} />
            <meshBasicMaterial map={menu} toneMapped={false} />
          </mesh>
        )}
      </group>
      <Table p={[-4, 0.2, 2.2]} />
      <Table p={[4, 0.2, 2.2]} />
      <ShopHint text="Clique no balcão · troque pontos por café" z={D / 2 + 0.4} y={2.6} />
      <ShopSign
        title="CAFÉ DO QUARTEL"
        subtitle="troque seus pontos por café"
        tag="☕ CAFÉ DO QUARTEL · PONTOS POR CAFÉ"
        bg={COFFEE_BROWN}
        fg="#FFFFFF"
        accent={CREAM}
        z={-D / 2 - 0.6}
      />
      <pointLight position={[0, 4, 0]} color="#FFD9A8" intensity={16} distance={15} />
    </group>
  );
}
