import { z } from 'zod';

// Sports & Cultural module request schemas (docs/users/10 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// Sport name is free-text in the schema (Football, Cultural, …) — chip filter
export const tournamentQuerySchema = z.object({
  sport: z.string().trim().min(1).max(40).optional(),
});

// Fixture scheduling — teams must belong to the same tournament (checked in service)
export const createFixtureSchema = z.object({
  tournamentId: z.string().min(1).max(64),
  teamAId: z.string().min(1).max(64),
  teamBId: z.string().min(1).max(64),
  fixtureDate: z.coerce.date(),
});

// Result entry — updates fixture AND auto-updates standings
export const resultSchema = z.object({
  winner: z.enum(['A', 'B', 'DRAW']),
  scoreA: z.number().int().min(0).max(999),
  scoreB: z.number().int().min(0).max(999),
});

// Roster additions — mentee-style student picker resolved by roll number
export const addPlayerSchema = z.object({
  rollNo: z.string().trim().min(2).max(40),
  role: z.enum(['PLAYER', 'CAPTAIN']).default('PLAYER'),
});

export const addEquipmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(['SPORTS', 'CULTURAL', 'IT']).default('SPORTS'),
  totalUnits: z.number().int().min(1).max(10000),
  condition: z.enum(['GOOD', 'NEEDS_REPAIR']).default('GOOD'),
});

export const issueEquipmentSchema = z.object({
  rollNo: z.string().trim().min(2).max(40),
  dueAt: z.coerce.date(),
});

export const bookVenueSchema = z.object({
  venueId: z.string().min(1).max(64),
  eventTitle: z.string().trim().min(2).max(120),
  date: z.coerce.date(),
  timeSlot: z.string().trim().min(3).max(30), // "15:00-18:00"
});

export const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

export const scheduleItemSchema = z.object({
  day: z.number().int().min(1).max(30),
  item: z.string().trim().min(2).max(120),
});

export const scheduleItemDoneSchema = z.object({
  isDone: z.boolean(),
});

export const volunteerSchema = z.object({
  rollNo: z.string().trim().min(2).max(40),
  role: z.string().trim().max(60).optional(),
});

export const sportsBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'ALL_TEAMS', 'VOLUNTEERS']),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});
