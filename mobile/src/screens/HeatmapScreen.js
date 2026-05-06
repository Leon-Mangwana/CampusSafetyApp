import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
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

const REFRESH_INTERVAL_MS = 5000;

// Leaflet HTML payload. The WebView loads this once at mount time, then we
// push data updates via window.postMessage from React Native — avoids
// reloading tiles on every refresh and keeps zoom/pan state intact.
const buildLeafletHtml = (initialLat, initialLng) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #f5f5f5; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${initialLat}, ${initialLng}], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    let circles = [];
    let userMarker = null;

    const colorFor = (weight) => {
      if (weight >= 3) return '#F44336';
      if (weight >= 2) return '#FF9800';
      return '#4CAF50';
    };

    const renderPoints = (points) => {
      circles.forEach((c) => map.removeLayer(c));
      circles = points.map((p) => L.circle([p.latitude, p.longitude], {
        radius: 50 + (p.weight || 1) * 20,
        color: colorFor(p.weight),
        fillColor: colorFor(p.weight),
        fillOpacity: 0.35,
        weight: 1,
      }).addTo(map));
    };

    const setUserLocation = (lat, lng) => {
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([lat, lng], {
        radius: 8, color: '#1565C0', fillColor: '#42A5F5',
        fillOpacity: 1, weight: 2,
      }).addTo(map);
      map.setView([lat, lng], 16);
    };

    const handleMessage = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'points') renderPoints(msg.points || []);
        if (msg.type === 'userLocation') setUserLocation(msg.latitude, msg.longitude);
      } catch (e) {}
    };

    document.addEventListener('message', (e) => handleMessage(e.data));
    window.addEventListener('message', (e) => handleMessage(e.data));
  </script>
</body>
</html>
`;

const HeatmapScreen = () => {
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [locationError, setLocationError] = useState('');
  const [webReady, setWebReady] = useState(false);
  const webRef = useRef(null);
  const filterRef = useRef(activeFilter);
  const userCoordsRef = useRef(null);
  const pendingPointsRef = useRef([]);

  // Build the HTML once. DEFAULT_CAMPUS keeps the initial view sensible
  // before the user's GPS fix arrives.
  const html = useRef(buildLeafletHtml(DEFAULT_CAMPUS.latitude, DEFAULT_CAMPUS.longitude)).current;

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    filterRef.current = activeFilter;
    fetchData();
    const intervalId = setInterval(() => fetchData({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [activeFilter]);

  // Replay buffered messages once the WebView's JS has booted.
  useEffect(() => {
    if (!webReady || !webRef.current) return;
    if (userCoordsRef.current) {
      postToMap({ type: 'userLocation', ...userCoordsRef.current });
    }
    if (pendingPointsRef.current.length > 0) {
      postToMap({ type: 'points', points: pendingPointsRef.current });
    }
  }, [webReady]);

  const postToMap = (payload) => {
    if (!webRef.current) return;
    const json = JSON.stringify(payload).replace(/'/g, "\\'");
    webRef.current.injectJavaScript(`
      (function() {
        try {
          const data = '${json}';
          if (typeof window.handleMessage === 'function') {
            window.handleMessage(data);
          } else {
            const evt = new MessageEvent('message', { data });
            window.dispatchEvent(evt);
          }
        } catch (e) {}
      })();
      true;
    `);
  };

  const getUserLocation = async () => {
    setLocationError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied — tap “Locate Me” after granting in Settings.');
        return;
      }
      // High accuracy gives us a much better fix on campus where Balanced
      // sometimes returns the cell-tower location (CBD, miles away).
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      userCoordsRef.current = coords;
      if (webReady) postToMap({ type: 'userLocation', ...coords });
    } catch (err) {
      setLocationError('Unable to get location — check GPS is on, then tap “Locate Me”.');
    }
  };

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const result = await getHeatmapData(filterRef.current);
      const points = result.dataPoints || [];
      pendingPointsRef.current = points;
      if (webReady) postToMap({ type: 'points', points });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      if (!silent) {
        // Demo data so the heatmap is never empty during a demo / when the
        // backend is offline.
        const base = userCoordsRef.current || DEFAULT_CAMPUS;
        const lat = base.latitude;
        const lng = base.longitude;
        const points = [
          { latitude: lat + 0.0004, longitude: lng - 0.0006, weight: 3 },
          { latitude: lat - 0.0006, longitude: lng + 0.0009, weight: 2 },
          { latitude: lat + 0.0009, longitude: lng + 0.0014, weight: 1 },
          { latitude: lat - 0.0011, longitude: lng - 0.0011, weight: 3 },
          { latitude: lat - 0.0001, longitude: lng + 0.0004, weight: 2 },
        ];
        pendingPointsRef.current = points;
        if (webReady) postToMap({ type: 'points', points });
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
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
          onLoadEnd={() => setWebReady(true)}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
        />

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

        <TouchableOpacity style={styles.locateButton} onPress={getUserLocation}>
          <Text style={styles.locateButtonText}>Locate Me</Text>
        </TouchableOpacity>
      </View>

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
  map: { flex: 1, backgroundColor: COLORS.greyLight },
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
