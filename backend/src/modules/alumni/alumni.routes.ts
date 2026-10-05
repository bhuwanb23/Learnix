import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { prisma } from '../../db/prisma.js';
import { badRequest } from '../../lib/errors.js';
import { photoUpload } from './eventUpload.js';
import {
  directoryQuerySchema,
  idParamSchema,
  rsvpDecisionSchema,
  broadcastSchema,
  chapterQuerySchema,
  chapterMembersQuerySchema,
  connectionsQuerySchema,
  matchesQuerySchema,
  connectionRequestSchema,
  connectionActionSchema,
  chapterAnnouncementSchema,
  chapterEventSchema,
  updateMyProfileSchema,
  createChapterSchema,
  updateChapterSchema,
  assignOfficerSchema,
  resignOfficerSchema,
  createInitiativeSchema,
  updateInitiativeSchema,
  initiativesQuerySchema,
  officersQuerySchema,
  removeMemberSchema,
  addMemberSchema,
  eventQuerySchema,
  createEventSchema,
  updateEventSchema,
  scheduleItemSchema,
  scheduleItemDoneSchema,
  attendanceSchema,
  qrCheckInSchema,
  feedbackSchema,
  photoCaptionSchema,
  addAttendeeSchema,
  removeAttendeeSchema,
  mentorshipQuerySchema,
  mentorshipRequestSchema,
  mentorshipDecisionSchema,
  createPairSchema,
  officePairMentorSchema,
  completePairSchema,
  mentorshipSessionSchema,
  updateSessionSchema,
  cancelSessionSchema,
  goalSchema,

  updateGoalSchema,
  mentorshipFeedbackSchema,
} from './alumni.schemas.js';
import * as service from './alumni.service.js';
import * as directory from './directory.service.js';
import * as connections from './connections.service.js';
import * as chapterSvc from './chapters.service.js';
import * as leadership from './leadership.service.js';
import * as membership from './membership.service.js';
import * as eventSvc from './events.service.js';
import * as registration from './registration.service.js';
import * as feedback from './feedback.service.js';
import * as memories from './memories.service.js';
import * as mentorship from './mentorship.service.js';
import * as matching from './matching.service.js';
import * as sessions from './sessions.service.js';
import * as goals from './goals.service.js';
import * as mentorshipFeedback from './feedback.service.js';
import donationsRoutes from './donations/donations.routes.js';

// Alumni Relations module — mounted at /api/v1/alumni (docs/users/12 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/**
 * Builds the privacy-aware viewer context from the auth middleware.
 *
 * Three separate rules depend on "is this the Relations Office or a graduate?"
 * — contact-detail visibility, who may post a chapter announcement, and who may
 * send a connection request — so the distinction is resolved once per request
 * here rather than re-derived in each handler where it could drift.
 */
async function viewerFor(req: Request) {
  const institutionId = req.auth!.institutionId;
  const userId = req.auth!.userId;
  const office = await directory.officeUserIds(institutionId);
  return directory.resolveViewer(userId, institutionId, office);
}

router.use(auth, requireRole('ALUMNI', 'ADMIN'));

// AL-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    // userId is required: the unread badge is personal, not institution-wide.
    res.json({
      data: await service.getDashboard(req.auth!.institutionId, req.auth!.userId),
    });
  }),
);

// ── Directory (AL-02) ─────────────────────────────────────────
// The extended directory lives in directory.service.ts: filtering, facets and
// privacy-gated shaping. It supersedes the v1 `listDirectory` below for anything
// beyond name/batch search, but that function is kept so the mobile client does
// not break mid-release.
router.get(
  '/directory',
  validate(directoryQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await directory.listDirectory(viewer, req.query as never),
    });
  }),
);

router.get(
  '/directory/facets',
  wrap(async (req, res) => {
    res.json({ data: await directory.getFacets(req.auth!.institutionId) });
  }),
);

router.get(
  '/directory/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await directory.getProfileDetail(viewer, String(req.params.id)) });
  }),
);

// ── Self-service profile + privacy (AL-02) ───────────────────
router.get(
  '/me',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const profile = await directory.getMyProfile(viewer);
    // The chapters screen needs to know, on its own landing, whether this
    // graduate is already in a chapter and which one. Without this the Join
    // button has to be discovered by opening every chapter in turn.
    res.json({ data: { ...profile, chapterContext: await membership.getMyChapterContext(viewer) } });
  }),
);

router.put(
  '/me',
  validate(updateMyProfileSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await directory.updateMyProfile(viewer, req.body) });
  }),
);

// ── Professional networking (AL-02) ──────────────────────────
router.get(
  '/matches',
  validate(matchesQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await connections.getMatches(viewer, req.query as never) });
  }),
);

router.get(
  '/connections',
  validate(connectionsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const box = (req.query as { box?: 'incoming' | 'outgoing' | 'accepted' }).box ?? 'incoming';
    res.json({ data: await connections.listConnections(viewer, box) });
  }),
);

router.get(
  '/connections/stats',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await connections.getConnectionStats(viewer) });
  }),
);

router.post(
  '/connections',
  validate(connectionRequestSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const result = await connections.createConnection(viewer, req.body.profileId, req.body.message);
    res.status(201).json({ data: result });
  }),
);

router.post(
  '/connections/:id/:action',
  validate(idParamSchema, 'params'),
  validate(connectionActionSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const action = String(req.params.action) as 'accept' | 'decline' | 'cancel';
    const id = String(req.params.id);
    const data =
      action === 'cancel'
        ? await connections.cancelConnection(viewer, id)
        : await connections.respondToConnection(viewer, id, action);
    res.json({ data });
  }),
);

// ── Chapters (AL-06) ─────────────────────────────────────────
router.get(
  '/chapters',
  validate(chapterQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await chapterSvc.listChapterDirectory(req.auth!.institutionId, req.query as never),
    });
  }),
);

router.get(
  '/chapters/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    // Viewer-aware: the response carries `viewerContext` (member? officer? may
    // this viewer post or join?) so the UI never offers an action the backend
    // would reject.
    const viewer = await viewerFor(req);
    res.json({
      data: await chapterSvc.getChapterDetail(req.auth!.institutionId, String(req.params.id), viewer),
    });
  }),
);

// ── Chapter membership ──
router.post(
  '/chapters/:id/join',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await membership.joinChapter(viewer, String(req.params.id)) });
  }),
);

router.post(
  '/chapters/:id/leave',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await membership.leaveChapter(viewer, String(req.params.id)) });
  }),
);

router.post(
  '/chapters/:id/remove-member',
  validate(idParamSchema, 'params'),
  validate(removeMemberSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await membership.removeMember(
        viewer,
        String(req.params.id),
        req.body.profileId,
        req.body.reason,
      ),
    });
  }),
);

router.post(
  '/chapters/:id/members',
  validate(idParamSchema, 'params'),
  validate(addMemberSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({
      data: await membership.addMember(
        viewer,
        String(req.params.id),
        req.body.profileId,
        req.body.reason,
      ),
    });
  }),
);

// ── Chapter leadership ──
router.get(
  '/chapters/:id/officers',
  validate(idParamSchema, 'params'),
  validate(officersQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await leadership.listOfficers(
        req.auth!.institutionId,
        String(req.params.id),
        (req.query as { includePast?: boolean }).includePast === true,
      ),
    });
  }),
);

router.post(
  '/chapters/:id/officers',
  validate(idParamSchema, 'params'),
  validate(assignOfficerSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const result = await leadership.assignOfficer(viewer, String(req.params.id), req.body);
    res.status(201).json({ data: result });
  }),
);

router.post(
  '/chapters/:id/officers/:officerId/resign',
  validate(idParamSchema, 'params'),
  validate(resignOfficerSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await leadership.resignOfficer(
        viewer,
        String(req.params.id),
        String(req.params.officerId),
        req.body.reason,
      ),
    });
  }),
);

// ── Chapter initiatives ──
router.get(
  '/chapters/:id/initiatives',
  validate(idParamSchema, 'params'),
  validate(initiativesQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await leadership.listInitiatives(
        req.auth!.institutionId,
        String(req.params.id),
        (req.query as { status?: string }).status,
      ),
    });
  }),
);

router.post(
  '/chapters/:id/initiatives',
  validate(idParamSchema, 'params'),
  validate(createInitiativeSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const result = await leadership.createInitiative(viewer, String(req.params.id), req.body);
    res.status(201).json({ data: result });
  }),
);

router.patch(
  '/chapters/:id/initiatives/:initiativeId',
  validate(idParamSchema, 'params'),
  validate(updateInitiativeSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await leadership.updateInitiative(
        viewer,
        String(req.params.id),
        String(req.params.initiativeId),
        req.body,
      ),
    });
  }),
);

// ── Chapter performance ──
router.get(
  '/chapters/:id/performance',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await leadership.getChapterPerformance(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// ── Chapter administration (office) ──
router.post(
  '/chapters',
  validate(createChapterSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const result = await membership.createChapter(viewer, req.body);
    res.status(201).json({ data: result });
  }),
);

router.patch(
  '/chapters/:id',
  validate(idParamSchema, 'params'),
  validate(updateChapterSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await membership.updateChapter(viewer, String(req.params.id), req.body) });
  }),
);

router.get(
  '/chapters/:id/members',
  validate(idParamSchema, 'params'),
  validate(chapterMembersQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await chapterSvc.listChapterMembers(req.auth!.institutionId, String(req.params.id), req.query as never),
    });
  }),
);

router.get(
  '/chapters/:id/activity',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await chapterSvc.getChapterActivity(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/chapters/:id/announce',
  validate(idParamSchema, 'params'),
  validate(chapterAnnouncementSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const result = await chapterSvc.announceToChapter(viewer, String(req.params.id), req.body);
    res.status(201).json({ data: result });
  }),
);

router.post(
  '/chapters/:id/events',
  validate(idParamSchema, 'params'),
  validate(chapterEventSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const result = await chapterSvc.createChapterEvent(viewer, String(req.params.id), req.body as never);
    res.status(201).json({ data: result });
  }),
);

router.post(
  '/directory/:id/invite',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.inviteAlumni(req.auth!.institutionId, String(req.params.id), req.auth!.userId),
    });
  }),
);

// The office pairing shortcut, kept at its old path so the existing client keeps
// working. It now REQUIRES a mentee: the previous version silently paired the
// mentor with "the first active student profile in the institution", which meant
// the Requests tab could only ever be filled by an accident of database ordering.
router.post(
  '/directory/:id/add-mentor',
  validate(idParamSchema, 'params'),
  validate(officePairMentorSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const profile = await directory.resolveProfileId(req.auth!.institutionId, String(req.params.id));
    res.status(201).json({
      data: await mentorship.createPair(viewer, { ...req.body, mentorUserId: profile.userId }),
    });
  }),
);

// ── AL-03 events ─────────────────────────────────────────────
// Literal paths come BEFORE `/events/:id`, otherwise Express matches "upcoming"
// as an id and the tab endpoints 404.
router.get(
  '/events/my-registrations',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await registration.listMyEvents(viewer, { includePast: true }) });
  }),
);

router.get(
  '/events/my-attendance',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await registration.getMyAttendance(viewer) });
  }),
);

router.get(
  '/events',
  validate(eventQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await eventSvc.listEvents(req.auth!.institutionId, {
        ...(req.query as Record<string, never>),
        viewer,
      }),
    });
  }),
);

router.post(
  '/events',
  validate(createEventSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await eventSvc.createEvent(viewer, req.body) });
  }),
);

router.get(
  '/events/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await eventSvc.getEventDetail(req.auth!.institutionId, String(req.params.id), viewer),
    });
  }),
);

router.patch(
  '/events/:id',
  validate(idParamSchema, 'params'),
  validate(updateEventSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await eventSvc.updateEvent(viewer, String(req.params.id), req.body) });
  }),
);

// ── Self-service registration ──
router.post(
  '/events/:id/register',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await registration.registerForEvent(viewer, String(req.params.id)) });
  }),
);

router.post(
  '/events/:id/cancel-registration',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await registration.cancelRegistration(viewer, String(req.params.id)) });
  }),
);

// ── Office RSVP decisions (the waitlist queue) ──
router.post(
  '/rsvps/:id/decide',
  validate(idParamSchema, 'params'),
  validate(rsvpDecisionSchema),
  wrap(async (req, res) => {
    const result = await eventSvc.decideRsvp(
      req.auth!.institutionId,
      String(req.params.id),
      req.body.decision,
      req.auth!.userId,
    );
    res.json({ data: result });
  }),
);

router.post(
  '/events/:id/attendees',
  validate(idParamSchema, 'params'),
  validate(addAttendeeSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({
      data: await registration.addAttendee(viewer, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/events/:id/attendees/:registrationId/remove',
  validate(idParamSchema, 'params'),
  validate(removeAttendeeSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await registration.removeAttendee(
        viewer,
        String(req.params.id),
        String(req.params.registrationId),
        req.body.reason,
      ),
    });
  }),
);

// ── Agenda ──
router.post(
  '/events/:id/schedule',
  validate(idParamSchema, 'params'),
  validate(scheduleItemSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({
      data: await eventSvc.addScheduleItem(viewer, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/schedule-items/:id/toggle',
  validate(idParamSchema, 'params'),
  validate(scheduleItemDoneSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await eventSvc.toggleScheduleItem(viewer, String(req.params.id), req.body.isDone) });
  }),
);

// ── Attendance ──
router.post(
  '/events/:id/attendance',
  validate(idParamSchema, 'params'),
  validate(attendanceSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await eventSvc.markAttendance(viewer, String(req.params.id), req.body) });
  }),
);

router.post(
  '/events/:id/attendance/undo',
  validate(idParamSchema, 'params'),
  validate(attendanceSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await eventSvc.undoAttendance(viewer, String(req.params.id), {
        registrationIds: req.body.registrationIds,
      }),
    });
  }),
);

router.post(
  '/events/:id/checkin',
  validate(idParamSchema, 'params'),
  validate(qrCheckInSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await eventSvc.mockQrCheckIn(viewer, String(req.params.id), req.body) });
  }),
);

// ── Feedback ──
router.get(
  '/events/:id/feedback',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await feedback.listFeedback(viewer, String(req.params.id)),
    });
  }),
);

router.post(
  '/events/:id/feedback',
  validate(idParamSchema, 'params'),
  validate(feedbackSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({
      data: await feedback.submitFeedback(viewer, String(req.params.id), req.body),
    });
  }),
);

router.delete(
  '/events/:id/feedback',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await feedback.deleteMyFeedback(viewer, String(req.params.id)) });
  }),
);

// ── Memories (photos) ──
router.get(
  '/events/:id/photos',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await memories.listPhotos(String(req.params.id), req.auth!.institutionId),
    });
  }),
);

// Multipart: multer runs BEFORE the wrap so `req.file` exists. Authentication is
// still enforced — the router-level `auth` + `requireRole` middleware runs above
// every route here, so an anonymous upload never reaches this handler.
router.post(
  '/events/:id/photos',
  validate(idParamSchema, 'params'),
  photoUpload.single('file'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const file = req.file;
    if (!file) throw badRequest('No file was uploaded — send it as multipart/form-data under "file"');

    // The File row is written FIRST so a failed attach leaves an orphan file
    // (invisible, harmless) rather than an EventPhoto pointing at nothing.
    const created = await prisma.file.create({
      data: {
        institutionId: req.auth!.institutionId,
        uploaderUserId: req.auth!.userId,
        purpose: 'EVENT_PHOTO',
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: file.filename,
        originalName: file.originalname,
      },
    });

    try {
      const photo = await memories.addPhoto(viewer, String(req.params.id), {
        fileId: created.id,
        caption: req.body.caption,
      });
      res.status(201).json({
        data: {
          ...photo,
          originalName: created.originalName,
          sizeBytes: created.sizeBytes,
          url: `/uploads/${created.storageKey}`,
        },
      });
    } catch (e) {
      // Do not leave an unattached file behind — the same photo uploaded twice is
      // otherwise invisible clutter in the files table.
      await prisma.file.delete({ where: { id: created.id } }).catch(() => {});
      throw e;
    }
  }),
);

router.patch(
  '/events/:id/photos/:photoId',
  validate(idParamSchema, 'params'),
  validate(photoCaptionSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await memories.updateCaption(
        viewer,
        String(req.params.id),
        String(req.params.photoId),
        req.body.caption ?? '',
      ),
    });
  }),
);

router.delete(
  '/events/:id/photos/:photoId',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await memories.deletePhoto(viewer, String(req.params.id), String(req.params.photoId)),
    });
  }),
);

// AL-04 donations + campaigns
//
// Mounted as a SUB-ROUTER rather than declared inline. This file had reached
// 1125 lines and the donation surface grew to ~14 endpoints (pledges, campaigns,
// receipts, standing gifts); inline it would have pushed it past 1400 and buried
// the ledger under its own routes.
//
// The sub-router inherits this router's `auth` + `requireRole('ALUMNI','ADMIN')`
// because `router.use` runs the parent chain first — so the role gate still
// applies to every donation route, and a STUDENT is refused exactly as before.
router.use('/donations', donationsRoutes);

// ── AL-05 mentorship ────────────────────────────────────────
// Literal paths come BEFORE `/mentorship/:id`, or Express matches "requests" and
// "mentors" as a pair id.
router.get(
  '/mentorship',
  validate(mentorshipQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await mentorship.listMentorship(req.auth!.institutionId, {
        scope: (req.query as { scope?: 'active' | 'pending' | 'history' | 'all' }).scope,
        viewer,
      }),
    });
  }),
);

// The office inbox. Separate from the graduate's own request list.
//
// NOTE: no `idParamSchema` here — this is a COLLECTION route with no `:id` in
// the path, so validating `params.id` rejected every request to it with
// "id Required". Only the `:id` routes below validate.
router.get(
  '/mentorship/requests',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await mentorship.listRequests(req.auth!.institutionId, {
        status: (req.query as { status?: string }).status,
        forMentor: (req.query as { forMentor?: string }).forMentor === 'true',
        viewer,
      }),
    });
  }),
);

router.post(
  '/mentorship/requests',
  validate(mentorshipRequestSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await mentorship.createRequest(viewer, req.body) });
  }),
);

// Ranked mentor candidates for a request, with the reason for each.
router.get(
  '/mentorship/requests/:id/matches',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const { subject } = await matching.subjectForRequest(String(req.params.id), req.auth!.institutionId);
    const q = req.query as { limit?: string; minScore?: string };
    res.json({
      data: await matching.matchMentors(req.auth!.institutionId, subject, {
        limit: q.limit ? Number(q.limit) : undefined,
        minScore: q.minScore ? Number(q.minScore) : undefined,
      }),
    });
  }),
);

router.post(
  '/mentorship/requests/:id/decide',
  validate(idParamSchema, 'params'),
  validate(mentorshipDecisionSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await mentorship.decideRequest(viewer, String(req.params.id), req.body.action, req.body) });
  }),
);

router.delete(
  '/mentorship/requests/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await mentorship.withdrawRequest(viewer, String(req.params.id)) });
  }),
);

// The mentor directory: everyone available to mentor, with why they are a match
// for the asking mentee when a request is supplied.
router.get(
  '/mentorship/mentors',
  validate(mentorshipQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const q = req.query as { field?: string; skill?: string; requestId?: string };
    if (q.requestId) {
      const { subject } = await matching.subjectForRequest(q.requestId, req.auth!.institutionId);
      res.json({ data: await matching.matchMentors(req.auth!.institutionId, subject, { limit: 50, minScore: 0 }) });
      return;
    }
    res.json({
      data: await mentorship.listMentorDirectory(req.auth!.institutionId, {
        field: q.field,
        skill: q.skill,
        viewer,
      }),
    });
  }),
);

router.post(
  '/mentorship/pairs',
  validate(createPairSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await mentorship.createPair(viewer, req.body) });
  }),
);

router.get(
  '/mentorship/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await mentorship.getPair(req.auth!.institutionId, String(req.params.id), viewer) });
  }),
);

router.post(
  '/mentorship/:id/complete',
  validate(idParamSchema, 'params'),
  validate(completePairSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await mentorship.completePair(viewer, String(req.params.id), req.body) });
  }),
);

router.post(
  '/mentorship/:id/remind',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await mentorship.remindMentor(viewer, String(req.params.id)) });
  }),
);

// ── Sessions ──
router.post(
  '/mentorship/:id/sessions',
  validate(idParamSchema, 'params'),
  validate(mentorshipSessionSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await sessions.logSession(viewer, String(req.params.id), req.body) });
  }),
);

router.patch(
  '/mentorship/sessions/:id',
  validate(idParamSchema, 'params'),
  validate(updateSessionSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await sessions.updateSession(viewer, String(req.params.id), req.body) });
  }),
);

router.post(
  '/mentorship/sessions/:id/cancel',
  validate(idParamSchema, 'params'),
  validate(cancelSessionSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await sessions.cancelSession(viewer, String(req.params.id), req.body.reason) });
  }),
);

// ── Goals ──
router.post(
  '/mentorship/:id/goals',
  validate(idParamSchema, 'params'),
  validate(goalSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await goals.createGoal(viewer, String(req.params.id), req.body) });
  }),
);

router.get(
  '/mentorship/:id/progress',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    // Participants and the office only. This route used to take a bare pairId
    // with no scoping at all, so any authenticated caller could read another
    // institution's goal progress — or, once scoped to their own institution,
    // somebody else's mentorship.
    await mentorship.assertPairReadable(viewer, String(req.params.id));
    res.json({ data: await goals.progressForPair(String(req.params.id)) });
  }),
);

// The param is `:id`, not `:goalId` — `idParamSchema` validates `params.id`, so a
// route declaring `:goalId` failed validation with "id Required" on EVERY call.
// Goals could be created and then never updated or deleted.
router.patch(
  '/mentorship/goals/:id',
  validate(idParamSchema, 'params'),
  validate(updateGoalSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await goals.updateGoal(viewer, String(req.params.id), req.body) });
  }),
);

router.delete(
  '/mentorship/goals/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await goals.deleteGoal(viewer, String(req.params.id)) });
  }),
);

// ── Feedback ──
router.get(
  '/mentorship/:id/feedback',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await mentorshipFeedback.listFeedback(viewer, String(req.params.id)) });
  }),
);

router.post(
  '/mentorship/:id/feedback',
  validate(idParamSchema, 'params'),
  validate(mentorshipFeedbackSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await mentorshipFeedback.submitFeedback(viewer, String(req.params.id), req.body) });
  }),
);

router.delete(
  '/mentorship/:id/feedback',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await mentorshipFeedback.deleteMyFeedback(viewer, String(req.params.id)) });
  }),
);

// ── Legacy action route, kept working ───────────────────────
// `POST /mentorship/:id/approve|decline|remind` predates the request flow and is
// still called by the office console. Reimplemented over the new service so there
// is one set of rules rather than two.
const MENTORSHIP_ACTIONS = ['approve', 'decline', 'remind'] as const;
router.post(
  '/mentorship/:id/:action',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const action = String(req.params.action);
    if (!MENTORSHIP_ACTIONS.includes(action as never)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown mentorship action' } });
      return;
    }
    const viewer = await viewerFor(req);
    res.json({
      data:
        action === 'remind'
          ? await mentorship.remindMentor(viewer, String(req.params.id))
          : await mentorship.decidePair(viewer, String(req.params.id), action as 'approve' | 'decline', req.body?.reason),
    });
  }),
);

// AL-07 notifications + broadcast
router.get(
  '/notifications',
  wrap(async (req, res) => {
    res.json({ data: await service.listNotifications(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/notifications/read-all',
  wrap(async (req, res) => {
    res.json({
      data: await service.markAllRead(req.auth!.userId, req.auth!.institutionId),
    });
  }),
);

router.post(
  '/broadcasts',
  validate(broadcastSchema),
  wrap(async (req, res) => {
    const result = await service.createBroadcast(
      req.auth!.institutionId,
      req.auth!.userId,
      req.body,
    );
    res.status(201).json({ data: result });
  }),
);

// AL-08 profile
router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
