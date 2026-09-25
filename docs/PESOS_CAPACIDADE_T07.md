# Pesos, déficits e capacidade — T07

Data: 20/09/2026. Política fornecida v1.0; dados de teste inteiramente
fictícios. Esta etapa calcula estado e limites; não escolhe candidatos nem
quantidades, responsabilidades da T08.

## Contrato implementado

`src/domain/portfolio.ts` recebe um `SimulationInput` validado e devolve:

- origem e total do orçamento investível;
- posições, caixa e patrimônio antes do aporte;
- patrimônio pós-aporte e pós-custos;
- valores, pesos, metas, déficits e capacidades por ativo;
- valores, pesos, metas e déficits por classe e para caixa;
- exposições diretas e look-through por setor e grupo.

Valores monetários usam `bigint`. Pesos e exposições fracionárias são razões
reduzidas `numerator/denominator`, sem conversão antecipada para ponto
flutuante. Metas monetárias usam piso em centavos de
`patrimônio_pós_aporte × bps / 10.000`; o denominador e essa convenção ficam
explícitos no resultado.

## Orçamento e denominadores

O orçamento é aporte + caixa liberado + reinvestimento. Caixa liberado e
reinvestimento já pertencem ao caixa existente, portanto aumentam o orçamento
disponível, mas não o patrimônio uma segunda vez. O patrimônio pós-aporte é:

`posições a mercado + caixa existente + aporte`.

Compras simuladas apenas convertem caixa em ativo pelo valor marcado. Custos
reduzem caixa e patrimônio; o denominador pós-compra é
`patrimônio_pós_aporte − custos`. A soma dos ativos após compras com o caixa
restante coincide exatamente com esse denominador.

`analyzePortfolio` aceita opcionalmente compras já agregadas em valor de mercado
BRL e custos estimados. Esses ajustes servem à revalidação iterativa futura da
T08. A função rejeita ativo desconhecido, duplicidade e débito acima do
orçamento, mas deliberadamente pode analisar um ajuste que exceda capacidade
para reportar os limites violados; ela não é o alocador nem uma aprovação.

## Capacidade e exposições

Capacidade adicional é o menor valor não negativo entre:

- déficit restante até a meta fixa do ativo;
- folga do limite individual de 10% ou de ETF amplo de 40%;
- folgas setoriais de 25% e por grupo de 15%, considerando a participação
  econômica do ativo em cada dimensão.

As exposições do ETF são aplicadas proporcionalmente ao seu valor e não somadas
novamente ao patrimônio. Assim, uma compra de ETF que contenha 20% de finanças
reduz a capacidade posterior de uma posição financeira direta. Se a cobertura
econômica do ativo não soma 100%, `UNKNOWN_EXPOSURE` torna sua capacidade zero:
o motor não declara concentração verificada com look-through incompleto.

Posição ou exposição já acima do limite recebe capacidade zero para qualquer
aumento que agrave esse limite. O resultado não cria venda, quantidade negativa
ou erro de configuração retroativo. Metas configuradas incompatíveis com os
limites continuam sendo rejeitadas na validação de entrada, enquanto excesso
da carteira atual é um estado analisável.

Na fixture S01, as posições valem 44.500 centavos, incluindo SCHD a 5 BRL/USD;
o patrimônio pós-aporte é 94.500. As quatro ações somam 15.500, os três FIIs
16.000 e os ETFs 13.000 centavos. As unidades iguais produzem pesos diferentes
porque preços e moeda diferem.

## Evidência TDD e gates

O Red inicial apresentou 8/8 falhas pela ausência do cálculo. Foram cobertos
valoração das nove posições, FX, metas/deficits, orçamento sem dupla contagem,
posição acima do limite, custos no denominador, preservação do snapshot,
look-through incompleto e exposição indireta consumindo capacidade direta.
Dois oráculos foram corrigidos durante o Green após revisão aritmética: os FIIs
somam 16.000, não 16.500 centavos; implementação e total independente de 44.500
confirmaram o valor correto.

Verificações finais executadas com sucesso:

- `npm test`: 224 testes em onze arquivos;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`.

Não houve dependência, configuração operacional ou mudança visual. Teste e2e e
inspeção visual são N/A. Nenhuma posição de entrada é alterada e nenhuma compra
é executada ou registrada.
