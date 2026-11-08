const { Expo } = require('expo-server-sdk');
const { db } = require('../config/firebase');
const { randomUUID } = require('crypto');
const log = require('./logger');

const expo = new Expo();

// Presence records older than this are ignored for nearby alerts.
const PRESENCE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * Remove a dead push token from whichever user owns it.
 */
const clearPushToken = async (token) => {
  try {
    const snapshot = await db
      .ref('users')
      .orderByChild('pushToken')
      .equalTo(token)
      .once('value');
    const updates = {};
    snapshot.forEach((child) => {
      updates[`users/${child.key}/pushToken`] = null;
    });
    if (Object.keys(updates).length > 0) await db.ref().update(updates);
  } catch (err) {
    log.error('push.clear_token_failed', { err });
  }
};

/**
 * Send a push notification through the Expo Push Service.
 * Invalid tokens are skipped; tokens Expo reports as unregistered are removed
 * from the database so we stop sending to them.
 *
 * @returns {Promise<{sent: number, failed: number}>}
 */
const sendPushNotification = async (recipientTokens, title, body, data = {}) => {
  const unique = [...new Set((recipientTokens || []).filter(Boolean))];
  const valid = unique.filter((t) => Expo.isExpoPushToken(t));
  const invalid = unique.length - valid.length;
  if (invalid > 0) log.warn('push.invalid_tokens_skipped', { count: invalid });
  if (valid.length === 0) return { sent: 0, failed: invalid };

  const isSos = data.type === 'sos';
  const messages = valid.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    priority: 'high',
    channelId: isSos ? 'sos' : 'default',
    data: { ...data, timestamp: new Date().toISOString() },
  }));

  let sent = 0;
  let failed = invalid;
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          sent++;
          return;
        }
        failed++;
        const errorCode = ticket.details && ticket.details.error;
        log.error('push.ticket_error', { code: errorCode, message: ticket.message });
        if (errorCode === 'DeviceNotRegistered') {
          clearPushToken(chunk[i].to);
        }
      });
    } catch (error) {
      failed += chunk.length;
      log.error('push.chunk_failed', { err: error });
    }
  }
  log.info('push.sent', { sent, failed, type: data.type });
  return { sent, failed };
};

/**
 * Store notification record in database
 */
const storeNotification = async (recipientId, incidentId, type, message) => {
  const notificationId = randomUUID();
  const notification = {
    notificationId,
    recipientId,
    incidentId: incidentId || null,
    type, // 'sos', 'incident', 'system'
    message,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  await db.ref(`notifications/${notificationId}`).set(notification);
  return notification;
};

/**
 * Find users whose recent opt-in presence record lies within `radiusMeters`
 * of a point. Reads the `presence` node (rounded coordinates, no personal
 * data) filtered to the last two hours, then fetches push tokens only for
 * the matching users.
 *
 * @returns {Promise<Array<{uid: string, pushToken: string|null}>>}
 */
const findUsersWithinRadius = async (latitude, longitude, radiusMeters = 500) => {
  const since = new Date(Date.now() - PRESENCE_MAX_AGE_MS).toISOString();
  const snapshot = await db
    .ref('presence')
    .orderByChild('updatedAt')
    .startAt(since)
    .once('value');

  const nearbyUids = [];
  snapshot.forEach((child) => {
    const p = child.val() || {};
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
    if (calculateDistance(latitude, longitude, p.lat, p.lng) <= radiusMeters) {
      nearbyUids.push(child.key);
    }
  });

  const tokens = await Promise.all(
    nearbyUids.map(async (uid) => {
      const snap = await db.ref(`users/${uid}/pushToken`).once('value');
      return { uid, pushToken: snap.val() || null };
    })
  );
  return tokens;
};

/**
 * Haversine formula to calculate distance between two GPS points
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = {
  sendPushNotification,
  storeNotification,
  findUsersWithinRadius,
  calculateDistance,
  clearPushToken,
  PRESENCE_MAX_AGE_MS,
};
