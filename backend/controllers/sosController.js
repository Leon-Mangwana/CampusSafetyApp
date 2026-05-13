const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { sendPushNotification, storeNotification } = require('../utils/notifications');

/**
 * Trigger an SOS alert
 */
const triggerSOS = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'GPS coordinates are required for SOS.' });
    }

    // Get user info for emergency contact
    const userSnapshot = await db.ref(`users/${userId}`).once('value');
    const userData = userSnapshot.val();
    if (!userData) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const emergencyContacts = Array.isArray(userData.emergencyContacts)
      ? userData.emergencyContacts
      : [];

    const alertId = uuidv4();
    const sosAlert = {
      alertId,
      userId,
      userName: userData.fullName,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString(),
      status: 'active',
      emergencyContacts,
    };

    await db.ref(`sosAlerts/${alertId}`).set(sosAlert);
    console.log(
      `[triggerSOS] wrote alert ${alertId.slice(0, 8)} for ${userData.fullName} ` +
      `status=active lat=${latitude} lng=${longitude}`
    );

    // Sanity-check the persistence: read the same record back and read the
    // whole parent node. If readback shows the record but the parent doesn't,
    // we have an orderByChild/index bug, not a write bug.
    const direct = await db.ref(`sosAlerts/${alertId}`).once('value');
    const parent = await db.ref('sosAlerts').once('value');
    let parentChildren = 0;
    parent.forEach(() => { parentChildren++; });
    console.log(
      `[triggerSOS] readback alert=${direct.exists() ? direct.val().status : 'MISSING'} ` +
      `parent_children=${parentChildren}`
    );

    // Notify all security officers
    const securitySnapshot = await db
      .ref('users')
      .orderByChild('role')
      .equalTo('security')
      .once('value');
    const securityUsers = securitySnapshot.val() || {};
    const securityTokens = [];

    for (const [uid, officer] of Object.entries(securityUsers)) {
      if (officer.fcmToken) securityTokens.push(officer.fcmToken);
      await storeNotification(uid, alertId, 'sos',
        `EMERGENCY SOS from ${userData.fullName}. Location: ${latitude}, ${longitude}`
      );
    }

    // Push notification to security
    await sendPushNotification(
      securityTokens,
      'EMERGENCY SOS ALERT',
      `${userData.fullName} needs immediate assistance!`,
      { alertId, latitude: String(latitude), longitude: String(longitude), type: 'sos' }
    );

    // SMS to emergency contacts (the mobile client also fires a native SMS
    // deep-link for instant delivery; this log is for backend audit trail).
    for (const contact of emergencyContacts) {
      console.log(
        `[SMS] SOS -> ${contact.name} (${contact.phone}): ` +
        `${userData.fullName} triggered SOS at ${latitude}, ${longitude}`
      );
    }

    res.status(201).json({
      message: 'SOS Alert Activated. Help is on the way.',
      alertId,
      emergencyContacts,
    });
  } catch (error) {
    console.error('SOS trigger error:', error);
    res.status(500).json({ error: 'Failed to send SOS. Please try again.' });
  }
};

/**
 * Update SOS alert location (real-time tracking)
 */
const updateSOSLocation = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { latitude, longitude } = req.body;

    const snapshot = await db.ref(`sosAlerts/${alertId}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'SOS alert not found.' });
    }

    const alert = snapshot.val();
    if (alert.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this alert.' });
    }

    await db.ref(`sosAlerts/${alertId}`).update({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      lastUpdated: new Date().toISOString(),
    });

    res.json({ message: 'SOS location updated.' });
  } catch (error) {
    console.error('SOS location update error:', error);
    res.status(500).json({ error: 'Failed to update SOS location.' });
  }
};

/**
 * Resolve/close an SOS alert (security officers)
 */
const resolveSOSAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status } = req.body;

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

    // Notify the user who triggered the SOS
    const alert = snapshot.val();
    await storeNotification(alert.userId, alertId, 'sos',
      status === 'responded'
        ? 'Security team is responding to your SOS alert.'
        : 'Your SOS alert has been resolved.'
    );

    res.json({ message: `SOS alert ${status}.` });
  } catch (error) {
    console.error('Resolve SOS error:', error);
    res.status(500).json({ error: 'Failed to resolve SOS alert.' });
  }
};

/**
 * Get all active SOS alerts (for security dashboard).
 * We deliberately avoid orderByChild here — it requires an index, and a
 * missing index has been observed to silently exclude freshly written
 * children. Reading the whole node and sorting in JS is more reliable.
 */
const getActiveSOSAlerts = async (req, res) => {
  try {
    const snapshot = await db.ref('sosAlerts').once('value');
    const raw = snapshot.val() || {};
    const alerts = Object.values(raw).sort(
      (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );

    const { status } = req.query;
    const filtered = status ? alerts.filter((a) => a.status === status) : alerts;

    console.log(
      `[getSOSAlerts] total=${alerts.length} filter=${status || 'none'} returned=${filtered.length} ` +
      `statuses=[${alerts.map((a) => `${a.alertId?.slice(0, 8)}:${a.status}`).join(', ')}]`
    );

    res.json({ alerts: filtered, total: filtered.length });
  } catch (error) {
    console.error('Get SOS alerts error:', error);
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

    res.json({ message: 'SOS alert cancelled.' });
  } catch (error) {
    console.error('Cancel SOS error:', error);
    res.status(500).json({ error: 'Failed to cancel SOS alert.' });
  }
};

module.exports = {
  triggerSOS,
  updateSOSLocation,
  resolveSOSAlert,
  getActiveSOSAlerts,
  cancelSOS,
};
