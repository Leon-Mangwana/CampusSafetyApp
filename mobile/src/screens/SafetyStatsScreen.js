import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { getIncidentStats } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import ErrorState from '../components/ErrorState';
import PlaceLabel from '../components/PlaceLabel';

// Statistics change slowly; refresh on focus and every two minutes.
const REFRESH_INTERVAL_MS = 120000;

const formatType = (type) => type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const StatCard = ({ value, label, color }) => (
  <View style={[styles.statCard, { borderTopColor: color || COLORS.primary }]} accessibilityLabel={`${label}: ${value}`}>
    <Text style={[styles.statValue, { color: color || COLORS.primary }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SafetyStatsScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await getIncidentStats();
      setStats(data);
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not load statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const { refresh } = usePolling(fetchStats, REFRESH_INTERVAL_MS);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Safety Statistics</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.content}>
          <ErrorState title="Could not load statistics" message={error} onRetry={refresh} />
        </View>
      </SafeAreaView>
    );
  }

  const total = stats.total || 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!!error && (
          <ErrorState compact title="Showing last loaded statistics" message={error} onRetry={refresh} />
        )}

        <Text style={styles.windowNote}>Last {stats.windowDays || 90} days</Text>

        <View style={styles.statsRow}>
          <StatCard value={total} label="Total Incidents" color={COLORS.primary} />
          <StatCard value={stats.resolutionRate} label="Resolution Rate" color={COLORS.success} />
        </View>
        <View style={styles.statsRow}>
          <StatCard value={stats.pending} label="Pending" color={COLORS.warning} />
          <StatCard value={stats.sosAlertsHandled} label="SOS Handled" color={COLORS.danger} />
        </View>

        <Text style={styles.sectionTitle}>Incidents by Type</Text>
        <View style={styles.typeList}>
          {total === 0 && <Text style={styles.emptyText}>No incidents reported in this period.</Text>}
          {stats.byType && Object.entries(stats.byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <View key={type} style={styles.typeRow} accessibilityLabel={`${formatType(type)}: ${count}`}>
                <View style={styles.typeBar}>
                  <View style={[styles.typeBarFill, { width: `${total ? (count / total) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.typeLabel}>{formatType(type)} ({count})</Text>
              </View>
            ))}
        </View>

        <Text style={styles.sectionTitle}>Incidents by Severity</Text>
        <View style={styles.severityRow}>
          {['high', 'medium', 'low'].map((level) => (
            <View key={level} style={styles.severityItem} accessibilityLabel={`${level} severity: ${stats.bySeverity?.[level] ?? 0}`}>
              <Text style={[styles.severityValue, { color: COLORS[`severity${level[0].toUpperCase()}${level.slice(1)}`] }]}>
                {stats.bySeverity?.[level] ?? 0}
              </Text>
              <Text style={styles.severityLabel}>{formatType(level)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Top Safety Hotspots</Text>
        <Text style={styles.sectionHint}>
          Areas with two or more reports. Tap one to see it on the map.
        </Text>
        {(!stats.hotspots || stats.hotspots.length === 0) && (
          <Text style={styles.emptyText}>No hotspots yet — that is good news.</Text>
        )}
        {stats.hotspots && stats.hotspots.map((spot, idx) => (
          <TouchableOpacity
            key={`${spot.latitude},${spot.longitude}`}
            style={styles.hotspotRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', {
              screen: 'Heatmap',
              params: { focusLat: spot.latitude, focusLng: spot.longitude, focusCount: spot.count },
            })}
            accessibilityRole="button"
            accessibilityLabel={`Hotspot ${idx + 1}, ${spot.count} incidents. Show on map.`}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{idx + 1}</Text>
            </View>
            <View style={styles.hotspotInfo}>
              <PlaceLabel
                latitude={spot.latitude}
                longitude={spot.longitude}
                prefix=""
                style={styles.hotspotName}
                fallback={<Text style={styles.hotspotName}>Campus zone {idx + 1}</Text>}
              />
              <Text style={styles.hotspotCount}>{spot.count} incidents</Text>
            </View>
            <Text style={styles.hotspotChevron}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.reportFooter}>Generated by Campus Safety Application</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: 16, alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  windowNote: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, textAlign: 'right' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginHorizontal: 4,
    alignItems: 'center', borderTopWidth: 3, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 12 },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: -8, marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  typeList: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  typeRow: { marginBottom: 12 },
  typeBar: { height: 8, backgroundColor: COLORS.greyMedium, borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  typeBarFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
  typeLabel: { fontSize: 13, color: COLORS.text },
  severityRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.white, borderRadius: 12, padding: 20,
  },
  severityItem: { alignItems: 'center' },
  severityValue: { fontSize: 32, fontWeight: '700' },
  severityLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  hotspotRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 14, marginBottom: 8,
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rankText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  hotspotInfo: { flex: 1 },
  hotspotName: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginTop: 0 },
  hotspotCount: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  hotspotChevron: { fontSize: 22, color: COLORS.grey, marginLeft: 8 },
  reportFooter: { fontSize: 11, color: COLORS.grey, textAlign: 'center', marginTop: 24 },
});

export default SafetyStatsScreen;
