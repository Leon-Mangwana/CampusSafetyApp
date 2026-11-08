import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

/** Who an SOS reaches: the control room plus the user's emergency contacts. */
const ContactList = ({ user, variant = 'light' }) => {
  const dark = variant === 'dark';
  const contacts = Array.isArray(user?.emergencyContacts) ? user.emergencyContacts : [];
  const row = [styles.row, dark && styles.rowDark];
  const text = [styles.text, dark && styles.textDark];
  return (
    <View>
      <View style={row}><Text style={text}>Campus Security Control Room</Text></View>
      {contacts.map((c, i) => (
        <View key={`${c.phone}-${i}`} style={row}>
          <Text style={text}>{c.name} — {c.phone}</Text>
        </View>
      ))}
      {contacts.length === 0 && (
        <View style={row}>
          <Text style={[text, !dark && { color: COLORS.danger }]}>
            {dark ? 'No emergency contacts configured' : 'No emergency contacts — add them in Settings'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, width: '100%', marginBottom: 8, backgroundColor: COLORS.greyLight,
  },
  rowDark: { borderWidth: 0, backgroundColor: 'rgba(255,255,255,0.1)' },
  text: { fontSize: 13, color: COLORS.text, textAlign: 'center' },
  textDark: { color: COLORS.white },
});

export default ContactList;
