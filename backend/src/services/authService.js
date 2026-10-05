import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { Session } from '../models/Session.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { env } from '../config/env.js';
import { RbacService } from './rbacService.js';
import { AuditService } from './auditService.js';
import { ROLES } from '../constants/roles.js';
import { UnauthorizedError, AppError } from '../utils/errors.js';

export class AuthService {
  /**
   * Verify an Access Token and return the decoded payload.
   * Throws a jwt error if invalid or expired.
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  }

  /**
   * Generate Access and Refresh Tokens
   */
  static generateTokens(payload) {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    return {
      accessToken,
      rawRefreshToken,
      refreshTokenHash
    };
  }

  /**
   * User Login with progressive lockout and session creation
   */
  static async login({ email, password, req }) {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'Unknown';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown';

    const normalizedIdentifier = (email || '').toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }]
    })
      .select('+passwordHash')
      .populate('branchId', 'name code')
      .populate('branches', 'name code');

    if (!user) {
      // Record failed attempt in LoginHistory
      await LoginHistory.create({
        email: normalizedIdentifier,
        status: 'FAILED',
        failureReason: 'User not found',
        ipAddress,
        userAgent
      });
      throw new UnauthorizedError('Invalid email, username, or password');
    }

    if (!user.isActive) {
      await LoginHistory.create({
        userId: user._id,
        email: normalizedIdentifier,
        status: 'FAILED',
        failureReason: 'Account disabled',
        ipAddress,
        userAgent
      });
      throw new AppError('Your account has been deactivated. Please contact your administrator.', 403);
    }

    if (user.isAccountLocked()) {
      const minutesRemaining = Math.ceil((user.lockUntil - new Date()) / 60000);
      await LoginHistory.create({
        userId: user._id,
        email: normalizedIdentifier,
        status: 'LOCKED',
        failureReason: `Account temporarily locked. ${minutesRemaining} minutes remaining`,
        ipAddress,
        userAgent
      });
      throw new AppError(`Account is temporarily locked due to repeated failed logins. Please try again in ${minutesRemaining} minutes.`, 429);
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      await user.recordFailedLogin();
      await LoginHistory.create({
        userId: user._id,
        email: normalizedIdentifier,
        status: 'FAILED',
        failureReason: 'Incorrect password',
        ipAddress,
        userAgent
      });
      throw new UnauthorizedError('Invalid email, username, or password');
    }

    return this.createSessionForUser(user, req, 'AUTH_LOGIN');
  }

  /**
   * Helper to create tokens and session for a user (used by login & switchAccount)
   */
  static async createSessionForUser(user, req, action = 'AUTH_LOGIN') {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'Unknown';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown';

    // Reset failed login attempts and update last login
    if (typeof user.recordSuccessfulLogin === 'function') {
      await user.recordSuccessfulLogin();
    }

    // Fetch user permissions
    const permissions = await RbacService.getPermissionsForRole(user.role);

    const tokenPayload = {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      brand: user.brand || 'Shanthi Ayurvedas',
      assignedBrands: user.assignedBrands || [],
      role: user.role,
      branchId: user.branchId?._id?.toString() || user.branchId?.toString() || null,
      branches: user.branches || []
    };

    const { accessToken, rawRefreshToken, refreshTokenHash } = this.generateTokens(tokenPayload);

    // Store hashed refresh token in Session (7 days expiration)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Session.create({
      userId: user._id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt,
      isValid: true
    });

    // Record login history
    await LoginHistory.create({
      userId: user._id,
      email: user.email,
      status: 'SUCCESS',
      ipAddress,
      userAgent
    });

    // Audit log
    await AuditService.log({
      userId: user._id,
      branchId: user.branchId?._id || user.branchId,
      action,
      module: 'auth',
      resourceType: 'User',
      resourceId: user._id,
      req
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        brand: user.brand || 'Shanthi Ayurvedas',
        assignedBrands: user.assignedBrands || [],
        role: user.role,
        branch: user.branchId,
        branches: user.branches,
        permissions
      },
      accessToken,
      refreshToken: rawRefreshToken
    };
  }

  /**
   * Ensure quick role demo account exists and return it
   */
  static async ensureQuickAccount({ role, email }) {
    const targetEmail = (email || '').toLowerCase().trim();

    const QUICK_PROFILES = {
      OWNER: {
        name: 'CRM Owner',
        email: 'owner@shanthiayurvedas.com',
        username: 'owner',
        role: ROLES.OWNER,
        phone: '9629985340'
      },
      MANAGER: {
        name: 'Hosur Hub Manager',
        email: 'manager.hosur@shanthiayurvedas.com',
        username: 'manager_hosur',
        role: ROLES.MANAGER,
        phone: '9629985342'
      },
      DISTRIBUTOR: {
        name: 'Ramesh Distributor',
        email: 'distributor@shanthiayurvedas.com',
        username: 'distributor_ramesh',
        role: ROLES.DISTRIBUTOR,
        phone: '9629985343'
      },
      TELECALLER: {
        name: 'Sathish Telecaller',
        email: 'sathish@shanthiayurvedas.com',
        username: 'telecaller_sathish',
        role: ROLES.TELECALLER,
        phone: '9629985344'
      }
    };

    let user = null;
    if (targetEmail) {
      user = await User.findOne({ email: targetEmail, isActive: true })
        .populate('branchId', 'name code')
        .populate('branches', 'name code');
    } else if (role && QUICK_PROFILES[role]) {
      user = await User.findOne({ email: QUICK_PROFILES[role].email, isActive: true })
        .populate('branchId', 'name code')
        .populate('branches', 'name code');
      if (!user) {
        user = await User.findOne({ role, isActive: true })
          .populate('branchId', 'name code')
          .populate('branches', 'name code');
      }
    }

    if (user) return user;

    // Check Hosur branch
    let branch = await Branch.findOne({ code: 'HSR' });
    if (!branch) {
      branch = await Branch.findOneAndUpdate(
        { code: 'HSR' },
        {
          name: 'Shanthi Ayurvedas Hosur Main Hub',
          code: 'HSR',
          branchType: 'COMPANY_OWNED',
          address: {
            street: '14/B, Gandhi Road, Near Bus Stand',
            city: 'Hosur',
            state: 'Tamil Nadu',
            pincode: '635109',
            country: 'India'
          },
          phone: '+91 96299 85341',
          email: 'hosur@shanthiayurvedas.com',
          billerId: '1000058077',
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    const defaultPassword = 'Password@12345';
    const passwordHash = await User.hashPassword(defaultPassword);

    let profile = null;
    if (role && QUICK_PROFILES[role]) {
      profile = QUICK_PROFILES[role];
    } else if (targetEmail) {
      profile = Object.values(QUICK_PROFILES).find((p) => p.email === targetEmail);
    }

    if (!profile) return null;

    user = await User.findOneAndUpdate(
      { email: profile.email },
      {
        name: profile.name,
        email: profile.email,
        username: profile.username,
        brand: 'Shanthi Ayurvedas',
        assignedBrands: ['Shanthi Ayurvedas'],
        passwordHash,
        role: profile.role,
        branchId: branch?._id,
        branches: branch ? [branch._id] : [],
        phone: profile.phone,
        isActive: true
      },
      { upsert: true, new: true }
    )
      .populate('branchId', 'name code')
      .populate('branches', 'name code');

    return user;
  }

  /**
   * Rotate Refresh Token and return new Access Token
   */
  static async refreshSession({ rawRefreshToken, req }) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    // Consume the token atomically: simultaneous refreshes cannot both rotate it.
    // MongoDB TTL cleanup is asynchronous, so enforce expiration here as well.
    const session = await Session.findOneAndUpdate(
      { refreshTokenHash, isValid: true, expiresAt: { $gt: new Date() } },
      { $set: { isValid: false } },
      { new: false }
    ).populate('userId');

    if (!session || !session.userId || !session.userId.isActive || session.userId.isAccountLocked()) {
      // Possible token reuse attack or invalid session -> revoke session
      if (session) {
        session.isValid = false;
        await session.save();
      }
      throw new UnauthorizedError('Invalid or expired refresh token. Please sign in again.');
    }

    const user = session.userId;
    const permissions = await RbacService.getPermissionsForRole(user.role);

    const tokenPayload = {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      brand: user.brand || 'Shanthi Ayurvedas',
      assignedBrands: user.assignedBrands || [],
      role: user.role,
      branchId: user.branchId?.toString() || null,
      branches: user.branches || []
    };

    // Rotate refresh token
    const { accessToken, rawRefreshToken: newRawRefreshToken, refreshTokenHash: newRefreshTokenHash } =
      this.generateTokens(tokenPayload);

    // Invalidate old session and create new rotated session
    session.isValid = false;
    await session.save();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Session.create({
      userId: user._id,
      refreshTokenHash: newRefreshTokenHash,
      userAgent: req?.headers?.['user-agent'] || session.userAgent,
      ipAddress: req?.ip || session.ipAddress,
      expiresAt,
      isValid: true
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        brand: user.brand || 'Shanthi Ayurvedas',
        assignedBrands: user.assignedBrands || [],
        role: user.role,
        branch: user.branchId,
        branches: user.branches,
        permissions
      }
    };
  }

  /**
   * Logout session
   */
  static async logout({ rawRefreshToken, userId, req }) {
    if (rawRefreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      await Session.updateOne({ refreshTokenHash }, { isValid: false });
    }

    if (userId) {
      await LoginHistory.create({
        userId,
        status: 'LOGOUT',
        ipAddress: req?.ip || 'Unknown',
        userAgent: req?.headers?.['user-agent'] || 'Unknown'
      });
    }
  }

  /**
   * Logout all devices / revoke all sessions for a user
   */
  static async logoutAllDevices(userId) {
    await Session.updateMany({ userId, isValid: true }, { isValid: false });
  }
}

export default AuthService;
