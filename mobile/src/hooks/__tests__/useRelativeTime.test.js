import { formatRelativeTime } from '../useRelativeTime';

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  const at = (secondsAgo) => new Date(now - secondsAgo * 1000).toISOString();

  it('formats seconds, minutes, hours and days', () => {
    expect(formatRelativeTime(at(5), now)).toBe('5s ago');
    expect(formatRelativeTime(at(90), now)).toBe('1m ago');
    expect(formatRelativeTime(at(3 * 3600), now)).toBe('3h ago');
    expect(formatRelativeTime(at(2 * 86400), now)).toBe('2d ago');
  });

  it('handles missing and invalid input', () => {
    expect(formatRelativeTime(null, now)).toBe('never');
    expect(formatRelativeTime('garbage', now)).toBe('unknown');
    expect(formatRelativeTime(at(-30), now)).toBe('0s ago'); // clock skew never goes negative
  });
});
