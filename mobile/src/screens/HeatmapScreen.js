import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, DEFAULT_CAMPUS } from '../constants/theme';
import { getHeatmapData } from '../services/api';
import LeafletMap from '../components/LeafletMap';
import ErrorState from '../components/ErrorState';
import { usePolling } from '../hooks/usePolling';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Theft', value: 'theft' },
  { label: 'Assault', value: 'assault' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Vandalism', value: 'vandalism' },
];

// Aggregated server data changes slowly; 30 s keeps the view fresh without
// hammering the API from every open tab. Polling pauses when the tab is not
// focused or the app is in the background (see usePolling).
const REFRESH_INTERVAL_MS = 30000;

// Midlands State University Main Campus (Senga, Gweru) building labels.
// Labels only — they carry no risk weighting. Heat comes from real reports.
const MSU_LANDMARKS = [
  { name: 'Library',        latitude: -19.5168, longitude: 29.8322 },
  { name: 'Student Hall',   latitude: -19.5172, longitude: 29.8333 },
  { name: 'Student Centre', latitude: -19.5179, longitude: 29.8340 },
  { name: 'Dining Hall',    latitude: -19.5188, longitude: 29.8328 },
  { name: 'Gymnasium',      latitude: -19.5188, longitude: 29.8344 },
];

const HeatmapScreen = ({ route, navigation }) => {
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [pointCount, setPointCount] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [locationError, setLocationError] = useState('');
  const mapRef = useRef(null);
  const filterRef = useRef(activeFilter);
  filterRef.current = activeFilter;

  const fetchData = useCallback(async ({ silent = true } = {}) => {
    if (!silent) setLoading(true);
    try {
      const result = await getHeatmapData(filterRef.current);
      const points = result.dataPoints || [];
      mapRef.current?.post({ type: 'points', points });
      setPointCount(points.length);
      setLastUpdated(new Date().toLocaleTimeString());
      setFetchError('');
    } catch (error) {
      // Keep whatever is on the map; tell the user it may be stale.
      setFetchError(error?.message || 'Could not refresh the heatmap.');
    } finally {
      setLoading(false);
    }
  }, []);

  const { refresh } = usePolling(fetchData, REFRESH_INTERVAL_MS);

  // Refetch immediately when the filter changes.
  useEffect(() => {
    fetchData({ silent: false });
  }, [activeFilter, fetchData]);

  // Hotspot focus from the Safety Stats screen. Cleared from route params so
  // navigating back and forth doesn't re-focus stale coords.
  const params = route?.params;
  useEffect(() => {
    const { focusLat, focusLng, focusCount } = params || {};
    if (focusLat == null || focusLng == null) return;
    mapRef.current?.post({ type: 'focus', latitude: focusLat, longitude: focusLng, count: focusCount });
    navigation?.setParams?.({ focusLat: undefined, focusLng: undefined, focusCount: undefined });
  }, [params, navigation]);

  const getUserLocation = useCallback(async ({ pan = false } = {}) => {
    setLocationError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied — tap “Locate Me” after granting it in Settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      mapRef.current?.post({
        type: 'userLocation',
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        pan,
      });
    } catch {
      setLocationError('Unable to get location — check GPS is on, then tap “Locate Me”.');
    }
  }, []);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Heatmap</Text>
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          ref={mapRef}
          latitude={DEFAULT_CAMPUS.latitude}
          longitude={DEFAULT_CAMPUS.longitude}
          zoom={17}
          landmarks={MSU_LANDMARKS}
        />

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}

        {!!fetchError && (
          <View style={styles.bannerWrap} pointerEvents="box-none">
            <ErrorState
              compact
              title="Heatmap may be out of date"
              message={fetchError}
              onRetry={() => fetchData({ silent: false })}
            />
          </View>
        )}

        {!fetchError && !!locationError && (
          <View style={styles.locationBanner}>
            <Text style={styles.locationBannerText}>{locationError}</Text>
          </View>
        )}

        {!loading && !fetchError && pointCount === 0 && (
          <View style={styles.emptyBanner} pointerEvents="none">
            <Text style={styles.emptyBannerText}>
              No {activeFilter ? FILTERS.find((f) => f.value === activeFilter)?.label.toLowerCase() : ''} hotspots in the last 90 days.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.locateButton}
          onPress={() => getUserLocation({ pan: true })}
          accessibilityRole="button"
          accessibilityLabel="Locate me on the map"
        >
          <Text style={styles.locateButtonText}>Locate Me</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legendRow} accessibilityLabel="Legend: red high risk, orange medium risk, green low risk">
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.severityHigh }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.severityMedium }]} />
          <Text style={styles.legendText}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.severityLow }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Filter:</Text>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === f.value }}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f.value && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh heatmap now">
        <Text style={[styles.lastUpdated, fetchError && { color: COLORS.warning }]}>
          {lastUpdated ? `Updated ${lastUpdated}` : 'Loading…'} · areas with 2+ reports · tap to refresh
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { backgroundColor: COLORS.primary, padding: 16, alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  mapContainer: { flex: 1, position: 'relative' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerWrap: { position: 'absolute', top: 4, left: 8, right: 8 },
  locationBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(211,47,47,0.9)',
    borderRadius: 8,
    padding: 10,
  },
  locationBannerText: { color: COLORS.white, fontSize: 12, textAlign: 'center', fontWeight: '500' },
  emptyBanner: {
    position: 'absolute', bottom: 12, left: 12, right: 110,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: 10,
    borderLeftWidth: 4, borderLeftColor: COLORS.success,
  },
  emptyBannerText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  locateButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  locateButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 4 },
  legendText: { fontSize: 12, color: COLORS.textSecondary },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginRight: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: COLORS.text },
  filterChipTextActive: { color: COLORS.white },
  lastUpdated: {
    fontSize: 11,
    color: COLORS.success,
    textAlign: 'center',
    paddingBottom: 8,
  },
});

export default HeatmapScreen;
