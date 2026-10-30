// Produtos Maxme Bio (site oficial: https://maxme.bio — maxmebio.com.br redireciona para lá).
// A loja é Shopify: /discount/CUPOM?redirect=/products/... aplica o cupom e abre o produto.
// Testado em 29/10/2026: QUARTEL = 20% de desconto no carrinho.
export const MAXME_BASE = "https://maxme.bio";
export const MAXME_COUPON = "QUARTEL";

export function couponUrl(path: string) {
  return `${MAXME_BASE}/discount/${MAXME_COUPON}?redirect=${path}`;
}

export interface Supplement {
  id: string;
  /** nome curto para a etiqueta 3D */
  short: string;
  name: string;
  blurb: string;
  /** caminho do produto no site (ex.: /products/creatina) */
  path: string;
  image: string;
  /** cor de destaque do expositor (tirada da embalagem) */
  color: string;
  emoji: string;
}

const p = (id: string, short: string, name: string, blurb: string, path: string, color: string, emoji: string): Supplement => ({
  id,
  short,
  name,
  blurb,
  path,
  image: `/supplements/${id}.png`,
  color,
  emoji,
});

export const SHOP_SUPPLEMENTS: Supplement[] = [
  p("whey-isolado", "Whey Isolado", "Whey Protein Isolado e Hidrolisado 832g", "Whey isolado e hidrolisado — chocolate, cappuccino ou natural.", "/products/maxme-protein-whey-isolado-e-hidrolisado-832g", "#8B5E3C", "🥛"),
  p("whey-colageno", "Whey + Colágeno", "Whey Concentrado + Colágeno Cpure 910g", "Whey concentrado com colágeno Cpure.", "/products/maxme-protein-whey-concentrado-colageno-cpure-910g", "#C9A27A", "💪"),
  p("creatina", "Creatina", "Creatina Monohidratada 100% Pura", "Creatina micronizada para treino e foco.", "/products/creatina", "#F2B705", "⚡"),
  p("coffee", "Coffee + Creatina", "Maxme Coffee + Creatina", "Café funcional com creatina.", "/products/maxme-coffee", "#5A3825", "☕"),
  p("q10", "Q10 + B", "Coenzima Q10 + B-Complex", "Coenzima Q10 com complexo B para energia celular.", "/products/coenzimaq10-b-complex", "#E4572E", "🔋"),
  p("omega3", "Ômega 3 Max", "Ômega 3 Max (EPA + DHA) — 60 cápsulas", "Ômega 3 concentrado com selo MEG-3®.", "/products/maxme-omega-3-max-60-capsulas", "#2B7DE9", "🐟"),
  p("adek", "ADEK", "ADEK — vitaminas A, D3, E e K2 em gotas", "Vitaminas A, D3, E e K2 MK7 líquidas.", "/products/adek-liquida", "#F5A623", "💧"),
  p("mag5", "Mag5", "Maxme Mag5 — 60 comprimidos", "Cinco tipos de magnésio em um só.", "/products/maxme-mag5-60-comprimidos", "#7B61FF", "🧲"),
  p("brainmag", "Brainmag", "Maxme Brainmag 300g — laranja", "Magnésio em pó para o cérebro.", "/products/maxme-brainmag-300g-sabor-laranja", "#FF7A00", "🧠"),
  p("d-ribose", "D-Ribose", "Maxme D-Ribose em pó", "D-Ribose para energia ao longo do dia.", "/products/d-ribose-em-po", "#00A86B", "🚀"),
];
