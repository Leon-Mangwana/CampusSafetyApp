const { admin, db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

/**
 * Send push notification via Firebase Cloud Messaging
 */
const sendPushNotification = async (recipientTokens, title, body, data = {}) => {
  if (!recipientTokens || recipientTokens.length === 0) return;

  const message = {
    notification: { title, body },
    data: { ...data, timestamp: new Date().toISOString() },
  };

  try {
    const promises = recipientTokens.map((token) =>
      admin.messaging().send({ ...message, token })
    );
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Push notification error:', error.message);
  }
};

/**
 * Store notification record in database
 */
const storeNotification = async (recipientId, incidentId, type, message) => {
  const notificationId = uuidv4();
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
 * Find users within a radius (in meters) of given coordinates
 * Simplified: queries all users and filters by distance
 */
const findUsersWithinRadius = async (latitude, longitude, radiusMeters = 500) => {
  const usersSnapshot = await db.ref('users').once('value');
  const users = usersSnapshot.val() || {};
  const nearbyUsers = [];

  for (const [uid, user] of Object.entries(users)) {
    if (user.lastLatitude && user.lastLongitude) {
      const distance = calculateDistance(
        latitude, longitude,
        user.lastLatitude, user.lastLongitude
      );
      if (distance <= radiusMeters) {
        nearbyUsers.push({ uid, ...user });
      }
    }
  }

  return nearbyUsers;
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
};
