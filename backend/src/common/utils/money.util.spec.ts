import { fromMinorUnits, toMinorUnits } from './money.util';

describe('money.util', () => {
  it('parses decimal strings and numbers into integer minor units accurately', () => {
    expect(toMinorUnits('19.99')).toBe(1999);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(toMinorUnits('99')).toBe(9900);
    expect(toMinorUnits('12.5')).toBe(1250);
  });

  it('formats minor units back into fixed two-decimal strings', () => {
    expect(fromMinorUnits(1999)).toBe('19.99');
    expect(fromMinorUnits(0)).toBe('0.00');
    expect(fromMinorUnits(9900)).toBe('99.00');
  });
});
