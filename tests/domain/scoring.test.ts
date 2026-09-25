// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { InputError } from '../../src/domain/errors';
import { compareScore, scoreRule, scoreToNumber } from '../../src/domain/scoring';
import { buildScenario } from '../../fixtures/scenarios';
import { parseSimulationInput } from '../../src/domain/input';

const rule = (id: string, direction: 'H' | 'L' | 'B', anchors: readonly number[]) =>
  ({ id, direction, anchors, unit: 'ratio' as const });

describe('pontuação contínua H', () => {
  const h = rule('roic-spread', 'H', [-2, 0, 3]);

  it.each([
    ['-3', 0], ['-2', 0], ['-1', 30], ['0', 60], ['1.5', 80], ['3', 100], ['30', 100],
  ])('pontua %s nas âncoras, intervalos e saturações', (observed, expected) => {
    expect(scoreToNumber(scoreRule(h, observed).score)).toBe(expected);
  });

  it('preserva 2,5 como fração exata 280/3 e referencia a regra', () => {
    const result = scoreRule(h, '2.5');
    expect(result).toEqual({
      rule: { id: 'roic-spread', direction: 'H', anchors: [-2, 0, 3], unit: 'ratio' },
      observedValue: '2.5', score: { numerator: 280n, denominator: 3n },
    });
    expect(scoreToNumber(result.score)).toBeCloseTo(93.33333333333333, 12);
    expect(compareScore(result.score, 93)).toBeGreaterThan(0);
    expect(compareScore(result.score, 94)).toBeLessThan(0);
  });

  it('é contínua nas âncoras e monotônica em uma malha', () => {
    const epsilon = '0.00000001';
    expect(scoreToNumber(scoreRule(h, `-${epsilon}`).score)).toBeCloseTo(59.9999997, 7);
    expect(scoreToNumber(scoreRule(h, epsilon).score)).toBeCloseTo(60.00000013333333, 7);
    const scores = ['-3', '-2', '-1', '0', '1', '2', '3', '4'].map(value => scoreRule(h, value).score);
    for (let i = 1; i < scores.length; i++) expect(compareScore(scores[i]!, scores[i - 1]!)).toBeGreaterThanOrEqual(0);
  });
});

describe('pontuação contínua L', () => {
  const l = rule('debt', 'L', [1.5, 2.5, 4]);

  it.each([
    ['-5', 100], ['1.5', 100], ['1.8', 88], ['2.5', 60], ['3.25', 30], ['4', 0], ['10', 0],
  ])('pontua %s sem penalizar excelência abaixo da faixa', (observed, expected) => {
    expect(scoreToNumber(scoreRule(l, observed).score)).toBe(expected);
  });

  it('é monotônica decrescente', () => {
    const scores = ['-1', '1.5', '1.8', '2.5', '3', '4', '8'].map(value => scoreRule(l, value).score);
    for (let i = 1; i < scores.length; i++) expect(compareScore(scores[i]!, scores[i - 1]!)).toBeLessThanOrEqual(0);
  });
});

describe('pontuação contínua B', () => {
  const b = rule('interval', 'B', [0, 1, 2, 4]);

  it.each([
    ['-1', 0], ['0', 0], ['0.5', 50], ['1', 100], ['1.5', 100], ['2', 100], ['3', 50], ['4', 0], ['5', 0],
  ])('pontua %s com platô e duas transições', (observed, expected) => {
    expect(scoreToNumber(scoreRule(b, observed).score)).toBe(expected);
  });

  it('aceita platô de largura zero e mantém continuidade', () => {
    const point = rule('point-target', 'B', [0, 1, 1, 2]);
    expect(scoreToNumber(scoreRule(point, '0.99999999').score)).toBeCloseTo(99.999999, 6);
    expect(scoreToNumber(scoreRule(point, '1').score)).toBe(100);
    expect(scoreToNumber(scoreRule(point, '1.00000001').score)).toBeCloseTo(99.999999, 6);
  });
});

describe('contrato numérico de score', () => {
  it('pontua a evidência S09 pela regra versionada e mantém sua referência', () => {
    const input = parseSimulationInput(buildScenario('S09')).input;
    const metric = input.marketSnapshot.metrics.find(row => row.ticker === 'WEGE3' &&
      row.ruleId === 'industrial.roic-spread' && row.basis === 'current')!;
    const configuredRule = input.policy.rules.find(row => row.id === metric.ruleId)!;
    const result = scoreRule(configuredRule, metric.value);
    expect(result.score).toEqual({ numerator: 280n, denominator: 3n });
    expect(result.rule).toEqual({ id: configuredRule.id, direction: 'H', anchors: [-2, 0, 3], unit: 'pp' });
  });

  it.each(['', 'NaN', 'Infinity', '1e3', '0.123456789', '9'.repeat(25), null, 2.5])('rejeita observação inválida #%#', value => {
    expect(() => scoreRule(rule('x', 'H', [0, 1, 2]), value)).toThrow(InputError);
  });

  it('rejeita regra RAW e regra inválida na chamada direta', () => {
    expect(() => scoreRule({ id: 'raw', direction: 'RAW', anchors: [], unit: 'count' }, '1')).toThrow(expect.objectContaining({ code: 'UNSCORABLE_RULE' }));
    expect(() => scoreRule(rule('bad', 'H', [0, 0, 1]), '1')).toThrow(expect.objectContaining({ code: 'INVALID_ANCHORS' }));
    expect(() => scoreRule(rule('bad', 'B', [0, 2, 1, 3]), '1')).toThrow(expect.objectContaining({ code: 'INVALID_ANCHORS' }));
  });

  it('compara exatamente sem classificar pela nota arredondada', () => {
    const score = scoreRule(rule('x', 'H', [0, 0.3, 0.9]), '0.6').score;
    expect(score).toEqual({ numerator: 80n, denominator: 1n });
    expect(compareScore(score, '79.99999999')).toBeGreaterThan(0);
    expect(compareScore(score, '80')).toBe(0);
    expect(compareScore(score, '80.00000001')).toBeLessThan(0);
  });
});
