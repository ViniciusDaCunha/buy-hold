import { invalid } from '../src/domain/errors';
import { profiles, type ProfileRule } from '../src/domain/profiles';
import type { ProfileId } from '../src/domain/profile-ids';

export const FIXTURE_VERSION = 'synthetic-1.0';
export const ANALYSIS_AS_OF = '2026-09-14';
export const LAST_TRADING_DATE = '2026-09-11';

// Valores inventados independentemente das âncoras e das notas calculadas.
const observations: Readonly<Record<string, string>> = {
  'roic-spread': '4', 'margin-stability': '0', 'net-debt-ebitda': '1', 'interest-cover': '6', 'cash-conversion': '1.1',
  'roe-spread': '5', 'profitable-years': '100', 'cet1-headroom': '5', 'default-cover': '190', npl90: '1',
  'holding-debt-nav': '0', 'nav-discount': '30', vacancy: '2', 'real-revenue-growth': '4',
  'largest-tenant': '4', 'obligations-assets': '5', 'distribution-cover': '1.1', 'real-distribution-growth': '4',
  'default-exposure': '0', 'largest-debtor': '4', ltv: '45', 'total-fee': '0.15',
  'tracking-error': '0.4', 'annual-drag': '0', 'trading-spread': '0.08', pe: '7', pb: '0.8', 'ev-ebitda': '5',
};
const profitMultiples: Readonly<Partial<Record<ProfileId, string>>> = { bank: '8', industrial: '10', 'consumer-staples': '6' };
const auxiliaries = [
  ['comparable-years', 'count', '5'], ['normalized-profit', 'BRL', '5'], ['recurring-margin', 'percent', '15'],
  ['ebitda', 'BRL', '1000'], ['distribution-per-unit', 'BRL', '1'], ['terminal-share', 'percent', '40'],
  ['material-uncertainty', 'count', '0'], ['continuity-risk', 'count', '0'], ['capital-breach', 'count', '0'],
  ['suspended', 'count', '0'], ['fraud', 'count', '0'], ['credit-event-unreviewed', 'count', '0'],
] as const;
const etfAuxiliaries = [
  ['nav-premium', 'percent', '0.1'], ['median-spread', 'percent', '0.08'], ['underlying-market-open', 'count', '1'],
] as const;
function auxiliaryFor(profileId: ProfileId) {
  return auxiliaries.filter(([id]) => {
    if (id === 'normalized-profit') return ['industrial', 'consumer-staples', 'bank'].includes(profileId);
    if (id === 'ebitda' || id === 'recurring-margin') return ['industrial', 'consumer-staples'].includes(profileId);
    if (id === 'distribution-per-unit') return !profileId.startsWith('etf-');
    return true;
  });
}

const formulas: Readonly<Record<string, string>> = {
  'roic-spread': 'NOPAT/capital investido médio menos WACC em pp; NOPAT=EBIT ajustado*(1-taxa normalizada); WACC fictício 10% BRL.',
  'margin-stability': 'Margem EBIT recorrente atual menos mediana histórica em pp; margem recorrente positiva de 15%.',
  'net-debt-ebitda': 'Dívida financeira menos caixa não operacional, dividido por EBITDA recorrente positivo; arrendamentos inexistentes.',
  'interest-cover': 'EBIT recorrente dividido pelos juros financeiros brutos positivos.',
  'cash-conversion': 'Soma de fluxo operacional ajustado dividida pela soma de lucro recorrente positivo.',
  'roe-spread': 'Lucro recorrente atribuível/patrimônio médio positivo menos Ke fictício 10% BRL, em pp.',
  'profitable-years': '100 vezes exercícios lucrativos dividido por cinco exercícios comparáveis.',
  'cet1-headroom': 'CET1 fictício 15% menos exigência específica fictícia 10%, incluindo adicionais; não é mínimo regulatório real.',
  'default-cover': 'Provisões divididas pelo saldo de créditos inadimplentes >90 dias, vezes 100.',
  npl90: 'Créditos vencidos >90 dias divididos pela carteira bruta, vezes 100; safras documentadas na rubrica.',
  'holding-debt-nav': 'Dívida líquida própria dividida pelo valor líquido das participações, vezes 100; sem dupla contagem.',
  'nav-discount': '100*(1-preço/NAV líquido por ação); NAV líquido sintético 50 BRL por ação na holding.',
  vacancy: 'Receita potencial perdida por vacância dividida pela receita potencial total, vezes 100.',
  'real-revenue-growth': 'CAGR real da receita recorrente por cota em três anos; emissões/aquisições ajustadas.',
  'largest-tenant': 'Receita do maior locatário dividida pela receita recorrente total, vezes 100.',
  'obligations-assets': 'Dívida e aquisições parceladas divididas pelo valor dos ativos, vezes 100; calendário sintético coberto.',
  'distribution-cover': 'Resultado recorrente distribuível em 24 meses dividido pelas distribuições recorrentes; amortizações excluídas.',
  'real-distribution-growth': 'CAGR real das distribuições recorrentes por cota em três anos; amortizações e extraordinários excluídos.',
  'default-exposure': 'Saldo de créditos inadimplentes dividido pelo patrimônio líquido, vezes 100.',
  'largest-debtor': 'Exposição ao maior grupo devedor dividida pelo patrimônio líquido, vezes 100.',
  ltv: 'Saldo devedor/valor de garantia comparável; média ponderada pelo crédito; mesma modalidade e primeira prioridade.',
  'total-fee': 'Despesas anuais totais correntes divididas pelo patrimônio médio, vezes 100.',
  'tracking-error': 'Desvio padrão anualizado da diferença de retornos totais fundo/índice, três anos e mesma moeda.',
  'annual-drag': 'Retorno anual do índice menos retorno do fundo menos despesas explicadas, em pp; mesma moeda e dividendos.',
  'trading-spread': '100*(ask-bid)/mid em horário compatível com mercado subjacente aberto.',
  pe: 'Preço por ação dividido pelo lucro normalizado por ação positivo; ausência ou lucro negativo invalida o múltiplo.',
  pb: 'Preço por cota/ação dividido pelo patrimônio líquido positivo por cota/ação.',
  'ev-ebitda': 'EV ajustado por dívida, caixa e minoritários dividido por EBITDA recorrente positivo e comparável.',
};

function metadata(method: string, start = '2025-07-01', end = '2026-06-30') {
  return { period: { start, end }, publishedOn: '2026-08-10', collectedOn: ANALYSIS_AS_OF,
    source: 'fixture fictícia synthetic-1.0; nenhum dado de mercado real', method,
    adjustments: 'Moeda nominal constante; sem desdobramentos, extraordinários ou arrendamentos na amostra fictícia.' };
}
function numeric(ticker: string, ruleId: string, unit: string, value: string | null, method: string) {
  return { ticker, ruleId, unit, value, basis: 'current', sampleCount: 1, ...metadata(method) };
}
function evidence(ticker: string, profileId: ProfileId) {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return invalid('UNKNOWN_PROFILE', 'profileId', 'Perfil sem configuração.');
  const metrics: ReturnType<typeof numeric>[] = [];
  const qualitativeAssessments: {
    ticker: string; ruleId: string; score: number | null; reason: string; reviewTrigger: string;
    period: { start: string; end: string }; publishedOn: string; collectedOn: string; source: string; method: string; adjustments: string;
  }[] = [];
  for (const rule of [...profile.quality, ...profile.multiples]) {
    const ruleId = `${profileId}.${rule.id}`;
    if (rule.kind === 'qualitative') {
      qualitativeAssessments.push({ ticker, ruleId, score: 100,
        reason: `Evidência fictícia de ${rule.id}: condições favoráveis persistentes nos relatórios sintéticos de 2023–2026; obrigações cobertas e sem evento adverso.`,
        reviewTrigger: `Rever ${rule.id} se relatório fictício posterior contradizer a evidência ou surgir evento material.`,
        ...metadata(`Rubrica documentada ${rule.id}; avaliação sintética, não nota Q.`, '2023-07-01') });
      continue;
    }
    const value = rule.id === 'pe' ? profitMultiples[profileId] : observations[rule.id];
    if (value === undefined) invalid('MISSING_FIXTURE_VALUE', ruleId, 'Métrica fictícia não cadastrada.');
    const current = numeric(ticker, ruleId, rule.unit, value,
      `${formulas[rule.id] ?? rule.id} Agregado fictício ${rule.temporal === 'current' ? 'atual' : 'TTM/posição atual'}.`);
    if (['real-revenue-growth', 'real-distribution-growth', 'tracking-error', 'annual-drag'].includes(rule.id)) {
      current.period.start = '2023-07-01'; current.sampleCount = 3;
    } else if (rule.id === 'distribution-cover') {
      current.period.start = '2024-07-01'; current.sampleCount = 2;
    } else if (rule.id === 'profitable-years') {
      current.period.start = '2021-07-01'; current.sampleCount = 5;
      current.method += ' Cinco exercícios sintéticos com encerramento em junho.';
    }
    metrics.push(current);
    if (rule.temporal !== 'current') {
      const years = rule.temporal === 'risk-history' ? 3 : 5;
      metrics.push({ ...numeric(ticker, ruleId, rule.unit, value, `${formulas[rule.id] ?? rule.id} Mediana de ${years} exercícios fictícios comparáveis.`),
        basis: 'historical', sampleCount: years, period: { start: `${2026 - years}-01-01`, end: '2025-12-31' } });
    }
  }
  if (profile.purchaseSupported) {
    for (const [id, unit, value] of auxiliaryFor(profileId)) {
      metrics.push(numeric(ticker, `${profileId}.${id}`, unit, value, `Dado auxiliar fictício ${id}; sem peso em Q.`));
    }
    if (profileId === 'etf-broad') {
      for (const [id, unit, value] of etfAuxiliaries) metrics.push({
        ...numeric(ticker, `${profileId}.${id}`, unit, value, `${id} no fechamento fictício, NAV contemporâneo e mercado subjacente aberto; spread mediano de 20 pregões.`),
        period: { start: LAST_TRADING_DATE, end: LAST_TRADING_DATE }, publishedOn: LAST_TRADING_DATE,
      });
    }
  }
  return { metrics, qualitativeAssessments };
}

function policyRule(profileId: ProfileId, rule: ProfileRule) {
  return { id: `${profileId}.${rule.id}`, unit: rule.unit as string, direction: rule.direction as string,
    anchors: [...rule.anchors], weightBps: rule.weightBps, profileIds: [profileId] };
}
export function buildPolicy() {
  const rules = profiles.flatMap(p => [...p.quality, ...p.multiples].map(r => policyRule(p.id, r)));
  for (const p of profiles.filter(p => p.purchaseSupported)) {
    for (const [id, unit] of [...auxiliaryFor(p.id), ...(p.id === 'etf-broad' ? etfAuxiliaries : [])]) {
      rules.push({ id: `${p.id}.${id}`, unit, direction: 'RAW', anchors: [], weightBps: 0, profileIds: [p.id] });
    }
  }
  return { version: '1.0', classes: [{ id: 'stocks', targetBps: 3200 }, { id: 'fiis', targetBps: 2400 }, { id: 'etfs', targetBps: 3900 }],
    cashTargetBps: 500, limits: { individualBps: 1000, etfBps: 4000, sectorBps: 2500, groupBps: 1500, conditionalBps: 2000, maxPurchases: 5 },
    priceReserve: '0.005', validityDays: { metric: 150, qualitative: 180, valuation: 30, fx: 1 }, rules };
}
function base() {
  const positions: { ticker: string; profileId: ProfileId; currency: string; classId: string; quantity: number; targetBps: number }[] = [
    { ticker: 'ITUB4', profileId: 'bank', currency: 'BRL', classId: 'stocks', quantity: 1, targetBps: 800 },
    { ticker: 'BBSE3', profileId: 'holding', currency: 'BRL', classId: 'stocks', quantity: 1, targetBps: 800 },
    { ticker: 'WEGE3', profileId: 'industrial', currency: 'BRL', classId: 'stocks', quantity: 1, targetBps: 800 },
    { ticker: 'ABEV3', profileId: 'consumer-staples', currency: 'BRL', classId: 'stocks', quantity: 1, targetBps: 800 },
    { ticker: 'HGLG11', profileId: 'fii-logistics', currency: 'BRL', classId: 'fiis', quantity: 1, targetBps: 800 },
    { ticker: 'KNCR11', profileId: 'fii-credit', currency: 'BRL', classId: 'fiis', quantity: 1, targetBps: 800 },
    { ticker: 'XPML11', profileId: 'fii-shopping', currency: 'BRL', classId: 'fiis', quantity: 1, targetBps: 800 },
    { ticker: 'IVVB11', profileId: 'etf-broad', currency: 'BRL', classId: 'etfs', quantity: 1, targetBps: 3400 },
    { ticker: 'SCHD', profileId: 'etf-dividend', currency: 'USD', classId: 'etfs', quantity: 1, targetBps: 500 },
  ];
  const prices = ['4000', '3500', '5000', '3000', '6000', '4500', '5500', '8000', '1000'];
  const sectors = ['finance', 'finance', 'industry', 'staples', 'real-estate', 'real-estate', 'real-estate'];
  const data = positions.map(p => evidence(p.ticker, p.profileId));
  const quotes = positions.map((p, i) => ({ ticker: p.ticker, currency: p.currency, priceCents: prices[i] ?? '0', asOf: LAST_TRADING_DATE, source: 'cotação de fechamento fictícia synthetic-1.0' }));
  const providedValuations = positions.filter(p => !p.profileId.startsWith('etf-')).map(p => {
    const quote = quotes.find(q => q.ticker === p.ticker);
    if (!quote) return invalid('MISSING_FIXTURE_VALUE', p.ticker, 'Cotação fictícia não cadastrada.');
    const valuations: Record<string, readonly [string, string, string]> = {
      ITUB4: ['5600', '8000', '9600'], BBSE3: ['4900', '7000', '8400'], WEGE3: ['7000', '10000', '12000'],
      ABEV3: ['4200', '6000', '7200'], HGLG11: ['8400', '12000', '14400'], KNCR11: ['6300', '9000', '10800'], XPML11: ['7700', '11000', '13200'],
    };
    const valuation = valuations[p.ticker];
    if (!valuation) return invalid('MISSING_FIXTURE_VALUE', p.ticker, 'Valuation fictício não cadastrado.');
    return { ticker: p.ticker, currency: p.currency, conservativeCents: valuation[0], baseCents: valuation[1],
      favorableCents: valuation[2], provenance: 'provided_fixture',
      ...metadata(p.profileId === 'holding' ? 'Soma fictícia de participações líquida de dívida, custos, passivos e impostos; dívida não contada duas vezes.' :
        `Cenários fornecidos fictícios para ${p.profileId}; fluxos recorrentes, BRL, terminal 40%, revisão mensal; não são estimativas do motor.`),
      publishedOn: '2026-09-01' };
  });
  const exposures = positions.flatMap((p, i) => p.profileId.startsWith('etf-')
    ? ['technology', 'health', 'industry', 'staples', 'finance'].map((sector, j) => ({ ticker: p.ticker, sector, group: `SYNTH-ETF-ISSUER-${j}`, weightBps: 2000 }))
    : [{ ticker: p.ticker, sector: sectors[i] ?? 'other', group: `SYNTH-GROUP-${p.ticker}`, weightBps: 10000 }]);
  return { schemaVersion: '1.0', policyVersion: '1.0', fixtureVersion: FIXTURE_VERSION, scenarioId: 'S01', analysisAsOf: ANALYSIS_AS_OF,
    aporteCents: '50000', portfolio: { positions, cashCents: '0', releasedCashCents: '0', reinvestmentCents: '0' },
    policy: buildPolicy(), costs: { fixedCents: '0', variableRate: '0', fxSpread: '0', remittanceCents: '0' },
    fx: { from: 'USD', to: 'BRL', rate: '5', asOf: ANALYSIS_AS_OF, source: 'câmbio fictício synthetic-1.0' },
    marketSnapshot: { lastTradingDate: LAST_TRADING_DATE, quotes, metrics: data.flatMap(d => d.metrics), exposures },
    qualitativeAssessments: data.flatMap(d => d.qualitativeAssessments), providedValuations,
    holdingDetails: [{ ticker: 'BBSE3', totalValueCents: '100000', investees: [
      { id: 'SYNTH-BANK-INVESTEE', profileId: 'bank', valueCents: '100000', ...evidence('BBSE3', 'bank') },
    ] }],
  };
}
export type ScenarioInput = ReturnType<typeof base>;

function setMetric(raw: ScenarioInput, ticker: string, suffix: string, value: string | null) {
  const rows = raw.marketSnapshot.metrics.filter(m => m.ticker === ticker && m.ruleId.endsWith(`.${suffix}`));
  if (rows.length === 0) invalid('MISSING_FIXTURE_VALUE', ticker, 'Métrica do cenário não cadastrada.');
  for (const row of rows) row.value = value;
}
function cloneAsset(raw: ScenarioInput, original: string, ticker: string, targetBps: number, currency?: string) {
  const p = raw.portfolio.positions.find(p => p.ticker === original);
  const q = raw.marketSnapshot.quotes.find(q => q.ticker === original);
  if (!p || !q) invalid('MISSING_FIXTURE_VALUE', original, 'Ativo de origem inexistente.');
  p.targetBps -= targetBps;
  raw.portfolio.positions.push({ ...p, ticker, targetBps, quantity: 0, currency: currency ?? p.currency });
  raw.marketSnapshot.quotes.push({ ...q, ticker, currency: currency ?? q.currency });
  raw.marketSnapshot.metrics.push(...raw.marketSnapshot.metrics.filter(m => m.ticker === original).map(m => ({ ...m, period: { ...m.period }, ticker })));
  raw.qualitativeAssessments.push(...raw.qualitativeAssessments.filter(m => m.ticker === original).map(m => ({ ...m, period: { ...m.period }, ticker })));
  raw.providedValuations.push(...raw.providedValuations.filter(v => v.ticker === original).map(v => ({ ...v, period: { ...v.period }, ticker })));
  raw.marketSnapshot.exposures.push(...raw.marketSnapshot.exposures.filter(e => e.ticker === original).map(e => ({ ...e, ticker })));
}

/** Retorna entrada bruta nova; S07/S19/S22 são intencionalmente inválidos. */
export function buildScenario(id: string): ScenarioInput {
  if (!/^S(?:0[1-9]|1\d|2[0-4])$/.test(id)) invalid('UNKNOWN_SCENARIO', 'scenarioId', 'Use cenário S01 a S24.');
  const raw = base(); raw.scenarioId = id;
  switch (id) {
    case 'S02': raw.aporteCents = '100000'; break;
    case 'S03': raw.aporteCents = '1'; break;
    case 'S04':
      for (const v of raw.providedValuations) {
        const originalBase = BigInt(v.baseCents);
        v.conservativeCents = (originalBase / 5n).toString(); v.baseCents = (originalBase / 4n).toString(); v.favorableCents = (originalBase / 3n).toString();
      }
      setMetric(raw, 'IVVB11', 'nav-premium', '2'); break;
    case 'S05':
      for (const p of raw.portfolio.positions.filter(p => p.profileId !== 'etf-dividend')) setMetric(raw, p.ticker, 'continuity-risk', '1');
      for (const q of raw.qualitativeAssessments) { q.score = 25; q.reason = 'Fragilidade grave fictícia documentada; risco de continuidade não resolvido.'; }
      break;
    case 'S06': setMetric(raw, 'ITUB4', 'cet1-headroom', null); break;
    case 'S07': raw.marketSnapshot.quotes = raw.marketSnapshot.quotes.filter(q => q.ticker !== 'ITUB4'); break;
    case 'S08': raw.portfolio.positions[2]!.quantity = 20; break;
    case 'S09': setMetric(raw, 'WEGE3', 'roic-spread', '2.5'); break;
    case 'S10': setMetric(raw, 'WEGE3', 'normalized-profit', '-2'); setMetric(raw, 'WEGE3', 'pe', '-25'); break;
    case 'S11':
      for (const m of raw.marketSnapshot.metrics.filter(m => m.ticker === 'ITUB4')) {
        m.period = { start: m.basis === 'historical' ? '2021-01-01' : '2025-01-01', end: '2025-12-31' }; m.publishedOn = '2026-02-01';
      }
      break;
    case 'S12':
      cloneAsset(raw, 'IVVB11', 'SYNTHUSD', 1000, 'USD');
      raw.marketSnapshot.quotes.find(q => q.ticker === 'SYNTHUSD')!.priceCents = '100';
      raw.costs = { fixedCents: '10', variableRate: '0.001', fxSpread: '0.02', remittanceCents: '25' }; raw.fx.rate = '5.125'; break;
    case 'S13':
      raw.aporteCents = '1000000';
      for (const [metric, value] of Object.entries({ 'roic-spread': '0', 'margin-stability': '-2', 'net-debt-ebitda': '2.5', 'interest-cover': '3', 'cash-conversion': '0.8' })) setMetric(raw, 'WEGE3', metric, value);
      for (const q of raw.qualitativeAssessments.filter(q => q.ticker === 'WEGE3' && q.ruleId.endsWith('.sustainable-distribution'))) {
        q.score = 50; q.reason = 'Distribuição fictícia depende de premissas incertas; equilíbrio ainda inconclusivo.';
      }
      cloneAsset(raw, 'WEGE3', 'SYNTHNEW', 400); break;
    case 'S14':
      for (const p of raw.portfolio.positions.filter(p => p.classId === 'fiis')) setMetric(raw, p.ticker, 'continuity-risk', '1');
      break;
    case 'S15':
      raw.aporteCents = '300000';
      cloneAsset(raw, 'WEGE3', 'SYNTH-TIE', 400);
      raw.portfolio.positions.find(p => p.ticker === 'SYNTH-TIE')!.quantity = 1;
      raw.portfolio.positions.reverse(); raw.marketSnapshot.metrics.reverse(); raw.marketSnapshot.quotes.reverse(); break;
    case 'S19': raw.policyVersion = '99.0'; break;
    case 'S21': raw.qualitativeAssessments[0]!.source = '<script>alert("fictício")</script>'; break;
    case 'S22': raw.aporteCents = '100000001'; break;
  }
  return raw;
}
