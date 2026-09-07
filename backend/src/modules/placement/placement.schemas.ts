import { z } from 'zod';

// Placement Cell module request schemas (docs/users/04 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// P-02 Companies — add company
export const addCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  sector: z.string().trim().max(60).optional(),
  website: z.string().url().max(200).optional(),
  hrContact: z.string().trim().max(200).optional(),
  rating: z.number().min(0).max(5).optional(),
});

// P-03 Jobs — post job
export const postJobSchema = z.object({
  companyId: z.string().min(1).max(64),
  role: z.string().trim().min(2).max(120),
  packageMinorPerAnnum: z.number().int().min(1),
  location: z.string().trim().max(120).optional(),
  openings: z.number().int().min(1).default(1),
  deadline: z.string().min(1).optional(),
  description: z.string().trim().max(2000).optional(),
});

// P-04 Drives — create drive
export const createDriveSchema = z.object({
  companyId: z.string().min(1).max(64),
  title: z.string().trim().min(3).max(120),
  role: z.string().trim().min(2).max(120),
  packageMinorPerAnnum: z.number().int().min(1),
  driveDate: z.string().min(1),
  mode: z.enum(['ON_CAMPUS', 'VIRTUAL']).default('ON_CAMPUS'),
  eligibilityJson: z.string().trim().min(1).max(2000),
});

// P-05 Applications — decide
export const decideApplicationSchema = z.object({
  decision: z.enum(['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED']),
});

// P-06 Offers — extend offer
export const extendOfferSchema = z.object({
  applicationId: z.string().min(1).max(64),
  ctcMinor: z.number().int().min(1),
});

// P-06 Offers — decide offer
export const decideOfferSchema = z.object({
  decision: z.enum(['ACCEPTED', 'DECLINED']),
});

// P-08 Notifications — broadcast
export const placementBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'FINAL_YEAR', 'THIRD_YEAR', 'PLACED_STUDENTS']),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});
