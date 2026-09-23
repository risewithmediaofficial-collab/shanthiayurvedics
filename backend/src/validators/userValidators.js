import { z } from 'zod';
import { ROLES } from '../constants/roles.js';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]).{10,}$/;

export const createUserSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(
        passwordRegex,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    role: z.enum(Object.values(ROLES)),
    branchId: z.string().optional().nullable(),
    branches: z.array(z.string()).optional(),
    phone: z.string().optional()
  })
};

export const updateUserSchema = {
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    role: z.enum(Object.values(ROLES)).optional(),
    branchId: z.string().optional().nullable(),
    branches: z.array(z.string()).optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional()
  })
};

export const adminResetPasswordSchema = {
  body: z.object({
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(
        passwordRegex,
        'Password must contain uppercase, lowercase, number, and special character'
      )
  })
};

export const createBranchSchema = {
  body: z.object({
    name: z.string().min(2).max(100),
    code: z.string().min(2).max(10).toUpperCase(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().optional()
      })
      .optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    managerId: z.string().optional().nullable(),
    managerName: z.string().optional(),
    managerPhone: z.string().optional(),
    distributorId: z.string().optional().nullable(),
    distributorName: z.string().optional(),
    distributorPhone: z.string().optional(),
    distributorEmail: z.string().email().optional().or(z.literal('')),
    branchType: z.enum(['COMPANY_OWNED', 'FRANCHISE']).optional(),
    billerId: z.string().optional(),
    gstNumber: z.string().optional(),
    revenueSharePercent: z.number().optional()
  })
};
