# Qualidade e confiança — T05

Data: 20/09/2026. Política fornecida v1.0; catálogo v1.0; dados de teste
inteiramente fictícios. Esta etapa calcula qualidade e confiança, mas ainda não
decide preço, teto ou elegibilidade, que pertencem à T06.

## Contrato implementado

`src/domain/quality.ts` avalia cada posição do snapshot validado sem I/O, relógio
global ou mutação. O resultado contém Q e C como frações `bigint` exatas,
cobertura em pontos-base, notas por bloco, evidências individuais, códigos de
motivo e a indicação de suficiência dos dados para a etapa seguinte.

Cada evidência preserva regra, bloco, unidade, âncoras, valor, período, fonte,
notas das observações atual/histórica, aplicabilidade e os quatro componentes
de confiança: cobertura, atualidade, rastreabilidade e consistência. Assim, Q e
C podem ser reconstruídos sem recorrer a texto inventado ou a uma nota pronta
da fixture.

## Regras de cálculo

- Métricas de qualidade combinam 70% da mediana histórica e 30% da posição
  atual. Métricas de risco usam a pior nota entre histórico e atual.
- Histórico obrigatório com menos de três períodos recebe nota neutra 50,
  reduz cobertura e limita o ativo à observação. Métrica aplicável ausente
  também permanece no denominador com 50; zero continua sendo valor observado.
- Q usa os pesos do catálogo por perfil e expõe os blocos previstos para ações,
  bancos, FIIs e ETF amplo. Rubricas usam somente 0/25/50/75/100 documentado.
- C aplica 40% cobertura, 25% atualidade, 20% rastreabilidade e 15%
  consistência, ponderados pelos indicadores aplicáveis. Cobertura abaixo de
  80%, C abaixo de 80, histórico insuficiente, dado crítico ausente, dado
  vencido ou conflito não resolvido impedem aprovação dos dados do ativo.
- Observações comparáveis da mesma base são marcadas como
  `UNRESOLVED_CONFLICT` quando divergem mais de 5% em grandeza positiva ou mais
  de 1 pp em taxas; a seleção e as evidências são ordenadas por chaves explícitas,
  sem depender da ordem do input.
- Holding combina 80% do Q ponderado pelo valor das investidas e 20% de
  governança/solidez própria. Valor não identificado reduz cobertura econômica;
  abaixo de 80% gera `INSUFFICIENT_HOLDING_COVERAGE`. Os valores das investidas
  não são somados ao patrimônio da carteira; valor identificado zero resulta
  em cobertura ausente, sem divisão por zero ou sucesso falso.
- O perfil de dividendos de SCHD continua sem cálculo de compra e retorna
`UNSUPPORTED_PURCHASE_PROFILE`. Isso não interfere na sua futura valoração
  como posição existente.

Ausência não crítica pode coexistir com dados suficientes quando cobertura e C
continuam nos mínimos da política; o motivo permanece visível. Falhas locais de
um ativo não removem avaliações válidas dos demais.

## Evidência TDD e gates

O primeiro Red usou um contrato compilável que retornava lista vazia: os sete
testes falharam por ausência do comportamento, não por import, sintaxe ou
ambiente. Cobriu composição temporal, pior risco, blocos dos perfis, zero versus
ausência, rubrica sem evidência, cobertura/confiança, holding e perfil sem
suporte. Um Red posterior demonstrou que observações atuais ambíguas eram
tratadas como consistentes; o Green passou a marcá-las e ordená-las
deterministicamente. O oráculo de S13 confirma Q=72 sem ser gerado pelo motor.

Verificações finais executadas com sucesso:

- `npm test`: 192 testes em nove arquivos;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`.

Não houve dependência, configuração ou alteração visual. Teste e2e e inspeção
visual são N/A nesta tarefa. Preço, valuation, estados de elegibilidade e
alocação permanecem pendentes nas T06–T08; nenhuma proposta de compra é emitida.
