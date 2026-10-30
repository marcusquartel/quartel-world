// Sons sintetizados com Web Audio — nenhum arquivo de áudio.
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

export function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  const a = audioCtx();
  if (!a || muted) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.12) {
  const a = audioCtx();
  if (!a || muted) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let k = 0; k < data.length; k++) data[k] = (Math.random() * 2 - 1) * (1 - k / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1800;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

function sweep(from: number, to: number, start: number, dur: number, type: OscillatorType, vol: number) {
  const a = audioCtx();
  if (!a || muted) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  /** estrela comum: 1 nota */
  collect1: () => tone(880, 0, 0.12, "square", 0.06),
  /** estrela prata 2x: "bling" */
  collect2: () => {
    tone(988, 0, 0.1, "triangle", 0.1);
    tone(1480, 0.07, 0.18, "triangle", 0.1);
  },
  /** estrela dourada 5x: arpejo */
  collect5: () => [784, 988, 1175, 1568, 1976].forEach((f, k) => tone(f, k * 0.06, 0.16, "triangle", 0.1)),
  /** toque de corneta: conquista destravada */
  unlock: () =>
    [392, 523, 659, 784, 659, 784].forEach((f, k) =>
      tone(f, k * 0.13, k === 5 ? 0.5 : 0.14, "sawtooth", 0.05),
    ),
  clap: () => {
    noise(0, 0.06);
    noise(0.11, 0.06);
    noise(0.22, 0.06);
  },
  heart: () => {
    tone(660, 0, 0.12, "sine", 0.12);
    tone(880, 0.1, 0.2, "sine", 0.12);
  },
  salute: () => {
    tone(523, 0, 0.1, "square", 0.05);
    tone(784, 0.1, 0.2, "square", 0.05);
  },
  click: () => tone(1200, 0, 0.04, "square", 0.03),
  /** sirene de invasão */
  siren: () => {
    for (let k = 0; k < 4; k++) {
      tone(620, k * 0.5, 0.25, "sawtooth", 0.05);
      tone(880, k * 0.5 + 0.25, 0.25, "sawtooth", 0.05);
    }
  },
  /** efeitos do DJ */
  airhorn: () => {
    for (const k of [0, 0.22, 0.44]) for (const f of [415, 523, 622]) tone(f, k, k === 0.44 ? 0.6 : 0.18, "sawtooth", 0.07);
  },
  scratch: () => {
    sweep(900, 200, 0, 0.1, "sawtooth", 0.14);
    sweep(200, 1100, 0.11, 0.08, "sawtooth", 0.14);
    sweep(1000, 180, 0.2, 0.14, "sawtooth", 0.14);
    noise(0, 0.3, 0.05);
  },
  laser: () => {
    sweep(2400, 120, 0, 0.3, "square", 0.08);
    sweep(2400, 120, 0.18, 0.3, "square", 0.05);
  },
  boom: () => {
    sweep(180, 30, 0, 0.7, "sine", 0.5);
    noise(0, 0.5, 0.25);
  },
  /** golpe */
  punch: () => {
    noise(0, 0.07, 0.25);
    tone(110, 0, 0.12, "square", 0.12);
  },
  /** invasor abatido */
  poof: () => {
    tone(300, 0, 0.08, "square", 0.08);
    tone(150, 0.05, 0.15, "square", 0.06);
  },
  /** pontos roubados */
  steal: () => {
    tone(500, 0, 0.12, "triangle", 0.1);
    tone(350, 0.1, 0.12, "triangle", 0.1);
    tone(220, 0.2, 0.25, "triangle", 0.1);
  },
  pop: () => tone(520, 0, 0.08, "sine", 0.1),
};
