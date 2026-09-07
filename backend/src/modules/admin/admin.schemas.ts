import { z } from 'zod';

// Admin module request schemas (docs/users/03 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// A-02 Students — approve
export const decideStudentSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

// A-03 Teachers — add teacher
export const addTeacherSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(120),
  employeeNo: z.string().trim().min(1).max(40),
  designation: z.string().trim().min(2).max(120),
  departmentId: z.string().min(1).max(64).optional(),
});

// A-04 Academics — decide cheating case
export const decideCheatingSchema = z.object({
  decision: z.enum(['CONFIRMED', 'DISMISSED', 'ESCALATED']),
});

// A-10 Placements — approve drive
export const approveDriveSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

// A-11 Events — decide event
export const decideEventSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'PUBLISHED']),
});

// A-14 Announcements — decide
export const decideAnnouncementSchema = z.object({
  decision: z.enum(['PUBLISHED', 'REJECTED']),
});

// A-14 Announcements — create
export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(3).max(2000),
  audience: z.string().trim().min(1).max(120),
});

// A-16 Settings — update config
export const updateConfigSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(500),
});

// A-17 Notifications — broadcast
export const adminBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'ALL_STAFF', 'ALL_USERS']),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});
