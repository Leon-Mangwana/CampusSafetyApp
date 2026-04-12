import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, SafeAreaView, Switch,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';

const SettingsScreen = ({ navigation }) => {
  const { user, signOut, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleSave = async () => {
    try {
      await updateProfile({ fullName, phone, emergencyContact });
      await updateUser({ fullName, phone, emergencyContact });
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
                value={fullName}
                onChangeText={setFullName}
              />
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldLabel}>Emergency Contact</Text>
              <TextInput
                style={styles.input}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                keyboardType="phone-pad"
              />
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
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
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
          <Text style={styles.aboutText}>Crowdsourced Campus Safety Application</Text>
          <Text style={styles.aboutSubtext}>Midlands State University</Text>
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
});

export default SettingsScreen;
