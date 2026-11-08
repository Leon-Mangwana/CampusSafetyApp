import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, FlatList, Alert,
} from 'react-native';
import { COLORS } from '../constants/theme';
import {
  getIncidents, getSOSAlerts, getIncidentStats, updateIncidentStatus, deleteIncident, resolveSOSAlert,
} from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useNow } from '../hooks/useRelativeTime';
import ErrorState from '../components/ErrorState';
import { StatusBadge } from '../components/Badge';
import StatsHeader from './dashboard/StatsHeader';
import SOSCard from './dashboard/SOSCard';
import IncidentCard from './dashboard/IncidentCard';

const REFRESH_INTERVAL_MS = 10000;
const REFRESH_INTERVAL_ACTIVE_SOS_MS = 3000;

const SecurityDashboardScreen = ({ navigation }) => {
  const [segment, setSegment] = useState('sos');
  const [stats, setStats] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [recentSos, setRecentSos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});
  const mountedRef = useRef(true);
  // Only the SOS segment needs second-by-second "Updated Xs ago" labels.
  const now = useNow(segment === 'sos' ? 1000 : 60000);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAll = useCallback(async () => {
    const [statsRes, incRes, sosRes] = await Promise.allSettled([
      getIncidentStats(),
      getIncidents({ limit: 50 }),
      getSOSAlerts(),
    ]);
    if (!mountedRef.current) return;

    const nextErrors = {};
    if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    else nextErrors.stats = statsRes.reason?.message || 'Failed to load statistics';

    if (incRes.status === 'fulfilled') setIncidents(incRes.value.incidents || []);
    else nextErrors.incidents = incRes.reason?.message || 'Failed to load incidents';

    if (sosRes.status === 'fulfilled') {
      const all = sosRes.value.alerts || [];
      setSosAlerts(all.filter((a) => a.status === 'active'));
      setRecentSos(all.filter((a) => a.status !== 'active').slice(0, 10));
    } else {
      nextErrors.sos = sosRes.reason?.message || 'Failed to load SOS alerts';
    }
    setErrors(nextErrors);
  }, []);

  // Poll faster while an SOS is live so officers see the pin move.
  const pollMs = sosAlerts.length > 0 ? REFRESH_INTERVAL_ACTIVE_SOS_MS : REFRESH_INTERVAL_MS;
  const { refresh } = usePolling(fetchAll, pollMs);

  // A new emergency must never sit behind a tap: when the active-alert count
  // rises from zero, pull the officer to the SOS segment. Only on the 0 -> n
  // edge so an officer reviewing incidents isn't yanked away on every poll.
  const hadActiveSos = useRef(false);
  useEffect(() => {
    if (sosAlerts.length > 0 && !hadActiveSos.current) setSegment('sos');
    hadActiveSos.current = sosAlerts.length > 0;
  }, [sosAlerts.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    if (mountedRef.current) setRefreshing(false);
  }, [fetchAll]);

  const handleStatusUpdate = useCallback(async (incidentId, newStatus) => {
    try {
      await updateIncidentStatus(incidentId, newStatus);
      await fetchAll();
    } catch (err) {
      Alert.alert('Update Failed', err?.message || 'Could not update the incident status.');
    }
  }, [fetchAll]);

  const handleSOSRespond = useCallback(async (alertId) => {
    try {
      await resolveSOSAlert(alertId, 'responded');
      await fetchAll();
    } catch (err) {
      Alert.alert('Update Failed', err?.message || 'Could not mark the SOS as responded.');
    }
  }, [fetchAll]);

  const handleTrack = useCallback((alert) => {
    navigation.navigate('SOSTracker', { alertId: alert.alertId, initialAlert: alert });
  }, [navigation]);

  const handleDeleteIncident = useCallback((incidentId) => {
    Alert.alert(
      'Delete Incident',
      'Permanently remove this incident from the dashboard? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic removal, then sync with the backend.
            setIncidents((prev) => prev.filter((i) => i.incidentId !== incidentId));
            try {
              await deleteIncident(incidentId);
            } catch (err) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete the incident.');
            }
            await fetchAll();
          },
        },
      ],
    );
  }, [fetchAll]);

  const data = useMemo(() => {
    if (segment === 'sos') return sosAlerts;
    if (segment === 'incidents') return incidents;
    return recentSos;
  }, [segment, sosAlerts, incidents, recentSos]);

  const keyExtractor = useCallback((item) => item.alertId || item.incidentId, []);

  const renderItem = useCallback(({ item }) => {
    if (segment === 'sos') {
      return <SOSCard alert={item} now={now} onTrack={handleTrack} onRespond={handleSOSRespond} />;
    }
    if (segment === 'incidents') {
      return <IncidentCard incident={item} onStatus={handleStatusUpdate} onDelete={handleDeleteIncident} />;
    }
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyUser} numberOfLines={1}>{item.userName || 'Unknown'}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.historyTime}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
    );
  }, [segment, now, handleTrack, handleSOSRespond, handleStatusUpdate, handleDeleteIncident]);

  const segmentError = errors[segment];
  const emptyText = {
    sos: 'No active SOS alerts right now.',
    incidents: 'No incident reports yet.',
    history: 'No past SOS alerts.',
  }[segment];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Security Dashboard</Text>
        <View style={styles.backButton} />
      </View>

      <StatsHeader
        stats={stats}
        activeSosCount={sosAlerts.length}
        counts={{ sos: sosAlerts.length, incidents: incidents.length, history: recentSos.length }}
        segment={segment}
        onSelect={setSegment}
      />

      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={now}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={segmentError ? (
          <ErrorState
            compact
            title="Could not refresh — the list below may be out of date"
            message={segmentError}
            onRetry={refresh}
          />
        ) : null}
        ListEmptyComponent={!segmentError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : null}
        initialNumToRender={8}
        windowSize={5}
        removeClippedSubviews
      />
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
  content: { padding: 12, paddingBottom: 32 },
  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 13 },
  historyCard: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12,
    marginBottom: 6, borderLeftWidth: 3, borderLeftColor: COLORS.grey,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyUser: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  historyTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});

export default SecurityDashboardScreen;
