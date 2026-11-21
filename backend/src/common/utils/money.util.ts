/**
 * Parses a decimal string/number/Prisma Decimal into integer minor units (cents)
 * using string parsing to avoid IEEE-754 floating-point precision loss.
 */
export function toMinorUnits(value: string | number | { toString(): string }): number {
  const raw = typeof value === 'number' ? value.toFixed(2) : value.toString().trim();
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholePart = '0', fracPart = ''] = unsigned.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);
  const cents = Number(wholePart) * 100 + Number(paddedFrac);
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Invalid monetary value: ${raw}`);
  }
  return negative ? -cents : cents;
}

/**
 * Formats integer minor units (cents) back to a fixed 2-decimal string for Prisma Decimal.
 */
export function fromMinorUnits(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}
