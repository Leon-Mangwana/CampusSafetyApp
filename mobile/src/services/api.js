import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';
import { API_BASE_URL } from '../constants/config';

const DEFAULT_TIMEOUT_MS = 15000;
const SOS_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'api_error' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code; // 'timeout' | 'network' | 'unauthorized' | 'rate_limited' | 'api_error'
  }
}

// Installed by AuthContext; called when the server rejects our token so the
// app can sign the user out instead of looping on failed requests.
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

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

const parseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  // Proxy/HTML error pages etc. — never try to JSON.parse them.
  return null;
};

const apiRequest = async (endpoint, options = {}) => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...fetchOptions.headers,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection.', { code: 'timeout' });
    }
    throw new ApiError('Could not reach the server. Check your connection.', { code: 'network' });
  }
  clearTimeout(timer);

  const data = await parseBody(response);

  if (!response.ok) {
    const message = (data && data.error) || `Request failed (${response.status})`;
    const code = response.status === 401
      ? 'unauthorized'
      : response.status === 429
        ? 'rate_limited'
        : 'api_error';
    if (response.status === 401 && unauthorizedHandler) {
      try { unauthorizedHandler(); } catch { /* ignore */ }
    }
    throw new ApiError(message, { status: response.status, code });
  }

  return data ?? {};
};

const jsonBody = (body) => JSON.stringify(body);

// Auth
export const registerUser = (userData) =>
  apiRequest('/auth/register', { method: 'POST', body: jsonBody(userData) });

export const getProfile = () => apiRequest('/auth/profile');

export const updateProfile = (data) =>
  apiRequest('/auth/profile', { method: 'PUT', body: jsonBody(data) });

export const updatePushToken = (pushToken) =>
  apiRequest('/auth/push-token', { method: 'PUT', body: jsonBody({ pushToken }) });

export const updateUserLocation = (latitude, longitude) =>
  apiRequest('/auth/location', { method: 'PUT', body: jsonBody({ latitude, longitude }) });

export const clearUserLocation = () => apiRequest('/auth/location', { method: 'DELETE' });

// Incidents
export const submitIncidentReport = (report) =>
  apiRequest('/incidents', { method: 'POST', body: jsonBody(report) });

export const getIncidents = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/incidents${query ? `?${query}` : ''}`);
};

export const getIncidentById = (id) => apiRequest(`/incidents/${encodeURIComponent(id)}`);

export const updateIncidentStatus = (id, status) =>
  apiRequest(`/incidents/${encodeURIComponent(id)}/status`, { method: 'PUT', body: jsonBody({ status }) });

export const deleteIncident = (id) =>
  apiRequest(`/incidents/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getHeatmapData = (type = '') => {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
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
/**
 * @param {{latitude?: number, longitude?: number, accuracy?: number,
 *          locationSource?: 'gps'|'last_known'|'none'}} payload
 */
export const triggerSOS = (payload = {}) =>
  apiRequest('/sos', { method: 'POST', body: jsonBody(payload), timeoutMs: SOS_TIMEOUT_MS });

export const updateSOSLocation = (alertId, latitude, longitude, accuracy) =>
  apiRequest(`/sos/${encodeURIComponent(alertId)}/location`, {
    method: 'PUT',
    body: jsonBody({ latitude, longitude, accuracy }),
    timeoutMs: SOS_TIMEOUT_MS,
  });

export const cancelSOSAlert = (alertId) =>
  apiRequest(`/sos/${encodeURIComponent(alertId)}/cancel`, { method: 'PUT' });

export const getSOSAlerts = (status = '') => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/sos${query}`);
};

export const resolveSOSAlert = (alertId, status) =>
  apiRequest(`/sos/${encodeURIComponent(alertId)}/resolve`, { method: 'PUT', body: jsonBody({ status }) });

// Notifications
export const getNotifications = () => apiRequest('/notifications');

export const markNotificationRead = (id) =>
  apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' });

export const markAllNotificationsRead = () =>
  apiRequest('/notifications/read-all', { method: 'PUT' });
