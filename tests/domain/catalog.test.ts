// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { profiles } from '../../src/domain/profiles';

describe('catálogo da política fornecida', () => {
  it('contém oito aplicações suportadas e ETF de dividendos bloqueado', () => {
    expect(profiles.filter(p => p.purchaseSupported).map(p => p.id).sort()).toEqual([
      'bank', 'consumer-staples', 'etf-broad', 'fii-credit', 'fii-logistics', 'fii-shopping', 'holding', 'industrial',
    ]);
    expect(profiles.find(p => p.id === 'etf-dividend')).toMatchObject({ purchaseSupported: false, reasonCode: 'UNSUPPORTED_PURCHASE_PROFILE' });
  });
  it('fecha os pesos Q e separa qualidade de múltiplos e look-through', () => {
    expect(profiles.length).toBe(9);
    for (const p of profiles.filter(p => p.purchaseSupported)) {
      expect(p.quality.reduce((sum, r) => sum + r.weightBps, p.lookThroughWeightBps)).toBe(10000);
      for (const r of [...p.quality, ...p.multiples]) {
        expect(r.anchors).toHaveLength(3);
        expect(r.anchors[0]!).toBeLessThan(r.anchors[1]!);
        expect(r.anchors[1]!).toBeLessThan(r.anchors[2]!);
      }
    }
  });
  it('mantém faixas independentes por segmento e holding sem ROIC próprio', () => {
    expect(profiles.find(p => p.id === 'bank')?.quality.find(r => r.id === 'cet1-headroom')).toMatchObject({ anchors: [0, 2, 4], unit: 'pp', critical: true, weightBps: 1250 });
    expect(profiles.find(p => p.id === 'industrial')?.multiples.find(r => r.id === 'pe')).toMatchObject({ anchors: [10, 16, 24] });
    expect(profiles.find(p => p.id === 'consumer-staples')?.multiples.find(r => r.id === 'pe')).toMatchObject({ anchors: [12, 18, 27] });
    expect(profiles.find(p => p.id === 'holding')).toMatchObject({ lookThroughWeightBps: 8000, minimumLookThroughCoverageBps: 8000 });
    expect(profiles.find(p => p.id === 'holding')?.quality.some(r => r.id === 'roic-spread')).toBe(false);
  });
});
