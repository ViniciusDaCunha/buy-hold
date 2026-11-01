# Contratos canônicos — INT-02

Versão 1.0 · 01/11/2026

## Escopo e compatibilidade

`backend/src/domain/contracts.ts` define parsers de runtime puros para ativos, instrumentos, eventos e snapshots. Todos os contratos aceitam `schemaVersion: "1.0"`, rejeitam campos desconhecidos e produzem cópias profundamente congeladas. Nenhum parser faz I/O, consulta relógio global, resolve ticker por conta própria ou altera posições.

Um payload novo não é convertido silenciosamente para a versão corrente. Mudança incompatível exige nova versão e parser explícito; um snapshot histórico é preservado e uma correção cria nova observação/evento/snapshot relacionado. Hash identifica conteúdo sem implicar permissão para guardar o payload original.

## Contratos

| Contrato | Campos semânticos e regra principal |
|---|---|
| Ativo/instrumento (`parseAsset`) | `assetId` interno, `issuerId` opcional, identificadores, nomes/símbolos solicitados e retornados pelo provedor preservados, `assetType`, classificação e estado de resolução. Um ativo `resolved` exige `issuerId` ou identificador de scheme estável. Mudança de símbolo/nome conserva a identidade estável; a camada persistente deve registrar revisão nova, nunca sobrescrever a versão usada por snapshot. |
| Scheme de identidade | Catálogo fechado: `cnpj`, `isin`, `figi`, `lei`, `cusip`, `cvm-code`, `ticker`. Somente CNPJ/ISIN/FIGI/LEI/CUSIP contam como identidade estável; código CVM e ticker não resolvem sozinhos. O provedor/adaptador continua responsável por validar o valor do identificador e sua associação à entidade. |
| Composição de fundo (`parseFundComposition`) | Fundo, data efetiva, documento de origem, componentes e parcela não classificada. Cada componente referencia `assetId` canônico ou identificador estável; pesos decimais exatos somam 1 com a parcela não classificada, sem completar lacunas implicitamente. |
| Posição de abertura (`parseOpeningPosition`) | Ativo, quantidade/unidade, data de abertura, custo-base explícito ou ausente e documento/origem. A posição não é modificada por parser de dado externo. |
| Evento financeiro (`parseFinancialEvent`, `parseFinancialEvents`) | Tipo distingue aporte externo, retirada, compra, venda, provento recebido, custo e estorno; registra quantidade/preço quando aplicável, valores bruto/líquido/custos, data do fato e origem. Valores do mesmo evento usam uma moeda, cada montante traz sua própria `scale`. Lote rejeita `eventId` e ID externo de provedor duplicados. A equação bruto/líquido/custo e método de custo ficam para INT-03. |
| Caixa (`parseCashBalance`) | Saldo decimal, escala e código de moeda por carteira/data, separado de posições e eventos. A carteira pode manter moedas diferentes em linhas distintas. |
| Observação de mercado (`parseMarketObservation`) | Ativo, símbolo solicitado/retornado, campo semântico, tipo de dado (`supplied`, `derived`, `adjusted`), campo/valor original quando aplicável, valor normalizado com escala explícita, IDs de transformação, unidade/moeda, período econômico, data/instante de mercado, validade, publicação, coleta, revisão do provedor, origem/endpoint/referência, hash permitido, versão do parser e estado de qualidade. Datas ausentes permanecem `null`; chamada/coleta não inventa data de mercado ou publicação. |
| Documento-fonte (`parseSourceDocument`) | Tipo, referência, publicação/coleta, hash SHA-256 opcional e política `metadata-only`, `hash-only`, `reference-only`, `payload-permitted` ou `unknown`. O contrato não recebe conteúdo bruto. |
| Coleta (`parseCollection`) | Chave de idempotência, fonte/endpoint, início/fim, ativos solicitados, observações produzidas, status HTTP/código operacional fechado e referência de retry. Mensagem/segredo do fornecedor não é armazenado como erro; endpoint/referência com query, autenticação ou credencial falha em runtime. |
| Qualidade (`parseQualityAssessment`) | Sujeito, instante de avaliação, estado, códigos de problema, observações consideradas e cobertura decimal de 0 a 1. `fresh`, `stale`, `conflict`, `provider-revised`, ausência, invalidade e tempo de publicação desconhecido continuam distintos. |
| Transformação (`parseTransformation`) | Método/regra versionada, observações de entrada e saída e tipo de ajuste (split, dividendo, câmbio ou período derivado); derivado não é apresentado como valor original. |
| Snapshot da carteira (`parsePortfolioSnapshot`) | Carteira/data efetiva, instante de captura, moeda-base, posições, caixa, eventos e posições de abertura usados. Em `valued`, observação de preço e valores local/base são todos obrigatórios; em estado negativo, os três devem ser nulos. |
| Snapshot da recomendação (`parseRecommendationSnapshot`) | Decisão, snapshot de carteira, instante, versões do motor/política, observações de entrada e hash obrigatório do resultado. Objeto retornado e descendentes ficam congelados. |

`parseFinancialEvents` valida um lote, rejeita `eventId` repetido e repetição de `sourceId + externalId` importado. O estado estornado aponta para um evento de estorno confirmado; o evento de estorno aponta de volta ao original. A representação financeira espelhada do estorno depende da camada de aplicação/livro-razão, ainda não implementada nesta tarefa. Ações corporativas e seu efeito em quantidade/custo permanecem para INT-03.

## Dinheiro, quantidades e períodos

- Valores monetários e quantidades são texto decimal, sem `number` binário; a gramática compartilhada limita a 24 dígitos inteiros e 8 casas fracionárias. Montantes monetários levam `scale` inteiro (0–8), que precisa coincidir com as casas fracionárias do texto. Observações preservam `originalScale` e `normalizedScale`. O texto é preservado, sem conversão para centavos ou arredondamento neste contrato.
- Moeda usa formato alfabético de três letras maiúsculas compatível com ISO 4217. O formato não prova que o código esteja atribuído; adaptadores devem validar contra a fonte/catálogo de moeda antes de cálculo.
- Unidades de observação são explícitas (`money`, `ratio`, `percent`, `percentage-points`, `count`, `shares`, `days`). Unidade monetária exige moeda quando há valor; as demais não podem levar moeda.
- Períodos `annual`, `quarterly`, `ttm` e `range` exigem datas inicial/final em ordem. `spot` não inventa período econômico; `marketDate` permanece disponível para uma sessão de negociação sem horário.
- Datas civis são `YYYY-MM-DD`. Instantes exigem ISO-8601 com `Z` ou offset. O parser aceita no máximo três casas decimais de segundo e rejeita mais precisão (`INVALID_TIMESTAMP_PRECISION`), evitando comparação com truncamento silencioso. Fuso ausente nunca é inferido.
- `marketAt`, `marketDate`, `validUntil`, `publishedAt`, `collectedAt` e `providerRevisedAt` são campos separados. `publishedAt: null` exige `publicationTimeStatus: "unknown"`; uma data conhecida não pode aparecer como desconhecida. `collectedAt` não substitui validade nem frescor.

## Estados proibidos e imutabilidade

- Observações com `missing-price`, `missing`, `invalid`, `unavailable` ou `source-unavailable` não podem trazer valor original/normalizado nem moeda.
- Observação `supplied` exige equivalência numérica exata entre valor original e normalizado, mesmo com escalas textuais diferentes. Divergência exige `adjusted` e ID de transformação; preço monetário original e normalizado devem ser positivos.
- Posição do snapshot em estado negativo não pode trazer `priceObservationId`, `localMarketValue` ou `baseMarketValue`, nem parcialmente. Posição `valued` exige todos os campos.
- `resolved` com somente ticker/symbol falha em runtime (`UNRESOLVED_ASSET_IDENTITY`).
- Instantes acima de milissegundos falham em runtime; instantes aceitos são comparados como instantes completos naquela precisão.
- Os parsers criam um novo objeto e congelam a árvore retornada; não congelam nem mutam o input recebido. Correções históricas usam novo registro/referência, nunca sobrescrevem o snapshot anterior.
- Evento `draft`/`imported-pending` é registro de staging e não altera posição. Somente a aplicação futura poderá aplicar eventos confirmados após revisão; estes contratos não contêm reducer ou persistência.
- Endpoint e referência não aceitam query string, userinfo nem padrões de credenciais; códigos operacionais vêm de enumeração fechada e não podem carregar corpo de erro. Isso mantém chave de API fora de URLs, referências e diagnósticos canônicos.

## Lacunas delegadas

### Dicionário semântico inicial

| Campo canônico | Definição/unidade | Tipo e fórmula | Frequência e fonte | Estado nesta fase |
|---|---|---|---|---|
| `market.close-price` | Preço por unidade; `money` na moeda negociada, escala explícita; `marketDate` civil se não houver instante de negócio. | `supplied`; preservar campo do provedor, sem tratar fechamento como preço intradiário ou retorno total. | Sessão de negociação declarada pela fonte; cotação/histórico da fonte aprovada. | Sem fonte homologada; freshness e moeda permanecem em aberto pela INT-01. |
| `issuer.fundamental.<provider-field>` | Métrica fundamentalista individual com unidade/moeda/período próprios; nomes iguais de campos não implicam fórmula igual. | `supplied`; um campo de origem por observação. Qualquer TTM/T4 calculado recebe semântica e transformação separadas. | Referência/período econômico informado pelo emissor/provedor; frequência depende da rubrica. | Mapeamento por métrica e perfil setorial pendente; métricas não homologadas não são intercambiáveis. |
| `issuer.statement.<account-code>` | Valor da conta publicada com moeda, unidade e período anual/trimestral da demonstração. | `supplied` se reportado; `derived` se T4/TTM for calculado, com inputs e regra versionados. | DFP/ITR e data de publicação; documentos regulatórios/emissor. | Rubricas e transformação de períodos precisam ser definidas em INT-03/05. |
| `fund.distribution.announced` | Provento anunciado por cota, moeda e datas do evento. | `supplied`; não equivale a provento recebido nem altera caixa/evento confirmado. | Anúncio e frequência publicados pelo fundo/provedor. | Rotas testadas da fonte candidata bloqueadas no plano atual; ingestão não aprovada. |
| `fund.composition.weight` | Fração/razão por componente, com data efetiva e parcela não classificada explícita. | `supplied` se publicada; look-through/normalizações precisam transformação versionada. | Data de referência e calendário do documento/gestor. | Cobertura incompleta é explícita; composição não pode ser usada sem identidade estável de cada componente. |
| `fx.ptax.reference` | PTAX compra/venda em BRL por USD, moeda, data e boletim. | `supplied` como referência; não é taxa executável nem substituto automático de câmbio comercial. | Boletim diário/intradiário conforme endpoint. | A resposta testada tem timestamp sem offset e seis casas decimais; este contrato a rejeita como instante. Não truncar nem inferir fuso; campo bloqueado até adapter/formato compatível. |
| `position.local-market-value` | Valor de posição na moeda local. | `derived` de quantidade e observação de preço; regra de escala/arredondamento permanece em INT-03. | Data efetiva do snapshot e validade do preço. | Contrato de snapshot exige vínculo a preço; fórmula de produção não implementada. |
| `position.base-market-value` | Valor da posição convertido para a moeda-base da carteira. | `derived` de valor local e taxa FX elegível; seleção temporal/arredondamento em INT-03. | Data de mercado da posição e referência cambial aplicável. | Snapshot exige moeda-base; política de conversão ainda aberta. |
| `portfolio.cost`, `portfolio.return`, `portfolio.income` | Custo gerencial, retorno e renda efetivamente recebida são semânticas distintas. | `derived` de eventos confirmados conforme fórmula versionada; nenhum valor fictício ou provento anunciado preenche esses campos. | Período selecionado e eventos/dados disponíveis. | Fórmulas e política contábil delegadas à INT-03. |

Estados `supplied`, `derived` e `adjusted` são explícitos no contrato da observação. `derived` exige IDs de transformação e não finge campo/valor original; `adjusted` preserva o original e também exige transformação. Mudanças de definição/unidade geram semânticas diferentes, nunca uma substituição silenciosa.

INT-02 não define SLA de atualidade, precedência de fontes, reconciliação de valores, fórmula de custo/retorno, câmbio executável, tratamento fiscal, fórmula de provento líquido, efeito de split sobre custo/quantidade, licenças de retenção nem semântica de campos Bolsai/FMP. Esses itens permanecem em INT-03, INT-04 e gates de integração. Nenhuma fonte foi homologada em INT-01.

## Evidência TDD

Os 10 testes focados começaram falhando com `CONTRACT_NOT_IMPLEMENTED`; após implementar os parsers e invariantes, todos passaram. A suíte completa passou sequencialmente: 328 testes em 22 arquivos. Typecheck, lint e build também passaram. A primeira execução da suíte em paralelo com o build atingiu timeout em três testes UI preexistentes; a repetição sem paralelismo passou. `tests/domain/contracts.test.ts` inclui casos negativos para ticker sem ID estável, composição ambígua/peso inconsistente, evento pendente/estornado, duplicidade externa, moeda/decimal/escala, timestamp com precisão excessiva e sem fuso, ausência monetária com valor parcial, referência com possível credencial, valuation parcial e versão incompatível; também confere congelamento e preservação do input.

Correção após revisão: dois novos testes negativos falharam antes da mudança ao aceitar valor `supplied` divergente e preço original ajustado não positivo. Após a correção, os 12 testes focados passaram, assim como typecheck e lint. A comparação é decimal exata até a escala máxima do contrato; a existência e a regra de um ID de transformação ainda dependem da validação do lote/aplicação.
