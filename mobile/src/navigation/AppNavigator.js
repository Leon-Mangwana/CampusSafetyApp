import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
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
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ label, color }) => (
  <View style={tabStyles.iconContainer}>
    <Text style={[tabStyles.iconText, { color }]}>{label.charAt(0)}</Text>
  </View>
);

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.grey,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabIcon label="Home" color={color} />,
        }}
      />
      <Tab.Screen
        name="Heatmap"
        component={HeatmapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <TabIcon label="Map" color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <TabIcon label="Alerts" color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon label="Settings" color={color} />,
        }}
      />
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
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <Text style={{ fontSize: 18, color: COLORS.primary, fontWeight: '600' }}>Loading...</Text>
      </View>
    );
  }

  return user ? <AppStack /> : <AuthStack />;
}
