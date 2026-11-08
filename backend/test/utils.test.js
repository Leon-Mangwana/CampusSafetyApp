// Pure utilities only — no database. Stub the modules that would otherwise
// try to initialise firebase-admin / the Expo client on require.
jest.mock('../config/firebase', () => ({ db: {}, auth: {}, admin: {} }));
jest.mock('expo-server-sdk', () => ({ Expo: class { static isExpoPushToken() { return false; } } }));

const { parseCoordinate, parseLatLng, isEmail, isPhone, requireString, isAbsent } = require('../utils/validate');
const { groupByCell, heatmapWeight, PUBLIC_MIN_COUNT } = require('../utils/hotspots');
const { classifySeverity, isLikelyEnglish, seemsLikeIncidentDescription } = require('../utils/severityClassifier');
const { redact } = require('../utils/logger');
const { calculateDistance } = require('../utils/notifications');

describe('validate', () => {
  it('parses coordinates strictly', () => {
    expect(parseCoordinate(0, -90, 90)).toBe(0);
    expect(parseCoordinate('-19.5', -90, 90)).toBe(-19.5);
    expect(parseCoordinate('abc', -90, 90)).toBeNull();
    expect(parseCoordinate(NaN, -90, 90)).toBeNull();
    expect(parseCoordinate(Infinity, -90, 90)).toBeNull();
    expect(parseCoordinate(91, -90, 90)).toBeNull();
    expect(parseCoordinate('', -90, 90)).toBeNull();
    expect(parseCoordinate(null, -90, 90)).toBeNull();
    expect(parseLatLng(0, 0)).toEqual({ latitude: 0, longitude: 0 });
    expect(parseLatLng(-19.5, 181)).toBeNull();
  });

  it('validates emails and phones', () => {
    expect(isEmail('a@msu.ac.zw')).toBe(true);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('a b@c.com')).toBe(false);
    expect(isEmail(`${'a'.repeat(250)}@b.com`)).toBe(false);
    expect(isPhone('+263 77 123 4567')).toBe(true);
    expect(isPhone('12')).toBe(false);
    expect(isPhone(771234567)).toBe(false);
  });

  it('validates strings with min/max', () => {
    expect(requireString('  hi  ', { field: 'X', min: 2, max: 5 })).toEqual({ value: 'hi' });
    expect(requireString('h', { field: 'X', min: 2 }).error).toMatch(/at least 2/);
    expect(requireString('toolong', { field: 'X', max: 3 }).error).toMatch(/at most 3/);
    expect(requireString(5, { field: 'X' }).error).toMatch(/required/);
    expect(isAbsent(undefined)).toBe(true);
    expect(isAbsent('')).toBe(true);
    expect(isAbsent(0)).toBe(false);
  });
});

describe('hotspots', () => {
  it('groups points into cells and sorts by count', () => {
    const cells = groupByCell([
      { latitude: -19.5176, longitude: 29.8331, severity: 'high', type: 'theft' },
      { latitude: -19.51762, longitude: 29.83312, severity: 'low', type: 'theft' },
      { latitude: -19.525, longitude: 29.84, severity: 'high', type: 'assault' },
      { latitude: 'bad', longitude: 1 },
    ], { withTypes: true });
    expect(cells).toHaveLength(2);
    expect(cells[0].count).toBe(2);
    expect(cells[0].types).toEqual({ theft: 2 });
    expect(cells[1].count).toBe(1);
    expect(PUBLIC_MIN_COUNT).toBe(2);
  });

  it('weights heatmap points by severity and recency', () => {
    const now = Date.now();
    const recent = new Date(now - 86400000).toISOString();
    const old = new Date(now - 45 * 86400000).toISOString();
    expect(heatmapWeight({ severity: 'high', timestamp: recent }, now)).toBe(3);
    expect(heatmapWeight({ severity: 'medium', timestamp: recent }, now)).toBe(2);
    expect(heatmapWeight({ severity: 'low', timestamp: recent }, now)).toBe(1);
    expect(heatmapWeight({ severity: 'high', timestamp: old }, now)).toBe(1.5);
  });
});

describe('severityClassifier', () => {
  it('forces off-topic text to low', () => {
    expect(classifySeverity('roses are red violets are blue', 'assault')).toBe('low');
  });
  it('adds +3 for weapon/injury vocabulary on top of the type baseline', () => {
    // assault (3) + knife (3) = 6 → high
    expect(classifySeverity('A man with a knife attacked a student near the gate', 'assault')).toBe('high');
    // theft (2) + bleeding (3) = 5 → high
    expect(classifySeverity('Someone is bleeding badly after being hit at the hostel', 'theft')).toBe('high');
    // vandalism (1) + knife (3) = 4 → medium: the type floor still matters
    expect(classifySeverity('A man with a knife attacked a student near the gate', 'vandalism')).toBe('medium');
  });
  it('gives type baselines', () => {
    expect(classifySeverity('I saw graffiti on the library wall', 'vandalism')).toBe('low');
    expect(classifySeverity('Someone stole my laptop from the library', 'theft')).toBe('medium');
  });
  it('detects English and incident vocabulary', () => {
    expect(isLikelyEnglish('I saw someone breaking a window')).toBe(true);
    expect(isLikelyEnglish('ndakaona munhu achityora hwindo')).toBe(false);
    expect(seemsLikeIncidentDescription('la la la la la la')).toBe(false);
  });
});

describe('logger redaction', () => {
  it('strips personal fields at any depth', () => {
    const out = redact({ alertId: 'a', latitude: 1, nested: { phone: '077', ok: 'yes' }, list: [{ email: 'x' }] });
    expect(out).toEqual({ alertId: 'a', latitude: '[redacted]', nested: { phone: '[redacted]', ok: 'yes' }, list: [{ email: '[redacted]' }] });
  });
  it('serialises errors', () => {
    const out = redact({ err: new Error('boom') });
    expect(out.err.message).toBe('boom');
  });
});

describe('calculateDistance', () => {
  it('computes haversine distance in metres', () => {
    expect(calculateDistance(-19.5176, 29.8331, -19.5176, 29.8331)).toBe(0);
    const d = calculateDistance(-19.5176, 29.8331, -19.5266, 29.8331); // ~1 km south
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });
});
