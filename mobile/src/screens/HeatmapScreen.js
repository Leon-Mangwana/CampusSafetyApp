import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Platform,
} from 'react-native';
import MapView, { Circle, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, DEFAULT_CAMPUS } from '../constants/theme';
import { getHeatmapData } from '../services/api';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Theft', value: 'theft' },
  { label: 'Assault', value: 'assault' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Vandalism', value: 'vandalism' },
];

const getCircleColor = (weight) => {
  if (weight >= 3) return 'rgba(244,67,54,0.35)';  // High - red
  if (weight >= 2) return 'rgba(255,152,0,0.35)';  // Medium - orange
  return 'rgba(76,175,80,0.35)';                    // Low - green
};

const REFRESH_INTERVAL_MS = 5000;

const HeatmapScreen = () => {
  const [dataPoints, setDataPoints] = useState([]);
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [locationError, setLocationError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const filterRef = useRef(activeFilter);
  const userRegionRef = useRef(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    filterRef.current = activeFilter;
    fetchData();
    const intervalId = setInterval(() => fetchData({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [activeFilter]);

  // When the map becomes ready after the user's GPS fix has already arrived,
  // animate to their location. This handles the race where GPS resolves
  // before the MapView finishes mounting.
  useEffect(() => {
    if (mapReady && userRegionRef.current && mapRef.current) {
      mapRef.current.animateToRegion(userRegionRef.current, 500);
    }
  }, [mapReady]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied — showing default campus view.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      userRegionRef.current = region;
      if (mapRef.current) mapRef.current.animateToRegion(region, 500);
    } catch (err) {
      setLocationError('Unable to get location — showing default campus view.');
    }
  };

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const result = await getHeatmapData(filterRef.current);
      setDataPoints(result.dataPoints || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      if (!silent) {
        // Use demo data if API is unavailable so the heatmap is never empty
        // during a demo / when the backend is offline.
        const base = userRegionRef.current || DEFAULT_CAMPUS;
        const lat = base.latitude;
        const lng = base.longitude;
        setDataPoints([
          { latitude: lat + 0.0004, longitude: lng - 0.0006, weight: 3, type: 'theft', severity: 'high' },
          { latitude: lat - 0.0006, longitude: lng + 0.0009, weight: 2, type: 'harassment', severity: 'medium' },
          { latitude: lat + 0.0009, longitude: lng + 0.0014, weight: 1, type: 'vandalism', severity: 'low' },
          { latitude: lat - 0.0011, longitude: lng - 0.0011, weight: 3, type: 'assault', severity: 'high' },
          { latitude: lat - 0.0001, longitude: lng + 0.0004, weight: 2, type: 'theft', severity: 'medium' },
        ]);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Heatmap</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          // Force the Google Maps provider on Android. Without this, some
          // Android devices render a blank tile surface.
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={DEFAULT_CAMPUS}
          showsUserLocation
          showsMyLocationButton
          onMapReady={() => setMapReady(true)}
        >
          {/* OpenStreetMap tiles overlay the base Google layer. This keeps the
              map visible inside Expo Go (where app.json's Google Maps API key
              is ignored) and during dev without a custom build. */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {dataPoints.map((point, index) => (
            <Circle
              key={index}
              center={{ latitude: point.latitude, longitude: point.longitude }}
              radius={50 + point.weight * 20}
              fillColor={getCircleColor(point.weight)}
              strokeColor={getCircleColor(point.weight).replace('0.35', '0.6')}
              strokeWidth={1}
            />
          ))}
        </MapView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}

        {!!locationError && (
          <View style={styles.locationBanner}>
            <Text style={styles.locationBannerText}>{locationError}</Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
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

      {/* Filters */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Filter:</Text>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.value)}
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

      <Text style={styles.lastUpdated}>
        Last updated: {lastUpdated || 'Loading...'} (auto-refresh every 5s)
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { backgroundColor: COLORS.primary, padding: 16, alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
