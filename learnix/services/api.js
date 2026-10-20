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

async function request(method, path, body, extraHeaders) {
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
        ...(extraHeaders || {}),
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
  // Extra headers, for the rare call that must send a credential the `request`
  // helper has no other slot for — currently only `authApi.sessions`, which marks
  // which row is "this device". A header keeps that token out of access logs, browser
  // history and `Referer`, all of which a query string leaks into.
  withHeaders: (method, path, body, headers) => request(method, path, body, headers),
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

  // Self-service profile + privacy.
//
// The `myProfile` / `updateMyProfile` keys live in the AL-08 block further down, pointing
// at `/alumni/profile`. An earlier AL-02 pair under these same names pointed at
// `/alumni/me` (the privacy-applied read); it had no callers and was removed rather than
// left shadowed, because two same-named keys in one object literal resolve last-wins.

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

  // ── Donations & fundraising (AL-04) ──
  // `donations` is the ledger: filters are campaignId / fund / status / year /
  // `mine`. There is deliberately no userId filter — "my giving" is resolved from
  // the session on the server, so a client cannot ask to read someone else's.
  donations: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/donations${qs ? `?${qs}` : ''}`);
  },
  donation: (id) => api.get(`/alumni/donations/${id}`),
  // An alumnus commits to a gift. Returns a PLEDGE — the office confirms the
  // money, and only then is a receipt issued.
  pledgeDonation: (payload) => api.post('/alumni/donations', payload),
  recordDonation: (id) => api.post(`/alumni/donations/${id}/record`),
  donationReceipt: (id) => api.get(`/alumni/donations/${id}/receipt`),
  // Narrow by design: confirms a receipt number is real, returns amount and
  // validity, never a donor name.
  verifyReceipt: (receiptNo) =>
    api.get(`/alumni/donations/receipts/verify?receiptNo=${encodeURIComponent(receiptNo)}`),

  campaigns: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/donations/campaigns${qs ? `?${qs}` : ''}`);
  },
  campaign: (id) => api.get(`/alumni/donations/campaigns/${id}`),
  createCampaign: (payload) => api.post('/alumni/donations/campaigns', payload),
  updateCampaign: (id, payload) => api.patch(`/alumni/donations/campaigns/${id}`, payload),

  recurringGifts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/alumni/donations/recurring${qs ? `?${qs}` : ''}`);
  },
  createRecurringGift: (payload) => api.post('/alumni/donations/recurring', payload),
  setRecurringGiftStatus: (id, payload) => api.post(`/alumni/donations/recurring/${id}/status`, payload),
  // Office action. There is no scheduler in this app, so this is what actually
  // turns due mandates into donations — safe to press twice.
  chargeDueRecurringGifts: () => api.post('/alumni/donations/recurring/charge-due'),
  // Derived entirely from the caller's own gifts on the server. Declared before
  // `donation(id)` in spirit only — they are different paths — but named to make
  // it obvious this is "my" impact, not the programme's.
  donationsImpact: () => api.get('/alumni/donations/impact'),

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

  // -- S-12 Notifications (docs/users/12 §3.7) ---------------------------------
  // Replaces the three old methods below. The endpoint moved from an inline handler
  // in alumni.routes.ts to the notifications sub-router, so the paths grew
  // `/broadcasts` under `/notifications` and the inbox became filterable.
  //
  // `notifications()` now takes a query. `category` is a category id (not a raw
  // `Notification.type`) because the server owns that mapping and the app has no
  // business knowing which types a category happens to own.
  notifications: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false),
    ).toString();
    return api.get(`/alumni/notifications${qs ? `?${qs}` : ''}`);
  },
  // Category list with live unread counts, plus the rule metadata (icons, colours,
  // blurbs) so the app does not keep a second copy of the vocabulary.
  notificationCategories: () => api.get('/alumni/notifications/categories'),
  notification: (id) => api.get(`/alumni/notifications/${id}`),
  // Single-row read state. Previously impossible: tapping a row could only trigger
  // read-all, which marked messages as seen without anyone having seen them.
  setNotificationRead: (id, read) => api.patch(`/alumni/notifications/${id}/read`, { read }),
  markAllRead: () => api.post('/alumni/notifications/read-all'),

  // Preferences. Real rows, not local state — the profile screen used to show three
  // switches that saved nothing.
  notificationPreferences: () => api.get('/alumni/notifications/preferences'),
  updateNotificationPreferences: (patch) => api.patch('/alumni/notifications/preferences', patch),

  // Office only. `audience` is `{ kind, value? , chapterId? }` — the old contract
  // pinned it to the literals 'BATCH_2024' and 'CITY_BENGALURU', so a graduate from
  // any other year or city was unreachable by any broadcast.
  broadcast: (payload) => api.post('/alumni/notifications/broadcasts', payload),
  broadcastPreview: (audience) => api.post('/alumni/notifications/broadcasts/preview', { audience }),
  // The real year/city/chapter lists, so the composer can target anyone rather than
  // the two literals ('BATCH_2024', 'CITY_BENGALURU') the old contract allowed.
  broadcastOptions: () => api.get('/alumni/notifications/broadcasts/options'),
  broadcastHistory: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return api.get(`/alumni/notifications/broadcasts${qs ? `?${qs}` : ''}`);
  },
  // Reminder sweep. `dryRun: true` reports what would be written without writing it.
  runReminderSweep: (dryRun = false) => api.post('/alumni/notifications/reminders/sweep', { dryRun: String(dryRun) }),

  // -- AL-08 profile -------------------------------------------------------------
  // `myProfile()` is the UNREDACTED self view. It is deliberately not the older
  // `/alumni/me` read, which applies the OWNER'S own privacy settings: that is right
  // for a directory view and wrong for an edit screen, because without the distinction
  // "hide my email" is indistinguishable from "delete my email" — you could not see the
  // value you had hidden.
  //
  // The AL-02 pair that used to sit under these same two keys (`/alumni/me`) is
  // removed rather than kept as an alias: duplicate keys in one object literal silently
  // resolve last-wins, so the AL-08 methods were quietly replacing them while both
  // remained readable in the file. Nothing called the `/alumni/me` pair.
  myProfile: () => api.get('/alumni/profile'),
  updateMyProfile: (payload) => api.put('/alumni/profile', payload),

  // Career milestones. `toMonth` is YYYY-MM; omitting it (or null) means "current".
  career: () => api.get('/alumni/profile/career'),
  addCareerEntry: (payload) => api.post('/alumni/profile/career', payload),
  updateCareerEntry: (id, payload) => api.put(`/alumni/profile/career/${id}`, payload),
  setCareerHighlight: (id, isHighlight) =>
    api.patch(`/alumni/profile/career/${id}/highlight`, { isHighlight }),
  removeCareerEntry: (id) => api.delete(`/alumni/profile/career/${id}`),

  // Achievements. Self-declared; only the office can verify.
  achievements: () => api.get('/alumni/profile/achievements'),
  addAchievement: (payload) => api.post('/alumni/profile/achievements', payload),
  updateAchievement: (id, payload) => api.put(`/alumni/profile/achievements/${id}`, payload),
  removeAchievement: (id) => api.delete(`/alumni/profile/achievements/${id}`),
  // Office only: the queue of unverified claims, oldest first.
  achievementQueue: (limit) =>
    api.get(`/alumni/profile/achievements/queue${limit ? `?limit=${limit}` : ''}`),
  verifyAchievement: (id, verified) =>
    api.post(`/alumni/profile/achievements/${id}/verify`, { verified }),
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
  // Rooms. Filtered and paged on the SERVER, not in JS: the old screen fetched every room in the
  // institution and then `.filter()`ed, so a search term could only ever match rows the browser
  // already held. `q` covers room number, block name, bed label and occupant name — a warden
  // reading off a physical door has "A-101-2" in their hand, not "101".
  rooms: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/rooms${qs ? `?${qs}` : ''}`);
  },
  // Keyed by room ID, not room number. `Room.number` is unique only WITHIN a block, so two
  // blocks may hold the same number — resolving by number would serve the wrong room.
  roomDetail: (roomId) => api.get(`/hostel/rooms/${roomId}`),
  // Who has stayed in this room and when they moved in and out.
  roomHistory: (roomId) => api.get(`/hostel/rooms/${roomId}/history`),
  allocate: (rollNo, roomNumber) => api.post('/hostel/allocations', { rollNo, roomNumber }),
  vacateBed: (bedId) => api.post(`/hostel/beds/${bedId}/vacate`),
  transferBed: (bedId, toRoomNumber) => api.post(`/hostel/beds/${bedId}/transfer`, { toRoomNumber }),
  // Withdraw a bed for maintenance, or return it to service. A note is required on the way IN —
  // "under maintenance" on its own is not actionable, since a warden cannot tell a broken fan
  // from an electrical job.
  setBedMaintenance: (bedId, inMaintenance, note) =>
    api.post(`/hostel/beds/${bedId}/maintenance`, { inMaintenance, note: note ?? null }),
  // Residents. The directory is filtered on the SERVER, not in JS: the old client fetched
  // every resident and then `.filter()`ed, so the search box could only ever match rows the
  // browser already happened to have. `q` covers name, roll number, room and bed, which is
  // whichever of those the warden happens to know. Empty values are dropped rather than sent
  // as `?q=`, matching `alumniApi.directory`.
  residents: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/residents${qs ? `?${qs}` : ''}`);
  },
  // Block chips are built from what exists rather than hardcoded "Block A/B/C", so a fourth
  // block shows up on its own instead of rendering in a fallback colour.
  residentFacets: () => api.get('/hostel/residents/facets'),
  residentDetail: (studentProfileId) => api.get(`/hostel/residents/${studentProfileId}`),
  // Residential move-in/move-out timeline. The schema already recorded fromDate/toDate on
  // every allocation; this is the reader for it.
  residentHistory: (studentProfileId) => api.get(`/hostel/residents/${studentProfileId}/history`),
  // Leave/absence, derived from the existing gate-pass records.
  residentAbsence: (studentProfileId) => api.get(`/hostel/residents/${studentProfileId}/absence`),
  residentContacts: (studentProfileId) => api.get(`/hostel/residents/${studentProfileId}/contacts`),
  // One entry point for create and edit. `isPrimary` is enforced server-side: promoting one
  // contact demotes its sibling of the same kind, because guardian and emergency primaries
  // are independent of each other.
  saveResidentContact: (studentProfileId, payload) =>
    payload.id
      ? api.put(`/hostel/residents/${studentProfileId}/contacts/${payload.id}`, payload)
      : api.post(`/hostel/residents/${studentProfileId}/contacts`, payload),
  deleteResidentContact: (studentProfileId, contactId) =>
    api.delete(`/hostel/residents/${studentProfileId}/contacts/${contactId}`),
  collectRent: (dueId, method) => api.post(`/hostel/rent/${dueId}/collect`, { method }),
  // ── Mess (H-05) ─────────────────────────────────────────────────────────────────
  // Every screen reads its numbers from here. There is no local fallback data anywhere in the mess
  // pages: the previous version of this screen was 386 lines of module-level constants
  // (1,182 / 1,248 served, a four-star "weekly rating", a ₹3.4L budget) that had no relationship to
  // the database, and the three methods below were never called by any screen.
  mess: () => api.get('/hostel/mess'),
  messMenu: () => api.get('/hostel/mess/menu'),
  updateMenu: (dayOfWeek, meal, items, isVeg = true) =>
    api.put('/hostel/mess/menu', { dayOfWeek, meal, items, isVeg }),
  /** The roll: every resident, who ate, and the participation rate for that meal. */
  messRoll: (meal, date) => {
    const qs = new URLSearchParams(
      Object.entries({ meal, date }).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/mess/roll${qs ? `?${qs}` : ''}`);
  },
  /** Authoritative mark. Replaces the whole meal, so it is safe to retry or re-mark. */
  markMessAttendance: (meal, presentStudentProfileIds, date) =>
    api.post('/hostel/mess/attendance', { meal, presentStudentProfileIds, date }),
  messAttendanceLog: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/mess/attendance${qs ? `?${qs}` : ''}`);
  },
  messAbsent: (meal, date) => {
    const qs = new URLSearchParams(
      Object.entries({ meal, date }).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/mess/absent${qs ? `?${qs}` : ''}`);
  },
  messAnalytics: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/mess/analytics${qs ? `?${qs}` : ''}`);
  },
  messFeedback: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/mess/feedback${qs ? `?${qs}` : ''}`);
  },
  sendMessSurvey: (meal) => api.post('/hostel/mess/survey', meal ? { meal } : {}),
  // Mess money. These two are behind `hostel.mess.expenses` on the server, so a role without that
  // grant gets a 403 rather than empty data — the screen surfaces that message instead of showing
  // a misleading ₹0.
  messExpenses: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/mess/expenses${qs ? `?${qs}` : ''}`);
  },
  raiseMessExpense: (payload) => api.post('/hostel/mess/expenses', payload),
  // Gate passes. Filtered and paged on the SERVER, sorted there by URGENCY rather than by
  // creation date — an overdue return and an emergency request come first, because that is the
  // work order for someone answering a gate.
  gatePasses: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/gate-passes${qs ? `?${qs}` : ''}`);
  },
  gatePass: (id) => api.get(`/hostel/gate-passes/${id}`),
  // No `overdueGatePasses` helper. `/hostel/gate-passes/overdue` exists as an endpoint, but the
  // inbox gets the overdue COUNT from `stats.overdue` and the overdue LIST from
  // `gatePasses({ needsAction: 'true' })`. A third way to ask the same question, called by
  // nothing, is just surface area.
  // `verified` is an explicit claim that the student's ID was checked, and it is NOT implied by
  // approving. The server defaults it to false, so a pass can be approved without identity
  // having been confirmed — and the inbox says so.
  gatePassDecide: (id, decision, opts = {}) =>
    api.post(`/hostel/gate-passes/${id}/decide`, {
      decision,
      verified: opts.verified === true,
      note: opts.note ?? null,
    }),
  // Recording the gate. `at` lets a warden correct a mis-keyed time.
  gatePassExit: (id, at) => api.post(`/hostel/gate-passes/${id}/exit`, { at: at ?? null }),
  gatePassReturn: (id, at) => api.post(`/hostel/gate-passes/${id}/return`, { at: at ?? null }),
  // ---- Complaints (H-07, docs/users/08-hostel.md §3.7) --------------------------
  //
  // Filtered and paged ON THE SERVER, like `rooms` and `residents` above: the derived fields —
  // `escalated`, `priority`, `hoursToEscalation` — depend on the stored `createdAt` and the live
  // policy, so filtering them client-side would mean fetching every complaint to compute a badge the
  // server already computed. Returns `{ complaints, stats, facets, pagination }`, never a bare array,
  // so the queue header can render counts and chips without a second request.
  //
  // `category` accepts either a raw category or a GROUP name ('maintenance' shows plumbing and
  // electrical together), and `status: 'OPEN_LIKE'` is the "needs attention" bucket — both server-side.
  // ---- Notifications (the hostel's own eight categories) ------------------------
  //
  // These are the WARDEN's inbox, which reads the hostel's vocabulary — not the shared finance
  // one. A chip that could show "a fee is due" next to "the water is off in Block B" would mean
  // nothing, so the hostel owns its categories. A resident reads a different inbox (the shared
  // student one), which merges both.
  //
  // Filtered and paged on the SERVER. The categories are eight fixed vocabularies, so client-side
  // filtering would be harmless — but the counts and the "important" flag come off the response, and
  // a screen that re-derived them would disagree with the API.
  notifications: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/notifications${qs ? `?${qs}` : ''}`);
  },
  // The eight categories, with the labels, icons and colours the screen renders from. Read from the
  // server so the client does not hold a second copy of the vocabulary that can drift.
  notificationCatalogue: () => api.get('/hostel/notifications/catalogue'),
  markAllNotificationsRead: () => api.post('/hostel/notifications/read-all'),
  setNotificationRead: (id, read) => api.patch(`/hostel/notifications/${id}/read`, { read }),
  // Composing a notice. `category` is one of the COMPOSABLE ones (ANNOUNCEMENT, MAINTENANCE,
  // EMERGENCY) — the other five are facts the system reports, and a warden who could publish a
  // gate-pass approval could forge one. `audience` is an OBJECT, so a block is named by its id and a
  // new block needs no change here.
  broadcastNotification: (payload) => api.post('/hostel/notifications/broadcasts', payload),
  // On-demand, not scheduled: the platform schedules nothing, so "who is overdue" is answered by
  // asking, and the answer is derived from live rows.
  sweepLateReturns: () => api.post('/hostel/notifications/late-returns/sweep'),
  // ---- Profile (the warden's own) ---------------------------------------------
  // Six questions, six endpoints, because they change at different rates: the profile is read
  // once a session, the permissions when somebody is promoted, the preferences when a mute is
  // toggled, and the activity on every page of the history.
  profile: () => api.get('/hostel/profile'),
  profilePermissions: () => api.get('/hostel/profile/permissions'),
  profileNotificationPreferences: () => api.get('/hostel/profile/notification-preferences'),
  // The mute is written THROUGH. A toggle held only in local state is forgotten on unmount, and a
  // person who believes they turned something off is worse off than one who never could.
  saveProfileNotificationPreference: (payload) =>
    api.patch('/hostel/profile/notification-preferences', payload),
  profileActivity: () => api.get('/hostel/profile/activity'),
  complaints: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/complaints${qs ? `?${qs}` : ''}`);
  },
  complaint: (id) => api.get(`/hostel/complaints/${id}`),
  // The thresholds escalation is derived from, read by the warden's policy editor. Written as a
  // whole object rather than field by field: the service clamps and sorts it, so sending one key
  // would silently reset the others.
  complaintPolicy: () => api.get('/hostel/complaints/policy'),
  saveComplaintPolicy: (policy) => api.put('/hostel/complaints/policy', policy),
  // Who may take this category. Returns every staff member with an `eligible` flag and a `reason`,
  // so the picker can show an ineligible person greyed out with "wrong trade" rather than hiding
  // them — a warden who does not know Suresh is the plumber needs to see WHY he can be picked.
  complaintAssignees: (category) =>
    api.get(`/hostel/complaints/assignees${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  // Filing ON SOMEONE'S BEHALF — a phone call, or a resident at the desk. `studentProfileId` is
  // REQUIRED here and is deliberately absent from the resident's own method below.
  createComplaint: (payload) => api.post('/hostel/complaints', payload),
  // `assigneeUserId` is REQUIRED. The previous version took no body at all and assigned the
  // complaint to whoever called the route, which made the warden's screen promise "assign to staff"
  // while quietly assigning to the warden.
  assignComplaint: (id, assigneeUserId, note) =>
    api.post(`/hostel/complaints/${id}/assign`, { assigneeUserId, note: note ?? undefined }),
  // `resolutionNote` is REQUIRED (min 5 chars). A complaint closed without one is how something gets
  // closed unfixed, so the server refuses it rather than storing a blank.
  resolveComplaint: (id, resolutionNote) =>
    api.post(`/hostel/complaints/${id}/resolve`, { resolutionNote }),
  addComplaintNote: (id, note) => api.post(`/hostel/complaints/${id}/notes`, { note }),
  // The warden's manual reopen, for a complaint closed in error. A resident's poor rating reopens
  // through `studentApi.submitComplaintFeedback` instead — same state change, different door.
  reopenComplaint: (id, reason) => api.post(`/hostel/complaints/${id}/reopen`, { reason: reason ?? undefined }),
  // ---- Visitors -------------------------------------------------------------------
  // Query strings are built inline, matching `gatePasses` and the alumni directory, rather than
  // through a shared helper that does not exist in this file. `undefined`/`null`/`''` are filtered
  // out so an empty search box does not become `?q=`.
  //
  // Every visitor list call passes a plain object and gets back
  // `{ passes, stats, facets, pagination }` - never a bare array - so the screen can render stats
  // and status facets without a second request.
  visitors: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/visitors${qs ? `?${qs}` : ''}`);
  },
  visitor: (id) => api.get(`/hostel/visitors/${id}`),
  // Registers a walk-in. Always lands in `PENDING`: the warden confirms separately. There is
  // deliberately no `checkInVisitor` any more - a direct check-in created an on-campus row with no
  // authorisation and no planned window, which is what the approval workflow exists to prevent.
  registerVisitor: (payload) => api.post('/hostel/visitors', payload),
  approveVisitor: (id, note) => api.post(`/hostel/visitors/${id}/approve`, { note }),
  rejectVisitor: (id, note) => api.post(`/hostel/visitors/${id}/reject`, { note }),
  // `at` corrects a mis-keyed gate time; omit it to stamp "now".
  visitorEntry: (id, at) => api.post(`/hostel/visitors/${id}/entry`, { at }),
  visitorExit: (id, at) => api.post(`/hostel/visitors/${id}/exit`, { at }),
  frequentVisitors: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/hostel/visitors/frequent${qs ? `?${qs}` : ''}`);
  },
  barredVisitors: () => api.get('/hostel/visitors/barred'),
  barVisitor: (payload) => api.post('/hostel/visitors/barred', payload),
  unbarVisitor: (id) => api.delete(`/hostel/visitors/barred/${id}`),
  visitorPolicy: () => api.get('/hostel/visitors/policy'),
  updateVisitorPolicy: (policy) => api.put('/hostel/visitors/policy', policy),
  // `notifications`, `markAllRead`, `broadcast` and the old `profile` used to live here. They are gone:
  //   · `notifications` collided with the new one above, and a duplicate key in an object literal
  //     means the LAST one wins — so the flat, unpaged version would have silently replaced it.
  //   · `markAllRead` marked EVERY notification read, including the warden's finance mail, which is
  //     not a claim "I read the hostel notices" is entitled to make.
  //   · `broadcast` posted to `/hostel/broadcasts`, a route that no longer exists — the composer
  //     lives at `/hostel/notifications/broadcasts` and takes an object audience and a category.
  //   · `profile` collided with the new one above. The two pointed at the same path, so nothing
  //     broke — but a duplicate key is a silent trap, and the one that survives is whichever is
  //     written LAST, not the one anybody meant.
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

  // Change password. The refresh token is sent so the server can keep THIS device
  // signed in while revoking every other one - without it the caller is logged out of
  // the device they just used, which is the opposite of what someone changing a
  // password after suspecting a compromise wants.
  changePassword: async (currentPassword, newPassword) => {
    const refreshToken = await AsyncStorage.getItem('learnix.refreshToken');
    return api.post('/auth/change-password', { currentPassword, newPassword, refreshToken });
  },

  // Active sessions. The raw refresh token is sent ONLY so the server can mark which row
  // is "this device" — it is never stored by the response. It travels in a header rather
  // than `?refreshToken=`: a query string lands in access logs, browser history, proxy
  // logs and the next `Referer`, and this is the one credential that can mint fresh
  // access tokens. The server still accepts the query form for older installed builds.
  sessions: async () => {
    const refreshToken = await AsyncStorage.getItem('learnix.refreshToken');
    return api.withHeaders(
      'GET',
      '/auth/sessions',
      undefined,
      refreshToken ? { 'X-Refresh-Token': refreshToken } : undefined,
    );
  },

  // Sign out of every OTHER device. Without a token the server revokes everything
  // including the current session - documented fail-safe, not an oversight.
  revokeAllSessions: async () => {
    const refreshToken = await AsyncStorage.getItem('learnix.refreshToken');
    return api.post('/auth/revoke-all-sessions', { refreshToken });
  },
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
  // Gate passes — the STUDENT half of the flow (docs/users/08-hostel.md §3.5). The warden half
  // is on `hostelApi`; both are served by the same lifecycle rules, so the two lists cannot
  // disagree about whether a student is out.
  //
  // `isEmergency` is a priority flag. It never bypasses approval, and it is NOT the same as
  // "urgent" in the UI sense — a student ticking it does not self-authorise a gate exit.
  myGatePasses: () => api.get('/student/gate-passes'),
  requestGatePass: (payload) => api.post('/student/gate-passes', payload),
  // Withdrawal, allowed only while the pass is still PENDING. Cancelling an approved pass is a
  // RETURN, and has to go through the gate so the time is recorded.
  cancelGatePass: (id) => api.post(`/student/gate-passes/${id}/cancel`),
  // ---- Complaints (the resident's own) ----------------------------------------
  // Identity comes from the token: `myComplaintSchema` has NO `studentProfileId`, so a resident
  // cannot file as somebody else even by editing the request. That is why this is a separate object
  // from `hostelApi.createComplaint` rather than the same method behind a flag.
  //
  // The list carries the same derived fields as the warden's (priority, escalated,
  // hoursToEscalation) so the resident can see why their complaint is flagged, rather than being
  // told "submitted" and left to guess.
  myComplaints: () => api.get('/student/complaints'),
  // `severity` is what the RESIDENT thinks. For SECURITY the server applies a MEDIUM floor and
  // returns `severityRaised`, so the screen can say "raised to Medium because of the security
  // policy" instead of silently overriding what they picked.
  reportComplaint: (payload) => api.post('/student/complaints', payload),
  // Following up on an open complaint. Not a comment thread — a dated entry in the timeline the
  // support worker and the warden both read.
  addComplaintNote: (id, note) => api.post(`/student/complaints/${id}/notes`, { note }),
  // Only legal on a RESOLVED complaint, and only by the resident who filed it. `rating` at or below
  // the policy threshold (default 3) REOPENS it rather than being recorded as a bad score — a
  // satisfaction number that swallows an unresolved repair is the failure this closes.
  submitComplaintFeedback: (id, rating, comment) =>
    api.post(`/student/complaints/${id}/feedback`, { rating, comment: comment ?? undefined }),

  // ---- Mess: the resident's side of the kitchen ---------------------------------
  // Read the menu and rate a meal. Nothing else — there is deliberately no student-side attendance
  // write, because the roll is called by mess staff and a self-reported count would make the
  // kitchen's provisioning numbers a guess.
  //
  // `dayOffset` is an integer, NOT a date string. The screen steps back a day to review last night's
  // dinner; building that date on the client would mean getting local midnight and DST right there,
  // and every way of getting it wrong asks the server about the wrong day.
  myMess: (dayOffset = 0) => {
    const qs = new URLSearchParams({ dayOffset: String(dayOffset) }).toString();
    return api.get(`/student/mess?${qs}`);
  },
  // An UPSERT, not a create: re-rating the same meal replaces the earlier rating. The screen
  // therefore shows "you rated this 3" with an Edit affordance rather than an empty form.
  rateMeal: (payload) => api.post('/student/mess/feedback', payload),

  // ---- Visitors: the resident's side of a visit --------------------------------
  // Returns `{ expected, history, policy }` - split rather than filtered, because "who is coming"
  // and "who came" are different questions and a resident does not want their expected visitors
  // buried under last month's log. `policy` travels with it so the screen can explain a refusal
  // ("this hostel only allows day visits") instead of just offering the form and failing.
  myVisitors: () => api.get('/student/visitors'),
  // The resident is NOT sent a `visitingStudentProfileId` and cannot name another resident: the
  // server derives both from the authenticated user. Sending it here would be a field the client
  // controls but the server ignores, which is worse than not sending it.
  authoriseVisitor: (payload) => api.post('/student/visitors', payload),
  // Withdrawal, allowed only while the visitor is still awaiting the warden. Once confirmed,
  // cancelling is a check-out, and it has to go through the gate so the time is recorded.
  cancelVisitor: (id) => api.post(`/student/visitors/${id}/cancel`),
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
  // The resident's inbox: their bills AND their hostel notices, in one list. The two vocabularies
  // are merged SERVER-side, so a hostel announcement is labelled "Hostel announcement" with its own
  // icon and colour rather than showing up as a raw `HOSTEL_COMPLAINT` type string.
  notifications: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/student/notifications${qs ? `?${qs}` : ''}`);
  },
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

/**
 * Support-staff complaints — the technician's and security officer's side (docs/users/08-hostel.md §3.7).
 *
 * ITS OWN BASE PATH, and that is the whole point. There is deliberately no `/hostel/complaints`
 * prefix here: the hostel router is gated on `HOSTEL`/`ADMIN`, and putting these calls under it would
 * require widening that gate to `MAINTENANCE`, which hands a plumber the room-allocation table, every
 * resident profile, the gate-pass register and the visitor register. Those are all about residents'
 * MOVEMENTS — precisely what a technician has no business browsing. The server mounts this surface at
 * `/staff-complaints` for the same reason this object is separate.
 *
 * Consequence worth knowing before writing a screen against it: a technician CANNOT triage. There is
 * no assign method here, because deciding who gets the job is the warden's call. The inbox is
 * "assigned to me, plus unassigned work in a category group my designation covers".
 */
export const staffComplaintsApi = {
  // Returns `{ me, complaints, stats }`. `me.groups` is what the server decided this worker can see,
  // derived from their designation — so the screen should NOT filter the returned list a second time
  // on its own guess about categories, or it will hide rows the server thinks they should see.
  inbox: () => api.get('/staff-complaints/complaints'),
  // Closing the job. The server only accepts this from the ASSIGNEE, a warden or an admin — enforced
  // against the data, not just by role, so one technician cannot close a colleague's work.
  resolve: (id, resolutionNote) => api.post(`/staff-complaints/complaints/${id}/resolve`, { resolutionNote }),
  addNote: (id, note) => api.post(`/staff-complaints/complaints/${id}/notes`, { note }),
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
  // ── X-02 Timetable (docs/users/05 §3.9) ──────────────────────────────
  //
  // These replace six methods that all pointed at endpoints this build
  // REMOVED. `GET /examcell/timetable`, `POST /examcell/timetable`,
  // `POST /examcell/timetable/:examId/slots`,
  // `POST /examcell/slots/:id/reschedule`,
  // `GET  /examcell/slots/:id/allocations` and
  // `POST /examcell/slots/:id/allocations` are gone — not renamed, GONE. The
  // old screen called them and got a 404 for every one.
  //
  // Note two deliberate changes of SHAPE, not just of path:
  //   · `allocateVenue` sends `venueId`, NOT `roomId`. `Room` in the schema is a
  //     HOSTEL room (capacity 2, hanging off a block) and `Venue` is the
  //     institution-wide room master with real capacity.
  //   · `rescheduleTimetableSlot` is a PATCH. A reschedule is an UPDATE of the
  //     slot, so it can carry a partial change; the old route was a POST shaped
  //     like a command, which made that impossible.
  timetableCatalogue: () => api.get('/examcell/timetable/catalogue'),
  timetableOverview: () => api.get('/examcell/timetable/overview'),
  timetableBlock: (block, examId) =>
    api.get(`/examcell/timetable/blocks/${block}${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`),
  timetableStudents: (studentProfileId) =>
    api.get(`/examcell/timetable/students/${encodeURIComponent(studentProfileId)}`),
  createTimetableExam: (payload) => api.post('/examcell/timetable/exams', payload),
  updateTimetableExam: (id, payload) => api.patch(`/examcell/timetable/exams/${id}`, payload),
  publishTimetableExam: (id) => api.post(`/examcell/timetable/exams/${id}/publish`),
  addTimetableSlot: (examId, payload) => api.post(`/examcell/timetable/exams/${examId}/slots`, payload),
  rescheduleTimetableSlot: (id, payload) => api.patch(`/examcell/timetable/slots/${id}`, payload),
  deleteTimetableSlot: (id) => api.delete(`/examcell/timetable/slots/${id}`),
  completeTimetableSlot: (id) => api.post(`/examcell/timetable/slots/${id}/complete`),
  allocateVenue: (slotId, payload) => api.post(`/examcell/timetable/slots/${slotId}/venues`, payload),
  assignInvigilator: (allocationId, invigilatorUserId) =>
    api.put(`/examcell/timetable/allocations/${allocationId}/invigilator`, { invigilatorUserId }),

  // ── X-04 Hall tickets (docs/users/05 §3.5) ────────────────────────────
  //
  // Two methods used to live here — `GET /hall-tickets?examId=` and
  // `POST /hall-tickets/generate {examId}`. Both are GONE, not renamed: the
  // router superseded them. The old screen's exam picker additionally called
  // `examcellApi.exams()`, a method that has never existed on this API object
  // (it lives on the STUDENT api), so it threw before the first render.
  //
  // Everything now hangs off `/hall-tickets`, and the catalogue carries the
  // exam list precisely so no screen needs a second call to build a picker.
  hallTicketCatalogue: () => api.get('/examcell/hall-tickets/catalogue'),
  hallTicketOverview: () => api.get('/examcell/hall-tickets/overview'),
  hallTicketBlock: (block, examId) =>
    api.get(`/examcell/hall-tickets/blocks/${encodeURIComponent(block)}${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`),
  generateHallTicketBulk: (examId) =>
    api.post(`/examcell/hall-tickets/exams/${encodeURIComponent(examId)}/generate`),
  setHallTicketPublication: (examId, action) =>
    api.put(`/examcell/hall-tickets/exams/${encodeURIComponent(examId)}/publication`, { action }),
  generateHallTicket: (slotId, studentProfileId) =>
    api.post(
      `/examcell/hall-tickets/slots/${encodeURIComponent(slotId)}/students/${encodeURIComponent(studentProfileId)}`,
    ),
  createHallTicketRequest: (payload) => api.post('/examcell/hall-tickets/requests', payload),
  decideHallTicketRequest: (id, payload) => api.patch(`/examcell/hall-tickets/requests/${encodeURIComponent(id)}`, payload),
  completeHallTicketRequest: (id) => api.post(`/examcell/hall-tickets/requests/${encodeURIComponent(id)}/complete`),
  markHallTicketDownloaded: (id) => api.post(`/examcell/hall-tickets/${encodeURIComponent(id)}/download`),
  // ── X-05 Evaluations (docs/users/05 §3.3) ───────────────────────────
  //
  // Three methods used to live here — `GET /examcell/evaluations`,
  // `POST /examcell/evaluations/:id/assign` and `…/complete`. All three
  // endpoints are GONE, not renamed: the assign route accepted any TEACHER
  // id with no institution check, and `complete` force-marked every paper
  // graded without reading one. The new surface reads blocks and derives
  // completion from the rows.
  evaluationCatalogue: () => api.get('/examcell/evaluations/catalogue'),
  evaluationOverview: () => api.get('/examcell/evaluations/overview'),
  evaluationBlock: (block, examId) =>
    api.get(`/examcell/evaluations/blocks/${encodeURIComponent(block)}${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`),
  evaluationPublicationGate: (slotId) =>
    api.get(`/examcell/evaluations/slots/${encodeURIComponent(slotId)}/publication-gate`),
  receiveScripts: (evalId) => api.post(`/examcell/evaluations/${encodeURIComponent(evalId)}/scripts/receive`),
  moveScript: (paperId, status) =>
    api.post(`/examcell/evaluations/papers/${encodeURIComponent(paperId)}/script`, { status }),
  allocateEvaluator: (evalId, evaluatorUserId) =>
    api.post(`/examcell/evaluations/${encodeURIComponent(evalId)}/allocate`, { evaluatorUserId }),
  enterMarks: (paperId, internalMarks, externalMarks) =>
    api.post(`/examcell/evaluations/papers/${encodeURIComponent(paperId)}/marks`, { internalMarks, externalMarks }),
  setEvaluationDeadline: (examId, dueAt) =>
    api.post(`/examcell/evaluations/exams/${encodeURIComponent(examId)}/deadline`, { dueAt }),
  remindEvaluationDeadline: (examId) =>
    api.post(`/examcell/evaluations/exams/${encodeURIComponent(examId)}/deadline/remind`),
  requestModeration: (evalId) =>
    api.post(`/examcell/evaluations/${encodeURIComponent(evalId)}/moderation/request`),
  decideModeration: (evalId, decision, note) =>
    api.post(`/examcell/evaluations/${encodeURIComponent(evalId)}/moderation/decide`, { decision, note }),
  // ── X-06 Results (docs/users/05 §3.4) ────────────────────────────────
  //
  // Three methods used to live here — `GET /examcell/results`,
  // `POST /examcell/results {…, grade, isPass}` and
  // `POST /examcell/results/publish {examSlotId}`. All three are GONE, not
  // renamed: `enterResult` let the screen decide who passed (it accepted a
  // grade and a pass flag from the client), and publish skipped verification
  // and approval entirely. The replacement is a pipeline — consolidate,
  // verify, approve, publish — where grade/pass derive from marks server-side
  // and each move is a slot-scoped, parameterless POST.
  resultCatalogue: () => api.get('/examcell/results/catalogue'),
  resultOverview: () => api.get('/examcell/results/overview'),
  resultBlock: (block, examId) =>
    api.get(`/examcell/results/blocks/${encodeURIComponent(block)}${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`),
  resultMarksheet: (studentProfileId, examId) =>
    api.get(`/examcell/results/marksheets/${encodeURIComponent(studentProfileId)}?examId=${encodeURIComponent(examId)}`),
  resultExport: (examId, format) =>
    api.get(`/examcell/results/export?examId=${encodeURIComponent(examId)}${format ? `&format=${encodeURIComponent(format)}` : ''}`),
  consolidateResults: (slotId) => api.post(`/examcell/results/slots/${encodeURIComponent(slotId)}/consolidate`),
  verifyResults: (slotId) => api.post(`/examcell/results/slots/${encodeURIComponent(slotId)}/verify`),
  approveResults: (slotId) => api.post(`/examcell/results/slots/${encodeURIComponent(slotId)}/approve`),
  publishResults: (slotId) => api.post(`/examcell/results/slots/${encodeURIComponent(slotId)}/publish`),
  // Same path as before, richer body: COMPLETED carries `revisedMarks` (the
  // new marks, bounded against the result's own maxMarks) and every decision
  // may carry a `note`. The screen passes the whole payload, never a bare
  // string the server has to guess the shape of.
  decideReevaluation: (id, payload) =>
    api.post(`/examcell/re-evaluations/${encodeURIComponent(id)}/decide`, payload),
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
  // F-11 Dashboard (docs/users/06 §3.11). The single `dashboard()` call is
  // replaced by a catalogue plus seven blocks: the old endpoint returned six
  // differently-shaped fragments and could not be extended without breaking
  // every screen that read it.
  //
  //   GET /accounts/dashboard/catalogue   the 7 blocks, 3 alert families,
  //                                       8 alert kinds, 4 quick actions,
  //                                       5 windows and every threshold
  //   GET /accounts/dashboard/overview    all seven blocks in ONE response
  //   GET /accounts/dashboard/alerts      the alerts, optionally one family
  //   GET /accounts/dashboard/actions     the quick actions with live counts
  //   GET /accounts/dashboard/blocks/:id  one block on its own
  //
  // `blocks/:id` is NOT `/dashboard/blocks`, so the literal paths above cannot be
  // read as a block id — but they are registered first on the server regardless,
  // for the same reason the notification literals are.
  dashboardCatalogue: () => api.get('/accounts/dashboard/catalogue'),
  /** All seven blocks at once: the hub shows them together, so one call is one moment. */
  dashboardOverview: () => api.get('/accounts/dashboard/overview'),
  /** `family` is UNUSUAL | OVERDUE | RECONCILIATION. A misspelled one is a 422, not an empty list. */
  dashboardAlerts: ({ family } = {}) =>
    api.get(`/accounts/dashboard/alerts${reportQs({ family })}`),
  /** Each action carries the live count of what it would act on. */
  dashboardActions: () => api.get('/accounts/dashboard/actions'),
  /** One block: COLLECTIONS | DUES | EXPENSES | PAYROLL | SCHOLARSHIPS | ALERTS | QUICK_ACTIONS. */
  dashboardBlock: (block) => api.get(`/accounts/dashboard/blocks/${encodeURIComponent(block)}`),
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
