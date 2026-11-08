import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import SOSScreen from '../screens/SOSScreen';
import HeatmapScreen from '../screens/HeatmapScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SafetyStatsScreen from '../screens/SafetyStatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SecurityDashboardScreen from '../screens/SecurityDashboardScreen';
import MonthlyReportScreen from '../screens/MonthlyReportScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import SOSTrackerScreen from '../screens/SOSTrackerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ label, color }) => (
  <View style={tabStyles.iconContainer} accessibilityElementsHidden importantForAccessibility="no">
    <Text style={[tabStyles.iconText, { color }]}>{label.charAt(0)}</Text>
  </View>
);

const tabOptions = (label) => ({
  tabBarLabel: label,
  tabBarAccessibilityLabel: `${label} tab`,
  tabBarIcon: ({ color }) => <TabIcon label={label} color={color} />,
});

const tabStyles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'security' || user?.role === 'admin';
  const insets = useSafeAreaInsets();

  // edgeToEdgeEnabled: true in app.json lets the app draw under the system
  // gesture area. We add the OS-reported bottom inset so labels don't collide
  // with the gesture pill / nav bar. A 4px floor gives breathing room on
  // devices that report 0 (e.g. older 3-button-nav phones).
  const tabBarBottomPadding = Math.max(insets.bottom, 4);

  return (
    <Tab.Navigator
      initialRouteName={isAdmin ? 'Dashboard' : 'Home'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.grey,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 4,
          height: 56 + tabBarBottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {isAdmin && (
        <Tab.Screen name="Dashboard" component={SecurityDashboardScreen} options={tabOptions('Dashboard')} />
      )}
      {isAdmin && (
        <Tab.Screen name="Reports" component={MonthlyReportScreen} options={tabOptions('Reports')} />
      )}
      {!isAdmin && (
        <Tab.Screen name="Home" component={HomeScreen} options={tabOptions('Home')} />
      )}
      <Tab.Screen name="Heatmap" component={HeatmapScreen} options={tabOptions('Map')} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={tabOptions('Alerts')} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={tabOptions('Settings')} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { user } = useAuth();
  const isSecurityOrAdmin = user?.role === 'security' || user?.role === 'admin';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <Stack.Screen name="SafetyStats" component={SafetyStatsScreen} />
      {isSecurityOrAdmin && (
        <Stack.Screen name="SecurityDashboard" component={SecurityDashboardScreen} />
      )}
      {isSecurityOrAdmin && (
        <Stack.Screen name="SOSTracker" component={SOSTrackerScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading Campus Safety"
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, fontSize: 14, color: COLORS.textSecondary }}>Loading…</Text>
      </View>
    );
  }

  return user ? <AppStack /> : <AuthStack />;
}
