import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { updateUserLocation } from './api';

// Opt-in, foreground-only sharing of an approximate position so students can
// be warned about high-severity incidents nearby. No background location.

export const SHARE_LOCATION_KEY = 'prefs.shareLocation';
export const SAFETY_ALERTS_KEY = 'prefs.safetyAlerts';

const INTERVAL_MS = 5 * 60 * 1000;
const ROUND = 4; // 4 decimals ≈ 11 m; enough for "nearby", not a doorway.

export const readPref = async (key, fallback = false) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
};

export const writePref = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  } catch { /* ignore */ }
};

const round = (n) => Number(n.toFixed(ROUND));

export const sendPresenceOnce = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return false;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await updateUserLocation(round(loc.coords.latitude), round(loc.coords.longitude));
  return true;
};

/**
 * Hook: while `enabled`, posts the device's approximate location every five
 * minutes whenever the app is in the foreground.
 */
export const usePresenceSharing = (enabled) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => sendPresenceOnce().catch(() => {});
    const start = () => {
      stop();
      tick();
      timerRef.current = setInterval(tick, INTERVAL_MS);
    };
    const stop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [enabled]);
};
