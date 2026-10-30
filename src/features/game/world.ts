// Escala do mapa. Tudo que tem posição fixa no mundo multiplica por WORLD_SCALE.
export const WORLD_SCALE = 4;
export const WORLD_RADIUS = 19 * WORLD_SCALE;
export const WORLD_NAME = "QUARTEL WORLD";
const S = WORLD_SCALE;

/** Marcos do mapa: viram obstáculo (raio r) e ponto de check-in (gamificação "Explorador"). */
export const LANDMARKS = [
  { id: "qg", name: "Quartel-General", x: 0, z: -14 * S, r: 5.5, solid: true },
  { id: "lapis", name: "Lápis Gigante", x: -9 * S, z: -6 * S, r: 2.4, solid: true },
  { id: "monitor", name: "Monitor do Epic Shit", x: 9 * S, z: -6 * S, r: 3.6, solid: true },
  { id: "mouse", name: "Mouse Gigante", x: -10 * S, z: 6 * S, r: 3, solid: true },
  { id: "tanque", name: "Tanque Criativo", x: 10 * S, z: 7 * S, r: 3.8, solid: true },
  { id: "podio", name: "Pódio", x: 0, z: 9 * S, r: 4.3, solid: true },
  { id: "capacete", name: "Capacete Q", x: -4 * S, z: -9 * S, r: 2.6, solid: true },
  { id: "guarita", name: "Guarita", x: 5 * S, z: -10 * S, r: 1.8, solid: true },
  { id: "pista", name: "Pista de Dança", x: -15 * S, z: -1 * S, r: 7, solid: false },
  { id: "portao", name: "Portão de Entrada", x: 0, z: 15 * S, r: 4, solid: false },
  { id: "vip", name: "Área VIP", x: 14 * S, z: 0, r: 11, solid: false },
  { id: "loja", name: "Tech Store", x: -6 * S, z: 12.5 * S, r: 6, solid: false },
  { id: "suplementos", name: "Suplementos Maxme Bio", x: 6 * S, z: 12.5 * S, r: 6, solid: false },
  { id: "loovi", name: "Stand Loovi", x: 12.5 * S, z: 10 * S, r: 6, solid: false },
  { id: "cafeteria", name: "Café do Quartel", x: -11 * S, z: 10.5 * S, r: 6, solid: false },
] as const;

export type LandmarkId = (typeof LANDMARKS)[number]["id"];

export const OBSTACLES = LANDMARKS.filter((l) => l.solid);

/** Distância extra além do raio para contar como "visitado". */
export const VISIT_MARGIN = 4;

export const VIP = { x: 14 * S, z: 0, r: 11 };
export const DANCE = { x: -15 * S, z: -1 * S, r: 7 };
/** Patente mínima para a Área VIP (nível 5 = Tenente). Equipe Quartel entra sempre. */
export const VIP_MIN_LEVEL = 5;

export function inVip(x: number, z: number) {
  return Math.hypot(x - VIP.x, z - VIP.z) < VIP.r;
}

export function zoneAt(x: number, z: number): "world" | "dance" | "vip" {
  if (inVip(x, z)) return "vip";
  if (Math.hypot(x - DANCE.x, z - DANCE.z) < DANCE.r) return "dance";
  return "world";
}

/** vipAllowed=false: a corda de veludo empurra a pessoa para fora da Área VIP. */
export function clampToWorld(x: number, z: number, vipAllowed = true): [number, number] {
  const max = WORLD_RADIUS - 1.2;
  const d = Math.hypot(x, z);
  if (d > max) {
    x = (x / d) * max;
    z = (z / d) * max;
  }
  for (const o of OBSTACLES) {
    const dx = x - o.x;
    const dz = z - o.z;
    const dd = Math.hypot(dx, dz);
    if (dd < o.r && dd > 0.0001) {
      x = o.x + (dx / dd) * o.r;
      z = o.z + (dz / dd) * o.r;
    }
  }
  if (!vipAllowed) {
    const dx = x - VIP.x;
    const dz = z - VIP.z;
    const dd = Math.hypot(dx, dz);
    const R = VIP.r + 0.5;
    if (dd < R && dd > 0.0001) {
      x = VIP.x + (dx / dd) * R;
      z = VIP.z + (dz / dd) * R;
    }
  }
  return [x, z];
}

/** Ponto de entrada (fora do portão, olhando para a praça). */
export const SPAWN = { x: 0, z: 17.5 * WORLD_SCALE, ry: Math.PI };
