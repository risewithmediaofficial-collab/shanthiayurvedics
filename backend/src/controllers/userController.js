import { User } from '../models/User.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { AuditService } from '../services/auditService.js';
import { AuthService } from '../services/authService.js';

export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search?.trim();
  const role = req.query.role;
  const branchId = req.query.branchId;

  const query = {};
  if (role) query.role = role;
  if (branchId && branchId !== 'ALL') {
    query.$or = [{ branchId }, { branches: branchId }];
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .populate('branchId', 'name code')
      .populate('branches', 'name code')
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, users, { page, limit, total }, 'Users retrieved successfully');
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('branchId', 'name code')
    .populate('branches', 'name code')
    .select('-passwordHash');

  if (!user) {
    throw new NotFoundError('User');
  }

  return ApiResponse.success(res, user, 'User details retrieved');
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, branchId, branches, phone } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ConflictError('A user with this email address already exists');
  }

  const passwordHash = await User.hashPassword(password);

  const newUser = new User({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    branchId: branchId || null,
    branches: branches || (branchId ? [branchId] : []),
    phone,
    isActive: true
  });

  await newUser.save();

  await AuditService.log({
    userId: req.user.id,
    branchId: branchId || null,
    action: 'USER_CREATED',
    module: 'users',
    resourceType: 'User',
    resourceId: newUser._id,
    newValue: { name, email: normalizedEmail, role, branchId },
    req
  });

  const responseUser = await User.findById(newUser._id)
    .populate('branchId', 'name code')
    .populate('branches', 'name code')
    .select('-passwordHash');

  return ApiResponse.created(res, responseUser, 'User created successfully');
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User');
  }

  const oldValue = user.toObject();
  const { name, role, branchId, branches, phone, isActive } = req.body;

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (branchId !== undefined) user.branchId = branchId;
  if (branches !== undefined) user.branches = branches;
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  await AuditService.log({
    userId: req.user.id,
    branchId: user.branchId,
    action: 'USER_UPDATED',
    module: 'users',
    resourceType: 'User',
    resourceId: user._id,
    oldValue,
    newValue: user.toObject(),
    req
  });

  const updatedUser = await User.findById(user._id)
    .populate('branchId', 'name code')
    .populate('branches', 'name code')
    .select('-passwordHash');

  return ApiResponse.success(res, updatedUser, 'User updated successfully');
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User');
  }

  user.isActive = !user.isActive;
  await user.save();

  // If user disabled, invalidate sessions
  if (!user.isActive) {
    await AuthService.logoutAllDevices(user._id);
  }

  await AuditService.log({
    userId: req.user.id,
    branchId: user.branchId,
    action: user.isActive ? 'USER_ACTIVATED' : 'USER_DISABLED',
    module: 'users',
    resourceType: 'User',
    resourceId: user._id,
    newValue: { isActive: user.isActive },
    req
  });

  return ApiResponse.success(res, { id: user._id, isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'disabled'} successfully`);
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User');
  }

  user.passwordHash = await User.hashPassword(req.body.password);
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.isLocked = false;
  user.lockUntil = null;
  await user.save();

  // Logout on all devices
  await AuthService.logoutAllDevices(user._id);

  await AuditService.log({
    userId: req.user.id,
    branchId: user.branchId,
    action: 'USER_PASSWORD_RESET_BY_ADMIN',
    module: 'users',
    resourceType: 'User',
    resourceId: user._id,
    req
  });

  return ApiResponse.success(res, null, 'User password has been reset successfully');
});
