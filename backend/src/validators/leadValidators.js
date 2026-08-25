import { z } from 'zod';
import { LEAD_SOURCES, LEAD_STATUS, CALL_STATUS } from '../constants/leadStates.js';

const indianMobileRegex = /^[6-9]\d{9}$/;

export const createLeadSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    mobile: z.string().regex(indianMobileRegex, 'Please enter a valid 10-digit mobile number starting with 6-9'),
    altMobile: z.string().optional().nullable(),
    email: z.string().email('Invalid email format').optional().nullable(),
    whatsappNumber: z.string().optional().nullable(),
    source: z.enum(Object.values(LEAD_SOURCES)).default(LEAD_SOURCES.MANUAL),
    branchId: z.string().optional().nullable(),
    assignedTo: z.string().optional().nullable(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    notes: z.string().optional(),
    forceCreate: z.boolean().optional().default(false)
  })
};

export const updateLeadSchema = {
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    mobile: z.string().regex(indianMobileRegex).optional(),
    altMobile: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    whatsappNumber: z.string().optional().nullable(),
    status: z.enum(Object.values(LEAD_STATUS)).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    notes: z.string().optional()
  })
};

export const logCallSchema = {
  body: z.object({
    callStatus: z.enum(Object.values(CALL_STATUS)),
    notes: z.string().min(3, 'Call notes must be at least 3 characters'),
    callDurationSeconds: z.number().min(0).optional().default(0),
    nextFollowUpAt: z.string().datetime().optional().nullable(),
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
