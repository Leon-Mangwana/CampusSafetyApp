import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { updatePushToken, clearUserLocation } from '../services/api';
import {
  installForegroundHandler,
  registerForPushAsync,
  addNotificationTapListener,
  getInitialNotificationData,
} from '../services/push';
import {
  usePresenceSharing, readPref, writePref, SAFETY_ALERTS_KEY, SHARE_LOCATION_KEY,
} from '../services/presence';
import { navigateWhenReady } from '../navigation/navigationRef';

// Per-device preferences that control what the app shares and receives:
//   safetyAlerts  — register for push notifications (default on)
//   shareLocation — send an approximate position every 5 min while in the
//                   foreground so nearby high-severity alerts can reach the
//                   user (default OFF: explicit consent)

const DevicePrefsContext = createContext(null);
const STAFF_ROLES = ['security', 'admin'];

export const DevicePrefsProvider = ({ children }) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ safetyAlerts: true, shareLocation: false, loaded: false });
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    Promise.all([readPref(SAFETY_ALERTS_KEY, true), readPref(SHARE_LOCATION_KEY, false)])
      .then(([safetyAlerts, shareLocation]) => {
        if (!cancelled) setPrefs({ safetyAlerts, shareLocation, loaded: true });
      });
    return () => { cancelled = true; };
  }, []);

  const registerPush = useCallback(async () => {
    const pushToken = await registerForPushAsync();
    if (!pushToken) return false;
    await updatePushToken(pushToken);
    return true;
  }, []);

  const setPref = useCallback(async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    await writePref(key === 'safetyAlerts' ? SAFETY_ALERTS_KEY : SHARE_LOCATION_KEY, value);
    if (!userRef.current) return;
    try {
      if (key === 'safetyAlerts') {
        if (value) await registerPush();
        else await updatePushToken(null);
      } else if (key === 'shareLocation' && !value) {
        await clearUserLocation();
      }
    } catch (err) {
      console.warn(`[prefs] applying ${key} failed:`, err?.message || err);
    }
  }, [registerPush]);

  // Push registration + tap routing while signed in and alerts are enabled.
  const pushEnabled = Boolean(user?.uid && prefs.loaded && prefs.safetyAlerts);
  useEffect(() => {
    if (!pushEnabled) return undefined;
    installForegroundHandler();

    let cancelled = false;
    registerPush().catch((err) =>
      console.warn('[push] registration/upload failed:', err?.message || err));

    const handleTap = (data) => {
      const isStaff = STAFF_ROLES.includes(userRef.current?.role);
      if (data?.type === 'sos' && data.alertId && isStaff) {
        navigateWhenReady('SOSTracker', { alertId: data.alertId });
      } else if (data?.type === 'incident' && isStaff) {
        navigateWhenReady('MainTabs', { screen: 'Dashboard' });
      } else {
        navigateWhenReady('MainTabs', { screen: 'Notifications' });
      }
    };

    const unsubscribe = addNotificationTapListener(handleTap);
    getInitialNotificationData().then((data) => {
      if (!cancelled && data) handleTap(data);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pushEnabled, user?.uid, registerPush]);

  usePresenceSharing(Boolean(user?.uid && prefs.loaded && prefs.shareLocation));

  const value = useMemo(() => ({ prefs, setPref }), [prefs, setPref]);
  return <DevicePrefsContext.Provider value={value}>{children}</DevicePrefsContext.Provider>;
};

export const useDevicePrefs = () => {
  const ctx = useContext(DevicePrefsContext);
  if (!ctx) throw new Error('useDevicePrefs must be used within a DevicePrefsProvider');
  return ctx;
};
