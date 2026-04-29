import { describe, expect, it } from 'vitest';
import { entriesFromMap } from '../primitives/top-list';

describe('entriesFromMap', () => {
  it('returns [] for null/undefined', () => {
    expect(entriesFromMap(null)).toEqual([]);
    expect(entriesFromMap(undefined)).toEqual([]);
  });

  it('sorts entries by value descending', () => {
    const out = entriesFromMap({ a: 0.1, b: 0.5, c: 0.3 });
    expect(out.map((e) => e.label)).toEqual(['b', 'c', 'a']);
  });

  it('preserves the original key as label when no labelMap given', () => {
    const out = entriesFromMap({ US: 0.5 });
    expect(out[0]).toEqual({ label: 'US', value: 0.5, sub: undefined });
  });

  it('substitutes label and demotes raw key to sub when labelMap provided', () => {
    const out = entriesFromMap({ US: 0.5, BR: 0.3 }, { US: 'United States', BR: 'Brazil' });
    expect(out[0]).toEqual({ label: 'United States', value: 0.5, sub: 'US' });
    expect(out[1]).toEqual({ label: 'Brazil', value: 0.3, sub: 'BR' });
  });

  it('keeps raw key as label when labelMap has no match for that key', () => {
    const out = entriesFromMap({ US: 0.5, ZZ: 0.1 }, { US: 'United States' });
    expect(out[0].label).toBe('United States');
    expect(out[1]).toEqual({ label: 'ZZ', value: 0.1, sub: undefined });
  });
});
