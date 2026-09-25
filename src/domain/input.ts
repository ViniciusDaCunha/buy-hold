import { InputError, invalid } from './errors';
import { checkedCents, checkedQuantity, decimalRatio, marketValue, MAX_APORTE_CENTS, parseCents } from './money';
import { parseMetric, parseQualitative, parseQuote, parseValuation } from './observations';
import { parsePolicy, rate } from './policy-schema';
import { profileIds } from './profile-ids';
import { policyConventions, profiles } from './profiles';
import { parseHoldingDetails } from './holdings';
import { ageDays, civilDate, enumeration, freeze, identifier, integer, list, record, snapshot, text, unique } from './validation';

export interface AssetIssue {
  readonly ticker: string;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

function parsePortfolio(value: unknown) {
  const p = record(value, 'portfolio', ['positions', 'cashCents', 'releasedCashCents', 'reinvestmentCents']);
  const positions = list(p.positions, 'portfolio.positions', 100).map((item, i) => {
    const path = `portfolio.positions.${i}`;
    const r = record(item, path, ['ticker', 'currency', 'classId', 'profileId', 'quantity', 'targetBps']);
    return { ticker: identifier(r.ticker, `${path}.ticker`), currency: enumeration(r.currency, `${path}.currency`, ['BRL', 'USD']),
      classId: identifier(r.classId, `${path}.classId`), profileId: enumeration(r.profileId, `${path}.profileId`, profileIds),
      quantity: checkedQuantity(r.quantity, `${path}.quantity`), targetBps: integer(r.targetBps, `${path}.targetBps`, 0, 10000) };
  });
  unique(positions, p => p.ticker, 'portfolio.positions');
  const cashCents = parseCents(p.cashCents, 'portfolio.cashCents');
  const releasedCashCents = parseCents(p.releasedCashCents, 'portfolio.releasedCashCents');
  const reinvestmentCents = parseCents(p.reinvestmentCents, 'portfolio.reinvestmentCents');
  if (releasedCashCents + reinvestmentCents > cashCents) invalid('INVALID_CASH', 'portfolio', 'Liberações de caixa não podem exceder o caixa existente.');
  return { positions, cashCents, releasedCashCents, reinvestmentCents };
}

export function parseSimulationInput(value: unknown) {
  const original = snapshot(value);
  const r = record(original, '$', ['schemaVersion', 'policyVersion', 'fixtureVersion', 'scenarioId', 'analysisAsOf', 'aporteCents',
    'portfolio', 'marketSnapshot', 'qualitativeAssessments', 'providedValuations', 'policy', 'costs', 'fx', 'holdingDetails',
    'previousEligibility']);
  const schemaVersion = enumeration(r.schemaVersion, 'schemaVersion', ['1.0']);
  const policyVersion = enumeration(r.policyVersion, 'policyVersion', ['1.0']);
  const fixtureVersion = identifier(r.fixtureVersion, 'fixtureVersion');
  const scenarioId = identifier(r.scenarioId, 'scenarioId');
  const analysisAsOf = civilDate(r.analysisAsOf, 'analysisAsOf');
  const aporteCents = parseCents(r.aporteCents, 'aporteCents');
  if (aporteCents === 0n || aporteCents > MAX_APORTE_CENTS) invalid('APORTE_RANGE', 'aporteCents', 'O aporte deve estar entre R$ 0,01 e R$ 1.000.000,00.');
  const policy = parsePolicy(r.policy);
  const portfolio = parsePortfolio(r.portfolio);
  const positionsByTicker = new Map(portfolio.positions.map(p => [p.ticker, p]));
  const previousEligibility = list(r.previousEligibility === undefined ? [] : r.previousEligibility, 'previousEligibility', 100)
    .map((item, index) => {
      const path = `previousEligibility.${index}`;
      const previous = record(item, path, ['ticker', 'state', 'policyVersion']);
      const ticker = identifier(previous.ticker, `${path}.ticker`);
      if (!positionsByTicker.has(ticker)) invalid('UNKNOWN_ASSET', `${path}.ticker`, 'Estado anterior pertence a ativo fora do universo.');
      return { ticker, state: enumeration(previous.state, `${path}.state`, ['full', 'conditional', 'hold', 'watch']),
        policyVersion: identifier(previous.policyVersion, `${path}.policyVersion`) };
    });
  unique(previousEligibility, row => row.ticker, 'previousEligibility');
  for (const position of portfolio.positions) {
    if (!policy.classes.some(c => c.id === position.classId)) invalid('INVALID_TARGETS', 'portfolio.positions', 'Classe sem meta cadastrada.');
    const limit = position.profileId === 'etf-broad' ? policy.limits.etfBps : policy.limits.individualBps;
    if (position.targetBps > limit) invalid('INVALID_TARGETS', 'portfolio.positions', 'Meta de ativo excede o limite configurado.');
  }
  for (const c of policy.classes) {
    const sum = portfolio.positions.filter(p => p.classId === c.id).reduce((sum, p) => sum + p.targetBps, 0);
    if (sum !== c.targetBps) invalid('INVALID_TARGETS', 'portfolio.positions', 'Metas dos ativos devem somar a meta de sua classe.');
  }
  const costData = record(r.costs, 'costs', ['fixedCents', 'variableRate', 'fxSpread', 'remittanceCents']);
  const costs = { fixedCents: parseCents(costData.fixedCents, 'costs.fixedCents'), remittanceCents: parseCents(costData.remittanceCents, 'costs.remittanceCents'),
    variableRate: rate(costData.variableRate, 'costs.variableRate'), fxSpread: rate(costData.fxSpread, 'costs.fxSpread') };
  const issues: AssetIssue[] = [];
  const holdingData = parseHoldingDetails(r.holdingDetails, analysisAsOf, policy);
  for (const h of holdingData.holdings) {
    if (positionsByTicker.get(h.ticker)?.profileId !== 'holding') invalid('INVALID_HOLDING', 'holdingDetails', 'Proprietário deve ser posição de perfil holding.');
  }
  issues.push(...holdingData.issues);
  const market = record(r.marketSnapshot, 'marketSnapshot', ['lastTradingDate', 'quotes', 'metrics', 'exposures']);
  const lastTradingDate = civilDate(market.lastTradingDate, 'marketSnapshot.lastTradingDate');
  if (lastTradingDate > analysisAsOf) invalid('INVALID_PERIOD', 'marketSnapshot.lastTradingDate', 'Pregão posterior à análise.');

  function addIssue(ticker: string, code: string, path: string, message: string) {
    issues.push({ ticker, code, path, message });
  }
  function freshness(ticker: string, date: string, maxDays: number, path: string) {
    if (ageDays(date, analysisAsOf) > maxDays) addIssue(ticker, 'STALE_DATA', path, 'Dado vencido na data de análise.');
  }
  function localRows<T extends { ticker: string }>(data: unknown, path: string, max: number, parse: (item: unknown, path: string, asOf: string) => T, critical = false): T[] {
    const result: T[] = [];
    const seen = new Set<string>();
    list(data, path, max).forEach((item, i) => {
      const field = `${path}.${i}`;
      // Sem identificador confiável não é possível atribuir o erro a um ativo.
      const header = record(item, field, Object.keys(typeof item === 'object' && item !== null ? item : {}));
      const ticker = identifier(header.ticker, `${field}.ticker`);
      if (path === 'marketSnapshot.quotes' || path === 'providedValuations') {
        if (seen.has(ticker)) invalid('DUPLICATE', field, 'Ativo duplicado na coleção.');
        seen.add(ticker);
      }
      const position = positionsByTicker.get(ticker);
      if (!position) invalid('UNKNOWN_ASSET', `${field}.ticker`, 'Ativo fora do universo cadastrado.');
      try {
        // Verificar identidade antes do conteúdo: uma linha inválida não apaga duplicidade.
        let identity: string | undefined;
        if (path === 'marketSnapshot.metrics') {
          const period = record(header.period, `${field}.period`, ['start', 'end']);
          identity = `${ticker}/${identifier(header.ruleId, `${field}.ruleId`)}/${civilDate(period.start, `${field}.period.start`)}/${civilDate(period.end, `${field}.period.end`)}`;
        } else if (path === 'qualitativeAssessments') {
          identity = `${ticker}/${identifier(header.ruleId, `${field}.ruleId`)}`;
        } else if (path === 'marketSnapshot.exposures') {
          identity = `${ticker}/${identifier(header.sector, `${field}.sector`)}/${identifier(header.group, `${field}.group`)}`;
        }
        if (identity !== undefined) {
          if (seen.has(identity)) invalid('DUPLICATE', field, 'Identificadores duplicados.');
          seen.add(identity);
        }
        result.push(parse(item, field, analysisAsOf));
      }
      catch (error) {
        if (!(error instanceof InputError) || error.code === 'DUPLICATE' || (critical && position.quantity > 0)) throw error;
        addIssue(ticker, error.code, error.path, error.message);
      }
    });
    return result;
  }
  const quotes = localRows(market.quotes, 'marketSnapshot.quotes', 100, (item, path, asOf) => {
    const quote = parseQuote(item, path, asOf);
    if (quote.currency !== positionsByTicker.get(quote.ticker)?.currency) invalid('CURRENCY_MISMATCH', path, 'Cotação e posição devem usar a mesma moeda.');
    return quote;
  }, true);
  unique(quotes, q => q.ticker, 'marketSnapshot.quotes');
  for (const q of quotes) {
    if (q.asOf !== lastTradingDate) addIssue(q.ticker, 'STALE_DATA', 'marketSnapshot.quotes', 'Cotação não corresponde ao último pregão fornecido.');
  }
  const fx = r.fx === null ? null : (() => {
    try {
    const f = record(r.fx, 'fx', ['from', 'to', 'rate', 'asOf', 'source']);
    const asOf = civilDate(f.asOf, 'fx.asOf');
    if (asOf > analysisAsOf) invalid('INVALID_PERIOD', 'fx.asOf', 'Câmbio posterior à análise.');
    return { from: enumeration(f.from, 'fx.from', ['USD']), to: enumeration(f.to, 'fx.to', ['BRL']),
      rate: rate(f.rate, 'fx.rate', 1_000_000n, true), asOf, source: text(f.source, 'fx.source') };
    } catch (error) {
      if (!(error instanceof InputError) || portfolio.positions.some(p => p.currency === 'USD' && p.quantity > 0)) throw error;
      for (const p of portfolio.positions.filter(p => p.currency === 'USD')) addIssue(p.ticker, error.code, error.path, error.message);
      return null;
    }
  })();
  let total = portfolio.cashCents + aporteCents;
  for (const p of portfolio.positions) {
    const quote = quotes.find(q => q.ticker === p.ticker);
    if (p.quantity > 0 && !quote) invalid('MISSING_PRICE', 'marketSnapshot.quotes', 'Cotação necessária para valorar posição existente.');
    if (!quote && !issues.some(issue => issue.ticker === p.ticker && issue.path.startsWith('marketSnapshot.quotes'))) {
      addIssue(p.ticker, 'MISSING_PRICE', 'marketSnapshot.quotes', 'Cotação ausente para o candidato.');
    }
    if (p.currency === 'USD') {
      if (p.quantity > 0 && fx === null) invalid('MISSING_FX', 'fx', 'Câmbio necessário para valorar posição existente.');
      if (fx === null && !issues.some(issue => issue.ticker === p.ticker && issue.path.startsWith('fx'))) {
        addIssue(p.ticker, 'MISSING_FX', 'fx', 'Câmbio ausente para o candidato.');
      }
      if (fx !== null) freshness(p.ticker, fx.asOf, policy.validityDays.fx, 'fx.asOf');
    }
    if (quote && p.quantity > 0) total += marketValue(quote.priceCents, p.quantity, decimalRatio(p.currency === 'BRL' ? '1' : fx?.rate));
  }
  checkedCents(total, 'portfolio.totalCents');
  const metrics = localRows(market.metrics, 'marketSnapshot.metrics', 10000, parseMetric);
  unique(metrics, m => `${m.ticker}/${m.ruleId}/${m.period.start}/${m.period.end}`, 'marketSnapshot.metrics');
  for (const m of metrics) {
    const rule = policy.rules.find(rule => rule.id === m.ruleId);
    if (!rule || rule.unit !== m.unit) addIssue(m.ticker, 'METRIC_RULE_MISMATCH', 'marketSnapshot.metrics', 'Métrica sem regra ou unidade compatível.');
    const profile = positionsByTicker.get(m.ticker)?.profileId;
    if (rule && rule.profileIds.length > 0 && profile && !rule.profileIds.includes(profile)) {
      addIssue(m.ticker, 'METRIC_PROFILE_MISMATCH', 'marketSnapshot.metrics', 'Métrica incompatível com o perfil econômico.');
    }
    if (m.value === null) addIssue(m.ticker, 'MISSING_DATA', 'marketSnapshot.metrics', 'Métrica aplicável sem valor.');
    const definition = rule?.profileIds.length ? profiles.find(p => p.id === profile) : undefined;
    const usesPublication = m.basis === 'historical' || profile?.startsWith('fii-') || profile?.startsWith('etf-');
    freshness(m.ticker, usesPublication ? m.publishedOn : m.period.end,
      definition?.metricValidityDays ?? policy.validityDays.metric, 'marketSnapshot.metrics');
  }
  const qualitativeAssessments = localRows(r.qualitativeAssessments, 'qualitativeAssessments', 10000, parseQualitative);
  unique(qualitativeAssessments, q => `${q.ticker}/${q.ruleId}`, 'qualitativeAssessments');
  for (const q of qualitativeAssessments) {
    const rule = policy.rules.find(rule => rule.id === q.ruleId);
    const profile = positionsByTicker.get(q.ticker)?.profileId;
    if (rule && rule.profileIds.length > 0 && profile && !rule.profileIds.includes(profile)) {
      addIssue(q.ticker, 'METRIC_PROFILE_MISMATCH', 'qualitativeAssessments', 'Rubrica incompatível com o perfil econômico.');
    }
    if (q.score === null) addIssue(q.ticker, 'MISSING_DATA', 'qualitativeAssessments', 'Rubrica sem avaliação.');
    freshness(q.ticker, q.publishedOn, profile?.startsWith('etf-') ? policyConventions.etfValidityDays : policy.validityDays.qualitative, 'qualitativeAssessments');
  }
  const providedValuations = localRows(r.providedValuations, 'providedValuations', 100, parseValuation);
  unique(providedValuations, v => v.ticker, 'providedValuations');
  for (const v of providedValuations) {
    if (v.currency !== positionsByTicker.get(v.ticker)?.currency) addIssue(v.ticker, 'CURRENCY_MISMATCH', 'providedValuations', 'Valuation em moeda diferente da posição.');
    freshness(v.ticker, v.publishedOn, policy.validityDays.valuation, 'providedValuations');
  }
  const exposures = localRows(market.exposures, 'marketSnapshot.exposures', 10000, (item, path) => {
    const e = record(item, path, ['ticker', 'sector', 'group', 'weightBps']);
    return { ticker: identifier(e.ticker, `${path}.ticker`), sector: identifier(e.sector, `${path}.sector`), group: identifier(e.group, `${path}.group`),
      weightBps: integer(e.weightBps, `${path}.weightBps`, 0, 10000) };
  });
  unique(exposures, e => `${e.ticker}/${e.sector}/${e.group}`, 'marketSnapshot.exposures');
  for (const dimension of ['sector', 'group'] as const) {
    const targets = new Map<string, number>();
    for (const e of exposures) {
      const target = positionsByTicker.get(e.ticker)?.targetBps ?? 0;
      targets.set(e[dimension], (targets.get(e[dimension]) ?? 0) + target * e.weightBps);
    }
    const limit = dimension === 'sector' ? policy.limits.sectorBps : policy.limits.groupBps;
    if ([...targets.values()].some(target => target > limit * 10000)) invalid('INVALID_TARGETS', 'portfolio.positions', 'Metas excedem limite de exposição por setor ou grupo.');
  }
  for (const p of portfolio.positions) {
    const sum = exposures.filter(e => e.ticker === p.ticker).reduce((sum, e) => sum + e.weightBps, 0);
    if (sum > 10000) invalid('INVALID_EXPOSURE', 'marketSnapshot.exposures', 'Exposição do ativo excede 100%.');
    if (sum < 10000) addIssue(p.ticker, 'UNKNOWN_EXPOSURE', 'marketSnapshot.exposures', 'Exposição econômica incompleta.');
  }
  // snapshot já é profundamente readonly/congelado; não expandir seu tipo JSON recursivo.
  const input = freeze({ schemaVersion, policyVersion, fixtureVersion, scenarioId, analysisAsOf, aporteCents, portfolio, policy, costs, fx,
    marketSnapshot: { lastTradingDate, quotes, metrics, exposures }, qualitativeAssessments, providedValuations,
    holdingDetails: holdingData.holdings, previousEligibility });
  return Object.freeze({ input, snapshot: original, issues: freeze(issues) });
}

export type SimulationInput = ReturnType<typeof parseSimulationInput>['input'];
export type ValidatedInput = ReturnType<typeof parseSimulationInput>;
