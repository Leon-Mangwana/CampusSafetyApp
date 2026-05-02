import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const SAFETY_TIPS = [
  'Walk in well-lit areas and stay aware of your surroundings after dark.',
  'Save campus security on speed dial — every second counts in an emergency.',
  'If a situation feels off, trust your instincts and report it anonymously.',
  'Travel in groups when crossing campus late at night.',
  'Keep your phone charged when heading out — your location may be needed.',
];

const greetingFor = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const firstName = (user?.fullName || 'there').split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();
  const greeting = greetingFor(new Date());

  // Rotate the tip daily so it feels alive without needing a backend call.
  const tip = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return SAFETY_TIPS[dayIndex % SAFETY_TIPS.length];
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <Text style={styles.heroSubtitle}>Stay safe on campus</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>

          <View style={styles.statusBanner}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Connected — campus safety network active</Text>
          </View>
        </LinearGradient>

        {/* Emergency SOS — most important action, prominent */}
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => navigation.navigate('SOS')}
          activeOpacity={0.85}
        >
          <View style={styles.sosIconBadge}>
            <Text style={styles.sosIconText}>SOS</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.sosTitle}>Emergency Alert</Text>
            <Text style={styles.sosSubtitle}>Notify security & contacts instantly</Text>
          </View>
          <Text style={styles.sosArrow}>›</Text>
        </TouchableOpacity>

        {/* Primary actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('ReportIncident')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionLabel}>Report</Text>
            <Text style={styles.actionTitle}>Report Incident</Text>
            <Text style={styles.actionDesc}>Submit anonymously in under a minute</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: COLORS.primaryDark }]}
            onPress={() => navigation.navigate('Heatmap')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionLabel}>Map</Text>
            <Text style={styles.actionTitle}>Campus Heatmap</Text>
            <Text style={styles.actionDesc}>See incident hotspots near you</Text>
          </TouchableOpacity>
        </View>

        {/* Resources */}
        <Text style={styles.sectionTitle}>Resources</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => navigation.navigate('EmergencyContacts')}
            activeOpacity={0.85}
          >
            <View style={[styles.resourceBadge, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.resourceBadgeText, { color: COLORS.danger }]}>911</Text>
            </View>
            <Text style={styles.resourceTitle}>Emergency Numbers</Text>
            <Text style={styles.resourceDesc}>Campus security & local services</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => navigation.navigate('SafetyStats')}
            activeOpacity={0.85}
          >
            <View style={[styles.resourceBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.resourceBadgeText, { color: COLORS.success }]}>Stats</Text>
            </View>
            <Text style={styles.resourceTitle}>Safety Statistics</Text>
            <Text style={styles.resourceDesc}>Trends, hotspots & response times</Text>
          </TouchableOpacity>
        </View>

        {/* Daily safety tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipLabel}>Today's Safety Tip</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>

        <Text style={styles.footerText}>
          Crowdsourced Campus Safety · Your reports keep everyone safer
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 32 },

  hero: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  heroName: { color: COLORS.white, fontSize: 26, fontWeight: '700', marginTop: 2 },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, marginTop: 18, alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#7CFC8B', marginRight: 8,
  },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: '500' },

  sosButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.danger,
    marginHorizontal: 16, marginTop: -16,
    borderRadius: 16, padding: 16,
    elevation: 6,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  sosIconBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  sosIconText: { color: COLORS.white, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  sosTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  sosSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  sosArrow: { color: COLORS.white, fontSize: 32, fontWeight: '300', marginLeft: 8 },

  sectionTitle: {
    fontSize: 13, fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 24, marginBottom: 10,
  },
  row: { flexDirection: 'row', paddingHorizontal: 10 },

  actionCard: {
    flex: 1, marginHorizontal: 6, borderRadius: 14,
    padding: 18, minHeight: 130,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.75)', fontSize: 11,
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8,
  },
  actionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginTop: 6 },
  actionDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6, lineHeight: 16 },

  resourceCard: {
    flex: 1, marginHorizontal: 6, borderRadius: 14,
    padding: 16, backgroundColor: COLORS.white,
    elevation: 1, minHeight: 120,
    borderWidth: 1, borderColor: COLORS.border,
  },
  resourceBadge: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  resourceBadgeText: { fontSize: 13, fontWeight: '800' },
  resourceTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 10 },
  resourceDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, lineHeight: 14 },

  tipCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: 24,
    borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: COLORS.secondary,
    elevation: 1,
  },
  tipLabel: {
    fontSize: 11, fontWeight: '700',
    color: COLORS.secondary, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 6,
  },
  tipText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  footerText: {
    textAlign: 'center', fontSize: 11,
    color: COLORS.grey, marginTop: 24, paddingHorizontal: 24,
  },
});

export default HomeScreen;
