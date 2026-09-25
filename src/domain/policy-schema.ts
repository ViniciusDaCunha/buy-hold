import { invalid } from './errors';
import { checkedRatio, decimalRatio } from './money';
import { profileIds } from './profile-ids';
import { enumeration, identifier, integer, list, record, unique, units } from './validation';

export function rate(value: unknown, path: string, maximum = 1n, positive = false): string {
  const ratio = decimalRatio(value, path);
  checkedRatio(ratio, path, maximum, positive);
  // decimalRatio só aceita strings e já validou todos os dígitos.
  return String(value);
}

export function parsePolicy(value: unknown) {
  const p = record(value, 'policy', ['version', 'classes', 'cashTargetBps', 'limits', 'priceReserve', 'validityDays', 'rules']);
  const version = enumeration(p.version, 'policy.version', ['1.0']);
  const classes = list(p.classes, 'policy.classes', 100).map((item, i) => {
    const path = `policy.classes.${i}`;
    const c = record(item, path, ['id', 'targetBps']);
    return { id: identifier(c.id, `${path}.id`), targetBps: integer(c.targetBps, `${path}.targetBps`, 0, 10000) };
  });
  unique(classes, c => c.id, 'policy.classes');
  const cashTargetBps = integer(p.cashTargetBps, 'policy.cashTargetBps', 0, 10000);
  if (classes.reduce((sum, c) => sum + c.targetBps, cashTargetBps) !== 10000) {
    invalid('INVALID_TARGETS', 'policy.classes', 'Metas de classes e caixa devem somar 100%.');
  }
  const limits = record(p.limits, 'policy.limits', ['individualBps', 'etfBps', 'sectorBps', 'groupBps', 'conditionalBps', 'maxPurchases']);
  const validity = record(p.validityDays, 'policy.validityDays', ['metric', 'qualitative', 'valuation', 'fx']);
  const rules = list(p.rules, 'policy.rules', 1000).map((item, i) => {
    const path = `policy.rules.${i}`;
    const r = record(item, path, ['id', 'unit', 'direction', 'anchors', 'weightBps', 'profileIds']);
    const profiles = list(r.profileIds === undefined ? [] : r.profileIds, `${path}.profileIds`, 9).map((id, j) => enumeration(id, `${path}.profileIds.${j}`, profileIds));
    unique(profiles, id => id, `${path}.profileIds`);
    const direction = enumeration(r.direction, `${path}.direction`, ['H', 'L', 'B', 'RAW']);
    const anchors = list(r.anchors, `${path}.anchors`, 4).map((a, j) => {
      if (typeof a !== 'number' || !Number.isFinite(a) || Math.abs(a) > 1e12) invalid('INVALID_ANCHORS', `${path}.anchors.${j}`, 'Âncora numérica inválida.');
      return a;
    });
    if (anchors.length !== (direction === 'RAW' ? 0 : direction === 'B' ? 4 : 3) || anchors.some((a, j) => {
      const previous = anchors[j - 1];
      return previous !== undefined && (direction === 'B' && j === 2 ? previous > a : previous >= a);
    })) invalid('INVALID_ANCHORS', `${path}.anchors`, 'Âncoras fora da ordem definida pela direção.');
    if (direction === 'RAW' && r.weightBps !== 0) invalid('INVALID_WEIGHT', `${path}.weightBps`, 'Dado auxiliar não contribui para notas.');
    return { id: identifier(r.id, `${path}.id`), unit: enumeration(r.unit, `${path}.unit`, units), direction, anchors,
      weightBps: integer(r.weightBps, `${path}.weightBps`, 0, 10000), profileIds: profiles };
  });
  unique(rules, r => r.id, 'policy.rules');
  return { version, classes, cashTargetBps, rules, priceReserve: rate(p.priceReserve, 'policy.priceReserve'),
    limits: {
      individualBps: integer(limits.individualBps, 'policy.limits.individualBps', 0, 10000),
      etfBps: integer(limits.etfBps, 'policy.limits.etfBps', 0, 10000),
      sectorBps: integer(limits.sectorBps, 'policy.limits.sectorBps', 0, 10000),
      groupBps: integer(limits.groupBps, 'policy.limits.groupBps', 0, 10000),
      conditionalBps: integer(limits.conditionalBps, 'policy.limits.conditionalBps', 0, 10000),
      maxPurchases: integer(limits.maxPurchases, 'policy.limits.maxPurchases', 1, 100),
    },
    validityDays: {
      metric: integer(validity.metric, 'policy.validityDays.metric', 0, 36500),
      qualitative: integer(validity.qualitative, 'policy.validityDays.qualitative', 0, 36500),
      valuation: integer(validity.valuation, 'policy.validityDays.valuation', 0, 36500),
      fx: integer(validity.fx, 'policy.validityDays.fx', 0, 36500),
    },
  };
}

export type Policy = ReturnType<typeof parsePolicy>;
