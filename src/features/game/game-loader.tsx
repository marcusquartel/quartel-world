"use client";

import dynamic from "next/dynamic";

// WebGL só no cliente.
const GameHub = dynamic(() => import("./game-hub"), {
  ssr: false,
  loading: () => (
    <div className="font-display flex h-dvh items-center justify-center bg-[#000000] text-2xl text-[#00EBA8]">
      ★ MISSÃO DADA É MISSÃO CUMPRIDA ★
    </div>
  ),
});

export function GameLoader({ bots, showStats }: { bots: number; showStats: boolean }) {
  return <GameHub bots={bots} showStats={showStats} />;
}
