import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const PasswordInput = ({ style, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <TextInput
        {...props}
        style={styles.input}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.icon}>{visible ? '🙈' : '👁'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.greyLight,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: {
    fontSize: 18,
  },
});

export default PasswordInput;
