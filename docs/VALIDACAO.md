# Validação integrada — T14

22/09/2026. Validação local sobre dados inteiramente fictícios, política v1.0,
fixture `synthetic-1.0` e Node 22.11.0/npm 10.9.0. Nenhuma API de mercado,
ordem ou posição real foi consultada ou alterada.

## Decisões e fronteiras

`tests/acceptance/scenarios.test.ts` executou S01–S24. Os resultados foram
comparados com valores e expectativas escritos a partir de TASK §5 e
`fixtures/expectations.ts`, sem gerar oráculos a partir da saída do motor:

| Cenários | Evidência observada |
|---|---|
| S01–S02 | R$ 500: ABEV3×1, BBSE3×1, IVVB11×2; principal 22.500 centavos, reserva 41, saldo 27.459. R$ 1.000: ABEV3×2, BBSE3×2, IVVB11×5, KNCR11×1, XPML11×1; saldo 36.864. |
| S03–S05 | Nenhuma compra; saldo integral, com preço/inelegibilidade explícitos. |
| S06–S11 | Ausência local, cotação global ausente, limite excedido, nota racional 280/3, múltiplo negativo sem nota e vencimento tiveram os estados/motivos esperados. S07 falhou globalmente sem proposta. |
| S12–S16 | USD suportado convertido a 5,125 com custos; posição condicional nova bloqueada e débito condicional limitado; classe FII sem compra; ordem invertida preservou decisão; SCHD permaneceu valorado em 5.000 centavos e sem compra. |
| S17–S20 | Paridade de decisão, invalidação de execução antiga, versão inválida sem proposta e reexecução idêntica. |
| S21–S24 | Script fictício renderizado como texto; limites monetários/JSON/tamanho rejeitados; publicação concorrente não sobrescreveu nem deixou arquivo parcial; falha real de publicação produziu código, etapa, versões e decisão sem stack ou caminho privado. |

Para cada proposta válida, a aceitação conferiu orçamento em centavos,
principal/reserva/custos agregados a partir das linhas, unidades inteiras,
teto de preço, limite individual após compras, até cinco linhas, motivos iguais
aos códigos e alocações antes/depois/alvo para ativo, classe e caixa. Snapshot
original e identidade SHA-256 foram verificados. S18 usa as promessas
controladas de `tests/web/flow.test.tsx`; S22 também usa os limites negativos de
`tests/domain/json.test.ts` e `tests/domain/input.test.ts`; S23 usa filesystem
real em `tests/integration/file-export.test.ts`.

No Chromium, o JSON baixado foi comparado integralmente com a saída da função
de CLI para S01 com R$ 500 e R$ 1.000, S05, S06 e S08. A igualdade inclui
centavos, quantidades, `decisionId`, `reasonCodes`, snapshots e demais campos;
nenhum metadado operacional precisou ser excluído. Os testes de navegador
também cobriram Enter para validar e analisar, seleção e expansão de evidência
por teclado, download da proposta atual e bloqueio após edição. Depois do
carregamento dos recursos locais, a simulação não fez requisições externas nem
chamadas a `/api/`. Foram inspecionadas capturas claras em 360/768/1280 px e
escuras em 360/1280 px; não houve overflow horizontal geral. A tabela de pesos
tem rolagem horizontal própria em telas estreitas.

## Desempenho e gates

`tests/acceptance/performance.test.ts` mediu o caso de uso de nove ativos com
`performance.now()`, após 10 aquecimentos e em 40 execuções sequenciais. O
maior tempo observado na execução isolada foi **15,14 ms**. Entrada já validada;
o tempo exclui inicialização e I/O e inclui cálculo e geração da identidade.
Máquina: Ubuntu 24.04 virtualizado, Intel Core i3-1005G1, dois núcleos/quatro
CPUs lógicas, 3.798 MiB de RAM. O valor é observação local, não SLA universal.

- `npm test`: 301 testes em 20 arquivos passaram.
- `npm run typecheck`, `npm run lint`, `npm run build` e `npm run build:cli`: passaram.
- `npm run test:e2e`: 9 testes Chromium passaram. O contêiner precisou das três
  bibliotecas do Chromium extraídas em `/tmp`, conforme `docs/DEPENDENCIAS.md`.
- CLI compilado executado com S01/R$ 500: código zero e saída fictícia coerente.
- `npm audit --audit-level=low`: zero vulnerabilidades. Nenhuma dependência foi
  alterada nesta tarefa.
- Busca por padrões de credenciais, URL/chamada de rede, `eval` e HTML bruto em
  `src/` e `fixtures/`: nenhuma ocorrência. Erros S19/S22/S24 não anunciaram
  sucesso financeiro nem exibiram stack ou dados de carteira completos.

Os testes de aceitação adicionaram verificação sem modificar regras de negócio.
Duas asserções iniciais foram corrigidas para respeitar a política: em S10 um
múltiplo inválido fica sem nota, mas outras evidências podem classificar preço;
em S13 uma posição nova condicional passa a observação e recebe o motivo
`CONDITIONAL_NEW_POSITION`. A pasta fornecida não contém histórico Git
utilizável; os arquivos alterados foram revisados diretamente.

## Limites

O navegador confirma apenas o início do download; o usuário precisa verificar
o arquivo salvo. O teste de navegador leu o arquivo entregue ao ambiente de
teste, sem afirmar durabilidade diante de falha de energia. Os resultados
validam fixtures locais e as fronteiras implementadas. Não validam preços,
valuation, corretora, persistência financeira nem disponibilidade de serviços
externos.
