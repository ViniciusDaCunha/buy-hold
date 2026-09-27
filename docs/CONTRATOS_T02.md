# Contratos e precisão — T02

Concluída em 15/09/2026. Contratos puros em `backend/src/domain/`; leitura de texto
JSON em `backend/src/adapters/fixture-json.ts`, sem filesystem. O caso de uso, a
identidade da proposta e a publicação de arquivos pertencem a T09/T10.

## Entrada e erros

`parseSimulationInput(unknown)` valida e retorna `{ input, snapshot, issues }`.
`input` é normalizado; `snapshot` preserva os dados JSON originais, inclusive
dados locais rejeitados. Ambos são cópias profundamente congeladas; o objeto do
chamador permanece intacto. Não há consulta de relógio, rede ou estado global.

O contrato exige schemaVersion e policyVersion `1.0`, versão da política interna
`1.0`, fixtureVersion e scenarioId identificáveis, analysisAsOf explícita,
aporteCents, portfolio, marketSnapshot, qualitativeAssessments,
providedValuations, policy, costs e fx (objeto ou null). FixtureVersion identifica
o conjunto de dados, não uma versão de schema; pode variar sem mudar o contrato.
Campos desconhecidos são rejeitados. O builder `tests/domain/input-fixture.ts`
é um exemplo mínimo executável, não uma fixture financeira de T03.

- Carteira: posições únicas por ticker, moeda BRL/USD, classe, perfil,
  quantidade inteira e meta em pontos-base (10000 = 100%). Caixa, liberação e
  reinvestimento são centavos BRL; as duas liberações juntas não excedem o caixa.
- Política: metas de classes mais caixa somam 100%; metas dos ativos somam a
  classe e respeitam limites individuais e exposições conhecidas. Regras têm
  unidade, direção H/L/B, âncoras ordenadas e peso. Configuração dos perfis e
  aplicação das regras continuam em T03–T08.
- Snapshot de mercado: último pregão fornecido, cotações positivas com moeda,
  data e origem, métricas e exposições por setor/grupo. Não há calendário real.
- Métricas: decimal assinado em texto ou null, unidade (BRL, USD, ratio, percent,
  pp, count ou days), período, publicação, coleta, origem, método e ajustes.
  Lucro negativo é preservado; sua interpretação em múltiplos pertence a T06.
- Rubricas: score null ou 0/25/50/75/100, motivo, gatilho de revisão e metadados.
- Valuations: cenários monetários ordenados, base positiva, moeda e metadados;
  proveniência obrigatória `provided_fixture`.

Datas civis usam YYYY-MM-DD, com calendário gregoriano validado. Período,
publicação, coleta e análise devem estar ordenados. Idade é diferença entre
datas explícitas em UTC. Idade igual ao limite ainda é válida; acima dele gera
`STALE_DATA`. Cotação deve corresponder ao último pregão fornecido.

`InputError` contém kind=`validation`, code, path e mensagem sem ecoar payload.
Aporte, carteira, configuração, duplicidade e preço/FX necessários para valorar
posição existente causam erro global. Dados inválidos/ausentes de candidatos
geram `issues` por ticker; ausência nunca se transforma em zero. Métricas e
rubricas faltantes devem ser cruzadas com as regras aplicáveis nas tarefas de
avaliação. `issues` vazio não constitui aprovação de compra. SCHD continua sem
perfil de compra suportado; sua valoração usa a moeda e o FX fornecidos.

`diagnose` distingue esses erros de falhas operacionais, preserva etapa,
cenário, versões e decisionId quando disponível, sem divulgar stack ou mensagem
interna. Falta de dados, invalidade e vencimento têm códigos distintos.

## Dinheiro, câmbio e custos

Dinheiro interno usa `bigint` em centavos da moeda identificada. No JSON são
strings inteiras canônicas não negativas; números JSON não são aceitos como
dinheiro. `serializeInput` converte explicitamente bigint em string;
`readFixtureJson` revalida e converte de volta. `serializeSnapshot` conserva a
entrada original para auditoria. O contrato tipado `SimulationResult`, incluindo
evidências, compras e alocações, está em `backend/src/domain/result.ts`; construção,
validação das invariantes da proposta e exportação completa cabem a T09/T10.

`parseBrl` recebe texto pt-BR: `500`, `500,5`, `1.234,56`; aceita espaços externos.
Vírgula é decimal, ponto apenas agrupamento de milhares. Rejeita sinal,
expoente, casas excedentes, zero e aporte acima de R$ 1.000.000,00. JSON usa
centavos (`"50000"`), não a notação do campo de interface.

Razões usam texto decimal com ponto e até oito casas; `decimalRatio` retorna
numerador/denominador bigint. FX significa BRL por USD e precisa ser positivo.
Taxas de custo/spread/reserva vão de zero a um. A reserva fornecida pela política
é 0,005 nos exemplos. Não há aritmética monetária em ponto flutuante.

`marketValue` calcula preço × quantidade × FX e arredonda half-up uma vez por
posição. `purchaseCost` recebe linhas agregadas únicas por ticker e calcula:

1. Limite reservado = mínimo entre preço × (1 + reserva) e teto, mantendo a
   precisão racional até calcular o débito agregado.
2. Principal em BRL = ceil(preço × quantidade × FX).
3. Débito reservado em BRL = ceil(limite × quantidade × FX).
4. Reserva = débito reservado menos principal.
5. Custos: fixo BRL uma vez por ativo comprado; variável com ceil sobre o débito
   reservado; spread com ceil sobre esse débito apenas para USD; remessa fixa
   BRL uma vez no conjunto, apenas se houver compra USD.

Quantidade zero não cobra custos. Recalcular o conjunto de linhas não acumula
taxas de tentativas anteriores. Preço acima do teto é inválido. O helper calcula
custos, não escolhe quantidades nem autoriza compras. Valoração usa o snapshot;
reserva e taxas consomem orçamento e não criam valorização. T07/T08 devem
revalidar exposições após esses débitos.

Exemplo manual: três unidades de 100 centavos, teto 101, reserva 0,5%, custo
fixo 10 centavos e variável 1%. Em BRL: principal 300, reservado ceil(301,5)=302,
taxas 10+ceil(3,02)=14, total 316. Em USD com FX 5,125, spread 2% e remessa 25:
principal 1538, reservado 1546, taxas 10+16+31+25=82, total 1628. As duas linhas
juntas consomem 1944; de um orçamento 2000 sobram 56:
1838 principal + 10 reserva + 96 taxas + 56 saldo = 2000 centavos.

## Limites operacionais e S22

- Dinheiro: de zero a 10²⁴−1 centavos; resultados acima do limite são rejeitados.
- Aporte: de 1 a 100000000 centavos. Quantidades: zero a 1000000000 unidades.
- Até 100 ativos e classes; até 1000 regras; até 10000 observações por coleção.
- Identificadores: 64 caracteres; textos: 2048; métricas: 24 dígitos inteiros e
  oito decimais. Razões: máximo 1000000 e denominador até 100000000.
- Texto de fixture: até 1 MiB UTF-8 antes de JSON.parse. O leitor de arquivo de
  T10 deverá limitar também os bytes lidos do filesystem.
- Entrada direta: até 50000 nós, profundidade 20 e 1048576 unidades de texto.
  Rejeita ciclos, acessores, arrays esparsos, valores não JSON e chaves de
  protótipo perigosas. Origem com HTML permanece texto, sem execução.

## Evidência e decisões

O código e 70 testes já estavam presentes ao iniciar esta execução. Foram
executados como caracterização; não há alegação de Red histórico observado.
Três regressões novas falharam por ausência de issues de preço/FX de candidato
e por duplicidade de métricas/rubricas com conteúdo inválido. Após correção,
passaram. Foi acrescentado o exemplo misto de fechamento monetário acima.
O typecheck encontrou expansão excessiva do tipo JSON recursivo; o retorno foi
ajustado para não reaplicar o tipo de congelamento ao snapshot já imutável.
Gates finais: `npm test` (74 testes), `npm run typecheck`, `npm run lint` e
`npm run build`, todos com sucesso. UI sem mudanças; inspeção visual/e2e não
reexecutados nesta tarefa.

Escolha: manter bigint e validadores explícitos existentes. Resolvem precisão e
validação nesta estrutura sem dependência adicional. O custo é manter schemas
manuais; revisar se novas versões tornarem essa manutenção repetitiva ou sujeita
a divergência. Não há mudança de lockfile ou configuração de infraestrutura.

A pasta não contém repositório Git. Revisão das alterações usa comparação com
uma cópia anterior à edição em `/tmp/buy-hold-t02-WKKSqb`.
