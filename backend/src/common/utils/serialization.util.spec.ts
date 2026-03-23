import { sanitizeForJson } from './serialization.util';

describe('sanitizeForJson', () => {
  it('converts BigInt values recursively into strings', () => {
    const input = {
      id: '1',
      row_version: BigInt(2),
      nested: {
        total: BigInt(9),
      },
      items: [BigInt(4), { value: BigInt(7) }],
    };

    expect(sanitizeForJson(input)).toEqual({
      id: '1',
      row_version: '2',
      nested: {
        total: '9',
      },
      items: ['4', { value: '7' }],
    });
  });
});
