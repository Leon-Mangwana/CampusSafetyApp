import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  Animated, SafeAreaView, Vibration, Linking, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { triggerSOS, cancelSOSAlert, updateSOSLocation } from '../services/api';

const SOSScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [alertId, setAlertId] = useState(null);
  const [location, setLocation] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [gpsSignal, setGpsSignal] = useState('Detecting...');
  const holdTimer = useRef(null);
  const locationInterval = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getLocation();
    return () => {
      clearInterval(locationInterval.current);
      clearTimeout(holdTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();

      // Update location every 10 seconds. The whole callback is wrapped in
      // try/catch so a transient GPS failure ("Current location is
      // unavailable") never bubbles up as an unhandled promise rejection.
      locationInterval.current = setInterval(async () => {
        if (!alertId) return;
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await updateSOSLocation(alertId, loc.coords.latitude, loc.coords.longitude);
          setLocation(loc.coords);
        } catch (e) { /* continue tracking */ }
      }, 10000);

      return () => {
        pulse.stop();
        clearInterval(locationInterval.current);
      };
    }
  }, [isActive, alertId]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsSignal('Permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      setGpsSignal(loc.coords.accuracy < 20 ? 'Strong' : 'Moderate');
    } catch {
      setGpsSignal('Unavailable');
    }
  };

  const startHold = () => {
    let progress = 0;
    holdTimer.current = setInterval(() => {
      progress += 0.1;
      setHoldProgress(Math.min(progress, 1));
      if (progress >= 1) {
        clearInterval(holdTimer.current);
        activateSOS();
      }
    }, 100); // 3 seconds = 30 intervals of 100ms
  };

  const endHold = () => {
    clearInterval(holdTimer.current);
    if (holdProgress < 1) {
      setHoldProgress(0);
    }
  };

  const openSmsToContacts = async (lat, lng) => {
    const contacts = Array.isArray(user?.emergencyContacts) ? user.emergencyContacts : [];
    if (contacts.length === 0) return;

    const phones = contacts.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) return;

    const body = encodeURIComponent(
      `EMERGENCY SOS from ${user?.fullName || 'a Campus Safety user'}. ` +
      `Live location: https://maps.google.com/?q=${lat},${lng}`
    );

    // iOS uses '&', Android uses ','; the separator lets one tap message all contacts.
    const separator = Platform.OS === 'ios' ? '&' : ',';
    const url = `sms:${phones.join(separator)}${Platform.OS === 'ios' ? '&' : '?'}body=${body}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch { /* ignore — backend still logs */ }
  };

  const activateSOS = async () => {
    Vibration.vibrate([200, 100, 200]);
    setIsActive(true);

    // Resolve coords from fresh GPS rather than relying on React state, which
    // can still be null on the first activation if getLocation() has just
    // been called (state updates are async and won't be visible here).
    let coords = location;
    if (!coords) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = loc.coords;
          setLocation(loc.coords);
        }
      } catch { /* fall through to defaults */ }
    }
    const lat = coords?.latitude ?? -19.4519;
    const lng = coords?.longitude ?? 29.8146;

    try {
      // Fire backend alert and SMS deep-link in parallel for lowest latency.
      const [result] = await Promise.all([
        triggerSOS(lat, lng),
        openSmsToContacts(lat, lng),
      ]);
      setAlertId(result.alertId);
    } catch (error) {
      Alert.alert(
        'SOS Error',
        `Failed to send SOS to security: ${error?.message || 'unknown error'}. Please call security directly.`
      );
    }
  };

  const callSecurity = () => {
    Linking.openURL('tel:911').catch(() => {
      Alert.alert('Error', 'Unable to make a call from this device.');
    });
  };

  const callPolice = () => {
    Linking.openURL('tel:911').catch(() => {
      Alert.alert('Error', 'Unable to make a call from this device.');
    });
  };

  const handleCancel = () => {
    Alert.alert('Cancel SOS', 'Are you sure you want to cancel the SOS alert?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (alertId) {
            try { await cancelSOSAlert(alertId); } catch { /* ok */ }
          }
          setIsActive(false);
          setAlertId(null);
          setHoldProgress(0);
          clearInterval(locationInterval.current);
        },
      },
    ]);
  };

  if (isActive) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#B71C1C' }]}>
        <Text style={styles.activeTitle}>SOS ACTIVE</Text>
        <Text style={styles.activeSubtitle}>Help is on the way</Text>

        <Animated.View style={[styles.activeCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.activeCircleText}>SOS</Text>
          <Text style={styles.activeCircleSubtext}>ACTIVE</Text>
        </Animated.View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Your real-time location is being shared with:</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Campus Security Control Room</Text>
          </View>
          {(user?.emergencyContacts || []).map((c, i) => (
            <View key={i} style={styles.contactRow}>
              <Text style={styles.contactLabel}>{c.name} — {c.phone}</Text>
            </View>
          ))}
          {(!user?.emergencyContacts || user.emergencyContacts.length === 0) && (
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>No emergency contacts configured</Text>
            </View>
          )}
        </View>

        <View style={styles.callButtonsRow}>
          <TouchableOpacity style={styles.callSecurityBtn} onPress={callSecurity}>
            <Text style={styles.callBtnText}>Call Security</Text>
            <Text style={styles.callBtnNumber}>911</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callPoliceBtn} onPress={callPolice}>
            <Text style={styles.callBtnText}>Call Police</Text>
            <Text style={styles.callBtnNumber}>911</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.coordsText}>
          Location: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Tracking...'}
        </Text>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel SOS</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>EMERGENCY SOS</Text>
        <Text style={styles.subtitle}>Press and hold the button below</Text>

        <View style={styles.sosWrapper}>
          <View style={[styles.progressRing, { borderColor: `rgba(211,47,47,${holdProgress})` }]}>
            <TouchableOpacity
              style={styles.sosButton}
              onPressIn={startHold}
              onPressOut={endHold}
              activeOpacity={0.8}
            >
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.holdText}>HOLD 3 SECONDS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sendToLabel}>Your real-time location will be sent to:</Text>
        <View style={styles.destinationBox}>
          <Text style={styles.destinationText}>Campus Security Control Room</Text>
        </View>
        <ScrollView style={styles.contactsScroll} contentContainerStyle={{ paddingBottom: 4 }}>
          {(user?.emergencyContacts || []).map((c, i) => (
            <View key={i} style={styles.destinationBox}>
              <Text style={styles.destinationText}>{c.name} — {c.phone}</Text>
            </View>
          ))}
          {(!user?.emergencyContacts || user.emergencyContacts.length === 0) && (
            <View style={styles.destinationBox}>
              <Text style={[styles.destinationText, { color: COLORS.danger }]}>
                No emergency contacts — add them in Settings
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.callButtonsRow}>
          <TouchableOpacity style={styles.callSecurityBtnInactive} onPress={callSecurity}>
            <Text style={styles.callBtnTextDark}>Call Security</Text>
            <Text style={styles.callBtnNumberDark}>911</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callPoliceBtnInactive} onPress={callPolice}>
            <Text style={styles.callBtnTextDark}>Call Police</Text>
            <Text style={styles.callBtnNumberDark}>911</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.gpsInfo}>
          Current Location: {location
            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            : 'Detecting...'}
        </Text>
        <Text style={styles.gpsSignal}>GPS Signal: {gpsSignal}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { backgroundColor: COLORS.danger, padding: 16, alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 32 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.danger },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  sosWrapper: { marginVertical: 32 },
  progressRing: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 4, borderColor: 'rgba(211,47,47,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderStyle: 'dashed',
  },
  sosButton: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sosText: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  holdText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  sendToLabel: { fontSize: 13, color: COLORS.danger, marginBottom: 8 },
  destinationBox: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 14, width: '100%', marginBottom: 8, backgroundColor: COLORS.greyLight,
  },
  destinationText: { fontSize: 14, color: COLORS.text, textAlign: 'center' },
  contactsScroll: { maxHeight: 160, width: '100%' },
  gpsInfo: { fontSize: 12, color: COLORS.danger, marginTop: 16 },
  gpsSignal: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  // Active SOS styles
  activeTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white, textAlign: 'center', marginTop: 40 },
  activeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  activeCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginVertical: 32,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  activeCircleText: { color: COLORS.white, fontSize: 36, fontWeight: '800' },
  activeCircleSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, marginHorizontal: 24 },
  infoText: { color: COLORS.white, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  contactRow: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  contactLabel: { color: COLORS.white, fontSize: 13, textAlign: 'center' },
  coordsText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: 16 },
  cancelButton: {
    borderWidth: 2, borderColor: COLORS.white, borderRadius: 8,
    padding: 14, marginHorizontal: 40, marginTop: 24, alignItems: 'center',
  },
  cancelButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  // Call buttons (active SOS)
  callButtonsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 16,
    gap: 12,
  },
  callSecurityBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  callPoliceBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  callBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  callBtnNumber: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  // Call buttons (inactive / pre-SOS)
  callSecurityBtnInactive: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  callPoliceBtnInactive: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  callBtnTextDark: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  callBtnNumberDark: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});

export default SOSScreen;
