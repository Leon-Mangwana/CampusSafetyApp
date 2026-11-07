const { db } = require('../config/firebase');
const { randomUUID } = require('crypto');
const { sendPushNotification, findUsersWithinRadius } = require('../utils/notifications');
const { notifyOfficers } = require('../utils/notifyOfficers');
const { parseLatLng, requireString, isOneOf } = require('../utils/validate');
const { classifySeverity } = require('../utils/severityClassifier');
const { groupByCell, heatmapWeight, PUBLIC_MIN_COUNT, DEFAULT_CELL_DEG } = require('../utils/hotspots');
const { isStaff } = require('../middleware/auth');
const log = require('../utils/logger');

// Valid incident types
const INCIDENT_TYPES = [
  'theft', 'assault', 'harassment', 'vandalism',
  'unauthorized_access', 'fire', 'medical', 'suspicious_activity', 'other',
];
const SEVERITIES = ['low', 'medium', 'high'];
const INCIDENT_STATUSES = ['pending', 'active', 'resolved'];
const MAX_DESCRIPTION = 1000;
const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 50;
const HEATMAP_WINDOW_DAYS = 90;
const STATS_WINDOW_DAYS = 90;
const NEARBY_RADIUS_M = 500;

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (days) => new Date(Date.now() - days * DAY_MS).toISOString();

/** Read incidents whose ISO timestamp lies in [startIso, endIso). */
const readIncidentsBetween = async (startIso, endIso) => {
  let query = db.ref('incidents').orderByChild('timestamp').startAt(startIso);
  if (endIso) query = query.endAt(endIso);
  const snapshot = await query.once('value');
  const incidents = [];
  snapshot.forEach((child) => {
    const v = child.val();
    if (v && typeof v === 'object' && (!endIso || v.timestamp < endIso)) incidents.push(v);
  });
  return incidents;
};

const countSosBetween = async (startIso, endIso) => {
  let query = db.ref('sosAlerts').orderByChild('timestamp').startAt(startIso);
  if (endIso) query = query.endAt(endIso);
  const snapshot = await query.once('value');
  let count = 0;
  snapshot.forEach((child) => {
    const v = child.val();
    if (v && (!endIso || v.timestamp < endIso)) count++;
  });
  return count;
};

/**
 * Submit an anonymous incident report. Severity is computed on the server
 * from the description and type; whatever the client sends is ignored so a
 * crafted request cannot trigger campus-wide "high severity" alerts.
 */
const submitReport = async (req, res) => {
  try {
    const { type, description, latitude, longitude } = req.body || {};

    if (!isOneOf(type, INCIDENT_TYPES)) {
      return res.status(400).json({ error: 'Invalid incident type.' });
    }
    const descResult = requireString(description, {
      field: 'Description',
      min: 10,
      max: MAX_DESCRIPTION,
    });
    if (descResult.error) {
      return res.status(400).json({ error: descResult.error });
    }
    const coords = parseLatLng(latitude, longitude);
    if (!coords) {
      return res.status(400).json({ error: 'Valid GPS coordinates are required.' });
    }

    const severity = classifySeverity(descResult.value, type);

    const incidentId = randomUUID();
    const incident = {
      incidentId,
      userId: null, // Anonymous — do not store reporter identity
      type,
      description: descResult.value,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: new Date().toISOString(),
      severity,
      status: 'pending',
    };

    await db.ref(`incidents/${incidentId}`).set(incident);
    log.info('incident.created', { incidentId, type, severity });

    // Every incident is dispatched to security — the dashboard relies on this.
    await notifyOfficers({
      referenceId: incidentId,
      type: 'incident',
      message: `New ${severity} severity ${type} incident reported.`,
      pushTitle: `New ${severity.toUpperCase()} incident`,
      pushBody: `${type.replace(/_/g, ' ')} reported. Open the dashboard to respond.`,
      data: { incidentId, severity },
    });

    // For high severity, also alert nearby students (opt-in presence only).
    if (severity === 'high') {
      const nearby = await findUsersWithinRadius(incident.latitude, incident.longitude, NEARBY_RADIUS_M);
      const nearbyTokens = nearby.map((u) => u.pushToken).filter(Boolean);
      await sendPushNotification(
        nearbyTokens,
        'Safety Alert',
        `A ${type.replace(/_/g, ' ')} incident has been reported near you. Stay alert.`,
        { incidentId, type: 'nearby', severity }
      );
    }

    res.status(201).json({
      message: 'Incident report submitted successfully.',
      incidentId,
      severity,
    });
  } catch (error) {
    log.error('incident.create_failed', { err: error });
    res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  }
};

/**
 * List incidents (staff only), newest first. Bounded and indexed.
 */
const getIncidents = async (req, res) => {
  try {
    const { type, severity, status, limit: queryLimit } = req.query;
    const parsed = parseInt(queryLimit, 10);
    const limit = Number.isInteger(parsed) && parsed > 0
      ? Math.min(parsed, MAX_LIST_LIMIT)
      : DEFAULT_LIST_LIMIT;

    // Use the indexed status filter when given; otherwise take the most
    // recent N by timestamp. Secondary filters are applied in memory on an
    // over-fetched window so the caller still gets up to `limit` rows.
    const needsMemoryFilter = Boolean(type || severity);
    const fetchLimit = needsMemoryFilter ? Math.min(limit * 4, 400) : limit;

    let query;
    if (status && isOneOf(status, INCIDENT_STATUSES)) {
      query = db.ref('incidents').orderByChild('status').equalTo(status);
    } else {
      query = db.ref('incidents').orderByChild('timestamp').limitToLast(fetchLimit);
    }

    const snapshot = await query.once('value');
    let incidents = [];
    snapshot.forEach((child) => {
      const v = child.val();
      if (v && typeof v === 'object') incidents.push(v);
    });

    incidents.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    if (type) incidents = incidents.filter((i) => i.type === type);
    if (severity) incidents = incidents.filter((i) => i.severity === severity);
    incidents = incidents.slice(0, limit);

    res.json({ incidents, total: incidents.length });
  } catch (error) {
    log.error('incident.list_failed', { err: error });
    res.status(500).json({ error: 'Failed to retrieve incidents.' });
  }
};

/**
 * Get a single incident by ID (staff only)
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
    log.error('incident.get_failed', { err: error });
    res.status(500).json({ error: 'Failed to retrieve incident.' });
  }
};

/**
 * Update incident status (security officers only)
 */
const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!isOneOf(status, INCIDENT_STATUSES)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const snapshot = await db.ref(`incidents/${id}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    const now = new Date().toISOString();
    const responseId = randomUUID();
    await db.ref().update({
      [`incidents/${id}/status`]: status,
      [`incidents/${id}/updatedAt`]: now,
      [`incidents/${id}/updatedBy`]: req.user.uid,
      [`responses/${responseId}`]: {
        responseId,
        incidentId: id,
        officerId: req.user.uid,
        action: `Status updated to ${status}`,
        timestamp: now,
        status,
      },
    });
    log.info('incident.status_updated', { incidentId: id, status, officerId: req.user.uid });

    res.json({ message: `Incident status updated to ${status}.` });
  } catch (error) {
    log.error('incident.status_update_failed', { err: error });
    res.status(500).json({ error: 'Failed to update incident.' });
  }
};

/**
 * Monthly safety report (staff). Reads only the two months involved.
 */
const getMonthlyReport = async (req, res) => {
  try {
    const now = new Date();
    const monthParam = parseInt(req.query.month, 10);
    const yearParam = parseInt(req.query.year, 10);
    const month = Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam - 1
      : now.getMonth();
    const year = Number.isInteger(yearParam) && yearParam > 1970 && yearParam < 2200
      ? yearParam
      : now.getFullYear();

    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 1);
    const prevStart = new Date(year, month - 1, 1);

    const [windowIncidents, sosAlerts] = await Promise.all([
      readIncidentsBetween(prevStart.toISOString(), periodEnd.toISOString()),
      countSosBetween(periodStart.toISOString(), periodEnd.toISOString()),
    ]);

    const startIso = periodStart.toISOString();
    const incidents = windowIncidents.filter((i) => i.timestamp >= startIso);
    const prevIncidents = windowIncidents.filter((i) => i.timestamp < startIso);

    const total = incidents.length;
    const approved = incidents.filter((i) => i.status === 'resolved').length;
    const resolutionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const byCategory = {};
    incidents.forEach((i) => {
      const key = i.type || 'other';
      byCategory[key] = (byCategory[key] || 0) + 1;
    });
    const categories = Object.entries(byCategory)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topHotspot = groupByCell(incidents)[0] || null;

    let trendPercent = 0;
    let trendDirection = 'flat';
    if (prevIncidents.length > 0) {
      const delta = total - prevIncidents.length;
      trendPercent = Math.round((Math.abs(delta) / prevIncidents.length) * 100);
      if (delta < 0) trendDirection = 'improvement';
      else if (delta > 0) trendDirection = 'worsening';
    }

    const monthName = periodStart.toLocaleString('en-US', { month: 'long' });
    const lastDay = new Date(year, month + 1, 0).getDate();

    res.json({
      month: month + 1,
      year,
      monthLabel: `${monthName} ${year}`,
      periodLabel: `1 ${monthName} ${year} - ${lastDay} ${monthName} ${year}`,
      total,
      approved,
      sosAlerts,
      resolutionRate,
      categories,
      topHotspot,
      trend: {
        percent: trendPercent,
        direction: trendDirection,
        previousTotal: prevIncidents.length,
      },
    });
  } catch (error) {
    log.error('incident.monthly_report_failed', { err: error });
    res.status(500).json({ error: 'Failed to generate monthly report.' });
  }
};

/**
 * Delete an incident (admin/security only).
 */
const deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`incidents/${id}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Incident not found.' });
    }
    await db.ref(`incidents/${id}`).remove();
    log.info('incident.deleted', { incidentId: id, officerId: req.user.uid });
    res.json({ message: 'Incident deleted.' });
  } catch (error) {
    log.error('incident.delete_failed', { err: error });
    res.status(500).json({ error: 'Failed to delete incident.' });
  }
};

/**
 * Heatmap data for the last 90 days.
 *
 * Students receive grid cells (~55 m) that aggregate at least two reports,
 * so no single report — and therefore no single reporter — can be located.
 * Staff may request `?precision=full` for per-incident points.
 */
const getHeatmapData = async (req, res) => {
  try {
    const { type, precision } = req.query;
    const full = precision === 'full' && isStaff(req.userRole);

    let incidents = await readIncidentsBetween(isoDaysAgo(HEATMAP_WINDOW_DAYS));
    if (type) incidents = incidents.filter((i) => i.type === type);

    const now = Date.now();
    if (full) {
      const dataPoints = incidents
        .filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude))
        .map((i) => ({
          latitude: i.latitude,
          longitude: i.longitude,
          weight: heatmapWeight(i, now),
          type: i.type,
          severity: i.severity,
        }));
      return res.json({ dataPoints, total: dataPoints.length, precision: 'full' });
    }

    const cells = groupByCell(incidents, { weightOf: (i) => heatmapWeight(i, now) })
      .filter((c) => c.count >= PUBLIC_MIN_COUNT)
      .map((c) => ({
        latitude: Number(c.latitude.toFixed(5)),
        longitude: Number(c.longitude.toFixed(5)),
        weight: Number((c.weight / c.count).toFixed(2)), // average weight → palette
        count: c.count,
      }));

    res.json({
      dataPoints: cells,
      total: cells.length,
      precision: 'grid',
      cellDegrees: DEFAULT_CELL_DEG,
      windowDays: HEATMAP_WINDOW_DAYS,
    });
  } catch (error) {
    log.error('incident.heatmap_failed', { err: error });
    res.status(500).json({ error: 'Failed to retrieve heatmap data.' });
  }
};

/**
 * Statistics over the last 90 days. Everyone may call it; students get
 * aggregated hotspots (grid cells with ≥2 reports), staff get the full list
 * with per-type breakdowns.
 */
const getIncidentStats = async (req, res) => {
  try {
    const staff = isStaff(req.userRole);
    const since = isoDaysAgo(STATS_WINDOW_DAYS);
    const [incidents, sosCount] = await Promise.all([
      readIncidentsBetween(since),
      countSosBetween(since),
    ]);

    const total = incidents.length;
    const pending = incidents.filter((i) => i.status === 'pending').length;
    const active = incidents.filter((i) => i.status === 'active').length;
    const resolved = incidents.filter((i) => i.status === 'resolved').length;
    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';

    const byType = {};
    incidents.forEach((i) => {
      const key = i.type || 'other';
      byType[key] = (byType[key] || 0) + 1;
    });

    const bySeverity = { low: 0, medium: 0, high: 0 };
    incidents.forEach((i) => {
      if (bySeverity[i.severity] !== undefined) bySeverity[i.severity]++;
    });

    let hotspots = groupByCell(incidents, { withTypes: staff });
    if (!staff) hotspots = hotspots.filter((c) => c.count >= PUBLIC_MIN_COUNT);
    hotspots = hotspots.slice(0, 10).map((c) => ({
      latitude: Number(c.latitude.toFixed(5)),
      longitude: Number(c.longitude.toFixed(5)),
      count: c.count,
      ...(staff ? { types: c.types } : {}),
    }));

    res.json({
      windowDays: STATS_WINDOW_DAYS,
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
    log.error('incident.stats_failed', { err: error });
    res.status(500).json({ error: 'Failed to retrieve statistics.' });
  }
};

module.exports = {
  submitReport,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  deleteIncident,
  getHeatmapData,
  getIncidentStats,
  getMonthlyReport,
  INCIDENT_TYPES,
  SEVERITIES,
  INCIDENT_STATUSES,
};
