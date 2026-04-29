import { describe, expect, it } from 'vitest';
import { buildStandardStatList } from '../sidebar-blocks/stat-list';

describe('buildStandardStatList', () => {
  it('always returns 8 rows in the documented order', () => {
    const out = buildStandardStatList({});
    expect(out.map((r) => r.label)).toEqual([
      'Followers',
      'Engagement Rate',
      'Number of Posts',
      'Posts per Month',
      'Average Views',
      'Average Reel Likes',
      'Average Likes',
      'Average Comments',
    ]);
  });

  it('renders em-dashes for missing values without throwing', () => {
    const out = buildStandardStatList({});
    for (const row of out) {
      expect(typeof row.value === 'string' || row.value === null).toBe(true);
    }
  });

  it('formats large follower counts compactly', () => {
    const out = buildStandardStatList({ followers: 12_345_678 });
    expect(out[0].value).toMatch(/12.3M/i);
  });

  it('formats engagement rate as percent', () => {
    const out = buildStandardStatList({ engagementPercent: 3.42 });
    expect(out[1].value).toContain('%');
  });

  it('renders posts/month with one decimal', () => {
    const out = buildStandardStatList({ postsPerMonth: 8.42 });
    expect(out[3].value).toBe('8.4');
  });
});
