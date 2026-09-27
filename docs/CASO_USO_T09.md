# Caso de uso e proposta explicável — T09

Data: 20/09/2026. Política fornecida v1.0; dados de teste inteiramente
fictícios. O resultado é uma proposta de simulação e nunca executa ou registra
compras.

## Composição compartilhada

`backend/src/application/simulation.ts` expõe `simulateContribution`, usado igualmente
por futuros adaptadores de terminal e navegador. O caso de uso recebe:

- `ValidatedInput`, com data, política, carteira e snapshot explícitos;
- uma função injetada para criar o identificador da decisão.

A função compõe qualidade, confiança, valuation, elegibilidade, pesos,
capacidade e alocação. Não lê arquivo, rede, relógio ou estado global, não escreve
logs e não modifica a carteira. O único efeito injetado é o hash da identidade.

O `SimulationResult` congelado contém `simulation: true`, `decisionId`, snapshot
original completo, avaliações/evidências, compras, exclusões, alocações antes,
depois e alvo, principal, reserva, custos, saldo e avisos. Valores monetários
continuam em `bigint`; a serialização externa como string decimal pertence à
fronteira JSON.

## Identidade canônica

`canonicalDecisionPayload` inclui o snapshot bruto completo e a versão
`engineVersion: 1.0`. Problemas derivados conservam-se no resultado, mas seus
caminhos com índices não contaminam a identidade. Chaves de objetos são ordenadas e coleções que são
conjuntos são normalizadas por identificador estável e conteúdo. Ordem acidental
de posições, métricas, cotações, exposições ou regras não altera a identidade.
Aporte, custos, câmbio, reserva, versões ou qualquer evidência relevante alteram
o payload.

`backend/src/adapters/decision-id.ts` usa SHA-256 da Web Crypto, disponível nos runtimes
alvo Node 22 e navegador. O identificador tem formato `sha256:<64 hex>`. Não foi
criado algoritmo criptográfico próprio; o id não é credencial nem prova contra
adulteração. Mudança semântica do motor exige atualizar `engineVersion`.

Duração é `ExecutionMetrics`, fora de `SimulationResult` e do payload canônico.
Falhas usam `diagnose`: código, etapa, cenário e versões, com `decisionId` quando
já existe, sem stack trace ou dump da carteira.

## Explicações derivadas

O alocador agora devolve uma decisão por ativo. Assim, a aplicação distingue sem
adivinhar:

- ativo comprado após elegibilidade, prioridade e conversão inteira;
- unidade que excede capacidade ou orçamento da classe;
- candidato que perdeu vaga pelo limite global;
- bloqueio por teto, dados, exposição, condicional ou perfil sem suporte;
- ausência de unidade viável após revalidar custos e concentrações.

Cada compra e exclusão preserva `reasonCodes` e recebe mensagem e gatilho de
revisão determinísticos. Os textos dependem dos códigos/evidências e, quando
aplicável, incluem ticker, quantidade, preço, teto e débito reservado. Não há
justificativa fixa para forçar uma saída. Evidências mantêm valor observado,
unidade, âncoras, score racional, aplicabilidade, fonte, período e código.

Ausência local, como dado crítico de ITUB4 em S06, bloqueia o ativo e permite
proposta para os demais. Falha global de valoração, como S07, continua sendo
rejeitada na validação e não produz proposta. Um cálculo válido sem compras é
sucesso e retorna saldo integral com explicações.

## Segurança e limites

O snapshot mantém texto não confiável como dado; S21 preserva a string de script
sem execução. O caso de uso não renderiza HTML, monta comandos ou registra o
snapshot. Os avisos deixam explícitos dados fictícios, simulação, saldo não usado
e renda ainda não modelada. SCHD aparece na avaliação e alocação da carteira,
mas sua exclusão conserva `UNSUPPORTED_PURCHASE_PROFILE`.

## Evidência TDD e gates

O Red focal apresentou 8/8 falhas por `T09_NOT_IMPLEMENTED`, sem falha de import,
sintaxe ou ambiente. O Green cobre proposta completa, SHA-256, reexecução,
permutação de coleções, mudança de inputs, compras/exclusões explicadas, ausência
local versus erro global, resultado vazio, imutabilidade, ausência de logging e
conteúdo HTML tratado como texto.

Na revisão, um teste de regressão demonstrou que incluir caminhos derivados com
índices no hash fazia duas coleções semanticamente iguais produzirem ids
diferentes. O payload foi corrigido para usar o snapshot canônico; os problemas
locais continuam no resultado, fora da identidade.

Verificações finais executadas com sucesso:

- `npm test`: 248 testes em treze arquivos;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`.

Não houve nova dependência ou mudança visual. Teste e2e e inspeção visual são
N/A para esta tarefa.
