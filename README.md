# Quartel World

O mundo 3D gamificado do **Quartel Criativo** (Quartel Design), feito a partir do blueprint do GLANCE WORLD.
O visual é de blocos e o tema é "quartel": preto, dourado, tijolo, verde-oliva, a estrela do Q e patentes militares.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes do catálogo
```

`/?bots=200` adiciona bots locais (máx. 1000) e mostra o medidor de FPS. Esses bots não vão para nenhum canal nem banco.

## O que já está pronto (protótipo local, dados fictícios)

| Blueprint | Quartel World |
|---|---|
| Avatar de blocos | 10 slots, 67 itens, 4 raridades (`src/lib/game/catalog.ts`) |
| Conquistas por métricas reais | 16 conquistas: jobs entregues, aprovação de primeira, prazo, nota do cliente, posts/cases, indicações, sequência de meses, ranking, interações, estrelas |
| Nível / XP | Patentes: Recruta → Soldado → Cabo → Sargento → Tenente → Capitão → Major → Coronel → General |
| Colecionável | Estrelas do Q: cobre = 1, prata = 2, **dourada = 5** (reaparecem em 25s / 40s / 75s), com som, confete e "+N" |
| Marcos 3D | QG de tijolo com "QUARTEL" e "03", lápis gigante, monitor "Do epic shit.", mouse gigante, tanque com canhão de lápis, capacete Q, guarita, arcos |
| Outdoors | Fotos reais do escritório (`public/billboards/`), clicáveis, com UTM `utm_source=quartel-world` |
| Pódio | Top 3 do mês com pose de vitória |
| Social | Acenar, Continência, Dançar, Aplaudir, Coração (teclas 1–5), frases prontas, card ao clicar numa pessoa, feed |
| Desempenho | LOD por orçamento (30 avatares completos), `memo`, `?bots=N` |
| Conquistas do mês | Os itens saem do avatar se a pessoa deixar de cumprir (o avatar é sempre sanitizado) |

Por enquanto, avatar, nome, conquistas vistas e métricas ficam no `localStorage`. A aba **Conquistas** tem um painel "Métricas de demonstração" para testar as regras.

## Próximas fases (blueprint §13)

4. **Banco (Supabase):** `quartel_game_profiles`, `quartel_interactions`, `quartel_game_prizes`; RPCs `security definer` (`portal_game`, `portal_save_avatar`, `portal_interact`, `portal_collect_stars`); `game_catalog()` espelhando `catalog.ts` + teste de paridade.
5. **Métricas reais** (`quartel_game_stats`): de onde vêm os jobs, prazos, aprovações e notas (ClickUp/Asana/Notion/planilha?).
6. **Multiplayer:** canal privado `quartel-world:<org_id>` (presence + broadcast `move`/`react`/`interact`).
9. **Antifraude** antes de qualquer prêmio com valor (folga, brinde, bônus): validar a coleta no servidor, teto diário.

## Decisões assumidas (dá para mudar)

- Quem joga: equipe interna e freelas da Quartel.
- Ranking individual e mensal, mostrando só posições (sem valores).
- Os outdoors apontam todos para `quarteldesign.com`. Troque as URLs em `src/features/game/billboards.tsx`.
