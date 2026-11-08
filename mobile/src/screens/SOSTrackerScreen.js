import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { COLORS, DEFAULT_CAMPUS } from '../constants/theme';
import { getSOSAlerts, resolveSOSAlert } from '../services/api';
import { dial } from '../utils/dial';
import { hasCoords, openInMaps } from '../utils/maps';
import LeafletMap from '../components/LeafletMap';
import { usePolling } from '../hooks/usePolling';
import { useNow, formatRelativeTime } from '../hooks/useRelativeTime';

const POLL_INTERVAL_MS = 3000;

const SOSTrackerScreen = ({ route, navigation }) => {
  const alertId = route?.params?.alertId;
  const initial = route?.params?.initialAlert || null;
  const [alert, setAlert] = useState(initial);
  const [fetchError, setFetchError] = useState('');
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const mapRef = useRef(null);
  const now = useNow(1000);

  const pushPosition = useCallback((a) => {
    if (!hasCoords(a)) return;
    mapRef.current?.post({ type: 'sos', latitude: a.latitude, longitude: a.longitude, accuracy: a.accuracy });
  }, []);

  const fetchLatest = useCallback(async () => {
    try {
      // Fetch all alerts so a just-resolved alert is still found and the
      // officer sees its final status instead of a stale "LIVE" label.
      const { alerts = [] } = await getSOSAlerts();
      const match = alerts.find((a) => a.alertId === alertId);
      if (match) {
        setAlert(match);
        setLastFetchedAt(Date.now());
        pushPosition(match);
      }
      setFetchError('');
    } catch (err) {
      setFetchError(err?.message || 'Could not refresh');
    }
  }, [alertId, pushPosition]);

  usePolling(fetchLatest, POLL_INTERVAL_MS);

  const handleMapReady = useCallback(() => {
    if (alert) pushPosition(alert);
  }, [alert, pushPosition]);

  const handleRespond = async () => {
    try {
      await resolveSOSAlert(alertId, 'responded');
      Alert.alert('Marked Responded', 'The SOS alert has been marked as responded.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not update the alert. Please try again.');
    }
  };

  const located = hasCoords(alert);
  const isLive = alert?.status === 'active';
  const relTime = formatRelativeTime(alert?.lastUpdated || alert?.timestamp || lastFetchedAt, now);

  let locationText = 'Awaiting first GPS fix...';
  if (alert && !located) locationText = 'Location unavailable — phone the student';
  else if (located) {
    locationText = `${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`;
    if (alert.locationStatus === 'last_known') locationText += ' (last known position)';
    if (Number.isFinite(alert.accuracy)) locationText += ` ±${alert.accuracy}m`;
  }

  const centre = hasCoords(initial) ? initial : DEFAULT_CAMPUS;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live SOS Tracker</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.infoBar, !isLive && styles.infoBarResolved]} accessibilityLiveRegion="polite">
        <View style={styles.liveRow}>
          <View style={[styles.liveDot, !isLive && { backgroundColor: COLORS.grey }]} />
          <Text style={[styles.liveText, !isLive && { color: COLORS.grey }]}>
            {isLive ? 'LIVE' : (alert?.status || 'UNKNOWN').toUpperCase()}
          </Text>
          <Text style={styles.relTime}>Updated {relTime}</Text>
        </View>
        <Text style={styles.userName}>{alert?.userName || 'Unknown'}</Text>
        {!!alert?.userPhone && <Text style={styles.phone}>{alert.userPhone}</Text>}
        <Text style={[styles.coords, alert && !located && styles.coordsWarning]}>{locationText}</Text>
        {!!fetchError && <Text style={styles.fetchError}>⚠ {fetchError}</Text>}
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          ref={mapRef}
          latitude={centre.latitude}
          longitude={centre.longitude}
          zoom={17}
          onReady={handleMapReady}
        />
        {alert && !located && (
          <View style={styles.noLocationOverlay} pointerEvents="none">
            <Text style={styles.noLocationText}>No GPS fix from the student's phone yet</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {!!alert?.userPhone && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
            onPress={() => dial(alert.userPhone, alert.userName || 'the student')}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Call Student</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: located ? COLORS.primary : COLORS.grey }]}
          onPress={() => openInMaps(alert?.latitude, alert?.longitude, `SOS ${alert?.userName || ''}`)}
          disabled={!located}
          accessibilityRole="button"
          accessibilityState={{ disabled: !located }}
        >
          <Text style={styles.actionText}>Open in Maps</Text>
        </TouchableOpacity>
        {isLive && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={handleRespond} accessibilityRole="button">
            <Text style={styles.actionText}>Mark Responded</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.danger, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { width: 60 },
  backText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  infoBar: {
    padding: 14,
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoBarResolved: { backgroundColor: COLORS.greyLight },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger, marginRight: 6 },
  liveText: { color: COLORS.danger, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  relTime: { marginLeft: 'auto', color: COLORS.textSecondary, fontSize: 12 },
  userName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  phone: { fontSize: 13, color: COLORS.text, marginTop: 2 },
  coords: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  coordsWarning: { color: COLORS.warning, fontWeight: '600' },
  fetchError: { fontSize: 11, color: COLORS.warning, marginTop: 4 },
  mapContainer: { flex: 1, position: 'relative' },
  noLocationOverlay: {
    position: 'absolute', top: 12, left: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: 10,
    borderLeftWidth: 4, borderLeftColor: COLORS.warning,
  },
  noLocationText: { color: COLORS.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  actions: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  actionText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

export default SOSTrackerScreen;
