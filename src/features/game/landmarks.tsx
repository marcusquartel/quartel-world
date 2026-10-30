"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { mulberry32 } from "./bots";
import { LANDMARKS, VIP, WORLD_RADIUS, WORLD_SCALE as S } from "./world";

/** Paleta do manual de identidade Quartel (2021). */
export const BRAND = {
  black: "#000000",
  graphite: "#3C3C3B",
  white: "#F9F9F9",
  cream: "#F9F9F9",
  /** Quartel Design */
  mint: "#00EBA8",
  mintDark: "#00B583",
  /** Quartel Filmes */
  orange: "#FF5A00",
  orangeDark: "#C24400",
  /** Quartel Host */
  blue: "#0050FF",
  /** tema "quartel" (tanque, capacete) */
  olive: "#4B5320",
  oliveLight: "#6B7340",
  /** estrela dourada (item do jogo) */
  gold: "#F2B705",
};

type V3 = [number, number, number];

function Box({ s, p, c, r, emissive, cast = true }: { s: V3; p: V3; c: string; r?: V3; emissive?: number; cast?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.8} emissive={emissive ? c : "#000"} emissiveIntensity={emissive ?? 0} />
    </mesh>
  );
}

export function starShape(inner = 0.45) {
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const rad = k % 2 === 0 ? 1 : inner;
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  sh.closePath();
  return sh;
}

export function BigStar({ p, size, c = BRAND.mint, r, depth = 0.3 }: { p: V3; size: number; c?: string; r?: V3; depth?: number }) {
  const shape = useMemo(() => starShape(), []);
  return (
    <mesh position={p} rotation={r} scale={size} castShadow>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: false }]} />
      <meshStandardMaterial color={c} metalness={0.45} roughness={0.35} emissive={c} emissiveIntensity={0.15} />
    </mesh>
  );
}

// ---------- Texto em CanvasTexture (mais confiável que <Html transform>) ----------
function cssFont(varName: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.body).getPropertyValue(varName).trim();
  return v || fallback;
}

interface TextSpec {
  width: number;
  height: number;
  bg: string;
  /** imagens (ex.: logos de /public/brand) carregadas antes de desenhar */
  images?: string[];
  draw: (g: CanvasRenderingContext2D, fonts: { display: string; body: string }, images: HTMLImageElement[]) => void;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function useCanvasTexture(spec: TextSpec) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const specRef = useRef(spec);
  useEffect(() => {
    let alive = true;
    let made: THREE.CanvasTexture | null = null;
    const display = cssFont("--font-display", "Impact, sans-serif");
    const body = cssFont("--font-game", "system-ui, sans-serif");
    const ready = typeof document !== "undefined" && document.fonts
      ? Promise.all([document.fonts.load(`64px ${display}`), document.fonts.load(`700 32px ${body}`)]).catch(() => null)
      : Promise.resolve(null);
    const imgs = Promise.all((specRef.current.images ?? []).map(loadImage)).catch(() => [] as HTMLImageElement[]);
    void Promise.all([ready, imgs]).then(([, images]) => {
      if (!alive) return;
      const s = specRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = s.width;
      canvas.height = s.height;
      const g = canvas.getContext("2d")!;
      g.fillStyle = s.bg;
      g.fillRect(0, 0, s.width, s.height);
      s.draw(g, { display, body }, images);
      made = new THREE.CanvasTexture(canvas);
      made.colorSpace = THREE.SRGBColorSpace;
      made.anisotropy = 4;
      setTex(made);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, []);
  return tex;
}

const SIGN_Z: [number, number] = [16, 0];

/**
 * Placa de loja: alta, atrás da loja (não tapa os produtos), inclinada para a câmera (que fica no alto),
 * mais uma etiqueta flutuante que dá para ler de longe.
 */
export function ShopSign({
  title,
  subtitle,
  tag,
  bg,
  fg,
  accent,
  z,
}: {
  title: string;
  subtitle: string;
  tag: string;
  bg: string;
  fg: string;
  accent: string;
  z: number;
}) {
  const tex = useCanvasTexture({
    width: 1024,
    height: 300,
    bg,
    draw: (g, f) => {
      g.strokeStyle = accent;
      g.lineWidth = 16;
      g.strokeRect(12, 12, 1000, 276);
      g.fillStyle = fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      let size = 132;
      do {
        g.font = `${size}px ${f.display}`;
        size -= 6;
      } while (g.measureText(title).width > 940 && size > 40);
      g.fillText(title, 512, 128);
      g.fillStyle = accent;
      g.font = `700 44px ${f.body}`;
      g.fillText(subtitle, 512, 232);
    },
  });
  const W = 9;
  const H = W * (300 / 1024);
  return (
    <group position={[0, 0, z]}>
      {[-W / 2 + 0.3, W / 2 - 0.3].map((x) => (
        <mesh key={x} position={[x, 3.1, 0]} castShadow>
          <boxGeometry args={[0.25, 6.2, 0.25]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <group position={[0, 6.3, 0]} rotation={[-0.5, 0, 0]}>
        <mesh>
          <boxGeometry args={[W + 0.3, H + 0.3, 0.2]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        {tex && (
          <mesh position={[0, 0, 0.11]}>
            <planeGeometry args={[W, H]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        )}
      </group>
      <Html position={[0, 8.3, 0]} center zIndexRange={SIGN_Z} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-2xl border-[3px] border-black px-3 py-1 font-display text-lg shadow-[3px_3px_0_#0a0a0a] compact:rounded-lg compact:border-2 compact:px-1.5 compact:py-0 compact:text-[10px] compact:shadow-none" style={{ background: accent, color: "#000" }}>
          {tag}
        </div>
      </Html>
    </group>
  );
}

/** Dica flutuante na frente da loja: "clique nos produtos". */
export function ShopHint({ text, z, y = 2.6 }: { text: string; z: number; y?: number }) {
  return (
    <Html position={[0, y, z]} center zIndexRange={SIGN_Z} style={{ pointerEvents: "none" }}>
      <div className="flex animate-bounce items-center gap-1.5 whitespace-nowrap rounded-full border-[3px] border-black bg-white px-3 py-1 font-game text-sm font-bold text-black shadow-[3px_3px_0_#0a0a0a] compact:gap-1 compact:border-2 compact:px-1.5 compact:py-0 compact:text-[9px] compact:shadow-none">
        <span className="text-lg compact:text-xs">👆</span>
        {text}
      </div>
    </Html>
  );
}

/** Letreiro de entrada: pórtico com o nome do mundo. */
export function EntranceSign() {
  const tex = useCanvasTexture({
    width: 1024,
    height: 320,
    bg: BRAND.black,
    images: ["/brand/q-white.png"],
    draw: (g, f, [q]) => {
      g.strokeStyle = BRAND.mint;
      g.lineWidth = 10;
      g.strokeRect(14, 14, 996, 292);
      if (q) g.drawImage(q, 44, 50, 170, 220);
      g.fillStyle = BRAND.white;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.font = `104px ${f.display}`;
      g.fillText("QUARTEL", 250, 118);
      g.fillStyle = BRAND.mint;
      g.fillText("WORLD", 250, 212);
      g.fillStyle = "#9A9A98";
      g.font = `700 26px ${f.body}`;
      g.font = `700 22px ${f.body}`;
      g.fillText("MISSÃO DADA É", 640, 196);
      g.fillText("MISSÃO CUMPRIDA ★★★", 640, 228);
    },
  });
  const z = 15 * S;
  return (
    <group position={[0, 0, z]}>
      {[-5.4, 5.4].map((x) => (
        <group key={x}>
          <Box s={[0.9, 6.2, 0.9]} p={[x, 3.1, 0]} c={BRAND.graphite} />
          <Box s={[1.1, 0.4, 1.1]} p={[x, 6.3, 0]} c={BRAND.black} />
          <BigStar p={[x, 7.1, -0.15]} size={0.55} />
        </group>
      ))}
      <Box s={[11.2, 3.3, 0.5]} p={[0, 4.6, 0]} c={BRAND.black} />
      {tex && (
        <>
          <mesh position={[0, 4.6, 0.26]}>
            <planeGeometry args={[10.6, 3.3]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
          <mesh position={[0, 4.6, -0.26]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[10.6, 3.3]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Quartel-General: a fachada de tijolo com o "03" e a bandeira. */
function Headquarters() {
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2.5) * 0.18;
  });
  const sign = useCanvasTexture({
    width: 1024,
    height: 256,
    bg: BRAND.black,
    images: ["/brand/q-white.png"],
    draw: (g, f, [q]) => {
      if (q) g.drawImage(q, 120, 28, 156, 200);
      g.fillStyle = BRAND.white;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.font = `140px ${f.display}`;
      g.fillText("QUARTEL", 310, 120);
      g.fillStyle = BRAND.mint;
      g.font = `700 34px ${f.body}`;
      g.fillText("D E S I G N", 318, 210);
    },
  });
  const three = useCanvasTexture({
    width: 256,
    height: 256,
    bg: BRAND.white,
    draw: (g, f) => {
      g.fillStyle = BRAND.black;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `190px ${f.display}`;
      g.fillText("03", 128, 140);
    },
  });
  return (
    <group position={[0, 0, -14 * S]}>
      {/* corpo de tijolo */}
      <Box s={[10, 6, 5]} p={[0, 3, 0]} c={BRAND.graphite} />
      {/* fiadas de tijolo */}
      {Array.from({ length: 11 }, (_, k) => (
        <Box key={k} s={[10.04, 0.06, 5.04]} p={[0, 0.5 + k * 0.5, 0]} c="#333332" cast={false} />
      ))}
      <Box s={[10.6, 0.9, 5.6]} p={[0, 6.4, 0]} c={BRAND.black} />
      {sign && (
        <mesh position={[0, 6.4, 2.81]}>
          <planeGeometry args={[3.6, 0.9]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      )}
      {/* porta e janelas */}
      <Box s={[2.2, 3.2, 0.2]} p={[0, 1.6, 2.5]} c={BRAND.black} />
      <Box s={[0.12, 0.12, 0.1]} p={[0.8, 1.6, 2.65]} c={BRAND.mint} emissive={0.6} />
      {[-3.4, 3.4].map((x) => (
        <group key={x}>
          <Box s={[2, 1.6, 0.2]} p={[x, 3.8, 2.5]} c="#FFE7A3" emissive={0.5} />
          <Box s={[2.2, 0.15, 0.3]} p={[x, 2.95, 2.55]} c={BRAND.black} />
        </group>
      ))}
      {three && (
        <mesh position={[0, 3.9, 2.61]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial map={three} toneMapped={false} />
        </mesh>
      )}
      {/* luminárias pendentes */}
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 5.2, 3.2]}>
          <mesh>
            <coneGeometry args={[0.35, 0.4, 12, 1, true]} />
            <meshStandardMaterial color={BRAND.black} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshBasicMaterial color="#FFE7A3" />
          </mesh>
        </group>
      ))}
      {/* mastro e bandeira */}
      <Box s={[0.15, 5, 0.15]} p={[4.4, 9.3, 0]} c="#cccccc" />
      <group position={[4.4, 11.1, 0]}>
        <mesh ref={flag} position={[0, 0, 0]}>
          <boxGeometry args={[0.05, 1.3, 2.2]} />
          <meshStandardMaterial color={BRAND.black} />
        </mesh>
        <BigStar p={[0.04, 0, 0]} size={0.4} r={[0, Math.PI / 2, 0]} />
      </group>
      {/* plantas na fachada */}
      {[-4.6, 4.6].map((x) => (
        <group key={x} position={[x, 0, 3]}>
          <Box s={[0.9, 0.7, 0.9]} p={[0, 0.35, 0]} c={BRAND.black} />
          <Box s={[1.1, 1, 1.1]} p={[0, 1.2, 0]} c="#3F7A3A" />
          <Box s={[0.7, 0.6, 0.7]} p={[0.1, 1.9, 0]} c="#4E8F45" />
        </group>
      ))}
    </group>
  );
}

function GiantPencil() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.25;
  });
  return (
    <group position={[-9 * S, 0, -6 * S]}>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.4, 0.5, 6]} />
        <meshStandardMaterial color={BRAND.black} />
      </mesh>
      <group ref={g} position={[0, 0.5, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 1.2, 6]} />
          <meshStandardMaterial color="#E58AA0" />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[1.02, 1.02, 0.6, 6]} />
          <meshStandardMaterial color="#C0C0C0" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 5.3, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 7, 6]} />
          <meshStandardMaterial color={BRAND.mint} />
        </mesh>
        <mesh position={[0, 9.8, 0]} castShadow>
          <coneGeometry args={[1, 2, 6]} />
          <meshStandardMaterial color="#F4C99A" />
        </mesh>
        <mesh position={[0, 10.6, 0]}>
          <coneGeometry args={[0.4, 0.8, 6]} />
          <meshStandardMaterial color={BRAND.black} />
        </mesh>
      </group>
    </group>
  );
}

function GiantMonitor() {
  const screen = useCanvasTexture({
    width: 1024,
    height: 640,
    bg: BRAND.black,
    draw: (g, f) => {
      const grd = g.createLinearGradient(0, 0, 1024, 640);
      grd.addColorStop(0, "#1A1A1A");
      grd.addColorStop(1, "#003D2C");
      g.fillStyle = grd;
      g.fillRect(0, 0, 1024, 640);
      g.fillStyle = BRAND.mint;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.font = `150px ${f.display}`;
      g.fillText("Do epic", 80, 280);
      g.fillText("shit.", 80, 440);
      g.fillStyle = BRAND.cream;
      g.font = `700 36px ${f.body}`;
      g.fillText("Design de alto calibre.", 84, 540);
      // janela de app
      g.fillStyle = "#333";
      g.fillRect(0, 0, 1024, 40);
      ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, k) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(30 + k * 32, 20, 10, 0, Math.PI * 2);
        g.fill();
      });
    },
  });
  return (
    <group position={[9 * S, 0, -6 * S]} rotation={[0, -0.6, 0]}>
      <Box s={[3, 0.3, 2]} p={[0, 0.15, 0]} c="#D1D5DB" />
      <Box s={[0.8, 3, 0.4]} p={[0, 1.8, -0.3]} c="#D1D5DB" />
      <Box s={[8.4, 5.4, 0.5]} p={[0, 5.6, 0]} c="#E5E7EB" />
      <Box s={[8.4, 0.9, 0.52]} p={[0, 2.95, 0]} c="#D1D5DB" />
      {screen && (
        <mesh position={[0, 5.9, 0.26]}>
          <planeGeometry args={[8, 4.8]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function GiantMouse() {
  const wheel = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (wheel.current) wheel.current.rotation.x = clock.elapsedTime * 3;
  });
  return (
    <group position={[-10 * S, 0, 6 * S]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 1.1, 0]} scale={[2.2, 1.1, 3.2]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={BRAND.white} roughness={0.4} />
      </mesh>
      <Box s={[0.08, 0.3, 1.8]} p={[0, 2.15, 1.3]} c={BRAND.black} cast={false} />
      <mesh ref={wheel} position={[0, 2.18, 1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 12]} />
        <meshStandardMaterial color={BRAND.mint} />
      </mesh>
      {/* cabo */}
      {Array.from({ length: 8 }, (_, k) => (
        <Box key={k} s={[0.25, 0.25, 0.9]} p={[Math.sin(k * 0.8) * 0.8, 0.13, 3.4 + k * 0.85]} c="#9CA3AF" cast={false} />
      ))}
    </group>
  );
}

/** Tanque criativo: o canhão é um lápis. */
function CreativeTank() {
  const turret = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (turret.current) turret.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.8;
  });
  return (
    <group position={[10 * S, 0, 7 * S]} rotation={[0, -2.2, 0]}>
      {[-1.6, 1.6].map((x) => (
        <group key={x}>
          <Box s={[1, 1.1, 6]} p={[x, 0.55, 0]} c="#2A2A2A" />
          {[-2.2, -1.1, 0, 1.1, 2.2].map((z) => (
            <mesh key={z} position={[x * 1.02, 0.55, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.45, 0.45, 1.05, 10]} />
              <meshStandardMaterial color="#4A4A4A" />
            </mesh>
          ))}
        </group>
      ))}
      <Box s={[3.2, 1.2, 5.2]} p={[0, 1.6, 0]} c={BRAND.olive} />
      <Box s={[0.8, 0.5, 0.8]} p={[-0.9, 1.45, 1.8]} c={BRAND.oliveLight} />
      <BigStar p={[1.62, 1.6, 0]} size={0.5} c={BRAND.white} r={[0, Math.PI / 2, 0]} depth={0.05} />
      <BigStar p={[-1.62, 1.6, 0]} size={0.5} c={BRAND.white} r={[0, -Math.PI / 2, 0]} depth={0.05} />
      <group ref={turret} position={[0, 2.5, -0.2]}>
        <Box s={[2.2, 0.9, 2.4]} p={[0, 0, 0]} c={BRAND.oliveLight} />
        <Box s={[0.9, 0.4, 0.9]} p={[0, 0.6, -0.3]} c={BRAND.olive} />
        {/* canhão-lápis */}
        <group position={[0, 0.05, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 3.2, 6]} />
            <meshStandardMaterial color={BRAND.mint} />
          </mesh>
          <mesh position={[0, 3.5, 0]}>
            <coneGeometry args={[0.3, 0.6, 6]} />
            <meshStandardMaterial color="#F4C99A" />
          </mesh>
          <mesh position={[0, 3.78, 0]}>
            <coneGeometry args={[0.1, 0.18, 6]} />
            <meshStandardMaterial color={BRAND.black} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Capacete Q, como no cartaz "Pelotão que prioriza missões de impacto". */
function GiantHelmet() {
  const decal = useCanvasTexture({
    width: 256,
    height: 320,
    bg: "rgba(0,0,0,0)",
    images: ["/brand/q-white.png"],
    draw: (g, _f, [q]) => {
      if (!q) return;
      g.drawImage(q, 0, 0, 256, 320);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = BRAND.mint;
      g.fillRect(0, 0, 256, 320);
    },
  });
  const helmet = "#214D3E";
  return (
    <group position={[-4 * S, 0, -9 * S]} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[2.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={helmet} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.6, 32]} />
        <meshStandardMaterial color={helmet} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[2.7, 2.7, 0.22, 32]} />
        <meshStandardMaterial color={helmet} />
      </mesh>
      {decal && (
        <mesh position={[0, 1.55, 1.78]} rotation={[-0.55, 0, 0]}>
          <planeGeometry args={[1.1, 1.38]} />
          <meshBasicMaterial map={decal} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Watchtower() {
  return (
    <group position={[5 * S, 0, -10 * S]}>
      {[
        [-0.9, -0.9],
        [0.9, -0.9],
        [-0.9, 0.9],
        [0.9, 0.9],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} s={[0.3, 6, 0.3]} p={[x, 3, z]} c={BRAND.black} />
      ))}
      <Box s={[2.6, 0.3, 2.6]} p={[0, 6, 0]} c={BRAND.black} />
      {[0, 1, 2].map((k) => (
        <Box key={k} s={[2.6, 0.4, 2.6]} p={[0, 6.4 + k * 0.4, 0]} c={k % 2 ? BRAND.mint : BRAND.black} />
      ))}
      <mesh position={[0, 8.2, 0]}>
        <coneGeometry args={[2.1, 1.2, 4]} />
        <meshStandardMaterial color={BRAND.orange} />
      </mesh>
      <pointLight position={[0, 7.2, 1.5]} color={BRAND.mint} intensity={8} distance={10} />
    </group>
  );
}

function Arches() {
  const colors = [BRAND.mint, BRAND.orange, BRAND.olive, BRAND.black, BRAND.mint, BRAND.orange];
  return (
    <>
      {colors.map((c, k) => {
        const a = (k / colors.length) * Math.PI * 2;
        const r = 8 * S;
        return (
          <group key={k} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a + Math.PI / 2, 0]}>
            <Box s={[0.5, 4, 0.5]} p={[-2, 2, 0]} c={c} />
            <Box s={[0.5, 4, 0.5]} p={[2, 2, 0]} c={c} />
            <Box s={[4.5, 0.5, 0.5]} p={[0, 4.2, 0]} c={c} />
            <BigStar p={[0, 4.95, -0.15]} size={0.45} c={c === BRAND.mint ? BRAND.black : BRAND.mint} />
          </group>
        );
      })}
    </>
  );
}

function Plants() {
  const spots = useMemo(() => {
    const out: { p: V3; big: boolean }[] = [];
    // borda do mapa
    for (let k = 0; k < 44; k++) {
      const a = (k / 44) * Math.PI * 2 + 0.2;
      const r = WORLD_RADIUS - 2 - (k % 3) * 1.4;
      out.push({ p: [Math.cos(a) * r, 0, Math.sin(a) * r], big: false });
    }
    // bosquinhos espalhados (longe dos marcos e do caminho central)
    const rnd = mulberry32(7);
    for (let k = 0; k < 120 && out.length < 84; k++) {
      const a = rnd() * Math.PI * 2;
      const r = 24 + rnd() * (WORLD_RADIUS - 32);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 6) continue;
      if (LANDMARKS.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + 6)) continue;
      out.push({ p: [x, 0, z], big: true });
    }
    return out;
  }, []);
  return (
    <>
      {spots.map(({ p, big }, k) =>
        big ? (
          <group key={k} position={p}>
            <Box s={[0.6, 2.2, 0.6]} p={[0, 1.1, 0]} c="#6B4A2E" />
            <Box s={[2.4, 1.8, 2.4]} p={[0, 2.9, 0]} c={k % 3 ? "#3F7A3A" : "#2F6B3A"} />
            <Box s={[1.6, 1.2, 1.6]} p={[0.2, 4.1, -0.1]} c="#4E8F45" />
          </group>
        ) : (
          <group key={k} position={p}>
            <Box s={[0.9, 0.8, 0.9]} p={[0, 0.4, 0]} c={k % 2 ? BRAND.black : BRAND.orange} />
            <Box s={[1.2, 1.1, 1.2]} p={[0, 1.35, 0]} c="#3F7A3A" />
            <Box s={[0.7, 0.7, 0.7]} p={[0.15, 2.1, -0.1]} c="#4E8F45" />
          </group>
        ),
      )}
    </>
  );
}

/** Chão: fatias alternadas, praça central com a estrela, borda preta. */
/** Selo "Quartel Design · Est. 2009" pintado no chão da praça central. */
function PlazaSeal() {
  const tex = useCanvasTexture({
    width: 1024,
    height: 1024,
    bg: "#2B2B2A",
    images: ["/brand/seal-mint.png"],
    draw: (g, _f, [seal]) => {
      if (seal) g.drawImage(seal, 0, 0, 1024, 1024);
    },
  });
  if (!tex) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
      <circleGeometry args={[5.2 * S, 64]} />
      <meshStandardMaterial map={tex} roughness={0.6} />
    </mesh>
  );
}

export function Ground() {
  const slices = 16;
  return (
    <group>
      {Array.from({ length: slices }, (_, k) => (
        <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[WORLD_RADIUS, 4, (k / slices) * Math.PI * 2, (Math.PI * 2) / slices]} />
          <meshStandardMaterial color={k % 2 ? "#E6E6E2" : "#DADAD5"} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[6.5 * S, 48]} />
        <meshStandardMaterial color="#2B2B2A" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <ringGeometry args={[6.5 * S - 0.6, 6.5 * S, 48]} />
        <meshStandardMaterial color={BRAND.mint} />
      </mesh>
      <PlazaSeal />
      {/* caminho até o QG e até a entrada */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <planeGeometry args={[3.5, WORLD_RADIUS * 2 - 2]} />
        <meshStandardMaterial color="#C9C9C3" />
      </mesh>
      {/* borda preta */}
      <mesh position={[0, 0.3, 0]}>
        <torusGeometry args={[WORLD_RADIUS, 0.45, 8, 96]} />
        <meshStandardMaterial color={BRAND.black} />
      </mesh>
      {/* "mar" em volta */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[WORLD_RADIUS * 4, 48]} />
        <meshStandardMaterial color="#8FC3DE" />
      </mesh>
    </group>
  );
}

/** Pista de dança: dançar junto aqui (ou em qualquer lugar) vale "Festa no QG". */
function DanceFloor() {
  const tiles = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const N = 8;
  const T = 1.55;
  const palette = useMemo(() => [BRAND.mint, BRAND.orange, "#B26BFF", "#22D3EE", BRAND.olive, "#F472B6"].map((c) => new THREE.Color(c)), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const beat = Math.floor(t * 2.2);
    tiles.current?.children.forEach((m, k) => {
      const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const c = palette[(k * 7 + beat * 3 + ((k >> 3) % 2) * 2) % palette.length];
      mat.color.copy(c);
      mat.emissive.copy(c);
      mat.emissiveIntensity = (k + beat) % 3 === 0 ? 0.9 : 0.2;
    });
    if (ball.current) ball.current.rotation.y = t * 1.2;
  });
  const p = LANDMARKS.find((l) => l.id === "pista")!;
  return (
    <group position={[p.x, 0, p.z]}>
      <Box s={[N * T + 0.8, 0.2, N * T + 0.8]} p={[0, 0.1, 0]} c={BRAND.black} cast={false} />
      <group ref={tiles}>
        {Array.from({ length: N * N }, (_, k) => (
          <mesh key={k} position={[((k % N) - (N - 1) / 2) * T, 0.22, (Math.floor(k / N) - (N - 1) / 2) * T]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[T - 0.08, T - 0.08]} />
            <meshStandardMaterial color={BRAND.mint} />
          </mesh>
        ))}
      </group>
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (N * T) / 2 + sx * 1.2, 0, -(N * T) / 2]}>
          <Box s={[1.4, 2.6, 1.2]} p={[0, 1.3, 0]} c="#1A1A1A" />
          <mesh position={[0, 1.8, 0.61]}>
            <circleGeometry args={[0.45, 20]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          <mesh position={[0, 0.8, 0.61]}>
            <circleGeometry args={[0.3, 20]} />
            <meshStandardMaterial color="#444" />
          </mesh>
        </group>
      ))}
      <Box s={[0.15, 7, 0.15]} p={[0, 3.5, -(N * T) / 2 - 1]} c="#999" />
      <group ref={ball} position={[0, 6.2, -(N * T) / 2 - 1]}>
        <BigStar p={[0, 0, -0.15]} size={1.1} />
      </group>
      <pointLight position={[0, 4, 0]} color="#B26BFF" intensity={20} distance={16} />
    </group>
  );
}

/** Área VIP — "Sala dos Oficiais": só Tenente+ ou Equipe Quartel. */
function VipLounge() {
  const neon = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (neon.current) (neon.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.4;
  });
  const sign = useCanvasTexture({
    width: 1024,
    height: 256,
    bg: BRAND.black,
    draw: (g, f) => {
      g.strokeStyle = BRAND.mint;
      g.lineWidth = 10;
      g.strokeRect(10, 10, 1004, 236);
      g.fillStyle = BRAND.mint;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `110px ${f.display}`;
      g.fillText("ÁREA VIP", 512, 108);
      g.fillStyle = BRAND.cream;
      g.font = `700 34px ${f.body}`;
      g.fillText("SALA DOS OFICIAIS · TENENTE+ OU EQUIPE QUARTEL", 512, 200);
    },
  });
  const floor = useCanvasTexture({
    width: 1024,
    height: 1024,
    bg: "#000000",
    images: ["/brand/q-white.png"],
    draw: (g, f, [q]) => {
      const c = 512;
      g.fillStyle = "#111111";
      g.beginPath();
      g.arc(c, c, 500, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = BRAND.mint;
      g.lineWidth = 14;
      g.beginPath();
      g.arc(c, c, 470, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 4;
      g.beginPath();
      g.arc(c, c, 440, 0, Math.PI * 2);
      g.stroke();
      if (q) g.drawImage(q, c - 70, 150, 140, 180);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = BRAND.white;
      g.font = `190px ${f.display}`;
      g.fillText("ÁREA VIP", c, 500);
      g.fillStyle = BRAND.mint;
      g.font = `52px ${f.display}`;
      g.fillText("SALA DOS OFICIAIS", c, 640);
      g.fillStyle = "#8A8A88";
      g.font = `700 30px ${f.body}`;
      g.fillText("TENENTE+  ·  EQUIPE QUARTEL", c, 720);
      // estrelas em volta
      g.fillStyle = BRAND.mint;
      g.font = `40px ${f.display}`;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        g.fillText("★", c + Math.cos(a) * 455, c + Math.sin(a) * 455);
      }
    },
  });
  const posts = 32;
  const R = VIP.r;
  // a entrada (tapete vermelho) fica virada para o centro do mapa (-x)
  const gap = (a: number) => Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.3;
  return (
    <group position={[VIP.x, 0, VIP.z]}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[R, R, 0.24, 64]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {floor && (
        <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[R - 0.35, 64]} />
          <meshStandardMaterial map={floor} roughness={0.4} metalness={0.1} />
        </mesh>
      )}
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R - 0.35, R, 64]} />
        <meshStandardMaterial color={BRAND.mint} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* tapete vermelho */}
      <mesh position={[-R - 1.5, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 2.2]} />
        <meshStandardMaterial color="#9B1C1C" />
      </mesh>
      {/* postes dourados e corda de veludo */}
      {Array.from({ length: posts }, (_, k) => {
        const a = (k / posts) * Math.PI * 2;
        if (gap(a)) return null;
        const x = Math.cos(a) * (R + 0.2);
        const z = Math.sin(a) * (R + 0.2);
        const a2 = ((k + 1) / posts) * Math.PI * 2;
        const x2 = Math.cos(a2) * (R + 0.2);
        const z2 = Math.sin(a2) * (R + 0.2);
        const len = Math.hypot(x2 - x, z2 - z);
        return (
          <group key={k}>
            <mesh position={[x, 0.6, z]} castShadow>
              <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
              <meshStandardMaterial color={BRAND.mint} metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh position={[x, 1.25, z]}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshStandardMaterial color={BRAND.mint} metalness={0.7} roughness={0.25} />
            </mesh>
            {!gap(a2) && (
              <mesh position={[(x + x2) / 2, 1.0, (z + z2) / 2]} rotation={[0, -Math.atan2(z2 - z, x2 - x), 0]}>
                <boxGeometry args={[len, 0.09, 0.09]} />
                <meshStandardMaterial color="#9B1C1C" />
              </mesh>
            )}
          </group>
        );
      })}
      {/* sofás em volta (o centro fica livre para o letreiro no chão) */}
      {[0.55, 1.25, 1.95, -0.55, -1.25, -1.95].map((a, k) => (
        <group key={k} position={[Math.cos(a) * (R - 1.8), 0.24, Math.sin(a) * (R - 1.8)]} rotation={[0, -a - Math.PI / 2, 0]}>
          <Box s={[3.2, 0.6, 1.1]} p={[0, 0.3, 0]} c={BRAND.graphite} />
          <Box s={[3.2, 0.9, 0.3]} p={[0, 0.75, 0.45]} c="#2A2A29" />
          <Box s={[0.7, 0.35, 0.5]} p={[-0.9, 0.75, 0.15]} c={k % 2 ? BRAND.mint : BRAND.orange} />
        </group>
      ))}
      <mesh ref={neon} position={[0, 4.6, R - 0.3]} rotation={[0, Math.PI, 0]} scale={1.1}>
        <extrudeGeometry args={[starShape(), { depth: 0.15, bevelEnabled: false }]} />
        <meshStandardMaterial color={BRAND.mint} emissive={BRAND.mint} emissiveIntensity={1} />
      </mesh>
      {/* placa */}
      <group position={[-R - 0.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {[-2.4, 2.4].map((x) => (
          <Box key={x} s={[0.3, 4.4, 0.3]} p={[x, 2.2, 0]} c={BRAND.black} />
        ))}
        <Box s={[5.2, 1.4, 0.2]} p={[0, 4.4, 0]} c={BRAND.black} />
        {sign && (
          <mesh position={[0, 4.4, 0.11]}>
            <planeGeometry args={[5, 1.25]} />
            <meshBasicMaterial map={sign} toneMapped={false} />
          </mesh>
        )}
        {sign && (
          <mesh position={[0, 4.4, -0.11]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[5, 1.25]} />
            <meshBasicMaterial map={sign} toneMapped={false} />
          </mesh>
        )}
      </group>
      <pointLight position={[0, 3.5, 0]} color={BRAND.mint} intensity={18} distance={14} />
    </group>
  );
}

export function Landmarks() {
  return (
    <>
      <Headquarters />
      <GiantPencil />
      <GiantMonitor />
      <GiantMouse />
      <CreativeTank />
      <GiantHelmet />
      <Watchtower />
      <Arches />
      <Plants />
      <DanceFloor />
      <VipLounge />
      <EntranceSign />
    </>
  );
}
