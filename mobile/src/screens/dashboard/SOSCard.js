import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { StatusBadge } from '../../components/Badge';
import PlaceLabel from '../../components/PlaceLabel';
import { dial } from '../../utils/dial';
import { hasCoords, openInMaps } from '../../utils/maps';
import { formatRelativeTime } from '../../hooks/useRelativeTime';

const SOSCard = ({ alert, now, onTrack, onRespond }) => {
  const located = hasCoords(alert);
  return (
    <View style={styles.card} accessibilityLabel={`Active SOS from ${alert.userName || 'unknown'}`}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{alert.userName || 'Unknown'}</Text>
        <StatusBadge status={alert.status} />
      </View>
      <View style={styles.liveRow}>
        <View style={styles.liveDot} />
        <Text style={styles.liveLabel}>LIVE</Text>
        <Text style={styles.liveTime}>
          Updated {formatRelativeTime(alert.lastUpdated || alert.timestamp, now)}
        </Text>
      </View>

      {located ? (
        <PlaceLabel latitude={alert.latitude} longitude={alert.longitude} />
      ) : (
        <Text style={styles.warning}>
          ⚠ Location unavailable — phone the student{alert.userPhone ? `: ${alert.userPhone}` : ''}
        </Text>
      )}
      {located && alert.locationStatus === 'last_known' && (
        <Text style={styles.warning}>Last known position (GPS fix pending)</Text>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.primary }]} onPress={() => onTrack(alert)} accessibilityRole="button">
          <Text style={styles.actionText}>Track Live</Text>
        </TouchableOpacity>
        {located ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primaryDark }]}
            onPress={() => openInMaps(alert.latitude, alert.longitude, `SOS ${alert.userName || ''}`)}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Open in Maps</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: alert.userPhone ? COLORS.danger : COLORS.grey }]}
            onPress={() => dial(alert.userPhone, alert.userName || 'the student')}
            disabled={!alert.userPhone}
            accessibilityRole="button"
            accessibilityState={{ disabled: !alert.userPhone }}
          >
            <Text style={styles.actionText}>Call Student</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.respondButton} onPress={() => onRespond(alert.alertId)} accessibilityRole="button">
        <Text style={styles.actionText}>Mark Responded</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFEBEE', borderRadius: 12, padding: 14,
    marginBottom: 8, borderLeftWidth: 4, borderLeftColor: COLORS.danger,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.danger, marginRight: 8 },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, marginRight: 6 },
  liveLabel: { color: COLORS.danger, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  liveTime: { marginLeft: 'auto', color: COLORS.textSecondary, fontSize: 11 },
  warning: { fontSize: 12, color: COLORS.warning, fontWeight: '600', marginTop: 2 },
  actionRow: { flexDirection: 'row', marginTop: 8, gap: 12 },
  actionButton: { flex: 1, height: 42, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  respondButton: { backgroundColor: COLORS.danger, borderRadius: 6, padding: 10, alignItems: 'center', marginTop: 8 },
});

export default React.memo(SOSCard);
