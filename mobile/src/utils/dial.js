import { Alert, Linking } from 'react-native';

/**
 * Open the phone dialler for `number`. Shows an alert if the number is not
 * configured or the device cannot place calls.
 */
export const dial = async (number, label = 'this number') => {
  if (!number) {
    Alert.alert('Number Not Available', `${label} has not been configured yet.`);
    return false;
  }
  const url = `tel:${String(number).replace(/\s+/g, '')}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Error', 'Unable to make a call from this device.');
    return false;
  }
};

/** Ask for confirmation, then dial. */
export const confirmAndDial = (number, name) => {
  if (!number) {
    Alert.alert('Number Not Available', `${name} has not been configured yet.`);
    return;
  }
  Alert.alert(`Call ${name}`, `Do you want to call ${name}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: () => dial(number, name) },
  ]);
};
