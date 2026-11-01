# Contratos canônicos — INT-02

Data: 31/10/2026  
Status: especificados e validados no domínio; sem integração externa ou persistência.

## Escopo e compatibilidade

Os contratos ficam em `backend/src/domain/canonical-contracts.ts`, com parsers de
runtime puros e tipos inferidos dos parsers. Eles não importam React, Node,
filesystem, rede, relógio global ou dependências novas. O modelo continua
separado do formato de fixtures T00–T15; nenhum fixture passa a representar uma
posição real por causa desta entrega.

Cada registro contém `schemaVersion: "1.0"`. O parser rejeita versão não
suportada e campos desconhecidos; ausência, `null` e zero mantêm significados
distintos. Uma versão futura só será aceita depois de um parser/migrador
explícito. Mudança de estrutura ou semântica exige nova versão registrada e
compatibilidade deliberada; não se interpreta silenciosamente um registro antigo
com regras atuais.

O contrato é executável, não um arquivo JSON Schema duplicado. Assim, o tipo
estático e a validação runtime compartilham uma implementação. Entradas são
objetos de dados simples; números monetários/normalizados devem chegar como
texto decimal, nunca `number` binário. Datas civis usam `YYYY-MM-DD`; instantes
exigem ISO 8601 com `Z` ou offset explícito.

## Registros

| Parser | Conteúdo e invariantes principais |
|---|---|
| `parseCanonicalAsset` | `assetId` interno estável, tipo, símbolo principal, moeda, ID de emissor e identificadores externos, além do histórico de símbolos com intervalo e fonte. Símbolo não é identidade; identificação não resolvida continua explícita. |
| `parseCanonicalClassification` | Dimensão (setor, grupo do emissor, classe ou tipo de fundo), método (direto, look-through ou provedor), estado, peso em pontos-base e validade/publicação/coleta. `unknown` não equivale a `unclassified`. |
| `parseFundComposition` | Data-base, cobertura identificada e parcela não classificada; cada componente mantém `requestedSymbol` e `returnedSymbol`. Composição disponível exige que cobertura + parcela não classificada some 10.000 bps. Ausente/indisponível não recebe pesos fabricados. |
| `parseOpeningPosition` | Posição aceita com quantidade decimal explícita, moeda, data-base, data de aquisição opcional, preço/custo/taxas opcionais e origem. `null` representa desconhecido/não informado; cotação atual nunca preenche custo histórico. Importação exige origem e instante de revisão. |
| `parseFinancialEvent` / `parseFinancialEvents` | Aporte, retirada, compra, venda, provento recebido, custo ou reversão; ativo, quantidade, preço, bruto/líquido, custos, instante do fato, data efetiva, registro, revisão, status e origem. O parser de lote rejeita IDs de evento e IDs externos duplicados no mesmo payload. |
| `parseCashBalance` | Valor por moeda, instante, base (`user-reported` ou derivado de eventos confirmados) e IDs de eventos de origem. Saldo zero é um valor explícito; saldo derivado requer proveniência. |
| `parseMarketObservation` | Identidade/ativo, símbolos solicitado e retornado, campo semântico e original, campo do provedor, valor original e normalizado, unidade/moeda, período econômico, instante de mercado/validade, publicação, coleta, endpoint/arquivo, referência, permissão de retenção de hash e versão de parser. |
| `parseSourceDocument` | Fonte, tipo, emissor opcional, endpoint/arquivo, referência, publicação/coleta, versão de parser e permissões independentes para payload e hash. Hash SHA-256 só é aceito com retenção explicitamente autorizada. O contrato não guarda payload bruto. |
| `parseCollection` | Lote, ativos solicitados, início/fim, contagens, estado (`running`, `succeeded`, `partial`, `failed`, `unknown`) e erros estruturados sem texto bruto de resposta/segredo. Estado terminal precisa concordar com contagens. |
| `parseQualityAssessment` | Estado por observação, códigos de motivo, observações comparadas, instante e versão da política. Estados possíveis: `fresh`, `stale`, `missing`, `invalid`, `conflict`, `provider-revised`, `source-unavailable` e `unknown-publication-time`. |
| `parseTransformation` | Operação e versão, valores decimais de entrada/saída, unidade e moeda separadas em cada lado, observações de origem e instante de aplicação. Conversão de moeda exige moedas distintas; a observação original não é substituída. |
| `parsePortfolioSnapshot` | Data-base e moeda-base, IDs das posições/eventos aceitos, caixa por moeda, posição/quantidade e valores de mercado local/base, observações de preço/FX, classificações, composições, transformações, qualidade e versão de política. Ausência de preço/FX não gera valor. |
| `parseRecommendationSnapshot` | ID da recomendação/decisão, instante, versão do motor e política, snapshot da carteira, JSON completo de entrada e saída e IDs das observações. O JSON é copiado, validado como dado JSON limitado e congelado para reprodução. |

Os parsers não consultam outros registros para resolver relações. Integridade
referencial, unicidade entre lotes/concurrente, append-only e migração pertencem
à decisão e às constraints de INT-04. O lote rejeita duplicidade interna; não
promete idempotência global. Por isso `assetId`, `eventId` e referências são
validados estruturalmente aqui, mas sua existência no armazenamento ainda não é
garantida.

Para `identityState: "identified"`, `issuerId` deve existir ou um identificador
de esquema estável reconhecido deve estar presente. O catálogo v1 reconhece
`cnpj` (14 dígitos), `isin` (12 caracteres no formato de ISIN), `figi` (12
caracteres) e `lei` (20 caracteres). Outros esquemas, inclusive `ticker`, podem
ser preservados como metadado, mas não resolvem a identidade. O formato é
validado estruturalmente; a associação ao emissor/instrumento e verificações
externas pertencem a INT-05. Um `assetId` local ou símbolo sozinho não comprova
identidade externa.

As valorações do snapshot obedecem a esta matriz de presença:

| Estado | Valor local | Valor na moeda-base | Preço | FX |
|---|---|---|---|---|
| `valued` | obrigatório | obrigatório | obrigatório | obrigatório somente quando a moeda do ativo difere da base |
| `missing-fx` | obrigatório | nulo | obrigatório | nulo; exige ativo em moeda diferente da base |
| `missing-price`, `invalid`, `unavailable` | nulo | nulo | nulo | nulo |

Qualquer campo parcial fora da linha correspondente é rejeitado em runtime.
IDs de observação e qualidade do snapshot continuam disponíveis para rastrear
o motivo da ausência, sem fabricar valor monetário.

## Precisão, moeda e eventos

O decimal canônico é `{ value: string, scale: integer }`, com até 24 dígitos
inteiros e 12 casas declaradas. A string é a fonte exata; `scale` limita a
precisão permitida e nunca é inferida de um `number`. `Money` é `{ amount:
Decimal, currency: string }`. O validador exige código monetário de três letras
maiúsculas, mas não mantém a lista de códigos ISO nem comprova que uma moeda
esteja habilitada no produto ou coberta por uma fonte. Conversão, arredondamento, precisão
operacional e regra de câmbio permanecem para INT-03/05.

Em eventos, `grossAmount`, `netAmount`, `unitPrice` e `costs`, quando presentes,
declaram a mesma moeda. Compra/venda exige quantidade positiva, preço e valores
bruto/líquido; aporte/retirada exige valores e não referencia ativo; provento
recebido exige ativo e valores; evento de custo usa apenas `costs`. O parser não
impõe uma equação entre bruto, líquido e custos: alocação de taxa, sinal,
arredondamento, fluxo de caixa e custo gerencial ainda precisam da política de
INT-03. Valor não registrado fica `null`; custo conhecido zero deve ser `0`.

`imported-pending` só aceita origem importada e não representa posição aceita.
Evento importado confirmado exige `reviewedAt`; posição de abertura importada
exige `sourceId` e revisão explícita. Um status confirmado em registro manual
representa entrada consciente do usuário. INT-01 não encontrou fonte confiável
para operações, portanto o contrato não ativa importação. Uma reversão é um
novo registro ligado a `reversesEventId`; ela não altera o evento original. O
armazenamento deverá validar que o alvo existe, que pode ser revertido e que
não há ciclo/reversão duplicada. Ação corporativa ainda não é um tipo de evento
confirmável: INT-03 precisa definir como afeta quantidade e preço. O parser de
transformação registra unidade/moeda de entrada e saída e as fontes, mas não
aplica o ajuste à posição ou ao histórico.

## Semântica temporal e qualidade

Os campos temporais não se substituem entre si:

| Campo | Significado |
|---|---|
| `period.kind/start/end` | Período econômico anual, trimestral ou TTM; spot, inaplicável e desconhecido não inventam datas inicial/final. |
| `marketAt` / `validUntil` | Instante observado no mercado e limite de validade se a fonte o fornecer. Não inferir validade da hora da consulta. |
| `publishedAt` | Publicação do emissor/provedor/documento. `null` significa que o instante não é conhecido; coleta não o substitui. |
| `collectedAt` | Instante explícito em que o processo recebeu a observação/documento. Sempre inclui offset. |
| `effectiveOn` / `occurredAt` | Data efetiva e instante do evento de carteira; são preservados separadamente. |
| `referenceDate` | Data-base declarada de composição/classificação; não é publicação nem coleta. |

Para campos sem timestamp disponível, guardar `null` e sinalizar
`unknown-publication-time` quando aplicável. Uma data Unix de mercado deve ser
convertida a partir da unidade documentada pelo endpoint, preservando a fonte e
o instante resultante; `requestedAt` não substitui a publicação/período.

Instantes aceitam de zero a nove casas fracionárias e offset explícito. Toda
comparação temporal usa essa precisão completa, inclusive publicação/coleta,
mercado/coleta e caixa/data-base do snapshot; dois instantes no mesmo
milissegundo podem ter ordem distinta.

Valor de origem `null` nunca produz valor normalizado; estado `missing` exige
origem e normalização ausentes. Zero permanece um valor decimal presente. Um
valor de origem malformado deve usar `invalid`, não `missing`.

O contrato reconhece estados de qualidade, mas não decide prazo de frescor,
comparabilidade, limiar de conflito, precedência nem se o motor bloqueia ou
admite parcialidade. Esses critérios são INT-03/Gate B/E. `provider-revised`
permite representar uma nova revisão; manter as versões antigas e detectar
mudança de conteúdo é responsabilidade de INT-04/05.

## Dicionário semântico v1

`semanticField` identifica o significado canônico; `sourceField` conserva o
nome original. Campos homônimos não são mapeados entre si sem reconciliar
fórmula, unidade, período e moeda. Nas métricas de razão, `ratio` é adimensional;
`percent` usa pontos percentuais (por exemplo `6.0` significa 6%), enquanto
`fraction` guarda uma proporção (por exemplo `0.06`). `pp` é diferença em pontos
percentuais. Rubricas usam nota inteira 0/25/50/75/100 em campo próprio, não um
percentual observado.

| Campo/regra semântica | Definição ou fórmula | Unidade | Frequência/período | Fonte candidata e limite observado |
|---|---|---|---|---|
| `market.price` / `regularMarketPrice` | Cotação de mercado por unidade, não oferta executável. | moeda/unidade | Spot; instante de mercado do provedor. | brapi v2 quote; amostra ITUB4 retornou BRL e `regularMarketTime` UTC. |
| `market.ohlcv` / OHLCV | Abertura, máxima, mínima, fechamento e volume; volume mantém a unidade publicada. `adjustedClose` fica distinto do fechamento. | moeda/unidade e unidade de volume da fonte | Série diária; data da fonte é Unix em segundos no exemplo consultado. | brapi v2 historical; amostra tinha `x-brapi-stale: 1`; estado e ajuste precisam ser mapeados. |
| `company.total-revenue` / `totalRevenue` | Receita total segundo a definição da fonte, sem pressupor recorrência. | BRL na definição observada; moeda financeira pode faltar | TTM ou período anual/trimestral conforme modo. | brapi financial-data/CVM. A data de publicação por campo não foi observada; guardar período e publicação separadamente. |
| `company.free-cash-flow-provider` / `freeCashFlow` | Definição brapi observada: fluxo operacional + fluxo de investimentos. Mantém-se como campo do provedor. | BRL | TTM/histórico conforme endpoint. | Não equivale automaticamente a owner earnings ou a fluxo após capex definido pela política. CVM exige dicionário de contas e normalização. |
| `company.return-on-equity-provider` / `returnOnEquity` | brapi: lucro líquido TTM / patrimônio líquido. | percent (payload como fração decimal) | TTM. | Não equivale ao ROE da política, que usa lucro recorrente atribuível / patrimônio médio. Não mapear para `roe-spread`. |
| `company.roic-spread` | ROIC = NOPAT/capital investido médio; NOPAT = EBIT ajustado × (1 − taxa fiscal normalizada); menos WACC. Premissas por moeda/data/risco. | pp | TTM e histórico comparável; política prefere 5 exercícios. | CVM + cálculo versionado; não há campo brapi pronto nem premissa de WACC aprovada para uso real. |
| `company.margin-stability` | Margem EBIT recorrente atual menos mediana histórica comparável. | pp | TTM versus histórico comparável. | CVM demonstrações normalizadas; tratamento de extraordinários/arrendamentos não está implementado. |
| `company.net-debt-ebitda` | (Dívida financeira − caixa não operacional) / EBITDA recorrente positivo; EBITDA não positivo não produz razão utilizável. | ratio (x) | Atual e mediana histórica de 3 anos para risco. | CVM; arrendamentos e caixa exigem política consistente. |
| `company.interest-cover` | EBIT recorrente / juros financeiros brutos positivos. | ratio (x) | Atual e mediana de 3 anos para risco. | CVM; definição de juros e itens recorrentes deve ser normalizada. |
| `company.cash-conversion` | Soma do fluxo operacional ajustado / soma do lucro recorrente do período. | ratio (x) | Período acumulado comparável; política não aceita denominador sem sentido econômico. | CVM; `freeCashFlow` brapi não é substituto. |
| `bank.roe-spread` | Lucro recorrente atribuível / patrimônio médio atribuível menos Ke por moeda/data/risco. | pp | TTM e exercícios comparáveis. | CVM/relatórios; brapi ROE de patrimônio de fim de período é definição distinta. |
| `bank.profitable-years` | 100 × exercícios lucrativos / exercícios comparáveis. | percent | Política usa cinco exercícios comparáveis. | CVM; declarar quantos exercícios foram encontrados. |
| `bank.cet1-headroom` | CET1 menos exigência específica aplicável, incluindo adicionais. | pp | Atual e série de risco comparável. | Relatório regulatório/documento do banco; exigência não pode ser presumida. |
| `bank.default-cover` | Provisões / créditos inadimplentes acima de 90 dias × 100. | percent | Atual e série de risco. | CVM/relatório; interpretar safras e composição de crédito. |
| `bank.npl90` | Créditos vencidos acima de 90 dias / carteira bruta × 100. | percent | Atual e série de risco. | CVM/relatório; não comparar carteiras incompatíveis sem ajuste. |
| `holding.holding-debt-nav` | Dívida líquida própria / valor líquido das participações × 100, sem dupla contagem. | percent | Atual e histórico de risco. | CVM/documentos das investidas; look-through exige cobertura identificada. |
| `holding.nav-discount` | 100 × (1 − preço/NAV líquido por unidade). | percent | Spot comparado a NAV com data-base publicada. | NAV por unidade e preço; reconciliação das participações/passivos ainda exige cálculo. |
| `fii.price-to-nav` / `priceToNav` | Preço / NAV por cota conforme o provedor. | ratio (x) | Indicador com `referenceDate`. | brapi dictionary; manter a data-base e não tratar múltiplo como valuation completo. |
| `fii.nav-per-share` / `navPerShare` | NAV por cota. | BRL/unidade | Data-base do relatório/indicador. | brapi/FNET/CVM; endpoint brapi detalhado não foi validado sem plano Pro. |
| `fii.dividend-yield-12m` / `dividendYield12m` | DY em 12 meses conforme fonte; não confundir anunciado e recebido. | percent (payload como fração) | Janela móvel de 12 meses e data de referência do provedor. | brapi; não altera caixa ou renda efetivamente recebida. |
| `fii.vacancy-rate-provider` / `vacancyRate` | Vacância física por área, ponderada por área conforme dicionário observado. | fraction | Referência de indicador/carteira. | brapi/FNET; não é a vacância financeira exigida pela política. |
| `fii.vacancy` | Receita potencial perdida por vacância / receita potencial total × 100. | percent | Atual por relatório, mantendo publicação/data-base. | Relatório de fundo; vacância física não substitui vacância financeira. |
| `fii.real-revenue-growth` | CAGR real da receita recorrente por cota em 3 anos, com emissões/aquisições ajustadas. | percent ao ano | Série de 3 anos. | Relatórios/CVM; ajuste de inflação, emissões e aquisições precisa de transformação versionada. |
| `fii.largest-tenant` | Receita do maior locatário / receita recorrente total × 100. | percent | Relatório atual. | Relatório do fundo; não confundir locatário com devedor. |
| `fii.obligations-assets` | Dívidas e aquisições parceladas / valor dos ativos × 100. | percent | Posição e calendário atuais. | Relatório; obrigações futuras precisam de origem e data. |
| `fii.distribution-cover` | Resultado recorrente distribuível em 24 meses / distribuições recorrentes; excluir amortizações. | ratio (x) | Janela móvel de 24 meses. | Informes/relatórios; método de recorrência ainda deve ser operacionalizado. |
| `fii.real-distribution-growth` | CAGR real de distribuições recorrentes por cota em 3 anos; excluir amortizações e extraordinários. | percent ao ano | Série de 3 anos. | Histórico de proventos + relatórios; anúncio não é recebimento. |
| `fii.default-exposure` | Saldo de créditos inadimplentes / patrimônio líquido × 100. | percent | Atual por carteira/relatório. | Relatórios de crédito; sem amostra Pro nem fonte aprovada para todos os campos. |
| `fii.largest-debtor` | Exposição ao maior grupo devedor / patrimônio líquido × 100. | percent | Atual; preservar identidade de grupo. | Relatório de carteira; agregação de devedor ainda não confirmada. |
| `fii.ltv` | Saldo devedor / garantia comparável, ponderado pelo crédito; mesma modalidade/prioridade. | percent | Carteira atual. | Relatório/documento de crédito; agregação incompatível fica indisponível. |
| `etf.total-fee` | Taxa/despesa total anual segundo documento do fundo; fórmula de denominador ainda depende do dado publicado. | percent ao ano | Atual; revisão da política requer mesma base temporal. | Administrador/emissor. Sem fonte aprovada para IVVB11/SCHD nesta fase. |
| `etf.tracking-error` | Desvio padrão anualizado da diferença de retornos totais do fundo e índice, mesma moeda e janela. | percent ao ano | Histórico preferencial de 3 anos. | Série do ETF e índice; não há série validada no INT-01. |
| `etf.annual-drag` | Retorno total do índice − retorno total do fundo − despesas explicadas. | pp ao ano | Janela alinhada, mesma moeda e tratamento de proventos. | Emissor/índice; não há amostra validada. |
| `etf.trading-spread` | Medida de spread requer bid/ask e horário compatível. Fórmula e janela canônicas aguardam validação de INT-03/05. | percent | Observação intradiária com timestamp. | Fonte de mercado compatível; B3 automatizada não aprovada no INT-01. |
| `equity.pe` | Preço / lucro normalizado por ação positivo; lucro ausente/não positivo invalida o múltiplo. | ratio (x) | Preço spot e lucro TTM/ciclo explicitamente identificado. | Preço + CVM; fórmula de normalização depende do perfil. |
| `equity.pb` | Preço por ação/cota / patrimônio líquido positivo por ação/cota. | ratio (x) | Preço spot e patrimônio com período/publicação explícitos. | Preço + CVM/FNET; não é métrica de valuation isolada. |
| `equity.ev-ebitda` | EV ajustado por dívida, caixa e minoritários / EBITDA recorrente positivo comparável. | ratio (x) | Preço atual e dados financeiros do período declarado. | CVM; arrendamentos/consolidação devem ser reconciliados. |

As rubricas (`predictability`, `competitive-advantage`, `governance`,
`capital-allocation`, `productive-reinvestment`, `sustainable-distribution`,
`credit-vintages`, `holding-governance-costs`, `location-liquidity`,
`physical-quality-capex`, `contracts-expirations`, `governance-allocation`,
`repayment-provisions-losses`, `origination-transparency-recovery` e
`mandate-structure`) têm nota documentada 0/25/50/75/100, justificativa,
fonte/data e gatilho de revisão. Não possuem fórmula numérica universal. As
métricas auxiliares atuais (`normalized-profit`, `recurring-margin`, `ebitda`,
`distribution-per-unit`, `terminal-share`, `comparable-years`, `material-uncertainty`,
`continuity-risk`, `capital-breach`, `suspended`, `fraud` e
`credit-event-unreviewed`) precisam de semântica própria por perfil antes de
consumirem dados reais; por ora não são mapeamentos de provedor.

## Fonte e limites para o próximo marco

INT-01 registrou a evidência e a data em `docs/VIABILIDADE_FONTES_INT01.md`:

- brapi v2 é candidata para mercado brasileiro. Quote de ITUB4 foi observada;
  demais cotações detalhadas não foram validadas sem chave. SCHD é `unknown` na
  cobertura consultada; endpoints detalhados de FII exigem Pro e não foram
  testados autenticados.
- CVM é fonte documental complementar com DFP/ITR estruturados, dicionários,
  atualizações e reapresentações. Retenção de payload depende do dataset e do
  Gate C. A origem deve conservar CNPJ/código CVM, conta, período e revisão.
- BCB/PTAX é câmbio de referência, não executável. No exemplo, o horário veio
  sem offset explícito; não atribuir timezone não verificado.
- B3 direto não está aprovado para coleta automatizada. B3/emissores podem ser
  reavaliados apenas após termos/licença e acesso compatíveis.
- Importação de operações permanece desligada: INT-01 não encontrou fonte
  confiável/autorizada e identidade estável para esse fluxo.

Continuam pendentes: regra de frescor/comparabilidade/precedência e resultado
parcial (INT-03/Gate B/E); semântica de custo, câmbio e fluxos (INT-03);
tecnologia/fonte durável, retenção e constraints (INT-04/Gate C); processo
confiável para token antes de qualquer integração web (Gate D/INT-05); e
normalização por endpoint/campo com contratos observados (INT-05). Nenhuma
dessas decisões é preenchida por este schema. O MVP usa somente fixtures e a
proposta continua sem executar ou registrar compras.

## Verificação desta tarefa

`tests/domain/canonical-contracts.test.ts` cobre versão desconhecida, identidade
e símbolos, classificação desconhecida, composição incompleta, custo histórico
desconhecido, tipos/status/reversão/duplicidade de evento, proveniência do caixa, permissão
de hash, revisão de importação, conversão com moedas separadas, valor zero versus
ausência, decimal/unidade/moeda/período, coleta
parcial, qualidade, proveniência de transformação e reprodução de snapshots.
Testes de runtime não fazem chamadas a provedores nem dependem de persistência.
