"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ACHIEVEMENT_BY_ID,
  ITEM_BY_ID,
  ITEMS,
  levelFor,
  sanitizeAvatar,
  scoreFor,
  unlockedAchievements,
  unlockedItems,
  type Avatar,
  type GameStats,
} from "@/lib/game/catalog";
import { AchievementsBoard, LevelBar, UnlockModal } from "./achievements-board";
import { AvatarEditor } from "./avatar-editor";
import { BotSim, demoTeam, generateBots, type Player, type PosSource } from "./bots";
import { Entry } from "./entry";
import Lobby, { type GameEvent } from "./lobby";
import { Net, NET_ENABLED, type NetStatus, type PeerProfile } from "./net";
import { music } from "./music";
import { loadSaved, storeSaved, today, type Profile, type Saved } from "./profile";
import { VIP_MIN_LEVEL } from "./world";

type Tab = "mundo" | "avatar" | "conquistas";

const ALL_ITEMS = new Set(ITEMS.map((i) => i.id));
/** mínimo de pessoas no mapa (bots completam) */
const MIN_PLAYERS = 30;

/** Limita interações recebidas da mesma pessoa (1 a cada 8s) para ninguém inflar a pontuação de outro. */
class ReceiveGate {
  private last = new Map<string, number>();
  allow(from: string) {
    const now = Date.now();
    if (now - (this.last.get(from) ?? 0) < 8000) return false;
    this.last.set(from, now);
    return true;
  }
}

export default function GameHub({ bots = 0, showStats = false }: { bots?: number; showStats?: boolean }) {
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState<Tab>("mundo");
  const [net, setNet] = useState<Net | null>(null);
  const [peers, setPeers] = useState<PeerProfile[]>([]);
  const [status, setStatus] = useState<NetStatus | "demo">(NET_ENABLED ? "connecting" : "demo");
  const [gate] = useState(() => new ReceiveGate());
  // celular em pé: sugere girar para a horizontal
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait) and (pointer: coarse)").matches);
  const [rotateDismissed, setRotateDismissed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait) and (pointer: coarse)");
    const on = () => setPortrait(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => storeSaved(saved), [saved]);

  // ---------- rede
  useEffect(() => {
    if (!net) return;
    const off = net.listen({ peers: setPeers, status: setStatus });
    return () => {
      off();
      net.close();
    };
  }, [net]);

  // ---------- tempo em campo: +1 minuto a cada 60s com a aba visível
  useEffect(() => {
    if (!entered) return;
    const iv = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setSaved((s) => ({ ...s, stats: { ...s.stats, minutes: s.stats.minutes + 1 } }));
    }, 60_000);
    return () => clearInterval(iv);
  }, [entered]);

  const profile = saved.profile;
  const team = profile?.team ?? false;

  // ---------- outras pessoas (rede, ou bots no modo demo / ?bots=N)
  // Mundo sempre com pelo menos MIN_PLAYERS: bots completam o que falta e saem quando gente de verdade entra.
  // O conjunto é o mesmo para todo mundo (sementes fixas), então os nomes batem entre as telas.
  const fillerPool = useMemo(() => generateBots(MIN_PLAYERS, 3030, "tropa"), []);
  const testBots = useMemo(() => generateBots(bots), [bots]);
  const demo = useMemo(() => (NET_ENABLED ? [] : demoTeam()), []);
  const sim = useMemo(() => new BotSim([...demo, ...fillerPool, ...testBots].map((p) => p.id)), [demo, fillerPool, testBots]);
  const realCount = peers.length + 1;
  const fill = Math.max(0, MIN_PLAYERS - realCount - demo.length);
  const botPlayers = useMemo(() => [...demo, ...fillerPool.slice(0, fill), ...testBots], [demo, fillerPool, fill, testBots]);
  const source: PosSource = useMemo(() => ({ get: (id: string) => net?.get(id) ?? sim?.get(id) }), [net, sim]);

  // ---------- pontuação e ranking ao vivo
  const baseStats: GameStats = useMemo(() => ({ ...saved.stats, team, rank: null }), [saved.stats, team]);
  const myScore = scoreFor(baseStats);

  const ranked = useMemo(() => {
    const list: { id: string; score: number }[] = [
      { id: profile?.id ?? "me", score: myScore },
      ...peers.map((p) => ({ id: p.id, score: Math.max(0, Math.floor(Number(p.score) || 0)) })),
    ];
    list.sort((a, b) => b.score - a.score);
    return new Map(list.map((x, k) => [x.id, k + 1]));
  }, [profile?.id, myScore, peers]);

  // pódio/General só contam pessoas reais (no modo demo, a equipe fictícia conta)
  const crowd = realCount + (NET_ENABLED ? 0 : demo.length);
  // pódio e "General" só valem com pelo menos 3 pessoas no mundo
  const myRank = crowd >= 3 ? (ranked.get(profile?.id ?? "me") ?? null) : null;
  const stats: GameStats = useMemo(() => ({ ...baseStats, rank: myRank }), [baseStats, myRank]);

  const unlocked = useMemo(() => unlockedAchievements(stats), [stats]);
  const items = useMemo(() => unlockedItems(unlocked), [unlocked]);
  // regra de ouro: o avatar sempre passa pela sanitização (itens "ao vivo" saem se perder a posição)
  const avatar = useMemo(() => sanitizeAvatar(saved.avatar, items), [saved.avatar, items]);
  const vipAllowed = team || levelFor(unlocked).level >= VIP_MIN_LEVEL;
  const queue = entered ? unlocked.filter((id) => !saved.seen.includes(id)) : [];

  const me: Player = useMemo(
    () => ({
      id: profile?.id ?? "me",
      name: profile?.nick ?? "Recruta",
      role: profile?.profession ?? "",
      avatar,
      rank: myRank,
      score: myScore,
      team,
    }),
    [profile, avatar, myRank, myScore, team],
  );

  const others: Player[] = useMemo(
    () => [
      ...peers.map((p) => ({
        id: p.id,
        name: String(p.nick ?? "Recruta").slice(0, 16),
        role: String(p.profession ?? "").slice(0, 28),
        avatar: sanitizeAvatar(p.avatar ?? {}, ALL_ITEMS),
        score: Math.max(0, Math.floor(Number(p.score) || 0)),
        rank: ranked.get(p.id) ?? null,
        team: Boolean(p.team),
      })),
      ...botPlayers.map((p) => ({ ...p, rank: null })),
    ],
    [peers, botPlayers, ranked],
  );

  // ranking e pódio: só gente de verdade (no modo demo, a equipe fictícia também)
  const ranking = useMemo(() => {
    const demoIds = new Set(demo.map((d) => d.id));
    return [me, ...others].filter((p) => !p.bot || demoIds.has(p.id)).sort((a, b) => b.score - a.score);
  }, [me, others, demo]);

  // o que os outros veem de mim
  useEffect(() => {
    if (!net || !profile) return;
    net.updateMe({ id: profile.id, nick: profile.nick, profession: profile.profession, team, avatar, score: myScore });
  }, [net, profile, team, avatar, myScore]);

  // ---------- eventos do jogo
  const onGame = useCallback(
    (e: GameEvent) => {
      if (e.t === "received" && !gate.allow(e.from)) return;
      setSaved((s) => {
        const st = { ...s.stats };
        switch (e.t) {
          case "star":
            st.starPoints += e.value;
            if (e.gold) st.goldStars++;
            if (e.legendary) st.legendaryStars++;
            if (e.supreme) st.supremeStars = (st.supremeStars ?? 0) + 1;
            return { ...s, stats: st };
          case "received":
            if (e.kind === "medal") st.medals++;
            else st.received++;
            return { ...s, stats: st };
          case "given": {
            st.given++;
            const friends = s.friends.includes(e.to) ? s.friends : [...s.friends, e.to];
            st.friends = friends.length;
            const medalsGiven = e.kind === "medal" ? { ...s.medalsGiven, [e.to]: today() } : s.medalsGiven;
            return { ...s, stats: st, friends, medalsGiven };
          }
          case "visit": {
            if (s.visited.includes(e.id)) return s;
            const visited = [...s.visited, e.id];
            st.visited = visited.length;
            if (e.id === "vip") st.vip = 1;
            return { ...s, stats: st, visited };
          }
          case "party":
            st.parties++;
            return { ...s, stats: st };
          case "contact-given":
            st.contacts++;
            return { ...s, stats: st };
          case "defend":
            st.defended++;
            return { ...s, stats: st };
          case "stolen": {
            // não rouba mais do que a pessoa tem
            const take = Math.min(e.amount, scoreFor({ ...s.stats, rank: null }));
            if (take <= 0) return s;
            st.stolen += take;
            return { ...s, stats: st };
          }
          case "coffee": {
            // só troca se a pessoa tiver os pontos
            if (scoreFor({ ...s.stats, rank: null }) < e.cost) return s;
            st.spent = (st.spent ?? 0) + e.cost;
            return { ...s, stats: st };
          }
          case "contact-received": {
            const contacts = [e.contact, ...s.contacts.filter((c) => c.id !== e.contact.id)].slice(0, 200);
            return { ...s, contacts };
          }
        }
      });
    },
    [gate],
  );

  const enter = (p: Profile, a: Avatar) => {
    setSaved((s) => ({ ...s, profile: p, avatar: a }));
    setEntered(true);
    setTab("mundo");
    music.start();
    if (NET_ENABLED && !net) {
      const n = new Net({ id: p.id, nick: p.nick, profession: p.profession, team: p.team, avatar: a, score: myScore });
      n.connect();
      setNet(n);
    }
  };

  if (!entered || !profile) {
    return <Entry profile={profile} avatar={saved.avatar} online={null} onEnter={enter} />;
  }

  const current = queue[0] ? ACHIEVEMENT_BY_ID[queue[0]] : null;
  const showRotate = portrait && !rotateDismissed;

  return (
    <div className="font-game flex h-dvh w-full flex-col overflow-hidden bg-[#000000] text-black">
      {/* topo: patente + abas */}
      <header className="relative z-30 flex flex-wrap items-center gap-3 border-b-4 border-black bg-[#111111] px-3 py-2 sm:flex-nowrap compact:flex-nowrap compact:gap-2 compact:border-b-2 compact:px-2 compact:py-1">
        <div className="font-display flex shrink-0 items-center gap-2 text-xl text-[#00EBA8]">
          <Image src="/brand/q-white.png" alt="Quartel" width={30} height={38} className="h-9 w-auto compact:h-6" />
          <span className="hidden xl:inline">QUARTEL WORLD</span>
        </div>
        <LevelBar unlocked={unlocked} score={myScore} />
        <nav className="flex w-full shrink-0 gap-2 sm:w-auto compact:w-auto compact:gap-1">
          {(
            [
              ["mundo", "🌍 Mundo"],
              ["avatar", "🪖 Meu avatar"],
              ["conquistas", "🏅 Conquistas"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl border-[3px] border-black px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] sm:flex-none compact:flex-none compact:rounded-lg compact:border-2 compact:px-2 compact:py-0.5 compact:text-[11px] compact:shadow-none ${tab === t ? "bg-[#00EBA8]" : "bg-white"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative min-h-0 flex-1">
        {/* O Canvas do mundo nunca sai do DOM: some com opacidade e para o loop. */}
        <div className={`absolute inset-0 ${tab === "mundo" ? "" : "pointer-events-none opacity-0"}`}>
          <Lobby
            me={me}
            others={others}
            source={source}
            net={net}
            sim={sim}
            ranking={ranking}
            visited={saved.visited}
            medalsGiven={saved.medalsGiven}
            vipAllowed={vipAllowed}
            card={saved.card}
            contacts={saved.contacts}
            onCard={(card) => setSaved((s) => ({ ...s, card }))}
            status={status}
            active={tab === "mundo"}
            paused={!!current}
            showStats={showStats}
            onGame={onGame}
          />
        </div>
        {tab === "avatar" && (
          <div className="absolute inset-0 bg-[#1C1C1C] bg-[radial-gradient(#2E2E2E_1px,transparent_1px)] [background-size:18px_18px]">
            <AvatarEditor
              avatar={avatar}
              unlocked={items}
              name={profile.nick}
              onChange={(a) => setSaved((s) => ({ ...s, avatar: a }))}
              onName={(n) => setSaved((s) => (s.profile ? { ...s, profile: { ...s.profile, nick: n.slice(0, 16) } } : s))}
              onDone={() => setTab("mundo")}
            />
          </div>
        )}
        {tab === "conquistas" && (
          <div className="absolute inset-0 bg-[#1C1C1C] bg-[radial-gradient(#2E2E2E_1px,transparent_1px)] [background-size:18px_18px]">
            <AchievementsBoard stats={stats} unlocked={unlocked} score={myScore} />
          </div>
        )}
      </main>

      {showRotate && tab === "mundo" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center text-white">
          <div className="animate-[spin_2.5s_ease-in-out_infinite] text-6xl">📱</div>
          <div className="font-display text-3xl leading-tight">
            Gire o celular
            <br />
            <span className="text-[#00EBA8]">para a horizontal</span>
          </div>
          <p className="max-w-xs text-sm font-semibold text-white/70">O Quartel World fica muito melhor deitado: mais mapa, mais espaço para os controles.</p>
          <button onClick={() => setRotateDismissed(true)} className="text-sm font-bold underline">
            Continuar assim mesmo
          </button>
        </div>
      )}

      {current && (
        <UnlockModal
          achievement={current}
          remaining={queue.length - 1}
          onNext={() => setSaved((s) => ({ ...s, seen: [...s.seen, current.id] }))}
          onEquip={() => {
            setSaved((s) => {
              const next = { ...s.avatar };
              for (const id of current.rewards) {
                const it = ITEM_BY_ID[id];
                if (it) next[it.slot] = id;
              }
              return { ...s, avatar: next, seen: [...s.seen, current.id] };
            });
          }}
        />
      )}
    </div>
  );
}
