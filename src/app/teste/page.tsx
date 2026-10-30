import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quartel World · Modo teste",
  robots: { index: false, follow: false },
};

const BOTS = [10, 50, 100, 200, 500, 1000];

const card =
  "block rounded-2xl border-4 border-black bg-white p-4 shadow-[4px_4px_0_#0a0a0a] transition-transform hover:-translate-y-0.5";

/**
 * Página para a equipe testar: bots locais (só na sua tela), invasão e estrela suprema aceleradas.
 * Tudo em modo teste roda num canal separado — não aparece para quem está jogando de verdade.
 */
export default function TestePage() {
  return (
    <main className="font-game min-h-dvh bg-black bg-[radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:18px_18px] px-4 py-10 text-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl text-white md:text-5xl">
          QUARTEL WORLD <span className="text-[#00EBA8]">· MODO TESTE</span>
        </h1>
        <p className="mt-2 max-w-2xl font-semibold text-white/70">
          Para a equipe testar. Os bots existem só no seu navegador e você entra num canal separado: nada disso aparece para quem está jogando
          de verdade, nem conta no ranking oficial. O medidor de FPS aparece no canto da tela.
        </p>

        <h2 className="font-display mt-8 text-2xl text-white">🤖 Simular multidão</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BOTS.map((n) => (
            <Link key={n} prefetch={false} href={`/?bots=${n}`} className={card}>
              <div className="font-display text-3xl">{n}</div>
              <div className="text-sm font-bold text-black/60">bots andando, falando e interagindo</div>
            </Link>
          ))}
        </div>

        <h2 className="font-display mt-8 text-2xl text-white">⚡ Acelerar eventos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link prefetch={false} href="/?guerra&bots=30" className={card}>
            <div className="font-display text-xl">⚔️ Invasão a cada 1 min</div>
            <div className="text-sm font-bold text-black/60">em vez de 5 min · com 30 bots</div>
          </Link>
          <Link prefetch={false} href="/?suprema&bots=30" className={card}>
            <div className="font-display text-xl">🌈 Estrela Suprema a cada 1 min</div>
            <div className="text-sm font-bold text-black/60">em vez de 12 min · com 30 bots</div>
          </Link>
          <Link prefetch={false} href="/?guerra&suprema&bots=100" className={card}>
            <div className="font-display text-xl">🔥 Tudo junto</div>
            <div className="text-sm font-bold text-black/60">invasão + suprema + 100 bots</div>
          </Link>
        </div>

        <h2 className="font-display mt-8 text-2xl text-white">🔧 Monte o seu</h2>
        <div className="mt-3 rounded-2xl border-4 border-black bg-[#F9F9F9] p-4 text-sm font-semibold shadow-[4px_4px_0_#0a0a0a]">
          Combine na URL: <code className="rounded bg-black px-1.5 py-0.5 text-[#00EBA8]">?bots=N</code> (até 1000),{" "}
          <code className="rounded bg-black px-1.5 py-0.5 text-[#00EBA8]">&amp;guerra</code>,{" "}
          <code className="rounded bg-black px-1.5 py-0.5 text-[#00EBA8]">&amp;suprema</code>,{" "}
          <code className="rounded bg-black px-1.5 py-0.5 text-[#00EBA8]">?teste</code> (canal de teste sem bots, para testar o multiplayer com
          a equipe). Ex.: <code className="rounded bg-black px-1.5 py-0.5 text-[#00EBA8]">/?bots=300&amp;guerra</code>
        </div>

        <Link prefetch={false} href="/" className="font-display mt-8 inline-block rounded-2xl border-4 border-black bg-[#00EBA8] px-5 py-3 text-xl shadow-[4px_4px_0_#0a0a0a]">
          ← Voltar ao mundo de verdade
        </Link>
      </div>
    </main>
  );
}
