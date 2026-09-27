// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseSimulationInput } from '../../backend/src/domain/input';
import { inputFixture } from './input-fixture';

describe('vínculo de métricas ao perfil econômico', () => {
  it('não confunde null com campo opcional omitido', () => {
    const raw = inputFixture();
    expect(() => parseSimulationInput({ ...raw, holdingDetails: null })).toThrow();
    expect(parseSimulationInput({ ...raw, marketSnapshot: { ...raw.marketSnapshot,
      metrics: [{ ...raw.marketSnapshot.metrics[0], sampleCount: null }] } }).issues).toContainEqual(expect.objectContaining({ code: 'INVALID_INTEGER' }));
  });
  it('preserva dados auxiliares sem transformá-los em notas de qualidade', () => {
    const raw = inputFixture();
    raw.policy.rules[0] = { ...raw.policy.rules[0]!, direction: 'RAW', anchors: [], weightBps: 0 };
    expect(parseSimulationInput(raw).issues).toEqual([]);
    raw.policy.rules[0]!.weightBps = 100;
    expect(() => parseSimulationInput(raw)).toThrow();
  });
  it('preserva evidências das investidas sem aceitar Q pronto como substituto', () => {
    const raw = inputFixture(); raw.portfolio.positions[0]!.profileId = 'holding';
    const value = { ...raw, holdingDetails: [{ ticker: 'TEST', totalValueCents: '10000', investees: [
      { id: 'SYNTH-BANK', profileId: 'bank', valueCents: '10000', metrics: [], qualitativeAssessments: [] },
    ] }] };
    expect(parseSimulationInput(value).input).toHaveProperty('holdingDetails.0.investees.0.profileId', 'bank');
    expect(() => parseSimulationInput({ ...value, holdingDetails: [{ ...value.holdingDetails[0], qualityScore: 100 }] })).toThrow();
  });
  it('aceita agregado histórico identificado sem confundir seu período com balanço atual', () => {
    const raw = inputFixture();
    const historical = { ...raw.marketSnapshot.metrics[0]!, basis: 'historical', sampleCount: 5,
      period: { start: '2021-01-01', end: '2025-12-31' }, publishedOn: '2026-09-01' };
    raw.policy.validityDays.metric = 150;
    raw.marketSnapshot.metrics = [historical];
    expect(parseSimulationInput(raw).issues).toEqual([]);
  });
  it('identifica rubrica cadastrada para outro perfil', () => {
    const raw = inputFixture();
    raw.policy.rules.push({ ...raw.policy.rules[0]!, id: 'governance', profileIds: ['bank'] } as typeof raw.policy.rules[number]);
    expect(parseSimulationInput(raw).issues).toContainEqual(expect.objectContaining({ code: 'METRIC_PROFILE_MISMATCH' }));
  });
  it('sinaliza métrica industrial aplicada a banco mesmo com unidade correta', () => {
    const raw = inputFixture();
    raw.portfolio.positions[0]!.profileId = 'bank';
    raw.policy.rules = [{ ...raw.policy.rules[0]!, profileIds: ['industrial'] } as typeof raw.policy.rules[number]];
    expect(parseSimulationInput(raw).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'METRIC_PROFILE_MISMATCH', ticker: 'TEST' }),
    ]));
  });
  it.each(['unknown', 'industrial'])('valida perfil e âncoras da configuração: %s', profile => {
    const raw = inputFixture();
    raw.policy.rules = [{ ...raw.policy.rules[0]!, profileIds: [profile], anchors: profile === 'industrial' ? [3, 0, -2] : [-2, 0, 3] } as typeof raw.policy.rules[number]];
    expect(() => parseSimulationInput(raw)).toThrow();
  });
  it('rejeita versão de política desconhecida', () => {
    const raw = inputFixture(); raw.policy.version = '2.0';
    expect(() => parseSimulationInput(raw)).toThrow();
  });
});
