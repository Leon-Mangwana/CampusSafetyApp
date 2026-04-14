import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, Linking, Alert,
} from 'react-native';
import { COLORS } from '../constants/theme';

const EMERGENCY_CONTACTS = [
  {
    category: 'Campus Security',
    contacts: [
      { name: 'MSU Security Control Room', number: '+263542260404', display: '054 226 0404' },
      { name: 'MSU Security (Mobile)', number: '+263772123456', display: '0772 123 456' },
    ],
  },
  {
    category: 'National Emergency',
    contacts: [
      { name: 'Zimbabwe Police (ZRP)', number: '995', display: '995' },
      { name: 'Ambulance / Medical', number: '994', display: '994' },
      { name: 'Fire Brigade', number: '993', display: '993' },
    ],
  },
  {
    category: 'Gweru Local Services',
    contacts: [
      { name: 'Gweru Central Police Station', number: '+263542252211', display: '054 225 2211' },
      { name: 'Gweru Provincial Hospital', number: '+263542252481', display: '054 225 2481' },
    ],
  },
  {
    category: 'MSU Support Services',
    contacts: [
      { name: 'Student Affairs Office', number: '+263542260648', display: '054 226 0648' },
      { name: 'MSU Clinic', number: '+263542260404', display: '054 226 0404' },
      { name: 'Gender-Based Violence Hotline', number: '+263714020057', display: '0714 020 057' },
    ],
  },
];

const makeCall = (number, name) => {
  Alert.alert(
    'Call ' + name,
    'Do you want to call ' + name + '?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: () => {
          Linking.openURL(`tel:${number}`).catch(() => {
            Alert.alert('Error', 'Unable to make a call from this device.');
          });
        },
      },
    ]
  );
};

const EmergencyContactsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Numbers</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentText}>If you are in immediate danger, call Campus Security or Police now</Text>
        </View>

        {EMERGENCY_CONTACTS.map((section) => (
          <View key={section.category}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            <View style={styles.card}>
              {section.contacts.map((contact, index) => (
                <TouchableOpacity
                  key={contact.name + index}
                  style={[
                    styles.contactRow,
                    index < section.contacts.length - 1 && styles.contactRowBorder,
                  ]}
                  onPress={() => makeCall(contact.number, contact.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactNumber}>{contact.display}</Text>
                  </View>
                  <View style={styles.callButton}>
                    <Text style={styles.callButtonText}>Call</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.danger,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 60 },
  backText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  urgentBanner: {
    backgroundColor: '#B71C1C',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  urgentText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  contactRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactInfo: { flex: 1, marginRight: 12 },
  contactName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  contactNumber: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  callButton: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  callButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});

export default EmergencyContactsScreen;
