# Figma Handoff — Buy & Hold V3 Premium

**Versão:** 1.0  
**Data:** 23/09/2026  
**Base visual:** `buyhold-wireframe-v3-premium.html`  
**Direção visual:** `STYLE_GUIDE_V3_BUYHOLD.md`  
**Status:** Especificação de interface para desenho no Figma e implementação React

## 1. Objetivo do handoff

Este documento traduz a V3 aprovada em uma especificação para reconstruí-la no Figma e organizar sua futura implementação React. Ele descreve telas, composição, componentes, propriedades, interações e estados.

A referência local disponível é um wireframe HTML independente; não há um projeto React da ferramenta montado neste workspace. Portanto, a árvore e os contratos React abaixo são a decomposição proposta para a V3, não uma descrição de código já integrado à aplicação. Ao conectar a interface ao produto, a resposta real do motor e os contratos do repositório devem substituir os dados demonstrativos do HTML.

## 2. Direção e prioridades

A V3 combina uma estrutura clara para tomar decisões financeiras com acabamento premium discreto. A tela deve conduzir o usuário nesta ordem:

1. definir o valor do aporte;
2. entender a decisão sugerida;
3. verificar compras, custos e saldo;
4. examinar os motivos de escolha e exclusão;
5. avaliar o efeito sobre a alocação;
6. consultar a carteira e a política usadas como contexto.

Referências: clareza estrutural de Stripe, organização de informação financeira de Ramtabs e acabamento visual da Avenue nas capturas fornecidas. A hierarquia e o fluxo de decisão são próprios da ferramenta.

## 3. Frames Figma

Criar os frames abaixo em uma página chamada `Buy & Hold — V3`:

| Frame | Tamanho de referência | Conteúdo |
|---|---:|---|
| `01 · Aporte · Desktop` | 1440 × 1100 | Tela principal com navegação lateral, recomendação e coluna de contexto |
| `02 · Aporte · Mobile` | 390 × 844 | Tela principal móvel, navegação inferior fixa e painéis em coluna |
| `03 · Carteira · Desktop` | 1440 × 1100 | Posições atuais, total e pesos por ativo |
| `04 · Estratégia · Desktop` | 1440 × 1100 | Metas de classe e síntese das regras |
| `05 · Detalhe do ativo · Desktop` | Modal sobre a tela de aporte | Justificativa e evidências de um ativo |
| `06 · Estados da recomendação` | 1440 × 1100 | Variações: carregando, sem compras, parcial, desatualizada e erro |

Os tamanhos são frames de desenho, não dimensões rígidas de viewport. Validar também a tela principal em 1280 px de largura e mobile em 360 px.

### 3.1 Auto Layout e constraints

- Usar Auto Layout vertical na página e nos painéis com conteúdo em sequência.
- Usar Auto Layout horizontal para cabeçalhos, linhas de tabela, resumo financeiro e navegação.
- Painéis de conteúdo devem crescer com texto e dados. Evitar alturas fixas, exceto barra superior e navegação inferior quando apropriado.
- No desktop, manter a barra lateral ancorada à esquerda, conteúdo principal fluido e painel de contexto com largura controlada.
- No mobile, converter as colunas em uma coluna, manter a navegação ancorada abaixo e reservar padding inferior para não cobrir o conteúdo.
- Tabelas podem conter rolagem horizontal no mobile; ticker e campos numéricos importantes devem permanecer reconhecíveis.
- Usar constraints `Left & Right` nos painéis fluidos e `Top` na navegação lateral de desktop.

## 4. Layout e medidas

As medidas abaixo documentam a V3 atual. Use-as como ponto inicial no Figma e ajuste só quando a composição exigir.

### Desktop — frame de 1440 px

| Região | Referência |
|---|---:|
| Navegação lateral | 224 px de largura |
| Barra superior | 77 px de altura |
| Margens do conteúdo | 44 px horizontais |
| Coluna de contexto | 302 px; pode crescer até cerca de 332 px em telas largas |
| Espaço entre conteúdo e contexto | 26 px |
| Painéis principais | Padding aproximado de 24–25 px |
| Cartão de decisão | Padding de 28–29 px |

Na largura desktop, o conteúdo principal tem duas regiões: área de trabalho com formulário, decisão e evidências; e coluna contextual com patrimônio, impacto e limites da política.

### Mobile — frame de 390 × 844 px

- Cabeçalho com marca à esquerda e avatar à direita.
- Aviso de ambiente demonstrativo em linha compacta.
- Conteúdo com margens de 20 px; painéis com raio entre 13 e 14 px.
- Formulário empilhado; botão principal em largura total.
- Cartão de decisão antes da carteira e do impacto.
- Navegação inferior fixa com três itens, ícone e rótulo.
- Barra inferior com padding para a safe area do sistema operacional.
- Conteúdo final com espaço suficiente para rolar sem ficar atrás da navegação.

## 5. Árvore de componentes React

```text
BuyHoldApp
└── AppShell
    ├── DesktopSidebar
    │   ├── BrandMark
    │   ├── WorkspaceSummary
    │   ├── PrimaryNavigation
    │   └── ProfileSummary
    ├── MobileHeader
    ├── TopBar
    │   ├── Breadcrumbs
    │   └── DemoEnvironmentBadge
    ├── AppRoutes
    │   ├── ContributionPage
    │   │   ├── PageHeading
    │   │   ├── ContributionFormPanel
    │   │   │   ├── CurrencyAmountField
    │   │   ├── ScenarioSelect
    │   │   └── AmountPresets
    │   ├── ContributionWorkspace
    │   │   ├── StaleProposalNotice
    │   │   ├── DecisionCard
    │   │   │   ├── DecisionHero
    │   │   │   ├── ContributionSummary
    │   │   │   ├── PurchaseTable
    │   │   │   ├── NoPurchaseState
    │   │   │   └── DecisionActions
    │   │   ├── DecisionEvidencePanel
    │   │   │   ├── EvidenceTabs
    │   │   │   ├── ReasonsPanel
    │   │   │   ├── ExcludedAssetsPanel
    │   │   │   └── DataAssumptionsPanel
    │   │   └── ContextColumn
    │   │       ├── PortfolioSnapshot
    │   │       ├── AllocationBreakdown
    │   │       ├── AllocationImpact
    │   │       └── PolicyGuardrails
    │   ├── PortfolioPage
    │   │   ├── PageHeading
    │   │   └── HoldingsTable
    │   └── StrategyPage
    │       ├── PageHeading
    │       ├── TargetAllocationCards
    │       └── StrategyRules
    ├── MobileBottomNavigation
    └── AssetDetailDialog
        └── AssetEvidence
```

`DesktopSidebar` e `MobileBottomNavigation` são apresentações responsivas da mesma navegação. `MobileHeader` substitui o cabeçalho da área de trabalho em telas estreitas. A composição muda por breakpoint; não é necessário duplicar a lógica de cada página.

## 6. Contratos de apresentação

Os componentes recebem dados já prontos para exibição através de um view model. A camada React não recalcula elegibilidade, pontuação ou distribuição.

```ts
type ProposalStatus =
  | "idle"
  | "calculating"
  | "ready"
  | "no-purchases"
  | "partial-data"
  | "stale"
  | "error";

type ContributionViewModel = {
  status: ProposalStatus;
  title: string;
  description: string;
  amount: number;
  invested: number;
  estimatedCosts: number;
  remainingCash: number;
  analysisDate: string;
  policyVersion: string;
  purchases: Array<{
    assetId: string;
    ticker: string;
    name: string;
    assetClass: string;
    quantity: number;
    unitPrice: number;
    total: number;
    reason: string;
  }>;
  excludedAssets: Array<{
    assetId: string;
    ticker: string;
    name: string;
    reason: string;
    severity: "info" | "warning" | "blocking";
  }>;
  allocationImpact: Array<{
    classId: string;
    name: string;
    before: number;
    after: number;
    target: number;
  }>;
  dataSources: string[];
  assumptions: string[];
};
```

### Propriedades por componente principal

| Componente | Propriedades sugeridas | Responsabilidade |
|---|---|---|
| `ContributionForm` | `amount`, `scenario`, `isSubmitting`, `onAmountChange`, `onScenarioChange`, `onSubmit` | Capturar entrada e solicitar nova simulação |
| `DecisionCard` | `proposal`, `onOpenAsset`, `onExport`, `isStale` | Apresentar a decisão e seus números principais |
| `PurchaseTable` | `items`, `onSelectAsset` | Mostrar ativo, motivo curto, quantidade, preço e total |
| `DecisionEvidencePanel` | `reasons`, `excludedAssets`, `assumptions`, `activeTab`, `onTabChange` | Permitir examinar escolhas e limitações |
| `PortfolioSnapshot` | `totalValue`, `allocations`, `analysisDate` | Resumir a composição existente |
| `AllocationImpact` | `items`, `cashTreatment`, `costTreatment` | Comparar antes, simulado e meta |
| `HoldingsTable` | `positions`, `totalValue`, `analysisDate` | Listar as posições da carteira |
| `AssetDetailDialog` | `asset`, `open`, `onClose` | Mostrar razão, indicadores, fonte e estado do ativo |
| `MobileBottomNavigation` | `currentRoute`, `items`, `onNavigate` | Navegar entre aporte, carteira e estratégia |

Os nomes são uma proposta para orientar a implementação. Ajustar nomes e tipos aos contratos reais do produto quando o código React for integrado.

## 7. Telas e especificação dos elementos

### 7.1 Próximo aporte

**Cabeçalho:** título serifado `Seu próximo aporte.`, apoio curto e mês/data da proposta. Em ambiente de demonstração, indicar a natureza dos dados sem dominar o cabeçalho.

**Formulário:** campo de moeda como controle primário, seletor de cenário em segundo plano, botão `Simular aporte` e opções rápidas de valor. Presets devem atualizar o campo e deixar claro quando é necessário executar nova simulação.

**Cartão de decisão:** fundo verde suave; rótulo pequeno; estado da proposta; título editorial em linguagem direta; explicação de uma ou duas linhas. A área de resumo mostra compras sugeridas, custos estimados e caixa restante em três colunas no desktop e em uma faixa compacta no mobile.

**Tabela de compras:** colunas `Ativo / motivo`, `Qtd.`, `Preço` e `Aportar`. Os valores ficam alinhados à direita; ticker e nome formam a unidade primária. Cada linha abre o detalhe do ativo. No mobile, preservar a leitura do ticker e do total e permitir rolagem horizontal sem cortar texto essencial.

**Evidências:** abas `Por trás da escolha`, `Sem aporte` e `Dados e premissas`. Cada aba possui estado selecionado evidente, controle por teclado e painel associado.

**Coluna contextual:** cartão escuro com patrimônio simulado e distribuição atual; cartão claro com impacto atual → simulado, meta e legenda; painel discreto com limites que explicam o funcionamento.

### 7.2 Minha carteira

Mostrar data-base, total e tabela de posições. A tabela deve permitir comparar ticker, nome, classe, quantidade, valor e peso. Ações para editar ou registrar compras dependem da aplicação; não inferir essas ações a partir do wireframe.

### 7.3 Minha estratégia

Exibir cartões de meta por classe e uma sequência legível de regras. Distinguir valores configurados, premissas de demonstração e regras efetivamente aprovadas pelo produto.

### 7.4 Detalhe do ativo

Apresentar ticker, nome, classe, estado na recomendação e motivo. Abaixo, indicadores aplicáveis ao perfil, valor observado, teto se existir, efeito de exposição e procedência/data dos dados. No celular, pode ocupar quase a tela toda, mantendo fechamento acessível.

## 8. Tokens visuais para aplicação no Figma

Os valores abaixo foram lidos na V3 e repetidos aqui para facilitar o handoff. Usar como referência ao criar estilos e variáveis do Figma.

### Cores

| Nome no Figma | Valor | Aplicação |
|---|---|---|
| `Text / Primary` | `#102E27` | Texto principal e superfícies de alto contraste |
| `Action / Primary` | `#103D30` | Ação primária e seleção |
| `Text / Secondary` | `#68766F` | Apoio e metadados |
| `Border / Subtle` | `#E8ECE9` | Divisores e contornos |
| `Surface / Base` | `#FCFCFA` | Fundo principal |
| `Surface / Card` | `#FFFFFF` | Cartões comuns |
| `Surface / Decision` | `#DEEBE3` | Destaque da recomendação |
| `Surface / Soft Green` | `#E3EEE7` | Realces suaves |
| `Surface / Pale Green` | `#DCEBE2` | Apoio cromático |

Os estados de erro, alerta e sucesso precisam de estilos semânticos no Figma, mas suas cores ainda devem ser validadas por contraste na aplicação.

### Tipografia

| Estilo Figma | Família | Tamanho | Uso |
|---|---|---:|---|
| `Display / Page` | Georgia | 36–39 px | Título de página |
| `Display / Decision` | Georgia | 29–33 px | Síntese da decisão |
| `Metric / Large` | Avenir Next / Segoe UI | 32–35 px | Patrimônio em destaque |
| `Metric / Medium` | Avenir Next / Segoe UI | 19–22 px | Números do resumo |
| `Heading / Section` | Avenir Next / Segoe UI | 13–16 px | Título de cartão ou seção |
| `Body / Default` | Avenir Next / Segoe UI | 13–14 px | Texto principal |
| `Label / Small` | Avenir Next / Segoe UI | 10–12 px | Rótulos e metadados |

Definir fallbacks na implementação: `Georgia, "Times New Roman", serif` para editorial; `"Avenir Next", "Segoe UI", Arial, sans-serif` para funcional. Usar algarismos tabulares em métricas financeiras.

### Forma e espaçamento

| Estilo Figma | Referência |
|---|---:|
| `Radius / Control` | 8 px |
| `Radius / Panel` | 13–14 px |
| `Radius / Feature` | 16 px |
| `Space / Base` | 4 px |
| `Space / Common` | 8 px |
| `Space / Section` | 20–34 px |
| `Stroke / Subtle` | 1 px |

Manter sombras desligadas em painéis comuns. Reservar sombra para uma camada sobreposta quando necessária.

## 9. Estados para desenhar como variantes

Criar componentes/variantes Figma para:

| Componente | Variantes |
|---|---|
| `DecisionCard` | `Ready`, `No purchases`, `Partial data`, `Stale`, `Loading`, `Error` |
| `PrimaryButton` | `Default`, `Hover`, `Focus`, `Disabled`, `Loading` |
| `NavigationItem` | `Default`, `Current`, `Focus` |
| `EvidenceTab` | `Selected`, `Unselected`, `Focus` |
| `AssetRow` | `Recommended`, `Excluded`, `Blocked`, `Focus` |
| `AmountField` | `Default`, `Focus`, `Invalid`, `Disabled` |
| `AssetDetailDialog` | `Open`, `Closed`; conteúdo varia conforme selecionado/elegibilidade |

### Comportamentos e prototipagem

- `Simular aporte`: muda de estado para carregamento e depois exibe proposta ou estado vazio.
- Alterar valor ou cenário: marca a proposta existente como desatualizada até nova simulação.
- Abas: trocam o painel correspondente e atualizam estado selecionado.
- Linha ou ação de ativo: abre detalhes; fechar devolve foco ao controle que abriu o modal.
- Navegação principal: troca entre aporte, carteira e estratégia; item atual acompanha a rota.
- Exportar: ação disponível apenas para uma proposta atual, não desatualizada.

Em protótipo Figma, representar transições com dados representativos; não apresentar valores de demonstração como recomendação financeira real.

## 10. Acessibilidade

- Contraste alvo WCAG AA para combinações de texto e superfície; medir cores finais antes da implementação.
- Tamanho de texto de apoio não deve cair abaixo de 10 px nos frames de design e precisa ser verificado em pixels CSS na interface real.
- Campos têm rótulo persistente, não apenas placeholder.
- Ícones funcionais têm nome acessível ou rótulo textual.
- Estados comunicados também por texto ou forma, nunca exclusivamente por cor.
- Navegação, abas, tabelas e modal devem ser utilizáveis por teclado.
- Foco tem contorno perceptível e não depende de hover.
- Alvos de toque móveis devem ter área confortável, idealmente 44 × 44 px.
- Respeitar safe areas, zoom e preferência por movimento reduzido.

## 11. Mapeamento Figma → React

| Figma | React |
|---|---|
| Componentes com propriedades e variantes | Componentes funcionais com props tipadas |
| Estilos e variáveis semânticas | CSS variables/tokens semânticos |
| Auto Layout | Flexbox/Grid com conteúdo intrínseco |
| Frames desktop, tablet e mobile | Breakpoints responsivos, não telas separadas por detecção de dispositivo |
| Fluxos de protótipo | Estados controlados e callbacks da aplicação |
| Anotações de conteúdo/dados | View model preparado por presenter/adapter |
| Variantes de bloqueio e qualidade dos dados | Status/resultados providos pelo domínio; a UI apresenta sem reinterpretar |

## 12. Critérios de aceite visual

- A proposta é a primeira informação financeira que se destaca.
- O usuário distingue valor investido, custos e saldo restante.
- Compra e exclusão possuem motivos acessíveis sem depender de cor.
- A comparação de alocação deixa visíveis atual, simulado e meta.
- Desktop mantém navegação, conteúdo principal e contexto equilibrados.
- Mobile reordena painéis sem mudar o fluxo de decisão e preserva navegação inferior.
- Modal, abas e controles possuem estados de foco e teclado.
- Dados demonstrativos estão marcados como tais.
- O código usa componentes coerentes com a árvore desta especificação e recebe resultados do motor por um contrato de apresentação.

## 13. Sequência sugerida de implementação

1. Criar tokens semânticos e `AppShell`.
2. Componentizar navegação e cabeçalho responsivos.
3. Implementar formulário de aporte e estados de entrada.
4. Implementar `DecisionCard` usando view model, sem lógica de domínio.
5. Implementar evidências, ativos excluídos e diálogo de detalhes.
6. Implementar snapshot da carteira e impacto de alocação.
7. Completar páginas de carteira e estratégia.
8. Comparar screenshots em 1440 × 1100 e 390 × 844 e corrigir diferenças visuais.
9. Validar teclado, foco, leitor de tela e conteúdo dinâmico.

---

**Nota de escopo:** este handoff especifica a decomposição React e a tradução visual da V3. A árvore pode ser adaptada ao framework e às fronteiras já existentes no repositório, preservando o motor financeiro como fonte de verdade.
