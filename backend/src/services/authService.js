import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { env } from '../config/env.js';
import { RbacService } from './rbacService.js';
import { AuditService } from './auditService.js';
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
      .populate('branchId', 'name code');

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

    // Verify Argon2id password
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

    // Reset failed login attempts and update last login
    await user.recordSuccessfulLogin();

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

    // Record successful login history
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
      action: 'AUTH_LOGIN',
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
   * Rotate Refresh Token and return new Access Token
   */
  static async refreshSession({ rawRefreshToken, req }) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const session = await Session.findOne({ refreshTokenHash, isValid: true }).populate('userId');

    if (!session || !session.userId || !session.userId.isActive) {
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
