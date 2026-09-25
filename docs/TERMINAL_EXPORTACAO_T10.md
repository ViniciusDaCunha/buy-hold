# Terminal e exportação JSON — T10

Data: 21/09/2026. Política fornecida v1.0; dados inteiramente fictícios. A saída
é uma proposta de simulação e nunca executa, registra ou persiste compras.

## Contrato da CLI

`npm run cli -- --aporte <pt-BR>` compila o bundle Node 22 e executa o mesmo caso
de uso de T09. `--cenario` seleciona S01–S24 e usa S01 quando omitido; `--data`
substitui a data civil fixa da análise. `--exportar` recebe um caminho local
explícito. Nenhum valor de fixture vira comando shell.

A saída humana traz aviso de simulação, decisionId, tabela de compras, principal,
reserva de preço, custos, saldo e motivos derivados do resultado. `--json` emite
o `SimulationResult` completo e serializa todo `bigint` como string decimal.
Erros saem em stderr no formato de diagnóstico de T09, com código, etapa,
cenário e versões; exportação inclui decisionId. Não há stack ou dump da carteira.

Códigos de processo:

- `0`: cálculo válido, inclusive quando não há compra;
- `1`: argumento, fixture, cálculo ou exportação falhou; nenhuma proposta é
  anunciada como exportada.

## Exemplos executados

Em Node 22.11.0 e npm 10.9.0, foram executados em 21/09/2026:

```sh
npm run cli -- --aporte 500 --cenario S01
npm run cli -- --aporte 1.000,00 --cenario S02 --json
```

S01 produziu três linhas (ABEV3 1, BBSE3 1 e IVVB11 2), principal de
R$ 225,00, reserva de R$ 0,41, custo zero e saldo de R$ 274,59. S02 produziu
JSON completo com principal de 63.000 centavos, reserva de 136 centavos, custo
zero e saldo de 36.864 centavos. Ambos exibiram `simulation: true`/aviso
equivalente e identificadores SHA-256.

## Publicação e recuperação

`publishJsonExclusive` cria um temporário exclusivo no diretório de destino,
grava o documento inteiro, sincroniza o conteúdo, cria um hard link para o nome
final e remove o temporário. Criar o link é atômico no filesystem local e falha
com `EEXIST` se outro processo ou arquivo já ocupar o destino; não existe etapa
“consultar e depois renomear sobrescrevendo”. Como temporário e destino ficam no
mesmo diretório, não há travessia entre filesystems.

O teste S23 usa filesystem real. Duas publicações concorrentes tiveram exatamente
um vencedor; o conteúdo final correspondeu integralmente a um dos escritores.
Uma segunda publicação contra arquivo existente falhou, preservou os bytes
anteriores e não deixou temporário. Na CLI, essa falha retornou status 1, incluiu
`EXPORT_DESTINATION_EXISTS`, etapa `exportacao` e decisionId, indicou escolher
outro caminho e não imprimiu confirmação de exportação.

O resultado serializado é independente da publicação e pode ser reenviado ao
adaptador com outro destino sem recalcular nem alterar a carteira. Na CLI não
interativa, escolha um caminho novo e execute novamente; a decisão permanece
determinística para o mesmo snapshot. Não remover ou substituir automaticamente
o arquivo anterior é uma escolha deliberada de recuperação segura.

O mecanismo exige suporte local a hard links. Falta de suporte/permissão produz
falha operacional explícita. `fsync` cobre o conteúdo antes da publicação, mas o
diretório não é sincronizado; portanto não há promessa de durabilidade do nome
final contra perda de energia. Essa garantia deve ser revista se o filesystem ou
o requisito de durabilidade mudar. Nenhuma dependência nova foi adicionada.

## Evidência TDD e gates

O Red focal apresentou 13/13 falhas por `T10_NOT_IMPLEMENTED`, sem erro de import,
sintaxe ou ambiente. O Green cobriu argumentos inválidos, cenário inexistente,
formato humano, cálculo vazio bem-sucedido, JSON completo, diagnóstico seguro,
publicação exclusiva, concorrência, falha intermediária e limpeza. O primeiro
build do executável revelou alvo web incompatível com top-level await; configurar
o bundle para Node 22 corrigiu a infraestrutura e o build foi repetido.

Verificações finais: `npm test` (261 testes em 15 arquivos),
`npm run test:integration` (4 testes), `npm run typecheck`, `npm run lint`,
`npm run build` e `npm run build:cli`, todos concluídos com sucesso.
