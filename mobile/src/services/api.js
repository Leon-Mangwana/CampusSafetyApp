import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';
import { API_BASE_URL } from '../constants/config';

// Firebase ID tokens expire after 1 hour. Asking the SDK for the token on
// each request returns the cached one if still valid, or transparently
// refreshes it if it's within ~5 minutes of expiry. We mirror the result
// back into AsyncStorage so cold-start flows that read storage directly
// stay in sync.
const getAuthToken = async () => {
  try {
    if (auth.currentUser) {
      const fresh = await auth.currentUser.getIdToken();
      if (fresh) {
        await AsyncStorage.setItem('userToken', fresh);
        return fresh;
      }
    }
  } catch {
    // Fall through to the storage-cached token below.
  }
  return AsyncStorage.getItem('userToken');
};

const apiRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

// Auth
export const registerUser = (userData) =>
  apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) });

export const getProfile = () => apiRequest('/auth/profile');

export const updateProfile = (data) =>
  apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });

export const updateFcmToken = (fcmToken) =>
  apiRequest('/auth/fcm-token', { method: 'PUT', body: JSON.stringify({ fcmToken }) });

export const updateUserLocation = (latitude, longitude) =>
  apiRequest('/auth/location', { method: 'PUT', body: JSON.stringify({ latitude, longitude }) });

// Incidents
export const submitIncidentReport = (report) =>
  apiRequest('/incidents', { method: 'POST', body: JSON.stringify(report) });

export const getIncidents = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/incidents?${query}`);
};

export const getIncidentById = (id) => apiRequest(`/incidents/${id}`);

export const updateIncidentStatus = (id, status) =>
  apiRequest(`/incidents/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

export const deleteIncident = (id) =>
  apiRequest(`/incidents/${id}`, { method: 'DELETE' });

export const getHeatmapData = (type = '') => {
  const query = type ? `?type=${type}` : '';
  return apiRequest(`/incidents/heatmap${query}`);
};

export const getIncidentStats = () => apiRequest('/incidents/stats');

export const getMonthlyReport = ({ month, year } = {}) => {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (year) params.set('year', year);
  const qs = params.toString();
  return apiRequest(`/incidents/report/monthly${qs ? `?${qs}` : ''}`);
};

// SOS
export const triggerSOS = (latitude, longitude) =>
  apiRequest('/sos', { method: 'POST', body: JSON.stringify({ latitude, longitude }) });

export const updateSOSLocation = (alertId, latitude, longitude) =>
  apiRequest(`/sos/${alertId}/location`, {
    method: 'PUT',
    body: JSON.stringify({ latitude, longitude }),
  });

export const cancelSOSAlert = (alertId) =>
  apiRequest(`/sos/${alertId}/cancel`, { method: 'PUT' });

export const getSOSAlerts = (status = '') => {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/sos${query}`);
};

export const resolveSOSAlert = (alertId, status) =>
  apiRequest(`/sos/${alertId}/resolve`, { method: 'PUT', body: JSON.stringify({ status }) });

// Notifications
export const getNotifications = () => apiRequest('/notifications');

export const markNotificationRead = (id) =>
  apiRequest(`/notifications/${id}/read`, { method: 'PUT' });

export const markAllNotificationsRead = () =>
  apiRequest('/notifications/read-all', { method: 'PUT' });
