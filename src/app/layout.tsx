import type { Metadata, Viewport } from "next";
import { Fredoka, Lilita_One } from "next/font/google";
import "./globals.css";

// Fontes "cara de jogo": Lilita One nos títulos, Fredoka no resto.
// (Cores, logo e selos seguem o manual da Quartel.)
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const lilita = Lilita_One({ variable: "--font-lilita", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Quartel World",
  description: "O mundo 3D do Quartel Criativo: avatar, conquistas e a tropa da Quartel Design.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // a pinça controla o zoom do jogo, não da página
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fredoka.variable} ${lilita.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
