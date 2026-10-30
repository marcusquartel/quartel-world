"use client";

import { useCallback, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  achievementForItem,
  ITEMS,
  RARITY,
  SLOT_LABELS,
  SLOTS,
  type Avatar,
  type Slot,
} from "@/lib/game/catalog";
import { BlockAvatar } from "./block-avatar";
import { sfx } from "./sfx";

const SLOT_ICON: Record<Slot, string> = {
  skin: "✋",
  hair: "💇",
  hairColor: "🎨",
  makeup: "💄",
  top: "🎽",
  bottom: "👖",
  head: "🪖",
  back: "🎒",
  pet: "🐶",
  effect: "✨",
  title: "🏷️",
};

const ITEM_ICON: Record<string, string> = {
  "head-none": "∅",
  "back-none": "∅",
  "pet-none": "∅",
  "fx-none": "∅",
  "head-bone": "🧢",
  "head-fone": "🎧",
  "head-oculos": "🕶️",
  "head-boina": "🎖️",
  "head-capacete": "🪖",
  "head-quepe": "👑",
  "back-mochila": "🎒",
  "back-lapis": "✏️",
  "back-bandeira": "🚩",
  "back-jetpack": "🚀",
  "back-capa": "🦸",
  "pet-dalmata": "🐶",
  "mk-none": "∅",
  "mk-glitter": "✨",
  "mk-sardas": "🟤",
  "mk-estrela": "⭐",
  "mk-delineado": "👁️",
  "pet-cao": "🐕",
  "pet-pato": "🦆",
  "pet-drone": "🛸",
  "pet-aguia": "🦅",
  "fx-pixels": "👾",
  "fx-faiscas": "🔥",
  "fx-confete": "🎉",
  "fx-aura": "🌟",
  "hair-raspado": "▫️",
  "hair-curto": "💇",
  "hair-cacheado": "➰",
  "hair-coque": "🍙",
  "hair-longo": "💁",
  "hair-moicano": "🦔",
  "hair-black-power": "☁️",
};

export function Turntable({ avatar }: { avatar: Avatar }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });
  const noop = useCallback(() => false, []);
  return (
    <group ref={g} position={[0, -1.3, 0]}>
      <BlockAvatar avatar={avatar} getWalking={noop} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 40]} />
        <meshStandardMaterial color="#00EBA8" />
      </mesh>
    </group>
  );
}

export function AvatarEditor({
  avatar,
  unlocked,
  name,
  onChange,
  onName,
  onDone,
}: {
  avatar: Avatar;
  unlocked: Set<string>;
  name: string;
  onChange: (a: Avatar) => void;
  onName: (n: string) => void;
  /** salvar e voltar para o mundo (as mudanças já ficam salvas a cada clique) */
  onDone: () => void;
}) {
  const [slot, setSlot] = useState<Slot>("top");
  const items = ITEMS.filter((it) => it.slot === slot);
  const owned = ITEMS.filter((it) => unlocked.has(it.id)).length;

  return (
    <div className="mx-auto grid h-full w-full max-w-6xl gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(280px,380px)_1fr] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden compact:gap-2 compact:p-2 compact:md:grid-cols-[200px_1fr]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border-4 border-black bg-[radial-gradient(circle_at_50%_30%,#2E2E2E,#0b0b0b)] shadow-[6px_6px_0_#0a0a0a] md:aspect-auto md:min-h-0 md:flex-1">
          <Canvas shadows camera={{ position: [0, 0.2, 7], fov: 38 }}>
            <ambientLight intensity={1.1} />
            <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow />
            <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#00EBA8" />
            <Turntable avatar={avatar} />
          </Canvas>
          <div className="absolute left-3 top-3 rounded-full border-[3px] border-black bg-[#00EBA8] px-3 py-0.5 text-xs font-bold">
            {owned}/{ITEMS.length} itens
          </div>
        </div>
        <label className="flex shrink-0 flex-col gap-1 rounded-2xl border-4 border-black bg-white p-3 shadow-[4px_4px_0_#0a0a0a] compact:gap-0 compact:rounded-lg compact:border-2 compact:p-1 compact:shadow-none">
          <span className="text-xs font-bold uppercase tracking-wide text-black/60 compact:text-[9px]">Nome de guerra</span>
          <input
            value={name}
            maxLength={24}
            onChange={(e) => onName(e.target.value)}
            className="font-display bg-transparent text-xl outline-none compact:text-sm"
          />
        </label>
        <button
          onClick={() => {
            sfx.unlock();
            onDone();
          }}
          className="font-display shrink-0 rounded-2xl border-4 border-black bg-[#00EBA8] py-3.5 text-xl shadow-[4px_4px_0_#0a0a0a] compact:rounded-lg compact:border-2 compact:py-1 compact:text-xs compact:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          ✓ SALVAR E VOLTAR AO MUNDO
        </button>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2 compact:gap-1">
          {SLOTS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSlot(s);
                sfx.click();
              }}
              className={`rounded-xl border-[3px] border-black px-3 py-1.5 text-sm font-bold shadow-[3px_3px_0_#0a0a0a] transition-transform compact:rounded-md compact:border-2 compact:px-1.5 compact:py-0 compact:text-[10px] compact:shadow-none ${
                slot === s ? "-translate-y-0.5 bg-[#00EBA8]" : "bg-white hover:bg-[#F9F9F9]"
              }`}
            >
              {SLOT_ICON[s]} {SLOT_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 touch-auto grid-cols-2 content-start gap-3 overflow-y-auto pb-6 pr-1 sm:grid-cols-3 lg:grid-cols-4 compact:gap-1.5 compact:pb-2">
          {items.map((it) => {
            const has = unlocked.has(it.id);
            const on = avatar[slot] === it.id;
            const ach = has ? undefined : achievementForItem(it.id);
            return (
              <button
                key={it.id}
                disabled={!has}
                onClick={() => {
                  onChange({ ...avatar, [slot]: it.id });
                  sfx.pop();
                }}
                className={`relative flex flex-col items-center gap-1 rounded-2xl border-4 p-3 text-center shadow-[4px_4px_0_#0a0a0a] transition-transform compact:gap-0 compact:rounded-lg compact:border-2 compact:p-1 compact:shadow-none ${
                  on ? "border-black bg-[#00EBA8]" : "border-black bg-white hover:-translate-y-0.5"
                } ${has ? "" : "cursor-not-allowed bg-neutral-200 opacity-80"}`}
              >
                <span
                  className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-black"
                  style={{ background: RARITY[it.rarity].color }}
                  title={RARITY[it.rarity].label}
                />
                {it.colors.length > 0 && slot !== "title" && !ITEM_ICON[it.id] ? (
                  <span className="flex h-12 items-center compact:h-7 gap-1">
                    {it.colors.slice(0, 3).map((c, k) => (
                      <span key={k} className="h-9 w-9 rounded-lg border-[3px] border-black compact:h-5 compact:w-5 compact:rounded compact:border" style={{ background: c }} />
                    ))}
                  </span>
                ) : slot === "title" ? (
                  <span className="flex h-12 items-center compact:h-7">
                    <span className="rounded-md bg-black px-2 py-0.5 text-xs font-bold text-[#00EBA8]">{it.name}</span>
                  </span>
                ) : (
                  <span className="flex h-12 items-center text-3xl compact:h-7 compact:text-lg">{ITEM_ICON[it.id] ?? "◻️"}</span>
                )}
                <span className="text-sm font-bold leading-tight compact:text-[10px]">{it.name}</span>
                <span className="text-[11px] font-semibold compact:text-[9px]" style={{ color: has ? "#555" : "#333" }}>
                  {has ? RARITY[it.rarity].label : `🔒 ${ach?.title ?? "Em breve"}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
