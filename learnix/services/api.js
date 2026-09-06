// Learnix API client — fetch wrapper + token storage + demo auth.
// Android emulator reaches the dev machine via 10.0.2.2; iOS/web use localhost.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000/api/v1' : 'http://localhost:4000/api/v1';

// Demo credentials — replaced by the real login flow once auth screens wire up.
const DEMO_LOGIN = {
  email: 'priya@learnix.dev',
  password: 'Passw0rd!',
};

let accessToken = null;
let refreshPromise = null;

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DEMO_LOGIN),
  });
  const json = await res.json();
  if (!res.ok || !json.data) throw new Error(json.error?.message || 'Login failed');
  accessToken = json.data.accessToken;
  await AsyncStorage.setItem('learnix.refreshToken', json.data.refreshToken);
  return json.data;
}

async function tryRefresh() {
  const refreshToken = await AsyncStorage.getItem('learnix.refreshToken');
  if (!refreshToken) return false;
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const json = await res.json();
  accessToken = json.data.accessToken;
  await AsyncStorage.setItem('learnix.refreshToken', json.data.refreshToken);
  return true;
}

async function request(method, path, body) {
  if (!accessToken) {
    refreshPromise = refreshPromise || login().finally(() => (refreshPromise = null));
    await refreshPromise;
  }

  const call = async () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let res = await call();
  if (res.status === 401) {
    // one silent refresh + retry
    const ok = await tryRefresh();
    if (ok) res = await call();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error?.message || `Request failed (${res.status})`);
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
};

// ── Alumni Relations endpoints (docs/users/12 §4) ──
export const alumniApi = {
  dashboard: () => api.get('/alumni/dashboard'),
  directory: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return api.get(`/alumni/directory${qs ? `?${qs}` : ''}`);
  },
  alumniDetail: (id) => api.get(`/alumni/directory/${id}`),
  inviteAlumni: (id) => api.post(`/alumni/directory/${id}/invite`),
  addMentor: (id) => api.post(`/alumni/directory/${id}/add-mentor`),
  events: () => api.get('/alumni/events'),
  eventDetail: (id) => api.get(`/alumni/events/${id}`),
  decideRsvp: (rsvpId, decision) => api.post(`/alumni/rsvps/${rsvpId}/decide`, { decision }),
  donations: () => api.get('/alumni/donations'),
  recordDonation: (id) => api.post(`/alumni/donations/${id}/record`),
  mentorship: () => api.get('/alumni/mentorship'),
  mentorshipAction: (id, action) => api.post(`/alumni/mentorship/${id}/${action}`),
  chapters: () => api.get('/alumni/chapters'),
  notifications: () => api.get('/alumni/notifications'),
  markAllRead: () => api.post('/alumni/notifications/read-all'),
  broadcast: (payload) => api.post('/alumni/broadcasts', payload),
  profile: () => api.get('/alumni/profile'),
};
