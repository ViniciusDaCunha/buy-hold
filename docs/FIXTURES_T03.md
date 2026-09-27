# Política e dados fictícios — T03

Data: 15/09/2026. Política fornecida v1.0; catálogo v1.0;
fixtureVersion `synthetic-1.0`. Todas as entradas são locais, determinísticas,
fictícias e sem finalidade de recomendação real.

## Catálogo e contratos

`backend/src/domain/profiles.ts` registra oito aplicações suportadas e o perfil de ETF
de dividendos sem suporte de compra. Cada regra tem identificador, unidade,
âncoras, bloco, peso, tipo de evidência, tratamento temporal e criticidade.
`backend/fixtures/scenarios.ts` copia as regras para a política do snapshot, com
identificadores `<perfil>.<regra>` e `profileIds` explícitos. Nenhuma faixa depende
de ticker. Os pesos de Q foram expandidos dos blocos da política; os de M
permanecem separados. Rubricas usam a avaliação documentada 0/25/50/75/100,
sem interpolar ou confundir essa entrada com Q pronto.

| Aplicação | Fonte normativa | Particularidade |
|---|---|---|
| Industrial | §§6.1, 7, 8 | ROIC, margem, dívida, juros, caixa, rubricas; P/L 10/16/24 |
| Consumo básico | §§6.1, 7, 8 | Mesma composição Q; P/L 12/18/27 |
| Banco | §§6.2, 7, 8 | ROE−Ke, folga CET1, inadimplência e safras; sem EBITDA industrial |
| Holding | §§6.2, 7, 8 | 80% investidas, 10% dívida/NAV, 10% governança/custos |
| FII logística | §10.1 | Vacância 3/8/18; locatário 15/30/50 |
| FII shopping | §10.1 | Vacância 3/7/15; locatário 5/10/20 |
| FII crédito | §10.2 | Aplicação de crédito de melhor qualidade; sem presumir perfil pelo ticker |
| ETF amplo | §11 | Mercado desenvolvido; custos, aderência, execução e mandato |
| ETF dividendos | TASK §2 | Apenas valoração/exposição; `UNSUPPORTED_PURCHASE_PROFILE` |

As cinco métricas industriais e as métricas bancárias indicadas no catálogo
recebem observações atuais e medianas históricas separadas. `basis` distingue
`current` e `historical`; `sampleCount` registra o número de exercícios da
mediana. Existem fórmulas, períodos, publicação, coleta, origem e ajustes.
São agregados fictícios fornecidos, permitidos por TASK §2, não notas simuladas
de qualidade. T05 deve combinar 70% histórico/30% atual para qualidade e usar
a pior nota para risco, além de verificar cobertura e comparabilidade.

Validade: 150 dias para balanço de ação, 75 para relatório de FII, 120 para
documentação de ETF, 180 para rubrica de ação/FII; revisão mensal de valuation
representada por 30 dias e FX por um dia, mantendo a convenção local de T02.
Igual ao limite ainda é válido. Histórico usa data de publicação do agregado,
e não presume que o período histórico seja um balanço atual. Balanço atual
continua obrigatório na avaliação posterior. Nenhum calendário de bolsa é
inferido.

O schema 1.0 em desenvolvimento recebeu campos opcionais aditivos:
`policy.rules[].profileIds`, `metrics[].basis/sampleCount` e `holdingDetails`.
Omissão mantém compatibilidade com os testes mínimos de T02; null explícito
não substitui omissão. Os schemas aceitam também `direction: RAW`, somente com
âncoras vazias e peso zero, para evidências auxiliares não pontuadas, como lucro,
evento de continuidade e prêmio sobre NAV. T04 deve pontuar somente H/L/B;
T05/T06 interpretam os dados auxiliares sem convertê-los em Q por conveniência.

## Carteira-base e exposições

| Ticker | Perfil | Quantidade | Preço fictício | Meta |
|---|---|---:|---:|---:|
| ITUB4 | Banco | 1 | BRL 40,00 | 8% |
| BBSE3 | Holding | 1 | BRL 35,00 | 8% |
| WEGE3 | Industrial | 1 | BRL 50,00 | 8% |
| ABEV3 | Consumo básico | 1 | BRL 30,00 | 8% |
| HGLG11 | Logística | 1 | BRL 60,00 | 8% |
| KNCR11 | Crédito de melhor qualidade | 1 | BRL 45,00 | 8% |
| XPML11 | Shopping | 1 | BRL 55,00 | 8% |
| IVVB11 | ETF amplo desenvolvido | 1 | BRL 80,00 | 34% |
| SCHD | Dividendos sem compra | 1 | USD 10,00 | 5% |

Metas: ações 32%, FIIs 24%, ETFs 39%, caixa 5%. Caixa inicial zero; não há
liberação nem reinvestimento. FX=5 BRL/USD. Patrimônio inicial: 44500 centavos;
SCHD contribui 5000. Com aporte S01, patrimônio antes de custos = 94500.
As metas são apenas configuração de teste e respeitam limites 10/15/25/40%.

Cada ETF tem cinco parcelas econômicas explícitas de 20%: tecnologia, saúde,
indústria, consumo básico e finanças, com grupos fictícios identificados. Os
dois ETFs compartilham esses grupos para exercitar sobreposição sem duplicar
patrimônio. Setor financeiro-alvo soma 23,8%, imobiliário 24%; nenhum supera
25%. Os grupos dos emissores diretos são distintos dos grupos sintéticos dos
ETFs; maior grupo-alvo direto é 8%. Ativos já acima de limites na carteira
atual continuam sendo entradas válidas; não é promessa de capacidade de compra.

## Holding, valuation e renda

`holdingDetails` contém o valor total das participações em centavos BRL e a
lista de investidas (id, perfil, valor, métricas e rubricas). A fixture de BBSE3
usa uma **investida bancária inteiramente sintética**, que representa 100% de
100000 centavos de participações. Não representa as investidas reais da empresa.
Seus dados são avaliáveis pelo perfil bancário, nunca por Q informado. O valor
econômico das investidas é usado só na ponderação e não é somado ao patrimônio
da carteira novamente. Cobertura de valor abaixo de 80% é sinalizada; cobertura
efetiva de evidências ainda deve ser calculada em T05. Investidas que sejam
holdings recursivas são rejeitadas nesta implementação, sem expansão implícita.

Os sete ativos não ETF têm cenários conservador/base/favorável explícitos,
ordenados e com `provided_fixture`. Eles são constantes independentes do preço
observado, não estimativas recalculadas pelo builder após editar cotação.
O método da holding registra dívida, custos/passivos e dupla contagem; o NAV
líquido de triagem é 50 BRL por ação. Cenários de fluxo podem diferir desse NAV.
Os demais métodos seguem seus perfis e têm terminal fictício 40% e revisão
em 01/09/2026. Não há valuation dos subjacentes de IVVB11: o resultado futuro
deve dizer “não avaliado”. Prêmio, spread mediano de 20 pregões e abertura do
mercado subjacente são observações auxiliares separadas.

Distribuição recorrente por unidade é uma observação auxiliar de 1 BRL anual
nos ativos não ETF; não representa recebimento em caixa. Renda de FII é
avaliada por cobertura de 24 meses e crescimento real de três anos, excluindo
amortizações. Não há nota Q/V/C pré-calculada no input. Rubricas têm motivo e
gatilho de revisão; expectativas de notas ficam fora da entrada financeira.

## Cenários e oráculos

`buildScenario(id)` sempre cria dados novos, sem efeitos. `expectations.ts`
contém os 24 resultados esperados em texto e valores de referência quando já
calculáveis à mão. S07/S19/S22 provocam os erros globais planejados; os demais
validam, com issues locais quando previstos. S16/S17/S18/S20/S23/S24 usam a
base e especificam ações/asserções adicionais no catálogo de expectativas.

- S09: H(−2;0;3) em 2,5 → 280/3, sem arredondar antecipadamente.
- S13: métricas industriais em b valem 60; seu peso total é 65%. Negócio vale
  100 (25%), reinvestimento 100 (6%) e distribuição 50 (4%):
  39+25+6+2=72. A posição existente e a candidata nova compartilham esses dados.
- S15: com aporte 300000 centavos, duas posições industriais iguais têm
  déficit e capacidade; comparar a entrada com a ordem invertida. Desempate
  final por identificador favorece SYNTH-TIE sobre WEGE3.
- S12: acrescenta SYNTHUSD (ETF amplo, quantidade zero, USD 1,00), divide a
  meta de ETF amplo entre 24% e 10% e mantém SCHD bloqueado. FX=5,125,
  fixo BRL 0,10, variável 0,1%, spread 2%, remessa BRL 0,25.
- S22 inclui texto JSON inválido e payload acima de 1 MiB em `boundaryCases`.
- S18 exige promessas controladas com conclusão nova antes da antiga;
  S23 exige filesystem real e disputa pelo mesmo destino; S24 exige injeção de
  falha no adaptador. Esses fluxos serão executados em T10/T12/T14.

Não gerar oráculos a partir da implementação de pontuação/alocação. A T03
verifica dados e preparação desses cenários; não declara decisões financeiras,
CLI, UI ou exportação já implementadas.

## Decisão e evidência

Escolha: catálogo de objetos simples, builders TypeScript e validadores
explícitos existentes. Alternativa menor seria copiar JSON por cenário, mas
duplicaria os mesmos dados e dificultaria preservar diferenças intencionais.
O custo é manter catálogo, schema e builders coerentes; revisar se versões
adicionais exigirem migração ou reutilização fora do runtime TypeScript.
Nenhuma dependência ou serviço novo, nenhuma alteração nas fontes normativas.

Red observado para incompatibilidade entre perfis, catálogo ausente, builders
ausentes, metadados históricos, look-through, dados RAW, duplicidade/ausência
de investida e fronteira temporal de ETF. Green observado após implementação.
Perfil desconhecido, versão e âncoras inválidas também foram exercitados,
aproveitando as validações existentes. Snapshot e serialização continuam
preservados, com regressão dos testes de T02. As alterações foram revisadas
contra `/tmp/buy-hold-t03-8QaYUe`, cópia anterior às edições; a pasta não tem Git.

Gates finais executados: `npm test` (144 testes em sete arquivos),
`npm run typecheck`, `npm run lint` e `npm run build`, todos com sucesso.
Sem mudança visual; inspeção visual e e2e não reexecutados nesta tarefa.
