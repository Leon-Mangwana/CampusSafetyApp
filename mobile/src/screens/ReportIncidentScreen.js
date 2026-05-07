import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, INCIDENT_TYPES, SEVERITY_LEVELS } from '../constants/theme';
import { submitIncidentReport } from '../services/api';

// Inline guidance shown under each severity button so reporters pick
// consistently. Keep these short so the button stays compact on small phones.
const SEVERITY_HINTS = {
  low: 'No immediate danger',
  medium: 'Concerning, not life-threatening',
  high: 'Active threat / injury',
};

const ReportIncidentScreen = ({ navigation }) => {
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState('Detecting location...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      setLocationText(`GPS: ${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`);
    } catch (error) {
      setLocationText('Unable to get location');
    }
  };

  const handleSubmit = async () => {
    if (!incidentType) {
      Alert.alert('Error', 'Please select an incident type.');
      return;
    }
    if (!severity) {
      Alert.alert('Error', 'Please select severity level.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Error', 'Please provide a description (at least 10 characters).');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'GPS location is required. Please enable location services.');
      return;
    }

    setLoading(true);
    try {
      await submitIncidentReport({
        type: incidentType,
        severity,
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
      });

      Alert.alert(
        'Report Submitted',
        'Your incident report has been submitted anonymously. Thank you for helping keep the campus safe.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Report an Incident</Text>
        <Text style={styles.anonymousNote}>Your identity will remain anonymous</Text>

        {/* Incident Type */}
        <Text style={styles.label}>Incident Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          {INCIDENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeChip,
                incidentType === type.value && styles.typeChipSelected,
              ]}
              onPress={() => setIncidentType(type.value)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  incidentType === type.value && styles.typeChipTextSelected,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Severity Level */}
        <Text style={styles.label}>Severity Level *</Text>
        <Text style={styles.severityHelp}>
          Pick the option that best matches the threat level — this controls who gets notified.
        </Text>
        <View style={styles.severityRow}>
          {SEVERITY_LEVELS.map((level) => {
            const isSelected = severity === level.value;
            return (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.severityButton,
                  { borderColor: level.color },
                  isSelected && { backgroundColor: level.color },
                ]}
                onPress={() => setSeverity(level.value)}
              >
                <Text
                  style={[
                    styles.severityText,
                    { color: isSelected ? COLORS.white : level.color },
                  ]}
                >
                  {level.label}
                </Text>
                <Text
                  style={[
                    styles.severityHint,
                    { color: isSelected ? 'rgba(255,255,255,0.9)' : COLORS.textSecondary },
                  ]}
                >
                  {SEVERITY_HINTS[level.value]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the incident..."
          placeholderTextColor={COLORS.grey}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Location */}
        <Text style={styles.label}>Location</Text>
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>{locationText}</Text>
          <TouchableOpacity onPress={getLocation}>
            <Text style={styles.refreshLocation}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report Anonymously</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  anonymousNote: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 16 },
  typeScroll: { marginBottom: 8 },
  typeChip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  typeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  typeChipTextSelected: { color: COLORS.white },
  severityHelp: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10, marginTop: -2 },
  severityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  severityButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginHorizontal: 4,
    minHeight: 70,
  },
  severityText: { fontWeight: '700', fontSize: 15 },
  severityHint: { fontSize: 10, fontWeight: '500', marginTop: 4, textAlign: 'center', lineHeight: 13 },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    backgroundColor: COLORS.greyLight,
    color: COLORS.text,
  },
  locationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: COLORS.greyLight,
  },
  locationText: { fontSize: 13, color: COLORS.textSecondary },
  refreshLocation: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.7 },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});

export default ReportIncidentScreen;
