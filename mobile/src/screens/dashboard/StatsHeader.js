import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export const SEGMENTS = [
  { key: 'sos', label: 'SOS' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'history', label: 'History' },
];

const StatCard = ({ value, label, color }) => (
  <View style={[styles.statCard, { borderTopColor: color }]} accessibilityLabel={`${label}: ${value}`}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * Pinned header: stat cards plus the segment switcher. Only the list below
 * scrolls, so the officer never loses the counts or the controls.
 */
const StatsHeader = ({ stats, activeSosCount, counts, segment, onSelect }) => (
  <View style={styles.pinnedHeader}>
    <View style={styles.statsRow}>
      <StatCard value={stats.total ?? '–'} label="Total" color={COLORS.primary} />
      <StatCard value={stats.pending ?? '–'} label="Pending" color={COLORS.warning} />
      <StatCard value={activeSosCount} label="Active SOS" color={COLORS.danger} />
      <StatCard value={stats.resolved ?? '–'} label="Resolved" color={COLORS.success} />
    </View>

    <View style={styles.segmentBar} accessibilityRole="tablist">
      {SEGMENTS.map(({ key, label }) => {
        const count = counts[key] || 0;
        const selected = segment === key;
        const urgent = key === 'sos' && count > 0;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}${count ? `, ${count}` : ''}`}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
            {count > 0 && (
              <View style={[styles.segmentCount, urgent && styles.segmentCountUrgent]}>
                <Text style={styles.segmentCountText}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  pinnedHeader: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 10,
    padding: 12, marginHorizontal: 3, alignItems: 'center',
    borderTopWidth: 3, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  segmentBar: { flexDirection: 'row', backgroundColor: COLORS.border, borderRadius: 8, padding: 3 },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 6, gap: 6,
  },
  segmentSelected: { backgroundColor: COLORS.white, elevation: 2 },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextSelected: { color: COLORS.primary },
  segmentCount: {
    minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 9,
    backgroundColor: COLORS.grey, alignItems: 'center',
  },
  segmentCountUrgent: { backgroundColor: COLORS.danger },
  segmentCountText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
});

export default StatsHeader;
