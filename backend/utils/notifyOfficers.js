const { db } = require('../config/firebase');
const { sendPushNotification, storeNotification } = require('./notifications');
const log = require('./logger');

const userToken = (u) => (u && (u.pushToken || u.fcmToken)) || null;

/**
 * Fetch every security officer (and admin, when `includeAdmins`) with their
 * push tokens.
 */
const getStaff = async ({ includeAdmins = false } = {}) => {
  const roles = includeAdmins ? ['security', 'admin'] : ['security'];
  const snapshots = await Promise.all(
    roles.map((role) => db.ref('users').orderByChild('role').equalTo(role).once('value'))
  );
  const staff = [];
  for (const snap of snapshots) {
    snap.forEach((child) => {
      staff.push({ uid: child.key, ...child.val() });
    });
  }
  return staff;
};

/**
 * Store an in-app notification for every officer and send one push each.
 * Runs the writes in parallel; a single failing write never blocks the rest.
 *
 * @returns {Promise<{notified: number, push: {sent: number, failed: number}}>}
 */
const notifyOfficers = async ({ referenceId, type, message, pushTitle, pushBody, data = {}, includeAdmins = false }) => {
  const staff = await getStaff({ includeAdmins });

  const results = await Promise.allSettled(
    staff.map((officer) => storeNotification(officer.uid, referenceId, type, message))
  );
  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length) {
    log.warn('notify.store_failed', { count: failures.length, type, referenceId });
  }

  const tokens = staff.map(userToken).filter(Boolean);
  const push = await sendPushNotification(tokens, pushTitle, pushBody, { ...data, type });

  return { notified: staff.length - failures.length, push };
};

module.exports = { notifyOfficers, getStaff, userToken };
