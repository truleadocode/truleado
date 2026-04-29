import { describe, expect, it } from 'vitest';
import {
  POLL_ELIGIBLE_STATUSES,
  TERMINAL_STATUSES,
  backoffPollTime,
  canTransition,
  icStatusToJobStatus,
  isTerminal,
  nextPollTime,
} from '../batch-helpers';

describe('icStatusToJobStatus', () => {
  it('maps every IC status onto an internal status', () => {
    expect(icStatusToJobStatus('queued')).toBe('ic_queued');
    expect(icStatusToJobStatus('processing')).toBe('ic_processing');
    expect(icStatusToJobStatus('finished')).toBe('ic_finished');
    expect(icStatusToJobStatus('failed')).toBe('failed');
    expect(icStatusToJobStatus('paused_insufficient_credits')).toBe('ic_paused_credits');
  });
});

describe('isTerminal', () => {
  it('recognises terminal statuses', () => {
    for (const s of TERMINAL_STATUSES) {
      expect(isTerminal(s)).toBe(true);
    }
  });

  it('non-terminal statuses report false', () => {
    expect(isTerminal('submitted')).toBe(false);
    expect(isTerminal('ic_queued')).toBe(false);
    expect(isTerminal('downloading')).toBe(false);
  });
});

describe('canTransition', () => {
  it('submitted -> ic_queued is allowed', () => {
    expect(canTransition('submitted', 'ic_queued')).toBe(true);
  });

  it('ic_queued -> ic_processing is allowed', () => {
    expect(canTransition('ic_queued', 'ic_processing')).toBe(true);
  });

  it('ic_processing -> ic_finished is allowed', () => {
    expect(canTransition('ic_processing', 'ic_finished')).toBe(true);
  });

  it('ic_paused_credits -> ic_processing is allowed (resume path)', () => {
    expect(canTransition('ic_paused_credits', 'ic_processing')).toBe(true);
  });

  it('any non-terminal -> cancelled is allowed', () => {
    const nonTerminal: Array<Parameters<typeof canTransition>[0]> = [
      'submitted',
      'ic_queued',
      'ic_processing',
      'ic_paused_credits',
      'ic_finished',
      'downloading',
      'importing',
    ];
    for (const from of nonTerminal) {
      expect(canTransition(from, 'cancelled')).toBe(true);
    }
  });

  it('terminal statuses cannot transition', () => {
    for (const from of TERMINAL_STATUSES) {
      expect(canTransition(from, 'ic_processing')).toBe(false);
      expect(canTransition(from, 'cancelled')).toBe(false);
    }
  });

  it('disallowed transitions return false', () => {
    expect(canTransition('ic_queued', 'completed')).toBe(false);
    expect(canTransition('ic_finished', 'ic_queued')).toBe(false);
    expect(canTransition('downloading', 'ic_processing')).toBe(false);
  });
});

describe('nextPollTime', () => {
  const NOW = new Date('2026-04-22T12:00:00Z').getTime();

  it('returns a time between 30s and 60s from now', () => {
    const atMin = nextPollTime(NOW, () => 0);
    const atMax = nextPollTime(NOW, () => 0.9999);
    expect(atMin.getTime() - NOW).toBe(30_000);
    expect(atMax.getTime() - NOW).toBe(60_000);
  });

  it('respects IC minimum poll interval of 30s', () => {
    for (let i = 0; i < 100; i++) {
      const t = nextPollTime(NOW);
      const deltaMs = t.getTime() - NOW;
      expect(deltaMs).toBeGreaterThanOrEqual(30_000);
      expect(deltaMs).toBeLessThanOrEqual(60_000);
    }
  });
});

describe('backoffPollTime', () => {
  const NOW = new Date('2026-04-22T12:00:00Z').getTime();

  it('scales exponentially with attempt number', () => {
    const t1 = backoffPollTime(0, NOW);
    const t2 = backoffPollTime(1, NOW);
    const t3 = backoffPollTime(2, NOW);
    const t4 = backoffPollTime(3, NOW);

    expect(t1.getTime() - NOW).toBe(60_000); // 2^0 * 60s
    expect(t2.getTime() - NOW).toBe(120_000); // 2^1 * 60s
    expect(t3.getTime() - NOW).toBe(240_000); // 2^2 * 60s
    expect(t4.getTime() - NOW).toBe(480_000); // 2^3 * 60s
  });

  it('caps at 10 minutes (600 seconds)', () => {
    const large = backoffPollTime(10, NOW);
    expect(large.getTime() - NOW).toBe(600_000);
  });

  it('treats negative attempts as attempt 0', () => {
    const neg = backoffPollTime(-5, NOW);
    expect(neg.getTime() - NOW).toBe(60_000);
  });
});

describe('POLL_ELIGIBLE_STATUSES', () => {
  it('contains exactly the IC-interacting states + downloading', () => {
    expect(new Set(POLL_ELIGIBLE_STATUSES)).toEqual(
      new Set(['ic_queued', 'ic_processing', 'ic_paused_credits', 'ic_finished', 'downloading'])
    );
  });

  it('does not include terminal or pre-IC states', () => {
    expect(POLL_ELIGIBLE_STATUSES).not.toContain('submitted');
    expect(POLL_ELIGIBLE_STATUSES).not.toContain('completed');
    expect(POLL_ELIGIBLE_STATUSES).not.toContain('failed');
    expect(POLL_ELIGIBLE_STATUSES).not.toContain('cancelled');
  });
});
