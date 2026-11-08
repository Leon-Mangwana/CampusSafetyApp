import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../constants/theme';

// Pinned Leaflet build with Subresource Integrity so a compromised CDN cannot
// inject script into the WebView. Hashes are for leaflet@1.9.4.
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CSS_SRI = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_JS_SRI = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';

// Palette used inside the WebView. Kept in sync with COLORS by hand because
// the HTML is a string; values are listed once here.
const PALETTE = {
  high: COLORS.severityHigh,
  medium: COLORS.severityMedium,
  low: COLORS.severityLow,
  user: COLORS.primary,
  userFill: COLORS.primaryLight,
  danger: COLORS.danger,
  text: COLORS.text,
  grey: COLORS.grey,
};

const buildHtml = ({ latitude, longitude, zoom, landmarks }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="${LEAFLET_CSS}" integrity="${LEAFLET_CSS_SRI}" crossorigin="anonymous" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #f5f5f5; }
    .building-label {
      display: inline-block; background: #fff; border: 1px solid ${PALETTE.grey};
      border-radius: 4px; padding: 2px 8px; color: ${PALETTE.text};
      font: 600 11px/1.1 -apple-system, Segoe UI, Roboto, sans-serif;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15); white-space: nowrap; text-align: center;
      transform: translateX(-50%);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="${LEAFLET_JS}" integrity="${LEAFLET_JS_SRI}" crossorigin="anonymous"></script>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${latitude}, ${longitude}], ${zoom});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var P = ${JSON.stringify(PALETTE)};
    var haloLayers = [];
    var userMarker = null;
    var focusMarker = null;
    var sosMarker = null, sosCircle = null, sosTrail = null, sosPath = [];

    var colorFor = function (w) { return w >= 3 ? P.high : (w >= 2 ? P.medium : P.low); };

    // Heat cells: three concentric halos per point, sized by weight/count.
    var renderPoints = function (points) {
      haloLayers.forEach(function (c) { map.removeLayer(c); });
      haloLayers = [];
      points.forEach(function (p) {
        if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return;
        var color = colorFor(p.weight || 1);
        var base = 30 + Math.min(p.weight || 1, 6) * 14;
        [[2.4, 0.15], [1.6, 0.28], [1.0, 0.55]].forEach(function (ring) {
          var c = L.circle([p.latitude, p.longitude], {
            radius: base * ring[0], color: color, fillColor: color,
            fillOpacity: ring[1], opacity: 0, weight: 0, interactive: false
          }).addTo(map);
          haloLayers.push(c);
        });
      });
    };

    var landmarks = ${JSON.stringify(landmarks || [])};
    landmarks.forEach(function (b) {
      L.marker([b.latitude, b.longitude], {
        icon: L.divIcon({ className: '', html: '<div class="building-label">' + b.name + '</div>', iconSize: null, iconAnchor: [0, 10] }),
        interactive: false, keyboard: false
      }).addTo(map);
    });

    var setUserLocation = function (lat, lng, pan) {
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([lat, lng], { radius: 8, color: P.user, fillColor: P.userFill, fillOpacity: 1, weight: 2 }).addTo(map);
      if (pan) map.setView([lat, lng], 17);
    };

    var focusOn = function (lat, lng, count) {
      if (focusMarker) map.removeLayer(focusMarker);
      focusMarker = L.circleMarker([lat, lng], { radius: 14, color: P.danger, fillColor: P.danger, fillOpacity: 0.5, weight: 3 }).addTo(map);
      if (typeof count === 'number') focusMarker.bindPopup('Hotspot: ' + count + ' incidents').openPopup();
      map.setView([lat, lng], 18);
    };

    // Single moving SOS pin with accuracy circle and trail; follows the pin.
    var updateSOS = function (lat, lng, accuracy) {
      var ll = [lat, lng];
      sosPath.push(ll);
      var r = Math.max(accuracy || 30, 15);
      if (sosMarker) { sosMarker.setLatLng(ll); sosCircle.setLatLng(ll); sosCircle.setRadius(r); }
      else {
        sosMarker = L.circleMarker(ll, { radius: 10, color: '#fff', fillColor: P.danger, fillOpacity: 1, weight: 3 }).addTo(map).bindPopup('SOS location').openPopup();
        sosCircle = L.circle(ll, { radius: r, color: P.danger, fillColor: P.danger, fillOpacity: 0.2, weight: 1 }).addTo(map);
      }
      if (sosTrail) map.removeLayer(sosTrail);
      if (sosPath.length > 1) sosTrail = L.polyline(sosPath, { color: P.danger, weight: 3, opacity: 0.6, dashArray: '6,6' }).addTo(map);
      map.setView(ll, map.getZoom(), { animate: true });
    };

    window.handleMessage = function (raw) {
      try {
        var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (msg.type === 'points') renderPoints(msg.points || []);
        else if (msg.type === 'userLocation') setUserLocation(msg.latitude, msg.longitude, !!msg.pan);
        else if (msg.type === 'focus') focusOn(msg.latitude, msg.longitude, msg.count);
        else if (msg.type === 'sos') updateSOS(msg.latitude, msg.longitude, msg.accuracy);
        else if (msg.type === 'setView') map.setView([msg.latitude, msg.longitude], msg.zoom || map.getZoom());
      } catch (e) {}
    };
    document.addEventListener('message', function (e) { window.handleMessage(e.data); });
    window.addEventListener('message', function (e) { window.handleMessage(e.data); });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
  </script>
</body>
</html>`;

// Only the inline document may load; any navigation away (tapping an
// attribution link, a malicious redirect) is blocked. Tile images are
// sub-resources and are not affected.
const allowRequest = (req) => req.url.startsWith('about:') || req.url.startsWith('data:');

/**
 * Leaflet map inside a WebView. Messages are queued until the page reports
 * ready, so callers can post immediately after mount.
 *
 * ref.post({ type: 'points' | 'userLocation' | 'focus' | 'sos' | 'setView', ... })
 */
const LeafletMap = forwardRef(({ latitude, longitude, zoom = 17, landmarks, style, onReady }, ref) => {
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const queueRef = useRef([]);
  const htmlRef = useRef(buildHtml({ latitude, longitude, zoom, landmarks }));

  const send = useCallback((payload) => {
    if (!webRef.current) return;
    const json = JSON.stringify(payload).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    webRef.current.injectJavaScript(`window.handleMessage('${json}'); true;`);
  }, []);

  const post = useCallback((payload) => {
    if (readyRef.current) send(payload);
    else queueRef.current.push(payload);
  }, [send]);

  useImperativeHandle(ref, () => ({ post, isReady: () => readyRef.current }), [post]);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    setReady(true);
    const queued = queueRef.current;
    queueRef.current = [];
    queued.forEach(send);
    if (onReady) onReady();
  }, [send, onReady]);

  useEffect(() => () => { readyRef.current = false; }, []);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['about:*']}
        onShouldStartLoadWithRequest={allowRequest}
        source={{ html: htmlRef.current }}
        style={styles.map}
        onMessage={(e) => { if (e?.nativeEvent?.data === 'ready') markReady(); }}
        onLoadEnd={markReady}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
        accessibilityLabel="Campus map"
      />
      {!ready && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
});

LeafletMap.displayName = 'LeafletMap';

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  map: { flex: 1, backgroundColor: COLORS.greyLight },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LeafletMap;
