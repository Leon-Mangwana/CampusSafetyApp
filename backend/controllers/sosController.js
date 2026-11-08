const { db } = require('../config/firebase');
const { randomUUID } = require('crypto');
const { sendPushNotification, storeNotification } = require('../utils/notifications');
const { notifyOfficers } = require('../utils/notifyOfficers');
const { parseLatLng, isAbsent, isOneOf } = require('../utils/validate');
const log = require('../utils/logger');

const LOCATION_SOURCES = ['gps', 'last_known', 'none'];
const SOS_STATUSES = ['active', 'responded', 'closed'];
const MAX_LIST = 50;

const parseAccuracy = (accuracy) =>
  Number.isFinite(Number(accuracy)) && Number(accuracy) >= 0 ? Math.round(Number(accuracy)) : null;

/**
 * Trigger an SOS alert.
 *
 * An SOS is never rejected for lack of GPS: a student whose phone cannot get a
 * fix still needs help. If coordinates are supplied they must be valid; if
 * they are absent the alert is stored with locationStatus 'none' and the
 * dashboard tells officers to phone the student.
 */
const triggerSOS = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { latitude, longitude, accuracy, locationSource } = req.body || {};

    let coords = null;
    if (!isAbsent(latitude) || !isAbsent(longitude)) {
      coords = parseLatLng(latitude, longitude);
      if (!coords) {
        return res.status(400).json({ error: 'Latitude and longitude must be valid coordinates.' });
      }
    }

    const userSnapshot = await db.ref(`users/${userId}`).once('value');
    const userData = userSnapshot.val();
    if (!userData) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const emergencyContacts = Array.isArray(userData.emergencyContacts)
      ? userData.emergencyContacts
      : [];

    const locationStatus = coords
      ? (isOneOf(locationSource, LOCATION_SOURCES) ? locationSource : 'gps')
      : 'none';

    const alertId = randomUUID();
    const sosAlert = {
      alertId,
      userId,
      userName: userData.fullName,
      userPhone: userData.phone || null,
      latitude: coords ? coords.latitude : null,
      longitude: coords ? coords.longitude : null,
      accuracy: parseAccuracy(accuracy),
      locationStatus,
      timestamp: new Date().toISOString(),
      status: 'active',
      emergencyContacts,
    };

    await db.ref(`sosAlerts/${alertId}`).set(sosAlert);
    log.info('sos.created', { alertId, locationStatus });

    const result = await notifyOfficers({
      referenceId: alertId,
      type: 'sos',
      message: `EMERGENCY SOS from ${userData.fullName}. Open the dashboard to respond.`,
      pushTitle: 'EMERGENCY SOS ALERT',
      pushBody: `${userData.fullName} needs immediate assistance!`,
      data: { alertId },
    });
    log.info('sos.officers_notified', { alertId, notified: result.notified, push: result.push });

    res.status(201).json({
      message: 'SOS Alert Activated. Help is on the way.',
      alertId,
      locationStatus,
      emergencyContacts,
    });
  } catch (error) {
    log.error('sos.create_failed', { err: error });
    res.status(500).json({ error: 'Failed to send SOS. Please try again.' });
  }
};

/**
 * Update SOS alert location (real-time tracking)
 */
const updateSOSLocation = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { latitude, longitude, accuracy } = req.body || {};

    const coords = parseLatLng(latitude, longitude);
    if (!coords) {
      return res.status(400).json({ error: 'Latitude and longitude must be valid coordinates.' });
    }

    const snapshot = await db.ref(`sosAlerts/${alertId}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'SOS alert not found.' });
    }

    const alert = snapshot.val();
    if (alert.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this alert.' });
    }
    if (alert.status === 'closed') {
      return res.status(409).json({ error: 'This SOS alert is already closed.' });
    }

    await db.ref(`sosAlerts/${alertId}`).update({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: parseAccuracy(accuracy),
      locationStatus: 'gps',
      lastUpdated: new Date().toISOString(),
    });

    res.json({ message: 'SOS location updated.' });
  } catch (error) {
    log.error('sos.location_update_failed', { err: error });
    res.status(500).json({ error: 'Failed to update SOS location.' });
  }
};

/**
 * Resolve/close an SOS alert (security officers)
 */
const resolveSOSAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status } = req.body || {};

    if (!['responded', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be responded or closed.' });
    }

    const snapshot = await db.ref(`sosAlerts/${alertId}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'SOS alert not found.' });
    }

    await db.ref(`sosAlerts/${alertId}`).update({
      status,
      resolvedBy: req.user.uid,
      resolvedAt: new Date().toISOString(),
    });
    log.info('sos.resolved', { alertId, status, officerId: req.user.uid });

    // Notify the student who triggered the SOS (in-app + push).
    const alert = snapshot.val();
    const message = status === 'responded'
      ? 'Security team is responding to your SOS alert.'
      : 'Your SOS alert has been resolved.';
    await storeNotification(alert.userId, alertId, 'sos', message);

    const tokenSnap = await db.ref(`users/${alert.userId}/pushToken`).once('value');
    const studentToken = tokenSnap.val();
    if (studentToken) {
      await sendPushNotification([studentToken], 'Campus Security', message, { alertId, type: 'sos' });
    }

    res.json({ message: `SOS alert ${status}.` });
  } catch (error) {
    log.error('sos.resolve_failed', { err: error });
    res.status(500).json({ error: 'Failed to resolve SOS alert.' });
  }
};

/**
 * SOS alerts for the security dashboard, newest first. With `?status=` the
 * indexed status query is used; otherwise the most recent 50.
 */
const getActiveSOSAlerts = async (req, res) => {
  try {
    const { status } = req.query;
    let query;
    if (status && isOneOf(status, SOS_STATUSES)) {
      query = db.ref('sosAlerts').orderByChild('status').equalTo(status);
    } else {
      query = db.ref('sosAlerts').orderByChild('timestamp').limitToLast(MAX_LIST);
    }
    const snapshot = await query.once('value');
    const alerts = [];
    snapshot.forEach((child) => {
      const v = child.val();
      if (v && typeof v === 'object') alerts.push(v);
    });
    alerts.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    res.json({ alerts, total: alerts.length });
  } catch (error) {
    log.error('sos.list_failed', { err: error });
    res.status(500).json({ error: 'Failed to retrieve SOS alerts.' });
  }
};

/**
 * Cancel own SOS alert
 */
const cancelSOS = async (req, res) => {
  try {
    const { alertId } = req.params;
    const snapshot = await db.ref(`sosAlerts/${alertId}`).once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'SOS alert not found.' });
    }

    const alert = snapshot.val();
    if (alert.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to cancel this alert.' });
    }

    await db.ref(`sosAlerts/${alertId}`).update({
      status: 'closed',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'user',
    });
    log.info('sos.cancelled', { alertId });

    res.json({ message: 'SOS alert cancelled.' });
  } catch (error) {
    log.error('sos.cancel_failed', { err: error });
    res.status(500).json({ error: 'Failed to cancel SOS alert.' });
  }
};

module.exports = {
  triggerSOS,
  updateSOSLocation,
  resolveSOSAlert,
  getActiveSOSAlerts,
  cancelSOS,
  SOS_STATUSES,
};
