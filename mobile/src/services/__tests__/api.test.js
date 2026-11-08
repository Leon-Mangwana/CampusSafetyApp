import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, triggerSOS, ApiError, setUnauthorizedHandler } from '../api';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});

const htmlResponse = (status) => ({
  ok: false,
  status,
  headers: { get: () => 'text/html' },
  json: async () => { throw new Error('not json'); },
});

describe('api client', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem('userToken', 'stored-token');
    global.fetch = jest.fn();
  });

  it('sends the bearer token and parses JSON', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { fullName: 'A' }));
    const res = await getProfile();
    expect(res).toEqual({ fullName: 'A' });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('http://test.local/api/auth/profile');
    expect(opts.headers.Authorization).toBe('Bearer stored-token');
    expect(opts.signal).toBeDefined();
  });

  it('turns server errors into ApiError with status and message', async () => {
    fetch.mockResolvedValue(jsonResponse(429, { error: 'Too many SOS alerts. Please wait.' }));
    await expect(triggerSOS({})).rejects.toMatchObject({ status: 429, code: 'rate_limited', message: 'Too many SOS alerts. Please wait.' });
  });

  it('does not try to parse non-JSON error pages', async () => {
    fetch.mockResolvedValue(htmlResponse(502));
    await expect(getProfile()).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' });
  });

  it('maps network failures and timeouts', async () => {
    fetch.mockRejectedValue(new TypeError('Network request failed'));
    await expect(getProfile()).rejects.toMatchObject({ code: 'network' });

    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    fetch.mockRejectedValue(abort);
    const err = await getProfile().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('timeout');
  });

  it('calls the unauthorized handler on 401', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    fetch.mockResolvedValue(jsonResponse(401, { error: 'Unauthorized' }));
    await expect(getProfile()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(handler).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
  });

  it('posts the full SOS payload', async () => {
    fetch.mockResolvedValue(jsonResponse(201, { alertId: 'x' }));
    await triggerSOS({ latitude: -19.5, longitude: 29.8, accuracy: 10, locationSource: 'gps' });
    const [, opts] = fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ latitude: -19.5, longitude: 29.8, accuracy: 10, locationSource: 'gps' });
  });
});
