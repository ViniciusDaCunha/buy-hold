import { InputError, invalid } from './errors';
import { parseCents } from './money';
import { parseMetric, parseQualitative } from './observations';
import type { Policy } from './policy-schema';
import { profileIds } from './profile-ids';
import { policyConventions, profiles } from './profiles';
import { ageDays, civilDate, enumeration, identifier, list, record, unique } from './validation';

export function parseHoldingDetails(value: unknown, asOf: string, policy: Policy) {
  const issues: { ticker: string; path: string; code: string; message: string }[] = [];
  const holdings = list(value === undefined ? [] : value, 'holdingDetails', 100).map((item, i) => {
    const path = `holdingDetails.${i}`;
    const h = record(item, path, ['ticker', 'totalValueCents', 'investees']);
    const ticker = identifier(h.ticker, `${path}.ticker`);
    const totalValueCents = parseCents(h.totalValueCents, `${path}.totalValueCents`);
    if (totalValueCents === 0n) invalid('INVALID_HOLDING', path, 'Valor total das participações deve ser positivo.');
    const investees = list(h.investees, `${path}.investees`, 100).map((item, j) => {
      const field = `${path}.investees.${j}`;
      const s = record(item, field, ['id', 'profileId', 'valueCents', 'metrics', 'qualitativeAssessments']);
      const id = identifier(s.id, `${field}.id`);
      const profileId = enumeration(s.profileId, `${field}.profileId`, profileIds);
      if (profileId === 'holding') invalid('INVALID_HOLDING', field, 'Holding recursiva exige avaliação específica; não há expansão automática.');
      function observations<T extends { ruleId: string; ticker: string }>(value: unknown, name: string, parser: (v: unknown, p: string, d: string) => T): T[] {
        const result: T[] = [];
        const seen = new Set<string>();
        for (const [k, row] of list(value, `${field}.${name}`, 1000).entries()) {
          const rowPath = `${field}.${name}.${k}`;
          try {
            const header = record(row, rowPath, Object.keys(typeof row === 'object' && row !== null ? row : {}));
            let key = identifier(header.ruleId, `${rowPath}.ruleId`);
            if (name === 'metrics') {
              const period = record(header.period, `${rowPath}.period`, ['start', 'end']);
              key += `/${civilDate(period.start, `${rowPath}.period.start`)}/${civilDate(period.end, `${rowPath}.period.end`)}`;
            }
            if (seen.has(key)) invalid('DUPLICATE', rowPath, 'Evidência duplicada da investida.');
            seen.add(key);
            const parsed = parser(row, rowPath, asOf);
            if (parsed.ticker !== ticker) invalid('INVALID_HOLDING', field, 'Evidência deve identificar a holding proprietária.');
            const rule = policy.rules.find(r => r.id === parsed.ruleId);
            if (!rule || (rule.profileIds.length > 0 && !rule.profileIds.includes(profileId)) ||
                ('unit' in parsed && parsed.unit !== rule.unit)) {
              invalid('METRIC_PROFILE_MISMATCH', field, 'Evidência incompatível com a investida.');
            }
            if (('value' in parsed && parsed.value === null) || ('score' in parsed && parsed.score === null)) {
              issues.push({ ticker, path: rowPath, code: 'MISSING_DATA', message: 'Evidência ausente da investida.' });
            }
            result.push(parsed);
          } catch (error) {
            if (!(error instanceof InputError) || error.code === 'DUPLICATE') throw error;
            issues.push({ ticker, path: error.path, code: error.code, message: error.message });
          }
        }
        return result;
      }
      const metrics = observations(s.metrics, 'metrics', parseMetric);
      const qualitativeAssessments = observations(s.qualitativeAssessments, 'qualitativeAssessments', parseQualitative);
      unique(metrics, m => `${m.ruleId}/${m.period.start}/${m.period.end}`, field);
      unique(qualitativeAssessments, q => q.ruleId, field);
      const profile = profiles.find(p => p.id === profileId);
      for (const m of metrics) {
        const publicationAge = m.basis === 'historical' || profileId.startsWith('fii-') || profileId.startsWith('etf-');
        if (ageDays(publicationAge ? m.publishedOn : m.period.end, asOf) > (profile?.metricValidityDays ?? policy.validityDays.metric)) {
          issues.push({ ticker, path: field, code: 'STALE_DATA', message: 'Métrica vencida da investida.' });
        }
      }
      for (const q of qualitativeAssessments) if (ageDays(q.publishedOn, asOf) > (profileId.startsWith('etf-') ? policyConventions.etfValidityDays : policy.validityDays.qualitative)) {
        issues.push({ ticker, path: field, code: 'STALE_DATA', message: 'Rubrica vencida da investida.' });
      }
      return { id, profileId, valueCents: parseCents(s.valueCents, `${field}.valueCents`), metrics, qualitativeAssessments };
    });
    unique(investees, s => s.id, path);
    const coveredValue = investees.reduce((sum, s) => sum + s.valueCents, 0n);
    if (coveredValue > totalValueCents) invalid('INVALID_HOLDING', path, 'Participações excedem o valor total informado.');
    if (coveredValue * 100n < totalValueCents * 80n) issues.push({ ticker, path, code: 'INSUFFICIENT_HOLDING_COVERAGE', message: 'Menos de 80% do valor das investidas identificado; cobertura das métricas exige avaliação adicional.' });
    return { ticker, totalValueCents, investees };
  });
  unique(holdings, h => h.ticker, 'holdingDetails');
  return { holdings, issues };
}
