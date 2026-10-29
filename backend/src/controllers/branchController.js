import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { AuditService } from '../services/auditService.js';

export const getBranches = asyncHandler(async (req, res) => {
  // Ensure default Main Branch exists if no branches exist in the system
  const totalBranchesCount = await Branch.countDocuments();
  if (totalBranchesCount === 0) {
    await Branch.create({
      name: 'Main Branch',
      code: 'MAIN',
      branchType: 'COMPANY_OWNED',
      isActive: true
    });
  }

  const query = { isActive: true };

  // Non-owner staff (Manager, Distributor, Telecaller) must ONLY see their assigned branch(es)
  if (req.user && req.user.role !== 'OWNER') {
    const rawIds = [
      ...(req.user.branchId ? [typeof req.user.branchId === 'object' ? (req.user.branchId._id || req.user.branchId.id) : req.user.branchId] : []),
      ...(Array.isArray(req.user.branches) ? req.user.branches.map(b => typeof b === 'object' ? (b._id || b.id) : b) : [])
    ].filter(Boolean);

    const assignedIds = [...new Set(rawIds.map(id => id.toString()))];
    if (assignedIds.length > 0) {
      query._id = { $in: assignedIds };
    } else {
      const managed = await Branch.find({
        $or: [{ managerId: req.user._id || req.user.id }, { distributorId: req.user._id || req.user.id }]
      }).select('_id').lean();
      if (managed.length > 0) {
        query._id = { $in: managed.map(m => m._id) };
      } else {
        const defaultBranch = await Branch.findOne({ isActive: true }).select('_id').lean();
        if (defaultBranch) {
          query._id = defaultBranch._id;
        }
      }
    }
  }

  const branches = await Branch.find(query)
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .sort({ name: 1 })
    .lean();
  return ApiResponse.success(res, branches, 'Branches retrieved successfully');
});

export const getAllBranchesAdmin = asyncHandler(async (req, res) => {
  const branches = await Branch.find()
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .sort({ createdAt: -1 })
    .lean();
  return ApiResponse.success(res, branches, 'All branches retrieved');
});

export const createBranch = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    address,
    phone,
    email,
    managerId,
    managerName,
    managerPhone,
    distributorId,
    distributorName,
    distributorPhone,
    distributorEmail,
    branchType,
    revenueSharePercent,
    billerId,
    gstNumber,
    // Branch Account Setup fields
    accountName,
    accountEmail,
    accountPassword,
    accountRole,
    // Postal Pickup Details
    postalPickupDetails
  } = req.body;

  const existingCode = await Branch.findOne({ code: code.toUpperCase() });
  if (existingCode) {
    throw new ConflictError(`Branch with code '${code}' already exists`);
  }

  // Optional manual user account creation for the branch / franchise
  let createdAccount = null;
  let effectiveManagerId = managerId || null;
  let effectiveManagerName = managerName;
  let effectiveManagerPhone = managerPhone;
  let effectiveDistributorId = distributorId || null;
  let effectiveDistributorName = distributorName;
  let effectiveDistributorPhone = distributorPhone;
  let effectiveDistributorEmail = distributorEmail;

  if (accountEmail && accountPassword) {
    const normalizedEmail = accountEmail.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ConflictError(`User account with email/username '${normalizedEmail}' already exists`);
    }

    const passwordHash = await User.hashPassword(accountPassword);
    const assignedRole = accountRole === 'DISTRIBUTOR' ? 'DISTRIBUTOR' : 'MANAGER';
    const newAccountUser = new User({
      name: accountName?.trim() || effectiveManagerName || name,
      email: normalizedEmail,
      passwordHash,
      initialPassword: accountPassword,
      role: assignedRole,
      phone: postalPickupDetails?.phone || phone || '',
      isActive: true
    });
    await newAccountUser.save();

    if (assignedRole === 'DISTRIBUTOR') {
      effectiveDistributorId = newAccountUser._id;
      effectiveDistributorName = newAccountUser.name;
      effectiveDistributorPhone = newAccountUser.phone;
      effectiveDistributorEmail = newAccountUser.email;
    } else {
      effectiveManagerId = newAccountUser._id;
      effectiveManagerName = newAccountUser.name;
      effectiveManagerPhone = newAccountUser.phone;
    }

    createdAccount = {
      id: newAccountUser._id,
      name: newAccountUser.name,
      username: newAccountUser.email,
      email: newAccountUser.email,
      password: accountPassword,
      role: assignedRole
    };
  }

  // Resolve manager details if an existing managerId was selected
  if (effectiveManagerId && !createdAccount) {
    const mgrUser = await User.findById(effectiveManagerId).select('name phone email').lean();
    if (mgrUser) {
      effectiveManagerName = effectiveManagerName || mgrUser.name;
      effectiveManagerPhone = effectiveManagerPhone || mgrUser.phone;
    }
  }

  // Resolve distributor details if an existing distributorId was selected
  if (effectiveDistributorId && !createdAccount) {
    const distUser = await User.findById(effectiveDistributorId).select('name phone email').lean();
    if (distUser) {
      effectiveDistributorName = effectiveDistributorName || distUser.name;
      effectiveDistributorPhone = effectiveDistributorPhone || distUser.phone;
      effectiveDistributorEmail = effectiveDistributorEmail || distUser.email;
    }
  }

  const newBranch = new Branch({
    name,
    code: code.toUpperCase(),
    address,
    postalPickupDetails: postalPickupDetails || {},
    phone,
    email,
    managerId: effectiveManagerId,
    managerName: effectiveManagerName,
    managerPhone: effectiveManagerPhone,
    distributorId: effectiveDistributorId,
    distributorName: effectiveDistributorName,
    distributorPhone: effectiveDistributorPhone,
    distributorEmail: effectiveDistributorEmail,
    branchType: branchType || 'COMPANY_OWNED',
    revenueSharePercent: Number(revenueSharePercent || 0),
    billerId: billerId || '1000058077',
    gstNumber,
    initialCredentials: createdAccount ? [{
      userId: createdAccount.id,
      name: createdAccount.name,
      email: createdAccount.email,
      role: createdAccount.role,
      password: createdAccount.password,
      createdAt: new Date()
    }] : [],
    isActive: true
  });

  await newBranch.save();

  // Link newly created branch to the newly created user or assigned manager & distributor
  if (createdAccount?.id) {
    await User.findByIdAndUpdate(createdAccount.id, {
      branchId: newBranch._id,
      $addToSet: { branches: newBranch._id }
    });
  }
  if (effectiveManagerId && (!createdAccount || String(effectiveManagerId) !== String(createdAccount.id))) {
    await User.findByIdAndUpdate(effectiveManagerId, {
      branchId: newBranch._id,
      $addToSet: { branches: newBranch._id }
    });
  }
  if (effectiveDistributorId && (!createdAccount || String(effectiveDistributorId) !== String(createdAccount.id))) {
    await User.findByIdAndUpdate(effectiveDistributorId, {
      branchId: newBranch._id,
      $addToSet: { branches: newBranch._id }
    });
  }

  await AuditService.log({
    userId: req.user.id,
    branchId: newBranch._id,
    action: 'BRANCH_CREATED',
    module: 'branches',
    resourceType: 'Branch',
    resourceId: newBranch._id,
    newValue: newBranch.toObject(),
    req
  });

  const populatedBranch = await Branch.findById(newBranch._id)
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .lean();

  return ApiResponse.created(res, { ...populatedBranch, createdAccount }, 'Branch created successfully');
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new NotFoundError('Branch');
  }

  const oldValue = branch.toObject();
  const {
    name,
    code,
    address,
    phone,
    email,
    isActive,
    managerId,
    managerName,
    managerPhone,
    distributorId,
    distributorName,
    distributorPhone,
    distributorEmail,
    branchType,
    revenueSharePercent,
    billerId,
    gstNumber
  } = req.body;

  if (code && code.toUpperCase() !== branch.code) {
    const existingCode = await Branch.findOne({
      code: code.toUpperCase(),
      _id: { $ne: branch._id }
    });
    if (existingCode) {
      throw new ConflictError(`Branch with code '${code}' already exists`);
    }
    branch.code = code.toUpperCase();
  }

  if (name !== undefined) branch.name = name;
  if (address !== undefined) branch.address = address;
  if (req.body.postalPickupDetails !== undefined) branch.postalPickupDetails = req.body.postalPickupDetails;
  if (phone !== undefined) branch.phone = phone;
  if (email !== undefined) branch.email = email;
  if (isActive !== undefined) branch.isActive = isActive;
  
  if (managerId !== undefined) {
    branch.managerId = managerId || null;
    if (managerId) {
      const mgrUser = await User.findById(managerId).select('name phone').lean();
      if (mgrUser) {
        branch.managerName = managerName || mgrUser.name;
        branch.managerPhone = managerPhone || mgrUser.phone;
      }
      await User.findByIdAndUpdate(managerId, {
        branchId: branch._id,
        $addToSet: { branches: branch._id }
      });
    }
  }
  if (managerName !== undefined) branch.managerName = managerName;
  if (managerPhone !== undefined) branch.managerPhone = managerPhone;

  if (distributorId !== undefined) {
    branch.distributorId = distributorId || null;
    if (distributorId) {
      const distUser = await User.findById(distributorId).select('name phone email').lean();
      if (distUser) {
        branch.distributorName = distributorName || distUser.name;
        branch.distributorPhone = distributorPhone || distUser.phone;
        branch.distributorEmail = distributorEmail || distUser.email;
      }
      await User.findByIdAndUpdate(distributorId, {
        branchId: branch._id,
        $addToSet: { branches: branch._id }
      });
    }
  }
  if (distributorName !== undefined) branch.distributorName = distributorName;
  if (distributorPhone !== undefined) branch.distributorPhone = distributorPhone;
  if (distributorEmail !== undefined) branch.distributorEmail = distributorEmail;

  if (branchType !== undefined) branch.branchType = branchType;
  if (revenueSharePercent !== undefined) branch.revenueSharePercent = revenueSharePercent;
  if (billerId !== undefined) branch.billerId = billerId;
  if (gstNumber !== undefined) branch.gstNumber = gstNumber;

  await branch.save();

  await AuditService.log({
    userId: req.user.id,
    branchId: branch._id,
    action: 'BRANCH_UPDATED',
    module: 'branches',
    resourceType: 'Branch',
    resourceId: branch._id,
    oldValue,
    newValue: branch.toObject(),
    req
  });

  const updatedPopulated = await Branch.findById(branch._id)
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .lean();

  return ApiResponse.success(res, updatedPopulated, 'Branch updated successfully');
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new NotFoundError('Branch');
  }

  const oldValue = branch.toObject();
  await Branch.findByIdAndDelete(req.params.id);

  // Unassign users from this deleted branch
  await User.updateMany(
    { $or: [{ branchId: branch._id }, { branches: branch._id }] },
    { $unset: { branchId: 1 }, $pull: { branches: branch._id } }
  );

  await AuditService.log({
    userId: req.user.id,
    branchId: branch._id,
    action: 'BRANCH_DELETED',
    module: 'branches',
    resourceType: 'Branch',
    resourceId: branch._id,
    oldValue,
    req
  });

  return ApiResponse.success(res, { id: req.params.id, name: branch.name }, 'Branch deleted successfully');
});

export const bulkDeleteBranches = asyncHandler(async (req, res) => {
  const { branchIds } = req.body;
  if (!Array.isArray(branchIds) || branchIds.length === 0) {
    return ApiResponse.badRequest(res, 'No branch IDs provided for deletion');
  }

  const branches = await Branch.find({ _id: { $in: branchIds } });
  const ids = branches.map((b) => b._id);

  if (ids.length > 0) {
    await Branch.deleteMany({ _id: { $in: ids } });
    await User.updateMany(
      { $or: [{ branchId: { $in: ids } }, { branches: { $in: ids } }] },
      { $unset: { branchId: 1 }, $pull: { branches: { $in: ids } } }
    );

    for (const b of branches) {
      await AuditService.log({
        userId: req.user.id,
        branchId: b._id,
        action: 'BRANCH_DELETED',
        module: 'branches',
        resourceType: 'Branch',
        resourceId: b._id,
        oldValue: b.toObject ? b.toObject() : b,
        req
      });
    }
  }

  return ApiResponse.success(res, { deletedCount: ids.length }, `Successfully deleted ${ids.length} branches`);
});

export const getBranchCredentials = asyncHandler(async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ success: false, message: 'Only the Business Owner can view branch credentials' });
  }

  const branch = await Branch.findById(req.params.id)
    .populate('managerId', 'name email phone role isActive initialPassword lastLoginAt')
    .populate('distributorId', 'name email phone role isActive initialPassword lastLoginAt')
    .lean();

  if (!branch) {
    throw new NotFoundError('Branch');
  }

  // Find all users linked to this branch (telecallers, managers, distributors)
  const branchUsers = await User.find({
    $or: [
      { branchId: branch._id },
      { branches: branch._id },
      ...(branch.managerId ? [{ _id: branch.managerId._id || branch.managerId }] : []),
      ...(branch.distributorId ? [{ _id: branch.distributorId._id || branch.distributorId }] : [])
    ]
  }).select('name email username phone role isActive initialPassword lastLoginAt createdAt').lean();

  // Deduplicate and format credentials
  const userMap = new Map();
  for (const u of branchUsers) {
    const savedCred = branch.initialCredentials?.find(c => c.email?.toLowerCase() === u.email?.toLowerCase());
    userMap.set(u._id.toString(), {
      id: u._id,
      name: u.name,
      email: u.email,
      username: u.username || u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      initialPassword: u.initialPassword || savedCred?.password || null,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt
    });
  }

  const credentialsList = Array.from(userMap.values());

  return ApiResponse.success(res, {
    branch: {
      id: branch._id,
      name: branch.name,
      code: branch.code,
      branchType: branch.branchType,
      phone: branch.phone,
      manager: branch.managerId || null,
      distributor: branch.distributorId || null
    },
    credentials: credentialsList,
    recordedCredentials: branch.initialCredentials || []
  }, 'Branch credentials retrieved');
});

export const resetBranchUserPassword = asyncHandler(async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ success: false, message: 'Only the Business Owner can reset credentials' });
  }

  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'Valid userId and newPassword (min 4 chars) are required' });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  const passwordHash = await User.hashPassword(newPassword);
  user.passwordHash = passwordHash;
  user.initialPassword = newPassword;
  user.failedLoginAttempts = 0;
  user.isLocked = false;
  user.lockUntil = null;
  await user.save();

  // Also update branch recorded credentials if exists
  await Branch.updateOne(
    { _id: req.params.id, 'initialCredentials.email': user.email },
    { $set: { 'initialCredentials.$.password': newPassword } }
  );

  await AuditService.log({
    userId: req.user.id,
    branchId: req.params.id,
    action: 'BRANCH_USER_PASSWORD_RESET',
    module: 'branches',
    resourceType: 'User',
    resourceId: user._id,
    newValue: { email: user.email, role: user.role },
    req
  });

  return ApiResponse.success(res, {
    id: user._id,
    email: user.email,
    password: newPassword
  }, 'Password updated successfully');
});

export const createBranchAccount = asyncHandler(async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ success: false, message: 'Only the Business Owner can create branch credentials' });
  }

  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new NotFoundError('Branch');
  }

  const { name, email, password, role, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ConflictError(`User account with email '${normalizedEmail}' already exists`);
  }

  const assignedRole = role === 'DISTRIBUTOR' ? 'DISTRIBUTOR' : 'MANAGER';
  const passwordHash = await User.hashPassword(password);

  const newUser = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    initialPassword: password,
    role: assignedRole,
    phone: phone?.trim() || branch.phone || '',
    branchId: branch._id,
    branches: [branch._id],
    isActive: true
  });
  await newUser.save();

  // If branch didn't have manager or distributor assigned, assign it
  const updateData = {};
  if (assignedRole === 'MANAGER' && !branch.managerId) {
    updateData.managerId = newUser._id;
    updateData.managerName = newUser.name;
    updateData.managerPhone = newUser.phone;
  } else if (assignedRole === 'DISTRIBUTOR' && !branch.distributorId) {
    updateData.distributorId = newUser._id;
    updateData.distributorName = newUser.name;
    updateData.distributorPhone = newUser.phone;
    updateData.distributorEmail = newUser.email;
  }

  await Branch.findByIdAndUpdate(branch._id, {
    ...updateData,
    $push: {
      initialCredentials: {
        userId: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: assignedRole,
        password,
        createdAt: new Date()
      }
    }
  });

  return ApiResponse.created(res, {
    id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    password,
    role: assignedRole,
    phone: newUser.phone
  }, 'Branch user account created successfully');
});

