import { normalizeOptionalDateInput } from './date-input.util';

describe('normalizeOptionalDateInput', () => {
  it('converts date-only strings into Date instances', () => {
    expect(normalizeOptionalDateInput('2026-03-23')?.toISOString()).toBe('2026-03-23T00:00:00.000Z');
  });

  it('returns undefined for empty input', () => {
    expect(normalizeOptionalDateInput('')).toBeUndefined();
    expect(normalizeOptionalDateInput(undefined)).toBeUndefined();
  });
});
