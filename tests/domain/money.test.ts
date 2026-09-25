// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { InputError } from '../../src/domain/errors';
import { decimalRatio, marketValue, MAX_CENTS, parseBrl, parseCents, purchaseCost } from '../../src/domain/money';

describe('entrada monetária exata', () => {
  it.each([['0,01', 1n], ['500', 50000n], ['1.234,5', 123450n], [' 1.000.000,00 ', 100000000n]])('converte %s', (input, cents) => {
    expect(parseBrl(input)).toBe(cents);
  });
  it.each(['', '0', '-1', '+1', '1e3', '1.23', '12.34,00', '1,001', 'NaN', 'Infinity', '1.000.000,01', '9'.repeat(10000), null, undefined, 500])('rejeita entrada inválida #%#', (input) => {
    expect(() => parseBrl(input)).toThrow(InputError);
  });
  it('mantém inteiros acima de Number.MAX_SAFE_INTEGER e rejeita overflow', () => {
    expect(parseCents('9007199254740993')).toBe(9007199254740993n);
    expect(parseCents(MAX_CENTS.toString())).toBe(MAX_CENTS);
    for (const value of [(MAX_CENTS + 1n).toString(), 1, '-1', '01', '1.0', '1e3']) {
      expect(() => parseCents(value)).toThrow(InputError);
    }
  });
  it('informa campo e código sem devolver o valor da entrada', () => {
    expect(() => parseCents('segredo', 'portfolio.cashCents')).toThrow(expect.objectContaining({
      kind: 'validation', code: 'INVALID_MONEY', path: 'portfolio.cashCents',
    }));
  });
});

describe('FX e custos exatos', () => {
  it('fecha orçamento misto em centavos, independentemente da ordem das linhas', () => {
    const costs = { fixedCents: 10n, variableRate: decimalRatio('0.01'), fxSpread: decimalRatio('0.02'), remittanceCents: 25n };
    const lines = [
      { ticker: 'BR', currency: 'BRL' as const, quantity: 3, priceCents: 100n, ceilingCents: 101n },
      { ticker: 'US', currency: 'USD' as const, quantity: 3, priceCents: 100n, ceilingCents: 101n },
    ];
    // BRL: 316; USD: 1628, incluindo a única remessa. Orçamento: 2000.
    const result = purchaseCost(lines, costs, decimalRatio('5.125'), decimalRatio('0.005'));
    expect(result).toEqual({ principalCents: 1838n, reserveCents: 10n, feesCents: 96n, reservedTotalCents: 1944n });
    expect(2000n - result.reservedTotalCents).toBe(56n);
    expect(result.principalCents + result.reserveCents + result.feesCents + 56n).toBe(2000n);
    expect(purchaseCost([...lines].reverse(), costs, decimalRatio('5.125'), decimalRatio('0.005'))).toEqual(result);
  });
  it('faz half-up uma vez sobre a posição agregada', () => {
    expect(marketValue(1n, 1, decimalRatio('5.125'))).toBe(5n);
    expect(marketValue(1n, 4, decimalRatio('5.125'))).toBe(21n);
    expect(marketValue(1n, 1, decimalRatio('5.5'))).toBe(6n);
    expect(() => marketValue(MAX_CENTS, 2, decimalRatio('1'))).toThrow(InputError);
  });
  it.each(['1e-2', '-0.1', '0.123456789', '1000000.00000001', NaN])('limita razões %s', value => {
    expect(() => decimalRatio(value)).toThrow(InputError);
  });
  it('preserva os dígitos das razões', () => {
    const rate = decimalRatio('0.12345678');
    expect(rate.numerator * 100000000n / rate.denominator).toBe(12345678n);
  });
  it('agrega unidades, limita reserva ao teto e cobra fixo uma vez', () => {
    const costs = { fixedCents: 10n, variableRate: decimalRatio('0.01'), fxSpread: decimalRatio('0.02'), remittanceCents: 25n };
    const line = { ticker: 'TEST', currency: 'BRL' as const, quantity: 3, priceCents: 100n, ceilingCents: 101n };
    // 3 * 100 * 1,005 = 301,5 -> 302; taxa = ceil(302 * 1%) = 4.
    expect(purchaseCost([line], costs, null, decimalRatio('0.005'))).toEqual({
      principalCents: 300n, reserveCents: 2n, feesCents: 14n, reservedTotalCents: 316n,
    });
    expect(purchaseCost([{ ...line, ceilingCents: 100n }], costs, null, decimalRatio('0.005')).reservedTotalCents).toBe(313n);
    expect(purchaseCost([], costs, null, decimalRatio('0.005')).reservedTotalCents).toBe(0n);
    expect(purchaseCost([{ ...line, quantity: 0 }], costs, null, decimalRatio('0.005')).feesCents).toBe(0n);
  });
  it('cobra spread por linha USD e remessa uma vez no conjunto', () => {
    const costs = { fixedCents: 10n, variableRate: decimalRatio('0.01'), fxSpread: decimalRatio('0.02'), remittanceCents: 25n };
    const line = { ticker: 'USD1', currency: 'USD' as const, quantity: 3, priceCents: 100n, ceilingCents: 101n };
    // principal ceil(300*5,125)=1538; reservado ceil(301,5*5,125)=1546.
    // variável ceil(1546*1%)=16; spread ceil(1546*2%)=31; fixo=10; remessa=25.
    expect(purchaseCost([line], costs, decimalRatio('5.125'), decimalRatio('0.005'))).toEqual({
      principalCents: 1538n, reserveCents: 8n, feesCents: 82n, reservedTotalCents: 1628n,
    });
    expect(purchaseCost([line, { ...line, ticker: 'USD2' }], costs, decimalRatio('5.125'), decimalRatio('0.005')).feesCents).toBe(139n);
    expect(() => purchaseCost([line], costs, null, decimalRatio('0.005'))).toThrow(InputError);
    expect(() => purchaseCost([line, line], costs, decimalRatio('5'), decimalRatio('0.005'))).toThrow(InputError);
    expect(() => purchaseCost([{ ...line, ceilingCents: 99n }], costs, decimalRatio('5'), decimalRatio('0.005'))).toThrow(InputError);
  });
  it('rejeita unidades fracionárias, taxas inválidas e câmbio zero', () => {
    for (const quantity of [-1, 0.5, Number.MAX_SAFE_INTEGER, NaN]) {
      expect(() => marketValue(100n, quantity, decimalRatio('1'))).toThrow(InputError);
    }
    expect(() => marketValue(100n, 1, decimalRatio('0'))).toThrow(InputError);
    expect(() => marketValue(100n, 1, { numerator: 1n, denominator: 0n })).toThrow(InputError);
  });
});
