// Learnix API client — fetch wrapper + token storage + demo auth.
// Android emulator reaches the dev machine via 10.0.2.2; iOS/web use localhost.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL: override with EXPO_PUBLIC_API_URL. In Docker the nginx proxy
// serves /api/v1 on the same host, so a relative path works there.
const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000/api/v1' : 'http://localhost:4000/api/v1';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;

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
  put: (path, body) => request('PUT', path, body),
  // PATCH carries a PARTIAL update — the body is only the fields that changed,
  // never the whole record. Used by payroll loss-of-pay adjustments.
  patch: (path, body) => request('PATCH', path, body),
  // DELETE may carry a body when the removal needs a recorded reason (a waived
  // late fine, for instance). Express reads it with the usual json parser.
  delete: (path, body) => request('DELETE', path, body),
  // Multipart POST, for a receipt upload. Deliberately NOT folded into
  // `request`: that helper sets Content-Type: application/json unconditionally,
  // and if you hand it a FormData body the server gets a JSON content type with
  // no boundary and multer rejects the upload with an unhelpful error. So this
  // sends the form and lets fetch set the boundary itself.
  upload: (path, formData) => requestRaw('POST', path, formData),
};

/**
 * Send a multipart body. Same auth, same one-shot refresh, same error shape as
 * `request` — the ONLY difference is that it leaves Content-Type alone so fetch
 * can generate the multipart boundary.
 */
async function requestRaw(method, path, formData) {
  if (!accessToken) {
    refreshPromise = refreshPromise || login().finally(() => (refreshPromise = null));
    await refreshPromise;
  }

  const call = () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: formData,
    });

  let res = await call();
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) res = await call();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error?.message || `Upload failed (${res.status})`);
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

/**
 * Turn a server-relative media path (`/uploads/<key>.pdf`) into something
 * `Linking.openURL` or an <Image> can actually load. The API path is nested
 * under BASE_URL (`…/api/v1`) but media is served from the host root, so the
 * `/api/v1` prefix has to come back off.
 */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

// ── Alumni Relations endpoints (docs/users/12 §4) ──
export const alumniApi = {
  dashboard: () => api.get('/alumni/dashboard'),
  // Directory filters are all optional and independent; the client sends only
  // what is set. `q` covers name, headline, role, company and location in one
  // box, which is what the office actually searches by.
  directory: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/directory${qs ? `?${qs}` : ''}`);
  },
  directoryFacets: () => api.get('/alumni/directory/facets'),
  alumniDetail: (id) => api.get(`/alumni/directory/${id}`),
  inviteAlumni: (id) => api.post(`/alumni/directory/${id}/invite`),
  addMentor: (id) => api.post(`/alumni/directory/${id}/add-mentor`),

  // Self-service profile + privacy (AL-02). `updateMyProfile` is a PATCH-style
  // body: omit a field to leave it alone, so never send a whole object back.
  myProfile: () => api.get('/alumni/me'),
  updateMyProfile: (payload) => api.put('/alumni/me', payload),

  // Professional networking (AL-02)
  matches: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/matches${qs ? `?${qs}` : ''}`);
  },
  connections: (box = 'incoming') => api.get(`/alumni/connections?box=${box}`),
  connectionStats: () => api.get('/alumni/connections/stats'),
  sendConnectionRequest: (profileId, message) =>
    api.post('/alumni/connections', message ? { profileId, message } : { profileId }),
  respondToConnection: (id, action) => api.post(`/alumni/connections/${id}/${action}`),

  // ── Events ──
  // `scope` is upcoming | past | mine (the "Registered events" tab). `type` is the
  // alumni taxonomy (REUNION/NETWORKING/WORKSHOP/WEBINAR/MEETUP) — separate from
  // the shared `category`, which the student and sports apps also filter on.
  events: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/events${qs ? `?${qs}` : ''}`);
  },
  eventDetail: (id) => api.get(`/alumni/events/${id}`),
  myRegistrations: () => api.get('/alumni/events/my-registrations'),
  myAttendance: () => api.get('/alumni/events/my-attendance'),
  registerForEvent: (id) => api.post(`/alumni/events/${id}/register`),
  cancelEventRegistration: (id) => api.post(`/alumni/events/${id}/cancel-registration`),
  decideRsvp: (rsvpId, decision) => api.post(`/alumni/rsvps/${rsvpId}/decide`, { decision }),
  addEventAttendee: (id, payload) => api.post(`/alumni/events/${id}/attendees`, payload),
  removeEventAttendee: (id, registrationId, reason) =>
    api.post(`/alumni/events/${id}/attendees/${registrationId}/remove`, { reason }),
  createEvent: (payload) => api.post('/alumni/events', payload),
  updateEvent: (id, payload) => api.patch(`/alumni/events/${id}`, payload),
  addEventScheduleItem: (id, payload) => api.post(`/alumni/events/${id}/schedule`, payload),
  toggleEventScheduleItem: (itemId, isDone) => api.post(`/alumni/schedule-items/${itemId}/toggle`, { isDone }),
  markAttendance: (id, registrationIds, method = 'MANUAL') =>
    api.post(`/alumni/events/${id}/attendance`, { registrationIds, method }),
  undoAttendance: (id, registrationIds) =>
    api.post(`/alumni/events/${id}/attendance/undo`, { registrationIds }),
  // Mock QR check-in — ⚠️ no camera scanner yet, the office enters/pastes the code.
  qrCheckIn: (id, code) => api.post(`/alumni/events/${id}/checkin`, { code }),
  eventFeedback: (id) => api.get(`/alumni/events/${id}/feedback`),
  submitEventFeedback: (id, payload) => api.post(`/alumni/events/${id}/feedback`, payload),
  deleteEventFeedback: (id) => api.delete(`/alumni/events/${id}/feedback`),
  eventPhotos: (id) => api.get(`/alumni/events/${id}/photos`),
  // Multipart: goes through api.upload, NOT api.post — the JSON helper sets
  // Content-Type without a boundary and multer rejects the file.
  uploadEventPhoto: (id, formData) => api.upload(`/alumni/events/${id}/photos`, formData),
  captionEventPhoto: (id, photoId, caption) =>
    api.patch(`/alumni/events/${id}/photos/${photoId}`, { caption }),
  deleteEventPhoto: (id, photoId) => api.delete(`/alumni/events/${id}/photos/${photoId}`),

  donations: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/donations${qs ? `?${qs}` : ''}`);
  },
  recordDonation: (id) => api.post(`/alumni/donations/${id}/record`),

  // ── Mentorship (AL-05) ──
  // `scope` is active | pending | history | all. `history` exists because the old
  // list only ever returned ACTIVE and PENDING, so a declined pair disappeared
  // the instant you declined it.
  mentorship: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/mentorship${qs ? `?${qs}` : ''}`);
  },
  mentorshipPair: (id) => api.get(`/alumni/mentorship/${id}`),
  mentorshipAction: (id, action) => api.post(`/alumni/mentorship/${id}/${action}`),
  completePair: (id, outcome) => api.post(`/alumni/mentorship/${id}/complete`, { outcome }),
  remindMentor: (id) => api.post(`/alumni/mentorship/${id}/remind`),
  createPair: (payload) => api.post('/alumni/mentorship/pairs', payload),
  // Office shortcut kept for the alumni-detail screen; now requires a mentee.
  addMentor: (profileId, payload) => api.post(`/alumni/directory/${profileId}/add-mentor`, payload),
  // The mentor directory. With `requestId` it returns RANKED matches for that
  // request instead of a flat list.
  mentorDirectory: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/mentorship/mentors${qs ? `?${qs}` : ''}`);
  },
  mentorshipRequests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/mentorship/requests${qs ? `?${qs}` : ''}`);
  },
  requestMentor: (payload) => api.post('/alumni/mentorship/requests', payload),
  requestMatches: (requestId, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/mentorship/requests/${requestId}/matches${qs ? `?${qs}` : ''}`);
  },
  decideMentorshipRequest: (id, payload) => api.post(`/alumni/mentorship/requests/${id}/decide`, payload),
  withdrawMentorshipRequest: (id) => api.delete(`/alumni/mentorship/requests/${id}`),
  // Sessions. `planned: true` books a session; omitting it logs one that happened.
  logMentorshipSession: (pairId, payload) => api.post(`/alumni/mentorship/${pairId}/sessions`, payload),
  updateMentorshipSession: (sessionId, payload) => api.patch(`/alumni/mentorship/sessions/${sessionId}`, payload),
  cancelMentorshipSession: (sessionId, reason) =>
    api.post(`/alumni/mentorship/sessions/${sessionId}/cancel`, { reason }),
  // Goals & progress
  createMentorshipGoal: (pairId, payload) => api.post(`/alumni/mentorship/${pairId}/goals`, payload),
  updateMentorshipGoal: (goalId, payload) => api.patch(`/alumni/mentorship/goals/${goalId}`, payload),
  deleteMentorshipGoal: (goalId) => api.delete(`/alumni/mentorship/goals/${goalId}`),
  mentorshipProgress: (pairId) => api.get(`/alumni/mentorship/${pairId}/progress`),
  // Feedback — two-way, participants only
  mentorshipFeedback: (pairId) => api.get(`/alumni/mentorship/${pairId}/feedback`),
  submitMentorshipFeedback: (pairId, payload) => api.post(`/alumni/mentorship/${pairId}/feedback`, payload),
  deleteMentorshipFeedback: (pairId) => api.delete(`/alumni/mentorship/${pairId}/feedback`),

  // Chapters (AL-06). `/chapters` returns
  // { count, totalMembers, regions[], tiers{}, chapters[] }.
  chapters: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/chapters${qs ? `?${qs}` : ''}`);
  },
  chapterDetail: (id) => api.get(`/alumni/chapters/${id}`),
  chapterMembers: (id, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/chapters/${id}/members${qs ? `?${qs}` : ''}`);
  },
  chapterActivity: (id) => api.get(`/alumni/chapters/${id}/activity`),
  announceToChapter: (id, payload) => api.post(`/alumni/chapters/${id}/announce`, payload),
  createChapterEvent: (id, payload) => api.post(`/alumni/chapters/${id}/events`, payload),

  // Chapter membership. `canJoin` / `canLeave` come from the detail response's
  // viewerContext — never decide them client-side.
  joinChapter: (id) => api.post(`/alumni/chapters/${id}/join`),
  leaveChapter: (id) => api.post(`/alumni/chapters/${id}/leave`),
  removeChapterMember: (id, profileId, reason) =>
    api.post(`/alumni/chapters/${id}/remove-member`, { profileId, reason }),
  addChapterMember: (id, profileId, reason) =>
    api.post(`/alumni/chapters/${id}/members`, { profileId, reason }),

  // Chapter leadership. The committee is the source of truth; the president
  // pointer on the chapter is maintained server-side.
  chapterOfficers: (id, includePast = false) =>
    api.get(`/alumni/chapters/${id}/officers${includePast ? '?includePast=true' : ''}`),
  assignChapterOfficer: (id, payload) => api.post(`/alumni/chapters/${id}/officers`, payload),
  resignChapterOfficer: (id, officerId, reason) =>
    api.post(`/alumni/chapters/${id}/officers/${officerId}/resign`, reason ? { reason } : {}),

  // Chapter initiatives. Money progress is derived from a linked campaign, so
  // there is no amount to send here.
  chapterInitiatives: (id, status) =>
    api.get(`/alumni/chapters/${id}/initiatives${status ? `?status=${status}` : ''}`),
  createChapterInitiative: (id, payload) => api.post(`/alumni/chapters/${id}/initiatives`, payload),
  updateChapterInitiative: (id, initiativeId, payload) =>
    api.patch(`/alumni/chapters/${id}/initiatives/${initiativeId}`, payload),

  // Chapter performance / participation — all derived server-side.
  chapterPerformance: (id) => api.get(`/alumni/chapters/${id}/performance`),

  // Chapter administration (office only).
  createChapter: (payload) => api.post('/alumni/chapters', payload),
  updateChapter: (id, payload) => api.patch(`/alumni/chapters/${id}`, payload),

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
  loans: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return api.get(`/library/circulation/loans${qs ? `?${qs}` : ''}`);
  },
  loanDetail: (id) => api.get(`/library/circulation/loans/${id}`),
  renewLoan: (id, days) => api.post(`/library/circulation/loans/${id}/renew`, { days }),
  loanHistory: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return api.get(`/library/circulation/history${qs ? `?${qs}` : ''}`);
  },
  searchStudents: (q) => api.get(`/library/circulation/students?q=${encodeURIComponent(q)}`),
  studentBorrowingProfile: (id) => api.get(`/library/circulation/students/${id}`),
  fines: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return api.get(`/library/fines${qs ? `?${qs}` : ''}`);
  },
  fineDetail: (id) => api.get(`/library/fines/${id}`),
  collectFine: (id, method) => api.post(`/library/fines/${id}/collect`, { method }),
  waiveFine: (id, reason) => api.post(`/library/fines/${id}/waive`, { reason }),
  extendFine: (id, days) => api.post(`/library/fines/${id}/extend`, { days }),
  bulkSettleFines: (payload) => api.post('/library/fines/settle', payload),
  studentFines: (studentId) => api.get(`/library/fines/students/${studentId}`),
  requests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'ALL'),
    ).toString();
    return api.get(`/library/requests${qs ? `?${qs}` : ''}`);
  },
  request: (id) => api.get(`/library/requests/${id}`),
  decideRequest: (id, decision, note) =>
    api.post(`/library/requests/${id}/decide`, { decision, note }),
  procurements: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'ALL'),
    ).toString();
    return api.get(`/library/procurements${qs ? `?${qs}` : ''}`);
  },
  procurement: (id) => api.get(`/library/procurements/${id}`),
  advanceProcurement: (id, payload) => api.post(`/library/procurements/${id}/advance`, payload),
  digitalResources: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return api.get(`/library/digital${qs ? `?${qs}` : ''}`);
  },
  digitalResource: (id) => api.get(`/library/digital/${id}`),
  addDigitalResource: (payload) => api.post('/library/digital', payload),
  updateDigitalResource: (id, payload) => api.put(`/library/digital/${id}`, payload),
  deleteDigitalResource: (id) => api.delete(`/library/digital/${id}`),
  grantAccess: (resourceId, payload) => api.post(`/library/digital/${resourceId}/grant-access`, payload),
  revokeAccess: (resourceId, grantId) =>
    api.delete(`/library/digital/${resourceId}/grants/${grantId}`),
  recordAccess: (resourceId, payload = {}) =>
    api.post(`/library/digital/${resourceId}/access`, payload),
  digitalAudiences: () => api.get('/library/digital/audiences'),
  digitalUsage: () => api.get('/library/digital/usage'),
  notifications: () => api.get('/library/notifications/activity'),
  notificationActivity: (limit) =>
    api.get(`/library/notifications/activity${limit ? `?limit=${limit}` : ''}`),
  notificationInsights: () => api.get('/library/notifications/insights'),
  reminderSchedule: () => api.get('/library/notifications/reminders'),
  broadcasts: () => api.get('/library/broadcasts'),
  broadcast: (id) => api.get(`/library/broadcasts/${id}`),
  broadcastAudiences: () => api.get('/library/broadcasts/audiences'),
  sendBroadcast: (payload) => api.post('/library/broadcasts', payload),
  profile: () => api.get('/library/profile'),
  librarySettings: () => api.get('/library/settings'),
  saveLibrarySettings: (payload) => api.put('/library/settings', payload),
  libraryStaff: () => api.get('/library/staff'),
  libraryStaffMember: (id) => api.get(`/library/staff/${id}`),
  libraryPermissions: () => api.get('/library/permissions'),
};

// ── Auth endpoints shared by every role app (docs/users/03-admin §3.15) ──
export const authApi = {
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  logout: async () => {
    // Revoke the refresh token server-side so it cannot be replayed, then drop
    // local credentials. A failure here must still clear the device.
    const refreshToken = await AsyncStorage.getItem('learnix.refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // Token may already be expired — local sign-out proceeds regardless.
      }
    }
    await AsyncStorage.removeItem('learnix.refreshToken');
    accessToken = null;
    return { ok: true };
  },
};

// ── Student endpoints (docs/users/01 §4) ──
export const studentApi = {
  dashboard: () => api.get('/student/dashboard'),
  classes: () => api.get('/student/classes'),
  syllabus: (offeringId) => api.get(`/student/syllabus/${offeringId}`),
  lectureNotes: (offeringId) => api.get(`/student/lecture-notes/${offeringId}`),
  lectureNote: (noteId) => api.get(`/student/lecture-notes/note/${noteId}`),
  quizzes: (offeringId) => api.get(`/student/quizzes/${offeringId}`),
  startQuiz: (quizId) => api.post('/student/quizzes/start', { quizId }),
  answerQuiz: (payload) => api.post('/student/quizzes/answer', payload),
  submitQuiz: (attemptId) => api.post('/student/quizzes/submit', { attemptId }),
  assignments: (tab) => api.get(`/student/assignments${tab ? `?tab=${tab}` : ''}`),
  assignmentDetail: (id) => api.get(`/student/assignments/${id}`),
  submitAssignment: (id, payload) => api.post(`/student/assignments/${id}/submit`, payload),
  timetable: () => api.get('/student/timetable'),
  exams: () => api.get('/student/exams'),
  results: () => api.get('/student/results'),
  requestReevaluation: (payload) => api.post('/student/results/reevaluate', payload),
  attendance: (offeringId) => api.get(`/student/attendance/${offeringId}`),
  fees: () => api.get('/student/fees'),
  jobs: () => api.get('/student/placement/jobs'),
  drives: () => api.get('/student/placement/drives'),
  applyJob: (payload) => api.post('/student/placement/apply', payload),
  myApplications: () => api.get('/student/placement/applications'),
  events: () => api.get('/student/events'),
  registerEvent: (eventId) => api.post(`/student/events/${eventId}/register`),
  myRegistrations: () => api.get('/student/events/registrations'),
  libraryMyBooks: () => api.get('/student/library/my-books'),
  hostelAllocation: () => api.get('/student/hostel/allocation'),
  transport: () => api.get('/student/transport'),
  notifications: () => api.get('/student/notifications'),
  markAllRead: () => api.post('/student/notifications/read-all'),
  profile: () => api.get('/student/profile'),

  // ── Mentorship (student mentee side, docs/users/12 §3.5) ──
  // Deliberately under `/student/*`, not `/alumni/*`: the alumni router is gated
  // `requireRole('ALUMNI','ADMIN')`, so a STUDENT could be a mentor's mentee in the
  // database with no way to see it. These hit the thin `/student/mentorship`
  // surface, which serves the same shared services.
  mentorship: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/student/mentorship${qs ? `?${qs}` : ''}`);
  },
  mentorshipPair: (id) => api.get(`/student/mentorship/${id}`),
  mentorDirectory: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/student/mentorship/mentors${qs ? `?${qs}` : ''}`);
  },
  mentorshipRequests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/student/mentorship/requests${qs ? `?${qs}` : ''}`);
  },
  requestMentor: (payload) => api.post('/student/mentorship/requests', payload),
  requestMatches: (requestId) => api.get(`/student/mentorship/requests/${requestId}/matches`),
  withdrawMentorshipRequest: (id) => api.delete(`/student/mentorship/requests/${id}`),
  logMentorshipSession: (pairId, payload) => api.post(`/student/mentorship/${pairId}/sessions`, payload),
  cancelMentorshipSession: (sessionId, reason) =>
    api.post(`/student/mentorship/sessions/${sessionId}/cancel`, { reason }),
  mentorshipProgress: (pairId) => api.get(`/student/mentorship/${pairId}/progress`),
  createMentorshipGoal: (pairId, payload) => api.post(`/student/mentorship/${pairId}/goals`, payload),
  updateMentorshipGoal: (goalId, payload) => api.patch(`/student/mentorship/goals/${goalId}`, payload),
  deleteMentorshipGoal: (goalId) => api.delete(`/student/mentorship/goals/${goalId}`),
  mentorshipFeedback: (pairId) => api.get(`/student/mentorship/${pairId}/feedback`),
  // A student is always the MENTEE, so they write mentorRating. The service
  // reassigns the column server-side regardless of which is sent, but sending the
  // honest one keeps the request readable in logs.
  submitMentorshipFeedback: (pairId, payload) => api.post(`/student/mentorship/${pairId}/feedback`, payload),
  deleteMentorshipFeedback: (pairId) => api.delete(`/student/mentorship/${pairId}/feedback`),
};

// ── Teacher endpoints (docs/users/02 §4) ──
export const teacherApi = {
  dashboard: () => api.get('/teacher/dashboard'),
  classes: () => api.get('/teacher/classes'),
  classDashboard: (id) => api.get(`/teacher/classes/${id}/dashboard`),
  notes: (offeringId) => api.get(`/teacher/classes/${offeringId}/notes`),
  createNote: (payload) => api.post('/teacher/notes', payload),
  updateNote: (id, payload) => api.put(`/teacher/notes/${id}`, payload),
  quizzes: (offeringId) => api.get(`/teacher/classes/${offeringId}/quizzes`),
  createQuiz: (payload) => api.post('/teacher/quizzes', payload),
  addQuestion: (quizId, payload) => api.post(`/teacher/quizzes/${quizId}/questions`, payload),
  publishQuiz: (quizId) => api.post(`/teacher/quizzes/${quizId}/publish`),
  syllabus: (offeringId) => api.get(`/teacher/classes/${offeringId}/syllabus`),
  submitSyllabus: (courseId) => api.post('/teacher/syllabus/submit', { courseId }),
  updateSyllabusTopic: (topicId, payload) => api.put(`/teacher/syllabus/topics/${topicId}`, payload),
  roster: (offeringId) => api.get(`/teacher/classes/${offeringId}/roster`),
  schedule: () => api.get('/teacher/schedule'),
  createAttendanceSession: (payload) => api.post('/teacher/attendance/sessions', payload),
  markAttendance: (payload) => api.post('/teacher/attendance/mark', payload),
  finalizeAttendance: (sessionId) => api.post('/teacher/attendance/finalize', { sessionId }),
  attendanceStats: (offeringId) => api.get(`/teacher/classes/${offeringId}/attendance`),
  assignments: (offeringId) => api.get(`/teacher/assignments${offeringId ? `?offeringId=${offeringId}` : ''}`),
  createAssignment: (payload) => api.post('/teacher/assignments', payload),
  assignmentDetail: (id) => api.get(`/teacher/assignments/${id}`),
  gradeSubmission: (id, payload) => api.post(`/teacher/submissions/${id}/grade`, payload),
  enterExamGrade: (payload) => api.post('/teacher/exam-grades', payload),
  performance: (offeringId) => api.get(`/teacher/performance?offeringId=${offeringId}`),
  notifications: () => api.get('/teacher/notifications'),
  markAllRead: () => api.post('/teacher/notifications/read-all'),
  broadcast: (payload) => api.post('/teacher/broadcasts', payload),
  profile: () => api.get('/teacher/profile'),
};

// ── Exam Cell endpoints (docs/users/05 §4) ──
export const examcellApi = {
  dashboard: () => api.get('/examcell/dashboard'),
  exams: () => api.get('/examcell/timetable'),
  createExam: (payload) => api.post('/examcell/timetable', payload),
  addSlot: (examId, payload) => api.post(`/examcell/timetable/${examId}/slots`, payload),
  rescheduleSlot: (slotId, payload) => api.post(`/examcell/slots/${slotId}/reschedule`, payload),
  roomAllocations: (slotId) => api.get(`/examcell/slots/${slotId}/allocations`),
  allocateRoom: (slotId, payload) => api.post(`/examcell/slots/${slotId}/allocations`, payload),
  hallTickets: (examId) => api.get(`/examcell/hall-tickets?examId=${examId}`),
  generateHallTickets: (examId) => api.post('/examcell/hall-tickets/generate', { examId }),
  evaluations: () => api.get('/examcell/evaluations'),
  assignEvaluator: (evalId, evaluatorUserId) => api.post(`/examcell/evaluations/${evalId}/assign`, { evaluatorUserId }),
  completeEvaluation: (evalId) => api.post(`/examcell/evaluations/${evalId}/complete`),
  results: () => api.get('/examcell/results'),
  enterResult: (payload) => api.post('/examcell/results', payload),
  publishResults: (examSlotId) => api.post('/examcell/results/publish', { examSlotId }),
  decideReevaluation: (id, decision) => api.post(`/examcell/re-evaluations/${id}/decide`, { decision }),
  cheatingCases: () => api.get('/examcell/cheating-cases'),
  decideCheatingCase: (id, decision) => api.post(`/examcell/cheating-cases/${id}/decide`, { decision }),
  notifications: () => api.get('/examcell/notifications'),
  markAllRead: () => api.post('/examcell/notifications/read-all'),
  broadcast: (payload) => api.post('/examcell/broadcasts', payload),
  profile: () => api.get('/examcell/profile'),
};

// ── Accounts & Finance endpoints (docs/users/06 §4) ──
// ── Admin endpoints (docs/users/03 §4) ──
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  students: (departmentId) => api.get(`/admin/students${departmentId ? `?departmentId=${departmentId}` : ''}`),
  teachers: () => api.get('/admin/teachers'),
  leaveRequests: () => api.get('/admin/leave-requests'),
  academics: () => api.get('/admin/academics'),
  timetable: () => api.get('/admin/timetable'),
  attendance: () => api.get('/admin/attendance'),
  assignments: () => api.get('/admin/assignments'),
  departments: () => api.get('/admin/departments'),
  courses: () => api.get('/admin/courses'),
  fees: () => api.get('/admin/fees'),
  placements: () => api.get('/admin/placements'),
  events: () => api.get('/admin/events'),
  library: () => api.get('/admin/library'),
  hostelTransport: () => api.get('/admin/hostel-transport'),
  announcements: () => api.get('/admin/announcements'),
  createAnnouncement: (payload) => api.post('/admin/announcements', payload),
  decideAnnouncement: (id, decision) => api.post(`/admin/announcements/${id}/decide`, { decision }),
  reports: () => api.get('/admin/reports'),
  settings: () => api.get('/admin/settings'),
  notifications: () => api.get('/admin/notifications'),
  markAllRead: () => api.post('/admin/notifications/read-all'),
  auditLogs: () => api.get('/admin/audit-logs'),
  broadcast: (payload) => api.post('/admin/broadcasts', payload),
};

// ── Placement Cell endpoints (docs/users/04 §4) ──
export const placementApi = {
  dashboard: () => api.get('/placement/dashboard'),
  companies: () => api.get('/placement/companies'),
  addCompany: (payload) => api.post('/placement/companies', payload),
  updateCompany: (id, payload) => api.put(`/placement/companies/${id}`, payload),
  jobs: () => api.get('/placement/jobs'),
  postJob: (payload) => api.post('/placement/jobs', payload),
  closeJob: (id) => api.post(`/placement/jobs/${id}/close`),
  drives: () => api.get('/placement/drives'),
  createDrive: (payload) => api.post('/placement/drives', payload),
  submitDrive: (id) => api.post(`/placement/drives/${id}/submit`),
  applications: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return api.get(`/placement/applications${qs ? `?${qs}` : ''}`);
  },
  decideApplication: (id, decision) => api.post(`/placement/applications/${id}/decide`, { decision }),
  extendOffer: (applicationId, ctcMinor) => api.post('/placement/offers/extend', { applicationId, ctcMinor }),
  decideOffer: (id, decision) => api.post(`/placement/offers/${id}/decide`, { decision }),
  students: () => api.get('/placement/students'),
  notifications: () => api.get('/placement/notifications'),
  markAllRead: () => api.post('/placement/notifications/read-all'),
  broadcast: (payload) => api.post('/placement/broadcasts', payload),
  profile: () => api.get('/placement/profile'),
};

// ── Accounts & Finance endpoints (docs/users/06 §4) ──
/**
 * Build a `?a=1&b=2` string from only the filters that are actually set.
 *
 * The F-09 report query schemas are `.strict()`, so a key the server does not
 * expect is a 400 — and `?period=undefined` is exactly that kind of key. Only
 * the three report filters go through here; other APIs keep their own inline
 * URLSearchParams because their parameter names differ.
 */
function reportQs(filters) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filters || {})) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const accountsApi = {
  dashboard: () => api.get('/accounts/dashboard'),
  collections: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/collections${qs ? `?${qs}` : ''}`);
  },
  collectPayment: (payload) => api.post('/accounts/collections', payload),
  collectionDetail: (id) => api.get(`/accounts/collections/${id}`),
  reverseCollection: (id, reason) => api.post(`/accounts/collections/${id}/reverse`, { reason }),
  searchPayableStudents: (q, limit = 10) =>
    api.get(`/accounts/collections/students/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  studentStatement: (selector) => {
    const qs = new URLSearchParams(
      Object.entries(selector).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/collections/statement?${qs}`);
  },
  ledger: () => api.get('/accounts/ledger'),
  feeStructure: () => api.get('/accounts/fee-structure'),
  requestRevision: (id) => api.post(`/accounts/fee-structure/${id}/revision`),

  // ── Fee Structure (docs/users/06 §3.5) ──
  //
  // Every method below targets the `/fee-structures` (plural) surface. The
  // singular alias above is kept for the legacy screen and the transport module.
  //
  // Amounts go UP as integer paise (`Math.round(rupees * 100)`) and come DOWN
  // as whole rupees. That conversion happens once, here, so no screen has to
  // remember it — a screen dividing by 100 twice was a real bug in the expenses
  // vendor roll-up, and the guard against repeating it is that there is only one
  // place left where the division can happen.
  feeStructures: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/fee-structures${qs ? `?${qs}` : ''}`);
  },
  feeStructureDetail: (id, onDate) =>
    api.get(`/accounts/fee-structures/${id}${onDate ? `?onDate=${encodeURIComponent(onDate)}` : ''}`),
  createFeeStructure: (payload) => api.post('/accounts/fee-structures', payload),
  replaceFeeComponents: (id, payload) => api.put(`/accounts/fee-structures/${id}/components`, payload),

  feeStructureVersions: (id) => api.get(`/accounts/fee-structures/${id}/versions`),
  createFeeVersionDraft: (id, payload) => api.post(`/accounts/fee-structures/${id}/versions`, payload),
  publishFeeVersion: (id, versionId, payload) =>
    api.post(`/accounts/fee-structures/${id}/versions/${versionId}/publish`, payload),
  discardFeeVersion: (id, versionId) =>
    api.post(`/accounts/fee-structures/${id}/versions/${versionId}/discard`, {}),

  feeConcessions: (id) => api.get(`/accounts/fee-structures/${id}/concessions`),
  createFeeConcession: (id, payload) => api.post(`/accounts/fee-structures/${id}/concessions`, payload),
  updateFeeConcession: (id, concessionId, payload) =>
    api.put(`/accounts/fee-structures/${id}/concessions/${concessionId}`, payload),
  deleteFeeConcession: (id, concessionId) =>
    api.delete(`/accounts/fee-structures/${id}/concessions/${concessionId}`),
  previewFeeConcessions: (id, payload = {}) =>
    api.post(`/accounts/fee-structures/${id}/concessions/preview`, payload),

  saveFeeInstallments: (id, payload) => api.put(`/accounts/fee-structures/${id}/installments`, payload),
  resolveFeeOnDate: (id, onDate, semester) => {
    const qs = new URLSearchParams();
    if (onDate) qs.set('onDate', onDate);
    if (semester) qs.set('semester', String(semester));
    const s = qs.toString();
    return api.get(`/accounts/fee-structures/${id}/resolve${s ? `?${s}` : ''}`);
  },
  dues: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/dues${qs ? `?${qs}` : ''}`);
  },
  dueDetail: (id) => api.get(`/accounts/dues/${id}`),
  remindDue: (id, note) => api.post(`/accounts/dues/${id}/remind`, note ? { note } : {}),
  waiveFee: (id, reason) => api.post(`/accounts/dues/${id}/waive`, { reason }),
  reinstateDue: (id, reason) => api.post(`/accounts/dues/${id}/reinstate`, { reason }),
  // Dues & Recovery (docs/users/06 §3.3)
  duesStudents: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/dues/students${qs ? `?${qs}` : ''}`);
  },
  studentDues: (studentProfileId) => api.get(`/accounts/dues/students/${studentProfileId}`),
  duesCourses: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/dues/courses${qs ? `?${qs}` : ''}`);
  },
  duePlans: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/dues/plans${qs ? `?${qs}` : ''}`);
  },
  duePlan: (dueId) => api.get(`/accounts/dues/${dueId}/plan`),
  createDuePlan: (dueId, payload) => api.post(`/accounts/dues/${dueId}/plan`, payload),
  cancelDuePlan: (planId, reason) => api.post(`/accounts/dues/plans/${planId}/cancel`, { reason }),
  lateFeeSettings: () => api.get('/accounts/dues/late-fee'),
  saveLateFeeRule: (payload) => api.put('/accounts/dues/late-fee', payload),
  runLateFee: (payload = {}) => api.post('/accounts/dues/late-fee/run', payload),
  assessFine: (dueId, reason) => api.post(`/accounts/dues/${dueId}/late-fee`, { reason }),
  waiveFine: (dueId, reason) => api.delete(`/accounts/dues/${dueId}/late-fee`, { reason }),
  remindBulk: (payload) => api.post('/accounts/dues/remind-bulk', payload),
  previewRemindBulk: (payload) => api.post('/accounts/dues/remind-bulk/preview', payload),
  payroll: () => api.get('/accounts/payroll'),
  payrollRun: (id) => api.get(`/accounts/payroll/${id}`),
  payslip: (entryId) => api.get(`/accounts/payroll/entries/${entryId}`),
  runPayroll: (month, note) => api.post('/accounts/payroll/run', note ? { month, note } : { month }),
  approvePayrollRun: (id) => api.post(`/accounts/payroll/${id}/approve`),
  payPayrollEntry: (entryId, paymentRef) =>
    api.post(`/accounts/payroll/entries/${entryId}/pay`, paymentRef ? { paymentRef } : {}),
  payAllPayroll: (id, paymentRefPrefix) =>
    api.post(`/accounts/payroll/${id}/pay-all`, paymentRefPrefix ? { paymentRefPrefix } : {}),
  adjustPayrollEntry: (entryId, payload) => api.patch(`/accounts/payroll/entries/${entryId}`, payload),

  // F-06 Payroll salary desk (docs/users/06 §3.4). These back the versioned
  // salary records, allowance/deduction components, loans, attendance and
  // generated payslips — the things a run is built FROM. Every one is a real
  // endpoint: nothing here is mocked client-side.
  payrollComponents: () => api.get('/accounts/payroll/components'),
  salaryDesk: (month) =>
    api.get(`/accounts/payroll/salary-records${month ? `?month=${month}` : ''}`),
  staffSalary: (staffUserId, month) =>
    api.get(`/accounts/payroll/staff/${staffUserId}/salary${month ? `?month=${month}` : ''}`),
  setSalary: (staffUserId, payload) => api.post(`/accounts/payroll/staff/${staffUserId}/salary`, payload),
  saveSalaryComponents: (salaryRecordId, components) =>
    api.put(`/accounts/payroll/salary-records/${salaryRecordId}/components`, { components }),
  staffAttendance: (staffUserId, month, workingDays) => {
    const qs = new URLSearchParams();
    if (month) qs.set('month', month);
    if (workingDays) qs.set('workingDays', String(workingDays));
    const suffix = qs.toString();
    return api.get(`/accounts/payroll/staff/${staffUserId}/attendance${suffix ? `?${suffix}` : ''}`);
  },
  saveAttendance: (staffUserId, month, payload) =>
    api.put(`/accounts/payroll/staff/${staffUserId}/attendance?month=${month}`, payload),
  grantLoan: (staffUserId, payload) => api.post(`/accounts/payroll/staff/${staffUserId}/loans`, payload),
  recoverLoan: (loanId, payload) => api.post(`/accounts/payroll/loans/${loanId}/recover`, payload),
  cancelLoan: (loanId, reason) => api.post(`/accounts/payroll/loans/${loanId}/cancel`, { reason }),
  payrollAlerts: () => api.get('/accounts/payroll/alerts'),
  payrollAgeing: () => api.get('/accounts/payroll/ageing'),
  payslipDocument: (entryId) => api.get(`/accounts/payroll/entries/${entryId}/payslip`),
  generatePayslip: (entryId) => api.post(`/accounts/payroll/entries/${entryId}/payslip`),
  attachPayslip: (entryId, fileId) => api.put(`/accounts/payroll/entries/${entryId}/payslip`, { fileId }),
  // F-07 Expenses (docs/users/06 §3.6). The old three calls above are kept so
  // nothing else in the app breaks; these supersede them.
  expenses: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/expenses${qs ? `?${qs}` : ''}`);
  },
  addExpense: (payload) => api.post('/accounts/expenses', payload),
  expenseDetail: (id) => api.get(`/accounts/expenses/${id}`),
  approveExpense: (id) => api.post(`/accounts/expenses/${id}/approve`),
  rejectExpense: (id, reason) => api.post(`/accounts/expenses/${id}/reject`, { reason }),
  reopenExpense: (id) => api.post(`/accounts/expenses/${id}/reopen`),
  // Budget allocation and utilization
  expenseBudgets: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/expenses/budgets${qs ? `?${qs}` : ''}`);
  },
  saveExpenseBudget: (payload) => api.post('/accounts/expenses/budgets', payload),
  reconcileExpenseBudgets: () => api.post('/accounts/expenses/budgets/reconcile'),
  // Monthly expense trends
  expenseTrends: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/expenses/trends${qs ? `?${qs}` : ''}`);
  },
  // Department-wise expenditure
  departmentSpend: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/expenses/departments${qs ? `?${qs}` : ''}`);
  },
  // Vendor / payment records
  vendorSpend: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/accounts/expenses/vendors${qs ? `?${qs}` : ''}`);
  },
  /**
   * Attach a receipt. `file` is a React Native file handle — anything with a
   * `uri`, `name`, `type` and `size`, which is what `expo-document-picker`
   * returns. The kind is a plain text field alongside the binary, so it travels
   * in the same multipart body rather than needing a second round trip.
   */
  attachExpenseDocument: (expenseId, file, kind = 'RECEIPT', note) => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name ?? 'receipt.jpg',
      type: file.type ?? 'image/jpeg',
    });
    if (kind) form.append('kind', kind);
    if (note) form.append('note', note);
    return api.upload(`/accounts/expenses/${expenseId}/documents`, form);
  },
  detachExpenseDocument: (expenseId, docId) =>
    api.delete(`/accounts/expenses/${expenseId}/documents/${docId}`),
  // F-08 Scholarships (docs/users/06 §3.7) — the whole desk.
  //
  // The old three calls (`scholarships`, `approveScholarship`,
  // `disburseScholarship`) are gone rather than kept as aliases: they pointed at
  // an award-shaped API whose `approve` was a no-op and whose `disburse` booked a
  // Payment instead of crediting the student's dues. Nothing else in the app
  // called them.
  scholarshipCatalogue: () => api.get('/accounts/scholarships/catalogue'),
  scholarships: (params) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.q) qs.set('q', params.q);
    const suffix = qs.toString();
    return api.get(`/accounts/scholarships${suffix ? `?${suffix}` : ''}`);
  },
  saveScholarship: (payload) => (payload.id ? api.put(`/accounts/scholarships/${payload.id}`, payload) : api.post('/accounts/scholarships', payload)),
  scholarshipDetail: (schemeId) => api.get(`/accounts/scholarships/${schemeId}`),
  previewScholarship: (schemeId, studentProfileId) =>
    api.get(`/accounts/scholarships/${schemeId}/preview/${studentProfileId}`),
  scholarshipApplications: (params) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.schemeId) qs.set('schemeId', params.schemeId);
    if (params?.studentProfileId) qs.set('studentProfileId', params.studentProfileId);
    if (params?.q) qs.set('q', params.q);
    const suffix = qs.toString();
    return api.get(`/accounts/scholarships/applications${suffix ? `?${suffix}` : ''}`);
  },
  applicationDetail: (id) => api.get(`/accounts/scholarships/applications/${id}`),
  applyScholarship: (payload) => api.post('/accounts/scholarships/applications', payload),
  startReview: (id, note) => api.post(`/accounts/scholarships/applications/${id}/review`, { note: note ?? null }),
  approveScholarship: (id, note) => api.post(`/accounts/scholarships/applications/${id}/approve`, { note: note ?? null }),
  rejectScholarship: (id, reason) => api.post(`/accounts/scholarships/applications/${id}/reject`, { reason }),
  withdrawScholarship: (id, note) => api.post(`/accounts/scholarships/applications/${id}/withdraw`, { note: note ?? null }),
  disburseScholarship: (id, payload) => api.post(`/accounts/scholarships/applications/${id}/disburse`, payload ?? {}),
  reverseDisbursement: (id, reason) => api.post(`/accounts/scholarships/applications/${id}/reverse`, { reason }),
  markScholarshipDocument: (id, code, payload) => api.post(`/accounts/scholarships/applications/${id}/documents/${code}`, payload),
  uploadScholarshipDocument: (id, code, formData) => {
    const fd = new FormData();
    fd.append('file', { uri: formData.uri, name: formData.name, type: formData.type });
    return api.upload(`/accounts/scholarships/applications/${id}/documents/${code}/upload`, fd);
  },
  scholarshipTracking: () => api.get('/accounts/scholarships/tracking'),
  studentScholarshipHistory: (studentProfileId) =>
    api.get(`/accounts/scholarships/students/${studentProfileId}/history`),
  // F-09 Reports (docs/users/06 §3.8). The old `reports()` hit
  // GET /accounts/reports, whose summary aggregated `feeDue` with no tenant
  // filter. Seven named reports sit behind one period selector now.
  reportCatalogue: () => api.get('/accounts/reports/catalogue'),
  reportOverview: ({ period, anchor } = {}) =>
    api.get(`/accounts/reports/overview${reportQs({ period, anchor })}`),
  report: (id, { period, anchor, granularity } = {}) =>
    api.get(`/accounts/reports/${id}${reportQs({ period, anchor, granularity })}`),
  exportReport: (id, { period, anchor, format, granularity } = {}) =>
    api.get(`/accounts/reports/${id}/export${reportQs({ period, anchor, format, granularity })}`),
  // F-10 Notifications (docs/users/06 §3.9). The old pair was
  // `notifications()` and `broadcast()` only: an unfiltered top-50 of every type
  // the platform writes, and one read control that marked ALL of them. The inbox
  // is now filtered and paged, a single message can be read, and sending has a
  // history.
  notificationCatalogue: () => api.get('/accounts/notifications/catalogue'),
  notificationAlerts: () => api.get('/accounts/notifications/alerts'),
  notifications: ({ category, unreadOnly, take, skip } = {}) =>
    api.get(`/accounts/notifications${reportQs({ category, unreadOnly, take, skip })}`),
  /** Read ONE message. Scoped server-side to the recipient. */
  markNotificationRead: (id) => api.post(`/accounts/notifications/${id}/read`),
  /** Read or un-read, so the row menu can undo a tap. */
  setNotificationRead: (id, read) => api.put(`/accounts/notifications/${id}/read`, { read }),
  markAllRead: () => api.post('/accounts/notifications/read-all'),
  broadcasts: ({ take } = {}) => api.get(`/accounts/notifications/broadcasts${reportQs({ take })}`),
  // Moved from `/accounts/broadcasts`: it now sits beside the send history.
  broadcast: (payload) => api.post('/accounts/notifications/broadcasts', payload),
  profile: () => api.get('/accounts/profile'),
};
