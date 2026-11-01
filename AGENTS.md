# Regras de implementação — simulador de aportes

Versão 1.4 · 31/10/2026 · Derivado do Manual padrão de engenharia v1.1 e dos Perfis de projetos — sistemas distribuídos v1.1, ambos fornecidos e lidos.

Alterações 1.4: reforço de invariantes prescritivas (estados parciais ilegais, identidade estável vs ticker, precisão de timestamps, imutabilidade de histórico) e obrigatoriedade de casos negativos no TDD.

## Contexto e estado real

Escopo concluído T00–T15: motor determinístico com dados fictícios, CLI e tela React para testar aportes variáveis. Essa entrega é o MVP preservado; proposta nenhuma executa ou registra compras. A iniciativa posterior de gestão da carteira e integração de dados está definida em `TASK.md` e `GRAFO_DEPENDENCIAS.md`; nela P3 é principal, P5 se aplica a integrações, P1 somente quando a interface mudar, P4 permanece N/A para pull REST e P2 depende de surgir API/contas multiusuário. Integração e persistência só avançam pelos gates do plano.

T01 concluída em 14/09/2026: Node 22.11.0 e npm 10.9.0, TypeScript estrito,
React/Vite, Vitest, Testing Library, ESLint e Playwright, com versões exatas no
lockfile. Comandos verificados: `npm ci`, `npm test`,
`npm run test:focused -- tests/web/App.test.tsx`, `npm run test:integration`,
`npm run typecheck`, `npm run lint`, `npm run build` e `npm run test:e2e`; `npm run dev`,
`npm run demo` e `npm run preview` servem somente em `127.0.0.1`. Preparação do
navegador: `npx playwright install --with-deps chromium`. Necessidade,
compatibilidade, alertas e particularidades do ambiente estão em
`docs/DEPENDENCIAS.md`. T02 concluída em 15/09/2026: contratos runtime, dinheiro
bigint, FX/custos racionais e JSON validados; 74 testes, typecheck, lint e build
passaram. Detalhes em `docs/CONTRATOS_T02.md`. O motor de decisão ainda não existe;
T03 concluída em 15/09/2026: oito perfis de compra, SCHD sem suporte de compra,
builders S01–S24 e expectativas independentes; 144 testes, typecheck, lint e
build passaram. Contratos adicionais e limites em `docs/FIXTURES_T03.md`.
T04 concluída em 15/09/2026: pontuação H/L/B racional, contínua e ligada à
regra; 182 testes, typecheck, lint e build passaram. Detalhes em
`docs/PONTUACAO_T04.md`. T05 concluída em 20/09/2026: qualidade e confiança
por perfil, composição temporal, cobertura, conflitos e look-through da holding;
192 testes, typecheck, lint e build passaram. Detalhes em
`docs/QUALIDADE_T05.md`. T06 concluída em 20/09/2026: F/M/V, margem/teto,
execução de ETF e estados de elegibilidade versionados; 215 testes, typecheck,
lint e build passaram. Detalhes em `docs/VALUATION_T06.md`. T07 concluída em
20/09/2026: patrimônio, pesos, déficits, capacidades, custos e look-through;
224 testes, typecheck, lint e build passaram. Detalhes em
`docs/PESOS_CAPACIDADE_T07.md`. T08 concluída em 20/09/2026: rateio por classe
e prioridade, até cinco linhas, unidades inteiras, custos/FX agregados, limites
pós-custos e sobras determinísticas; 239 testes, typecheck, lint e build
passaram. Detalhes em `docs/ALOCADOR_T08.md`. T09 concluída em 20/09/2026:
caso de uso compartilhado, resultado explicável, identidade SHA-256 canônica,
snapshot completo e diagnóstico separado; 248 testes, typecheck, lint e build
passaram. Detalhes em `docs/CASO_USO_T09.md`. T10 concluída em 21/09/2026: CLI
Node 22, saída humana/JSON e publicação local exclusiva com concorrência e falha
parcial testadas no filesystem; 261 testes, integração, typecheck, lint, build
web e build CLI passaram. Detalhes em `docs/TERMINAL_EXPORTACAO_T10.md`. T11
concluída em 21/09/2026: tokens claro/escuro, formulário e
regiões semânticas para resumo, proposta, evidências, exclusões e pesos;
263 testes, integração, typecheck, lint, build, e2e e inspeção Chromium em
360/768/1280 px passaram. Detalhes em `docs/BASE_VISUAL_T11.md`.
T12 concluída em 21/09/2026: formulário ligado ao motor, sete estados e proteção
contra conclusões antigas; 270 testes, typecheck, lint, build e quatro e2e
passaram. Detalhes em `docs/FLUXO_WEB_T12.md`. T13 concluída em 22/09/2026:
evidências, exclusões, pesos e download do JSON atual; 275 testes, typecheck,
lint, build e cinco e2e passaram. Detalhes em `docs/DETALHES_WEB_T13.md`.
T14 concluída em 22/09/2026: aceitação S01–S24, paridade CLI/navegador,
fronteiras negativas, medição do núcleo e revisão visual; 301 testes, typecheck,
lint, builds web/CLI e nove e2e passaram. Detalhes em `docs/VALIDACAO.md`.
T15 concluída em 25/09/2026: README de instalação, execução, dados fictícios,
recuperação e extensão; `.nvmrc` fixado em Node 22.11.0. Cópia isolada passou
`npm ci`, 313 testes em 20 arquivos, typecheck, lint, builds web/CLI e exemplos
CLI S01/S02. Um primeiro teste em paralelo atingiu dois timeouts; a repetição
sequencial passou. Como o `.git` fornecido está sem commits e sem arquivos
rastreados, foi validada uma cópia isolada, não um clone Git publicado. Evidência
em `docs/ENTREGA_T15.md`.
Se houver código ao iniciar uma mudança, inspecioná-lo antes de criar ou
substituir estrutura.

## Fontes normativas e prioridade

Ler `TASK.md` e `GRAFO_DEPENDENCIAS.md` desta pasta. T00 deve copiar e conferir as seguintes fontes fornecidas, sem modificar seu conteúdo:

| Origem fornecida | Caminho a criar na raiz do projeto |
|---|---|
| MANUAL_PADRAO_ENGENHARIA(1).md | `docs/MANUAL_PADRAO_ENGENHARIA.md` |
| PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS(2).md | `docs/PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS.md` |
| Politica_Decisao_Motor_Investimentos_v1.md | `docs/Politica_Decisao_Motor_Investimentos_v1.md` |

T00 concluída em 14/09/2026: os três destinos existem e foram comparados com as
fontes por `cmp -s` e SHA-256, sem diferenças. Os hashes e a análise de
aplicabilidade estão em `docs/DECISOES.md`. Se uma fonte desaparecer ou divergir
no futuro, localizar a cópia fornecida; não fingir que foi lida.

Manual é a base comum de engenharia; perfis especializam P3/P1; política define os critérios financeiros; TASK define escopo e adaptações explícitas da fase, sem dispensar obrigações de engenharia. Instrução atual do usuário e permissões vigentes prevalecem. Não alterar regras para contornar um bloqueio. Não usar prévia visual como especificação dos cálculos.

Consultar apenas detalhes pertinentes à tarefa: manual ENG-01/02, COD, ARQ e §11 sempre; TDD-01–05 para comportamento; DAD-01/04 e P3 para cálculo; SEG e P1 para entrada/renderização; OPS para erro/execução/exportação. Não reler todo o manual a cada pequena alteração.

## Organização e simplicidade

Estrutura atual: `frontend/` contém a interface; `backend/src/` contém domínio, aplicação, adaptadores e CLI local; `backend/fixtures/` contém dados fictícios. `tests/`, `docs/` e configurações compartilhadas ficam na raiz. Um projeto. `backend/` não é um serviço HTTP. Funções e módulos simples bastam; não impor interface para cada classe, limite artificial de linhas ou framework interno.

- Domínio puro: sem React, filesystem, rede, relógio global, aleatoriedade ou estado compartilhado mutável.
- Aplicação recebe snapshot validado, política, carteira, aporte e data explícita.
- UI/CLI usam o mesmo caso de uso; adaptadores concentram leitura/exportação. Não duplicar cálculo em componentes ou textos.
- Dinheiro tem representação exata, e dados externos exigem validação runtime além de tipos estáticos. Evitar escapes de tipagem sem motivo documentado.
- Antes de adicionar dependência, verificar necessidade, manutenção, compatibilidade e custo; controlar versões/lockfile. Não inventar criptografia.
- Adição de componente ou compromisso difícil de reverter exige nota curta: problema atual, alternativa menor, escolha, custo e gatilho de revisão (ARQ-01). Medir antes de otimizar estruturalmente.

## Invariantes do domínio

- Compras + custos + saldo = orçamento exato. Unidades inteiras não negativas; custo, câmbio, moeda e arredondamento explícitos. Não tolerar divergência de centavos.
- Respeitar teto de preço, capacidade, exposição e limite de condicional; revalidar pesos após custos. Não alterar parâmetros por ticker para forçar compra.
- Distinguir zero, ausência, invalidade e vencimento. Bloqueio global ou por ativo segue o contrato de TASK; nenhum fallback fabrica aprovação.
- Mesmas entradas/versões/data produzem mesma decisão; snapshot original permanece disponível no resultado e inputs não são mutados.
- Proposta não é execução, gravação de posição ou persistência garantida. Atualizar a tela não atualiza a carteira.
- SCHD participa da valoração/exposição, mas compra fica bloqueada enquanto perfil de dividendos estiver sem suporte.
- Explicações derivam das evidências e coincidem com quantidades/notas; dados fictícios nunca são apresentados como análise real.

### Invariantes reforçadas (produção / contratos canônicos)

Formulação prescritiva e negativa. Estas regras aplicam-se a qualquer contrato de runtime, snapshot, observação de mercado e identidade de ativo (inclusive na fase INT):

- Um snapshot ou observação marcado como `missing-price`, `invalid`, `unavailable` ou equivalente **não pode** conter valor monetário parcialmente preenchido (`baseMarketValue`, `localMarketValue`, `priceObservationId` etc.). Combinações parciais inconsistentes DEVEM ser rejeitadas em runtime.
- Um ativo só pode ser considerado identificado/resolvido se tiver `issuerId` não-nulo **ou** pelo menos um identifier com `scheme` pertencente a um catálogo fechado de schemes estáveis (ex.: `cnpj`, `isin`, `figi`, `lei`). Ticker/symbol sozinho **nunca** satisfaz o requisito de identidade estável.
- Timestamps DEVEM ser comparados na precisão que o parser/contrato aceita. Se o contrato admite mais de três casas decimais fracionárias, a comparação **não pode** depender de truncamento silencioso (ex.: `Date.parse`). Ou rejeita-se o excesso de precisão, ou compara-se na precisão completa. Validade temporal deve permanecer distinta.
- Dados e snapshots usados em decisões históricas **não são sobrescritos**. Correção gera nova versão, revisão ou evento de estorno vinculado ao original.
- Falha nunca se transforma em valor plausível ou sucesso falso. Estados parciais e resultado desconhecido devem ser explícitos.

## TDD obrigatório e exceções

Aplicar TDD-01–05: **Red → Green → Refactor** a cálculo, validação, regras, exportação e lógica de interface. Red precisa falhar pela ausência/incorreção do comportamento, não por sintaxe, import ou ambiente quebrado. Implementar a regra mínima correta, não apenas o exemplo. Refatorar se trouxer clareza; não criar abstração por obrigação.

**Casos negativos e estados proibidos são parte obrigatória do Red** quando o domínio os define (valuation parcial inconsistente, identidade só com ticker, timestamps com precisão excessiva, falha parcial, retry duplicado etc.). Um conjunto de testes que cobre apenas o caminho feliz não satisfaz TDD para contratos canônicos e invariantes de rejeição.

Bugs exigem regressão antes da correção. Código existente sem cobertura exige caracterização do comportamento preservado (pode começar passando); novo comportamento/bug ainda exige seu próprio Red. Refatoração pura usa cobertura existente e lacunas relevantes sem Red artificial.

Usar testes unitários para domínio, comportamento observável para UI e integração real do filesystem para garantias de exportação. Mocks de fronteira não provam garantias do sistema real. Controlar relógio, aleatoriedade e concorrência; usar promessas/barreiras, sem sleeps arbitrários. Não testar chamadas privadas para fixar estrutura.

TDD-04 dispensa TDD em documentação, conteúdo estático, visual sem lógica e artefatos gerados; usar revisão/build/inspeção. Configuração e infraestrutura declarativa usam validação proporcional, criando verificação antes quando viável. Experimento descartável pode explorar sem TDD, mas código aproveitado deve passar pelo fluxo de implementação e testes antes da integração.

Ausência de testes existentes não dispensa montar suporte mínimo. Ambiente bloqueado exige testes escritos e limitação explícita; não declarar Red/Green observados. Evidência sucinta por tarefa basta, sem transcrição ou relatório por teste. Não impor 100% de cobertura ou continuar bateria opcional após critérios/riscos e gates satisfeitos.

## Fronteiras, confirmação e falhas

| Fronteira | Autoridade e sucesso | Repetição/falha |
|---|---|---|
| Fixtures → aplicação | Arquivos versionados, validados antes do cálculo | Erro de carteira/configuração bloqueia proposta; erro local segue regra por ativo |
| Aplicação → motor | Snapshot imutável e política explícita | Repetição sem efeito; mesmo input produz mesma decisão |
| UI → aplicação | Resultado calculado para entrada atual | Edição invalida resultado; conclusão antiga não substitui nova |
| CLI → arquivo | Publicação local concluída conforme contrato | Prevenir arquivo parcial e sobrescrita concorrente; falha permite reexportar a mesma proposta |
| Browser → download | Artefato gerado e download iniciado | Não afirmar confirmação de gravação no disco |

Seguir contrato de exportação em TASK §4.4. Temp+rename sozinho não garante ausência de sobrescrita concorrente em todos os sistemas. Testar o mecanismo no filesystem suportado. Não prometer durabilidade contra perda de energia sem garantia verificada. Não construir comando shell com conteúdo de fixture.

DIST-01/02/07/08/09/10 aplicam-se proporcionalmente às fronteiras locais. DAD-02/03 protegem efeitos locais relevantes como publicação de arquivo; não implicam banco. DIST-03/04/05/06 para escrita remota, retries e transações financeiras são N/A enquanto inexistentes. Estado em memória é descartável; recarregar/reexecutar recompõe a simulação, não histórico de investimentos.

## Segurança, diagnóstico e interface

Aplicar SEG-01–04 nas fronteiras existentes: validar payloads, limites de entrada e versão; renderizar dados como texto; proibir `eval`/execução dinâmica e HTML não sanitizado. Não embutir credenciais, analytics ou dados reais em fixtures, logs ou bundle. Não expor stack trace na interface nem registrar carteira completa por padrão.

Erros operacionais devem informar código, etapa, cenário e versões; decisionId quando já existir. Erro esperado de domínio é distinto de falha operacional. CLI retorna erro global com status não zero; cálculo válido sem compras é sucesso. Não esconder falha com números plausíveis ou sucesso falso. Sem plataforma de telemetria nesta fase.

Servidor de desenvolvimento do MVP em loopback por padrão, recursos locais e simulação sem chamadas externas após instalação. Na iniciativa INT, qualquer acesso a provedor deve ocorrer por processo confiável decidido no Gate D; credenciais nunca vão para React/bundle. Não implementar login, CSRF ou rate limit remoto sem fronteira que os exija. Se o produto passar a ter API/contas/exposição pública, reavaliar autorização, limites, segredos e riscos antes de declarar essa capacidade pronta. CORS nunca é autorização.

Interface com HTML semântico, teclado, foco visível, labels e feedback acessível. Cor não é informação exclusiva. Aviso permanente de simulação; resultado antigo explicitamente desatualizado; exportação vinculada à proposta atual. Pesos futuros dizem “após compras simuladas”. Testar conteúdo malicioso como texto e limites/erros negativos pertinentes. Usar OWASP como fonte de requisitos aplicáveis, sem declarar certificação.

## Gates, autonomia e complexidade adiada

Antes de concluir: critérios aceitos, TDD ou exceção delimitada, testes relevantes, typecheck/lint/build aplicáveis, inspeção visual quando afetada, invariantes/segurança verificados e diff revisado. Tratar configuração/dependências/recuperação quando mudarem. Atualizar TASK somente com evidência real e informar mudanças, verificações e pendências.

N/A não exige aprovação; exceções previstas podem ser usadas dentro das condições do manual. Escolhas reversíveis autorizadas prosseguem sem confirmação repetida. Exceção nova que contrarie obrigação deve identificar regra, motivo, risco, mitigação e remoção; não se autoaprovar nem alterar instruções para contornar. Falha conhecida de acesso indevido, segredo ou corrupção impede declarar a parte afetada pronta.

No MVP T00–T15 não havia API real, banco, autenticação, filas, Redis, WebSocket, Kubernetes, agentes autônomos ou linguagem genérica de regras. Isso descreve o estado entregue, não dispensa a avaliação da nova iniciativa. O plano INT não presume esses componentes: persistência e recuperação são decididas em INT-04; serviço externo, fila ou scheduler só entram após necessidade e gates demonstrados. DAD-05 é N/A para os dados fictícios atuais e deve ser reavaliado se a persistência de dados reais exigir migração/backup. O MVP reduz funcionalidades, não garantias necessárias ao comportamento implementado.
