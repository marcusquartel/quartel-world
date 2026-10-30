// FONTE ÚNICA do Quartel World: slots, itens, raridades, conquistas, patentes.
// Quando o banco existir, o SQL `game_catalog()` deve espelhar este arquivo
// (teste de paridade em tests/game-catalog.test.ts).

export const SLOTS = [
  "skin",
  "hair",
  "hairColor",
  "makeup",
  "top",
  "bottom",
  "head",
  "back",
  "pet",
  "effect",
  "title",
] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  skin: "Pele",
  hair: "Cabelo",
  hairColor: "Cor do cabelo",
  makeup: "Make",
  top: "Farda",
  bottom: "Calça",
  head: "Cabeça",
  back: "Costas",
  pet: "Mascote",
  effect: "Efeito",
  title: "Título",
};

export type Rarity = "comum" | "raro" | "epico" | "lendario";
export const RARITY: Record<Rarity, { label: string; color: string }> = {
  comum: { label: "Comum", color: "#9CA3AF" },
  raro: { label: "Raro", color: "#3B82F6" },
  epico: { label: "Épico", color: "#A855F7" },
  lendario: { label: "Lendário", color: "#F2B705" },
};

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  /** cores usadas pelo renderizador (0 = principal) */
  colors: string[];
  rarity: Rarity;
  /** disponível para todo mundo desde o primeiro acesso */
  free?: boolean;
}

const i = (
  id: string,
  slot: Slot,
  name: string,
  colors: string[],
  rarity: Rarity = "comum",
  free = false,
): Item => ({ id, slot, name, colors, rarity, free });

export const ITEMS: Item[] = [
  // Pele
  i("skin-1", "skin", "Tom 1", ["#F6D7B8"], "comum", true),
  i("skin-2", "skin", "Tom 2", ["#E8B98F"], "comum", true),
  i("skin-3", "skin", "Tom 3", ["#C98D5E"], "comum", true),
  i("skin-4", "skin", "Tom 4", ["#9C6440"], "comum", true),
  i("skin-5", "skin", "Tom 5", ["#6E4428"], "comum", true),
  i("skin-6", "skin", "Tom 6", ["#46291A"], "comum", true),

  // Cabelo (formato)
  i("hair-raspado", "hair", "Raspado", [], "comum", true),
  i("hair-curto", "hair", "Curto", [], "comum", true),
  i("hair-cacheado", "hair", "Cacheado", [], "comum", true),
  i("hair-coque", "hair", "Coque", [], "comum", true),
  i("hair-longo", "hair", "Longo", [], "comum", true),
  i("hair-moicano", "hair", "Moicano", [], "raro"),
  i("hair-black-power", "hair", "Black power", [], "raro"),

  // Cor do cabelo
  i("hc-preto", "hairColor", "Preto", ["#1A1A1A"], "comum", true),
  i("hc-castanho", "hairColor", "Castanho", ["#5A3825"], "comum", true),
  i("hc-loiro", "hairColor", "Loiro", ["#E3C16F"], "comum", true),
  i("hc-ruivo", "hairColor", "Ruivo", ["#B5502B"], "comum", true),
  i("hc-grisalho", "hairColor", "Grisalho", ["#BDBDBD"], "comum", true),
  i("hc-neon", "hairColor", "Neon lilás", ["#B26BFF"], "epico"),
  i("hc-dourado", "hairColor", "Dourado", ["#F2B705"], "lendario"),

  // Make (rosto) — todas liberadas
  i("mk-none", "makeup", "Sem make", [], "comum", true),
  i("mk-blush", "makeup", "Blush rosado", ["#FF8FA3"], "comum", true),
  i("mk-batom-vermelho", "makeup", "Batom vermelho", ["#D7263D"], "comum", true),
  i("mk-batom-nude", "makeup", "Batom nude", ["#C47A6A"], "comum", true),
  i("mk-batom-roxo", "makeup", "Batom roxo", ["#6B2D8C"], "comum", true),
  i("mk-delineado", "makeup", "Delineado gatinho", ["#111111"], "comum", true),
  i("mk-sombra-menta", "makeup", "Sombra menta", ["#00EBA8", "#D7263D"], "comum", true),
  i("mk-sombra-dourada", "makeup", "Sombra dourada", ["#F2B705", "#C47A6A"], "comum", true),
  i("mk-glamour", "makeup", "Glamour completo", ["#B26BFF", "#D7263D", "#FF8FA3"], "comum", true),
  i("mk-glitter", "makeup", "Glitter", ["#00EBA8", "#FFFFFF", "#F2B705"], "comum", true),
  i("mk-sardas", "makeup", "Sardas", ["#8B5A3C"], "comum", true),
  i("mk-guerra", "makeup", "Pintura de guerra", ["#2F3315", "#4B5320"], "comum", true),
  i("mk-estrela", "makeup", "Estrela no rosto", ["#00EBA8"], "comum", true),

  // Farda (tronco + braços)
  i("top-preta", "top", "Camiseta preta", ["#111111", "#111111"], "comum", true),
  i("top-branca", "top", "Camiseta branca", ["#F4F1EA", "#F4F1EA"], "comum", true),
  i("top-moletom-q", "top", "Moletom Q", ["#1E1E1E", "#00EBA8"], "comum", true),
  i("top-avental", "top", "Avental de designer", ["#F4EBDD", "#A4492F"], "raro"),
  i("top-camuflada", "top", "Farda camuflada", ["#4B5320", "#6B7340", "#2F3315"], "raro"),
  i("top-aviador", "top", "Jaqueta de aviador", ["#7A4B2A", "#E9DCC4"], "epico"),
  i("top-gala", "top", "Farda de gala", ["#0B0B0B", "#00EBA8"], "lendario"),
  i("top-oficial", "top", "Farda oficial Quartel", ["#0B0B0B", "#00EBA8"], "lendario"),

  // Calça
  i("bot-jeans", "bottom", "Jeans", ["#2B4C7E"], "comum", true),
  i("bot-preta", "bottom", "Calça preta", ["#151515"], "comum", true),
  i("bot-bege", "bottom", "Sarja bege", ["#C9B48A"], "comum", true),
  i("bot-cargo", "bottom", "Cargo camuflada", ["#4B5320", "#2F3315"], "raro"),
  i("bot-gala", "bottom", "Calça de gala", ["#0B0B0B", "#00EBA8"], "epico"),

  // Cabeça
  i("head-none", "head", "Nada", [], "comum", true),
  i("head-bone", "head", "Boné Q", ["#111111", "#00EBA8"], "comum", true),
  i("head-fone", "head", "Headphone", ["#1A1A1A", "#A4492F"], "raro"),
  i("head-oculos", "head", "Óculos aviador", ["#2A2A2A", "#00EBA8"], "raro"),
  i("head-boina", "head", "Boina", ["#7A1F1F", "#00EBA8"], "epico"),
  i("head-capacete", "head", "Capacete Q", ["#4B5320", "#00EBA8"], "epico"),
  i("head-quepe", "head", "Quepe de General", ["#0B0B0B", "#00EBA8"], "lendario"),

  // Costas
  i("back-none", "back", "Nada", [], "comum", true),
  i("back-mochila", "back", "Mochila", ["#2A2A2A", "#00EBA8"], "comum", true),
  i("back-lapis", "back", "Lápis gigante", ["#00EBA8", "#F4C99A", "#1A1A1A"], "raro"),
  i("back-bandeira", "back", "Bandeira Q", ["#0B0B0B", "#00EBA8"], "epico"),
  i("back-jetpack", "back", "Jetpack", ["#9CA3AF", "#F97316"], "epico"),
  i("back-capa", "back", "Capa dourada", ["#F2B705", "#B88A00"], "lendario"),

  // Mascote
  i("pet-none", "pet", "Nenhum", [], "comum", true),
  i("pet-dalmata", "pet", "Dálmata", ["#FAFAFA", "#111111", "#E63946"], "comum", true),
  i("pet-cao", "pet", "Cão recruta", ["#C98D5E", "#4B5320"], "raro"),
  i("pet-pato", "pet", "Pato do debug", ["#F7D21E", "#F97316"], "raro"),
  i("pet-drone", "pet", "Drone de pauta", ["#2A2A2A", "#00EBA8"], "epico"),
  i("pet-aguia", "pet", "Águia do Quartel", ["#5A3825", "#F4F1EA"], "lendario"),

  // Efeito
  i("fx-none", "effect", "Nenhum", [], "comum", true),
  i("fx-pixels", "effect", "Pixels", ["#22D3EE", "#F472B6", "#00EBA8"], "raro"),
  i("fx-faiscas", "effect", "Faíscas", ["#F97316", "#00EBA8"], "epico"),
  i("fx-confete", "effect", "Confete", ["#00EBA8", "#A4492F", "#F4F1EA", "#4B5320"], "epico"),
  i("fx-aura", "effect", "Aura dourada", ["#F2B705"], "lendario"),

  // Título (aparece acima do nome)
  i("t-recruta", "title", "Recruta Criativo", [], "comum", true),
  i("t-cacador", "title", "Caçador de Estrelas", [], "raro"),
  i("t-mao-de-ouro", "title", "Mão de Ouro", [], "epico"),
  i("t-explorador", "title", "Explorador", [], "raro"),
  i("t-cartografo", "title", "Cartógrafo do QG", [], "epico"),
  i("t-veterano", "title", "Veterano", [], "epico"),
  i("t-sentinela", "title", "Sentinela", [], "lendario"),
  i("t-relacoes", "title", "Relações Públicas", [], "raro"),
  i("t-alma-da-tropa", "title", "Alma da Tropa", [], "epico"),
  i("t-condecorado", "title", "Condecorado", [], "epico"),
  i("t-festeiro", "title", "Rei/Rainha da Festa", [], "epico"),
  i("t-lenda", "title", "Lenda do Quartel", [], "lendario"),
  i("t-general", "title", "General do Evento", [], "lendario"),
  i("t-equipe", "title", "Equipe Quartel", [], "lendario"),
  i("t-vip", "title", "Oficial VIP", [], "epico"),
  i("t-networker", "title", "Networker", [], "epico"),
  i("t-defensor", "title", "Defensor do Quartel", [], "raro"),
  i("t-heroi", "title", "Herói de Guerra", [], "lendario"),
  i("t-supremo", "title", "Lenda Suprema", [], "lendario"),
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((it) => [it.id, it]),
);

export type Avatar = Record<Slot, string>;

export const DEFAULT_AVATAR: Avatar = {
  skin: "skin-2",
  hair: "hair-curto",
  hairColor: "hc-castanho",
  makeup: "mk-none",
  top: "top-moletom-q",
  bottom: "bot-jeans",
  head: "head-none",
  back: "back-none",
  pet: "pet-none",
  effect: "fx-none",
  title: "t-recruta",
};

/** O que a pessoa faz dentro do Quartel World. */
export interface GameStats {
  /** pontos de estrelas coletadas (1, 2, 5 ou 10) */
  starPoints: number;
  /** estrelas douradas (5x) coletadas */
  goldStars: number;
  /** estrelas lendárias (10x) coletadas */
  legendaryStars: number;
  /** estrelas supremas (50x) coletadas — a mais rara */
  supremeStars: number;
  /** minutos em campo (aba aberta e visível) */
  minutes: number;
  /** aplausos, continências e corações recebidos */
  received: number;
  /** aplausos, continências e corações dados */
  given: number;
  /** pessoas diferentes com quem você interagiu */
  friends: number;
  /** medalhas recebidas de outras pessoas */
  medals: number;
  /** marcos do mapa visitados */
  visited: number;
  /** festas no QG (dançar junto com 2+ pessoas) */
  parties: number;
  /** entrou na Área VIP (0/1) */
  vip: number;
  /** contatos trocados na Área VIP */
  contacts: number;
  /** invasores abatidos nas invasões */
  defended: number;
  /** pontos roubados por invasores */
  stolen: number;
  /** pontos trocados por café */
  spent: number;
  /** posição no ranking ao vivo (null = fora) */
  rank: number | null;
  /** entrou com o código da equipe */
  team: boolean;
}

export const EMPTY_STATS: GameStats = {
  starPoints: 0,
  goldStars: 0,
  legendaryStars: 0,
  supremeStars: 0,
  minutes: 0,
  received: 0,
  given: 0,
  friends: 0,
  medals: 0,
  visited: 0,
  parties: 0,
  vip: 0,
  contacts: 0,
  defended: 0,
  stolen: 0,
  spent: 0,
  rank: null,
  team: false,
};

/** Pontuação do ranking ao vivo. */
export function scoreFor(s: GameStats) {
  const total =
    s.starPoints +
    s.minutes * 2 +
    s.received * 3 +
    s.given +
    s.medals * 10 +
    s.visited * 5 +
    s.parties * 10 +
    s.contacts * 5 +
    (s.defended ?? 0) * 3 -
    (s.stolen ?? 0) -
    (s.spent ?? 0);
  return Math.max(0, total);
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  rewards: string[];
  /** depende do ranking ao vivo: se sair da posição, os itens saem do avatar */
  live?: boolean;
  /** só para quem entrou com o código da equipe */
  teamOnly?: boolean;
  rule: (s: GameStats) => boolean;
}

export const LANDMARK_COUNT = 14;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "primeira-estrela", title: "Primeira Estrela", description: "Pegue sua primeira estrela no mapa.", icon: "⭐", xp: 50, rewards: ["back-lapis"], rule: (s) => s.starPoints >= 1 },
  { id: "cacador", title: "Caçador de Estrelas", description: "Junte 50 pontos de estrelas.", icon: "🌟", xp: 150, rewards: ["t-cacador", "head-oculos"], rule: (s) => s.starPoints >= 50 },
  { id: "constelacao", title: "Constelação", description: "Junte 150 pontos de estrelas.", icon: "✨", xp: 300, rewards: ["hc-neon", "fx-pixels"], rule: (s) => s.starPoints >= 150 },
  { id: "mao-de-ouro", title: "Mão de Ouro", description: "Pegue 3 estrelas douradas.", icon: "🥇", xp: 200, rewards: ["t-mao-de-ouro", "top-aviador"], rule: (s) => s.goldStars >= 3 },
  { id: "lenda", title: "Lenda do Quartel", description: "Pegue uma estrela lendária (aparece a cada 3 minutos).", icon: "⚡", xp: 400, rewards: ["t-lenda", "back-capa", "hc-dourado"], rule: (s) => s.legendaryStars >= 1 },
  { id: "suprema", title: "Estrela Suprema", description: "Pegue a Estrela Suprema (aparece a cada 12 min, por 90s).", icon: "🌈", xp: 600, rewards: ["t-supremo"], rule: (s) => (s.supremeStars ?? 0) >= 1 },
  { id: "explorador", title: "Explorador", description: "Visite 5 marcos do mapa.", icon: "🧭", xp: 100, rewards: ["t-explorador", "head-boina"], rule: (s) => s.visited >= 5 },
  { id: "cartografo", title: "Cartógrafo do QG", description: "Visite 10 marcos do mapa.", icon: "🗺️", xp: 250, rewards: ["t-cartografo", "pet-aguia"], rule: (s) => s.visited >= 10 },
  { id: "em-campo", title: "Em Campo", description: "Fique 5 minutos no Quartel World.", icon: "⏱️", xp: 80, rewards: ["top-camuflada", "bot-cargo"], rule: (s) => s.minutes >= 5 },
  { id: "plantao", title: "Plantão", description: "Fique 15 minutos.", icon: "🪖", xp: 150, rewards: ["head-capacete"], rule: (s) => s.minutes >= 15 },
  { id: "veterano", title: "Veterano", description: "Fique 30 minutos.", icon: "🔥", xp: 250, rewards: ["t-veterano", "fx-faiscas"], rule: (s) => s.minutes >= 30 },
  { id: "sentinela", title: "Sentinela", description: "Fique 60 minutos.", icon: "🏛️", xp: 400, rewards: ["t-sentinela", "top-gala", "bot-gala"], rule: (s) => s.minutes >= 60 },
  { id: "boas-vindas", title: "Boas-vindas", description: "Aplauda, bata continência ou mande um coração para alguém.", icon: "👋", xp: 50, rewards: ["pet-cao"], rule: (s) => s.given >= 1 },
  { id: "relacoes", title: "Relações Públicas", description: "Interaja com 5 pessoas diferentes.", icon: "🤝", xp: 150, rewards: ["t-relacoes", "head-fone"], rule: (s) => s.friends >= 5 },
  { id: "popular", title: "Alma da Tropa", description: "Receba 10 interações.", icon: "👏", xp: 150, rewards: ["t-alma-da-tropa", "fx-confete"], rule: (s) => s.received >= 10 },
  { id: "condecorado", title: "Condecorado", description: "Receba 3 medalhas de outras pessoas.", icon: "🎖️", xp: 250, rewards: ["t-condecorado", "back-bandeira"], rule: (s) => s.medals >= 3 },
  { id: "festa", title: "Festa no QG", description: "Dance junto com 2 ou mais pessoas.", icon: "🕺", xp: 150, rewards: ["t-festeiro", "hair-moicano", "pet-pato"], rule: (s) => s.parties >= 1 },
  { id: "sala-oficiais", title: "Sala dos Oficiais", description: "Entre na Área VIP (Tenente+ ou Equipe Quartel).", icon: "🍸", xp: 150, rewards: ["t-vip"], rule: (s) => s.vip >= 1 },
  { id: "networking", title: "Networking", description: "Troque contato com 3 pessoas na Área VIP.", icon: "📇", xp: 200, rewards: ["t-networker"], rule: (s) => s.contacts >= 3 },
  { id: "defensor", title: "Defensor do Quartel", description: "Abata 10 invasores durante as invasões.", icon: "🛡️", xp: 150, rewards: ["t-defensor"], rule: (s) => s.defended >= 10 },
  { id: "heroi-guerra", title: "Herói de Guerra", description: "Abata 30 invasores.", icon: "⚔️", xp: 300, rewards: ["t-heroi"], rule: (s) => s.defended >= 30 },
  { id: "podio", title: "Pódio", description: "Esteja no top 3 do ranking ao vivo.", icon: "🥉", xp: 200, rewards: ["back-jetpack", "hair-black-power"], live: true, rule: (s) => s.rank !== null && s.rank <= 3 },
  { id: "general", title: "General do Evento", description: "Seja o 1º do ranking ao vivo.", icon: "👑", xp: 300, rewards: ["head-quepe", "t-general", "fx-aura"], live: true, rule: (s) => s.rank === 1 },
  { id: "equipe", title: "Equipe Quartel", description: "Exclusivo de quem é da equipe Quartel Design.", icon: "★", xp: 100, rewards: ["t-equipe", "top-oficial", "pet-drone", "top-avental"], teamOnly: true, rule: (s) => s.team },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

/** Patentes: o nível do Quartel World. */
export const RANKS = [
  { name: "Recruta", xp: 0 },
  { name: "Soldado", xp: 100 },
  { name: "Cabo", xp: 300 },
  { name: "Sargento", xp: 600 },
  { name: "Tenente", xp: 1000 },
  { name: "Capitão", xp: 1500 },
  { name: "Major", xp: 2100 },
  { name: "Coronel", xp: 2800 },
  { name: "General", xp: 3600 },
] as const;

export function unlockedAchievements(stats: GameStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.rule(stats)).map((a) => a.id);
}

export function unlockedItems(achievementIds: string[]): Set<string> {
  const set = new Set(ITEMS.filter((it) => it.free).map((it) => it.id));
  for (const id of achievementIds) {
    for (const item of ACHIEVEMENT_BY_ID[id]?.rewards ?? []) set.add(item);
  }
  return set;
}

/** Primeira conquista que entrega o item (para mostrar "como destravar"). */
export function achievementForItem(itemId: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.rewards.includes(itemId));
}

/** Nunca confie no avatar recebido: troca o que não foi destravado pelo padrão. */
export function sanitizeAvatar(avatar: Partial<Avatar>, unlocked: Set<string>): Avatar {
  const out = { ...DEFAULT_AVATAR };
  for (const slot of SLOTS) {
    const id = avatar[slot];
    const item = id ? ITEM_BY_ID[id] : undefined;
    if (item && item.slot === slot && unlocked.has(id!)) out[slot] = id!;
  }
  return out;
}

export function levelFor(achievementIds: string[]) {
  const xp = achievementIds.reduce((sum, id) => sum + (ACHIEVEMENT_BY_ID[id]?.xp ?? 0), 0);
  let idx = 0;
  for (let r = 0; r < RANKS.length; r++) if (xp >= RANKS[r].xp) idx = r;
  const cur = RANKS[idx];
  const next = RANKS[idx + 1];
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { xp, level: idx + 1, rank: cur.name, next: next?.name ?? null, nextXp: next?.xp ?? null, progress };
}

export const color = (id: string, idx = 0, fallback = "#888888") =>
  ITEM_BY_ID[id]?.colors[idx] ?? ITEM_BY_ID[id]?.colors[0] ?? fallback;
