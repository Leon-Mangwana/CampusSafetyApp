const { setupApp } = require('./helpers/app');

describe('sendPushNotification', () => {
  it('skips invalid tokens and removes dead ones', async () => {
    const ctx = setupApp({ users: {
      dead: { userId: 'dead', role: 'student', pushToken: 'ExponentPushToken[dead]' },
      live: { userId: 'live', role: 'student', pushToken: 'ExponentPushToken[live]' },
    } });
    const { sendPushNotification } = require('../utils/notifications');
    const result = await sendPushNotification(
      ['ExponentPushToken[live]', 'ExponentPushToken[dead]', 'not-a-token', null, 'ExponentPushToken[live]'],
      'Title', 'Body', { type: 'sos', alertId: 'x' },
    );
    expect(result).toEqual({ sent: 1, failed: 2 });
    // dedupe: 'live' sent once
    expect(ctx.sentPush.filter((m) => m.to === 'ExponentPushToken[live]')).toHaveLength(1);
    expect(ctx.sentPush[0].channelId).toBe('sos');
    // DeviceNotRegistered → token cleared (async fire-and-forget; flush)
    await new Promise((r) => setImmediate(r));
    expect(ctx.db._get('users/dead/pushToken')).toBeNull();
    expect(ctx.db._get('users/live/pushToken')).toBe('ExponentPushToken[live]');
  });

  it('returns zeros with no valid tokens', async () => {
    setupApp();
    const { sendPushNotification } = require('../utils/notifications');
    expect(await sendPushNotification([], 'a', 'b')).toEqual({ sent: 0, failed: 0 });
    expect(await sendPushNotification(['junk'], 'a', 'b')).toEqual({ sent: 0, failed: 1 });
  });
});
