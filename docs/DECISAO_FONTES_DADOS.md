# Decisão de fontes de dados — integração de leitura

Versão 1.2 · 01/11/2026

Status: **INT-01 concluída; resultado no-go para fontes de preço/fundamentos na recomendação real; nenhuma fonte homologada**

Evidências por campo, limites e bloqueios: [`VIABILIDADE_FONTES_INT01.md`](VIABILIDADE_FONTES_INT01.md).

## Roteamento e decisão atual

| Ativo/campo | Provedor / endpoint candidato | Plano e permissão observados | Estado |
|---|---|---|---|
| ITUB4, BBSE3, WEGE3, ABEV3 — preço atual | bolsai `/stocks/{ticker}/quote` | HTTP 200 em 4/4. Schema inclui OHLCV, `ticker`, `trade_date`; não inclui moeda, identidade estável nem timestamp da observação. | **No-go** para recomendação real até moeda, frescor, identidade e licença/retenção serem comprovados. |
| Mesmas ações — histórico | bolsai `/stocks/{ticker}/history` | HTTP 403 em 4/4 para a chave/plano usado; documentação marca a rota PRO e a página comercial diverge. | **Bloqueado**; sem histórico disponível no plano testado. |
| Mesmas ações — fundamentos/demonstrações | bolsai `/fundamentals/{ticker}`, `/financials/{ticker}` | Fundamentos HTTP 200 em 4/4, nulabilidade variável e `cvm_code`; demonstrações HTTP 403 em 4/4. Unidade/moeda e identidade estável não resolvidas. | **No-go** até semântica por campo, métricas setoriais, demonstrações e licença serem comprovadas. |
| Mesmas ações — proventos | bolsai `/dividends/{ticker}` | HTTP 403 em 4/4 para a chave/plano usado. | **Bloqueado**; anúncio/pagamento não equivale a caixa recebido. |
| HGLG11, KNCR11, XPML11 — preço/perfil/histórico/distribuições | bolsai `/fiis/{ticker}`, `/fiis/{ticker}/history`, `/fiis/{ticker}/distributions` | Perfil HTTP 200 em 3/3, histórico e distribuição HTTP 403 em 3/3. Perfil sem moeda/ID próprio do fundo; CNPJ retornado identifica administrador e datas/nulos variam. | **No-go**; cobertura insuficiente, identidade/licença/retenção pendentes. |
| FIIs — look-through/relatórios | CVM dataset FII estruturado e perfil bolsai | CVM ODbL, arquivo dos últimos cinco anos, atualização semanal com reapresentações; não é feed de preço. Amostra bolsai inclui imóveis/indicadores com datas potencialmente diferentes. | **Parcial** como fonte regulatória; não comprova composição/look-through completo ou atualidade da política. |
| SCHD — preço/histórico/ETF/proventos/holdings | FMP `/quote`, `/historical-price-eod/full`, `/etf/info`, `/dividends`, `/etf/holdings` | Planos públicos variam por endpoint. Termos consultados vedam cópia/download e integração sem aprovação escrita. API não chamada. | **No-go** até consentimento escrito específico; chave não utilizada. |
| SCHD — identidade e dado oficial do fundo | Schwab Asset Management | Fonte oficial informa CUSIP 808524797, expense ratio 0,060%, holdings e distribuições com datas. Direito de ingestão/retenção pelo aplicativo ainda não foi confirmado. | Evidência documental complementar; sem substituir FMP ou prova de retorno total. |
| USD/BRL — referência | BCB/PTAX `CotacaoDolarDia` | API pública, ODbL; consulta de 30/10/2026 retornou HTTP 200 com compra/venda e timestamp de seis casas fracionárias sem offset. | **Candidato viável apenas para referência**, após definir fuso e parser sem truncamento. Não é taxa executável. |
| USD/BRL — taxa executável | Nenhuma | PTAX não é cotação executável; não há corretora/câmbio configurados. | **Não disponível**; não substituir por preço cambial de outro provedor. |
| Importação de operações executadas | Nenhum provedor de corretora homologado | Não houve conta, API, autorização ou arquivo de extrato avaliado. | **Não habilitada neste marco**; manter lançamento manual e revisão explícita em INT-06. |

## Regras de uso e fallback

- Bolsai e FMP têm escopos distintos; não são substitutos globais. Nenhum fallback foi aprovado por par campo/fonte.
- Fonte oficial documental (CVM, BCB ou Schwab) só pode substituir um campo de API se houver equivalência provada de definição, unidade, moeda, período, ajuste, timestamp e licença. Por enquanto serve para verificação/documentação nos casos descritos, não fallback automático.
- FMP permanece no-go para cópia/retenção na aplicação sem consentimento escrito específico. Bolsai permanece não homologada enquanto seus termos e a permissão para exibição/armazenamento não forem confirmados.
- B3 exige a licença de market data aplicável ao caso de uso; a página pública, um arquivo aberto ou um atraso de cotação não prova autorização para ingestão e retenção no produto.
- A resposta da PTAX contém `dataHoraCotacao` como string sem offset e com seis casas fracionárias. Não converter por `Date.parse` com perda silenciosa de precisão nem inferir timezone; resolver com documentação do schema e contrato canônico.
- Dados ausentes, vencidos, não licenciados, sem identidade estável ou com timestamp/fórmula não confirmados bloqueiam o campo/ativo. Não usar fixtures como fallback de recomendação real.
- Nenhum dado de evento/provento de provedor comprova recebimento em carteira. Importação/reconciliação continua separada da integração de mercado.

## Referências e acompanhamento

Detalhes de autenticação, planos/preços observados, semânticas, datas, status HTTP por ticker/campo e bloqueios remanescentes estão em [`docs/VIABILIDADE_FONTES_INT01.md`](VIABILIDADE_FONTES_INT01.md). A decisão só muda após nova prova documental e técnica; alterações devem preservar a evidência desta versão.
