# Plano de implementação — motor de aportes com exemplos

Versão 2.3 · 25/09/2026 · T00–T15 concluídas.

## 1. Resultado esperado

Uma aplicação local em TypeScript, com CLI e uma tela React, recebe um aporte variável em reais, avalia dados fictícios, distribui compras em unidades inteiras e apresenta evidências. As mesmas entradas geram a mesma proposta nas duas interfaces. Nenhuma proposta executa ou registra compras.

Usar `AGENTS.md` como regras de implementação e `GRAFO_DEPENDENCIAS.md` como ordem de dependências. Referências de origem: política do motor v1.0, requisitos RF-01–16/RNF-01–13 definidos na conversa, wireframe, `MANUAL_PADRAO_ENGENHARIA(1).md` v1.0 e `PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS(2).md` v1.0, ambos fornecidos e lidos. As seções seguintes tornam o plano utilizável sem depender da conversa.

Não começar integrações reais enquanto esta fase estiver em execução. A criação destes documentos não representa implementação, teste ou validação financeira concluídos.

## 1.1 Aplicação normativa e decisões

O manual define práticas comuns; o catálogo especializa P3/P1. `TASK.md` define entregas e adaptações de escopo, mas não dispensa obrigações de engenharia. Instruções do usuário e permissões vigentes prevalecem. Se existir código ao iniciar, inspecioná-lo e preservar padrões úteis antes de criar estrutura nova (ENG-02/COD-02).

| Grupo do manual | Exigência nesta fase | Evidência suficiente |
|---|---|---|
| ENG-01/02; COD-01/02; ARQ-01/02 | Menor mudança coerente, reutilização, decisão curta para complexidade adicional | Revisão do código/diff e nota apenas quando necessária |
| TDD-01–05 | Red → Green → Refactor para lógica; caracterização antes de alterar comportamento existente sem cobertura | Resumo de teste e resultado, sem relatório por teste |
| COD-03 | Tipagem estrita, validação runtime e dependências justificadas/controladas | Schemas, gates estáticos, lockfile e avaliação de alertas relevantes |
| SEG-01–04 | Validar fronteiras; tratar texto como dado; não expor segredos ou sucesso falso | Testes negativos relevantes e inspeção de bundle/erros |
| DAD-01/04; P3 | Dinheiro, datas, integridade, proveniência e snapshot | Oráculos independentes, invariantes e reprodução |
| PERF-01; OPS-02/03 | Limites, medição, diagnóstico mínimo e execução/recuperação documentadas | Teste dos limites, erros com código/etapa e README |
| Manual §§11–12 | Gates proporcionais, N/A distinto de exceção e pendências honestas | Checklist de conclusão por tarefa, sucinto |

DAD-05 (migração/backup), autorização multiusuário, transações financeiras, retries remotos e jobs são N/A enquanto não houver esses comportamentos. Reavaliar se o escopo mudar. N/A não exige aprovação. Exceção já prevista no manual pode ser usada nas condições descritas; exceção nova contrária a obrigação deve expor regra, razão, risco, mitigação e condição de remoção ao responsável, sem autorizar a si mesmo. Falha conhecida de segredo, acesso indevido ou corrupção bloqueia a conclusão da parte afetada.

## 2. Escopo fechado e adaptações explícitas

- Nove posições iniciais de uma unidade: ITUB4, BBSE3, WEGE3, ABEV3, HGLG11, KNCR11, XPML11, IVVB11 e SCHD.
- Preços, séries, câmbio, rubricas, cenários de valuation, exposições e pesos são fictícios, identificados como tais. Não consultar API de mercado para preencher fixtures.
- Motor aplica notas e limites da política aos dados fornecidos. Não estima valor intrínseco do zero: recebe valores conservador/base/favorável e proveniência `provided_fixture`.
- BBSE3 usa avaliação das participações/holding conforme política, não ROIC industrial. WEGE3 industrial; ABEV3 consumo básico; ITUB4 banco; HGLG11 logística; XPML11 shopping; KNCR11 crédito; IVVB11 ETF amplo estratégico.
- SCHD é contado nos pesos e exposições, mas recebe bloqueio de compra `UNSUPPORTED_PURCHASE_PROFILE`. Não simular sua aprovação pelo perfil de ETF amplo.
- Regras históricas podem receber séries anuais/trimestrais fictícias ou agregados previamente calculados com período e método explícitos. A função de qualidade não pode tratar a nota pronta de um mock como se tivesse analisado métricas.
- Sem histórico de estados, toda avaliação começa sem elegibilidade anterior; histerese somente se o cenário fornecer estado anterior e sua versão. Não presumir que uma posição já possuída era elegível plena.
- Tela usa o motor implementado. Não reutilizar divisão 40/60, preços ou explicações fixas do protótipo como algoritmo.
- Sem APIs reais, IA, banco, atualização de posições, ordens, login, taxas tributárias reais, dashboard histórico, agendamento ou rebalanceamento periódico.

## 3. Requisitos e rastreabilidade

### Funcionais

| ID | Requisito | Tarefas principais |
|---|---|---|
| RF-01 | Aporte BRL positivo com até duas casas, entrada inválida explicada | T02, T10, T12 |
| RF-02 | Carteira, quantidades, caixa e pesos validados | T02, T03, T07 |
| RF-03 | Dados fictícios com unidade, período, data e origem | T02, T03 |
| RF-04 | Regras compatíveis com cada perfil | T03, T05, T06 |
| RF-05 | Pontuação contínua de proximidade | T04 |
| RF-06 | Qualidade e confiança com cobertura e ausência explícitas | T05 |
| RF-07 | Valuation fornecido, múltiplos, margem e teto | T06 |
| RF-08 | Elegibilidade e motivos de bloqueio | T06 |
| RF-09 | Pesos/deficits após aporte | T07 |
| RF-10 | Alocação sujeita a orçamento, classe e concentração | T08 |
| RF-11 | Unidades inteiras, câmbio e custos | T02, T08 |
| RF-12 | Redistribuição permitida e saldo | T08 |
| RF-13 | Explicar compras e exclusões | T09, T13 |
| RF-14 | Terminal e JSON com snapshot e versão | T09, T10, T13 |
| RF-15 | Carteira original preservada | T07–T10, T14 |
| RF-16 | Cenários executáveis sem serviços externos | T03, T14 |
| RF-17 | Formulário web, atalhos 500/1000 e seleção de cenário | T11, T12 |
| RF-18 | Estados inicial, inválido, analisando, pronto, vazio, desatualizado e erro | T12 |
| RF-19 | Detalhes por ativo e pesos antes/depois/alvo, somente leitura | T13 |
| RF-20 | Baixar JSON da proposta exibida, sem alterar posições | T13 |

RF-17–20 são a extensão web explicitamente solicitada após os requisitos iniciais.

### Não funcionais

| ID | Requisito | Verificação |
|---|---|---|
| RNF-01 | Determinismo | Reexecução e permutação de ordem de input sem mudança na decisão, T09/T14 |
| RNF-02 | Precisão monetária | Testes de centavos, FX, custos e overflow, T02/T08 |
| RNF-03 | Separar domínio de I/O e interfaces | Revisão de importações, T01/T09 |
| RNF-04 | TDD | Registro Red/Green dos comportamentos, todas as tarefas funcionais |
| RNF-05 | Rastreabilidade | Dado → regra → nota → motivo → proposta, T05/T09 |
| RNF-06 | Validar entradas | Erros locais/globais e schemas, T02–T06 |
| RNF-07 | Execução offline após instalação | Exemplos e testes sem API externa, T14 |
| RNF-08 | Política/configuração versionadas | Nenhuma regra por ticker fora do mapeamento de perfil, T03/T09 |
| RNF-09 | Imutabilidade | Congelar inputs nos testes e comparar antes/depois, T07–T09 |
| RNF-10 | Simplicidade | Um projeto e scripts documentados; sem serviços adicionais, T01/T15 |
| RNF-11 | Cálculo <1 s para nove ativos | Medição monotônica após aquecimento, registrar máquina; não inclui inicialização/I/O, T14 |
| RNF-12 | Adaptadores substituíveis | CLI/web compartilham entrada normalizada e caso de uso, T09/T14 |
| RNF-13 | Simulação explícita | Avisos em CLI, web e JSON, T10–T14 |
| RNF-14 | Acessibilidade/responsividade | Teclado, labels, foco e tamanhos de 360/768/1280 px, T11–T14 |
| RNF-15 | Resultado ligado à entrada atual | Edição invalida; conclusão antiga não substitui nova, T12 |
| RNF-16 | Segurança proporcional às fronteiras locais | Testes de texto malicioso, versão/payload inválido, limites e erros sem segredos, T02/T10/T13/T14 |
| RNF-17 | Diagnóstico sem excesso de dados | Erros estruturados com etapa/código/versões, sem dump de carteira; detalhes locais controlados, T09/T10/T12 |
| RNF-18 | Dependências e recuperação reproduzíveis | Necessidade/compatibilidade verificadas, lockfile, alertas avaliados e recuperação de exportação documentada, T01/T10/T15 |

## 4. Contratos que devem ser implementados

### 4.1 Entradas

`SimulationInput`: schemaVersion, policyVersion, fixtureVersion, scenarioId, analysisAsOf, aporte BRL, portfolio, marketSnapshot, qualitativeAssessments, providedValuations, policy, costs e FX. Snapshot guarda origens e datas de cada observação. Data de análise é injetada; testes não dependem do dia atual.

Validar schemas na entrada, incluindo unidades, datas ISO válidas, âncoras ordenadas, pesos por classe/ativo coerentes, tickers únicos, preços positivos e moeda identificada. Quantidade zero é permitida para cenários de entrada nova; negativo e fração não. Lucro negativo é dado válido, mas torna P/L inaplicável. Não substituir ausente por zero.

Configuração padrão dos exemplos: BRL é moeda-base, SCHD em USD, demais em BRL; mercado fracionário brasileiro usa unidades inteiras. Pesos de classes somam 100%, e pesos de ativos somam a meta da classe; caixa estratégico pode ter meta explícita. Reserva de emergência não é input. Não inventar pesos adequados ao usuário: pesos da fixture servem apenas ao teste.

Validade usa `analysisAsOf`, última data de pregão fornecida e datas das observações. Não implementar calendário financeiro real nesta fase. Limites temporais da política permanecem nas configurações; testar fronteiras inclusive exatamente no vencimento.

### 4.2 Precisão, câmbio, custos e limites de simulação

Representar dinheiro como inteiros de centavos com `bigint` ou biblioteca decimal única. Se bigint, serializar como strings decimais no JSON; todos os consumidores convertem explicitamente. Câmbio e razões monetárias exigem aritmética decimal/racional, nunca `parseFloat` seguido de soma financeira.

Documentar em T02: moeda original, taxa USD→BRL, precisão, arredondamento half-up para valor de mercado e ceil conservador para débito de compra/custos. Registrar custos fixos por ativo comprado, variáveis sobre valor comprado e câmbio/spread; custo fixo incide uma vez por linha agregada, não por unidade nem por tentativa de distribuição. Não cobrar remessa quando não houver compra em USD.

Custo de compra usa reserva de preço de 0,5% da política; quando a reserva superaria o teto, usar o teto como limite, sem supor execução acima dele. Quantidade precisa caber no custo total reservado. Pesos simulados são marcados a preço do snapshot; custo/reserva consomem caixa, não criam valorização. Denominador de exposição pós-compra desconta custos estimados do patrimônio pós-aporte. Verificar limites novamente após essa dedução.

Tetos operacionais propostos para este simulador, não critérios financeiros: até 100 ativos por input, aporte máximo de R$ 1.000.000,00 e até 1 MiB para fixtures lidas pela CLI. Validar esses limites na fronteira e documentar mensagens. Isso impede loops/arquivos sem limite e não justifica rate limiter de rede. A fixture normal contém nove ativos. Limite de cinco compras e demais limites financeiros vêm da política.

### 4.3 Erros e saída

Erros globais (aporte, carteira, preço/FX necessário para valorar posição existente, metas incompatíveis ou versão não suportada) impedem gerar proposta. Falta de métrica de um candidato bloqueia/reduz a análise desse ativo conforme política; não impede analisar os demais se a carteira ainda puder ser valorada integralmente.

`SimulationResult`: schemaVersion, simulation=true, identificador determinístico da decisão, snapshots de inputs, evaluations, purchases, excludedAssets, allocationsBefore/After/Target, principalCents, feesCents, unallocatedCents e warnings. Metadados de duração ou exportação ficam fora da identidade da decisão.

Cada evidência: ruleId, observedValue, unit, anchors, score, applicability, source, period e reasonCode. Cada compra: ticker, currency, quantity, priceSnapshot, priceLimit, conversion, principal, fees, reservedTotal e reasons. Ausências relevantes não são escondidas por texto genérico.

Identidade da decisão: hash da serialização canônica de todas as entradas relevantes e versões, incluindo arredondamento/custos; ordenar ativos por identificador estável. Empates usam comparador explícito por identificador, sem dependência de locale do ambiente.

### 4.4 Diagnóstico, segurança e exportação

Formato mínimo de falha operacional: errorCode, etapa, scenarioId, schemaVersion e policyVersion; acrescentar decisionId quando existir. Mensagem de usuário explica ação possível sem stack trace ou snapshot completo. CLI retorna código de saída não zero em erro global; resultado sem compras é sucesso de cálculo. Não instalar plataforma de observabilidade. Duração fica em diagnóstico, fora da identidade financeira.

Identidade determinística não exige hashing no domínio puro: produzir payload canônico no núcleo/aplicação e calcular hash no adaptador com biblioteca/runtime estabelecido, consistente entre CLI/browser; não inventar algoritmo criptográfico. O id não é credencial nem prova contra manipulação.

Exportação local: publicação de arquivo completo com prevenção de sobrescrita concorrente, nome determinístico ou explícito e contrato de repetição. Preferir rejeitar destino existente; não usar apenas “verificar existência → rename que sobrescreve”. Escolher em T10 mecanismo comprovado no filesystem suportado, por exemplo publicação atômica sem substituição a partir de temporário. Testar duas tentativas para mesmo destino, falha intermediária e limpeza de temporários. Não prometer persistência contra perda de energia sem garantir sync apropriado. Falha de exportação permite repetir exportação da mesma proposta sem recalcular ou modificar a carteira.

A fixture é tratada como entrada não confiável para validação/renderização. Testar strings HTML/script como texto, JSON inválido, tamanho excedido e ausência de dependência crítica sem fallback permissivo. Caminho de arquivo da CLI é uma escolha local explícita, não um endpoint remoto. Não executar conteúdo ou construir comando shell a partir dele. Servidor local em loopback; sem credenciais no cliente.

### 4.5 Alocação

Implementar seção 13 da política, nesta ordem: orçamento sem dupla contagem → patrimônio pós-aporte → déficits de classe → capacidade de cada ativo → elegibilidade/teto → prioridade por classe → limite global de linhas → distribuição proporcional com saturação → unidades inteiras → uso determinístico de sobras dentro da mesma classe.

Orçamento é aporte + caixa tático/proventos explicitamente liberados, sem contar provento já no caixa duas vezes. Resultado preserva origem do orçamento. Classes sem candidatos mantêm sua parcela em caixa; não transferir automaticamente a outra classe. Manter controle separado de saldo por classe e consolidá-lo ao final.

Se arredondamento proporcional gerar centavos residuais, usar maior resto e identificador estável sem ultrapassar déficit. Capacidade zero remove candidato de redistribuição. Recalcular custos a partir da linha agregada e preservar limite coletivo de 20% para elegíveis condicionais, calculado sobre débito reservado com custos (convenção conservadora desta fase). Novas posições não podem ser abertas por elegibilidade condicional.

Compra não pode agravar limite já excedido. Carteira inicialmente acima do limite não é configuração impossível por si só: bloquear aumentos e avaliar as demais possibilidades. Alvos incompatíveis com limites configurados são erro de configuração. Exposições indiretas dos ETFs devem ser fictícias mas explícitas; lacuna deve impedir afirmar concentração totalmente verificada.

Heurística não garante ótimo global. Se nenhum lote inteiro atender às condições, aceitar caixa; nunca alterar faixa para forçar compra. Iterações precisam reduzir saldo ou remover candidato para assegurar término.

## 5. Cenários obrigatórios

| Código | Cenário | Resultado esperado |
|---|---|---|
| S01 | Padrão, R$ 500 | Proposta válida; total explicado e orçamento fechado |
| S02 | Mesma fixture, R$ 1.000 | Recalcular, preservar limites; não dobrar saída anterior |
| S03 | Orçamento abaixo de toda unidade elegível | Nenhuma compra, saldo integral |
| S04 | Todos caros | Nenhuma compra; preço justifica bloqueios |
| S05 | Todos inelegíveis | Nenhuma compra; melhor relativo não ignora mínimos |
| S06 | Métrica crítica ausente em candidato | Bloqueio identificado do candidato, demais analisados |
| S07 | Cotação/FX ausente de posição existente | Erro global de valoração |
| S08 | Posição acima de limite | Nenhum aumento da posição; sem venda automática |
| S09 | Indicador perto do alvo | Nota intermediária verificável e não exclusão exata |
| S10 | Lucro negativo/múltiplo inválido | Nunca interpretar como preço barato |
| S11 | Dados vencidos | Bloqueio com motivo específico |
| S12 | Custos e FX não nulos | Reserva suficiente e soma exata; usar candidato USD suportado sintético adicional no teste do alocador, sem liberar SCHD |
| S13 | Condicional existente e candidato novo | Limite conjunto respeitado; entrada nova bloqueada |
| S14 | Classe sem elegíveis | Preservar parcela em caixa |
| S15 | Empate/ordem de entradas diferente | Mesma escolha determinística |
| S16 | SCHD sem perfil de compra | Valor da posição incluído, aporte bloqueado |
| S17 | CLI versus navegador | Mesmas decisões, centavos e reasonCodes |
| S18 | Entrada alterada durante processamento | Resultado antigo não vira proposta atual |
| S19 | Configuração inválida/versão desconhecida | Erro claro, sem proposta financeira |
| S20 | Reexecução/exportação | Identidade igual; input original intacto |
| S21 | Texto de origem com HTML/script | Renderizar como texto, sem executar conteúdo |
| S22 | Payload excessivo/JSON inválido/limite monetário | Rejeição clara e limitada, sem trabalho sem limite |
| S23 | Duas exportações para mesmo destino/falha parcial | Sem sobrescrita silenciosa ou artefato final incompleto |
| S24 | Falha operacional | Código/etapa rastreáveis; sem segredo, stack na UI ou carteira completa em log |

Cenários web expostos inicialmente: padrão, todos inelegíveis, dados incompletos e concentração excessiva. Demais casos pertencem aos testes/CLI. As fixtures têm expected outcomes independentes; saída do motor não é usada para gerar automaticamente os resultados esperados.

## 6. Tarefas

Todas seguem TDD para comportamento; regras detalhadas em `AGENTS.md`. Registrar evidência e status por tarefa. Não exigir commits artificiais de testes falhando, mas observar e registrar Red antes de Green.

### T00 — Consolidar fontes e decisões

Dependências: nenhuma. Cobre RF-04, RNF-08/10.

Status em 14/09/2026: **concluída**. `docs/DECISOES.md` registra fontes,
versões, hashes, decisões, lacunas da fase e evidência documental.

- [x] Colocar os três arquivos deste pacote na raiz do projeto; copiar política, manual e perfis para os três caminhos canônicos de `docs/` citados no AGENTS; conferir versões/conteúdo sem reescrever as fontes.
- [x] Registrar stack planejada, perfis P3/P1, aplicabilidade da seção 1.1, escopo e adapters em `docs/DECISOES.md`; uma nota curta basta. Inspecionar código existente se houver antes de escolher abstrações.
- [x] Verificar lacunas da política para os nove ativos; registrar rubricas de BBSE3, critérios de ETF amplo e bloqueio SCHD.
- [x] Confirmar que todas as adaptações de cálculo desta fase estão explícitas; não alterar a política original silenciosamente.

Pronto quando: referências existem, não há placeholders apresentados como configuração válida e decisões da fase são distinguíveis da política geral. Sem testes artificiais de Markdown.

### T01 — Fundação do projeto

Dependências: T00. Cobre RNF-03/04/07/10/12.

Status em 14/09/2026: **concluída**. Configuração e conteúdo estático seguiram
TDD-04, sem Red artificial. Green observado: um smoke test Vitest e um teste
Playwright passaram. `npm ci`, typecheck, lint e build passaram; `npm audit`
retornou zero vulnerabilidades. Comandos, versões, alertas de manutenção e a
limitação de `sudo` do contêiner estão documentados no README, AGENTS e em
`docs/DEPENDENCIAS.md`. A tela mínima também foi inspecionada em Chromium a
1280×720; conteúdo, hierarquia e aviso permanente estavam legíveis.

- [x] Criar projeto TypeScript estrito com React/Vite; fixar versões suportadas e lockfile. Selecionar Vitest, Testing Library e Playwright como ferramentas planejadas, ou justificar equivalentes.
- [x] Criar estrutura de domínio, aplicação, adapters, CLI, web, fixtures e testes.
- [x] Configurar scripts para dev, demo, test, typecheck, lint, build e teste de navegador; atualizar AGENTS com os comandos reais verificados.
- [x] Verificar necessidade, manutenção e compatibilidade das dependências; avaliar alertas relevantes disponíveis sem alegar certificação; não adicionar pacote para uma abstração sem caso atual.
- [x] Confirmar execução de um teste mínimo e build; não configurar serviço de backend desnecessário. Configuração segue validação proporcional TDD-04, sem Red artificial de arquivo declarativo.

Pronto quando: scripts existem e funcionam; README informa runtime requerido. Gates: typecheck, teste inicial, lint e build reais.

### T02 — Contratos e aritmética monetária

Dependências: T01. Cobre RF-01/02/03/11 e RNF-02/06.

Status em 15/09/2026: **concluída**. Código e 70 testes já existiam ao iniciar;
foram caracterizados, sem alegar Red histórico. Red observado em três novas
regressões: ausência de preço/FX de candidato e duplicidade de métricas/rubricas
com conteúdo inválido. Gre?en após correção. Exemplo manual misto fecha orçamento
em centavos. `npm test` passou (74 testes); `npm run typecheck`, `npm run lint`
e `npm run build` passaram. Corrigida expansão recursiva de tipo do snapshot
detectada no typecheck, preservando congelamento profundo. Documentação e
limites em `docs/CONTRATOS_T02.md`. Revisão por diff contra cópia anterior às
edições, pois a pasta não contém Git. Sem alteração visual; e2e não reexecutado.

- [x] Valores inválidos, casas excessivas, notação exponencial, negativo, duplicados, pesos incoerentes, datas/unidades inválidas e limites de input cobertos; caracterização e Red de regressões conforme registro acima.
- [x] Centavos, arredondamento FX, custos fixos/variáveis, números fora da representação e serialization round trip cobertos na caracterização existente; sem Red histórico alegado.
- [x] Implementar tipos/schemas, parse de BRL com convenção pt-BR explícita e decimal/racional para moeda e câmbio.
- [x] Erros estruturados por campo/código; dados ausentes não viram zero. Exercitar S22 e distinguir erro de domínio de falha operacional (COD-03/SEG-01).

Pronto quando: contratos descritos na seção 4 são testáveis sem I/O e os exemplos calculados manualmente fecham em centavos.

### T03 — Política e dados de exemplo

Dependências: T02. Cobre RF-02/03/04/16, RNF-08.

- [ ] Red: perfil inexistente, âncoras fora de ordem, versão desconhecida e métricas incompatíveis.
- [ ] Implementar configuração dos oito perfis/aplicações suportados conforme necessário, sem confundir quantidade de tickers com quantidade de perfis.
- [ ] Criar nove posições iniciais, snapshots, rubricas com fonte fictícia e cenários de valuation fornecidos.
- [ ] Criar fixtures S01–S24 ou builders determinísticos, com data de análise fixa e expectativas independentes.
- [ ] Escolher pesos de simulação factíveis dentro dos limites, exposição setorial/por grupo incluindo ETFs e custos zero no cenário simples; custos não nulos em S12.

Pronto quando: fixtures validam e descrevem o cenário; nenhuma nota Q/V/C é apenas um resultado fixo que contorna os cálculos.

### T04 — Pontuação gradual

Dependências: T02. Cobre RF-05.

- [ ] Red: âncoras, interpolação, extremos, saturação e direção H/L/B.
- [ ] Implementar score 0–100 sem penalizar excelência quando direção é monotônica.
- [ ] Testar H(−2;0;3) em 2,5 → 93,333… e L(1,5;2,5;4) em 1,8 → 88; tolerância somente numérica de score, nunca de dinheiro.
- [ ] Preservar precisão interna; arredondar apresentação, não alterar classificação por nota exibida.

Pronto quando: testes de continuidade e monotonicidade passam e cada resultado referencia sua regra.

### T05 — Qualidade e confiança

Dependências: T03, T04. Cobre RF-04/06 e RNF-05/06.

- [ ] Red: histórico versus atual, risco pelo pior período, cobertura insuficiente, zero versus ausente/inaplicável e rubricas sem evidência.
- [ ] Implementar blocos Q por perfil e composição C conforme política.
- [ ] Aplicar agregação de participações para holding e métricas específicas de bancos/FIIs/ETF.
- [ ] Retornar evidências individuais e cobertura; métricas ausentes não são removidas oportunisticamente do denominador.

Pronto quando: Q/C podem ser reconstruídos a partir das evidências; dados insuficientes impedem aprovação sem bloquear valoração válida da carteira.

### T06 — Preço, teto e elegibilidade

Dependências: T05. Cobre RF-07/08.

- [ ] Red: cenário incoerente, valor-base não positivo, margem por qualidade/confiança, cíclicas e incerteza material.
- [ ] Implementar F/M/V e teto conforme política; P/L inválido não vira oportunidade.
- [ ] Aplicar exceção de ETF amplo estratégico sem valuation de componentes, com linguagem “não avaliado” e verificação de execução simulada.
- [ ] Aplicar pleno/condicional/manter/observação; precedência de bloqueios antes de ranking e histerese apenas com estado anterior fornecido.
- [ ] Bloquear SCHD por perfil sem suporte; não impedir que sua posição seja valorada.

Pronto quando: limites exatos (Q=65/75, C=80, teto e validade) têm testes e comportamento inequívoco.

### T07 — Pesos e capacidade

Dependências: T03. Cobre RF-09/15.

- [ ] Red: nove posições de uma unidade não têm necessariamente mesmo peso; converter USD e preservar posições.
- [ ] Calcular patrimônio antes/depois de aporte, metas monetárias, déficits e capacidades.
- [ ] Distinguir configuração impossível de posição atualmente acima do limite; não sugerir venda.
- [ ] Testar custos afetando denominador, exposição indireta e caixa sem dupla contagem.

Pronto quando: todos os denominadores/unidades são explícitos e estado inicial congelado não é modificado.

### T08 — Alocador

Dependências: T06, T07. Cobre RF-10/11/12.

- [x] Red: exemplos manuais de divisão por classe/prioridade, unidades, custos, FX, saturação, desempate e sobras.
- [x] Implementar algoritmo da seção 4.5 sem otimização genérica desnecessária.
- [x] Recalcular custo marginal ao acrescentar unidade; custo fixo uma vez por ativo.
- [x] Aplicar cinco linhas máximas, limite de condicional, teto e concentração após custos.
- [x] Demonstrar término e validar invariantes para vários orçamentos, incluindo R$ 0,01, R$ 500, R$ 1.000 e limite máximo suportado.

Pronto quando: nenhuma execução ultrapassa orçamento/limites; casos sem solução retornam saldo, sem relaxar regra.

### T09 — Caso de uso e proposta explicável

Dependências: T08. Cobre RF-13/14/15, RNF-01/05/09/12.

- [x] Red: determinismo, identidade canônica, imutabilidade, erros globais versus resultados parciais.
- [x] Compor avaliação/alocação/explicação com entrada explícita, sem I/O no domínio.
- [x] Gerar reasonCodes e templates fiéis às evidências; explicar compras, exclusões e quantidade limitada.
- [x] Snapshot completo no resultado com `simulation: true`; métricas de execução separadas de identidade. Aplicar diagnóstico da seção 4.4, sem dump automático dos dados em logs.

Pronto quando: mesma função atende CLI e web e não altera carteira. Nenhuma justificativa é inventada para uma saída fixa.

### T10 — Terminal e exportação

Dependências: T09. Cobre RF-01/14, RNF-07/13.

Status em 21/09/2026: **concluída**. Red focal com 13 falhas por
`T10_NOT_IMPLEMENTED`; Green e regressão de diagnóstico de destino existente
observados. CLI Node 22, JSON completo e publicação exclusiva por temporário
sincronizado + hard link foram implementados sem dependência nova. S23 usa
filesystem real e provou um vencedor concorrente, preservação do destino e
limpeza. `npm test` passou (261 testes); integração (4 testes), typecheck, lint,
build web e build CLI passaram. Exemplos R$ 500/R$ 1.000 e limites constam em
`docs/TERMINAL_EXPORTACAO_T10.md`.

- [x] Red: entrada inválida, cenário inexistente, JSON round trip e erro ao escrever arquivo.
- [x] Criar CLI que recebe aporte/cenário/data e imprime tabela, custos, saldo e motivos em português.
- [x] Exportar JSON completo com publicação sem substituição concorrente conforme seção 4.4; teste de integração no filesystem para S23, não só mock. Falha intermediária preserva arquivo anterior e não publica arquivo final parcial.
- [x] Documentar exemplos efetivamente executados de R$ 500 e R$ 1.000, códigos de saída e repetição segura da exportação sem alterar carteira.

Pronto quando: saída do terminal é simulação explícita e falha de exportação nunca muda a carteira ou é anunciada como sucesso.

### T11 — Base visual e componentes

Dependências: T01. Cobre RF-17, RNF-14.

Status em 21/09/2026: **concluída**. Base visual React/CSS com tokens claro e
escuro, componentes semânticos e estados vazios honestos; controles que dependem
do motor permanecem desabilitados até T12. Red com 2 falhas por ausência dos
controles/regiões; Green observado. Inspeção real em Chromium a 360/768/1280 px
e tema escuro corrigiu a centralização da tabela mobile. `npm test` passou
(263 testes), integração (6 testes), typecheck, lint, build e e2e passaram.
Detalhes em `docs/BASE_VISUAL_T11.md`.

- [x] Definir tokens CSS de superfícies neutras, texto, bordas, verde de ação e âmbar de atenção; tema claro/escuro legível.
- [x] Criar campo monetário, botão, seletor, status, tabela e painel de detalhe, com semântica/foco/labels.
- [x] Reproduzir direção visual da prévia: cabeçalho, aviso, formulário, resumo, proposta, evidências, exclusões e pesos.
- [x] Inspecionar 360/768/1280 px; não depender de ícones, cores ou tooltip para informação essencial.

Pronto quando: base visual consistente sem infraestrutura de design system genérico. TDD para comportamentos; inspeção para CSS puramente visual.

### T12 — Fluxo no navegador

Dependências: T09, T11. Cobre RF-01/17/18, RNF-15.

Status em 21/09/2026: **concluída**. Fluxo conectado ao motor compartilhado,
sete estados, revisão de entrada e diagnóstico seguro. Red/Green observados;
270 testes, typecheck, lint, build e quatro e2e Chromium passaram.
Inspeção a 360/768/1280 px. Evidências em docs/FLUXO_WEB_T12.md.
Nesta etapa, o download permanecia indisponível, inclusive para resultados atuais; foi habilitado na T13.

- [x] Red: formulário inválido, seleção de cenário, atalhos, loading, resultado vazio e erro global.
- [x] Ligar formulário ao mesmo caso de uso do CLI; não implementar fórmula em componente.
- [x] Alteração de aporte/cenário marca proposta anterior desatualizada e desabilita exportação até nova análise.
- [x] Proteger identidade da entrada se execução for assíncrona; testar duas conclusões fora de ordem por promessas controladas, sem sleeps.
- [x] Aviso permanente de dados fictícios; carteira somente leitura.

Pronto quando: R$ 500/R$ 1.000 executam motor real sobre fixtures, e nenhuma resposta antiga substitui estado mais recente.

### T13 — Evidências, exclusões e pesos

Dependências: T12. Cobre RF-13/19/20.

Status em 22/09/2026: **concluída**. Red/Green observados; 275 testes,
typecheck, lint, build e cinco e2e Chromium passaram. Evidências em
`docs/DETALHES_WEB_T13.md`.

- [x] Red: selecionar ativo, detalhar regra, exibir ausência e motivos de exclusão, baixar a proposta exibida; texto HTML/script fictício permanece texto (S21).
- [x] Tabela de compras com ticker, preço simulado/limite, quantidade, custos e total; seleção atual acessível.
- [x] Detalhe com métricas, faixas, nota, confiança, teto e motivos; mostrar tanto aprovação parcial quanto bloqueios.
- [x] Mostrar pesos antes/depois/alvo com valores consistentes; esclarecer custos/reserva e não inventar evolução histórica.
- [x] Download JSON via browser; geração não significa confirmação de salvamento em disco.

Pronto quando: o usuário entende por que cada ativo recebeu ou não dinheiro e o efeito simulado; a tela não expõe stack, nomes internos de classes ou detalhes irrelevantes ao produto.

### T14 — Aceitação integrada

Dependências: T10, T13. Cobre todos os cenários, RNF-11/14.

Status em 22/09/2026: **concluída**. Evidências e limites em
`docs/VALIDACAO.md`.

- [x] Executar S01–S24; oráculos e invariantes independentes do código de produção.
- [x] Comparar decisões CLI/browser por centavos, quantidades, ids e reasonCodes, desconsiderando apenas metadados operacionais.
- [x] Testar teclado, validação, detalhes, download e resultado desatualizado no navegador.
- [x] Inspecionar tema/responsividade; verificar ausência de chamada a API externa durante simulação após recursos locais carregados.
- [x] Medir duração do núcleo em máquina descrita, após aquecimento; relatar maior tempo observado, não prometer SLA universal.
- [x] Executar typecheck, lint, testes e build; verificar S21–S24, ausência de segredos e erros sem sucesso falso. Corrigir falhas reais, sem ampliar infraestrutura para satisfazer teste artificial. Alertas relevantes de dependências disponíveis foram avaliados.

Pronto quando: evidências locais e limitações são registradas em `docs/VALIDACAO.md`; não afirmar API/mercado validados.

### T15 — Entrega reproduzível

Dependências: T14. Cobre RNF-07/10/12.

- [x] README: instalar, testar, executar CLI, abrir navegador e reproduzir cenários com comandos verificados; explicar recuperação por recálculo determinístico e reexportação, temporários que podem ser limpos e ausência de dados reais persistidos.
- [x] Documentar data fixa, carteira e valores fictícios, critérios fornecidos, convenções de custo/câmbio e bloqueio SCHD.
- [x] Documentar como adicionar fixture sem alterar algoritmo e pontos de extensão para API/registro futuro.
- [x] Instalar pelo lockfile e validar uma cópia isolada sem dependências/bundles anteriores; revisar arquivos de saída e segredos. A pasta `.git` fornecida não tem commits nem arquivos rastreados, então não foi possível testar clone Git publicado.
- [x] Atualizar status/checklists e revisar coerência entre TASK, grafo e AGENTS.

Status em 25/09/2026: **concluída**. A cópia isolada passou em `npm ci`,
`npm test` (313 testes em 20 arquivos, execução sequencial), typecheck, lint,
build web e build CLI. Os comandos de CLI para S01/R$ 500 e S02/R$ 1.000
retornaram código zero e os centavos documentados. Uma tentativa de suíte
concorrente com gates estáticos teve dois timeouts de 5 s; a repetição isolada
passou. `.nvmrc` fixa Node 22.11.0. Registro e limitação do checkout em
`docs/ENTREGA_T15.md`.

Pronto quando: terceiro consegue reproduzir o resultado e distingue claramente planejamento, teste, simulação e capacidades ainda inexistentes.

### Registro pós-entrega — interface V3 Premium

Status em 27/09/2026: **concluído** para a referência V3 disponível em
`docs/buyhold-wireframe-v3-premium.html`. O caminho
`docs/buyhold-v3-premium-reference.html` citado no pedido não existia no
workspace; os guias V3 apontam para o wireframe disponível. A refatoração
criou um presenter sobre o resultado validado, navegação responsiva, cartão de
decisão, páginas de carteira/estratégia, abas e detalhe modal. Domínio, caso de
uso, contratos e serialização financeira não foram alterados. O Red inicial
teve duas falhas comportamentais por navegação e estados V3 ausentes; o Green
passou após a implementação. `npm test` passou com 317 testes em 21 arquivos;
typecheck, lint, build e 10 testes Chromium passaram. Os testes visuais com
snapshots em 1440×1100 e 390×844 passaram. Evidência e decisão ARQ-01 em
`docs/REFATORACAO_V3.md`.

Em seguida, o frontend foi reorganizado por responsabilidade: `App.tsx` segue
como controlador; `app/AppShell.tsx` mantém a moldura; páginas e componentes
foram separados em `features/contribution`, `features/portfolio` e
`features/strategy`, cada componente com CSS próprio. Navegação, títulos, painéis
e estados vazios compartilhados ficam em `shared/`; tokens e estilos globais
ficam em `style/`. A aba selecionada permanece no controlador e somente a rota
ativa é montada, sem IDs duplicados. `npm test` (318), typecheck, lint, build e 10 testes
Chromium passaram depois da extração. Detalhes e ARQ-02 em
`docs/REFATORACAO_V3.md`.

## 7. Gates e evidências

Conforme TDD-02, antes de alterar código existente sem cobertura criar caracterização do que precisa ser preservado, que pode começar passando. Bug/comportamento novo exige Red próprio. Em refatoração pura usar testes existentes e completar lacunas relevantes, sem falha artificial.

TDD-04: documentação, visual sem lógica e artefatos gerados usam inspeção/build; configuração/declarativos usam validação proporcional. Experimento descartável pode explorar incerteza sem TDD, mas não entra no produto sem o fluxo de implementação e verificação. Ambiente bloqueado exige testes escritos e limitação explícita: não declarar Red/Green observados. TDD-05: não exigir relatório por teste, cobertura 100% ou bateria irrelevante após resolver os riscos.

Formato do registro por tarefa: status (pendente/em andamento/concluída/bloqueada), comportamento testado, comando real, Red observado quando aplicável, Green observado, arquivos alterados, limitações. Não há comandos executados neste documento: scripts serão criados em T01.

Definition of Done (manual §11): dependências concluídas; requisitos vinculados atendidos; testes relevantes passam; typecheck/lint/build afetados passam; inspeção visual quando aplicável; diff revisado; explicações concordam com decisões; nenhuma promessa fora do escopo; exceções/N/A corretamente identificados; dependências/configuração/recuperação tratadas quando afetadas. Falhas preexistentes ou cenário não executado ficam explícitos. Requisitos de segurança/integridade ativados não são adiados por ser MVP.

Meta final: preencher aporte e cenário, receber proposta confiável **sobre dados fictícios**, examinar o raciocínio e baixar seu snapshot. Não existe autorização para operar investimentos reais ou registrar recomendações como compras.
