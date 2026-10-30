// Gera as peças de divulgação do Quartel World (feed, story, LinkedIn).
const path = require("node:path");
const ROOT = "/Users/marcusmota/Projects/sitequartel/quartel-world";
const sharp = require(path.join(ROOT, "node_modules/sharp"));
const FONTS = "/private/tmp/claude-501/-Users-marcusmota-Projects-sitequartel/6b57d777-e550-4295-8b8e-20d98c0fe761/scratchpad/fonts";
const SHOTS = "/Users/marcusmota/.claude/projects/-Users-marcusmota-Projects-sitequartel/6b57d777-e550-4295-8b8e-20d98c0fe761/tool-results";
const SHOT_ACTION = `${SHOTS}/mcp-claude-in-chrome-blob-1793286525357-fuadi4.jpg`; // portão + invasão
const SHOT_MAP = `${SHOTS}/mcp-claude-in-chrome-blob-1793286552198-um4v8i.jpg`; // praça, cartazes, QG
const OUT = `${ROOT}/marketing`;
const MINT = "#00EBA8", BLACK = "#000000", RED = "#E63946", WHITE = "#FFFFFF";

const esc = (s) => s;
// Texto vira desenho vetorial direto do arquivo da fonte (o renderizador de texto do sharp ignora fontes locais).
const opentype = require("/private/tmp/claude-501/-Users-marcusmota-Projects-sitequartel/6b57d777-e550-4295-8b8e-20d98c0fe761/scratchpad/textlib/node_modules/opentype.js");
const FONT_CACHE = {};
const loadFont = (file) => (FONT_CACHE[file] ??= opentype.loadSync(`${FONTS}/${file}`));

/** markup simples: <span foreground="#hex">…</span> (aninhável), <b>…</b>, quebras com \n */
function parseMarkup(markup) {
  const segs = [];
  const stack = ["#FFFFFF"];
  let bold = 0;
  const re = /<span foreground="([^"]+)">|<\/span>|<b>|<\/b>|([^<]+)/g;
  let m;
  while ((m = re.exec(markup))) {
    if (m[1]) stack.push(m[1]);
    else if (m[0] === "</span>") stack.pop();
    else if (m[0] === "<b>") bold++;
    else if (m[0] === "</b>") bold--;
    else if (m[2]) segs.push({ text: m[2], color: stack[stack.length - 1], bold: bold > 0 });
  }
  const lines = [[]];
  for (const sg of segs) {
    const parts = sg.text.split("\n");
    parts.forEach((t, k) => {
      if (k > 0) lines.push([]);
      if (t) lines[lines.length - 1].push({ ...sg, text: t });
    });
  }
  return lines;
}

async function text(markup, { size = 80, file = "LilitaOne-Regular.ttf", spacing = 0, boldStroke = 0 }) {
  const font = loadFont(file);
  const lines = parseMarkup(markup);
  const lh = size * 1.12 + spacing;
  let svg = "";
  let maxW = 0;
  lines.forEach((line, i) => {
    let x = 2;
    const y = size * 0.92 + i * lh;
    for (const sg of line) {
      const path = font.getPath(sg.text, x, y, size);
      const d = path.toPathData(2);
      const stroke = sg.bold && boldStroke ? ` stroke="${sg.color}" stroke-width="${boldStroke}" stroke-linejoin="round"` : "";
      svg += `<path d="${d}" fill="${sg.color}"${stroke}/>`;
      x += font.getAdvanceWidth(sg.text, size);
    }
    maxW = Math.max(maxW, x);
  });
  const W = Math.ceil(maxW + 6);
  const H = Math.ceil(lines.length * lh + size * 0.25);
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)).png().toBuffer();
}
const lilita = (m, size, o = {}) => text(m, { size, ...o });
const fredoka = (m, size, o = {}) => text(m, { file: "Fredoka.ttf", size, boldStroke: size * 0.045, ...o });

// regiões com nomes de participantes reais (borradas antes de usar o print)
const PRIVATE = {
  [SHOT_MAP]: [
    { left: 700, top: 282, width: 150, height: 48 },
    { left: 8, top: 104, width: 212, height: 92 },
  ],
  [SHOT_ACTION]: [{ left: 8, top: 104, width: 212, height: 92 }],
};
async function sanitized(file) {
  let img = sharp(file);
  const parts = [];
  for (const r of PRIVATE[file] ?? []) {
    const blurred = await sharp(file).extract(r).blur(9).toBuffer();
    parts.push({ input: blurred, left: r.left, top: r.top });
  }
  return img.composite(parts).toBuffer();
}

async function shot(file, crop, w, h, radius = 28, border = 10, borderColor = MINT) {
  const img = await sharp(await sanitized(file)).extract(crop).resize(w, h).toBuffer();
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" fill="#fff"/></svg>`);
  const rounded = await sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const W = w + border * 2, H = h + border * 2;
  const frame = Buffer.from(`<svg width="${W + 16}" height="${H + 16}"><rect x="16" y="16" width="${W}" height="${H}" rx="${radius + border}" fill="#000"/><rect width="${W}" height="${H}" rx="${radius + border}" fill="${borderColor}"/></svg>`);
  return sharp(frame).composite([{ input: rounded, left: border, top: border }]).png().toBuffer();
}

async function pill(label, { bg = MINT, fg = BLACK, size = 64, padX = 44, padY = 22 } = {}) {
  const t = await lilita(`<span foreground="${fg}">${esc(label)}</span>`, size, { width: 2000 });
  const m = await sharp(t).metadata();
  const W = m.width + padX * 2, H = m.height + padY * 2;
  const bgSvg = Buffer.from(`<svg width="${W + 10}" height="${H + 10}"><rect x="10" y="10" width="${W}" height="${H}" rx="${H / 2}" fill="#000"/><rect width="${W}" height="${H}" rx="${H / 2}" fill="${bg}" stroke="#000" stroke-width="6"/></svg>`);
  return sharp(bgSvg).composite([{ input: t, left: padX, top: padY }]).png().toBuffer();
}

const bgSvg = (W, H, base, stripes = MINT, stripeOpacity = 0.08) =>
  Buffer.from(`<svg width="${W}" height="${H}"><defs><pattern id="s" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="45" height="90" fill="${stripes}" fill-opacity="${stripeOpacity}"/></pattern></defs><rect width="${W}" height="${H}" fill="${base}"/><rect width="${W}" height="${H}" fill="url(#s)"/></svg>`);

async function header(color = MINT) {
  const q = await sharp(`${ROOT}/public/brand/q-white.png`).resize({ height: 78 }).toBuffer();
  const t = await lilita(`<span foreground="${color}">QUARTEL WORLD</span>`, 50, { width: 700 });
  return { q, t };
}

function starPoly(cx, cy, r) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const rad = k % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}"/>`;
}
const stars = (color, size = 44, n = 3) => {
  const r = size / 2;
  const W = n * size * 1.3;
  const polys = Array.from({ length: n }, (_, k) => starPoly(r + k * size * 1.3, r, r)).join("");
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(W)}" height="${size}"><g fill="${color}">${polys}</g></svg>`)).png().toBuffer();
};

async function feedConvite() {
  const W = 1080, H = 1350;
  const { q, t } = await header();
  const h1 = await lilita(`<span foreground="${WHITE}">O QG DA QUARTEL</span>\n<span foreground="${WHITE}">VIROU UM </span><span foreground="${MINT}">GAME.</span>`, 96, { width: 980 });
  const img = await shot(SHOT_MAP, { left: 260, top: 56, width: 1045, height: 728 }, 960, 669);
  const cta = await pill("HOJE · 16H");
  const sub = await fredoka(`<span foreground="${WHITE}"><b>Entre pelo link na bio</b></span>\n<span foreground="#9A9A98">quartel-world.vercel.app</span>`, 34, { width: 520 });
  await sharp(bgSvg(W, H, BLACK))
    .composite([
      { input: q, left: 60, top: 56 },
      { input: t, left: 140, top: 72 },
      { input: await stars(MINT, 34), left: 880, top: 74 },
      { input: h1, left: 60, top: 170 },
      { input: img, left: 50, top: 420 },
      { input: cta, left: 60, top: 1150 },
      { input: sub, left: 500, top: 1160 },
    ])
    .png()
    .toFile(`${OUT}/feed-1-convite.png`);
}

async function feedInvasao() {
  const W = 1080, H = 1350;
  const { q, t } = await header(WHITE);
  const h1 = await lilita(`<span foreground="${WHITE}">INVASÃO NO QG!</span>`, 112, { width: 980 });
  const sub = await fredoka(`<span foreground="${WHITE}"><b>Bandidos do Bloqueio Criativo vão roubar seus pontos.</b>\nPegue estrelas, defenda o Quartel e suba de patente.</span>`, 36, { width: 960 });
  const img = await shot(SHOT_ACTION, { left: 330, top: 56, width: 1000, height: 728 }, 960, 699, 28, 10, WHITE);
  const cta = await pill("HOJE · 16H", { bg: WHITE });
  const tip = await fredoka(`<span foreground="${WHITE}"><b>Clique ou aperte ESPAÇO</b>\npara abater os invasores</span>`, 32, { width: 480 });
  await sharp(bgSvg(W, H, RED, BLACK, 0.12))
    .composite([
      { input: q, left: 60, top: 56 },
      { input: t, left: 140, top: 72 },
      { input: h1, left: 60, top: 160 },
      { input: sub, left: 60, top: 300 },
      { input: img, left: 50, top: 420 },
      { input: cta, left: 60, top: 1170 },
      { input: tip, left: 520, top: 1176 },
    ])
    .png()
    .toFile(`${OUT}/feed-2-invasao.png`);
}

async function story() {
  const W = 1080, H = 1920;
  const { q, t } = await header();
  const h1 = await lilita(`<span foreground="${WHITE}">VEM PRO</span>\n<span foreground="${MINT}">QUARTEL WORLD</span>`, 112, { width: 1000 });
  const img = await shot(SHOT_MAP, { left: 330, top: 56, width: 900, height: 728 }, 960, 777);
  const items = ["Pegue estrelas e suba de patente", "Defenda o QG das invasões", "Dance com a tropa na pista", "Área VIP para os oficiais"];
  const list = [];
  for (const [k, it] of items.entries()) {
    list.push({ input: await stars(MINT, 40, 1), left: 60, top: 1380 + k * 64 });
    list.push({ input: await fredoka(`<b>${it}</b>`, 44), left: 116, top: 1370 + k * 64 });
  }
  const cta = await pill("HOJE · 16H", { size: 78 });
  const hint = await fredoka(`<span foreground="#9A9A98"><b>quartel-world.vercel.app</b></span>`, 30, { width: 960 });
  await sharp(bgSvg(W, H, BLACK))
    .composite([
      { input: q, left: 60, top: 110 },
      { input: t, left: 140, top: 126 },
      { input: h1, left: 60, top: 230 },
      { input: img, left: 50, top: 520 },
      ...list,
      { input: cta, left: 60, top: 1640 },
      { input: hint, left: 66, top: 1790 },
    ])
    .png()
    .toFile(`${OUT}/story.png`);
}

async function linkedin() {
  const W = 1200, H = 627;
  const img = await sharp(await sanitized(SHOT_MAP)).extract({ left: 0, top: 56, width: 1567, height: 728 }).resize(W, H, { fit: "cover" }).toBuffer();
  const shade = Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.92"/><stop offset="0.55" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
  const { q, t } = await header();
  const h1 = await lilita(`<span foreground="${WHITE}">O QG DA QUARTEL</span>\n<span foreground="${WHITE}">VIROU UM </span><span foreground="${MINT}">GAME.</span>`, 72, { width: 700 });
  const sub = await fredoka(`<span foreground="${WHITE}"><b>Estrelas, invasões, pista de dança e Área VIP.</b></span>`, 28, { width: 620 });
  const cta = await pill("HOJE · 16H", { size: 48, padX: 32, padY: 16 });
  await sharp(img)
    .composite([
      { input: shade, left: 0, top: 0 },
      { input: q, left: 50, top: 46 },
      { input: t, left: 130, top: 62 },
      { input: h1, left: 50, top: 160 },
      { input: sub, left: 50, top: 370 },
      { input: cta, left: 50, top: 460 },
    ])
    .png()
    .toFile(`${OUT}/linkedin.png`);
}

(async () => {
  await feedConvite();
  await feedInvasao();
  await story();
  await linkedin();
  console.log("ok");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
