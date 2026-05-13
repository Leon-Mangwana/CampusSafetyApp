import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  SafeAreaView, Linking, Platform, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, DEFAULT_CAMPUS } from '../constants/theme';
import { getSOSAlerts, resolveSOSAlert } from '../services/api';

const POLL_INTERVAL_MS = 3000;

// Leaflet map that exposes a single moving SOS pin. We pan the map to follow
// the pin so security never has to scroll to find the person.
const LEAFLET_HTML = (lat, lng) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; background: #f5f5f5; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${lat}, ${lng}], 17);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    let sosMarker = null;
    let pulseCircle = null;
    let trail = null;
    const path = [];

    const updateSOS = (lat, lng) => {
      const ll = [lat, lng];
      path.push(ll);
      if (sosMarker) {
        sosMarker.setLatLng(ll);
        pulseCircle.setLatLng(ll);
      } else {
        sosMarker = L.circleMarker(ll, {
          radius: 10, color: '#FFFFFF', fillColor: '#D32F2F',
          fillOpacity: 1, weight: 3,
        }).addTo(map).bindPopup('SOS location').openPopup();
        pulseCircle = L.circle(ll, {
          radius: 30, color: '#D32F2F', fillColor: '#D32F2F',
          fillOpacity: 0.2, weight: 1,
        }).addTo(map);
      }
      if (trail) map.removeLayer(trail);
      if (path.length > 1) {
        trail = L.polyline(path, { color: '#D32F2F', weight: 3, opacity: 0.6, dashArray: '6,6' }).addTo(map);
      }
      map.setView(ll, map.getZoom(), { animate: true });
    };

    const handleMessage = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'sos') updateSOS(msg.latitude, msg.longitude);
      } catch (e) {}
    };
    document.addEventListener('message', (e) => handleMessage(e.data));
    window.addEventListener('message', (e) => handleMessage(e.data));
  </script>
</body>
</html>
`;

const formatRelativeTime = (iso) => {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

const SOSTrackerScreen = ({ route, navigation }) => {
  const alertId = route?.params?.alertId;
  const [alert, setAlert] = useState(route?.params?.initialAlert || null);
  const [webReady, setWebReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const webRef = useRef(null);
  const pendingRef = useRef(null);
  const intervalRef = useRef(null);
  const tickerRef = useRef(null);

  // Initial map centre: the alert's first known position, or campus default.
  const initialLat = alert?.latitude ?? DEFAULT_CAMPUS.latitude;
  const initialLng = alert?.longitude ?? DEFAULT_CAMPUS.longitude;
  const htmlRef = useRef(LEAFLET_HTML(initialLat, initialLng));

  const postToMap = (payload) => {
    if (!webRef.current) return;
    const json = JSON.stringify(payload).replace(/'/g, "\\'");
    webRef.current.injectJavaScript(`
      (function() {
        try {
          const data = '${json}';
          const evt = new MessageEvent('message', { data });
          window.dispatchEvent(evt);
        } catch (e) {}
      })();
      true;
    `);
  };

  const fetchLatest = async () => {
    try {
      const { alerts = [] } = await getSOSAlerts('active');
      const match = alerts.find((a) => a.alertId === alertId);
      if (match) {
        setAlert(match);
        setLastFetchedAt(new Date().toISOString());
        const payload = { type: 'sos', latitude: match.latitude, longitude: match.longitude };
        if (webReady) postToMap(payload);
        else pendingRef.current = payload;
      }
    } catch { /* ignore — keep polling */ }
  };

  useEffect(() => {
    if (alert) {
      const initial = { type: 'sos', latitude: alert.latitude, longitude: alert.longitude };
      if (webReady) postToMap(initial);
      else pendingRef.current = initial;
    }
    fetchLatest();
    intervalRef.current = setInterval(fetchLatest, POLL_INTERVAL_MS);
    // Re-render the "Updated Xs ago" label every second.
    tickerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(tickerRef.current);
    };
  }, []);

  useEffect(() => {
    if (webReady && pendingRef.current) {
      postToMap(pendingRef.current);
      pendingRef.current = null;
    }
  }, [webReady]);

  const handleRespond = async () => {
    try {
      await resolveSOSAlert(alertId, 'responded');
      Alert.alert('Marked Responded', 'The SOS alert has been marked as responded.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not update the alert. Please try again.');
    }
  };

  const handleOpenExternal = () => {
    if (!alert) return;
    const { latitude: lat, longitude: lng } = alert;
    const label = encodeURIComponent(`SOS ${alert.userName || ''}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
    );
  };

  // Re-rendered every second by `tick`; pick the freshest timestamp.
  const relTime = formatRelativeTime(alert?.lastUpdated || alert?.timestamp || lastFetchedAt);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live SOS Tracker</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.infoBar}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
          <Text style={styles.relTime}>Updated {relTime}</Text>
        </View>
        <Text style={styles.userName}>{alert?.userName || 'Unknown'} — {alertId}</Text>
        <Text style={styles.coords}>
          {alert
            ? `${alert.latitude?.toFixed(6)}, ${alert.longitude?.toFixed(6)}`
            : 'Awaiting first GPS fix...'}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: htmlRef.current }}
          style={styles.map}
          onLoadEnd={() => setWebReady(true)}
          javaScriptEnabled
          domStorageEnabled
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={handleOpenExternal}>
          <Text style={styles.actionText}>Open in Google Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={handleRespond}>
          <Text style={styles.actionText}>Mark Responded</Text>
        </TouchableOpacity>
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
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  liveDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger,
    marginRight: 6,
  },
  liveText: { color: COLORS.danger, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  relTime: { marginLeft: 'auto', color: COLORS.textSecondary, fontSize: 12 },
  userName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  coords: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1, backgroundColor: COLORS.greyLight },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  actions: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  actionText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

export default SOSTrackerScreen;
