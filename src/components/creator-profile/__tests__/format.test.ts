import { describe, expect, it } from 'vitest';
import {
  flagEmoji,
  fmtDuration,
  formatDate,
  formatNum,
  formatPct,
} from '../format';

describe('formatNum', () => {
  it('returns "—" for null / undefined / NaN', () => {
    expect(formatNum(null)).toBe('—');
    expect(formatNum(undefined)).toBe('—');
    expect(formatNum(Number.NaN)).toBe('—');
  });

  it('compacts to B / M / K with trimmed trailing zeroes', () => {
    expect(formatNum(673_176_739)).toBe('673.18M');
    expect(formatNum(1_500_000_000)).toBe('1.5B');
    expect(formatNum(2_400)).toBe('2.4K');
    expect(formatNum(2_000)).toBe('2K');
  });

  it('renders small ints as locale strings', () => {
    expect(formatNum(42)).toBe('42');
    expect(formatNum(999)).toBe('999');
  });
});

describe('formatPct', () => {
  it('treats values between 0 and 1 as 0..1 weights', () => {
    expect(formatPct(0.474)).toBe('47.4%');
  });

  it('treats values >= 1 as already percent', () => {
    expect(formatPct(47.4)).toBe('47.4%');
    expect(formatPct(100)).toBe('100.0%');
  });

  it('respects digit count override', () => {
    expect(formatPct(0.087255, 2)).toBe('8.73%');
  });

  it('returns "—" for null', () => {
    expect(formatPct(null)).toBe('—');
  });
});

describe('flagEmoji', () => {
  it('converts ISO 2-letter codes to flag emoji', () => {
    // 🇺🇸 — U+1F1FA U+1F1F8
    expect(flagEmoji('US')).toBe('\u{1F1FA}\u{1F1F8}');
    // 🇧🇷
    expect(flagEmoji('br')).toBe('\u{1F1E7}\u{1F1F7}');
  });

  it('passes through non-2-letter input unchanged', () => {
    expect(flagEmoji('USA')).toBe('USA');
    expect(flagEmoji(null)).toBe('··');
    expect(flagEmoji('')).toBe('··');
  });
});

describe('formatDate', () => {
  it('renders a human date for valid ISO input', () => {
    // Locale + timezone slip the day by one in some envs — assert the month
    // and year only.
    const out = formatDate('2026-04-28T19:14:00Z');
    expect(out).toMatch(/Apr\s\d{1,2},?\s2026/);
  });

  it('returns the raw string when parsing fails', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate(null)).toBe('—');
  });
});

describe('fmtDuration', () => {
  it('handles ISO-8601 PT durations', () => {
    expect(fmtDuration('PT1H30M')).toBe('1h 30m');
    expect(fmtDuration('PT13S')).toBe('0:13');
    expect(fmtDuration('PT2M5S')).toBe('2:05');
  });

  it('falls back to "Ns" suffix for non-ISO inputs', () => {
    expect(fmtDuration(60)).toBe('60s');
  });

  it('returns "—" for null', () => {
    expect(fmtDuration(null)).toBe('—');
  });
});
