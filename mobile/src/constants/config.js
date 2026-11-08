import Constants from 'expo-constants';

// Firebase web config
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDgQ8F0Uq6CRSwyecABZHsuuxppYZM_DTQ',
  authDomain: 'campus-safety-app-a4936.firebaseapp.com',
  databaseURL: 'https://campus-safety-app-a4936-default-rtdb.firebaseio.com',
  projectId: 'campus-safety-app-a4936',
  storageBucket: 'campus-safety-app-a4936.firebasestorage.app',
  messagingSenderId: '199738302891',
  appId: '1:199738302891:web:38d63713b6378bf1c83787',
};

// Backend port used during local development.
const DEV_API_PORT = 3000;

// Production API URL. Set EXPO_PUBLIC_API_URL (see mobile/.env.example) in
// the build environment — EAS inlines EXPO_PUBLIC_* variables at build time.
// A release built without it will refuse to start rather than talk to a
// placeholder host.
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Resolve the laptop's LAN IP from Expo's dev-server manifest. The phone
// already loads the JS bundle from this host, so the backend at the same IP
// is guaranteed to be reachable — no more hand-editing when the DHCP lease
// rotates.
const resolveDevHost = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
  ];
  const hostUri = candidates.find(Boolean);
  if (!hostUri) return null;
  return hostUri.split(':')[0];
};

const buildApiUrl = () => {
  if (!__DEV__) {
    if (!PRODUCTION_API_URL) {
      // Do not throw here: a module-level throw gives a blank screen with no
      // explanation. Leave the URL empty; the API client reports a clear
      // "not configured" error on the first request instead.
      console.error(
        'EXPO_PUBLIC_API_URL is not set. Configure it in the EAS build profile or a .env file before building a release.',
      );
      return '';
    }
    return PRODUCTION_API_URL.replace(/\/+$/, '');
  }
  if (PRODUCTION_API_URL) return PRODUCTION_API_URL.replace(/\/+$/, '');
  const host = resolveDevHost();
  if (!host) {
    console.warn('[config] Could not resolve dev host from Expo manifest — falling back to localhost.');
    return `http://localhost:${DEV_API_PORT}/api`;
  }
  return `http://${host}:${DEV_API_PORT}/api`;
};

export const API_BASE_URL = buildApiUrl();
