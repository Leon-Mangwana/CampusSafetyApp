import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    if (!email.endsWith('.msu.ac.zw')) {
      Alert.alert('Error', 'Please use your MSU email address.');
      return;
    }

    setLoading(true);
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Fetch the user profile from the backend using the real token
      // Store token first so apiRequest can use it
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('userToken', idToken);

      let userData;
      try {
        const profile = await getProfile();
        userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          fullName: profile.fullName || userCredential.user.displayName || email.split('@')[0],
          role: profile.role || 'student',
          phone: profile.phone || '',
          emergencyContact: profile.emergencyContact || '',
        };
      } catch {
        // If profile fetch fails, use basic Firebase data
        userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          fullName: userCredential.user.displayName || email.split('@')[0],
          role: 'student',
        };
      }

      await signIn(idToken, userData);
    } catch (error) {
      let message = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email. Please register first.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>MSU</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your university email</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>University Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. R242441H@students.msu.ac.zw"
            placeholderTextColor={COLORS.grey}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={COLORS.grey}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.createAccountText}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  logoText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.greyLight,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.7 },
  signInButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  forgotPassword: { alignItems: 'center', marginTop: 16 },
  forgotPasswordText: { color: COLORS.primary, fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, color: COLORS.grey, fontSize: 14 },
  createAccountButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  createAccountText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});

export default LoginScreen;
