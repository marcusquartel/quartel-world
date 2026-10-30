import { test } from "node:test";
import assert from "node:assert/strict";
import { Mover } from "../src/features/game/lod";
import {
  ACHIEVEMENTS,
  DEFAULT_AVATAR,
  EMPTY_STATS,
  ITEM_BY_ID,
  ITEMS,
  SLOTS,
  levelFor,
  scoreFor,
  sanitizeAvatar,
  unlockedAchievements,
  unlockedItems,
  type GameStats,
} from "../src/lib/game/catalog";

const ZERO: GameStats = { ...EMPTY_STATS };

test("ids de itens e conquistas são únicos", () => {
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
});

test("todo item pago é recompensa de alguma conquista, e toda recompensa existe", () => {
  const rewarded = new Set(ACHIEVEMENTS.flatMap((a) => a.rewards));
  assert.deepEqual(ITEMS.filter((i) => !i.free && !rewarded.has(i.id)).map((i) => i.id), []);
  assert.deepEqual([...rewarded].filter((id) => !ITEM_BY_ID[id]), []);
});

test("avatar padrão só usa itens grátis do slot certo", () => {
  for (const slot of SLOTS) {
    const it = ITEM_BY_ID[DEFAULT_AVATAR[slot]];
    assert.ok(it?.free && it.slot === slot, slot);
  }
});

test("sanitização remove itens não destravados e de slot errado", () => {
  const unlocked = unlockedItems([]);
  const out = sanitizeAvatar({ ...DEFAULT_AVATAR, head: "head-quepe", top: "bot-jeans" }, unlocked);
  assert.equal(out.head, DEFAULT_AVATAR.head);
  assert.equal(out.top, DEFAULT_AVATAR.top);
});

test("conquista ao vivo sai quando a pessoa deixa de cumprir", () => {
  const champ = unlockedAchievements({ ...ZERO, rank: 1 });
  assert.ok(champ.includes("general"));
  const avatar = sanitizeAvatar({ ...DEFAULT_AVATAR, head: "head-quepe" }, unlockedItems(champ));
  assert.equal(avatar.head, "head-quepe");
  const later = unlockedAchievements({ ...ZERO, rank: 5 });
  assert.equal(sanitizeAvatar(avatar, unlockedItems(later)).head, DEFAULT_AVATAR.head);
});

test("patente começa em Recruta e sobe com XP", () => {
  assert.equal(levelFor([]).rank, "Recruta");
  assert.ok(levelFor(ACHIEVEMENTS.map((a) => a.id)).level > 5);
});

test("itens da equipe só destravam com o código", () => {
  assert.ok(!unlockedItems(unlockedAchievements(ZERO)).has("top-oficial"));
  assert.ok(unlockedItems(unlockedAchievements({ ...ZERO, team: true })).has("top-oficial"));
});

test("café gasta pontos sem deixar o placar negativo", () => {
  assert.equal(scoreFor({ ...EMPTY_STATS, starPoints: 30, spent: 10 }), 20);
  assert.equal(scoreFor({ ...EMPTY_STATS, starPoints: 5, spent: 10 }), 0);
});

test("café acelera só durante o tempo do efeito", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1000 });
  const m = new Mover(0, 0, 0);
  assert.equal(m.speedFactor(), 1);
  m.boost(10_000, 2);
  t.mock.timers.tick(9_999);
  assert.equal(m.speedFactor(), 2);
  t.mock.timers.tick(1);
  assert.equal(m.speedFactor(), 1);
});
