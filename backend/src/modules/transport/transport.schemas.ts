import { z } from 'zod';

// Transport module request schemas (docs/users/09 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const createRouteSchema = z.object({
  name: z.string().trim().min(2).max(60),
  distanceKm: z.number().min(0.1).max(500),
  vehicleId: z.string().min(1).max(64).optional(),
});

export const addStopSchema = z.object({
  stopName: z.string().trim().min(2).max(80),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:MM'),
});

export const enrollStudentSchema = z.object({
  rollNo: z.string().trim().min(2).max(40),
  order: z.number().int().min(1).max(100), // which stop the student boards at
});

export const pingSchema = z.object({
  currentStopOrder: z.number().int().min(1).max(100).optional(),
  speedKmh: z.number().int().min(0).max(160),
  etaMin: z.number().int().min(0).max(600).optional(),
  status: z.enum(['ON_TIME', 'DELAYED']),
});

export const recordServiceSchema = z.object({
  type: z.enum(['PERIODIC', 'REPAIR', 'INSPECTION']),
  costMinor: z.number().int().min(0).max(100_000_000),
  serviceDate: z.coerce.date(),
});

export const completeServiceSchema = z.object({
  odometerKm: z.number().int().min(0).max(2_000_000).optional(),
});

export const fuelLogSchema = z.object({
  litres: z.number().min(0.1).max(1000),
  amountMinor: z.number().int().min(0).max(100_000_000),
});

export const collectFeeSchema = z.object({
  method: z.enum(['UPI', 'NET_BANKING', 'CARD', 'CASH']).default('CASH'),
});

export const feeRevisionSchema = z.object({
  requestedMinor: z.number().int().min(0).max(100_000_000),
  reason: z.string().trim().min(3).max(500),
});

export const dutySchema = z.object({
  dutyStatus: z.enum(['ON_DUTY', 'OFF_DUTY', 'ON_LEAVE']),
});

export const transportBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'ROUTE', 'DEFAULTERS']),
  routeId: z.string().min(1).max(64).optional(),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});
