// LOD por orçamento: só os N mais próximos da câmera recebem o avatar completo.
// Classe (com métodos) para não mutar props/refs dentro de componentes.
export class Lod {
  private positions = new Map<string, () => { x: number; z: number }>();
  private near = new Set<string>();
  private acc = 0;
  constructor(private budget = 30) {}

  register(id: string, getPos: () => { x: number; z: number }) {
    this.positions.set(id, getPos);
  }
  unregister(id: string) {
    this.positions.delete(id);
    this.near.delete(id);
  }
  /** ranqueia 4x por segundo */
  tick(dt: number, cx: number, cz: number) {
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;
    if (this.positions.size <= this.budget) {
      this.near = new Set(this.positions.keys());
      return;
    }
    const arr: [string, number][] = [];
    for (const [id, get] of this.positions) {
      const p = get();
      arr.push([id, (p.x - cx) ** 2 + (p.z - cz) ** 2]);
    }
    arr.sort((a, b) => a[1] - b[1]);
    this.near = new Set(arr.slice(0, this.budget).map((e) => e[0]));
  }
  isNear(id: string) {
    return this.positions.size <= this.budget || this.near.has(id);
  }
}

/** Entrada do jogador (teclado + joystick) — escrita por handlers, lida no loop. */
export class InputState {
  private keys = new Set<string>();
  private joy = { x: 0, z: 0 };
  setKey(code: string, down: boolean) {
    if (down) this.keys.add(code);
    else this.keys.delete(code);
  }
  clearKeys() {
    this.keys.clear();
  }
  setJoystick(x: number, z: number) {
    this.joy = { x, z };
  }
  running() {
    return this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
  }
  read(): { x: number; z: number } {
    let x = this.joy.x;
    let z = this.joy.z;
    const k = this.keys;
    if (k.has("KeyW") || k.has("ArrowUp")) z -= 1;
    if (k.has("KeyS") || k.has("ArrowDown")) z += 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) x -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) x += 1;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }
}

/** Posição do jogador local — escrita no loop de frames, lida por quem precisar. */
export class Mover {
  x: number;
  z: number;
  ry: number;
  walking = false;
  /** até quando o café está fazendo efeito */
  private boostUntil = 0;
  private boostSpeed = 1;
  constructor(x: number, z: number, ry: number) {
    this.x = x;
    this.z = z;
    this.ry = ry;
  }
  set(x: number, z: number, ry: number, walking: boolean) {
    this.x = x;
    this.z = z;
    this.ry = ry;
    this.walking = walking;
  }
  /** café novo substitui o anterior: recomeça o tempo com a nova velocidade */
  boost(ms: number, speed: number) {
    this.boostUntil = Date.now() + ms;
    this.boostSpeed = speed;
  }
  boosted() {
    return Date.now() < this.boostUntil;
  }
  /** multiplicador de velocidade neste instante */
  speedFactor() {
    return this.boosted() ? this.boostSpeed : 1;
  }
  pos() {
    return { x: this.x, z: this.z };
  }
}

/** Guarda síncrona das estrelas: evita contar a mesma coleta 2x antes do estado atualizar. */
export class StarField {
  private takenUntil: number[];
  constructor(n: number) {
    this.takenUntil = new Array(n).fill(0);
  }
  isTaken(i: number, now: number) {
    return this.takenUntil[i] > now;
  }
  take(i: number, until: number) {
    this.takenUntil[i] = until;
  }
}
