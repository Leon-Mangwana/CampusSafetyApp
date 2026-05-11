import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';
import { isValidEmail, isValidName, isValidZimPhone } from '../utils/validators';
import { friendlyAuthError } from '../utils/authErrors';
import PasswordInput from '../components/PasswordInput';

const validateName = (value) => {
  if (!value.trim()) return 'Full name is required.';
  if (/\d/.test(value)) return 'Full name cannot contain numbers.';
  if (!isValidName(value)) return 'Use letters, spaces, hyphens or apostrophes only (minimum 2 letters).';
  return '';
};

const validateEmail = (value) => {
  if (!value.trim()) return 'Email is required.';
  if (!isValidEmail(value)) return 'Enter a valid email (e.g. student@university.ac.zw).';
  return '';
};

const validatePhone = (value) => {
  if (!value.trim()) return 'Phone number is required.';
  if (!isValidZimPhone(value)) return 'Enter a Zimbabwe mobile number, e.g. +263 77 123 4567 or 077 123 4567.';
  return '';
};

const validateContactName = (value) => {
  if (!value.trim()) return 'Contact name is required.';
  if (/\d/.test(value)) return 'Contact name cannot contain numbers.';
  if (value.trim().length < 2) return 'Contact name is too short.';
  return '';
};

const validatePassword = (value) => {
  if (!value) return 'Password is required.';
  if (value.length < 6) return 'Password must be at least 6 characters.';
  return '';
};

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

  // Which fields the user has interacted with — errors only show after the
  // user has had a chance to type something (or after they hit submit).
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const markTouched = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const updateContact = (index, field, value) => {
    setContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Derive every error inline so the UI updates live as the user types.
  const errors = useMemo(() => {
    const e = {
      fullName: validateName(fullName),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      confirmPassword:
        !confirmPassword ? 'Please confirm your password.' :
        confirmPassword !== password ? 'Passwords do not match.' : '',
      contacts: contacts.map((c) => ({
        name: validateContactName(c.name),
        phone: validatePhone(c.phone),
      })),
    };
    return e;
  }, [fullName, email, phone, password, confirmPassword, contacts]);

  const shouldShow = (key) => submitAttempted || touched[key];

  const hasAnyError =
    errors.fullName || errors.email || errors.phone ||
    errors.password || errors.confirmPassword ||
    errors.contacts.some((c) => c.name || c.phone);

  const handleRegister = async () => {
    setSubmitAttempted(true);
    if (hasAnyError) return;

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedName = fullName.trim();
    const emergencyContacts = contacts.map((c) => ({
      name: c.name.trim(),
      phone: c.phone.trim(),
    }));

    setLoading(true);
    try {
      await registerUser({
        email: trimmedEmail,
        password,
        fullName: trimmedName,
        phone: trimmedPhone,
        emergencyContacts,
        role: 'student',
      });

      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const idToken = await userCredential.user.getIdToken();

      const userData = {
        uid: userCredential.user.uid,
        email: trimmedEmail,
        fullName: trimmedName,
        role: 'student',
        phone: trimmedPhone,
        emergencyContacts,
      };

      await signIn(idToken, userData);
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        friendlyAuthError(error, 'Could not create your account. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (key) => [
    styles.input,
    shouldShow(key) && errors[key] && styles.inputError,
  ];

  const contactFieldStyle = (index, field) => [
    styles.input,
    (submitAttempted || touched[`contact-${index}-${field}`]) &&
      errors.contacts[index][field] &&
      styles.inputError,
  ];

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
            style={fieldStyle('fullName')}
            placeholder="Enter your full name"
            placeholderTextColor={COLORS.grey}
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => markTouched('fullName')}
          />
          {shouldShow('fullName') && !!errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}

          <Text style={styles.label}>University Email *</Text>
          <TextInput
            style={fieldStyle('email')}
            placeholder="e.g. student@university.ac.zw"
            placeholderTextColor={COLORS.grey}
            value={email}
            onChangeText={setEmail}
            onBlur={() => markTouched('email')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {shouldShow('email') && !!errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={fieldStyle('phone')}
            placeholder="+263 7X XXX XXXX"
            placeholderTextColor={COLORS.grey}
            value={phone}
            onChangeText={setPhone}
            onBlur={() => markTouched('phone')}
            keyboardType="phone-pad"
            maxLength={16}
          />
          {shouldShow('phone') && !!errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}

          <Text style={styles.sectionHeader}>Emergency Contacts *</Text>
          <Text style={styles.sectionSubtext}>
            Provide at least 3 contacts who should be alerted if you trigger an SOS.
          </Text>

          {contacts.map((c, index) => {
            const nameKey = `contact-${index}-name`;
            const phoneKey = `contact-${index}-phone`;
            const nameTouched = submitAttempted || touched[nameKey];
            const phoneTouched = submitAttempted || touched[phoneKey];
            return (
              <View key={index} style={styles.contactBlock}>
                <Text style={styles.contactBlockTitle}>Contact {index + 1}</Text>
                <TextInput
                  style={contactFieldStyle(index, 'name')}
                  placeholder="Name (e.g. Mum, Roommate)"
                  placeholderTextColor={COLORS.grey}
                  value={c.name}
                  onChangeText={(v) => updateContact(index, 'name', v)}
                  onBlur={() => markTouched(nameKey)}
                />
                {nameTouched && !!errors.contacts[index].name && (
                  <Text style={styles.errorText}>{errors.contacts[index].name}</Text>
                )}
                <TextInput
                  style={[contactFieldStyle(index, 'phone'), { marginTop: 8 }]}
                  placeholder="+263 7X XXX XXXX"
                  placeholderTextColor={COLORS.grey}
                  value={c.phone}
                  onChangeText={(v) => updateContact(index, 'phone', v)}
                  onBlur={() => markTouched(phoneKey)}
                  keyboardType="phone-pad"
                  maxLength={16}
                />
                {phoneTouched && !!errors.contacts[index].phone && (
                  <Text style={styles.errorText}>{errors.contacts[index].phone}</Text>
                )}
              </View>
            );
          })}

          <Text style={styles.label}>Password *</Text>
          <PasswordInput
            placeholder="Minimum 6 characters"
            placeholderTextColor={COLORS.grey}
            value={password}
            onChangeText={setPassword}
            onBlur={() => markTouched('password')}
            style={shouldShow('password') && errors.password ? styles.inputError : null}
          />
          {shouldShow('password') && !!errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          <Text style={styles.label}>Confirm Password *</Text>
          <PasswordInput
            placeholder="Re-enter your password"
            placeholderTextColor={COLORS.grey}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => markTouched('confirmPassword')}
            style={shouldShow('confirmPassword') && errors.confirmPassword ? styles.inputError : null}
          />
          {shouldShow('confirmPassword') && !!errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}

          {submitAttempted && hasAnyError && (
            <Text style={styles.formError}>
              Please fix the highlighted errors before continuing.
            </Text>
          )}

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
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  formError: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
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
