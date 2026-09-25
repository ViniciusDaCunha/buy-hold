import { invalid } from './errors';
import { signedDecimal, type units } from './validation';

export interface ExactScore {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

type ScorableDirection = 'H' | 'L' | 'B';

export interface ScoringRule {
  readonly id: string;
  readonly direction: ScorableDirection | 'RAW';
  readonly anchors: readonly number[];
  readonly unit: typeof units[number];
}

export interface ScoreResult {
  readonly rule: Readonly<{ readonly id: string; readonly direction: ScorableDirection; readonly anchors: readonly number[]; readonly unit: typeof units[number] }>;
  readonly observedValue: string;
  readonly score: ExactScore;
}

interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function rational(numerator: bigint, denominator = 1n): Rational {
  if (denominator === 0n) invalid('INVALID_SCORE', 'score', 'Denominador de score não pode ser zero.');
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor * sign, denominator: denominator / divisor * sign };
}

function decimal(value: string): Rational {
  const match = /^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value);
  if (!match) return invalid('INVALID_DECIMAL', 'score', 'Decimal inválido para pontuação.');
  const fraction = match[3] ?? '';
  const exponent = Number(match[4] ?? '0');
  const digits = BigInt(`${match[2]}${fraction}`) * (match[1] === '-' ? -1n : 1n);
  const scale = fraction.length - exponent;
  return scale >= 0 ? rational(digits, 10n ** BigInt(scale)) : rational(digits * 10n ** BigInt(-scale));
}

function anchor(value: number, path: string): Rational {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12) invalid('INVALID_ANCHORS', path, 'Âncora numérica inválida.');
  return decimal(String(value));
}

function compare(left: Rational, right: Rational): number {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function subtract(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator);
}

function interpolate(value: Rational, from: Rational, to: Rational, fromScore: bigint, toScore: bigint): ExactScore {
  const elapsed = subtract(value, from);
  const width = subtract(to, from);
  return rational(fromScore * width.numerator * elapsed.denominator +
    (toScore - fromScore) * elapsed.numerator * width.denominator,
  width.numerator * elapsed.denominator) as ExactScore;
}

function validateRule(rule: ScoringRule): { readonly direction: ScorableDirection; readonly anchors: readonly Rational[] } {
  if (rule.direction === 'RAW') invalid('UNSCORABLE_RULE', `policy.rules.${rule.id}`, 'Dado auxiliar RAW não recebe pontuação.');
  const expected = rule.direction === 'B' ? 4 : 3;
  if (rule.anchors.length !== expected) invalid('INVALID_ANCHORS', `policy.rules.${rule.id}.anchors`, 'Quantidade de âncoras incompatível com a direção.');
  const anchors = rule.anchors.map((value, index) => anchor(value, `policy.rules.${rule.id}.anchors.${index}`));
  for (let index = 1; index < anchors.length; index++) {
    const order = compare(anchors[index - 1]!, anchors[index]!);
    const valid = rule.direction === 'B' && index === 2 ? order <= 0 : order < 0;
    if (!valid) invalid('INVALID_ANCHORS', `policy.rules.${rule.id}.anchors`, 'Âncoras fora da ordem definida pela direção.');
  }
  return { direction: rule.direction, anchors };
}

function calculate(direction: ScorableDirection, anchors: readonly Rational[], value: Rational): ExactScore {
  const zero = rational(0n) as ExactScore;
  const hundred = rational(100n) as ExactScore;
  const [a, b, c, d] = anchors;
  if (!a || !b || !c) return invalid('INVALID_ANCHORS', 'score.anchors', 'Âncoras incompletas.');

  if (direction === 'H') {
    if (compare(value, a) <= 0) return zero;
    if (compare(value, b) <= 0) return interpolate(value, a, b, 0n, 60n);
    if (compare(value, c) < 0) return interpolate(value, b, c, 60n, 100n);
    return hundred;
  }
  if (direction === 'L') {
    if (compare(value, a) <= 0) return hundred;
    if (compare(value, b) <= 0) return interpolate(value, a, b, 100n, 60n);
    if (compare(value, c) < 0) return interpolate(value, b, c, 60n, 0n);
    return zero;
  }
  if (!d) return invalid('INVALID_ANCHORS', 'score.anchors', 'Âncoras incompletas.');
  if (compare(value, a) <= 0) return zero;
  if (compare(value, b) < 0) return interpolate(value, a, b, 0n, 100n);
  if (compare(value, c) <= 0) return hundred;
  if (compare(value, d) < 0) return interpolate(value, c, d, 100n, 0n);
  return zero;
}

export function scoreRule(rule: ScoringRule, observedValue: unknown): ScoreResult {
  const validated = validateRule(rule);
  const observed = signedDecimal(observedValue, 'score.observedValue');
  const score = calculate(validated.direction, validated.anchors, decimal(observed));
  return Object.freeze({
    rule: Object.freeze({ id: rule.id, direction: validated.direction, anchors: Object.freeze([...rule.anchors]), unit: rule.unit }),
    observedValue: observed,
    score: Object.freeze(score),
  });
}

function checkedScore(score: ExactScore): ExactScore {
  if (typeof score.numerator !== 'bigint' || typeof score.denominator !== 'bigint' || score.denominator <= 0n ||
      score.numerator < 0n || score.numerator > 100n * score.denominator) {
    return invalid('INVALID_SCORE', 'score', 'Score exato fora da faixa de 0 a 100.');
  }
  return score;
}

export function scoreToNumber(score: ExactScore): number {
  const valid = checkedScore(score);
  return Number(valid.numerator) / Number(valid.denominator);
}

export function compareScore(left: ExactScore, right: ExactScore | string | number): number {
  const validLeft = checkedScore(left);
  const validRight = typeof right === 'object' ? checkedScore(right) : typeof right === 'number' ?
    anchor(right, 'score.threshold') : decimal(signedDecimal(right, 'score.threshold'));
  return compare(validLeft, validRight);
}
