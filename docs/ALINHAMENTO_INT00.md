# Alinhamento de escopo, documentos e arquitetura — INT-00

Data: 31/10/2026
Status: concluída; decisões de implementação dependentes de INT-01–04 permanecem abertas conforme os gates registrados abaixo.

## Fontes e limites consultados

- `ESCOPO_PRODUTO_MVP.md` v1.0: visão, requisitos 7.1/7.2, fronteira do MVP, arquitetura atual do MVP e evolução.
- `TASK.md` e `GRAFO_DEPENDENCIAS.md` v1.1 na inspeção inicial, alinhados para v1.2 nesta tarefa: plano proposto para a iniciativa de integração e dependências INT-00–13.
- `AGENTS.md` v1.2 na inspeção inicial (atualizado para v1.3 nesta tarefa), `README.md`, `package.json`, configuração Vite/Playwright, código, fixtures, testes e evidências em `docs/`.
- `docs/DECISOES.md`: nota ARQ anterior escolhe um núcleo TypeScript compartilhado e adia uma nova fronteira remota/persistente até haver gatilho concreto.
- `docs/Politica_Decisao_Motor_Investimentos_v1.md`, `docs/MANUAL_PADRAO_ENGENHARIA.md` e `docs/PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS.md`; aplicam-se especialmente ENG-01/02, ARQ-01/02, SEG-02/03, DAD-01–05, OPS-01, DIST-01–04/07–10 e P3/P5.
- O plano anterior T00–T15 foi consultado na revisão-base `67fc600`; evidências de entrega e da interface V3 permanecem em `docs/ENTREGA_T15.md`, `docs/VALIDACAO.md` e `docs/REFATORACAO_V3.md`.

Não há arquivo independente de requisitos detalhados nem System Design vigente no repositório. O escopo de produto e o plano novo contêm os requisitos de alto nível; o código e o histórico do MVP descrevem a implementação observada. Nenhuma decisão de integração ou persistência foi inferida desses documentos ausentes.

## Estado observado do projeto

- Aplicação TypeScript em um repositório: React 19.3.0/Vite 6.4.3 na interface e módulos locais em `backend/src/` para domínio, caso de uso, adaptadores de fixture, exportação JSON e CLI. Não há serviço de aplicação HTTP.
- Ambiente declarado: Node `22.11.0`, npm `10.9.0`; observados nesta execução `v22.11.0` e `10.9.0`. `package.json` declara TypeScript 5.9.3, Vitest 4.1.11, Playwright 1.63.0 e versões fixas no lockfile.
- Scripts existentes em `package.json`: `npm ci`, `npm test`, `npm run test:focused`, `npm run test:integration`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build:cli`, `npm run cli`, `npm run dev`, `npm run demo` e `npm run preview`. Vite limita dev/preview a `127.0.0.1`. Esta tarefa confirmou os nomes no manifesto; não executou a bateria de testes/build.
- A interface em `frontend/src/web/App.tsx` constrói um cenário fictício, valida-o e importa diretamente o caso de uso e os módulos locais para executar no navegador. A CLI em `backend/src/cli/cli.ts` também monta fixtures, valida e chama o mesmo caso de uso no processo Node.
- A decisão arquitetural anterior em `docs/DECISOES.md` continua válida para o MVP: um núcleo compartilhado com adaptadores finos, sem serviço remoto. A nova fase pode estender o monólito se uma fronteira confiável atender ao segredo do provedor e à persistência; isso não implica microserviço.
- `backend/src/domain/` contém cálculos puros, sem I/O. A busca no código não encontrou chamadas a APIs, adaptadores HTTP, configuração de credencial externa, armazenamento de carteira, banco de dados, job ou scheduler. Os artefatos de build observados são bundles web/CLI; a exportação existente grava JSON da proposta, não posições nem histórico de operações.
- A carteira atual existe apenas como entrada fictícia em memória. Recarregar a aplicação recompõe a fixture. Não há fonte durável de verdade para posições reais ou eventos executados.

## Requisitos 7.1/7.2: consumidor atual e lacunas

| Requisito | Consumidor atual | Estado e lacuna para a nova fase |
|---|---|---|
| 7.1 — posição, ativo, moeda, quantidade, metas e caixa | `backend/src/domain/input.ts` valida `portfolio.positions` (`ticker`, `currency`, `classId`, `profileId`, `quantity`, `targetBps`) e caixa; `backend/src/domain/portfolio.ts` calcula patrimônio, pesos, déficits e capacidade. | Só há snapshot fictício entregue pela fixture. Não existe cadastro persistente nem ledger. |
| 7.1 — operações executadas e renda recebida | Nenhum consumidor de eventos financeiros; o orçamento da simulação aceita aporte e caixas já disponíveis na entrada. | Aporte registrado, compra/venda, custo, retirada, provento recebido/anunciado, estorno e ação corporativa ainda não são eventos do domínio. |
| 7.1 — custo, resultado e exposição | `portfolio.ts`, `backend/src/domain/allocation.ts` e `backend/src/domain/holdings.ts` calculam pesos/exposições para a simulação; `backend/src/domain/money.ts` trata centavos, custos estimados e câmbio. | Não há custo de aquisição da carteira, retorno realizado/não realizado ou renda real. Exposições e look-through são sintéticos. Custo da simulação não é custo gerencial ou fiscal. |
| 7.2 — preços e câmbio | `backend/src/domain/observations.ts` valida cotações (`priceCents`, moeda, `asOf`, fonte); `input.ts` valida FX e `portfolio.ts` usa os valores para valoração. | Cotação e FX vêm de fixtures; nenhuma fonte externa ou atualização automática existe. |
| 7.2 — métricas, rubricas e valuation | `observations.ts` valida métrica com unidade, período, publicação/coleta, fonte, método e ajuste; rubrica qualitativa carrega razão e gatilho de revisão; valuation guarda cenários fornecidos. `quality.ts` e `valuation.ts` calculam notas, confiança, elegibilidade, preço-limite e evidências conforme `profiles.ts`/política. | Entradas são fictícias. Valuation fornecido não é estimado pelo motor. As regras atuais não definem autoridade entre fontes externas nem revisão histórica de fornecedor. |
| 7.2 — setor, grupo e look-through | `input.ts` valida exposições por ticker/setor/grupo; `portfolio.ts` aplica limites; `holdings.ts` calcula evidências agregadas da holding. | Exposições/look-through são sintéticos; não há catálogo externo de identidade, setor, grupo ou composição atualizada. |
| 7.2 — qualidade, conflitos e reprodução | `input.ts` diferencia campos ausentes e vencidos e sinaliza cobertura de exposição; `quality.ts` avalia cobertura, frescor, rastreabilidade e consistência. `backend/src/application/simulation.ts` retorna snapshot e `decisionId`; `backend/src/adapters/result-json.ts` serializa o resultado. | A validação é para um input de fixture e a consistência segue regras locais limitadas; não há estados persistidos para coleta, indisponibilidade de provedor, conflito multi-origem, revisão ou drift. O snapshot é retornado/exportado, não arquivado como histórico durável. |

Os dados atuais chegam por `backend/fixtures/scenarios.ts`; `backend/fixtures/expectations.ts` mantém expectativas de aceitação separadas. A interface e a CLI compartilham `simulateContribution`, mas hoje não compartilham um serviço de coleta ou armazenamento.

## Fronteiras e fonte de verdade pretendida

| Estado | Quem pode propor/escrever | Fonte de verdade pretendida | Estado observado |
|---|---|---|---|
| Posição de abertura e eventos de carteira | Usuário, por cadastro manual; qualquer importação futura entra pendente e exige conciliação/aceite explícito. | Posição de abertura mais eventos confirmados, append-only; estorno/retificação referencia o evento original. | Não existe hoje. INT-02/03 definem semântica; INT-04 escolhe mecanismo e INT-06 implementa registro. |
| Observação de mercado/fundamento | Adaptador de fonte aprovada, após validação e normalização; fornecedor não escreve posição. | Observações versionadas com proveniência e permissão de retenção; correção cria nova versão. | Não existe coleta externa. INT-01 valida fontes; INT-05/07 tratam integração e atualização. |
| Projeção de carteira e recomendação | Motor, a partir de entradas aceitas e snapshot explícito. | Valor, custo, exposição e resultado são projeções calculadas; recomendação preserva snapshot imutável e não altera o ledger. | Só há projeção da simulação fictícia, sem persistência. |
| Credencial do provedor | Processo confiável, fora do bundle React; privilégio mínimo. | Configuração segura no processo que executa o adaptador, sem token em UI, URL, fixture ou log. | Não há credencial nem processo de backend web. O CLI Node é local, mas a UI executa o motor e os imports de `backend/src` no navegador. Portanto a integração web não pode receber segredo até que o Gate D escolha uma fronteira confiável. |

O desenho de produto pretendido continua sendo uma aplicação pessoal, não multiusuário, sem envio de ordens. Atualização automática significa buscar dados ausentes/vencidos no fluxo de análise quando fonte e política permitirem; não significa coleta com o aplicativo fechado. Importação de operações permanece condicional ao Gate F. A tecnologia de persistência e qualquer mecanismo servidor/local confiável para a UI são decisões futuras, não fatos do repositório.

## Divergências, decisões e responsáveis/gates

| Tema | Alinhamento ou pendência | Responsável/gate |
|---|---|---|
| `AGENTS.md` ainda descrevia apenas o MVP, com P5/API/banco como inativos “nesta fase”. | Mantido como histórico do MVP; atualizado para distinguir a iniciativa INT e seus gates, sem autorizar integração antecipada. | INT-00; revisão do responsável do produto. |
| Um monólito TypeScript existente versus uso futuro da palavra `backend`. | `backend/src` é um módulo local usado pelo bundle web e pela CLI, não um serviço HTTP. Preservar um projeto/núcleo compartilhado; criar somente a menor fronteira confiável que o Gate D demonstrar necessária. | Responsável do produto/arquitetura; Gate D antes de INT-05. |
| O texto inicial do novo `TASK.md` dizia que `AGENTS.md` não confirmava stack/comandos. | Corrigido: stack e scripts estão no repositório e foram conferidos no `package.json`, `README.md`, configurações e runtime observado. | INT-00 concluída. |
| Nomes dos planos em referências internas não correspondiam aos arquivos atuais; os nomes `TASK.md` e `GRAFO_DEPENDENCIAS.md` agora designam a iniciativa INT. | Referências internas alinhadas. A versão anterior T00–T15 foi lida na revisão-base `67fc600`; evidências locais continuam em `docs/`. | INT-00 concluída. |
| Requisitos detalhados/System Design independentes não foram encontrados. | Para esta fase, usar `ESCOPO_PRODUTO_MVP.md` §§7.1/7.2 como requisito de produto e o plano INT como sequência proposta, sempre conferindo o código. Se houver artefato vigente adicional, o responsável do produto deve incorporá-lo antes de decisão incompatível. | Responsável do produto; reconfirmar antes de INT-02/04. |
| Segredo externo em fluxo web. | Lacuna arquitetural bloqueia integração que exponha token no browser. Escolher processo confiável mínimo ou restringir o fluxo real a processo que proteja a chave; não assumir API pública, serviço independente ou token no cliente. | Responsável do produto/arquitetura; Gate D, antes de INT-05. |
| Persistência e retenção. | Fonte lógica planejada é ledger de eventos aceitos e observações/snapshots imutáveis. Banco/arquivo, formato, retenção e backup não foram escolhidos. | INT-02/03 definem contratos e semântica; INT-04 decide tecnologia e Gate C valida licença antes de guardar payload. |
| Custo gerencial, venda parcial, renda, retorno, FX por data-base, ações corporativas, tolerância temporal e autoridade em conflito. | Não definidos pela implementação atual; sem valores ou fórmulas presumidos. | Responsável do produto; INT-02/03 e Gates B/E antes de cálculo/recomendação real. |
| Importação de operações. | Sem conector/fonte verificada no repositório; fluxo manual é o caminho inicial planejado. | INT-01 decide go/no-go independente; Gate F antes de INT-11. |

## Resultado e verificações

- MVP fictício e evolução INT ficaram explicitamente separados; nenhuma regra financeira, coleta ou mutação foi implementada nesta tarefa.
- Árvore, importações, manifestos, comandos, runtime, documentação e dependências foram inspecionados. Ausência de serviço/API/banco/scheduler foi verificada por busca no código e no manifesto.
- Comandos foram confirmados por definição em `package.json`, não executados. Nenhum teste automático foi necessário para este artefato documental.
- Próximos passos desbloqueados: INT-01 pode executar o spike de viabilidade; INT-02 depende também do resultado de INT-01. INT-05 permanece bloqueada pelo Gate D até decisão de fronteira confiável; INT-04 aguarda contratos/semânticas e decisão de retenção.
