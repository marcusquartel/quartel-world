"use client";

import { useEffect } from "react";
import {
  ACHIEVEMENTS,
  ITEM_BY_ID,
  RARITY,
  LANDMARK_COUNT,
  type Achievement,
  type GameStats,
  levelFor,
} from "@/lib/game/catalog";
import { sfx } from "./sfx";

/** Insígnia de patente (asas + estrela), como no cartaz "Design de alta patente". */
function RankWings({ level }: { level: number }) {
  return (
    <div className="relative h-11 w-20 shrink-0 compact:h-7 compact:w-12" title={`Nível ${level}`}>
      <svg viewBox="0 0 160 88" className="absolute inset-0 h-full w-full" aria-hidden>
        <g fill="#00EBA8" stroke="#000" strokeWidth="4" strokeLinejoin="round">
          <path d="M4 22 H58 L54 34 H18 Z" />
          <path d="M20 40 H56 L54 52 H34 Z" />
          <path d="M34 58 H56 L56 68 H46 Z" />
          <path d="M156 22 H102 L106 34 H142 Z" />
          <path d="M140 40 H104 L106 52 H126 Z" />
          <path d="M126 58 H104 L104 68 H114 Z" />
          <circle cx="80" cy="44" r="34" />
        </g>
        <circle cx="80" cy="44" r="25" fill="#000" />
      </svg>
      <span className="font-display absolute inset-0 flex items-center justify-center text-lg text-[#00EBA8] compact:text-xs">{level}</span>
    </div>
  );
}

export function LevelBar({ unlocked, score }: { unlocked: string[]; score: number }) {
  const lv = levelFor(unlocked);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <RankWings level={lv.level} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm font-bold text-white">
          <span className="font-display truncate text-base tracking-wide compact:text-[11px]">{lv.rank.toUpperCase()}</span>
          <span className="shrink-0 text-xs text-white/70 compact:hidden">
            {lv.next ? `${lv.xp}/${lv.nextXp} XP → ${lv.next}` : `${lv.xp} XP · patente máxima`}
          </span>
        </div>
        <div className="mt-1 h-3.5 w-full overflow-hidden rounded-full border-[3px] border-black bg-neutral-800 compact:mt-0.5 compact:h-2 compact:border-0">
          <div
            className="h-full rounded-full bg-[repeating-linear-gradient(45deg,#00EBA8_0_8px,#7DF7D2_8px_16px)] transition-[width] duration-700"
            style={{ width: `${Math.round(lv.progress * 100)}%` }}
          />
        </div>
      </div>
      <div className="hidden shrink-0 rounded-xl border-[3px] border-black bg-white px-2.5 py-1 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] sm:block compact:rounded-lg compact:border-2 compact:px-1.5 compact:py-0 compact:text-[11px] compact:shadow-none">
        🏆 {score} pts
      </div>
    </div>
  );
}

const NUMBERS: { key: keyof GameStats; label: string; pts: string }[] = [
  { key: "starPoints", label: "Pontos de estrela", pts: "1 pt cada" },
  { key: "goldStars", label: "Estrelas douradas", pts: "valem 5" },
  { key: "legendaryStars", label: "Estrelas lendárias", pts: "valem 10" },
  { key: "supremeStars", label: "Estrelas supremas", pts: "valem 50" },
  { key: "minutes", label: "Minutos em campo", pts: "+2 por minuto" },
  { key: "received", label: "Interações recebidas", pts: "+3 cada" },
  { key: "given", label: "Interações dadas", pts: "+1 cada" },
  { key: "friends", label: "Pessoas diferentes", pts: "" },
  { key: "medals", label: "Medalhas recebidas", pts: "+10 cada" },
  { key: "visited", label: "Marcos visitados", pts: "+5 cada" },
  { key: "parties", label: "Festas no QG", pts: "+10 cada" },
  { key: "defended", label: "Invasores abatidos", pts: "+3 cada" },
  { key: "stolen", label: "Pontos perdidos", pts: "invasões e golpes" },
  { key: "spent", label: "Pontos em café", pts: "trocados na cafeteria" },
];

export function AchievementsBoard({ stats, unlocked, score }: { stats: GameStats; unlocked: string[]; score: number }) {
  const set = new Set(unlocked);
  const list = ACHIEVEMENTS.filter((a) => !a.teamOnly || stats.team);
  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-y-auto p-4 pb-10">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border-4 border-black bg-[#00EBA8] p-4 shadow-[4px_4px_0_#0a0a0a]">
          <div className="font-display text-sm tracking-[0.2em]">SUA PONTUAÇÃO</div>
          <div className="font-display text-5xl leading-none">{score}</div>
          <div className="mt-1 text-sm font-bold">{stats.rank ? `#${stats.rank} no ranking ao vivo` : "O ranking começa com 3+ pessoas no mundo"}</div>
          <ul className="mt-3 space-y-0.5 text-sm font-semibold">
            <li>⭐ Pegue estrelas (cobre 1 · prata 2 · dourada 5)</li>
            <li>⚡ A cada 3 min nasce uma estrela lendária (10). Só 1 pessoa pega!</li>
            <li>🌈 Raríssima: a Estrela Suprema (50) aparece a cada 12 min, por só 90s</li>
            <li>📍 Visite os {LANDMARK_COUNT} marcos do mapa</li>
            <li>👏 Interaja com a tropa e 🎖️ dê medalhas</li>
            <li>🕺 Dance junto com 2+ pessoas (Festa no QG)</li>
            <li>⏱️ Fique em campo: cada minuto conta</li>
            <li>⚔️ Invasão a cada 5 min: abata os bandidos antes que roubem seus pontos</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border-4 border-black bg-white p-3 shadow-[4px_4px_0_#0a0a0a] sm:grid-cols-3">
          {NUMBERS.map((n) => (
            <div key={n.key} className="rounded-xl border-2 border-black px-2.5 py-1.5">
              <div className="font-display text-2xl leading-none">{String(stats[n.key] ?? 0)}</div>
              <div className="text-xs font-bold leading-tight">{n.label}</div>
              {n.pts && <div className="text-[10px] font-semibold text-black/50">{n.pts}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-3xl text-white">
          Conquistas <span className="text-[#00EBA8]">{list.filter((a) => set.has(a.id)).length}/{list.length}</span>
        </h2>
        <p className="text-sm font-semibold text-white/70">Cada conquista destrava itens para o seu avatar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => {
          const on = set.has(a.id);
          return (
            <div key={a.id} className={`rounded-2xl border-4 border-black p-4 shadow-[4px_4px_0_#0a0a0a] ${on ? "bg-[#F9F9F9]" : "bg-neutral-300/90"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-[3px] border-black text-3xl ${on ? "bg-[#00EBA8]" : "bg-neutral-400 grayscale"}`}>
                  {on ? a.icon : "🔒"}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display text-lg leading-tight">{a.title}</span>
                    {a.live && <span className="rounded bg-black px-1.5 text-[10px] font-bold text-[#00EBA8]">AO VIVO</span>}
                    {a.teamOnly && <span className="rounded bg-black px-1.5 text-[10px] font-bold text-[#00EBA8]">★ EQUIPE</span>}
                  </div>
                  <p className="text-sm font-semibold text-black/70">{a.description}</p>
                  <p className="mt-0.5 text-xs font-bold text-black/50">+{a.xp} XP</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.rewards.map((r) => {
                  const it = ITEM_BY_ID[r];
                  return (
                    <span key={r} className="rounded-lg border-2 border-black bg-white px-2 py-0.5 text-xs font-bold" style={{ boxShadow: `inset 0 -3px 0 ${RARITY[it.rarity].color}` }}>
                      {it.name}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UnlockModal({
  achievement,
  remaining,
  onNext,
  onEquip,
}: {
  achievement: Achievement;
  remaining: number;
  onNext: () => void;
  onEquip: () => void;
}) {
  useEffect(() => {
    sfx.unlock();
  }, [achievement.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm compact:p-1">
      <div className="max-h-full w-full max-w-sm animate-[pop_.35s_cubic-bezier(.2,1.6,.4,1)] overflow-y-auto rounded-3xl border-4 border-black bg-[#F9F9F9] p-6 text-center shadow-[8px_8px_0_#0a0a0a] compact:max-w-md compact:rounded-xl compact:border-2 compact:p-2 compact:shadow-none">
        <div className="font-display text-sm tracking-[0.2em] text-[#FF5A00]">★ CONQUISTA DESTRAVADA ★</div>
        <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-black bg-[#00EBA8] text-6xl shadow-[4px_4px_0_#0a0a0a] compact:mt-1 compact:h-10 compact:w-10 compact:rounded-lg compact:border-2 compact:text-2xl compact:shadow-none">
          {achievement.icon}
        </div>
        <h3 className="font-display mt-4 text-3xl leading-tight compact:mt-1 compact:text-lg">{achievement.title}</h3>
        <p className="mt-1 font-semibold text-black/70 compact:mt-0 compact:text-xs">{achievement.description}</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-black/50 compact:hidden">Você ganhou</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 compact:mt-1 compact:gap-1 compact:text-[10px]">
          {achievement.rewards.map((r) => {
            const it = ITEM_BY_ID[r];
            return (
              <span key={r} className="rounded-xl border-[3px] border-black bg-white px-2.5 py-1 text-sm font-bold compact:rounded-md compact:border compact:px-1 compact:py-0 compact:text-[10px]">
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-black" style={{ background: RARITY[it.rarity].color }} />
                {it.name}
              </span>
            );
          })}
          <span className="rounded-xl border-[3px] border-black bg-black px-2.5 py-1 text-sm font-bold text-[#00EBA8] compact:rounded-md compact:border compact:px-1 compact:py-0 compact:text-[10px]">+{achievement.xp} XP</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 compact:mt-1.5 compact:gap-2">
          <button
            onClick={onNext}
            className="rounded-xl border-[3px] border-black bg-white py-2.5 font-bold shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:border-2 compact:py-1 compact:text-xs compact:shadow-none"
          >
            {remaining > 0 ? `Próxima (${remaining})` : "Fechar"}
          </button>
          <button
            onClick={onEquip}
            className="rounded-xl border-[3px] border-black bg-[#00EBA8] py-2.5 font-bold shadow-[3px_3px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none compact:border-2 compact:py-1 compact:text-xs compact:shadow-none"
          >
            Equipar agora
          </button>
        </div>
      </div>
    </div>
  );
}
