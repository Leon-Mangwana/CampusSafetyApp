// Boots the real Express app against the in-memory Firebase fake and a
// recording Expo push stub. Require this at the top of a test file, before
// anything that imports config/firebase.
//
// `mockState` is referenced lazily from the jest.mock factories below (names
// prefixed with "mock" are allowed by babel-plugin-jest-hoist).

const { createFakeDb, createFakeAuth, token } = require('./fakeFirebase');

const mockState = { db: null, auth: null, sent: [] };

jest.mock('../../config/firebase', () => ({
  get db() { return mockState.db; },
  get auth() { return mockState.auth; },
  admin: {},
}));

jest.mock('expo-server-sdk', () => {
  class Expo {
    static isExpoPushToken(t) { return typeof t === 'string' && /^ExponentPushToken\[.+\]$/.test(t); }
    chunkPushNotifications(messages) { return messages.length ? [messages] : []; }
    async sendPushNotificationsAsync(chunk) {
      mockState.sent.push(...chunk);
      return chunk.map((m) => (m.to === 'ExponentPushToken[dead]'
        ? { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: 'ticket' }));
    }
  }
  return { Expo };
});

const DAY = 86400000;
const iso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();

const baseUsers = () => ({
  student1: { userId: 'student1', email: 's1@msu.ac.zw', fullName: 'Student One', role: 'student', phone: '0771234567', pushToken: 'ExponentPushToken[s1]', emergencyContacts: [{ name: 'Mum', phone: '0772000000' }] },
  student2: { userId: 'student2', email: 's2@msu.ac.zw', fullName: 'Student Two', role: 'student', phone: '0771234568', pushToken: 'ExponentPushToken[s2]' },
  officer1: { userId: 'officer1', email: 'o1@msu.ac.zw', fullName: 'Officer One', role: 'security', phone: '', pushToken: 'ExponentPushToken[o1]' },
  admin1: { userId: 'admin1', email: 'a1@msu.ac.zw', fullName: 'Admin', role: 'admin', phone: '' },
});

/**
 * Fresh app + fresh fake database. Modules are reset so every rate-limiter
 * store starts empty.
 *
 * @param {object} [seed] extra initial database content (merged over users)
 */
const setupApp = (seed = {}) => {
  mockState.db = createFakeDb({ users: baseUsers(), ...seed });
  mockState.auth = createFakeAuth();
  mockState.sent.length = 0;
  jest.resetModules();
  const app = require('../../server');
  return {
    app,
    db: mockState.db,
    auth: mockState.auth,
    sentPush: mockState.sent,
    tokens: {
      student1: token('student1'),
      student2: token('student2'),
      officer1: token('officer1', { role: 'security' }),
      admin1: token('admin1', { role: 'admin' }),
    },
  };
};

module.exports = { setupApp, token, iso, DAY };
