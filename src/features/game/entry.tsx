"use client";

import { useState } from "react";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { ITEMS, type Avatar, type Slot } from "@/lib/game/catalog";
import { Turntable } from "./avatar-editor";
import { GENDERS, newId, PROFESSIONS, starterHair, welcome, type Gender, type Profile } from "./profile";
import { sfx } from "./sfx";

const QUICK_SLOTS: { slot: Slot; label: string }[] = [
  { slot: "skin", label: "Pele" },
  { slot: "hair", label: "Cabelo" },
  { slot: "hairColor", label: "Cor do cabelo" },
  { slot: "top", label: "Roupa" },
];

const HAIR_ICON: Record<string, string> = {
  "hair-raspado": "▫️",
  "hair-curto": "💇",
  "hair-cacheado": "➰",
  "hair-coque": "🍙",
  "hair-longo": "💁",
};

const chip = (on: boolean) =>
  `rounded-xl border-[3px] border-black px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] transition-transform compact:rounded-md compact:border-2 compact:px-1.5 compact:py-0 compact:text-[11px] compact:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
    on ? "bg-[#00EBA8]" : "bg-white hover:bg-[#F9F9F9]"
  }`;

export function Entry({
  profile,
  avatar,
  online,
  onEnter,
}: {
  profile: Profile | null;
  avatar: Avatar;
  online: number | null;
  onEnter: (p: Profile, a: Avatar) => void;
}) {
  const [step, setStep] = useState<"back" | "data" | "look">(profile ? "back" : "data");
  const [nick, setNick] = useState(profile?.nick ?? "");
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const knownProf = profile && (PROFESSIONS as readonly string[]).includes(profile.profession);
  const [prof, setProf] = useState<string | null>(profile ? (knownProf ? profile.profession : "outra") : null);
  const [otherProf, setOtherProf] = useState(profile && !knownProf ? profile.profession : "");
  const [isTeam, setIsTeam] = useState(profile?.team ?? false);
  const [code, setCode] = useState("");
  const [teamOk, setTeamOk] = useState(profile?.team ?? false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [look, setLook] = useState<Avatar>(avatar);

  const profession = prof === "outra" ? otherProf.trim() : (prof ?? "");
  const nickOk = nick.trim().length >= 2;

  async function next() {
    setError(null);
    if (!nickOk) return setError("Escolha um nickname com pelo menos 2 letras.");
    if (!gender) return setError("Escolha uma opção de gênero.");
    if (!profession) return setError("Conta pra gente sua profissão.");
    if (isTeam && !teamOk) {
      setChecking(true);
      try {
        const r = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
        const j = (await r.json()) as { ok: boolean };
        if (!j.ok) {
          setChecking(false);
          return setError("Código da equipe incorreto. Confira com a Quartel ou desmarque a opção.");
        }
        setTeamOk(true);
      } catch {
        setChecking(false);
        return setError("Não consegui conferir o código agora. Tente de novo.");
      }
      setChecking(false);
    }
    if (!profile) setLook((l) => ({ ...l, hair: starterHair(gender) }));
    sfx.click();
    setStep("look");
  }

  function enter(p: Profile, a: Avatar) {
    sfx.unlock();
    onEnter(p, a);
  }

  const finalProfile = (): Profile => ({
    id: profile?.id ?? newId(),
    nick: nick.trim().slice(0, 16),
    gender: gender ?? "x",
    profession: profession.slice(0, 28),
    team: isTeam && teamOk,
  });

  return (
    <div className="font-game relative flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-[#000000] bg-[radial-gradient(circle_at_20%_10%,#003D2C_0,transparent_45%),radial-gradient(#262626_1px,transparent_1px)] [background-size:auto,18px_18px] p-4 compact:items-start compact:p-2">
      <div className="grid w-full max-w-5xl items-center gap-6 md:grid-cols-[1fr_1.1fr] compact:items-start compact:gap-3 compact:md:grid-cols-[210px_1fr]">
        {/* lado esquerdo: marca / prévia */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <div className="flex items-center gap-4">
            <Image src="/brand/logo-white.png" alt="Quartel Design" width={96} height={110} priority className="h-auto w-20 compact:w-10" />
            <span className="font-display text-xs tracking-[0.3em] text-[#00EBA8]">APRESENTA</span>
          </div>
          <h1 className="font-display mt-4 text-5xl leading-none text-white md:text-7xl compact:mt-1 compact:text-2xl compact:md:text-2xl">
            QUARTEL
            <br />
            <span className="text-[#00EBA8]">WORLD</span>
          </h1>
          <p className="mt-3 max-w-md text-base font-semibold text-white/70 compact:mt-1 compact:text-[11px]">
            Design de alta patente, agora em 3D. Pegue estrelas, explore o mapa, dance com a tropa e suba de patente.
            <span className="mt-2 block font-display text-lg text-[#00EBA8] compact:mt-1 compact:text-[11px]">Missão dada é missão cumprida. ★★★</span>
          </p>
          <div className="mt-3 hidden items-center gap-2 rounded-2xl border-[3px] border-black bg-[#00EBA8] px-3 py-2 text-sm font-bold text-black pointer-coarse:flex compact:mt-1 compact:rounded-lg compact:border-2 compact:px-1.5 compact:py-1 compact:text-[10px]">
            <span className="shrink-0 text-2xl">📱↻</span>
            <span>
              No celular, jogue com a tela <u>na horizontal</u>. Use dois dedos para dar zoom.
            </span>
          </div>
          {online !== null && (
            <span className="mt-3 rounded-full border-[3px] border-black bg-white px-3 py-1 text-sm font-bold">🟢 {online} pessoa(s) no mundo agora</span>
          )}
          {step === "look" && (
            <div className="mt-5 aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl compact:mt-1 compact:max-w-[150px] compact:rounded-xl border-4 border-black bg-[radial-gradient(circle_at_50%_30%,#2E2E2E,#0b0b0b)] shadow-[6px_6px_0_#00EBA855]">
              <Canvas shadows camera={{ position: [0, 0.4, 5.6], fov: 40 }}>
                <ambientLight intensity={1.1} />
                <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow />
                <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#00EBA8" />
                <Turntable avatar={look} />
              </Canvas>
            </div>
          )}
        </div>

        {/* lado direito: formulário */}
        <div className="rounded-3xl border-4 border-black bg-[#F9F9F9] p-5 shadow-[8px_8px_0_#00EBA8] md:p-7 compact:rounded-xl compact:border-2 compact:p-2 compact:shadow-none compact:md:p-2">
          {step === "back" && profile && (
            <div className="flex flex-col gap-4 compact:gap-1.5">
              <div className="font-display text-sm tracking-[0.2em] text-[#FF5A00] compact:text-[10px]">★ ALISTAMENTO CONFIRMADO ★</div>
              <h2 className="font-display text-3xl leading-tight compact:text-base">
                {welcome(profile.gender)} de volta, <span className="text-[#FF5A00]">{profile.nick}</span>!
              </h2>
              <p className="font-semibold text-black/70">
                {profile.profession}
                {profile.team ? " · ★ Equipe Quartel" : ""}. Seu avatar e seus pontos estão guardados neste navegador.
              </p>
              <button
                onClick={() => enter(profile, avatar)}
                className="font-display rounded-2xl border-4 border-black bg-[#00EBA8] py-4 text-xl shadow-[4px_4px_0_#0a0a0a] compact:rounded-lg compact:border-2 compact:py-1 compact:text-sm compact:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                ENTRAR NO QUARTEL ★
              </button>
              <button className="text-sm font-bold underline" onClick={() => setStep("data")}>
                Mudar meus dados
              </button>
            </div>
          )}

          {step === "data" && (
            <form
              className="flex flex-col gap-5 compact:gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void next();
              }}
            >
              <div>
                <div className="font-display text-sm tracking-[0.2em] text-[#FF5A00] compact:text-[10px]">FICHA DE ALISTAMENTO · 1/2</div>
                <h2 className="font-display mt-1 text-3xl leading-tight compact:mt-0 compact:text-base">Antes de entrar, se apresente.</h2>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold compact:text-[11px]">Nickname</span>
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  maxLength={16}
                  autoFocus
                  placeholder="Como a tropa vai te chamar?"
                  className="font-display rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-lg outline-none compact:rounded-lg compact:border-2 compact:px-2 compact:py-0.5 compact:text-sm focus:shadow-[3px_3px_0_#00EBA8]"
                />
              </label>

              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-sm font-bold compact:mb-0.5 compact:text-[11px]">Gênero</legend>
                <div className="flex flex-wrap gap-2 compact:gap-1">
                  {GENDERS.map((g) => (
                    <button type="button" key={g.id} className={chip(gender === g.id)} onClick={() => setGender(g.id)}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-sm font-bold compact:mb-0.5 compact:text-[11px]">Profissão</legend>
                <div className="flex flex-wrap gap-2 compact:gap-1">
                  {PROFESSIONS.map((p) => (
                    <button type="button" key={p} className={chip(prof === p)} onClick={() => setProf(p)}>
                      {p}
                    </button>
                  ))}
                  <button type="button" className={chip(prof === "outra")} onClick={() => setProf("outra")}>
                    Outra…
                  </button>
                </div>
                {prof === "outra" && (
                  <input
                    value={otherProf}
                    onChange={(e) => setOtherProf(e.target.value)}
                    maxLength={28}
                    placeholder="Qual?"
                    className="mt-1 rounded-xl border-[3px] border-black bg-white px-3 py-2 font-bold outline-none"
                  />
                )}
              </fieldset>

              <div className="rounded-2xl border-[3px] border-dashed border-black/40 p-3 compact:rounded-lg compact:border compact:p-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold compact:text-[11px]">
                  <input type="checkbox" checked={isTeam} onChange={(e) => setIsTeam(e.target.checked)} className="h-5 w-5 accent-[#00EBA8] compact:h-3.5 compact:w-3.5" />
                  Sou da equipe Quartel Design
                </label>
                {isTeam && !teamOk && (
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Código da equipe"
                    className="mt-2 w-full rounded-xl border-[3px] border-black bg-white px-3 py-2 font-bold uppercase tracking-widest outline-none"
                  />
                )}
                {isTeam && teamOk && <p className="mt-2 text-sm font-bold text-[#4B5320]">★ Código confirmado: você terá o selo EQUIPE QUARTEL.</p>}
              </div>

              {error && <p className="rounded-xl border-[3px] border-black bg-[#FF5A00] px-3 py-2 text-sm font-bold text-white">{error}</p>}

              <button
                type="submit"
                disabled={checking}
                className="font-display rounded-2xl border-4 border-black bg-[#00EBA8] py-3.5 text-xl shadow-[4px_4px_0_#0a0a0a] compact:rounded-lg compact:border-2 compact:py-1 compact:text-sm compact:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                {checking ? "CONFERINDO…" : "PRÓXIMO →"}
              </button>
            </form>
          )}

          {step === "look" && (
            <div className="flex flex-col gap-4 compact:gap-1.5">
              <div>
                <div className="font-display text-sm tracking-[0.2em] text-[#FF5A00] compact:text-[10px]">FICHA DE ALISTAMENTO · 2/2</div>
                <h2 className="font-display mt-1 text-3xl leading-tight compact:mt-0 compact:text-base">Monte seu soldado.</h2>
                <p className="text-sm font-semibold text-black/60 compact:hidden">Dá para mudar tudo depois na aba “Meu avatar”. Itens novos destravam jogando.</p>
              </div>
              {QUICK_SLOTS.map(({ slot, label }) => (
                <div key={slot}>
                  <div className="mb-1.5 text-sm font-bold compact:mb-0 compact:text-[10px]">{label}</div>
                  <div className="flex flex-wrap gap-2 compact:gap-1">
                    {ITEMS.filter((it) => it.slot === slot && it.free).map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        title={it.name}
                        onClick={() => {
                          setLook((l) => ({ ...l, [slot]: it.id }));
                          sfx.pop();
                        }}
                        className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl border-[3px] border-black px-1.5 shadow-[3px_3px_0_#0a0a0a] compact:h-6 compact:min-w-6 compact:rounded-md compact:border compact:px-0.5 compact:shadow-none ${
                          look[slot] === it.id ? "bg-[#00EBA8]" : "bg-white"
                        }`}
                      >
                        {slot === "hair" ? (
                          <span className="text-xs font-bold">
                            {HAIR_ICON[it.id]} {it.name}
                          </span>
                        ) : (
                          it.colors.slice(0, 2).map((c, k) => <span key={k} className="h-6 w-6 rounded-md border-2 border-black compact:h-4 compact:w-4 compact:rounded-sm compact:border" style={{ background: c }} />)
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-2 flex gap-3 compact:mt-0.5 compact:gap-1.5">
                <button
                  className="rounded-2xl border-4 border-black bg-white px-4 py-3 font-bold shadow-[4px_4px_0_#0a0a0a] compact:rounded-lg compact:border-2 compact:px-2 compact:py-1 compact:text-xs compact:shadow-none"
                  onClick={() => setStep("data")}
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => enter(finalProfile(), look)}
                  className="font-display flex-1 rounded-2xl border-4 border-black bg-[#00EBA8] py-3.5 text-xl shadow-[4px_4px_0_#0a0a0a] compact:rounded-lg compact:border-2 compact:py-1 compact:text-sm compact:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  ENTRAR NO QUARTEL ★
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
