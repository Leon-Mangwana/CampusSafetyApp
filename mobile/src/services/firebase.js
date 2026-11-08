import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from '../constants/config';

const app = initializeApp(FIREBASE_CONFIG);

// `getReactNativePersistence` only exists in the React Native build of
// firebase/auth; the browser build has no such export and calling it crashes
// the app before the first render. Pick persistence per platform.
const persistence = Platform.OS === 'web'
  ? browserLocalPersistence
  // Required lazily so Metro's web bundle never touches the RN-only export.
  : require('firebase/auth').getReactNativePersistence(AsyncStorage);

const auth = initializeAuth(app, { persistence });

export { auth };
