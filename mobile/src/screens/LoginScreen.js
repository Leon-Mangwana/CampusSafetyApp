import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/api';

import { isValidEmail } from '../utils/validators';
import { friendlyAuthError } from '../utils/authErrors';

const ADMIN_ROLES = ['admin', 'security'];

const LoginScreen = ({ navigation }) => {
  const [loginAs, setLoginAs] = useState('student'); // 'student' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. yourname@university.ac.zw).');
      return;
    }

    setLoading(true);
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const idToken = await userCredential.user.getIdToken();

      // Fetch the user profile from the backend using the real token
      // Store token first so apiRequest can use it
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('userToken', idToken);

      let profile;
      try {
        profile = await getProfile();
      } catch {
        profile = null;
      }

      const accountRole = profile?.role || 'student';
      const isAdminAccount = ADMIN_ROLES.includes(accountRole);

      // Enforce that the selected login type matches the account's actual role.
      if (loginAs === 'admin' && !isAdminAccount) {
        await fbSignOut(auth);
        await AsyncStorage.removeItem('userToken');
        Alert.alert(
          'Not an Admin Account',
          'This account does not have admin access. Switch to the Student tab to sign in.'
        );
        return;
      }
      if (loginAs === 'student' && isAdminAccount) {
        await fbSignOut(auth);
        await AsyncStorage.removeItem('userToken');
        Alert.alert(
          'Use Admin Login',
          'This is an admin account — switch to the Admin tab to sign in.'
        );
        return;
      }

      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        fullName: profile?.fullName || userCredential.user.displayName || email.split('@')[0],
        role: accountRole,
        phone: profile?.phone || '',
        emergencyContacts: Array.isArray(profile?.emergencyContacts) ? profile.emergencyContacts : [],
      };

      await signIn(idToken, userData);
    } catch (error) {
      Alert.alert('Login Failed', friendlyAuthError(error, 'Could not sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const isAdminTab = loginAs === 'admin';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.logoBadge, isAdminTab && { backgroundColor: COLORS.primaryDark }]}>
            <Text style={styles.logoText}>Campus Safety</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            {isAdminTab ? 'Admin / Security portal' : 'Sign in with your university email'}
          </Text>
        </View>

        <View style={styles.roleToggle}>
          <TouchableOpacity
            style={[styles.roleTab, !isAdminTab && styles.roleTabActive]}
            onPress={() => setLoginAs('student')}
          >
            <Text style={[styles.roleTabText, !isAdminTab && styles.roleTabTextActive]}>
              Login as Student
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleTab,
              isAdminTab && { ...styles.roleTabActive, backgroundColor: COLORS.primaryDark },
            ]}
            onPress={() => setLoginAs('admin')}
          >
            <Text style={[styles.roleTabText, isAdminTab && styles.roleTabTextActive]}>
              Login as Admin
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {isAdminTab ? 'Admin Email' : 'University Email'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. student@university.ac.zw"
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
            style={[
              styles.signInButton,
              isAdminTab && { backgroundColor: COLORS.primaryDark },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.signInButtonText}>
                {isAdminTab ? 'Sign In as Admin' : 'Sign In as Student'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {isAdminTab ? (
            <Text style={styles.adminNote}>
              Admin accounts are issued by campus IT. They cannot be self-registered.
            </Text>
          ) : (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.createAccountText}>Create New Student Account</Text>
              </TouchableOpacity>
            </>
          )}
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
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.greyLight,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  roleTabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  roleTabTextActive: { color: COLORS.white },
  adminNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default LoginScreen;
