import { invalid } from './errors';

export const MAX_CENTS = 10n ** 24n - 1n;
export const MAX_APORTE_CENTS = 100_000_000n;
export type Currency = 'BRL' | 'USD';
export interface Ratio { readonly numerator: bigint; readonly denominator: bigint }
export interface Costs {
  readonly fixedCents: bigint;
  readonly variableRate: Ratio;
  readonly fxSpread: Ratio;
  readonly remittanceCents: bigint;
}
export interface PurchaseLine {
  readonly ticker: string;
  readonly currency: Currency;
  readonly quantity: number;
  readonly priceCents: bigint;
  readonly ceilingCents: bigint;
}
export function checkedCents(value: bigint, path = 'money'): bigint {
  if (typeof value !== 'bigint' || value < 0n || value > MAX_CENTS) {
    invalid('MONEY_RANGE', path, 'Valor monetário fora do limite suportado.');
  }
  return value;
}

export function parseCents(value: unknown, path = 'money'): bigint {
  if (typeof value !== 'string' || value.length > 24 || !/^(0|[1-9]\d*)$/.test(value)) {
    invalid('INVALID_MONEY', path, 'Informe centavos como inteiro decimal não negativo.');
  }
  return checkedCents(BigInt(value), path);
}

export function parseBrl(value: unknown): bigint {
  if (typeof value !== 'string' || value.length > 32) {
    invalid('INVALID_APORTE', 'aporte', 'Informe um aporte em reais com até duas casas decimais.');
  }
  const input = value.trim();
  if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(input)) {
    invalid('INVALID_APORTE', 'aporte', 'Use vírgula decimal e pontos somente para milhares.');
  }
  const [integer = '', fraction = ''] = input.replaceAll('.', '').split(',');
  const cents = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents <= 0n || cents > MAX_APORTE_CENTS) {
    invalid('APORTE_RANGE', 'aporte', 'O aporte deve estar entre R$ 0,01 e R$ 1.000.000,00.');
  }
  return cents;
}

export function decimalRatio(value: unknown, path = 'rate'): Ratio {
  if (typeof value !== 'string' || value.length > 16 || !/^(0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value)) {
    invalid('INVALID_RATE', path, 'Informe razão decimal positiva ou zero, com até oito casas.');
  }
  const [integer = '', fraction = ''] = value.split('.');
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(integer + fraction);
  if (numerator > 1_000_000n * denominator) invalid('RATE_RANGE', path, 'Razão acima do limite suportado.');
  return { numerator, denominator };
}

export function checkedRatio(value: Ratio, path: string, maximum = 1_000_000n, positive = false): Ratio {
  if (typeof value.numerator !== 'bigint' || typeof value.denominator !== 'bigint' ||
      value.denominator <= 0n || value.denominator > 100_000_000n ||
      value.numerator < 0n || value.numerator > maximum * value.denominator ||
      (positive && value.numerator === 0n)) {
    invalid('INVALID_RATE', path, 'Razão fora dos limites ou denominador inválido.');
  }
  return value;
}

export function checkedQuantity(value: unknown, path = 'quantity'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) {
    invalid('INVALID_QUANTITY', path, 'Informe unidades inteiras de zero a um bilhão.');
  }
  return value;
}

function ceil(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function marketValue(price: bigint, quantity: number, fx: Ratio): bigint {
  checkedCents(price, 'priceCents');
  if (price === 0n) invalid('INVALID_PRICE', 'priceCents', 'Preço deve ser positivo.');
  checkedQuantity(quantity);
  checkedRatio(fx, 'fx', 1_000_000n, true);
  const numerator = price * BigInt(quantity) * fx.numerator;
  return checkedCents((2n * numerator + fx.denominator) / (2n * fx.denominator));
}

/** Recalcular com linhas agregadas: não somar custos de tentativas de alocação. */
export function purchaseCost(lines: readonly PurchaseLine[], costs: Costs, fx: Ratio | null, reserve: Ratio) {
  checkedCents(costs.fixedCents, 'costs.fixedCents');
  checkedCents(costs.remittanceCents, 'costs.remittanceCents');
  checkedRatio(costs.variableRate, 'costs.variableRate', 1n);
  checkedRatio(costs.fxSpread, 'costs.fxSpread', 1n);
  checkedRatio(reserve, 'reserve', 1n);
  if (fx !== null) checkedRatio(fx, 'fx', 1_000_000n, true);
  if (lines.length > 100) invalid('TOO_MANY_ASSETS', 'lines', 'Máximo de 100 ativos.');
  const seen = new Set<string>();
  let principalCents = 0n;
  let reservedCents = 0n;
  let feesCents = 0n;
  let hasUsd = false;
  for (const line of lines) {
    if (seen.has(line.ticker)) invalid('DUPLICATE', 'lines', 'Agregue as unidades por ativo.');
    seen.add(line.ticker);
    checkedQuantity(line.quantity);
    checkedCents(line.priceCents, 'priceCents');
    checkedCents(line.ceilingCents, 'ceilingCents');
    if (line.priceCents === 0n || line.ceilingCents < line.priceCents) {
      invalid('INVALID_PRICE', 'priceCents', 'Preço inválido ou acima do teto.');
    }
    if (line.currency !== 'BRL' && line.currency !== 'USD') invalid('INVALID_CURRENCY', 'currency', 'Moeda sem suporte.');
    if (line.quantity === 0) continue;
    const conversion = line.currency === 'USD' ? fx : { numerator: 1n, denominator: 1n };
    if (conversion === null) invalid('MISSING_FX', 'fx', 'Câmbio necessário para compra em USD.');
    const quantity = BigInt(line.quantity);
    const desired = line.priceCents * (reserve.denominator + reserve.numerator);
    const ceiling = line.ceilingCents * reserve.denominator;
    const limit = desired < ceiling ? desired : ceiling;
    const principal = ceil(line.priceCents * quantity * conversion.numerator, conversion.denominator);
    const reserved = ceil(limit * quantity * conversion.numerator, reserve.denominator * conversion.denominator);
    principalCents += principal;
    reservedCents += reserved;
    feesCents += costs.fixedCents + ceil(reserved * costs.variableRate.numerator, costs.variableRate.denominator);
    if (line.currency === 'USD') {
      hasUsd = true;
      feesCents += ceil(reserved * costs.fxSpread.numerator, costs.fxSpread.denominator);
    }
  }
  if (hasUsd) feesCents += costs.remittanceCents;
  checkedCents(reservedCents + feesCents);
  return { principalCents, reserveCents: reservedCents - principalCents, feesCents, reservedTotalCents: reservedCents + feesCents };
}
