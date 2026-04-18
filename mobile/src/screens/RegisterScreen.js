import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { registerUser, getProfile } from '../services/api';

const RegisterScreen = ({ navigation }) => {
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState([
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' },
  ]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const updateContact = (index, field, value) => {
    setContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    const emergencyContacts = contacts
      .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() }))
      .filter((c) => c.name && c.phone);

    if (emergencyContacts.length < 3) {
      Alert.alert(
        'Emergency Contacts Required',
        'Please provide at least 3 emergency contacts (name and phone number for each).'
      );
      return;
    }

    setLoading(true);
    try {
      // Create user on the backend (Firebase Auth + database)
      await registerUser({ email, password, fullName, phone, emergencyContacts, role: 'student' });

      // Automatically sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const userData = {
        uid: userCredential.user.uid,
        email,
        fullName,
        role: 'student',
        phone,
        emergencyContacts,
      };

      await signIn(idToken, userData);
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Please try again.');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Campus Safety community</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={COLORS.grey}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>University Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. student@university.ac.zw"
            placeholderTextColor={COLORS.grey}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+263 7X XXX XXXX"
            placeholderTextColor={COLORS.grey}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.sectionHeader}>Emergency Contacts *</Text>
          <Text style={styles.sectionSubtext}>
            Provide at least 3 contacts who should be alerted if you trigger an SOS.
          </Text>

          {contacts.map((c, index) => (
            <View key={index} style={styles.contactBlock}>
              <Text style={styles.contactBlockTitle}>Contact {index + 1}</Text>
              <TextInput
                style={styles.input}
                placeholder="Name (e.g. Mum, Roommate)"
                placeholderTextColor={COLORS.grey}
                value={c.name}
                onChangeText={(v) => updateContact(index, 'name', v)}
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="+263 7X XXX XXXX"
                placeholderTextColor={COLORS.grey}
                value={c.phone}
                onChangeText={(v) => updateContact(index, 'phone', v)}
                keyboardType="phone-pad"
              />
            </View>
          ))}

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor={COLORS.grey}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor={COLORS.grey}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.signInLinkText}>
              Already have an account? <Text style={{ fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 48 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
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
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.7 },
  registerButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  signInLink: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  signInLinkText: { color: COLORS.primary, fontSize: 14 },
  sectionHeader: {
    fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20,
  },
  sectionSubtext: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 4,
  },
  contactBlock: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, marginTop: 10, backgroundColor: COLORS.white,
  },
  contactBlockTitle: {
    fontSize: 13, fontWeight: '600', color: COLORS.primary, marginBottom: 6,
  },
});

export default RegisterScreen;
