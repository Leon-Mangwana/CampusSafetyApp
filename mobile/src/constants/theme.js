export const COLORS = {
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#42A5F5',
  secondary: '#FF6F00',
  danger: '#D32F2F',
  dangerLight: '#EF5350',
  success: '#388E3C',
  warning: '#F57C00',
  white: '#FFFFFF',
  black: '#000000',
  grey: '#9E9E9E',
  greyLight: '#F5F5F5',
  greyMedium: '#E0E0E0',
  greyDark: '#616161',
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  severityLow: '#4CAF50',
  severityMedium: '#FF9800',
  severityHigh: '#F44336',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.text },
  medium: { fontSize: 16, fontWeight: '500', color: COLORS.text },
  bold: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  small: { fontSize: 12, color: COLORS.textSecondary },
};

export const INCIDENT_TYPES = [
  { label: 'Theft', value: 'theft', icon: 'lock-open' },
  { label: 'Assault', value: 'assault', icon: 'alert' },
  { label: 'Harassment', value: 'harassment', icon: 'account-alert' },
  { label: 'Vandalism', value: 'vandalism', icon: 'hammer' },
  { label: 'Unauthorized Access', value: 'unauthorized_access', icon: 'door-open' },
  { label: 'Fire', value: 'fire', icon: 'fire' },
  { label: 'Medical', value: 'medical', icon: 'medical-bag' },
  { label: 'Suspicious Activity', value: 'suspicious_activity', icon: 'eye' },
  { label: 'Other', value: 'other', icon: 'dots-horizontal' },
];

export const SEVERITY_LEVELS = [
  { label: 'Low', value: 'low', color: COLORS.severityLow },
  { label: 'Medium', value: 'medium', color: COLORS.severityMedium },
  { label: 'High', value: 'high', color: COLORS.severityHigh },
];

// Default campus center coordinates — Midlands State University Main Campus,
// Senga, Gweru. Used as the fallback region before the device's GPS fix
// arrives. Never leave this at (0, 0) or the map renders over the Atlantic
// Ocean and looks blank.
export const DEFAULT_CAMPUS = {
  latitude: -19.5176,
  longitude: 29.8331,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
