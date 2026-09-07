// Learnix API client — fetch wrapper + token storage + demo auth.
// Android emulator reaches the dev machine via 10.0.2.2; iOS/web use localhost.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000/api/v1' : 'http://localhost:4000/api/v1';

// Demo credentials — replaced by the real login flow once auth screens wire up.
// Each user app sets its demo identity at startup via setDemoUser().
let demoEmail = 'priya@learnix.dev';
const DEMO_PASSWORD = 'Passw0rd!';

export function setDemoUser(email) {
  if (demoEmail !== email) {
    demoEmail = email;
    accessToken = null; // force re-login as the new demo user
  }
}

let accessToken = null;
let refreshPromise = null;

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: DEMO_PASSWORD }),
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

// ── Sports & Cultural endpoints (docs/users/10 §4) ──
export const sportsApi = {
  dashboard: () => api.get('/sports/dashboard'),
  events: () => api.get('/sports/events'),
  eventDetail: (id) => api.get(`/sports/events/${id}`),
  decideRegistration: (id, decision) => api.post(`/sports/registrations/${id}/decide`, { decision }),
  addScheduleItem: (eventId, day, item) =>
    api.post(`/sports/events/${eventId}/schedule`, { day, item }),
  toggleScheduleItem: (itemId, isDone) =>
    api.post(`/sports/schedule-items/${itemId}/toggle`, { isDone }),
  addVolunteer: (eventId, rollNo, role) =>
    api.post(`/sports/events/${eventId}/volunteers`, { rollNo, role }),
  announceEvent: (id) => api.post(`/sports/events/${id}/announce`),
  teams: () => api.get('/sports/teams'),
  teamDetail: (id) => api.get(`/sports/teams/${id}`),
  addPlayer: (teamId, rollNo) => api.post(`/sports/teams/${teamId}/players`, { rollNo }),
  tournaments: () => api.get('/sports/tournaments'),
  scheduleFixture: (payload) => api.post('/sports/fixtures', payload),
  recordResult: (fixtureId, winner, scoreA, scoreB) =>
    api.post(`/sports/fixtures/${fixtureId}/result`, { winner, scoreA, scoreB }),
  equipment: () => api.get('/sports/equipment'),
  addEquipment: (payload) => api.post('/sports/equipment', payload),
  issueEquipment: (itemId, rollNo, dueAt) =>
    api.post('/sports/equipment/issue', { itemId, rollNo, dueAt }),
  returnEquipment: (issueId) => api.post(`/sports/equipment-issues/${issueId}/return`),
  venues: () => api.get('/sports/venues'),
  decideVenueBooking: (id, decision) => api.post(`/sports/venue-bookings/${id}/decide`, { decision }),
  bookVenue: (payload) => api.post('/sports/venue-bookings', payload),
  notifications: () => api.get('/sports/notifications'),
  markAllRead: () => api.post('/sports/notifications/read-all'),
  broadcast: (payload) => api.post('/sports/broadcasts', payload),
  profile: () => api.get('/sports/profile'),
};

// ── Transport endpoints (docs/users/09 §4) ──
export const transportApi = {
  dashboard: () => api.get('/transport/dashboard'),
  routes: () => api.get('/transport/routes'),
  routeDetail: (id) => api.get(`/transport/routes/${id}`),
  createRoute: (payload) => api.post('/transport/routes', payload),
  addStop: (routeId, stopName, time) =>
    api.post(`/transport/routes/${routeId}/stops`, { stopName, time }),
  enrollStudent: (routeId, rollNo, order) =>
    api.post(`/transport/routes/${routeId}/enroll`, { rollNo, order }),
  removeEnrollment: (id) => api.post(`/transport/enrollments/${id}/remove`),
  fleet: () => api.get('/transport/fleet'),
  vehicleDetail: (id) => api.get(`/transport/fleet/${id}`),
  recordService: (vehicleId, payload) => api.post(`/transport/fleet/${vehicleId}/service`, payload),
  addFuel: (vehicleId, litres, amountMinor) =>
    api.post(`/transport/fleet/${vehicleId}/fuel`, { litres, amountMinor }),
  completeService: (serviceId, odometerKm) =>
    api.post(`/transport/service-records/${serviceId}/complete`,
      odometerKm ? { odometerKm } : {}),
  drivers: () => api.get('/transport/drivers'),
  setDuty: (driverId, dutyStatus) => api.post(`/transport/drivers/${driverId}/duty`, { dutyStatus }),
  tracking: () => api.get('/transport/tracking'),
  ping: (vehicleId, payload) => api.post(`/transport/vehicles/${vehicleId}/ping`, payload),
  maintenance: () => api.get('/transport/maintenance'),
  fees: () => api.get('/transport/fees'),
  remindFee: (id) => api.post(`/transport/fees/${id}/remind`),
  collectFee: (id, method) => api.post(`/transport/fees/${id}/collect`, { method }),
  requestFeeRevision: (requestedMinor, reason) =>
    api.post('/transport/fee-structure/revision', { requestedMinor, reason }),
  notifications: () => api.get('/transport/notifications'),
  markAllRead: () => api.post('/transport/notifications/read-all'),
  broadcast: (payload) => api.post('/transport/broadcasts', payload),
  profile: () => api.get('/transport/profile'),
};

// ── HOD endpoints (docs/users/11 §4) ──
export const hodApi = {
  dashboard: () => api.get('/hod/dashboard'),
  faculty: () => api.get('/hod/faculty'),
  reassign: (offeringId, toUserId) =>
    api.post(`/hod/offerings/${offeringId}/reassign`, { toUserId }),
  syllabus: () => api.get('/hod/syllabus'),
  approveSyllabus: (id) => api.post(`/hod/syllabus/${id}/approve`),
  requestSyllabusChanges: (id, feedback) =>
    api.post(`/hod/syllabus/${id}/request-changes`, { feedback }),
  students: (year) => api.get(`/hod/students${year ? `?year=${year}` : ''}`),
  courses: () => api.get('/hod/courses'),
  courseDetail: (id) => api.get(`/hod/courses/${id}`),
  leaves: () => api.get('/hod/leave'),
  approveLeave: (id, substituteUserId) =>
    api.post(`/hod/leave/${id}/approve`,
      substituteUserId ? { substituteUserId } : {}),
  rejectLeave: (id) => api.post(`/hod/leave/${id}/reject`),
  analytics: () => api.get('/hod/analytics'),
  notifications: () => api.get('/hod/notifications'),
  markAllRead: () => api.post('/hod/notifications/read-all'),
  broadcast: (payload) => api.post('/hod/broadcasts', payload),
  profile: () => api.get('/hod/profile'),
};

// ── Hostel endpoints (docs/users/08 §4) ──
export const hostelApi = {
  dashboard: () => api.get('/hostel/dashboard'),
  rooms: () => api.get('/hostel/rooms'),
  roomDetail: (roomNumber) => api.get(`/hostel/rooms/${roomNumber}`),
  allocate: (rollNo, roomNumber) => api.post('/hostel/allocations', { rollNo, roomNumber }),
  vacateBed: (bedId) => api.post(`/hostel/beds/${bedId}/vacate`),
  transferBed: (bedId, toRoomNumber) => api.post(`/hostel/beds/${bedId}/transfer`, { toRoomNumber }),
  residents: () => api.get('/hostel/residents'),
  residentDetail: (studentProfileId) => api.get(`/hostel/residents/${studentProfileId}`),
  collectRent: (dueId, method) => api.post(`/hostel/rent/${dueId}/collect`, { method }),
  mess: () => api.get('/hostel/mess'),
  updateMenu: (dayOfWeek, meal, items) => api.put('/hostel/mess/menu', { dayOfWeek, meal, items }),
  sendMessSurvey: () => api.post('/hostel/mess/survey'),
  gatePasses: () => api.get('/hostel/gate-passes'),
  decideGatePass: (id, decision) => api.post(`/hostel/gate-passes/${id}/decide`, { decision }),
  complaints: () => api.get('/hostel/complaints'),
  createComplaint: (payload) => api.post('/hostel/complaints', payload),
  assignComplaint: (id) => api.post(`/hostel/complaints/${id}/assign`),
  resolveComplaint: (id) => api.post(`/hostel/complaints/${id}/resolve`),
  visitors: () => api.get('/hostel/visitors'),
  checkInVisitor: (name, studentProfileId, relation) =>
    api.post('/hostel/visitors/checkin', { name, studentProfileId, relation }),
  checkOutVisitor: (id) => api.post(`/hostel/visitors/${id}/checkout`),
  notifications: () => api.get('/hostel/notifications'),
  markAllRead: () => api.post('/hostel/notifications/read-all'),
  broadcast: (payload) => api.post('/hostel/broadcasts', payload),
  profile: () => api.get('/hostel/profile'),
};

// ── Library Staff endpoints (docs/users/07 §4) ──
export const libraryApi = {
  dashboard: () => api.get('/library/dashboard'),
  catalog: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return api.get(`/library/catalog${qs ? `?${qs}` : ''}`);
  },
  bookDetail: (id) => api.get(`/library/catalog/${id}`),
  addBook: (payload) => api.post('/library/catalog', payload),
  updateBook: (id, payload) => api.put(`/library/catalog/${id}`, payload),
  issueBook: (rollNo, bookId, dueDays) =>
    api.post('/library/circulation/issue', { rollNo, bookId, dueDays }),
  returnBook: (issueId) => api.post('/library/circulation/return', { issueId }),
  fines: () => api.get('/library/fines'),
  collectFine: (id, method) => api.post(`/library/fines/${id}/collect`, { method }),
  waiveFine: (id, reason) => api.post(`/library/fines/${id}/waive`, { reason }),
  requests: () => api.get('/library/requests'),
  decideRequest: (id, decision) => api.post(`/library/requests/${id}/decide`, { decision }),
  digitalResources: () => api.get('/library/digital'),
  addDigitalResource: (payload) => api.post('/library/digital', payload),
  grantAccess: (resourceId, payload) => api.post(`/library/digital/${resourceId}/grant-access`, payload),
  notifications: () => api.get('/library/notifications'),
  markAllRead: () => api.post('/library/notifications/read-all'),
  broadcast: (payload) => api.post('/library/broadcasts', payload),
  profile: () => api.get('/library/profile'),
};
