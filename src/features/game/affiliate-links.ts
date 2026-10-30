// LINKS DE AFILIADO — Mercado Livre (Programa "Afiliados e Criadores")
//
// Como preencher (5 min, depois que sua conta de afiliado for aprovada):
//   1. Entre em https://afiliados.mercadolivre.com.br/ → Ferramentas → Gerador de link.
//   2. Cole o link "loja" de cada produto abaixo (ou de um produto específico, ex.: /p/MLB...).
//      Se o gerador recusar a página da loja, abra um produto daquela linha e gere o link dele.
//   3. Cole o link gerado (ex.: https://mercadolivre.com/sec/XXXX) no campo "afiliado".
//
// Enquanto "afiliado" estiver vazio, o botão leva para a loja oficial Apple no Mercado Livre,
// sem comissão. Comissão em celulares/informática/eletrônicos: 5% (janela de 24h após o clique).

export interface AffiliateLink {
  /** página de destino sem comissão (loja oficial Apple no Mercado Livre) */
  loja: string;
  /** link gerado no portal de afiliados — cole aqui */
  afiliado: string;
}

// Gerados em 29/10/2026 no Gerador de links (etiqueta moma5964349).
// Páginas de categoria da loja não são aceitas pelo gerador; buscas são.
export const AFFILIATE_LINKS: Record<string, AffiliateLink> = {
  iphone: {
    loja: "https://lista.mercadolivre.com.br/loja/apple/iphone",
    afiliado: "https://meli.la/2fXqGUw",
  },
  "macbook-air": {
    loja: "https://lista.mercadolivre.com.br/loja/apple/macbook-air",
    afiliado: "https://meli.la/21SpK5s",
  },
  "macbook-pro": {
    loja: "https://lista.mercadolivre.com.br/macbook-pro",
    afiliado: "https://meli.la/1tCnnVY",
  },
  imac: {
    loja: "https://lista.mercadolivre.com.br/imac",
    afiliado: "https://meli.la/16DttKH",
  },
  ipad: {
    loja: "https://lista.mercadolivre.com.br/loja/apple/ipad",
    afiliado: "https://meli.la/1JCVnQJ",
  },
  watch: {
    loja: "https://lista.mercadolivre.com.br/loja/apple/apple-watch",
    afiliado: "https://meli.la/1eUzVF1",
  },
  airpods: {
    loja: "https://lista.mercadolivre.com.br/loja/apple/airpods",
    afiliado: "https://meli.la/2Ep7eyu",
  },
};

/** Link usado no botão: o de afiliado, se houver; senão a loja. */
export function buyUrl(productId: string) {
  const l = AFFILIATE_LINKS[productId];
  return (l?.afiliado || l?.loja || "https://www.mercadolivre.com.br/loja/apple").trim();
}

export function hasAffiliate(productId: string) {
  return Boolean(AFFILIATE_LINKS[productId]?.afiliado.trim());
}
