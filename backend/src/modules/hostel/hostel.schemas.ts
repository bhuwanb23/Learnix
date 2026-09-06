import { z } from 'zod';

// Hostel module request schemas (docs/users/08 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const allocateSchema = z.object({
  rollNo: z.string().trim().min(2).max(32),
  roomNumber: z.string().trim().min(3).max(16),
});

export const bedParamSchema = z.object({
  bedId: z.string().min(1).max(64),
});

export const menuSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  meal: z.enum(['BREAKFAST', 'LUNCH', 'DINNER']),
  items: z.array(z.string().trim().min(1).max(60)).min(1).max(12),
});

export const complaintSchema = z.object({
  studentProfileId: z.string().min(1).max(64),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'NETWORK', 'MAINTENANCE']),
  description: z.string().trim().min(5).max(500),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export const visitorCheckinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  studentProfileId: z.string().min(1).max(64),
  relation: z.string().trim().min(2).max(40),
});

export const broadcastSchema = z.object({
  audience: z.enum(['ALL_RESIDENTS', 'BLOCK_A', 'BLOCK_B', 'BLOCK_C', 'MESS_MEMBERS']),
  templateKey: z.string().trim().min(2).max(60).default('HOSTEL_NOTICE'),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
});
