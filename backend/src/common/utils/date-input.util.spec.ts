import { normalizeOptionalDateInput, normalizeOptionalDateStringInput } from './date-input.util';

describe('normalizeOptionalDateInput', () => {
  it('converts date-only strings into Date instances', () => {
    expect(normalizeOptionalDateInput('2026-03-23')?.toISOString()).toBe('2026-03-23T00:00:00.000Z');
  });

  it('returns undefined for empty input', () => {
    expect(normalizeOptionalDateInput('')).toBeUndefined();
    expect(normalizeOptionalDateInput(undefined)).toBeUndefined();
  });

  it('normalizes flexible date formats into YYYY-MM-DD strings', () => {
    expect(normalizeOptionalDateStringInput('23/03/2026')).toBe('2026-03-23');
    expect(normalizeOptionalDateStringInput('23-03-2026 14:30')).toBe('2026-03-23');
    expect(normalizeOptionalDateStringInput(46004)).toBeDefined();
  });
});
