import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { EMERGENCY_DIRECTORY } from '../constants/emergencyNumbers';
import { confirmAndDial } from '../utils/dial';

const EmergencyContactsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Numbers</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentText}>If you are in immediate danger, call Campus Security or the Police now</Text>
        </View>

        {EMERGENCY_DIRECTORY.map((section) => (
          <View key={section.category}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            <View style={styles.card}>
              {section.contacts.map((contact, index) => {
                const disabled = !contact.number;
                return (
                  <TouchableOpacity
                    key={contact.name + index}
                    style={[
                      styles.contactRow,
                      index < section.contacts.length - 1 && styles.contactRowBorder,
                    ]}
                    onPress={() => confirmAndDial(contact.number, contact.name)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${contact.name}, ${contact.display}`}
                    accessibilityState={{ disabled }}
                  >
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={[styles.contactNumber, disabled && styles.contactNumberMissing]}>
                        {contact.display}
                      </Text>
                    </View>
                    <View style={[styles.callButton, disabled && styles.callButtonDisabled]}>
                      <Text style={styles.callButtonText}>Call</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.footnote}>
          Numbers are for Zimbabwe. If a call fails, dial 112 from any mobile network.
        </Text>
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
    backgroundColor: COLORS.dangerDark,
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
  contactNumberMissing: { color: COLORS.warning, fontStyle: 'italic' },
  callButton: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  callButtonDisabled: { backgroundColor: COLORS.grey },
  callButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  footnote: {
    marginTop: 24,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default EmergencyContactsScreen;
