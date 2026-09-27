# Interface V3 Premium — refatoração de apresentação

Data: 27/09/2026. Referências disponíveis neste workspace:
`docs/buyhold-wireframe-v3-premium.html`,
`frontend/src/style/STYLE_GUIDE_V3_BUYHOLD.md` e
`frontend/src/style/FIGMA_HANDOFF_BUYHOLD_V3.md`. O caminho citado no pedido,
`docs/buyhold-v3-premium-reference.html`, não estava presente. O wireframe
disponível é o arquivo nomeado pelos dois guias V3.

## Decisão de arquitetura (ARQ-01)

**Problema:** a tela única anterior tinha os dados corretos, mas não tinha a
navegação, a hierarquia da decisão e a composição responsiva da V3.
**Alternativa menor:** trocar apenas CSS manteria cálculos e detalhes espalhados
pela árvore visual e não atenderia às páginas e abas da referência.
**Escolha:** `App.tsx` mantém o fluxo de análise e exportação; `presenter.ts`
converte `SimulationResult` e `ValidatedInput` em texto, valores formatados,
carteira e impacto; `AppShell` contém navegação e estrutura comum, e as páginas
por funcionalidade compõem componentes de apresentação menores. **Custo:** há
uma camada de mapeamento a manter quando o contrato de saída evoluir.
**Gatilho de revisão:** mais telas consumindo os mesmos dados ou mudança
versionada no resultado do motor.

O presenter lê quantidade, motivos, limites, data, custos, saldo, posições e
alocações do motor. O número de ativos no título vem das compras reais; no
exemplo de R$ 1.000, o motor propõe cinco ativos, enquanto o HTML isolado mostra
quatro com sua própria simulação ilustrativa. A UI não importa essa função ou os
valores fictícios do HTML. O JSON baixado continua sendo a serialização integral
do `SimulationResult`, com snapshot, evidências, reasonCodes e centavos.

## Estados e navegação

Inicial, carregando, sucesso, sem compras, dados parciais, concentração que
bloqueia compra, proposta desatualizada e erro global têm texto e badge
explícitos. O cenário sem compras distingue todos os ativos inelegíveis de
nenhum lote viável. O resultado anterior permanece marcado como desatualizado e
o download é desabilitado até nova análise. A navegação entre aporte, carteira e
estratégia usa estado local, como o wireframe; recarregar volta ao aporte. A
carteira e a estratégia exibem somente valores derivados da entrada validada e
do resultado, sem registrar compras.

No mobile, a navegação fica fixa embaixo com `safe-area-inset-bottom`; o conteúdo
tem espaço inferior para não ficar coberto. Abas aceitam setas, botões mantêm
foco visível e o modal fecha por botão ou Escape, devolvendo foco ao controle de
origem. Métricas, fontes, períodos e códigos de evidência continuam acessíveis
nos detalhes. Strings das fixtures são renderizadas como texto.

## Evidência

Red observado antes da implementação: dois testes V3 falharam pela ausência da
navegação e dos estados parciais/concentração. Green observado depois da
implementação. A suíte web existente foi adaptada para a nova composição,
preservando verificações de entrada, exportação, diagnóstico, evidências e
concorrência de respostas. Testes de navegador conferem paridade com CLI,
download, teclado, modal, ausência de overflow e snapshots visuais em
1440×1100 e 390×844. Capturas foram comparadas visualmente com o HTML local.
Uma regressão adicional encontrou a página de estratégia fora da área visível
quando a navegação móvel era acionada após rolar até o fim. O teste falhou antes
da correção e passou quando a navegação passou a voltar ao topo.

Gates finais: `npm test` (317 testes em 21 arquivos), `npm run typecheck`,
`npm run lint`, `npm run build` e `npm run test:e2e` (10 testes Chromium)
passaram. O Playwright usou bibliotecas locais extraídas em `/tmp`, pois o
ambiente não tinha `libnspr4`, `libnss3` e `libasound2`; o servidor de teste
precisou de execução fora do sandbox para usar loopback. Nenhuma dependência de
projeto foi adicionada.

## Refatoração modular do frontend

Em 27/09/2026, a composição monolítica foi dividida por responsabilidade, sem
mudar o fluxo financeiro. `App.tsx` continua controlando análise, entrada,
proposta atual e exportação. `app/AppShell.tsx` mantém shell, navegação e
conteúdo da página. `features/contribution`, `features/portfolio` e
`features/strategy` contêm suas páginas e componentes; cada componente visual
tem um arquivo `.tsx` e um `.css` correspondentes. Elementos usados em mais de
uma página, como título, navegação, painel e estado vazio, ficam em `shared/`.
Tokens visuais e regras globais estão em `style/tokens.css` e `style/global.css`.
Somente a página ativa é montada, evitando conteúdo oculto e IDs duplicados; a
aba de evidências fica no controlador para conservar a seleção entre páginas.

**Decisão complementar ARQ-02:** manter o arquivo único exigiria que cada ajuste
visual de página percorresse o componente e a folha de estilos compartilhados.
A alternativa menor era extrair subcomponentes, mantendo o CSS concentrado; a
escolha foi organizar ambos por responsabilidade e deixar no global somente a
base compartilhada. O custo é haver mais arquivos e imports explícitos. Rever a
divisão se um componente não tiver responsabilidade visual própria ou se o
compartilhamento real mudar.

Esta etapa foi uma refatoração de apresentação sem regra nova. A cobertura
existente caracteriza os estados, o fluxo e a acessibilidade; não foi criado
Red artificial para uma mudança puramente estrutural (TDD-04). A revisão da
montagem das rotas revelou IDs repetidos quando páginas inativas permaneciam no
DOM: o teste novo falhou com dois painéis `weights-title` e passou após montar
somente a página ativa e conservar a aba selecionada no controlador. Depois da extração passaram
`npm test` (318 testes em 21 arquivos), typecheck, lint, build e os 10 testes
Chromium, incluindo os snapshots existentes em 1440×1100 e 390×844. Uma falha
visual transitória identificou a margem do título contextual e a remoção de
propriedades do badge de ambiente; os estilos foram corrigidos mantendo os
snapshots aprovados, sem atualizar as referências.
