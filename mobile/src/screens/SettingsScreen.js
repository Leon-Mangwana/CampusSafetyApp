import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, SafeAreaView, Switch,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import { isValidPhone } from '../utils/validators';

const MAX_CONTACTS = 5;
const MIN_CONTACTS = 3;

const SettingsScreen = ({ navigation }) => {
  const { user, signOut, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [contacts, setContacts] = useState(() => {
    const existing = Array.isArray(user?.emergencyContacts) ? user.emergencyContacts : [];
    const padded = [...existing];
    while (padded.length < MIN_CONTACTS) padded.push({ name: '', phone: '' });
    return padded;
  });
  const [pushNotifications, setPushNotifications] = useState(true);

  const updateContact = (index, field, value) => {
    setContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addContact = () => {
    if (contacts.length >= MAX_CONTACTS) return;
    setContacts((prev) => [...prev, { name: '', phone: '' }]);
  };

  const removeContact = (index) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const trimmedName = (fullName || '').trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }

    if (!isValidPhone(trimmedPhone)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number (e.g. +263 77 123 4567).');
      return;
    }

    const emergencyContacts = contacts
      .map((c) => ({ name: (c.name || '').trim(), phone: (c.phone || '').trim() }))
      .filter((c) => c.name && c.phone);

    if (emergencyContacts.length < MIN_CONTACTS) {
      Alert.alert(
        'More Contacts Needed',
        `Please provide at least ${MIN_CONTACTS} emergency contacts (name and phone for each).`
      );
      return;
    }

    const badContact = emergencyContacts.find((c) => !isValidPhone(c.phone));
    if (badContact) {
      Alert.alert(
        'Invalid Contact Phone',
        `${badContact.name}'s phone number is invalid. Please use a format like +263 77 123 4567.`
      );
      return;
    }

    try {
      await updateProfile({ fullName: trimmedName, phone: trimmedPhone, emergencyContacts });
      await updateUser({ fullName: trimmedName, phone: trimmedPhone, emergencyContacts });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.fullName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
              <Text style={styles.userRole}>{user?.role || 'student'}</Text>
            </View>
          </View>

          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Leon Mangwana"
                placeholderTextColor={COLORS.grey}
                value={fullName}
                onChangeText={setFullName}
              />
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+263 77 123 4567"
                placeholderTextColor={COLORS.grey}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
                Emergency Contacts (min {MIN_CONTACTS}, max {MAX_CONTACTS})
              </Text>
              {contacts.map((c, index) => (
                <View key={index} style={styles.contactBlock}>
                  <View style={styles.contactBlockHeader}>
                    <Text style={styles.contactBlockTitle}>Contact {index + 1}</Text>
                    {contacts.length > MIN_CONTACTS && (
                      <TouchableOpacity onPress={() => removeContact(index)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Name (e.g. Mum, Roommate)"
                    placeholderTextColor={COLORS.grey}
                    value={c.name}
                    onChangeText={(v) => updateContact(index, 'name', v)}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="+263 77 123 4567"
                    placeholderTextColor={COLORS.grey}
                    value={c.phone}
                    onChangeText={(v) => updateContact(index, 'phone', v)}
                    keyboardType="phone-pad"
                  />
                </View>
              ))}
              {contacts.length < MAX_CONTACTS && (
                <TouchableOpacity style={styles.addContactButton} onPress={addContact}>
                  <Text style={styles.addContactText}>+ Add Another Contact</Text>
                </TouchableOpacity>
              )}

              <View style={styles.editActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelEditButton} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.contactsSummary}>
                <Text style={styles.summaryLabel}>Emergency Contacts</Text>
                {(user?.emergencyContacts || []).length === 0 ? (
                  <Text style={styles.summaryEmpty}>None set — tap Edit to add at least {MIN_CONTACTS}.</Text>
                ) : (
                  (user.emergencyContacts || []).map((c, i) => (
                    <Text key={i} style={styles.summaryItem}>
                      {i + 1}. {c.name} — {c.phone}
                    </Text>
                  ))
                )}
              </View>
              <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Push Notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ true: COLORS.primary }}
            />
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>Campus Safety Application</Text>
          <Text style={styles.aboutSubtext}>University Campus Safety</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: 16, alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: COLORS.white, fontSize: 24, fontWeight: '700' },
  avatarInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  userRole: {
    fontSize: 12, color: COLORS.primary, fontWeight: '500',
    marginTop: 2, textTransform: 'capitalize',
  },
  editButton: {
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 8, padding: 12, alignItems: 'center',
  },
  editButtonText: { color: COLORS.primary, fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: COLORS.greyLight, color: COLORS.text,
  },
  editActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  saveButton: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 8, padding: 12, alignItems: 'center', marginRight: 8,
  },
  saveButtonText: { color: COLORS.white, fontWeight: '600' },
  cancelEditButton: {
    flex: 1, borderWidth: 1, borderColor: COLORS.grey,
    borderRadius: 8, padding: 12, alignItems: 'center',
  },
  cancelEditText: { color: COLORS.grey, fontWeight: '600' },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prefLabel: { fontSize: 15, color: COLORS.text },
  aboutText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  aboutSubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  aboutVersion: { fontSize: 12, color: COLORS.grey, marginTop: 8 },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  contactBlock: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 10, marginTop: 8, backgroundColor: COLORS.white,
  },
  contactBlockHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  contactBlockTitle: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  removeText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  addContactButton: {
    borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed',
    borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10,
  },
  addContactText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  contactsSummary: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 12, marginTop: 8, marginBottom: 12,
  },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  summaryItem: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  summaryEmpty: { fontSize: 13, color: COLORS.danger, fontStyle: 'italic' },
});

export default SettingsScreen;
