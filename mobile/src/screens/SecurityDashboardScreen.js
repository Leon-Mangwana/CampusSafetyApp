import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, ScrollView, Linking, Platform, Alert,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { getIncidents, getSOSAlerts, getIncidentStats, updateIncidentStatus, deleteIncident, resolveSOSAlert } from '../services/api';

const REFRESH_INTERVAL_MS = 10000;

const openInMaps = (lat, lng, label = 'Incident') => {
  if (lat == null || lng == null) return;
  const encodedLabel = encodeURIComponent(label);
  const url = Platform.select({
    ios: `maps:0,0?q=${encodedLabel}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${encodedLabel})`,
  });
  Linking.canOpenURL(url).then((ok) => {
    const finalUrl = ok ? url : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(finalUrl).catch(() => {});
  });
};

const StatusBadge = ({ status }) => {
  const colors = {
    pending: COLORS.warning,
    active: COLORS.danger,
    resolved: COLORS.success,
    responded: COLORS.primary,
    closed: COLORS.grey,
  };
  return (
    <View style={[styles.badge, { backgroundColor: (colors[status] || COLORS.grey) + '20' }]}>
      <Text style={[styles.badgeText, { color: colors[status] || COLORS.grey }]}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Text>
    </View>
  );
};

const SeverityBadge = ({ severity }) => {
  const colors = { low: COLORS.severityLow, medium: COLORS.severityMedium, high: COLORS.severityHigh };
  return (
    <View style={[styles.badge, { backgroundColor: (colors[severity] || COLORS.grey) + '20' }]}>
      <Text style={[styles.badgeText, { color: colors[severity] || COLORS.grey }]}>
        {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
      </Text>
    </View>
  );
};

const SecurityDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, resolved: 0 });
  const [incidents, setIncidents] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    const intervalId = setInterval(() => fetchAll({ silent: true }), REFRESH_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, []);

  const fetchAll = async ({ silent = false } = {}) => {
    try {
      const [statsData, incData, sosData] = await Promise.allSettled([
        getIncidentStats(),
        getIncidents({ limit: 20 }),
        getSOSAlerts('active'),
      ]);
      if (!mountedRef.current) return;
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (incData.status === 'fulfilled') setIncidents(incData.value.incidents || []);
      if (sosData.status === 'fulfilled') setSosAlerts(sosData.value.alerts || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      if (silent) return;
      // Demo data
      setStats({ total: 47, pending: 12, active: 3, resolved: 32 });
      setIncidents([
        { incidentId: 'INC-047', type: 'theft', description: 'Library Block B', timestamp: new Date().toISOString(), severity: 'high', status: 'pending' },
        { incidentId: 'INC-046', type: 'harassment', description: 'Parking Lot A', timestamp: new Date().toISOString(), severity: 'medium', status: 'active' },
        { incidentId: 'INC-045', type: 'unauthorized_access', description: 'Science Building', timestamp: new Date().toISOString(), severity: 'high', status: 'resolved' },
      ]);
      setSosAlerts([
        { alertId: 'SOS-003', userName: 'Student', latitude: -19.4515, longitude: 29.8140, status: 'active', timestamp: new Date(Date.now() - 120000).toISOString() },
      ]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, []);

  const handleStatusUpdate = async (incidentId, newStatus) => {
    try {
      await updateIncidentStatus(incidentId, newStatus);
      await fetchAll();
    } catch { /* ok */ }
  };

  const handleSOSRespond = async (alertId) => {
    try {
      await resolveSOSAlert(alertId, 'responded');
      await fetchAll();
    } catch { /* ok */ }
  };

  const handleDeleteIncident = (incidentId) => {
    Alert.alert(
      'Delete Incident',
      'Permanently remove this incident from the dashboard? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic UI: remove from the list immediately so the dashboard
            // feels responsive, then sync with the backend.
            setIncidents((prev) => prev.filter((i) => i.incidentId !== incidentId));
            try {
              await deleteIncident(incidentId);
              await fetchAll();
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Could not delete the incident.');
              await fetchAll();
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Security Dashboard</Text>
        <View style={styles.backButton} />
      </View>
      <Text style={styles.lastUpdated}>
        Live feed {lastUpdated ? `• updated ${lastUpdated}` : '• loading...'} (auto-refresh every 10s)
      </Text>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: COLORS.primary }]}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.warning }]}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.danger }]}>
            <Text style={styles.statValue}>{sosAlerts.length}</Text>
            <Text style={styles.statLabel}>Active SOS</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
            <Text style={styles.statValue}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>

        {/* Active SOS Alerts */}
        {sosAlerts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active SOS Alerts</Text>
            {sosAlerts.map((alert) => (
              <View key={alert.alertId} style={styles.sosCard}>
                <View style={styles.sosHeader}>
                  <Text style={styles.sosId}>{alert.alertId}</Text>
                  <StatusBadge status={alert.status} />
                </View>
                <Text style={styles.sosUser}>{alert.userName || 'Unknown'}</Text>
                <Text style={styles.sosLocation}>
                  Location: {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                </Text>
                <View style={styles.sosActionRow}>
                  <TouchableOpacity
                    style={[styles.respondButton, { flex: 1, marginRight: 6 }]}
                    onPress={() => handleSOSRespond(alert.alertId)}
                  >
                    <Text style={styles.respondButtonText}>Mark Responded</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mapsButton, { flex: 1, marginLeft: 6 }]}
                    onPress={() => openInMaps(alert.latitude, alert.longitude, `SOS ${alert.userName || ''}`)}
                  >
                    <Text style={styles.mapsButtonText}>Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Recent Incidents */}
        <Text style={styles.sectionTitle}>Recent Incident Reports</Text>
        {incidents.map((inc) => (
          <View key={inc.incidentId} style={styles.incidentCard}>
            <View style={styles.incidentHeader}>
              <Text style={styles.incidentType}>
                {inc.type?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <SeverityBadge severity={inc.severity} />
            </View>
            <Text style={styles.incidentDesc} numberOfLines={2}>{inc.description}</Text>
            <View style={styles.incidentFooter}>
              <Text style={styles.incidentTime}>
                {new Date(inc.timestamp).toLocaleString()}
              </Text>
              <StatusBadge status={inc.status} />
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.primaryDark }]}
                onPress={() => openInMaps(inc.latitude, inc.longitude, inc.type)}
              >
                <Text style={styles.actionButtonText}>Open in Maps</Text>
              </TouchableOpacity>
              {inc.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => handleStatusUpdate(inc.incidentId, 'active')}
                >
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
              )}
              {inc.status !== 'resolved' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                  onPress={() => handleStatusUpdate(inc.incidentId, 'resolved')}
                >
                  <Text style={styles.actionButtonText}>Resolve</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.danger }]}
                onPress={() => handleDeleteIncident(inc.incidentId)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primaryDark, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  backButton: { width: 60 },
  backText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  lastUpdated: {
    fontSize: 11, color: COLORS.success, textAlign: 'center',
    paddingVertical: 6, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sosActionRow: { flexDirection: 'row', marginTop: 8 },
  mapsButton: {
    backgroundColor: COLORS.primaryDark, borderRadius: 6,
    padding: 10, alignItems: 'center',
  },
  mapsButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  content: { padding: 12, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 10,
    padding: 12, marginHorizontal: 3, alignItems: 'center',
    borderTopWidth: 3, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 8, marginBottom: 8 },
  sosCard: {
    backgroundColor: '#FFEBEE', borderRadius: 12, padding: 14,
    marginBottom: 8, borderLeftWidth: 4, borderLeftColor: COLORS.danger,
  },
  sosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sosId: { fontSize: 14, fontWeight: '700', color: COLORS.danger },
  sosUser: { fontSize: 14, color: COLORS.text, marginTop: 4 },
  sosLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  respondButton: {
    backgroundColor: COLORS.danger, borderRadius: 6,
    padding: 10, alignItems: 'center', marginTop: 8,
  },
  respondButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  incidentCard: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: 14, marginBottom: 8, elevation: 1,
  },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incidentType: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  incidentDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  incidentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  incidentTime: { fontSize: 12, color: COLORS.grey },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  actionButton: { borderRadius: 6, paddingVertical: 8, paddingHorizontal: 16 },
  actionButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  reportButton: {
    backgroundColor: COLORS.primary, marginHorizontal: 12, marginTop: 8,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  reportButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});

export default SecurityDashboardScreen;
