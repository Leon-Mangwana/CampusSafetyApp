import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, SafeAreaView, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import { getSecurityNumber, getSecurityLabel, POLICE_NUMBER } from '../../constants/emergencyNumbers';
import { dial } from '../../utils/dial';
import ContactList from './ContactList';

const SOSActiveView = ({ user, backendStatus, locationLine, onRetry, onCancel }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SOS ACTIVE</Text>
      <Text style={styles.subtitle}>Help is on the way</Text>

      <Animated.View style={[styles.circle, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.circleText}>SOS</Text>
        <Text style={styles.circleSubtext}>ACTIVE</Text>
      </Animated.View>

      <View
        style={[
          styles.status,
          backendStatus === 'notified' && { backgroundColor: 'rgba(76, 175, 80, 0.25)' },
          backendStatus === 'failed' && { backgroundColor: 'rgba(255, 235, 59, 0.25)' },
        ]}
        accessibilityLiveRegion="polite"
      >
        {backendStatus === 'pending' && (
          <>
            <ActivityIndicator color={COLORS.white} size="small" style={{ marginRight: 8 }} />
            <Text style={styles.statusText}>Notifying campus security…</Text>
          </>
        )}
        {backendStatus === 'notified' && <Text style={styles.statusText}>✓ Security notified</Text>}
        {backendStatus === 'failed' && (
          <>
            <Text style={[styles.statusText, { flex: 1 }]}>⚠ Could not reach security</Text>
            <TouchableOpacity onPress={onRetry} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry sending SOS">
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Your real-time location is being shared with:</Text>
        <ContactList user={user} variant="dark" />
      </View>

      <View style={styles.callRow}>
        <TouchableOpacity style={styles.callBtn} onPress={() => dial(getSecurityNumber(), getSecurityLabel())} accessibilityRole="button" accessibilityLabel={`Call ${getSecurityLabel()}`}>
          <Text style={styles.callText}>Call Security</Text>
          <Text style={styles.callNumber}>{getSecurityNumber()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callBtn} onPress={() => dial(POLICE_NUMBER, 'Police')} accessibilityRole="button" accessibilityLabel="Call police">
          <Text style={styles.callText}>Call Police</Text>
          <Text style={styles.callNumber}>{POLICE_NUMBER}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.coords}>Location: {locationLine}</Text>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel} accessibilityRole="button">
        <Text style={styles.cancelText}>Cancel SOS</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dangerDark },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white, textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  circle: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 32,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  circleText: { color: COLORS.white, fontSize: 36, fontWeight: '800' },
  circleSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  status: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8, marginHorizontal: 24, marginBottom: 16, paddingVertical: 10, paddingHorizontal: 14,
  },
  statusText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  retryButton: { backgroundColor: COLORS.white, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  retryText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, marginHorizontal: 24 },
  infoText: { color: COLORS.white, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  callRow: { flexDirection: 'row', marginHorizontal: 24, marginTop: 16, gap: 12 },
  callBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  callText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  callNumber: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  coords: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: 16 },
  cancelButton: {
    borderWidth: 2, borderColor: COLORS.white, borderRadius: 8, padding: 14,
    marginHorizontal: 40, marginTop: 24, alignItems: 'center',
  },
  cancelText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});

export default SOSActiveView;
