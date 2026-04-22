import { describe, expect, it } from 'vitest';
import { computeHandlesHash, normalizeHandlesForHash } from '../audience';

describe('normalizeHandlesForHash', () => {
  it('strips leading @ and lowercases', () => {
    expect(normalizeHandlesForHash(['@Nike', '@adidas'])).toEqual(['adidas', 'nike']);
  });

  it('sorts lexicographically', () => {
    expect(normalizeHandlesForHash(['zara', 'hm', 'gap'])).toEqual(['gap', 'hm', 'zara']);
  });

  it('trims whitespace', () => {
    expect(normalizeHandlesForHash(['  nike  ', ' adidas '])).toEqual(['adidas', 'nike']);
  });

  it('drops empty strings', () => {
    expect(normalizeHandlesForHash(['nike', '', '  ', '@adidas'])).toEqual(['adidas', 'nike']);
  });
});

describe('computeHandlesHash', () => {
  it('is order-independent', () => {
    const a = computeHandlesHash(['adidas', 'nike', 'puma']);
    const b = computeHandlesHash(['puma', 'adidas', 'nike']);
    expect(a).toBe(b);
  });

  it('is case-insensitive', () => {
    const a = computeHandlesHash(['Nike', 'Adidas']);
    const b = computeHandlesHash(['nike', 'adidas']);
    expect(a).toBe(b);
  });

  it('is @-sign-agnostic', () => {
    const a = computeHandlesHash(['@nike', '@adidas']);
    const b = computeHandlesHash(['nike', 'adidas']);
    expect(a).toBe(b);
  });

  it('is whitespace-tolerant', () => {
    const a = computeHandlesHash([' nike ', 'adidas']);
    const b = computeHandlesHash(['nike', 'adidas']);
    expect(a).toBe(b);
  });

  it('changes when handles differ', () => {
    const a = computeHandlesHash(['nike', 'adidas']);
    const b = computeHandlesHash(['nike', 'puma']);
    expect(a).not.toBe(b);
  });

  it('changes when a handle is added', () => {
    const two = computeHandlesHash(['nike', 'adidas']);
    const three = computeHandlesHash(['nike', 'adidas', 'puma']);
    expect(two).not.toBe(three);
  });

  it('produces a 32-char hex md5 (matches Postgres md5() output)', () => {
    const h = computeHandlesHash(['nike', 'adidas']);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });

  it('matches the Postgres md5(array_to_string(sorted, ",")) convention', () => {
    // Spelled out so changes to the hash scheme break the test loudly.
    // Normalize rules: strip @, lowercase, trim, sort, join with comma.
    //   ['@Nike', 'adidas'] -> 'adidas,nike' -> md5
    const handles = ['@Nike', 'adidas'];
    const hash = computeHandlesHash(handles);

    // md5('adidas,nike') — precomputed once; if this changes we changed the scheme.
    expect(hash).toBe('674070cea29e01fb8af27186c8849133');
  });
});
