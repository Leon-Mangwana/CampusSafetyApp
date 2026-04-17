import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const MenuTile = ({ title, icon, color, onPress }) => (
  <TouchableOpacity
    style={[styles.tile, { backgroundColor: color || COLORS.primary }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.tileIcon}>{icon}</Text>
    <Text style={styles.tileTitle}>{title}</Text>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Safety</Text>
        <View style={styles.campusBadge}>
          <Text style={styles.campusBadgeText}>University Campus Safety</Text>
        </View>
        <Text style={styles.welcomeText}>
          Welcome, {user?.fullName || 'Student'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.menuGrid}>
        <View style={styles.row}>
          <MenuTile
            title="Report Incident"
            icon="&#x1F4DD;"
            color={COLORS.primary}
            onPress={() => navigation.navigate('ReportIncident')}
          />
          <MenuTile
            title="View Heatmap"
            icon="&#x1F5FA;"
            color={COLORS.primaryDark}
            onPress={() => navigation.navigate('Heatmap')}
          />
        </View>

        <View style={styles.row}>
          <MenuTile
            title="SOS Alert"
            icon="&#x1F6A8;"
            color={COLORS.danger}
            onPress={() => navigation.navigate('SOS')}
          />
          <MenuTile
            title="Notifications"
            icon="&#x1F514;"
            color={COLORS.secondary}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        <View style={styles.row}>
          <MenuTile
            title="Emergency Numbers"
            icon="&#x1F4DE;"
            color="#C62828"
            onPress={() => navigation.navigate('EmergencyContacts')}
          />
          <MenuTile
            title="Safety Stats"
            icon="&#x1F4CA;"
            color={COLORS.success}
            onPress={() => navigation.navigate('SafetyStats')}
          />
        </View>

        <View style={styles.row}>
          <MenuTile
            title="Settings"
            icon="&#x2699;"
            color="#546E7A"
            onPress={() => navigation.navigate('Settings')}
          />
          <View style={{ flex: 1, marginHorizontal: 6 }} />
        </View>

        {(user?.role === 'security' || user?.role === 'admin') && (
          <View style={styles.row}>
            <MenuTile
              title="Security Dashboard"
              icon="&#x1F6E1;"
              color={COLORS.primaryDark}
              onPress={() => navigation.navigate('SecurityDashboard')}
            />
            <View style={{ flex: 1, marginHorizontal: 6 }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  campusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  campusBadgeText: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  welcomeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 8,
  },
  menuGrid: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tile: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  tileIcon: { fontSize: 32, marginBottom: 10 },
  tileTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HomeScreen;
