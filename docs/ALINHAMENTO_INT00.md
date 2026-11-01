# Alinhamento de escopo, documentos e arquitetura — INT-00

**Data:** 01/11/2026
**Status:** concluída
**Resultado:** inventário do MVP e das fronteiras da iniciativa INT; nenhuma integração ou persistência financeira foi implementada.

## 1. Fontes e precedência

| Fonte observada | Papel nesta iniciativa | Resultado da leitura |
|---|---|---|
| `ESCOPO_PRODUTO_MVP.md` §§7.1–7.2 | Requisitos do produto completo | Define gestão da carteira, integração de dados, proveniência, atualização e snapshots como evolução posterior ao MVP. |
| `TASK.md` e `GRAFO_DEPENDENCIAS.md` | Escopo, ordem, gates e aceite da iniciativa | INT-00–INT-13 são um plano; implementação de rede, persistência e operações depende dos gates e predecessores. |
| `docs/Politica_Decisao_Motor_Investimentos_v1.md` | Regras financeiras | Continua sendo a fonte normativa para critérios do motor; INT-00 não alterou seus parâmetros. |
| `docs/MANUAL_PADRAO_ENGENHARIA.md` e `docs/PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS.md` | Práticas de engenharia e perfis | Aplicação proporcional de ENG-02, DIST-01/02, P3 e P5; P1 só se a interface mudar; P4 não se aplica a pull REST sem eventos/webhooks. |
| `AGENTS.md` versionado no workspace | Regras registradas para o MVP | Arquivo v1.2, de 25/09/2026, limitado ao simulador fictício; declara P5 inativo e confirma a ausência de API, banco e serviços. |
| Instrução `AGENTS.md` v1.4 fornecida pelo usuário nesta sessão | Regras atuais para a execução | Prevalece sobre o arquivo v1.2 do workspace, conforme a precedência declarada pelo próprio usuário. Ativa P3/P5 para a iniciativa e preserva as fronteiras do MVP. |

Não foi encontrado documento independente de requisitos nem System Design atual. Os requisitos 7.1/7.2 estão em `ESCOPO_PRODUTO_MVP.md`; o estado arquitetural do MVP é comprovado pelo código, `README.md`, `docs/DECISOES.md`, `docs/VALIDACAO.md` e `docs/ENTREGA_T15.md`. A ausência de System Design foi registrada como lacuna documental, sem inventar uma arquitetura. A atualização editorial do `AGENTS.md` versionado fica como alinhamento documental futuro; durante esta iniciativa, a instrução v1.4 fornecida pelo usuário é a autoridade aplicável.

## 2. Estado real observado

| Área | Estado observado | Evidência principal |
|---|---|---|
| Runtime e stack | Node 22.11.0, npm 10.9.0, TypeScript 5.9.3, React 19.3.0, Vite 6.4.3, Vitest 4.1.11, Playwright 1.63.0 e ESLint 9.39.5; versões fixadas no manifesto/lockfile. | `.nvmrc`, `package.json`, `package-lock.json`; versões locais conferidas com `node --version` e `npm --version`. |
| Organização | Um projeto. `backend/src/domain` contém validação e regras puras; `application` coordena o caso de uso; `adapters` concentra fixtures, identidade, serialização e exportação; `cli` é uma interface Node local. `frontend/src/web` usa a mesma aplicação/domínio. | Árvore de `backend/src`, `backend/fixtures`, `frontend/src/web` e `tests/`. |
| Interfaces | CLI local e interface React/Vite. `npm run dev`, `demo` e `preview` usam `127.0.0.1`; o Vite serve a aplicação e não implementa API de negócio. | `package.json`, `vite.config.ts`, `frontend/src/web/App.tsx`, `backend/src/cli`. |
| Entrada atual | Cenários fictícios versionados em `backend/fixtures`; o parser valida snapshot, política, posições, caixa, cotações, métricas, exposições, rubricas, valuation, custos e FX antes da simulação. | `backend/fixtures/scenarios.ts`, `backend/src/domain/input.ts`, `observations.ts`, `fixture-json.ts`. |
| Persistência | Não há banco nem armazenamento durável de carteira, eventos ou recomendações. O estado da tela é transitório. A CLI publica JSON local; o navegador inicia download e não confirma gravação em disco. | `backend/src/adapters/file-export.ts`, `frontend/src/web/App.tsx`, `README.md`, busca no código por banco, armazenamento e rede. |
| Integrações e credenciais | Não há chamada HTTP, adaptador de provedor, chave de API ou processo servidor confiável para a UI. O diretório `backend/` não é serviço HTTP. | Busca no código de `fetch`, clientes HTTP, credenciais e tecnologias de banco; `AGENTS.md`, `README.md`. |
| Agendamento | Não há worker, fila ou scheduler. A aplicação não coleta dados quando fechada. | `package.json` e busca no código por scheduler/execução periódica. |
| Testes e comandos | `npm run` confirmou os scripts disponíveis: testes Vitest, integração, e2e, typecheck, lint, build web e build CLI. Não foram executados nesta tarefa documental. A evidência anterior de aceitação está em `docs/VALIDACAO.md` e `docs/ENTREGA_T15.md`. | `package.json`, `README.md` e documentação de T14/T15. |

## 3. Matriz de requisitos 7.1 e 7.2

### Dados consumidos pelo fluxo atual do motor

| Etapa | Dados consumidos | Saída usada pela etapa seguinte | Limite atual |
|---|---|---|---|
| Qualidade | `marketSnapshot.metrics` e rubricas qualitativas; regra/unidade/perfil; período, publicação, coleta, fonte e método. | Nota de qualidade, confiança, cobertura, frescor, consistência, evidências e códigos de motivo. | Observações são fixtures/input local; não há coleta nem política de conflito entre provedores. |
| Valuation | Cotação e moeda; cenários de valuation fornecidos (conservador/base/favorável); métricas; resultado da qualidade; perfil, regras e limites da política. | Nota de preço, margem de segurança, teto, estado de valuation e evidências. | Cenários são fornecidos por fixture, não calculados a partir de demonstrações obtidas externamente. |
| Elegibilidade | Qualidade/confiança, valuation/teto, perfil, regra versionada e `previousEligibility` quando presente; métricas de execução para ETF amplo. | Estado full/conditional/hold/watch/review-exit, bloqueios, restrições e códigos de motivo. | Não há histórico real de estados ou ciclo de revisão persistente. O bloqueio de compra de SCHD permanece explícito. |
| Carteira e alocação | Posições simuladas e quantidades; caixa liberado/reinvestível; aporte; cotação, FX, custos; alvos e limites por classe/ativo; exposição setorial e de grupo. | Valor e pesos antes/depois/alvo, déficit/capacidade, prioridade, linhas inteiras, custos reservados e saldo. | É projeção para a simulação atual; não representa saldo ou exposição reais nem inclui custo de aquisição histórico. |
| Justificativa e saída | Evidências, avaliações, decisões e códigos de motivo produzidos pelo mesmo caso de uso. | Explicações, compras, exclusões, snapshot, `decisionId` e avisos serializados para CLI/UI. | Explicações não são cálculo independente; exportar ou baixar a proposta não confirma uma operação. |

| Requisito | Consumidor atual e dados usados | Estado e lacuna para a iniciativa |
|---|---|---|
| 7.1 — posição inicial, quantidade, classe, perfil e moeda | `parseSimulationInput` valida posições por ticker, moeda, classe, perfil, quantidade inteira e peso-alvo. `analyzePortfolio` combina quantidade com cotação e FX. | Só existe posição de simulação fornecida por fixture/input. Não há preço de aquisição, posição de abertura persistida nem livro-razão real. Modelo/registro manual estão em INT-02/03/04/06. |
| 7.1 — caixa, aporte e reinvestimento | Entrada contém caixa e valores liberados/reinvestíveis; `allocateContribution` distribui aporte e saldo usando custos e FX explícitos. | Valores pertencem ao cenário, não a um saldo persistente. Sem eventos de aporte, retirada, compra ou provento. Semântica contábil fica em INT-03; persistência em INT-04. |
| 7.1 — compras, vendas, proventos e custos realizados | Nenhum consumidor de eventos realizados existe no domínio atual. A saída descreve compras propostas, custos estimados e quantidades simuladas. | Recomendação não é execução. Eventos aceitos, correções/estornos e registro manual são futuros; INT-06 depende de INT-02/03/04. Importação externa é condicional em INT-11. |
| 7.1 — valor, pesos, exposição e limites | `portfolio.ts` calcula valor simulado, pesos, déficits e capacidades; `allocation.ts` revalida custos, exposição setorial/grupo e limites após as compras propostas. | Não calcula custo gerencial, retorno realizado/não realizado ou renda recebida a partir de eventos reais. Look-through real depende de composição e proveniência aprovadas. INT-03/08 definem semântica e projeções. |
| 7.1 — proposta, confirmação e histórico | `simulateContribution` gera `decisionId`, snapshot de entrada, avaliações, compras, exclusões, alocações e avisos. UI/CLI exibem ou exportam a saída. | Snapshot é reproduzível no resultado/exportação, mas não é guardado como histórico durável; não há fluxo que confirme execução ou atualize posição. Gates de persistência e registro: INT-04/06/09/10. |
| 7.2 — cotação, FX, demonstrações, indicadores e documentos | O motor recebe cotações, câmbio, métricas e evidências previamente montadas em fixtures. | Nenhum provedor ou documento oficial é consultado. Fontes candidatas de `docs/DECISAO_FONTES_DADOS.md` não estão homologadas; INT-01 decide cobertura, semântica, acesso, custo, licença e retenção por ativo/campo. |
| 7.2 — unidade, período, origem e atualidade | Observações atuais carregam fonte, período, publicação, coleta, método e ajustes; cotação tem fonte e data. `evaluateQuality` calcula cobertura, confiança, frescor e consistência. | A validação/refinamento de contratos canônicos para integração real depende de INT-02/03. Os campos atuais foram desenhados para fixtures e não provam cobertura ou identidade de provedor. |
| 7.2 — ausência, vencimento, conflito e revisão | Parser e motor reconhecem ausências/invalidade e dados vencidos; o resultado explicita evidências e motivos. | Ainda não existe ciclo de coleta, comparação entre provedores, detecção de revisão ou recuperação. Semântica e política ficam em INT-03; adaptadores em INT-05; atualização sob demanda em INT-07. |
| 7.2 — snapshot histórico da recomendação | Resultado inclui snapshot original, versões e identidade determinística da decisão. | Não existe armazenamento histórico. Snapshots de decisões futuras devem permanecer imutáveis e legíveis após nova coleta/regra; INT-04/09 definem persistência e reprodução. |

## 4. Fonte de verdade e fronteiras

| Estado | Fonte de verdade observada ou planejada | Quem pode alterá-lo |
|---|---|---|
| Simulação MVP | Input validado e snapshot original da fixture/cenário; política versionada. | Nenhuma mutação de posição; editar input cria outra simulação. |
| Posição/carteira real futura | Posição de abertura e eventos efetivamente executados, depois de confirmados. Valores, custo, caixa, exposições e retorno serão projeções reconstruíveis, não campos independentes editáveis. | Fluxo manual autorizado em INT-06; importação só após staging/conciliação/aceite em INT-11. Persistência e correções dependem de INT-04/03. |
| Dados de mercado futuros | Observações normalizadas de fonte aprovada por campo, com identidade, semântica, unidade/moeda, período, timestamps e proveniência. | Adaptadores de INT-05/07; revisão gera nova observação, sem sobrescrever snapshot histórico. Fonte permanece pendente de INT-01. |
| Recomendação | Resultado determinístico associado ao snapshot de inputs, política e versão do motor. | Gerar proposta não registra operação nem altera carteira. Persistência futura depende de INT-04/09. |

O motor continua sem I/O; UI/CLI → aplicação → domínio; adaptadores fazem leitura/exportação. Hoje não existe processo servidor conectado ao navegador. Qualquer chave futura deve ficar em processo confiável fora do bundle/browser. A escolha de fronteira local/servidor e configuração segura fica explicitamente para o **Gate D**, antes de INT-05; nenhuma chave ou solução de backend foi presumida.

## 5. Atualização, lacunas e gates

- “Atualização automática” significa buscar, ao iniciar uma análise/recomendação solicitada pelo usuário, campos ausentes ou vencidos que a fonte e a política permitirem atualizar. Isso exige um processo ativo. Não promete coleta com a aplicação fechada e não implica scheduler permanente.
- A posição só muda por registro explícito de operação real confirmada; atualizar dados de mercado ou recalcular a tela não atualiza carteira.
- Fontes por ativo/campo, planos, semântica, termos e direitos de uso/armazenamento: pendentes de INT-01/Gate A. IVVB11 segue sem rota aprovada; as fontes candidatas para Brasil, SCHD e FX são apenas hipóteses registradas em `docs/DECISAO_FONTES_DADOS.md`.
- Identidade estável, schemas de runtime e campos canônicos: INT-02; a semântica e compatibilidade são avaliadas no Gate B após INT-02/03. Ticker sozinho não será identidade estável.
- Custo gerencial, renda, retorno, câmbio, frescor, conflitos, correções e look-through: decisões financeiras ainda sem método aprovado; responsável decisório é o usuário/proprietário do produto, com proposta/evidência preparada nas INT-02/03. Não usar esses valores em recomendação real antes da decisão.
- Persistência, retenção, migração/backup, concorrência e recuperação do livro-razão e snapshots: INT-04, após contratos/semânticas. A fonte pretendida é append-only; tecnologia e garantias permanecem abertas.
- Importação de operações de corretora: sem fonte comprovada ou credenciais; não habilitada até INT-01/Gate F. O fluxo manual de INT-06 permanece o caminho previsto.
- Requisito de API/serviço externo confiável para credenciais não existe no MVP. A decisão mínima e o dono do segredo são Gate D; não implementar endpoint ou servidor independente nesta fase.
- A divergência do `AGENTS.md` local (v1.2/MVP) com a instrução v1.4 fornecida pelo usuário foi resolvida pela precedência explícita da instrução atual. A sincronização do arquivo/índice documental pode ocorrer em INT-13, se as regras ou decisões operacionais mudarem.
- Os documentos não nomeiam responsáveis individuais. Aprovações de fontes/licenças (INT-01/Gate A), identidade e semântica de dados (INT-02/03/Gate B), persistência/recuperação e retenção (INT-04/Gate C) e fronteira de credenciais (Gate D) ficam com o usuário/proprietário do produto; a execução técnica permanece na tarefa INT correspondente.

## 6. Verificação e limite

- Conferidos árvore, `AGENTS.md`, `TASK.md`, `GRAFO_DEPENDENCIAS.md`, `ESCOPO_PRODUTO_MVP.md`, política financeira, Manual, Perfis, planos anteriores e módulos de entrada, domínio, aplicação, adaptadores, CLI e UI.
- Confirmados Node `v22.11.0`, npm `10.9.0` e scripts declarados pelo `package.json`; nenhum caminho/comando foi inferido como existente sem inspeção.
- Busca no código de chamadas HTTP, persistência de carteira, banco e scheduler não encontrou essas integrações; a escrita local existente é exportação de JSON.
- Dispensa TDD-04: entrega exclusivamente documental. Não foram executados testes, typecheck, lint ou build; nenhuma lógica ou regra financeira foi alterada.
