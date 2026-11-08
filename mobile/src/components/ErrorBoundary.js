import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants/theme';

// Catches any rendering exception below it and shows a recovery screen
// instead of letting Expo Go / the OS kill the app. The "Try Again" button
// resets internal state so the user can keep using the app without a full
// reload.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught:', error, info?.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.icon}>!</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app hit an unexpected error. Tap “Try Again” to recover, or close and reopen the app
            if the problem persists.
          </Text>
          <Text style={styles.errorDetail} numberOfLines={5}>
            {this.state.error?.message || String(this.state.error)}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  icon: {
    alignSelf: 'center',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.danger,
    color: COLORS.white,
    fontSize: 32, fontWeight: '700',
    textAlign: 'center', textAlignVertical: 'center',
    lineHeight: 56, marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  errorDetail: {
    fontSize: 12, color: COLORS.danger,
    backgroundColor: COLORS.greyLight, padding: 12,
    borderRadius: 8, marginBottom: 24, textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

export default ErrorBoundary;
