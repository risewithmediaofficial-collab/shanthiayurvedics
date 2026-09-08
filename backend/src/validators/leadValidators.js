import { z } from 'zod';
import { LEAD_SOURCES, LEAD_STATUS, CALL_STATUS } from '../constants/leadStates.js';

const indianMobileRegex = /^[6-9]\d{9}$/;

const optionalString = z
  .union([z.string(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v && typeof v === 'string' && v.trim() ? v.trim() : null));

const optionalEmail = z
  .union([
    z.string().trim().email('Invalid email format'),
    z.literal(''),
    z.null()
  ])
  .optional()
  .transform((v) => (v && typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null));

export const createLeadSchema = {
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    mobile: z.string().trim().regex(indianMobileRegex, 'Please enter a valid 10-digit mobile number starting with 6-9'),
    altMobile: optionalString,
    email: optionalEmail,
    whatsappNumber: optionalString,
    source: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return LEAD_SOURCES.MANUAL;
        const upper = val.toUpperCase();
        return LEAD_SOURCES[upper] || LEAD_SOURCES.MANUAL;
      }),
    branchId: optionalString,
    assignedTo: optionalString,
    city: optionalString,
    state: optionalString,
    pincode: optionalString,
    notes: optionalString,
    forceCreate: z.boolean().optional().default(false)
  })
};

export const updateLeadSchema = {
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    mobile: z.string().trim().regex(indianMobileRegex, 'Please enter a valid 10-digit mobile number starting with 6-9').optional(),
    altMobile: optionalString,
    email: optionalEmail,
    whatsappNumber: optionalString,
    source: z
      .string()
      .optional()
      .transform((val) => (val ? LEAD_SOURCES[val.toUpperCase()] || val : undefined)),
    status: z.enum(Object.values(LEAD_STATUS)).optional(),
    branchId: optionalString,
    assignedTo: optionalString,
    city: optionalString,
    state: optionalString,
    pincode: optionalString,
    notes: optionalString
  })
};

export const logCallSchema = {
  body: z.object({
    callStatus: z.string().optional(),
    outcome: z.string().optional(),
    notes: z.string().min(1, 'Call notes are required'),
    callDurationSeconds: z.number().min(0).optional().default(0),
    durationSeconds: z.number().min(0).optional(),
    nextFollowUpAt: z.union([z.string(), z.literal(''), z.null()]).optional(),
    nextFollowUpDate: z.union([z.string(), z.literal(''), z.null()]).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    updateLeadStatus: z.enum(Object.values(LEAD_STATUS)).optional()
  })
};

export const assignLeadSchema = {
  body: z.object({
    assignedTo: z.string().min(1, 'Target telecaller ID is required'),
    reason: z.string().optional()
  })
};
