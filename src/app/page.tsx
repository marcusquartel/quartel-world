import { Suspense } from "react";
import { GameLoader } from "@/features/game/game-loader";

async function Game({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { bots } = await searchParams;
  // ?bots=N (máx. 1000): teste de carga local, só para a equipe. Mostra o medidor de FPS.
  const n = Math.max(0, Math.min(1000, Number(Array.isArray(bots) ? bots[0] : bots) || 0));
  return <GameLoader bots={n} showStats={bots !== undefined} />;
}

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#0B0B0B]" />}>
      <Game searchParams={searchParams} />
    </Suspense>
  );
}
