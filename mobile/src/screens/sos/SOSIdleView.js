import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { COLORS } from '../../constants/theme';
import { getSecurityNumber, getSecurityLabel, POLICE_NUMBER } from '../../constants/emergencyNumbers';
import { dial } from '../../utils/dial';
import ContactList from './ContactList';
import { HOLD_MS } from './useSOS';

const SOSIdleView = ({ user, holdProgress, gpsSignal, locationLine, onPressIn, onPressOut, onLongPress }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Emergency SOS</Text>
    </View>

    <View style={styles.content}>
      <Text style={styles.title}>EMERGENCY SOS</Text>
      <Text style={styles.subtitle}>Press and hold the button below</Text>

      <View style={styles.sosWrapper}>
        <View style={[styles.progressRing, { borderColor: `rgba(211,47,47,${Math.max(holdProgress, 0.2)})` }]}>
          <TouchableOpacity
            style={styles.sosButton}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onLongPress={onLongPress}
            delayLongPress={HOLD_MS}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Emergency SOS. Press and hold for three seconds to alert campus security."
            accessibilityHint="Double tap and hold to activate"
          >
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.holdText}>HOLD 3 SECONDS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sendToLabel}>Your real-time location will be sent to:</Text>
      <ScrollView style={styles.contactsScroll} contentContainerStyle={{ paddingBottom: 4 }}>
        <ContactList user={user} />
      </ScrollView>

      <View style={styles.callRow}>
        <TouchableOpacity style={[styles.callBtn, { borderColor: COLORS.danger }]} onPress={() => dial(getSecurityNumber(), getSecurityLabel())} accessibilityRole="button" accessibilityLabel={`Call ${getSecurityLabel()}`}>
          <Text style={styles.callText}>Call Security</Text>
          <Text style={styles.callNumber}>{getSecurityNumber()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.callBtn, { borderColor: COLORS.primary }]} onPress={() => dial(POLICE_NUMBER, 'Police')} accessibilityRole="button" accessibilityLabel="Call police">
          <Text style={styles.callText}>Call Police</Text>
          <Text style={styles.callNumber}>{POLICE_NUMBER}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.gpsInfo}>Current Location: {locationLine}</Text>
      <Text style={styles.gpsSignal}>GPS Signal: {gpsSignal}</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { backgroundColor: COLORS.danger, padding: 16, alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 32 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.danger },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  sosWrapper: { marginVertical: 32 },
  progressRing: {
    width: 180, height: 180, borderRadius: 90, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed',
  },
  sosButton: {
    width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center', elevation: 8,
    shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  sosText: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  holdText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  sendToLabel: { fontSize: 13, color: COLORS.danger, marginBottom: 8 },
  contactsScroll: { maxHeight: 180, width: '100%' },
  callRow: { flexDirection: 'row', marginTop: 16, gap: 12, width: '100%' },
  callBtn: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1 },
  callText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  callNumber: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  gpsInfo: { fontSize: 12, color: COLORS.danger, marginTop: 16 },
  gpsSignal: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
});

export default SOSIdleView;
