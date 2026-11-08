import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Push delivery uses the Expo Push Service. On Android this needs an FCM
// service account uploaded to EAS (`eas credentials`) and a development or
// production build — Expo Go on Android cannot receive push since SDK 53.

export const SOS_CHANNEL_ID = 'sos';
export const DEFAULT_CHANNEL_ID = 'default';

let handlerInstalled = false;

/** Show notifications while the app is in the foreground. */
export const installForegroundHandler = () => {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

const ensureAndroidChannels = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SOS_CHANNEL_ID, {
    name: 'SOS alerts',
    description: 'Emergency SOS alerts from students',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    lightColor: '#D32F2F',
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'Safety notifications',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
};

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || null;

/**
 * Request permission and return an Expo push token, or null when push is
 * unavailable (permission denied, simulator, Expo Go on Android, no EAS
 * project id). Never throws.
 */
export const registerForPushAsync = async () => {
  try {
    await ensureAndroidChannels();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    if (!projectId) {
      console.warn('[push] No EAS projectId in app config; push disabled.');
      return null;
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data || null;
  } catch (err) {
    console.warn('[push] registration failed:', err?.message || err);
    return null;
  }
};

/**
 * Subscribe to notification taps. `onTap(data)` receives the notification's
 * data payload ({ type, alertId, incidentId }). Returns an unsubscribe fn.
 */
export const addNotificationTapListener = (onTap) => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    try {
      onTap(data);
    } catch (err) {
      console.warn('[push] tap handler failed:', err?.message || err);
    }
  });
  return () => sub.remove();
};

/** If the app was cold-started from a notification, return its data. */
export const getInitialNotificationData = async () => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification?.request?.content?.data || null;
  } catch {
    return null;
  }
};
