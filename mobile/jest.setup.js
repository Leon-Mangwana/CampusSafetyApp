jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// The Firebase client needs a real config and network; tests never touch it.
jest.mock('./src/services/firebase', () => ({ auth: { currentUser: null } }));

// Fixed API base so request URLs are predictable in tests.
jest.mock('./src/constants/config', () => ({
  API_BASE_URL: 'http://test.local/api',
  FIREBASE_CONFIG: {},
}));
