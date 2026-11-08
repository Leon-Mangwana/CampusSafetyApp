// In-memory stand-in for the firebase-admin Realtime Database and Auth APIs
// used by the backend. Supports the subset of the SDK the controllers call:
//   db.ref(path).once('value') / set / update / remove
//   db.ref(path).orderByChild(k).equalTo(v) / startAt(v) / endAt(v) / limitToLast(n)
//   db.ref().update({ 'a/b/c': value })  (multi-path update)
//   auth.verifyIdToken / createUser / getUserByEmail / updateUser / setCustomUserClaims
//
// Test ID tokens are JSON strings: '{"uid":"u1","role":"admin"}'.

const splitPath = (path) => (path || '').split('/').filter(Boolean);

const getAt = (root, segments) => {
  let node = root;
  for (const s of segments) {
    if (node === null || typeof node !== 'object' || !(s in node)) return undefined;
    node = node[s];
  }
  return node;
};

const setAt = (root, segments, value) => {
  if (segments.length === 0) return value === null || value === undefined ? {} : value;
  let node = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const s = segments[i];
    if (node[s] === null || typeof node[s] !== 'object') node[s] = {};
    node = node[s];
  }
  const last = segments[segments.length - 1];
  if (value === null || value === undefined) delete node[last];
  else node[last] = value;
  return root;
};

const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

const makeSnapshot = (key, value) => {
  const val = clone(value);
  return {
    key,
    val: () => val,
    exists: () => val !== null && val !== undefined,
    forEach: (cb) => {
      if (val && typeof val === 'object') {
        for (const [k, v] of Object.entries(val)) {
          if (cb(makeSnapshot(k, v)) === true) break;
        }
      }
      return false;
    },
    child: (k) => makeSnapshot(k, val && typeof val === 'object' ? val[k] : undefined),
  };
};

const createFakeDb = (initial = {}) => {
  const store = { root: clone(initial) || {} };

  const makeQuery = (path, q = {}) => ({
    orderByChild: (child) => makeQuery(path, { ...q, orderBy: child }),
    equalTo: (v) => makeQuery(path, { ...q, equalTo: v }),
    startAt: (v) => makeQuery(path, { ...q, startAt: v }),
    endAt: (v) => makeQuery(path, { ...q, endAt: v }),
    limitToLast: (n) => makeQuery(path, { ...q, limitToLast: n }),
    limitToFirst: (n) => makeQuery(path, { ...q, limitToFirst: n }),
    once: async (eventType) => {
      if (eventType !== 'value') throw new Error('fakeDb only supports once("value")');
      const node = getAt(store.root, splitPath(path));
      if (!q.orderBy || node === null || typeof node !== 'object') {
        return makeSnapshot(splitPath(path).pop() || null, node);
      }
      let entries = Object.entries(node).filter(([, v]) => v && typeof v === 'object');
      const keyOf = ([, v]) => v[q.orderBy];
      entries.sort((a, b) => {
        const ka = keyOf(a);
        const kb = keyOf(b);
        if (ka === kb) return 0;
        if (ka === undefined || ka === null) return -1;
        if (kb === undefined || kb === null) return 1;
        return ka < kb ? -1 : 1;
      });
      if (q.equalTo !== undefined) entries = entries.filter((e) => keyOf(e) === q.equalTo);
      if (q.startAt !== undefined) entries = entries.filter((e) => keyOf(e) >= q.startAt);
      if (q.endAt !== undefined) entries = entries.filter((e) => keyOf(e) <= q.endAt);
      if (q.limitToFirst !== undefined) entries = entries.slice(0, q.limitToFirst);
      if (q.limitToLast !== undefined) entries = entries.slice(-q.limitToLast);
      return makeSnapshot(splitPath(path).pop() || null, Object.fromEntries(entries));
    },
    set: async (value) => {
      store.root = setAt(store.root, splitPath(path), clone(value));
    },
    update: async (updates) => {
      for (const [k, v] of Object.entries(updates)) {
        store.root = setAt(store.root, [...splitPath(path), ...splitPath(k)], clone(v));
      }
    },
    remove: async () => {
      store.root = setAt(store.root, splitPath(path), null);
    },
  });

  return {
    ref: (path = '') => makeQuery(path),
    // test helpers
    _get: (path) => clone(getAt(store.root, splitPath(path))),
    _set: (path, value) => {
      store.root = setAt(store.root, splitPath(path), clone(value));
    },
    _dump: () => clone(store.root),
  };
};

const createFakeAuth = () => {
  const users = new Map(); // uid -> record
  let counter = 0;
  const err = (code) => Object.assign(new Error(code), { code });

  return {
    verifyIdToken: async (token) => {
      try {
        const decoded = JSON.parse(token);
        if (!decoded.uid) throw new Error('no uid');
        return decoded;
      } catch {
        throw err('auth/argument-error');
      }
    },
    createUser: async ({ email, password, displayName }) => {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err('auth/invalid-email');
      for (const u of users.values()) {
        if (u.email === email) throw err('auth/email-already-exists');
      }
      const uid = `uid-${++counter}`;
      const record = { uid, email, password, displayName, customClaims: {} };
      users.set(uid, record);
      return record;
    },
    getUserByEmail: async (email) => {
      for (const u of users.values()) if (u.email === email) return u;
      throw err('auth/user-not-found');
    },
    getUser: async (uid) => {
      if (!users.has(uid)) throw err('auth/user-not-found');
      return users.get(uid);
    },
    updateUser: async (uid, patch) => {
      const u = users.get(uid);
      if (!u) throw err('auth/user-not-found');
      Object.assign(u, patch);
      return u;
    },
    setCustomUserClaims: async (uid, claims) => {
      const u = users.get(uid) || { uid, customClaims: {} };
      u.customClaims = claims;
      users.set(uid, u);
    },
    _users: users,
  };
};

const createFakeAdmin = () => ({
  messaging: () => ({ send: async () => 'fake-message-id' }),
});

/**
 * Install the fake into the require cache so `require('../config/firebase')`
 * from any module resolves to it. Call before requiring server.js.
 */
const installFakeFirebase = (initialDb = {}) => {
  const db = createFakeDb(initialDb);
  const auth = createFakeAuth();
  const admin = createFakeAdmin();
  const modPath = require.resolve('../../config/firebase');
  require.cache[modPath] = {
    id: modPath,
    filename: modPath,
    loaded: true,
    exports: { admin, db, auth },
  };
  return { db, auth, admin };
};

const token = (uid, extra = {}) => JSON.stringify({ uid, ...extra });

module.exports = { createFakeDb, createFakeAuth, installFakeFirebase, token };
