import { freeze } from '../src/domain/validation';

/** Oráculos escritos a partir de TASK §5 e contas manuais; nunca saída do motor. */
export const scenarioExpectations = freeze([
  { id: 'S01', expected: 'Proposta válida, orçamento fechado; SCHD sem compra.', budgetCents: '50000', initialMarketValueCents: '44500' },
  { id: 'S02', expected: 'Recalcular com R$ 1.000; não duplicar a proposta anterior.', budgetCents: '100000' },
  { id: 'S03', expected: 'Nenhuma unidade cabe; saldo integral.', budgetCents: '1', purchaseCount: 0, unallocatedCents: '1' },
  { id: 'S04', expected: 'Ações/FIIs acima do valor-base; ETF com prêmio de execução 2%; nenhuma compra.', purchaseCount: 0 },
  { id: 'S05', expected: 'Risco de continuidade nos perfis suportados; nenhum menos ruim é aprovado.', purchaseCount: 0 },
  { id: 'S06', expected: 'CET1 de ITUB4 ausente; bloqueio local de solvência, demais analisáveis.', issue: 'MISSING_DATA', ticker: 'ITUB4' },
  { id: 'S07', expected: 'Cotação necessária de ITUB4 ausente; sem proposta.', errorCode: 'MISSING_PRICE' },
  { id: 'S08', expected: 'WEGE3 excede 10% mesmo após aporte; não aumentar nem vender automaticamente.', ticker: 'WEGE3', maximumPurchasedQuantity: 0 },
  { id: 'S09', expected: 'ROIC−WACC 2,5 pp produz nota 280/3; proximidade não exclui.', ticker: 'WEGE3', metricScoreNumerator: 280, metricScoreDenominator: 3 },
  { id: 'S10', expected: 'Lucro por ação −2 e P/L −25 tornam o múltiplo inaplicável, nunca barato.', ticker: 'WEGE3' },
  { id: 'S11', expected: 'Balanço e histórico de ITUB4 vencidos; bloquear aporte do ativo.', ticker: 'ITUB4', issue: 'STALE_DATA' },
  { id: 'S12', expected: 'USD sintético suportado, FX 5,125 e custos não nulos; remessa única; SCHD bloqueado.' },
  { id: 'S13', expected: 'WEGE3 e SYNTHNEW têm Q=72; só posição existente pode receber condicional, conjunto ≤20%.', qualityScore: 72, prohibitedNewTicker: 'SYNTHNEW', conditionalBudgetBps: 2000 },
  { id: 'S14', expected: 'FIIs sem elegíveis; preservar parcela da classe em caixa.', emptyClass: 'fiis' },
  { id: 'S15', expected: 'WEGE3 e SYNTH-TIE empatam em qualidade, custos e déficit; comparar com ordem invertida.', compare: 'reverse-input-order', tieWinner: 'SYNTH-TIE' },
  { id: 'S16', expected: 'SCHD vale 5000 centavos BRL e não recebe compras.', ticker: 'SCHD', marketValueCents: '5000', reasonCode: 'UNSUPPORTED_PURCHASE_PROFILE' },
  { id: 'S17', expected: 'Mesma proposta nas duas interfaces.', compare: 'cli-browser' },
  { id: 'S18', expected: 'Editar aporte para 100000; resolver nova execução antes da antiga; resultado novo prevalece.', nextAporteCents: '100000', completionOrder: ['new', 'old'] },
  { id: 'S19', expected: 'Versão 99.0 não suportada; sem proposta.', errorCode: 'INVALID_ENUM' },
  { id: 'S20', expected: 'Reexecutar e exportar a mesma entrada sem mutação; identidade e centavos iguais.', compare: 'repeat-export' },
  { id: 'S21', expected: 'Origem com script permanece texto; não executar.' },
  { id: 'S22', expected: 'Rejeitar aporte excessivo, JSON inválido e texto acima de 1 MiB.', errorCode: 'APORTE_RANGE', variants: ['money', 'json', 'bytes'] },
  { id: 'S23', expected: 'Duas publicações ao mesmo destino: uma vence, outra falha sem sobrescrever; falha intermediária não publica parcial.', actions: ['concurrent-same-destination', 'fail-before-publication'] },
  { id: 'S24', expected: 'Falha operacional controlada traz código/etapa/versões, sem stack ou segredo.', errorCode: 'OPERATION_FAILED', faultStage: 'export' },
]);

export const boundaryCases = freeze({
  malformedJson: '{', oversizedJson: ' '.repeat(1048577),
  operationErrorMessage: 'Falha sintética privada; não exibir ao usuário.',
  sameDestination: 'proposta-sintetica.json',
});
