/** Formatação sem conversão dos centavos para ponto flutuante. */
export function formatBrl(cents: bigint): string {
  const digits = cents.toString().padStart(3, '0');
  return `R$ ${digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${digits.slice(-2)}`;
}

export function formatPrice(cents: bigint, currency: 'BRL' | 'USD'): string {
  if (currency === 'BRL') return formatBrl(cents);
  const digits = cents.toString().padStart(3, '0');
  return `USD ${digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${digits.slice(-2)}`;
}

export function formatBps(bps: number): string {
  const digits = Math.abs(bps).toString().padStart(3, '0');
  return `${bps < 0 ? '-' : ''}${digits.slice(0, -2)},${digits.slice(-2)}%`;
}

export function formatScore(score: { readonly numerator: bigint; readonly denominator: bigint } | null): string {
  if (score === null) return 'Não calculada';
  const tenths = score.numerator * 10n / score.denominator;
  return `${tenths / 10n},${tenths % 10n}/100`;
}
