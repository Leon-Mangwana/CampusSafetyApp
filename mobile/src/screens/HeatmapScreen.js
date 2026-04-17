import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Dimensions,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
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

const HeatmapScreen = () => {
  const [dataPoints, setDataPoints] = useState([]);
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [region, setRegion] = useState(DEFAULT_CAMPUS);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeFilter]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch { /* use default */ }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getHeatmapData(activeFilter);
      setDataPoints(result.dataPoints || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      // Use demo data if API is unavailable
      const lat = region.latitude || 0;
      const lng = region.longitude || 0;
      setDataPoints([
        { latitude: lat + 0.0004, longitude: lng - 0.0006, weight: 3, type: 'theft', severity: 'high' },
        { latitude: lat - 0.0006, longitude: lng + 0.0009, weight: 2, type: 'harassment', severity: 'medium' },
        { latitude: lat + 0.0009, longitude: lng + 0.0014, weight: 1, type: 'vandalism', severity: 'low' },
        { latitude: lat - 0.0011, longitude: lng - 0.0011, weight: 3, type: 'assault', severity: 'high' },
        { latitude: lat - 0.0001, longitude: lng + 0.0004, weight: 2, type: 'theft', severity: 'medium' },
      ]);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Heatmap</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
        >
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

      <Text style={styles.lastUpdated}>Last updated: {lastUpdated || 'Loading...'}</Text>
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
