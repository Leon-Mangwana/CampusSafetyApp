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

// Production API URL — set this to your deployed backend before building a release.
const PRODUCTION_API_URL = 'https://your-production-domain.example.com/api';

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
  if (!__DEV__) return PRODUCTION_API_URL;
  const host = resolveDevHost();
  if (!host) {
    console.warn('[config] Could not resolve dev host from Expo manifest — falling back to localhost.');
    return `http://localhost:${DEV_API_PORT}/api`;
  }
  return `http://${host}:${DEV_API_PORT}/api`;
};

export const API_BASE_URL = buildApiUrl();
