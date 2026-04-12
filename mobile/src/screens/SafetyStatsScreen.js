import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { getIncidentStats } from '../services/api';

const StatCard = ({ value, label, color }) => (
  <View style={[styles.statCard, { borderTopColor: color || COLORS.primary }]}>
    <Text style={[styles.statValue, { color: color || COLORS.primary }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SafetyStatsScreen = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getIncidentStats();
      setStats(data);
    } catch {
      // Demo data
      setStats({
        total: 127,
        pending: 12,
        active: 3,
        resolved: 112,
        resolutionRate: '89%',
        sosAlertsHandled: 15,
        byType: { theft: 42, harassment: 30, assault: 21, unauthorized_access: 18, vandalism: 16 },
        bySeverity: { high: 36, medium: 57, low: 34 },
        hotspots: [
          { latitude: -19.4515, longitude: 29.8140, count: 23, types: { theft: 15, vandalism: 8 } },
          { latitude: -19.4525, longitude: 29.8155, count: 18, types: { harassment: 12, assault: 6 } },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Safety Statistics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Statistics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary cards */}
        <View style={styles.statsRow}>
          <StatCard value={stats.total} label="Total Incidents" color={COLORS.primary} />
          <StatCard value={stats.resolutionRate} label="Resolution Rate" color={COLORS.success} />
        </View>
        <View style={styles.statsRow}>
          <StatCard value={stats.pending} label="Pending" color={COLORS.warning} />
          <StatCard value={stats.sosAlertsHandled} label="SOS Handled" color={COLORS.danger} />
        </View>

        {/* By Type */}
        <Text style={styles.sectionTitle}>Incidents by Type</Text>
        <View style={styles.typeList}>
          {stats.byType && Object.entries(stats.byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <View key={type} style={styles.typeRow}>
                <View style={styles.typeBar}>
                  <View
                    style={[
                      styles.typeBarFill,
                      { width: `${(count / stats.total) * 100}%`, backgroundColor: COLORS.primary },
                    ]}
                  />
                </View>
                <Text style={styles.typeLabel}>
                  {type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())} ({count})
                </Text>
              </View>
            ))}
        </View>

        {/* By Severity */}
        <Text style={styles.sectionTitle}>Incidents by Severity</Text>
        <View style={styles.severityRow}>
          {stats.bySeverity && (
            <>
              <View style={styles.severityItem}>
                <Text style={[styles.severityValue, { color: COLORS.severityHigh }]}>
                  {stats.bySeverity.high}
                </Text>
                <Text style={styles.severityLabel}>High</Text>
              </View>
              <View style={styles.severityItem}>
                <Text style={[styles.severityValue, { color: COLORS.severityMedium }]}>
                  {stats.bySeverity.medium}
                </Text>
                <Text style={styles.severityLabel}>Medium</Text>
              </View>
              <View style={styles.severityItem}>
                <Text style={[styles.severityValue, { color: COLORS.severityLow }]}>
                  {stats.bySeverity.low}
                </Text>
                <Text style={styles.severityLabel}>Low</Text>
              </View>
            </>
          )}
        </View>

        {/* Top Hotspots */}
        <Text style={styles.sectionTitle}>Top Safety Hotspots</Text>
        {stats.hotspots && stats.hotspots.map((spot, idx) => (
          <View key={idx} style={styles.hotspotRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{idx + 1}</Text>
            </View>
            <View style={styles.hotspotInfo}>
              <Text style={styles.hotspotCoords}>
                {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
              </Text>
              <Text style={styles.hotspotCount}>{spot.count} incidents</Text>
            </View>
          </View>
        ))}

        <Text style={styles.reportFooter}>
          Generated by Crowdsourced Campus Safety Application | MSU
        </Text>
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
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 12 },
  typeList: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  typeRow: { marginBottom: 12 },
  typeBar: {
    height: 8,
    backgroundColor: COLORS.greyMedium,
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  typeBarFill: { height: '100%', borderRadius: 4 },
  typeLabel: { fontSize: 13, color: COLORS.text },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
  },
  severityItem: { alignItems: 'center' },
  severityValue: { fontSize: 32, fontWeight: '700' },
  severityLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  hotspotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rankText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  hotspotInfo: { flex: 1 },
  hotspotCoords: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  hotspotCount: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  reportFooter: {
    fontSize: 11,
    color: COLORS.grey,
    textAlign: 'center',
    marginTop: 24,
  },
});

export default SafetyStatsScreen;
