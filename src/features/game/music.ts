// Trilha sonora sintetizada (Web Audio): composições originais e simples, em loop.
// Três climas: mundo (calmo), pista de dança (124 BPM) e área VIP (lounge).
import { audioCtx } from "./sfx";

export type Zone = "world" | "dance" | "vip" | "war";

interface Track {
  bpm: number;
  /** acordes (MIDI), 1 por compasso */
  chords: number[][];
  kick: number[];
  snare: number[];
  hat: number[];
  /** passos (0–15) em que o baixo toca */
  bass: number[];
  /** passos do arpejo/stab */
  lead: number[];
  pad: OscillatorType;
  leadWave: OscillatorType;
  leadVol: number;
}

const TRACKS: Record<Zone, Track> = {
  world: {
    bpm: 92,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
    ],
    kick: [0, 8],
    snare: [],
    hat: [2, 6, 10, 14],
    bass: [0, 6, 8],
    lead: [0, 3, 6, 8, 11, 14],
    pad: "triangle",
    leadWave: "triangle",
    leadVol: 0.035,
  },
  dance: {
    bpm: 124,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
    ],
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    bass: [2, 6, 10, 14],
    lead: [3, 6, 10, 13],
    pad: "sawtooth",
    leadWave: "square",
    leadVol: 0.04,
  },
  war: {
    bpm: 150,
    chords: [
      [45, 48, 52],
      [45, 48, 52],
      [41, 45, 48],
      [43, 47, 50],
    ],
    kick: [0, 3, 6, 8, 11, 14],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    bass: [0, 2, 4, 6, 8, 10, 12, 14],
    lead: [0, 7, 10],
    pad: "sawtooth",
    leadWave: "square",
    leadVol: 0.045,
  },
  vip: {
    bpm: 80,
    chords: [
      [50, 53, 57, 60],
      [55, 59, 62, 65],
      [48, 52, 55, 59],
      [57, 61, 64, 67],
    ],
    kick: [0, 10],
    snare: [8],
    hat: [0, 3, 4, 7, 8, 11, 12, 15],
    bass: [0, 4, 8, 12],
    lead: [2, 7, 13],
    pad: "sine",
    leadWave: "sine",
    leadVol: 0.05,
  },
};

/** Faixas da pista que o DJ escolhe (composições originais e simples). */
export const DJ_TRACKS = [
  { id: "house", label: "House", icon: "🏠" },
  { id: "funk", label: "Funk", icon: "🔊" },
  { id: "techno", label: "Techno", icon: "🤖" },
  { id: "disco", label: "Disco", icon: "🪩" },
] as const;
export type DjTrack = (typeof DJ_TRACKS)[number]["id"];

/**
 * Cada faixa do DJ é uma música própria (4 compassos = 64 passos), com tom, batida,
 * timbres e melodia diferentes. Notas em MIDI: [passo, nota, duração em passos].
 */
type Note = [number, number, number];
interface Song {
  bpm: number;
  /** atraso dos passos ímpares (balanço), em fração do passo */
  swing: number;
  kick: number[];
  kickVol: number;
  clap: number[];
  closedHat: number[];
  openHat: number[];
  /** atabaques: [passo (0–15), frequência] */
  toms: [number, number][];
  bass: Note[];
  bassWave: OscillatorType;
  bassVol: number;
  bassCutoff: number;
  /** filtro ressonante que abre e fecha (som "ácido") */
  acid?: boolean;
  /** grave que desliza para baixo (808) */
  slide?: boolean;
  /** acordes curtos: acordes por compasso + passos em que tocam */
  chords?: number[][];
  stabSteps?: number[];
  stabWave?: OscillatorType;
  stabVol?: number;
  stabLen?: number;
  stabCutoff?: number;
  /** acorde longo de fundo */
  padWave?: OscillatorType;
  padVol?: number;
  melody: Note[];
  leadWave: OscillatorType;
  leadVol: number;
  leadCutoff: number;
}

/** repete um padrão de 1 compasso nos 4 compassos, trocando a nota base */
const barsOf = (roots: number[], steps: [number, number, number][]): Note[] =>
  roots.flatMap((root, bar) => steps.map(([st, offset, len]): Note => [bar * 16 + st, root + offset, len]));

const SONGS: Record<DjTrack, Song> = {
  // Dó menor: piano sincopado e baixo no contratempo
  house: {
    bpm: 124,
    swing: 0,
    kick: [0, 4, 8, 12],
    kickVol: 0.42,
    clap: [4, 12],
    closedHat: [],
    openHat: [2, 6, 10, 14],
    toms: [],
    bass: barsOf([36, 32, 39, 34], [
      [2, 0, 1.5],
      [6, 0, 1.5],
      [10, 0, 1.5],
      [13, 12, 1],
      [14, 0, 1.5],
    ]),
    bassWave: "sawtooth",
    bassVol: 0.09,
    bassCutoff: 420,
    chords: [
      [60, 63, 67],
      [56, 60, 63],
      [55, 58, 63],
      [58, 62, 65],
    ],
    stabSteps: [0, 3, 6, 10, 13],
    stabWave: "triangle",
    stabVol: 0.07,
    stabLen: 1.6,
    stabCutoff: 3600,
    melody: [
      [32, 75, 2],
      [35, 74, 2],
      [38, 72, 3],
      [48, 75, 2],
      [51, 77, 2],
      [54, 79, 4],
    ],
    leadWave: "triangle",
    leadVol: 0.04,
    leadCutoff: 4000,
  },
  // Mi menor: tamborzão seco, grave 808 e flautinha; sem acordes
  funk: {
    bpm: 130,
    swing: 0.12,
    kick: [],
    kickVol: 0,
    clap: [],
    closedHat: [],
    openHat: [],
    toms: [
      [0, 90],
      [3, 90],
      [4, 300],
      [6, 90],
      [7, 300],
      [10, 90],
      [11, 300],
      [12, 120],
      [14, 300],
      [15, 240],
    ],
    bass: barsOf([28, 28, 28, 31], [
      [0, 0, 3],
      [6, 0, 3],
      [10, 3, 2],
    ]),
    bassWave: "sine",
    bassVol: 0.3,
    bassCutoff: 300,
    slide: true,
    melody: [
      [0, 76, 1],
      [2, 79, 1],
      [4, 76, 1],
      [6, 74, 2],
      [10, 71, 2],
      [13, 74, 1],
      [14, 76, 2],
      [32, 76, 1],
      [34, 79, 1],
      [36, 81, 1],
      [38, 79, 2],
      [42, 76, 1],
      [44, 74, 1],
      [46, 71, 2],
    ],
    leadWave: "square",
    leadVol: 0.035,
    leadCutoff: 2200,
  },
  // Lá menor: bumbo pesado e sequência ácida; quase sem melodia
  techno: {
    bpm: 138,
    swing: 0,
    kick: [0, 4, 8, 12],
    kickVol: 0.6,
    clap: [12],
    closedHat: [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15],
    openHat: [2, 6, 10, 14],
    toms: [],
    bass: barsOf([33, 33, 33, 36], [
      [0, 0, 0.8],
      [1, 0, 0.8],
      [3, 12, 0.8],
      [4, 0, 0.8],
      [6, 3, 0.8],
      [7, 0, 0.8],
      [9, 15, 0.8],
      [10, 0, 0.8],
      [12, 7, 0.8],
      [14, 12, 0.8],
      [15, 10, 0.8],
    ]),
    bassWave: "sawtooth",
    bassVol: 0.075,
    bassCutoff: 400,
    acid: true,
    padWave: "sawtooth",
    padVol: 0.012,
    chords: [
      [45, 52],
      [45, 52],
      [41, 48],
      [43, 50],
    ],
    melody: [
      [23, 69, 1],
      [55, 72, 1],
    ],
    leadWave: "sawtooth",
    leadVol: 0.04,
    leadCutoff: 1400,
  },
  // Dó maior: alegre, com baixo em oitavas, guitarrinha, cordas e melodia
  disco: {
    bpm: 112,
    swing: 0,
    kick: [0, 4, 8, 12],
    kickVol: 0.3,
    clap: [4, 12],
    closedHat: [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15],
    openHat: [2, 6, 10, 14],
    toms: [],
    bass: barsOf([36, 33, 38, 31], [
      [0, 0, 1.5],
      [2, 12, 1.5],
      [4, 0, 1.5],
      [6, 12, 1.5],
      [8, 0, 1.5],
      [10, 12, 1.5],
      [12, 0, 1.5],
      [14, 12, 1.5],
    ]),
    bassWave: "triangle",
    bassVol: 0.15,
    bassCutoff: 1100,
    chords: [
      [64, 67, 71],
      [64, 67, 69],
      [65, 69, 72],
      [65, 67, 71],
    ],
    stabSteps: [1, 3, 6, 9, 11, 14],
    stabWave: "square",
    stabVol: 0.022,
    stabLen: 0.7,
    stabCutoff: 3000,
    padWave: "sawtooth",
    padVol: 0.016,
    melody: [
      [0, 79, 3],
      [4, 76, 1],
      [6, 79, 2],
      [10, 84, 4],
      [16, 81, 3],
      [20, 79, 1],
      [22, 76, 2],
      [26, 72, 4],
      [32, 77, 3],
      [36, 81, 1],
      [38, 84, 2],
      [42, 86, 4],
      [48, 83, 2],
      [51, 81, 1],
      [52, 79, 2],
      [55, 74, 1],
      [56, 79, 6],
    ],
    leadWave: "triangle",
    leadVol: 0.075,
    leadCutoff: 5000,
  },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const VOLUME = 0.22;
const MUTE_KEY = "quartel-world:music-muted";

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private zone: Zone = "world";
  /** trilha que tem prioridade sobre a da área (ex.: invasão) */
  private override: Zone | null = null;
  private danceTrack: DjTrack = "house";
  private muted = false;

  constructor() {
    try {
      this.muted = typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  isMuted() {
    return this.muted;
  }

  /** Precisa ser chamado a partir de um clique (política de áudio dos navegadores). */
  start() {
    if (this.timer) return;
    const ctx = audioCtx();
    if (!ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : VOLUME;
    this.master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.3);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private onVisibility = () => {
    if (this.ctx && document.visibilityState === "visible") this.nextTime = this.ctx.currentTime + 0.05;
  };

  setMuted(m: boolean) {
    this.muted = m;
    try {
      window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      /* sem armazenamento */
    }
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : VOLUME, this.ctx.currentTime, 0.15);
  }

  setZone(z: Zone) {
    if (z === this.zone) return;
    this.zone = z;
    // recomeça no início do compasso para a troca soar musical
    this.step = 0;
    if (this.ctx && this.master && !this.muted) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(0.02, t);
      this.master.gain.linearRampToValueAtTime(VOLUME, t + 0.6);
    }
  }

  /** faixa da pista escolhida pelo DJ */
  setDanceTrack(t: DjTrack) {
    if (t === this.danceTrack) return;
    this.danceTrack = t;
    if (this.current() === "dance") this.step = 0;
  }

  setOverride(z: Zone | null) {
    if (z === this.override) return;
    this.override = z;
    this.step = 0;
  }

  private current(): Zone {
    return this.override ?? this.zone;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || document.visibilityState !== "visible") return;
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    const z = this.current();
    const song = z === "dance" ? SONGS[this.danceTrack] : null;
    const tr = z === "dance" ? null : TRACKS[z];
    const stepDur = 60 / (song ?? tr!).bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      if (song) this.playSong(song, this.step, this.nextTime, stepDur);
      else this.playStep(tr!, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(tr: Track, step: number, t: number, stepDur: number) {
    const s = step % 16;
    const chord = tr.chords[Math.floor(step / 16) % tr.chords.length];
    if (s === 0) for (const n of chord) this.tone(mtof(n), t, stepDur * 15.5, tr.pad, this.current() === "dance" || this.current() === "war" ? 0.018 : 0.03, 1400);
    if (tr.bass.includes(s)) this.tone(mtof(chord[0] - 24 + (this.current() === "vip" && s === 8 ? 7 : 0)), t, stepDur * 1.6, this.current() === "dance" || this.current() === "war" ? "sawtooth" : "sine", 0.09, 500);
    if (tr.lead.includes(s)) {
      const n = chord[(s + Math.floor(step / 16)) % chord.length] + 12;
      if (this.current() === "dance" || this.current() === "war") for (const c of chord) this.tone(mtof(c + 12), t, stepDur * 0.9, tr.leadWave, tr.leadVol * 0.6, 2600);
      else this.tone(mtof(n), t, stepDur * 2.5, tr.leadWave, tr.leadVol, 3000);
    }
    if (tr.kick.includes(s)) this.kick(t, this.current() === "dance" || this.current() === "war" ? 0.5 : 0.22);
    if (tr.snare.includes(s)) this.hit(t, 0.12, 1800, this.current() === "dance" || this.current() === "war" ? 0.16 : 0.06);
    if (tr.hat.includes(s)) this.hit(t, 0.04, 8000, this.current() === "dance" || this.current() === "war" ? 0.05 : 0.025);
  }

  private playSong(song: Song, step: number, base: number, stepDur: number) {
    const s = step % 16;
    const t = base + (s % 2 ? stepDur * song.swing : 0);
    const chord = song.chords?.[Math.floor(step / 16) % song.chords.length];
    if (chord && s === 0 && song.padWave) {
      for (const n of chord) this.tone(mtof(n), t, stepDur * 16, song.padWave, song.padVol ?? 0.015, 1800, { attack: stepDur * 2 });
    }
    if (chord && song.stabSteps?.includes(s)) {
      for (const n of chord) this.tone(mtof(n), t, stepDur * (song.stabLen ?? 1), song.stabWave ?? "triangle", song.stabVol ?? 0.04, song.stabCutoff ?? 3000);
    }
    for (const [at, n, len] of song.bass) {
      if (at !== step) continue;
      if (song.acid) {
        // filtro abre ao longo dos 4 compassos e fecha em cada nota
        const open = 500 + 2400 * Math.abs(Math.sin((step / 64) * Math.PI));
        this.tone(mtof(n), t, stepDur * len, song.bassWave, song.bassVol, open, { q: 14, cutoffEnd: 180 });
      } else {
        this.tone(mtof(n), t, stepDur * len, song.bassWave, song.bassVol, song.bassCutoff, { slideTo: song.slide ? mtof(n - 5) : undefined });
      }
    }
    for (const [at, n, len] of song.melody) {
      if (at === step) this.tone(mtof(n), t, stepDur * len, song.leadWave, song.leadVol, song.leadCutoff);
    }
    if (song.kick.includes(s)) this.kick(t, song.kickVol);
    for (const [at, f] of song.toms) {
      if (at === s) this.tom(t, f, f < 150 ? 0.42 : 0.2);
    }
    if (song.clap.includes(s)) this.hit(t, 0.13, 1800, 0.16);
    if (song.closedHat.includes(s)) this.hit(t, 0.03, 9000, 0.022);
    if (song.openHat.includes(s)) this.hit(t, 0.16, 8000, 0.05);
  }

  /** atabaque: som curto com a altura caindo */
  private tom(t: number, freq: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.16);
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, cutoff: number, opts: { q?: number; cutoffEnd?: number; attack?: number; slideTo?: number } = {}) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    f.type = "lowpass";
    f.frequency.setValueAtTime(cutoff, t);
    if (opts.q) f.Q.value = opts.q;
    if (opts.cutoffEnd) f.frequency.exponentialRampToValueAtTime(opts.cutoffEnd, t + dur);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack ?? 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.3);
  }

  private hit(t: number, dur: number, freq: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = freq > 5000 ? "highpass" : "bandpass";
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const music = new MusicEngine();
