import * as Location from 'expo-location';
import { acquireLocation, triggerWithRetry } from '../useSOS';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3, High: 4 },
}));

describe('acquireLocation', () => {
  it('returns a GPS fix when available', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 1, longitude: 2, accuracy: 5 } });
    await expect(acquireLocation()).resolves.toEqual({ coords: { latitude: 1, longitude: 2, accuracy: 5 }, source: 'gps' });
  });

  it('falls back to the last known position', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockRejectedValue(new Error('no fix'));
    Location.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 3, longitude: 4 } });
    await expect(acquireLocation()).resolves.toEqual({ coords: { latitude: 3, longitude: 4 }, source: 'last_known' });
  });

  it('returns none (never throws) when nothing is available', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockRejectedValue(new Error('no fix'));
    Location.getLastKnownPositionAsync.mockResolvedValue(null);
    await expect(acquireLocation()).resolves.toEqual({ coords: null, source: 'none' });
  });

  it('returns none when permission is denied', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await expect(acquireLocation()).resolves.toEqual({ coords: null, source: 'none' });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
});

describe('triggerWithRetry', () => {
  const noWait = async () => {};

  it('retries network failures with backoff and succeeds', async () => {
    const send = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('net'), { code: 'network' }))
      .mockRejectedValueOnce(Object.assign(new Error('net'), { code: 'network' }))
      .mockResolvedValue({ alertId: 'ok' });
    await expect(triggerWithRetry({ locationSource: 'none' }, 3, send, noWait)).resolves.toEqual({ alertId: 'ok' });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('does not retry rate limits or validation errors', async () => {
    const limited = jest.fn().mockRejectedValue(Object.assign(new Error('Too many'), { status: 429 }));
    await expect(triggerWithRetry({}, 3, limited, noWait)).rejects.toMatchObject({ status: 429 });
    expect(limited).toHaveBeenCalledTimes(1);

    const invalid = jest.fn().mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }));
    await expect(triggerWithRetry({}, 3, invalid, noWait)).rejects.toMatchObject({ status: 400 });
    expect(invalid).toHaveBeenCalledTimes(1);
  });

  it('retries a 408 and gives up after the attempt budget', async () => {
    const timeout = jest.fn().mockRejectedValue(Object.assign(new Error('slow'), { status: 408 }));
    await expect(triggerWithRetry({}, 3, timeout, noWait)).rejects.toMatchObject({ status: 408 });
    expect(timeout).toHaveBeenCalledTimes(3);
  });
});
