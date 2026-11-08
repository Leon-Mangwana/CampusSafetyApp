import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

/**
 * Shown instead of data when a request fails. Never substitute demo data in a
 * safety app: an officer must know when the list could be stale.
 */
const ErrorState = ({
  title = 'Could not load data',
  message,
  onRetry,
  retryLabel = 'Retry',
  compact = false,
  style,
}) => (
  <View style={[styles.container, compact && styles.compact, style]} accessibilityRole="alert">
    <Text style={styles.title}>⚠ {title}</Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
    {onRetry && (
      <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.buttonText}>{retryLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    alignItems: 'flex-start',
  },
  compact: { padding: 12 },
  title: { color: '#856404', fontSize: 14, fontWeight: '700' },
  message: { color: '#856404', fontSize: 12, marginTop: 4, lineHeight: 17 },
  button: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  buttonText: { color: '#856404', fontSize: 13, fontWeight: '700' },
});

export default ErrorState;
