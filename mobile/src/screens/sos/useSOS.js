import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Vibration } from 'react-native';
import * as Location from 'expo-location';
import { triggerSOS, cancelSOSAlert, updateSOSLocation } from '../../services/api';
import { getSecurityNumber, getSecurityLabel } from '../../constants/emergencyNumbers';

export const HOLD_MS = 3000;
const HOLD_TICK_MS = 50;
const GPS_FIX_TIMEOUT_MS = 8000;
const TRACK_INTERVAL_MS = 3000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

/**
 * Best-effort location fix for an SOS. Returns
 *   { coords, source: 'gps' | 'last_known' | 'none' }
 * and never throws — a student without GPS still needs help.
 */
export const acquireLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { coords: null, source: 'none' };
  } catch {
    return { coords: null, source: 'none' };
  }
  try {
    const loc = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      GPS_FIX_TIMEOUT_MS,
    );
    return { coords: loc.coords, source: 'gps' };
  } catch { /* fall through */ }
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (last?.coords) return { coords: last.coords, source: 'last_known' };
  } catch { /* fall through */ }
  return { coords: null, source: 'none' };
};

const buildPayload = (coords, source) => {
  if (!coords) return { locationSource: 'none' };
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    locationSource: source,
  };
};

/**
 * Retries the backend trigger with exponential backoff so a transient network
 * blip during an SOS doesn't lose the alert. 4xx responses other than 408
 * (timeout) and 429 (rate limit — the server decided) are not retried.
 */
export const triggerWithRetry = async (payload, attempts = 3, send = triggerSOS, wait = (ms) => new Promise((r) => setTimeout(r, ms))) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await send(payload);
    } catch (err) {
      lastErr = err;
      const status = err?.status || 0;
      if (status === 429) break;
      if (status >= 400 && status < 500 && status !== 408) break;
      if (i < attempts - 1) await wait(1000 * Math.pow(2, i));
    }
  }
  throw lastErr;
};

/**
 * All SOS behaviour: press-and-hold, location acquisition, backend trigger
 * with retry, SMS deep link, live tracking, cancel.
 */
export const useSOS = (user) => {
  const [isActive, setIsActive] = useState(false);
  const [alertId, setAlertId] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationSource, setLocationSource] = useState('none');
  const [holdProgress, setHoldProgress] = useState(0);
  const [gpsSignal, setGpsSignal] = useState('Detecting...');
  // 'pending' | 'notified' | 'failed' — security only counts as notified
  // once the backend returns an alertId.
  const [backendStatus, setBackendStatus] = useState('pending');
  const [lastError, setLastError] = useState('');

  const holdTimer = useRef(null);
  const holdStart = useRef(0);
  const firedRef = useRef(false);
  const trackInterval = useRef(null);
  const locationRef = useRef(null);
  const sourceRef = useRef('none');

  const setFix = useCallback((coords, source) => {
    locationRef.current = coords;
    sourceRef.current = source;
    setLocation(coords);
    setLocationSource(source);
  }, []);

  const refreshLocation = useCallback(async () => {
    const { coords, source } = await acquireLocation();
    if (coords || !locationRef.current) setFix(coords, source);
    if (!coords) setGpsSignal('Unavailable');
    else if (source === 'last_known') setGpsSignal('Last known position');
    else setGpsSignal(coords.accuracy != null && coords.accuracy < 20 ? 'Strong' : 'Moderate');
    return { coords, source };
  }, [setFix]);

  useEffect(() => {
    refreshLocation();
    return () => {
      clearInterval(trackInterval.current);
      clearInterval(holdTimer.current);
    };
  }, [refreshLocation]);

  // Stream location to the dashboard while the alert is live.
  useEffect(() => {
    if (!isActive || !alertId) return undefined;
    trackInterval.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await updateSOSLocation(alertId, loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy);
        setFix(loc.coords, 'gps');
      } catch { /* keep trying */ }
    }, TRACK_INTERVAL_MS);
    return () => clearInterval(trackInterval.current);
  }, [isActive, alertId, setFix]);

  const openSmsToContacts = useCallback(async (coords) => {
    const contacts = Array.isArray(user?.emergencyContacts) ? user.emergencyContacts : [];
    const phones = contacts.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) return;
    const where = coords
      ? `Live location: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : 'Location unavailable — please call me.';
    const body = encodeURIComponent(`EMERGENCY SOS from ${user?.fullName || 'a Campus Safety user'}. ${where}`);
    const separator = Platform.OS === 'ios' ? '&' : ',';
    const url = `sms:${phones.join(separator)}${Platform.OS === 'ios' ? '&' : '?'}body=${body}`;
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch { /* backend alert is the primary channel */ }
  }, [user]);

  const sendAlert = useCallback(async (coords, source) => {
    setBackendStatus('pending');
    setLastError('');
    try {
      const result = await triggerWithRetry(buildPayload(coords, source));
      setAlertId(result.alertId);
      setBackendStatus('notified');
      return true;
    } catch (error) {
      setBackendStatus('failed');
      setLastError(error?.message || 'Connection failed');
      return false;
    }
  }, []);

  const activate = useCallback(async () => {
    Vibration.vibrate([200, 100, 200]);
    setIsActive(true);
    setBackendStatus('pending');

    // Always take a fresh fix at activation; state may be stale or null. If
    // no fix is possible the alert still goes out, flagged as such.
    let coords = locationRef.current;
    let source = sourceRef.current;
    if (!coords || source !== 'gps') {
      const fix = await acquireLocation();
      if (fix.coords) {
        coords = fix.coords;
        source = fix.source;
        setFix(coords, source);
      }
    }

    openSmsToContacts(coords).catch(() => {});

    const ok = await sendAlert(coords, source);
    if (!ok) {
      Alert.alert(
        'Security Could Not Be Reached',
        'Your emergency contacts may still have been alerted by SMS. ' +
        `Please call ${getSecurityLabel()} directly: ${getSecurityNumber()}.`
      );
    }
  }, [openSmsToContacts, sendAlert, setFix]);

  // Fires exactly once per hold, whether the interval or the accessibility
  // long-press path reaches the threshold first.
  const fireOnce = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    clearInterval(holdTimer.current);
    setHoldProgress(1);
    activate();
  }, [activate]);

  // Wall-clock based so the 3 s hold is accurate even when ticks are late.
  const startHold = useCallback(() => {
    firedRef.current = false;
    holdStart.current = Date.now();
    clearInterval(holdTimer.current);
    holdTimer.current = setInterval(() => {
      const progress = Math.min((Date.now() - holdStart.current) / HOLD_MS, 1);
      setHoldProgress(progress);
      if (progress >= 1) fireOnce();
    }, HOLD_TICK_MS);
  }, [fireOnce]);

  const endHold = useCallback(() => {
    clearInterval(holdTimer.current);
    if (!firedRef.current) setHoldProgress(0);
  }, []);

  // Retry re-attempts the GPS fix and then the backend, whether or not we
  // have a location — the previous failure may have been exactly that.
  const retry = useCallback(async () => {
    setBackendStatus('pending');
    const fix = await acquireLocation();
    if (fix.coords) setFix(fix.coords, fix.source);
    await sendAlert(fix.coords || locationRef.current, fix.coords ? fix.source : sourceRef.current);
  }, [sendAlert, setFix]);

  const cancel = useCallback(() => {
    Alert.alert('Cancel SOS', 'Are you sure you want to cancel the SOS alert?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (alertId) {
            try { await cancelSOSAlert(alertId); } catch { /* best effort */ }
          }
          clearInterval(trackInterval.current);
          setIsActive(false);
          setAlertId(null);
          setBackendStatus('pending');
          setHoldProgress(0);
          firedRef.current = false;
        },
      },
    ]);
  }, [alertId]);

  return {
    isActive, alertId, location, locationSource, holdProgress, gpsSignal, backendStatus, lastError,
    startHold, endHold, fireOnce, retry, cancel, refreshLocation,
  };
};

export default useSOS;
