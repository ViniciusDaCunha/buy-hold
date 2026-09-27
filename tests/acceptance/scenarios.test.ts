// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { scenarioExpectations } from '../../backend/fixtures/expectations';
import { buildScenario } from '../../backend/fixtures/scenarios';
import { createSha256DecisionId } from '../../backend/src/adapters/decision-id';
import { simulateContribution } from '../../backend/src/application/simulation';
import { parseSimulationInput } from '../../backend/src/domain/input';
import type { SimulationResult } from '../../backend/src/domain/result';

const dependencies = { createDecisionId: createSha256DecisionId };
const quantities = (result: SimulationResult) => Object.fromEntries(result.purchases.map(row => [row.ticker, row.quantity]));
const excluded = (result: SimulationResult, ticker: string) => result.excludedAssets.find(row => row.ticker === ticker);
const evaluation = (result: SimulationResult, ticker: string) => result.evaluations.find(row => row.ticker === ticker)!;

function assertAccounting(result: SimulationResult, raw: ReturnType<typeof buildScenario>) {
  const budget = BigInt(raw.aporteCents) + BigInt(raw.portfolio.releasedCashCents) + BigInt(raw.portfolio.reinvestmentCents);
  expect(result.principalCents + result.reserveCents + result.feesCents + result.unallocatedCents).toBe(budget);
  expect(result.purchases.reduce((sum, row) => sum + row.principal, 0n)).toBe(result.principalCents);
  expect(result.purchases.reduce((sum, row) => sum + row.reserve, 0n)).toBe(result.reserveCents);
  expect(result.purchases.reduce((sum, row) => sum + row.fees, 0n)).toBe(result.feesCents);
  expect(result.purchases.length).toBeLessThanOrEqual(5);
  expect(new Set(result.purchases.map(row => row.ticker)).size).toBe(result.purchases.length);
  for (const purchase of result.purchases) {
    expect(Number.isSafeInteger(purchase.quantity) && purchase.quantity > 0).toBe(true);
    expect(purchase.priceSnapshot).toBeLessThanOrEqual(purchase.priceLimit);
    expect(purchase.reservedTotal).toBe(purchase.principal + purchase.reserve + purchase.fees);
    expect(purchase.reasonCodes).toEqual(purchase.explanations.map(reason => reason.code));
    expect(evaluation(result, purchase.ticker).purchasedQuantity).toBe(purchase.quantity);
    const after = result.allocationsAfter.find(row => row.kind === 'asset' && row.id === purchase.ticker)!;
    if (after.limitBps !== null) {
      expect(after.weight.numerator * 10000n).toBeLessThanOrEqual(BigInt(after.limitBps) * after.weight.denominator);
    }
  }
  for (const row of result.excludedAssets) {
    expect(result.purchases.some(purchase => purchase.ticker === row.ticker)).toBe(false);
    expect(row.reasonCodes.length).toBeGreaterThan(0);
    expect(row.reasonCodes).toEqual(row.explanations.map(reason => reason.code));
  }
  for (const row of result.evaluations) {
    expect(row.reasonCodes).toEqual(row.explanations.map(reason => reason.code));
    expect(row.explanations.every(reason => reason.message && reason.reviewTrigger)).toBe(true);
  }
  for (const row of result.allocationsBefore.filter(row => ['asset', 'class', 'cash'].includes(row.kind))) {
    expect(result.allocationsAfter.some(after => after.kind === row.kind && after.id === row.id)).toBe(true);
    expect(result.allocationsTarget.some(target => target.kind === row.kind && target.id === row.id)).toBe(true);
  }
  expect(result.purchases.some(row => row.ticker === 'SCHD')).toBe(false);
}

describe('aceitação integrada S01–S24', () => {
  it.each(scenarioExpectations)('$id: $expected', async expected => {
    const raw = buildScenario(expected.id);
    const original = JSON.stringify(raw);
    if (['S07', 'S19', 'S22'].includes(expected.id) && 'errorCode' in expected) {
      expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: expected.errorCode }));
      expect(JSON.stringify(raw)).toBe(original);
      return;
    }
    const parsed = parseSimulationInput(raw);
    const result = await simulateContribution(parsed, dependencies);
    expect(JSON.stringify(raw)).toBe(original);
    expect(result).toMatchObject({ schemaVersion: '1.0', simulation: true,
      decisionId: expect.stringMatching(/^sha256:[0-9a-f]{64}$/), snapshots: [parsed.snapshot] });
    assertAccounting(result, raw);
    if ('budgetCents' in expected) {
      expect(result.principalCents + result.reserveCents + result.feesCents + result.unallocatedCents)
        .toBe(BigInt(expected.budgetCents));
    }
    if ('purchaseCount' in expected) expect(result.purchases).toHaveLength(expected.purchaseCount);

    switch (expected.id) {
      case 'S01':
      case 'S17':
      case 'S18':
      case 'S20':
      case 'S21':
      case 'S23':
      case 'S24':
        expect(quantities(result)).toEqual({ ABEV3: 1, BBSE3: 1, IVVB11: 2 });
        expect(result.principalCents).toBe(22500n);
        expect(result.reserveCents).toBe(41n);
        expect(result.unallocatedCents).toBe(27459n);
        break;
      case 'S02':
        expect(quantities(result)).toEqual({ ABEV3: 2, BBSE3: 2, IVVB11: 5, KNCR11: 1, XPML11: 1 });
        expect(result.unallocatedCents).toBe(36864n);
        break;
      case 'S03':
      case 'S04':
      case 'S05':
        expect(result.unallocatedCents).toBe(BigInt(raw.aporteCents));
        if (expected.id === 'S04') expect(excluded(result, 'WEGE3')?.reasonCodes).toContain('PRICE_ABOVE_CEILING');
        if (expected.id === 'S05') expect(evaluation(result, 'WEGE3').purchaseEligible).toBe(false);
        break;
      case 'S06':
        expect(parsed.issues).toContainEqual(expect.objectContaining({ ticker: 'ITUB4', code: 'MISSING_DATA' }));
        expect(excluded(result, 'ITUB4')?.reasonCodes).toContain('MISSING_CRITICAL_SOLVENCY_DATA');
        expect(result.purchases.length).toBeGreaterThan(0);
        break;
      case 'S08':
        expect(quantities(result).WEGE3).toBeUndefined();
        expect(raw.portfolio.positions.find(row => row.ticker === 'WEGE3')?.quantity).toBe(20);
        break;
      case 'S09': {
        const score = evaluation(result, 'WEGE3').evidence.find(row => row.ruleId.endsWith('.roic-spread'))?.score;
        expect(score).toEqual({ numerator: 280n, denominator: 3n });
        break;
      }
      case 'S10':
        expect(evaluation(result, 'WEGE3').evidence.some(row => row.observedValue === '-25' && row.score === null)).toBe(true);
        expect(evaluation(result, 'WEGE3').reasonCodes).toContain('NON_POSITIVE_NORMALIZED_PROFIT');
        break;
      case 'S11':
        expect(parsed.issues).toContainEqual(expect.objectContaining({ ticker: 'ITUB4', code: 'STALE_DATA' }));
        expect(evaluation(result, 'ITUB4').purchaseEligible).toBe(false);
        break;
      case 'S12':
        expect(result.purchases.find(row => row.ticker === 'SYNTHUSD')).toMatchObject({ currency: 'USD', conversion: '5.125' });
        expect(result.feesCents).toBeGreaterThanOrEqual(25n);
        break;
      case 'S13':
        expect(quantities(result).SYNTHNEW).toBeUndefined();
        expect(evaluation(result, 'SYNTHNEW').qualityScore).toEqual({ numerator: 72n, denominator: 1n });
        expect(evaluation(result, 'SYNTHNEW').reasonCodes).toContain('CONDITIONAL_NEW_POSITION');
        expect(result.purchases.filter(row => evaluation(result, row.ticker).eligibilityState === 'conditional')
          .reduce((sum, row) => sum + row.reservedTotal, 0n) * 5n).toBeLessThanOrEqual(BigInt(raw.aporteCents));
        break;
      case 'S14':
        expect(result.purchases.some(row => raw.portfolio.positions.find(position => position.ticker === row.ticker)?.classId === 'fiis')).toBe(false);
        break;
      case 'S15': {
        const reverse = buildScenario('S15');
        reverse.portfolio.positions.reverse(); reverse.marketSnapshot.quotes.reverse();
        reverse.marketSnapshot.metrics.reverse(); reverse.qualitativeAssessments.reverse();
        const reordered = await simulateContribution(parseSimulationInput(reverse), dependencies);
        expect(reordered.decisionId).toBe(result.decisionId);
        expect(reordered.purchases).toEqual(result.purchases);
        break;
      }
      case 'S16':
        expect(excluded(result, 'SCHD')?.reasonCodes).toContain('UNSUPPORTED_PURCHASE_PROFILE');
        expect(result.allocationsBefore.find(row => row.kind === 'asset' && row.id === 'SCHD')?.valueCents).toBe(5000n);
        break;
      default:
        break;
    }
    if (expected.id === 'S21') expect(JSON.stringify(result.snapshots)).toContain('<script>alert(\\"fictício\\")</script>');
    if (expected.id === 'S20') {
      const repeated = await simulateContribution(parseSimulationInput(buildScenario('S20')), dependencies);
      expect(repeated).toEqual(result);
    }
  });
});
