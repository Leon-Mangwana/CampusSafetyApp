const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const {
  sendPushNotification,
  storeNotification,
  findUsersWithinRadius,
} = require('../utils/notifications');

// Valid incident types
const INCIDENT_TYPES = [
  'theft', 'assault', 'harassment', 'vandalism',
  'unauthorized_access', 'fire', 'medical', 'suspicious_activity', 'other',
];

/**
 * Submit an anonymous incident report
 */
const submitReport = async (req, res) => {
  try {
    const { type, description, severity, latitude, longitude, imageUrl } = req.body;

    // Validation
    if (!type || !INCIDENT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid incident type.' });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters.' });
    }
    if (!['low', 'medium', 'high'].includes(severity)) {
      return res.status(400).json({ error: 'Severity must be low, medium, or high.' });
    }
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'GPS coordinates are required.' });
    }

    const incidentId = uuidv4();
    const incident = {
      incidentId,
      userId: null, // Anonymous — do not store reporter identity
      type,
      description: description.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString(),
      severity,
      status: 'pending',
      imageUrl: imageUrl || null,
    };

    await db.ref(`incidents/${incidentId}`).set(incident);

    // If high severity, notify nearby users
    if (severity === 'high') {
      const nearbyUsers = await findUsersWithinRadius(
        incident.latitude, incident.longitude, 500
      );
      const tokens = nearbyUsers
        .filter((u) => u.fcmToken)
        .map((u) => u.fcmToken);

      await sendPushNotification(
        tokens,
        'Safety Alert',
        `A ${type} incident has been reported near you. Stay alert.`,
        { incidentId, type, severity }
      );

      // Notify all security officers
      const securitySnapshot = await db
        .ref('users')
        .orderByChild('role')
        .equalTo('security')
        .once('value');
      const securityUsers = securitySnapshot.val() || {};
      for (const [uid, officer] of Object.entries(securityUsers)) {
        await storeNotification(uid, incidentId, 'incident',
          `New ${severity} severity ${type} incident reported.`
        );
      }
    }

    res.status(201).json({
      message: 'Incident report submitted successfully.',
      incidentId,
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  }
};

/**
 * Get all incidents (with optional filters)
 */
const getIncidents = async (req, res) => {
  try {
    const { type, severity, status, limit: queryLimit } = req.query;
    const snapshot = await db.ref('incidents').orderByChild('timestamp').once('value');
    let incidents = [];

    snapshot.forEach((child) => {
      incidents.push(child.val());
    });

    // Reverse to get newest first
    incidents.reverse();

    // Apply filters
    if (type) incidents = incidents.filter((i) => i.type === type);
    if (severity) incidents = incidents.filter((i) => i.severity === severity);
    if (status) incidents = incidents.filter((i) => i.status === status);

    // Apply limit
    const limit = parseInt(queryLimit) || 50;
    incidents = incidents.slice(0, limit);

    res.json({ incidents, total: incidents.length });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Failed to retrieve incidents.' });
  }
};

/**
 * Get a single incident by ID
 */
const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`incidents/${id}`).once('value');
    const incident = snapshot.val();

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    res.json(incident);
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({ error: 'Failed to retrieve incident.' });
  }
};

/**
 * Update incident status (security officers only)
 */
const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const snapshot = await db.ref(`incidents/${id}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    await db.ref(`incidents/${id}`).update({
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid,
    });

    // Log the response action
    const responseId = uuidv4();
    await db.ref(`responses/${responseId}`).set({
      responseId,
      incidentId: id,
      officerId: req.user.uid,
      action: `Status updated to ${status}`,
      timestamp: new Date().toISOString(),
      status,
    });

    res.json({ message: `Incident status updated to ${status}.` });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: 'Failed to update incident.' });
  }
};

/**
 * Get heatmap data — aggregated incident locations
 */
const getHeatmapData = async (req, res) => {
  try {
    const { type } = req.query;
    const snapshot = await db.ref('incidents').once('value');
    const dataPoints = [];

    snapshot.forEach((child) => {
      const incident = child.val();
      if (type && incident.type !== type) return;

      // Weight by severity and recency
      let weight = 1;
      if (incident.severity === 'high') weight = 3;
      else if (incident.severity === 'medium') weight = 2;

      // Reduce weight for older incidents (decay over 30 days)
      const ageMs = Date.now() - new Date(incident.timestamp).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > 30) weight *= 0.5;

      dataPoints.push({
        latitude: incident.latitude,
        longitude: incident.longitude,
        weight,
        type: incident.type,
        severity: incident.severity,
      });
    });

    res.json({ dataPoints, total: dataPoints.length });
  } catch (error) {
    console.error('Get heatmap data error:', error);
    res.status(500).json({ error: 'Failed to retrieve heatmap data.' });
  }
};

/**
 * Get incident statistics for reports
 */
const getIncidentStats = async (req, res) => {
  try {
    const snapshot = await db.ref('incidents').once('value');
    const incidents = [];
    snapshot.forEach((child) => incidents.push(child.val()));

    const total = incidents.length;
    const pending = incidents.filter((i) => i.status === 'pending').length;
    const active = incidents.filter((i) => i.status === 'active').length;
    const resolved = incidents.filter((i) => i.status === 'resolved').length;
    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;

    // Breakdown by type
    const byType = {};
    incidents.forEach((i) => {
      byType[i.type] = (byType[i.type] || 0) + 1;
    });

    // Breakdown by severity
    const bySeverity = { low: 0, medium: 0, high: 0 };
    incidents.forEach((i) => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    });

    // Top hotspots (group by approximate location)
    const locationMap = {};
    incidents.forEach((i) => {
      const key = `${i.latitude.toFixed(3)},${i.longitude.toFixed(3)}`;
      if (!locationMap[key]) {
        locationMap[key] = { latitude: i.latitude, longitude: i.longitude, count: 0, types: {} };
      }
      locationMap[key].count++;
      locationMap[key].types[i.type] = (locationMap[key].types[i.type] || 0) + 1;
    });
    const hotspots = Object.values(locationMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // SOS stats
    const sosSnapshot = await db.ref('sosAlerts').once('value');
    let sosCount = 0;
    sosSnapshot.forEach(() => sosCount++);

    res.json({
      total,
      pending,
      active,
      resolved,
      resolutionRate: `${resolutionRate}%`,
      sosAlertsHandled: sosCount,
      byType,
      bySeverity,
      hotspots,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics.' });
  }
};

module.exports = {
  submitReport,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  getHeatmapData,
  getIncidentStats,
};
