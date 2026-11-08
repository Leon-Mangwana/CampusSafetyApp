import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { SeverityBadge, StatusBadge } from '../../components/Badge';
import PlaceLabel from '../../components/PlaceLabel';
import { openInMaps } from '../../utils/maps';

export const formatType = (type) =>
  type ? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Other';

const IncidentCard = ({ incident, onStatus, onDelete }) => (
  <View style={styles.card}>
    <View style={styles.headerRow}>
      <Text style={styles.type}>{formatType(incident.type)}</Text>
      <SeverityBadge severity={incident.severity} />
    </View>
    <Text style={styles.desc} numberOfLines={3}>{incident.description}</Text>
    <PlaceLabel latitude={incident.latitude} longitude={incident.longitude} />
    <View style={styles.footer}>
      <Text style={styles.time}>{new Date(incident.timestamp).toLocaleString()}</Text>
      <StatusBadge status={incident.status} />
    </View>
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: COLORS.primaryDark }]}
        onPress={() => openInMaps(incident.latitude, incident.longitude, formatType(incident.type))}
        accessibilityRole="button"
      >
        <Text style={styles.actionText}>Map</Text>
      </TouchableOpacity>
      {incident.status === 'pending' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          onPress={() => onStatus(incident.incidentId, 'active')}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>Accept</Text>
        </TouchableOpacity>
      )}
      {incident.status !== 'resolved' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.success }]}
          onPress={() => onStatus(incident.incidentId, 'resolved')}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>Resolve</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: COLORS.danger }]}
        onPress={() => onDelete(incident.incidentId)}
        accessibilityRole="button"
      >
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  time: { fontSize: 12, color: COLORS.grey },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  actionButton: { borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  actionText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
});

export default React.memo(IncidentCard);
