// Map a Firebase Auth error (or any error) to a user-facing message.
// Firebase exposes a stable `code` field for known errors; for everything
// else (network, JSON parse, undefined), we fall back to a sensible default
// rather than leaking internal stack traces.

const FIREBASE_AUTH_MESSAGES = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-not-found': 'No account found with this email. Please register first.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/user-disabled': 'This account has been disabled. Contact campus IT.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password is too weak — please use at least 6 characters.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error — check your internet connection.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
};

export const friendlyAuthError = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (error.code && FIREBASE_AUTH_MESSAGES[error.code]) {
    return FIREBASE_AUTH_MESSAGES[error.code];
  }
  if (typeof error.message === 'string') {
    if (error.message.toLowerCase().includes('network')) {
      return 'Network error — check your internet connection and try again.';
    }
    // Avoid showing raw Firebase internal codes like "Firebase: Error
    // (auth/invalid-credential)." — strip them for a cleaner message.
    const cleaned = error.message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '');
    if (cleaned && cleaned.length < 120) return cleaned;
  }
  return fallback;
};
