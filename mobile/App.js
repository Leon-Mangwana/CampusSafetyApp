import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import './src/utils/alertPolyfill';
import { AuthProvider } from './src/context/AuthContext';
import { DevicePrefsProvider } from './src/context/DevicePrefsContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DevicePrefsProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </DevicePrefsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
