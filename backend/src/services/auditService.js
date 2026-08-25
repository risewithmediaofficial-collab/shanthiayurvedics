import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

// Sensitive keys to sanitize out of audit logs
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'refreshToken', 'token', 'secret', 'passwordResetToken'];

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
};

export class AuditService {
  static async log({
    userId,
    branchId,
    action,
    module,
    resourceType,
    resourceId,
    oldValue = null,
    newValue = null,
    req = null
  }) {
    try {
      const ipAddress = req?.ip || req?.connection?.remoteAddress || 'System';
      const userAgent = req?.headers?.['user-agent'] || 'Internal';

      const logEntry = new AuditLog({
        userId,
        branchId,
        action,
        module,
        resourceType,
        resourceId: resourceId ? resourceId.toString() : null,
        oldValue: sanitizeData(oldValue),
        newValue: sanitizeData(newValue),
        ipAddress,
        userAgent,
        timestamp: new Date()
      });

      await logEntry.save();
      return logEntry;
    } catch (err) {
      logger.error(`Failed to write audit log: ${err.message}`);
      return null;
    }
  }

  static async query({
    page = 1,
    limit = 20,
    module,
    action,
    userId,
    branchId,
    startDate,
    endDate
  }) {
    const filter = {};
    if (module) filter.module = module;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (branchId && branchId !== 'ALL') filter.branchId = branchId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .populate('userId', 'name email role')
        .populate('branchId', 'name code')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export default AuditService;
