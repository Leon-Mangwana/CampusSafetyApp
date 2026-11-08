import { Alert, Platform } from 'react-native';

// react-native-web ships Alert.alert as a no-op, so on web every error dialog
// and confirmation silently vanishes. Route them through the browser's native
// dialogs instead. Imported for its side effect from App.js.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }];

    if (list.length === 1) {
      window.alert(text);
      list[0].onPress?.();
      return;
    }

    // Two or more buttons: treat the non-cancel button as the confirm action.
    const cancel = list.find((b) => b.style === 'cancel') || list[0];
    const confirm = list.find((b) => b !== cancel) || list[list.length - 1];
    const ok = window.confirm(`${text}\n\n[OK = ${confirm.text || 'OK'}, Cancel = ${cancel.text || 'Cancel'}]`);
    (ok ? confirm : cancel).onPress?.();
  };
}
