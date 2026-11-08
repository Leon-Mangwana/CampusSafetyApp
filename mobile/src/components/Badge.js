import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const STATUS_COLORS = {
  pending: COLORS.warning,
  active: COLORS.danger,
  resolved: COLORS.success,
  responded: COLORS.primary,
  closed: COLORS.grey,
};

const SEVERITY_COLORS = {
  low: COLORS.severityLow,
  medium: COLORS.severityMedium,
  high: COLORS.severityHigh,
};

// Text labels accompany colour so severity/status are not conveyed by colour
// alone (WCAG 1.4.1).
const Badge = ({ label, color, accessibilityLabel }) => (
  <View
    style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}
    accessibilityLabel={accessibilityLabel || label}
  >
    <Text style={[styles.text, { color }]}>{label}</Text>
  </View>
);

export const StatusBadge = ({ status }) => (
  <Badge
    label={capitalise(status) || 'Unknown'}
    color={STATUS_COLORS[status] || COLORS.grey}
    accessibilityLabel={`Status: ${status || 'unknown'}`}
  />
);

export const SeverityBadge = ({ severity }) => (
  <Badge
    label={`${capitalise(severity) || 'Unknown'} severity`}
    color={SEVERITY_COLORS[severity] || COLORS.grey}
    accessibilityLabel={`Severity: ${severity || 'unknown'}`}
  />
);

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 11, fontWeight: '600' },
});

export default Badge;
